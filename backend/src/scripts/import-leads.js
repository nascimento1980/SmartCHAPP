const { CustomerContact } = require('../models');
const { sequelize } = require('../config/database');

async function importLeads() {
  try {
    console.log('🚀 Iniciando importação de leads...');
    
    // Dados de exemplo para importação
    const sampleLeads = [
      {
        company_name: 'Empresa ABC Ltda',
        contact_name: 'João Silva',
        email: 'joao.silva@empresaabc.com.br',
        phone: '(11) 99999-9999',
        mobile: '(11) 88888-8888',
        position: 'Diretor Comercial',
        address: 'Rua das Flores, 123',
        city: 'São Paulo',
        state: 'SP',
        zipcode: '01234-567',
        website: 'https://www.empresaabc.com.br',
        employees_count: 150,
        segment: 'Tecnologia',
        status: 'novo',
        type: 'lead',
        source: 'Website',
        priority: 'alta',
        score: 85,
        estimated_revenue: 50000.00,
        next_contact_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
        responsible_id: null // será preenchido automaticamente
      },
      {
        company_name: 'Comércio XYZ',
        contact_name: 'Maria Santos',
        email: 'maria.santos@xyz.com.br',
        phone: '(11) 77777-7777',
        mobile: '(11) 66666-6666',
        position: 'Gerente de Vendas',
        address: 'Av. Paulista, 1000',
        city: 'São Paulo',
        state: 'SP',
        zipcode: '01310-100',
        website: 'https://www.xyz.com.br',
        employees_count: 75,
        segment: 'Varejo',
        status: 'qualificado',
        type: 'lead',
        source: 'Indicação',
        priority: 'media',
        score: 70,
        estimated_revenue: 30000.00,
        next_contact_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 dias
        responsible_id: null
      },
      {
        company_name: 'Indústria Delta',
        contact_name: 'Pedro Oliveira',
        email: 'pedro.oliveira@delta.com.br',
        phone: '(11) 55555-5555',
        mobile: '(11) 44444-4444',
        position: 'CEO',
        address: 'Rua Industrial, 500',
        city: 'Campinas',
        state: 'SP',
        zipcode: '13000-000',
        website: 'https://www.delta.com.br',
        employees_count: 300,
        segment: 'Indústria',
        status: 'novo',
        type: 'lead',
        source: 'LinkedIn',
        priority: 'alta',
        score: 90,
        estimated_revenue: 100000.00,
        next_contact_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 dias
        responsible_id: null
      },
      {
        company_name: 'Serviços Beta',
        contact_name: 'Ana Costa',
        email: 'ana.costa@beta.com.br',
        phone: '(11) 33333-3333',
        mobile: '(11) 22222-2222',
        position: 'Diretora de Marketing',
        address: 'Av. Brigadeiro Faria Lima, 2000',
        city: 'São Paulo',
        state: 'SP',
        zipcode: '01452-002',
        website: 'https://www.beta.com.br',
        employees_count: 120,
        segment: 'Serviços',
        status: 'qualificado',
        type: 'lead',
        source: 'Evento',
        priority: 'media',
        score: 75,
        estimated_revenue: 45000.00,
        next_contact_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 dias
        responsible_id: null
      },
      {
        company_name: 'Startup Gamma',
        contact_name: 'Carlos Ferreira',
        email: 'carlos.ferreira@gamma.com.br',
        phone: '(11) 11111-1111',
        mobile: '(11) 00000-0000',
        position: 'Founder',
        address: 'Rua da Inovação, 789',
        city: 'São Paulo',
        state: 'SP',
        zipcode: '04567-890',
        website: 'https://www.gamma.com.br',
        employees_count: 25,
        segment: 'Startup',
        status: 'novo',
        type: 'lead',
        source: 'Demo Day',
        priority: 'alta',
        score: 95,
        estimated_revenue: 20000.00,
        next_contact_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 dias
        responsible_id: null
      }
    ];

    console.log(`📊 Importando ${sampleLeads.length} leads...`);
    
    // Importar cada lead
    const importedLeads = [];
    for (const leadData of sampleLeads) {
      try {
        const lead = await CustomerContact.create(leadData);
        importedLeads.push(lead);
        console.log(`✅ Lead importado: ${lead.company_name} (${lead.contact_name})`);
      } catch (error) {
        console.error(`❌ Erro ao importar lead ${leadData.company_name}:`, error.message);
      }
    }

    console.log(`\n🎉 Importação concluída! ${importedLeads.length} leads importados com sucesso.`);
    
    // Verificar dados importados
    const totalLeads = await CustomerContact.count({ where: { type: 'lead' } });
    const totalClients = await CustomerContact.count({ where: { type: 'client' } });
    const totalContacts = await CustomerContact.count();
    
    console.log('\n📊 Estatísticas do banco:');
    console.log(`  Total de contatos: ${totalContacts}`);
    console.log(`  Leads: ${totalLeads}`);
    console.log(`  Clientes: ${totalClients}`);
    
    // Mostrar leads por status
    const leadsByStatus = await CustomerContact.findAll({
      where: { type: 'lead' },
      attributes: ['status', [CustomerContact.sequelize.fn('COUNT', CustomerContact.sequelize.col('CustomerContact.id')), 'count']],
      group: ['CustomerContact.status'],
      raw: true
    });
    
    console.log('\n📋 Leads por status:');
    leadsByStatus.forEach(item => {
      console.log(`  ${item.status}: ${item.count}`);
    });
    
    // Mostrar leads por fonte
    const leadsBySource = await CustomerContact.findAll({
      where: { type: 'lead' },
      attributes: ['source', [CustomerContact.sequelize.fn('COUNT', CustomerContact.sequelize.col('CustomerContact.id')), 'count']],
      group: ['CustomerContact.source'],
      raw: true
    });
    
    console.log('\n📋 Leads por fonte:');
    leadsBySource.forEach(item => {
      console.log(`  ${item.source}: ${item.count}`);
    });

  } catch (error) {
    console.error('❌ Erro na importação:', error);
  } finally {
    await sequelize.close();
  }
}

// Função para importar leads de arquivo CSV (opcional)
async function importLeadsFromCSV(csvFilePath) {
  try {
    console.log('📁 Importando leads de arquivo CSV...');
    
    // Aqui você pode implementar a lógica para ler CSV
    // Por enquanto, apenas um placeholder
    console.log('⚠️  Funcionalidade de importação CSV será implementada em breve');
    
  } catch (error) {
    console.error('❌ Erro na importação CSV:', error);
  }
}

// Executar importação
if (require.main === module) {
  importLeads();
}

module.exports = { importLeads, importLeadsFromCSV };
