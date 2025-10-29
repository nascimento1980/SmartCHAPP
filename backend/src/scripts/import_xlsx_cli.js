const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const ExcelJS = require('exceljs');
const { sequelize } = require('../config/database');
const { CustomerContact, Segment, defineAssociations } = require('../models');

async function ensureDb() {
  // Define associações e sincroniza caso necessário
  if (!global.__ASSOCS_DEFINED__) {
    defineAssociations();
    global.__ASSOCS_DEFINED__ = true;
  }
  await sequelize.authenticate();
  await sequelize.sync();
}

function validateLead(lead) {
  const errors = [];
  if (!lead.company_name || String(lead.company_name).trim().length < 2) {
    errors.push('company_name obrigatório (>= 2 chars)');
  }
  if (!lead.segment || String(lead.segment).trim().length < 2) {
    errors.push('segment obrigatório (>= 2 chars)');
  }
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    errors.push(`email inválido: ${lead.email}`);
  }
  return errors;
}

async function importXlsx(absPath) {
  if (!fs.existsSync(absPath)) {
    throw new Error(`Arquivo não encontrado: ${absPath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(absPath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('Planilha vazia');

  const headers = [];
  sheet.getRow(1).eachCell((cell, col) => {
    headers[col - 1] = String(cell.value || '').trim().toLowerCase();
  });

  const required = ['company_name', 'segment'];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length) throw new Error(`Cabeçalhos obrigatórios não encontrados: ${missing.join(', ')}`);

  const toImport = [];
  const validationErrors = [];

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (!row || row.cellCount === 0) continue;
    const rowData = {};
    headers.forEach((h, idx) => {
      const cell = row.getCell(idx + 1);
      const raw = cell?.value;
      const value = typeof raw === 'object' && raw?.text ? raw.text : raw;
      rowData[h] = value == null ? '' : String(value).trim();
    });

    const mapped = {
      company_name: rowData.company_name,
      segment: rowData.segment || 'Outros',
      source: rowData.source || 'import',
      contact_name: (rowData.contact_name && rowData.contact_name.length >= 2)
        ? rowData.contact_name
        : (rowData.company_name || 'Contato Importado'),
      email: rowData.email || null,
      phone: rowData.phone || null,
      mobile: rowData.mobile || null,
      address: rowData.address || null,
      city: rowData.city || null,
      state: rowData.state || null,
      zipcode: rowData.zipcode || null,
      cnpj: rowData.cnpj || null,
      notes: rowData.notes || null,
      next_contact_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      type: 'lead',
      status: 'novo',
      priority: 'media',
      score: 50,
      employees_count: 0,
      estimated_revenue: 0
    };

    const errs = validateLead(mapped);
    if (errs.length) {
      validationErrors.push(`Linha ${r}: ${errs.join('; ')}`);
    } else {
      toImport.push(mapped);
    }
  }

  // Criar segmentos necessários
  const uniqueSegments = Array.from(new Set(toImport.map((ld) => (ld.segment || '').trim()).filter(Boolean)));
  for (const seg of uniqueSegments) {
    await Segment.findOrCreate({ where: { name: seg }, defaults: { name: seg } });
  }

  const imported = [];
  const importErrors = [];
  for (const lead of toImport) {
    try {
      const created = await CustomerContact.create(lead);
      imported.push(created.id);
    } catch (e) {
      importErrors.push(`Falha ao importar ${lead.company_name}: ${e.message}`);
    }
  }

  return { importedCount: imported.length, validationErrors, importErrors };
}

(async () => {
  try {
    await ensureDb();
    const argPath = process.argv[2];
    const filePath = argPath 
      ? path.resolve(argPath)
      : path.resolve(process.env.HOME || process.env.USERPROFILE || '/', 'Downloads', 'teste.xlsx');

    console.log(`📄 Importando: ${filePath}`);
    const result = await importXlsx(filePath);
    console.log(`✅ Importados: ${result.importedCount}`);
    if (result.validationErrors.length) {
      console.log('⚠️  Erros de validação:', result.validationErrors.slice(0, 10));
      if (result.validationErrors.length > 10) console.log(`... (+${result.validationErrors.length - 10} erros)`);
    }
    if (result.importErrors.length) {
      console.log('⚠️  Erros de inserção:', result.importErrors.slice(0, 10));
      if (result.importErrors.length > 10) console.log(`... (+${result.importErrors.length - 10} erros)`);
    }

    const [[{ total }]] = await sequelize.query("SELECT COUNT(*) AS total FROM customer_contacts WHERE type='lead'");
    console.log(`📊 Total de leads no banco: ${total}`);
  } catch (err) {
    console.error('❌ Erro no import_xlsx_cli:', err.message);
    process.exit(1);
  } finally {
    try { await sequelize.close(); } catch (_) {}
  }
})();


