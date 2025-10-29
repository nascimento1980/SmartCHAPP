const express = require('express');
const { CustomerContact, Segment } = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const fs = require('fs');
const ExcelJS = require('exceljs');
const path = require('path');
const { sequelize } = require('../config/database');
const { broadcast } = require('./events');

const router = express.Router();

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'csv');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'leads-import-' + uniqueSuffix + '.csv');
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos CSV são permitidos'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Configuração do multer para XLSX
const storageXlsx = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'xlsx');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'leads-import-' + uniqueSuffix + '.xlsx');
  }
});

const uploadXlsx = multer({
  storage: storageXlsx,
  fileFilter: function (req, file, cb) {
    const ok = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.originalname.endsWith('.xlsx');
    cb(ok ? null : new Error('Apenas arquivos XLSX são permitidos'), ok);
  },
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

// Função para validar email
function isValidEmail(email) {
  if (!email) return true; // opcional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Função para validar telefone
function isValidPhone(phone) {
  if (!phone) return true; // opcional
  const phoneRegex = /^[\d\s\(\)\-\+]+$/;
  return phoneRegex.test(phone);
}

// Função para validar CNPJ/CPF
function isValidTaxId(taxId) {
  if (!taxId) return true; // opcional
  const cleanTaxId = taxId.replace(/\D/g, '');
  return cleanTaxId.length === 11 || cleanTaxId.length === 14;
}

// Função para validar CEP
function isValidCEP(cep) {
  if (!cep) return true; // opcional
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.length === 8;
}

// Função para validar lead
function validateLead(leadData, rowNumber) {
  const errors = [];
  
  // Campos obrigatórios
  if (!leadData.company_name || leadData.company_name.trim().length < 2) {
    errors.push(`Linha ${rowNumber}: Nome da empresa é obrigatório e deve ter pelo menos 2 caracteres`);
  }
  
  if (!leadData.segment || leadData.segment.trim().length < 2) {
    errors.push(`Linha ${rowNumber}: Segmento é obrigatório e deve ter pelo menos 2 caracteres`);
  }
  
  // Validações de formato
  if (leadData.email && !isValidEmail(leadData.email)) {
    errors.push(`Linha ${rowNumber}: Email inválido: ${leadData.email}`);
  }
  
  if (leadData.phone && !isValidPhone(leadData.phone)) {
    errors.push(`Linha ${rowNumber}: Telefone inválido: ${leadData.phone}`);
  }
  
  if (leadData.mobile && !isValidPhone(leadData.mobile)) {
    errors.push(`Linha ${rowNumber}: Celular inválido: ${leadData.mobile}`);
  }
  
  if (leadData.cnpj && !isValidTaxId(leadData.cnpj)) {
    errors.push(`Linha ${rowNumber}: CNPJ inválido: ${leadData.cnpj}`);
  }
  
  if (leadData.cpf && !isValidTaxId(leadData.cpf)) {
    errors.push(`Linha ${rowNumber}: CPF inválido: ${leadData.cpf}`);
  }
  
  if (leadData.zipcode && !isValidCEP(leadData.zipcode)) {
    errors.push(`Linha ${rowNumber}: CEP inválido: ${leadData.zipcode}`);
  }
  
  // Validações de valores numéricos
  if (leadData.employees_count && (isNaN(leadData.employees_count) || leadData.employees_count < 0)) {
    errors.push(`Linha ${rowNumber}: Número de funcionários deve ser um número positivo`);
  }
  
  if (leadData.estimated_revenue && (isNaN(leadData.estimated_revenue) || leadData.estimated_revenue < 0)) {
    errors.push(`Linha ${rowNumber}: Receita estimada deve ser um número positivo`);
  }
  
  if (leadData.score && (isNaN(leadData.score) || leadData.score < 0 || leadData.score > 100)) {
    errors.push(`Linha ${rowNumber}: Score deve ser um número entre 0 e 100`);
  }
  
  return errors;
}

// Parser CSV simples com suporte a aspas e delimitador dinâmico ("," ou ";")
function parseCsvLine(line, delimiter) {
  const pattern = new RegExp(
    `(?:^|${delimiter})` + // início ou delimitador
    '("(?:[^"]|"")*"|[^' + delimiter + ']*)', // campo entre aspas (com "") ou sem aspas
    'g'
  );
  const result = [];
  let match;
  while ((match = pattern.exec(line)) !== null) {
    let value = match[1];
    if (value && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/""/g, '"');
    }
    result.push((value || '').trim());
  }
  // Remover possível campo vazio inicial quando linha inicia com delimitador
  if (result.length && result[0] === '') {
    // manter se realmente havia coluna vazia no início; heurística: se linha começa com delimitador
    if (!line.startsWith(delimiter)) result.shift();
  }
  return result;
}

// Função para processar linha CSV
function processCSVLine(line, headers, rowNumber, delimiter) {
  const values = parseCsvLine(line, delimiter);
  const leadData = {};
  
  headers.forEach((header, index) => {
    if (values[index] !== undefined) {
      leadData[header] = values[index];
    }
  });
  
  // Definir valores padrão para leads
  leadData.type = 'lead';
  leadData.status = 'novo'; // Todos os leads importados devem ser marcados como 'novo'
  leadData.priority = 'media';
  leadData.score = 50;
  leadData.employees_count = 0;
  leadData.estimated_revenue = 0;
  
  // Mapear campos do CSV para campos do banco
  const fieldMapping = {
    'company_name': 'company_name',
    'segment': 'segment',
    'source': 'source',
    'contact_name': 'contact_name',
    'email': 'email',
    'phone': 'phone',
    'mobile': 'mobile',
    'address': 'address',
    'city': 'city',
    'state': 'state',
    'zipcode': 'zipcode',
    'cnpj': 'cnpj',
    'notes': 'notes'
  };
  
  // Aplicar mapeamento de campos
  const mappedData = {};
  Object.keys(fieldMapping).forEach(csvField => {
    if (leadData[csvField] !== undefined) {
      mappedData[fieldMapping[csvField]] = leadData[csvField];
    }
  });
  
  // Defaults críticos para atender validações do modelo
  if (!mappedData.segment || String(mappedData.segment).trim().length === 0) {
    mappedData.segment = 'Outros';
  }
  if (!mappedData.source || String(mappedData.source).trim().length === 0) {
    mappedData.source = 'import';
  }
  if (!mappedData.contact_name || String(mappedData.contact_name).trim().length < 2) {
    // Usa nome da empresa como fallback para contact_name se disponível
    const company = (mappedData.company_name || '').toString().trim();
    mappedData.contact_name = company.length >= 2 ? company : 'Contato Importado';
  }
  
  // Definir data de próximo contato padrão (7 dias)
  mappedData.next_contact_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  // Garantir tipo e status padrão para exibição correta na listagem
  mappedData.type = 'lead';
  mappedData.status = 'novo';
  
  return mappedData;
}

// Função para importar leads de CSV
async function importLeadsFromCSV(csvFilePath) {
  try {
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`Arquivo não encontrado: ${csvFilePath}`);
    }
    
    let csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    // Remover BOM se existir
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }
    const rawLines = csvContent.split(/\r?\n/);
    const lines = rawLines.filter(line => line.trim().length > 0);
    
    if (lines.length < 2) {
      throw new Error('Arquivo CSV deve ter pelo menos cabeçalho e uma linha de dados');
    }
    
    // Detectar delimitador do cabeçalho
    const headerRaw = lines[0];
    const commaCount = (headerRaw.match(/,/g) || []).length;
    const semicolonCount = (headerRaw.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';
    
    // Processar cabeçalho com parser robusto
    const headerFields = parseCsvLine(headerRaw, delimiter);
    const headers = headerFields.map(h => h.trim().toLowerCase());
    
    // Validar cabeçalhos obrigatórios
    const requiredHeaders = ['company_name', 'segment'];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Cabeçalhos obrigatórios não encontrados: ${missingHeaders.join(', ')}`);
    }
    
    // Processar linhas de dados
    const leadsToImport = [];
    const validationErrors = [];
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const leadData = processCSVLine(lines[i], headers, i + 1, delimiter);
        const errors = validateLead(leadData, i + 1);
        
        if (errors.length > 0) {
          validationErrors.push(...errors);
        } else {
          leadsToImport.push(leadData);
        }
      } catch (error) {
        validationErrors.push(`Linha ${i + 1}: Erro ao processar linha - ${error.message}`);
      }
    }
    
  // Garantir que segmentos inexistentes sejam criados no catálogo
  try {
    const uniqueSegments = Array.from(new Set(
      leadsToImport
        .map(ld => (ld.segment || '').trim())
        .filter(Boolean)
    ));
    for (const segName of uniqueSegments) {
      await Segment.findOrCreate({ where: { name: segName }, defaults: { name: segName } });
    }
  } catch (e) {
    // Não bloquear importação por falha no catálogo de segmentos
    console.warn('⚠️  Falha ao garantir segmentos no catálogo:', e.message);
  }
  
    // Importar leads
    const importedLeads = [];
    const importErrors = [];
    
    for (const leadData of leadsToImport) {
      try {
        const lead = await CustomerContact.create(leadData);
        importedLeads.push(lead);
      } catch (error) {
        importErrors.push(`Erro ao importar lead ${leadData.company_name}: ${error.message}`);
      }
    }
    
  return {
    success: true,
    imported: importedLeads.length,
    errors: [...validationErrors, ...importErrors],
    totalLeads: await CustomerContact.count({ where: { type: 'lead' } }),
    totalClients: await CustomerContact.count({ where: { type: 'client' } })
  };
    
  } catch (error) {
    return { success: false, error: error.message, imported: 0 };
  }
}

// Importação via XLSX
async function importLeadsFromXLSX(xlsxFilePath) {
  try {
    if (!fs.existsSync(xlsxFilePath)) {
      throw new Error(`Arquivo não encontrado: ${xlsxFilePath}`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(xlsxFilePath);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('Planilha vazia');

    // Cabeçalhos (linha 1)
    const headers = [];
    sheet.getRow(1).eachCell((cell, col) => {
      headers[col - 1] = String(cell.value || '').trim().toLowerCase();
    });

    const required = ['company_name', 'segment'];
    const missing = required.filter(h => !headers.includes(h));
    if (missing.length) throw new Error(`Cabeçalhos obrigatórios não encontrados: ${missing.join(', ')}`);

    const leadsToImport = [];
    const validationErrors = [];

    for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
      const row = sheet.getRow(rowIndex);
      if (!row || row.cellCount === 0) continue;

      const leadData = {};
      headers.forEach((header, idx) => {
        const cell = row.getCell(idx + 1);
        const raw = cell?.value;
        const value = typeof raw === 'object' && raw?.text ? raw.text : raw;
        leadData[header] = value == null ? '' : String(value).trim();
      });

      // Mapear para campos do modelo + defaults
      const mapped = {
        company_name: leadData.company_name,
        segment: leadData.segment || 'Outros',
        source: leadData.source || 'import',
        contact_name: (leadData.contact_name && leadData.contact_name.length >= 2) ? leadData.contact_name : (leadData.company_name || 'Contato Importado'),
        email: leadData.email || null,
        phone: leadData.phone || null,
        mobile: leadData.mobile || null,
        address: leadData.address || null,
        city: leadData.city || null,
        state: leadData.state || null,
        zipcode: leadData.zipcode || null,
        cnpj: leadData.cnpj || null,
        notes: leadData.notes || null,
        next_contact_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        type: 'lead',
        status: 'novo',
        priority: 'media',
        score: 50,
        employees_count: 0,
        estimated_revenue: 0
      };

      const errors = validateLead(mapped, rowIndex);
      if (errors.length) {
        validationErrors.push(...errors);
      } else {
        leadsToImport.push(mapped);
      }
    }

    // Criar segmentos necessários
    try {
      const uniqueSegments = Array.from(new Set(
        leadsToImport.map(ld => (ld.segment || '').trim()).filter(Boolean)
      ));
      for (const segName of uniqueSegments) {
        await Segment.findOrCreate({ where: { name: segName }, defaults: { name: segName } });
      }
    } catch (e) {
      console.warn('⚠️  Falha ao garantir segmentos (XLSX):', e.message);
    }

    const importedLeads = [];
    const importErrors = [];
    for (const lead of leadsToImport) {
      try {
        const created = await CustomerContact.create(lead);
        importedLeads.push(created);
      } catch (e) {
        importErrors.push(`Erro ao importar lead ${lead.company_name}: ${e.message}`);
      }
    }

    return {
      success: true,
      imported: importedLeads.length,
      errors: [...validationErrors, ...importErrors],
      totalLeads: await CustomerContact.count({ where: { type: 'lead' } }),
      totalClients: await CustomerContact.count({ where: { type: 'client' } })
    };
  } catch (error) {
    return { success: false, error: error.message, imported: 0 };
  }
}

// GET /api/customer-contacts - Listar todos os contatos (leads e clientes)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, // 'lead' ou 'client'
      status,
      segment,
      city,
      state,
      cnpj,
      search,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Filtros
    if (type) whereClause.type = type;
    if (status) whereClause.status = status;
    if (segment) whereClause.segment = segment;
    if (city) whereClause.city = { [Op.like]: `%${city}%` };
    if (state) whereClause.state = { [Op.like]: `%${state}%` };
    if (cnpj) whereClause.cnpj = { [Op.like]: `%${cnpj}%` };

    // Busca
    if (search) {
      whereClause[Op.or] = [
        { company_name: { [Op.like]: `%${search}%` } },
        { contact_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { mobile: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await CustomerContact.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]]
    });

    // Evitar cache para garantir que novos imports apareçam imediatamente
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar contatos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/customer-contacts/leads - Listar apenas leads
router.get('/leads', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status,
      priority,
      segment,
      city,
      search,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { type: 'lead' };

    // Filtros específicos de leads
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (segment) whereClause.segment = segment;
    if (city) whereClause.city = { [Op.like]: `%${city}%` };

    // Busca
    if (search) {
      whereClause[Op.or] = [
        { company_name: { [Op.like]: `%${search}%` } },
        { contact_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { source: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await CustomerContact.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]]});

    // Evitar cache
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar leads:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/customer-contacts/clients - Listar apenas clientes
router.get('/clients', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status,
      segment,
      city,
      search,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { type: 'client' };

    // Filtros específicos de clientes
    if (status) whereClause.status = status;
    if (segment) whereClause.segment = segment;
    if (city) whereClause.city = { [Op.like]: `%${city}%` };

    // Busca
    if (search) {
      whereClause[Op.or] = [
        { company_name: { [Op.like]: `%${search}%` } },
        { contact_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { cnpj: { [Op.like]: `%${search}%` } },
        { cpf: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await CustomerContact.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]]});

    // Evitar cache
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/customer-contacts/template-csv - Download do template CSV
router.get('/template-csv', (req, res) => {
  try {
    const template = `company_name,segment,source,contact_name,email,phone,mobile,address,city,state,zipcode,cnpj,notes
"Empresa Exemplo Ltda","Tecnologia","Website","João Silva","joao@empresa.com","(11) 99999-9999","(11) 88888-8888","Rua Exemplo, 123","São Paulo","SP","01234-567","12.345.678/0001-90","Lead qualificado do website"
"Outra Empresa","Varejo","Indicação","Maria Santos","maria@outra.com","(11) 77777-7777","(11) 66666-6666","Av. Paulista, 1000","São Paulo","SP","01310-100","98.765.432/0001-10","Indicação de cliente existente"`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="template-leads.csv"');
    res.send(template);
    
  } catch (error) {
    console.error('❌ Erro ao gerar template CSV:', error);
    res.status(500).json({ error: 'Erro ao gerar template CSV' });
  }
});

// GET /api/customer-contacts/:id - Buscar contato por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await CustomerContact.findByPk(id);

    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Erro ao buscar contato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/customer-contacts - Criar novo contato
router.post('/', async (req, res) => {
  try {
    const contactData = req.body;

    // Validações específicas por tipo
    if (contactData.type === 'lead' && !contactData.source) {
      return res.status(400).json({ 
        error: 'Source é obrigatório para leads' 
      });
    }

    if (contactData.type === 'client' && !contactData.cnpj && !contactData.cpf) {
      return res.status(400).json({ 
        error: 'CNPJ ou CPF é obrigatório para clientes' 
      });
    }

    const contact = await CustomerContact.create(contactData);

    const createdContact = await CustomerContact.findByPk(contact.id);

    res.status(201).json(createdContact);
  } catch (error) {
    console.error('Erro ao criar contato:', error);
    console.error('Stack trace:', error.stack);
    console.error('Request body:', req.body);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: error.errors.map(e => e.message)
      });
    }

    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// PUT /api/customer-contacts/:id - Atualizar contato (substitui tudo)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contactData = req.body;

    const contact = await CustomerContact.findByPk(id);

    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    // Validações específicas por tipo (se estiver mudando o tipo)
    if (contactData.type === 'lead' && !contactData.source) {
      return res.status(400).json({ 
        error: 'Source é obrigatório para leads' 
      });
    }

    if (contactData.type === 'client' && !contactData.cnpj && !contactData.cpf) {
      return res.status(400).json({ 
        error: 'CNPJ ou CPF é obrigatório para clientes' 
      });
    }

    await contact.update(contactData);

    const updatedContact = await CustomerContact.findByPk(id);

    res.json(updatedContact);
  } catch (error) {
    console.error('Erro ao atualizar contato:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: error.errors.map(e => e.message)
      });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PATCH /api/customer-contacts/:id - Atualizar contato parcialmente
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contactData = req.body;

    const contact = await CustomerContact.findByPk(id);

    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    // Validações específicas por tipo (apenas se estiver mudando o tipo)
    if (contactData.type && contactData.type !== contact.type) {
      if (contactData.type === 'lead' && !contactData.source && !contact.source) {
        return res.status(400).json({ 
          error: 'Source é obrigatório para leads' 
        });
      }

      if (contactData.type === 'client' && !contactData.cnpj && !contactData.cpf && !contact.cnpj && !contact.cpf) {
        return res.status(400).json({ 
          error: 'CNPJ ou CPF é obrigatório para clientes' 
        });
      }
    }

    await contact.update(contactData);

    const updatedContact = await CustomerContact.findByPk(id);

    res.json(updatedContact);
  } catch (error) {
    console.error('Erro ao atualizar contato:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: error.errors.map(e => e.message)
      });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/customer-contacts/:id/convert-to-client - Converter lead para cliente
router.post('/:id/convert-to-client', async (req, res) => {
  try {
    const { id } = req.params;
    const clientData = req.body;

    const contact = await CustomerContact.findByPk(id);

    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    if (contact.type !== 'lead') {
      return res.status(400).json({ 
        error: 'Apenas leads podem ser convertidos para clientes' 
      });
    }

    // Validações para cliente
    if (!clientData.cnpj && !clientData.cpf) {
      return res.status(400).json({ 
        error: 'CNPJ ou CPF é obrigatório para clientes' 
      });
    }

    await contact.convertToClient(clientData);

    const updatedContact = await CustomerContact.findByPk(id);

    res.json(updatedContact);
  } catch (error) {
    console.error('Erro ao converter lead para cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/customer-contacts/:id - Excluir contato
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await CustomerContact.findByPk(id);

    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    await contact.destroy();

    res.json({ message: 'Contato excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir contato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/customer-contacts/stats/summary - Estatísticas resumidas
router.get('/stats/summary', async (req, res) => {
  try {
    const [
      totalContacts,
      totalLeads,
      totalClients,
      leadsByStatus,
      clientsByStatus,
      recentConversions
    ] = await Promise.all([
      CustomerContact.count(),
      CustomerContact.count({ where: { type: 'lead' } }),
      CustomerContact.count({ where: { type: 'client' } }),
      CustomerContact.findAll({
        where: { type: 'lead' },
        attributes: ['status', [CustomerContact.sequelize.fn('COUNT', CustomerContact.sequelize.col('CustomerContact.id')), 'count']],
        group: ['CustomerContact.status'],
        raw: true
      }),
      CustomerContact.findAll({
        where: { type: 'client' },
        attributes: ['status', [CustomerContact.sequelize.fn('COUNT', CustomerContact.sequelize.col('CustomerContact.id')), 'count']],
        group: ['CustomerContact.status'],
        raw: true
      }),
      CustomerContact.count({
        where: {
          type: 'client',
          conversion_date: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // últimos 30 dias
          }
        }
      })
    ]);

    res.json({
      total: {
        contacts: totalContacts,
        leads: totalLeads,
        clients: totalClients
      },
      breakdown: {
        leads: leadsByStatus,
        clients: clientsByStatus
      },
      conversions: {
        last30Days: recentConversions
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/customer-contacts/import-csv - Importar leads via CSV
router.post('/import-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo CSV é obrigatório' });
    }

    console.log('📁 Arquivo recebido:', req.file.originalname);
    
    // Processar arquivo CSV
    const result = await importLeadsFromCSV(req.file.path);
    
    // Limpar arquivo temporário
    try {
      fs.unlinkSync(req.file.path);
    } catch (error) {
      console.warn('⚠️  Não foi possível remover arquivo temporário:', error.message);
    }
    
    if (!result.success) {
      if (result.errors && result.errors.length > 0) {
        return res.status(400).json({ 
          error: 'Erros de validação encontrados',
          details: result.errors,
          imported: 0
        });
      } else {
        return res.status(400).json({ 
          error: result.error || 'Erro na importação',
          imported: 0
        });
      }
    }
    
    // Notificar via SSE para invalidar caches do frontend
    try {
      broadcast({ type: 'contacts.imported', payload: { source: 'import-csv', imported: result.imported, ts: Date.now() } });
    } catch (_) {}

    res.json({
      success: true,
      message: `Importação concluída com sucesso! ${result.imported} leads importados.`,
      imported: result.imported,
      errors: result.errors || [],
      totalLeads: result.totalLeads,
      totalClients: result.totalClients
    });
    
  } catch (error) {
    console.error('❌ Erro na importação CSV:', error);
    
    // Limpar arquivo temporário em caso de erro
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️  Não foi possível remover arquivo temporário:', cleanupError.message);
      }
    }
    
    res.status(500).json({ 
      error: 'Erro interno do servidor na importação',
      details: error.message
    });
  }
});

// POST /api/customer-contacts/import-xlsx - Importar leads via XLSX
router.post('/import-xlsx', uploadXlsx.single('xlsxFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo XLSX é obrigatório' });
    }
    console.log('📁 Arquivo XLSX recebido:', req.file.originalname);

    const result = await importLeadsFromXLSX(req.file.path);

    try { fs.unlinkSync(req.file.path); } catch (_) {}

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Erros na importação',
        details: result.errors,
        imported: 0
      });
    }

    // Notificar via SSE
    try {
      broadcast({ type: 'contacts.imported', payload: { source: 'import-xlsx', imported: result.imported, ts: Date.now() } });
    } catch (_) {}

    res.json({
      success: true,
      message: `Importação XLSX concluída! ${result.imported} leads importados.`,
      imported: result.imported,
      errors: result.errors || [],
      totalLeads: result.totalLeads,
      totalClients: result.totalClients
    });
  } catch (error) {
    console.error('❌ Erro na importação XLSX:', error);
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
    res.status(500).json({ error: 'Erro interno do servidor na importação XLSX', details: error.message });
  }
});

// ========================================
// ROTAS PARA GESTÃO DE LEADS POR VENDEDOR
// ========================================

// GET /api/customer-contacts/sales/leads - Buscar leads por vendedor
router.get('/sales/leads', async (req, res) => {
  try {
    const { 
      responsible_id, 
      status, 
      priority, 
      segment, 
      source,
      page = 1, 
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Construir filtros
    const whereClause = {
      type: 'lead'
    };

    if (responsible_id) {
      whereClause.responsible_id = responsible_id;
    }

    if (status) {
      whereClause.status = status;
    }

    if (priority) {
      whereClause.priority = priority;
    }

    if (segment) {
      whereClause.segment = { [Op.iLike]: `%${segment}%` };
    }

    if (source) {
      whereClause.source = { [Op.iLike]: `%${source}%` };
    }

    // Buscar leads com informações do vendedor responsável
    const { count, rows: leads } = await CustomerContact.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: require('../models/User'),
          as: 'responsible',
          attributes: ['id', 'name', 'email', 'role', 'department']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calcular estatísticas por vendedor
    const salesStats = await CustomerContact.findAll({
      where: { type: 'lead' },
      attributes: [
        'responsible_id',
        [sequelize.fn('COUNT', sequelize.col('CustomerContact.id')), 'total_leads'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN CustomerContact.status = 'novo' THEN 1 END")), 'novos'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN CustomerContact.status = 'qualificado' THEN 1 END")), 'qualificados'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN CustomerContact.status = 'convertido' THEN 1 END")), 'convertidos'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN CustomerContact.status = 'perdido' THEN 1 END")), 'perdidos'],
        [sequelize.fn('AVG', sequelize.col('CustomerContact.score')), 'score_medio'],
        [sequelize.fn('SUM', sequelize.col('CustomerContact.estimated_revenue')), 'receita_estimada']
      ],
      group: ['CustomerContact.responsible_id'],
      include: [
        {
          model: require('../models/User'),
          as: 'responsible',
          attributes: ['id', 'name', 'email', 'role', 'department']
        }
      ]
    });

    res.json({
      leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      },
      salesStats,
      filters: {
        responsible_id,
        status,
        priority,
        segment,
        source
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar leads por vendedor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/customer-contacts/sales/performance - Performance dos vendedores
router.get('/sales/performance', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter;
    const now = new Date();
    
    switch (period) {
      case 'week':
        dateFilter = { [Op.gte]: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case 'month':
        dateFilter = { [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1) };
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        dateFilter = { [Op.gte]: new Date(now.getFullYear(), quarter * 3, 1) };
        break;
      case 'year':
        dateFilter = { [Op.gte]: new Date(now.getFullYear(), 0, 1) };
        break;
      default:
        dateFilter = { [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1) };
    }

    // Performance por vendedor no período
    const performance = await CustomerContact.findAll({
      where: {
        type: 'lead',
        created_at: dateFilter
      },
      attributes: [
        'responsible_id',
        [sequelize.fn('COUNT', sequelize.col('CustomerContact.id')), 'leads_criados'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN CustomerContact.status = 'convertido' THEN 1 END")), 'leads_convertidos'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN CustomerContact.status = 'qualificado' THEN 1 END")), 'leads_qualificados'],
        [sequelize.fn('AVG', sequelize.col('CustomerContact.score')), 'score_medio'],
        [sequelize.fn('SUM', sequelize.col('CustomerContact.estimated_revenue')), 'receita_estimada'],
        [sequelize.fn('AVG', sequelize.literal("(julianday(CustomerContact.updated_at) - julianday(CustomerContact.created_at))")), 'tempo_medio_conversao']
      ],
      group: ['CustomerContact.responsible_id'],
      include: [
        {
          model: require('../models/User'),
          as: 'responsible',
          attributes: ['id', 'name', 'email', 'role', 'department']
        }
      ]
    });

    // Calcular taxas de conversão
    const performanceWithRates = performance.map(p => {
      const data = p.toJSON();
      const totalLeads = parseInt(data.leads_criados);
      const convertidos = parseInt(data.leads_convertidos);
      const qualificados = parseInt(data.leads_qualificados);
      
      return {
        ...data,
        taxa_conversao: totalLeads > 0 ? ((convertidos / totalLeads) * 100).toFixed(2) : 0,
        taxa_qualificacao: totalLeads > 0 ? ((qualificados / totalLeads) * 100).toFixed(2) : 0,
        receita_estimada: parseFloat(data.receita_estimada || 0).toFixed(2),
        score_medio: parseFloat(data.score_medio || 0).toFixed(1),
        tempo_medio_conversao: parseFloat(data.tempo_medio_conversao || 0).toFixed(1)
      };
    });

    res.json({
      period,
      performance: performanceWithRates,
      summary: {
        total_vendedores: performanceWithRates.length,
        total_leads: performanceWithRates.reduce((sum, p) => sum + parseInt(p.leads_criados), 0),
        total_convertidos: performanceWithRates.reduce((sum, p) => sum + parseInt(p.leads_convertidos), 0),
        receita_total: performanceWithRates.reduce((sum, p) => sum + parseFloat(p.receita_estimada), 0)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar performance dos vendedores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/customer-contacts/sales/assign - Buscar vendedores disponíveis para atribuição
router.get('/sales/assign', async (req, res) => {
  try {
    const { role = 'sales' } = req.query;
    
    const salesUsers = await require('../models/User').findAll({
      where: {
        role: role,
        is_active: true
      },
      attributes: ['id', 'name', 'email', 'role', 'department'],
      order: [['name', 'ASC']]
    });

    // Buscar carga de trabalho atual de cada vendedor
    const workload = await CustomerContact.findAll({
      where: { type: 'lead' },
      attributes: [
        'responsible_id',
        [sequelize.fn('COUNT', sequelize.col('CustomerContact.id')), 'total_leads'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN CustomerContact.status = 'novo' THEN 1 END")), 'leads_novos']
      ],
      group: ['CustomerContact.responsible_id']
    });

    // Combinar informações
    const salesWithWorkload = salesUsers.map(user => {
      const userWorkload = workload.find(w => w.responsible_id === user.id);
      return {
        ...user.toJSON(),
        workload: {
          total_leads: parseInt(userWorkload?.total_leads || 0),
          leads_novos: parseInt(userWorkload?.leads_novos || 0)
        }
      };
    });

    res.json(salesWithWorkload);

  } catch (error) {
    console.error('Erro ao buscar vendedores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/customer-contacts/sales/assign/:id - Atribuir lead a um vendedor
router.post('/sales/assign/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { responsible_id, notes } = req.body;

    if (!responsible_id) {
      return res.status(400).json({ error: 'ID do vendedor responsável é obrigatório' });
    }

    // Verificar se o vendedor existe e está ativo
    const salesUser = await require('../models/User').findOne({
      where: {
        id: responsible_id,
        role: { [Op.in]: ['sales', 'manager'] },
        is_active: true
      }
    });

    if (!salesUser) {
      return res.status(400).json({ error: 'Vendedor não encontrado ou inativo' });
    }

    // Buscar o lead
    const lead = await CustomerContact.findOne({
      where: {
        id: id,
        type: 'lead'
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    // Atualizar responsável e adicionar nota
    const updateData = {
      responsible_id: responsible_id
    };

    if (notes) {
      const currentNotes = lead.notes || '';
      updateData.notes = `${currentNotes}\n\n[${new Date().toLocaleString('pt-BR')}] Atribuído para ${salesUser.name}: ${notes}`;
    }

    await lead.update(updateData);

    // Buscar lead atualizado com informações do vendedor
    const updatedLead = await CustomerContact.findByPk(id, {
      include: [
        {
          model: require('../models/User'),
          as: 'responsible',
          attributes: ['id', 'name', 'email', 'role', 'department']
        }
      ]
    });

    res.json({
      message: 'Lead atribuído com sucesso',
      lead: updatedLead
    });

  } catch (error) {
    console.error('Erro ao atribuir lead:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/customer-contacts/sales/assign-bulk - Atribuir múltiplos leads
router.post('/sales/assign-bulk', async (req, res) => {
  try {
    const { lead_ids, responsible_id, notes } = req.body;

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs de leads é obrigatória' });
    }

    if (!responsible_id) {
      return res.status(400).json({ error: 'ID do vendedor responsável é obrigatório' });
    }

    // Verificar se o vendedor existe e está ativo
    const salesUser = await require('../models/User').findOne({
      where: {
        id: responsible_id,
        role: { [Op.in]: ['sales', 'manager'] },
        is_active: true
      }
    });

    if (!salesUser) {
      return res.status(400).json({ error: 'Vendedor não encontrado ou inativo' });
    }

    // Buscar todos os leads
    const leads = await CustomerContact.findAll({
      where: {
        id: { [Op.in]: lead_ids },
        type: 'lead'
      }
    });

    if (leads.length === 0) {
      return res.status(404).json({ error: 'Nenhum lead encontrado' });
    }

    // Atualizar todos os leads
    const updatePromises = leads.map(lead => {
      const updateData = {
        responsible_id: responsible_id
      };

      if (notes) {
        const currentNotes = lead.notes || '';
        updateData.notes = `${currentNotes}\n\n[${new Date().toLocaleString('pt-BR')}] Atribuído em lote para ${salesUser.name}: ${notes}`;
      }

      return lead.update(updateData);
    });

    await Promise.all(updatePromises);

    res.json({
      message: `${leads.length} leads atribuídos com sucesso para ${salesUser.name}`,
      assigned_count: leads.length,
      responsible: {
        id: salesUser.id,
        name: salesUser.name,
        email: salesUser.email
      }
    });

  } catch (error) {
    console.error('Erro ao atribuir leads em lote:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/customer-contacts/sales/dashboard - Dashboard para vendedores
router.get('/sales/dashboard', async (req, res) => {
  try {
    const { responsible_id, period = 'month' } = req.query;

    if (!responsible_id) {
      return res.status(400).json({ error: 'ID do vendedor é obrigatório' });
    }

    let dateFilter;
    const now = new Date();
    
    switch (period) {
      case 'week':
        dateFilter = { [Op.gte]: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case 'month':
        dateFilter = { [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1) };
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        dateFilter = { [Op.gte]: new Date(now.getFullYear(), quarter * 3, 1) };
        break;
      case 'year':
        dateFilter = { [Op.gte]: new Date(now.getFullYear(), 0, 1) };
        break;
      default:
        dateFilter = { [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1) };
    }

    // Estatísticas gerais do vendedor
    const stats = await CustomerContact.findAll({
      where: {
        responsible_id: responsible_id,
        type: 'lead',
        created_at: dateFilter
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('CustomerContact.id')), 'total_leads'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN CustomerContact.status = 'novo' THEN 1 END")), 'novos'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN CustomerContact.status = 'qualificado' THEN 1 END")), 'qualificados'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN CustomerContact.status = 'convertido' THEN 1 END")), 'convertidos'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN CustomerContact.status = 'perdido' THEN 1 END")), 'perdidos'],
        [sequelize.fn('AVG', sequelize.col('CustomerContact.score')), 'score_medio'],
        [sequelize.fn('SUM', sequelize.col('CustomerContact.estimated_revenue')), 'receita_estimada']
      ]
    });

    // Leads por status
    const leadsByStatus = await CustomerContact.findAll({
      where: {
        responsible_id: responsible_id,
        type: 'lead'
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('CustomerContact.id')), 'count']
      ],
      group: ['CustomerContact.status']
    });

    // Leads por segmento
    const leadsBySegment = await CustomerContact.findAll({
      where: {
        responsible_id: responsible_id,
        type: 'lead'
      },
      attributes: [
        'segment',
        [sequelize.fn('COUNT', sequelize.col('CustomerContact.id')), 'count']
      ],
      group: ['CustomerContact.segment'],
      order: [[sequelize.fn('COUNT', sequelize.col('CustomerContact.id')), 'DESC']],
      limit: 10
    });

    // Leads por prioridade
    const leadsByPriority = await CustomerContact.findAll({
      where: {
        responsible_id: responsible_id,
        type: 'lead'
      },
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('CustomerContact.id')), 'count']
      ],
      group: ['CustomerContact.priority']
    });

    // Leads recentes
    const recentLeads = await CustomerContact.findAll({
      where: {
        responsible_id: responsible_id,
        type: 'lead'
      },
      attributes: ['id', 'company_name', 'contact_name', 'status', 'priority', 'score', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    // Próximos contatos
    const nextContacts = await CustomerContact.findAll({
      where: {
        responsible_id: responsible_id,
        type: 'lead',
        next_contact_date: { [Op.gte]: new Date() }
      },
      attributes: ['id', 'company_name', 'contact_name', 'next_contact_date', 'status', 'priority'],
      order: [['next_contact_date', 'ASC']],
      limit: 10
    });

    const dashboardData = {
      period,
      stats: stats[0] ? {
        total_leads: parseInt(stats[0].total_leads),
        novos: parseInt(stats[0].novos),
        qualificados: parseInt(stats[0].qualificados),
        convertidos: parseInt(stats[0].convertidos),
        perdidos: parseInt(stats[0].perdidos),
        score_medio: parseFloat(stats[0].score_medio || 0).toFixed(1),
        receita_estimada: parseFloat(stats[0].receita_estimada || 0).toFixed(2)
      } : {},
      leadsByStatus,
      leadsBySegment,
      leadsByPriority,
      recentLeads,
      nextContacts
    };

    res.json(dashboardData);

  } catch (error) {
    console.error('Erro ao buscar dashboard do vendedor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PATCH /api/customer-contacts/:id/status - Atualizar apenas status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validar status
    const validStatuses = [
      // Status de leads
      'novo', 'contatado', 'qualificado', 'agendado', 'visitado',
      'proposta_enviada', 'negociacao', 'convertido', 'perdido', 'inativo',
      // Status de clientes
      'ativo', 'cliente_recorrente', 'cliente_vip', 'prospecto', 'inadimplente'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Status inválido',
        valid_statuses: validStatuses
      });
    }

    const contact = await CustomerContact.findByPk(id);

    if (!contact) {
      return res.status(404).json({
        error: 'Contato não encontrado',
        code: 'CONTACT_NOT_FOUND'
      });
    }

    const updateData = { status };
    
    // Se convertido, marcar data de conversão
    if (status === 'convertido') {
      updateData.conversion_date = new Date();
    }

    await contact.update(updateData);
    
    // Recalcular score se for lead
    if (contact.type === 'lead' && contact.updateScore) {
      contact.updateScore();
      await contact.save();
    }

    res.json({
      message: 'Status atualizado com sucesso',
      contact
    });

  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

module.exports = router;
