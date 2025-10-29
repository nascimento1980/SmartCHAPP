const { CustomerContact } = require('../models');
const { sequelize } = require('../config/database');
const fs = require('fs');
const path = require('path');

// Função para validar email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Função para validar telefone
function isValidPhone(phone) {
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
  
  if (!leadData.contact_name || leadData.contact_name.trim().length < 2) {
    errors.push(`Linha ${rowNumber}: Nome do contato é obrigatório e deve ter pelo menos 2 caracteres`);
  }
  
  if (!leadData.segment || leadData.segment.trim().length < 2) {
    errors.push(`Linha ${rowNumber}: Segmento é obrigatório e deve ter pelo menos 2 caracteres`);
  }
  
  if (!leadData.source || leadData.source.trim().length < 2) {
    errors.push(`Linha ${rowNumber}: Origem (source) é obrigatório para leads`);
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

// Função para processar linha CSV
function processCSVLine(line, headers, rowNumber) {
  const values = line.split(',').map(value => value.trim().replace(/^"|"$/g, ''));
  const leadData = {};
  
  headers.forEach((header, index) => {
    if (values[index] !== undefined) {
      leadData[header] = values[index];
    }
  });
  
  // Definir valores padrão
  leadData.type = 'lead';
  leadData.status = leadData.status || 'novo';
  leadData.priority = leadData.priority || 'media';
  leadData.score = leadData.score ? parseInt(leadData.score) : 50;
  leadData.employees_count = leadData.employees_count ? parseInt(leadData.employees_count) : 0;
  leadData.estimated_revenue = leadData.estimated_revenue ? parseFloat(leadData.estimated_revenue) : 0;
  
  // Processar datas
  if (leadData.next_contact_date) {
    const date = new Date(leadData.next_contact_date);
    if (!isNaN(date.getTime())) {
      leadData.next_contact_date = date;
    } else {
      leadData.next_contact_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
    }
  } else {
    leadData.next_contact_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  
  return leadData;
}

// Função principal de importação CSV
async function importLeadsFromCSV(csvFilePath) {
  try {
    console.log('📁 Iniciando importação de leads via CSV...');
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`Arquivo não encontrado: ${csvFilePath}`);
    }
    
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length < 2) {
      throw new Error('Arquivo CSV deve ter pelo menos cabeçalho e uma linha de dados');
    }
    
    // Processar cabeçalho
    const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
    console.log('📋 Cabeçalhos detectados:', headers);
    
    // Validar cabeçalhos obrigatórios
    const requiredHeaders = ['company_name', 'contact_name', 'segment', 'source'];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Cabeçalhos obrigatórios não encontrados: ${missingHeaders.join(', ')}`);
    }
    
    // Processar linhas de dados
    const leadsToImport = [];
    const validationErrors = [];
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const leadData = processCSVLine(lines[i], headers, i + 1);
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
    
    // Exibir erros de validação
    if (validationErrors.length > 0) {
      console.log('\n❌ Erros de validação encontrados:');
      validationErrors.forEach(error => console.log(`  ${error}`));
      console.log(`\n⚠️  ${validationErrors.length} erros encontrados. Corrija o arquivo CSV e tente novamente.`);
      return { success: false, errors: validationErrors, imported: 0 };
    }
    
    console.log(`\n📊 ${leadsToImport.length} leads válidos para importação`);
    
    // Importar leads
    const importedLeads = [];
    const importErrors = [];
    
    for (const leadData of leadsToImport) {
      try {
        const lead = await CustomerContact.create(leadData);
        importedLeads.push(lead);
        console.log(`✅ Lead importado: ${lead.company_name} (${lead.contact_name})`);
      } catch (error) {
        const errorMsg = `Erro ao importar lead ${leadData.company_name}: ${error.message}`;
        importErrors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }
    
    // Relatório final
    console.log(`\n🎉 Importação concluída!`);
    console.log(`  ✅ Leads importados com sucesso: ${importedLeads.length}`);
    console.log(`  ❌ Erros na importação: ${importErrors.length}`);
    
    if (importErrors.length > 0) {
      console.log('\n📋 Erros de importação:');
      importErrors.forEach(error => console.log(`  ${error}`));
    }
    
    // Estatísticas finais
    const totalLeads = await CustomerContact.count({ where: { type: 'lead' } });
    const totalClients = await CustomerContact.count({ where: { type: 'client' } });
    
    console.log('\n📊 Estatísticas finais do banco:');
    console.log(`  Total de leads: ${totalLeads}`);
    console.log(`  Total de clientes: ${totalClients}`);
    
    return {
      success: true,
      imported: importedLeads.length,
      errors: importErrors,
      totalLeads,
      totalClients
    };
    
  } catch (error) {
    console.error('❌ Erro na importação CSV:', error.message);
    return { success: false, error: error.message, imported: 0 };
  }
}

// Função para criar template CSV
function createCSVTemplate(outputPath) {
  const template = `company_name,contact_name,email,phone,mobile,position,address,city,state,zipcode,website,employees_count,segment,source,priority,score,estimated_revenue,next_contact_date,notes
"Empresa Exemplo Ltda","João Silva","joao@empresa.com","(11) 99999-9999","(11) 88888-8888","Diretor","Rua Exemplo, 123","São Paulo","SP","01234-567","https://www.empresa.com",150,"Tecnologia","Website","alta",85,50000.00,"2024-01-15","Lead qualificado do website"
"Outra Empresa","Maria Santos","maria@outra.com","(11) 77777-7777","(11) 66666-6666","Gerente","Av. Paulista, 1000","São Paulo","SP","01310-100","https://www.outra.com",75,"Varejo","Indicação","media",70,30000.00,"2024-01-20","Indicação de cliente existente"`;
  
  try {
    fs.writeFileSync(outputPath, template, 'utf-8');
    console.log(`✅ Template CSV criado em: ${outputPath}`);
    console.log('📋 Use este arquivo como base para importar seus leads');
  } catch (error) {
    console.error('❌ Erro ao criar template:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Uso do script de importação CSV:');
    console.log('  node import-leads-csv.js <arquivo.csv>');
    console.log('  node import-leads-csv.js --template <caminho_saida.csv>');
    console.log('');
    console.log('📁 Exemplos:');
    console.log('  node import-leads-csv.js leads.csv');
    console.log('  node import-leads-csv.js --template template-leads.csv');
  } else if (args[0] === '--template') {
    const outputPath = args[1] || 'template-leads.csv';
    createCSVTemplate(outputPath);
  } else {
    const csvFilePath = args[0];
    importLeadsFromCSV(csvFilePath).then(() => {
      process.exit(0);
    }).catch(error => {
      console.error('❌ Erro fatal:', error.message);
      process.exit(1);
    });
  }
}

module.exports = { importLeadsFromCSV, createCSVTemplate, validateLead };
