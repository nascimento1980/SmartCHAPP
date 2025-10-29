require('dotenv').config();
const { sequelize, User, Lead, Client } = require('../models');

const seedDatabase = async () => {
  try {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Sincronizar modelos
    await sequelize.sync({ force: true });
    console.log('✅ Modelos sincronizados');

    // Criar usuário admin
    const adminUser = await User.create({
      name: 'Administrador Clean Health',
      email: 'admin@cleanhealth.com',
      password: 'admin123',
      role: 'admin',
      department: 'Administração',
      phone: '+55 11 99999-9999',
      preferences: {
        notifications: true,
        email_alerts: true,
        dashboard_layout: 'admin'
      },
      targets: {
        monthly_leads: 100,
        monthly_visits: 50,
        monthly_sales: 30
      }
    });

    // Criar usuário vendedor
    const salesUser = await User.create({
      name: 'João Silva',
      email: 'joao@cleanhealth.com',
      password: 'admin123',
      role: 'sales',
      department: 'Vendas',
      phone: '+55 11 88888-8888',
      preferences: {
        notifications: true,
        email_alerts: true,
        dashboard_layout: 'sales'
      },
      targets: {
        monthly_leads: 50,
        monthly_visits: 20,
        monthly_sales: 10
      }
    });

    console.log('✅ Usuários criados');

    // Criar leads de exemplo
    const leads = [
      {
        company_name: 'Condomínio Residencial São Paulo',
        contact_name: 'Maria Santos',
        email: 'maria@condominiosp.com.br',
        phone: '+55 11 3333-4444',
        position: 'Síndica',
        segment: 'condominios',
        source: 'indicacao',
        priority: 'alta',
        address: 'Rua das Flores, 123',
        city: 'São Paulo',
        state: 'SP',
        zipcode: '01234-567',
        employees_count: 5,
        estimated_revenue: 5000,
        notes: 'Condomínio com 200 apartamentos, interessado em produtos de limpeza',
        responsible_id: salesUser.id,
        status: 'qualificado',
        next_contact_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 dias
      },
      {
        company_name: 'Hotel Executivo Plaza',
        contact_name: 'Roberto Lima',
        email: 'roberto@hotelplaza.com.br',
        phone: '+55 11 2222-3333',
        position: 'Gerente Operacional',
        segment: 'hotelaria',
        source: 'website',
        priority: 'alta',
        address: 'Av. Paulista, 1000',
        city: 'São Paulo',
        state: 'SP',
        zipcode: '01310-100',
        employees_count: 150,
        estimated_revenue: 15000,
        notes: 'Hotel 4 estrelas com 200 quartos',
        responsible_id: salesUser.id,
        status: 'contatado',
        next_contact_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // 1 dia
      },
      {
        company_name: 'Restaurante Bella Vista',
        contact_name: 'Ana Costa',
        email: 'ana@bellavista.com.br',
        phone: '+55 11 1111-2222',
        position: 'Proprietária',
        segment: 'restaurantes',
        source: 'feira_evento',
        priority: 'media',
        address: 'Rua Augusta, 500',
        city: 'São Paulo',
        state: 'SP',
        zipcode: '01305-000',
        employees_count: 25,
        estimated_revenue: 3000,
        notes: 'Restaurante italiano, interessado em produtos para cozinha',
        responsible_id: salesUser.id,
        status: 'novo',
        next_contact_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 dias
      }
    ];

    const createdLeads = await Lead.bulkCreate(leads);
    
    // Calcular scores dos leads
    for (const lead of createdLeads) {
      lead.updateScore();
      await lead.save();
    }

    console.log('✅ Leads criados');

    // Criar cliente de exemplo (lead convertido)
    const client = await Client.create({
      company_name: 'Shopping Center Norte',
      contact_name: 'Carlos Mendes',
      email: 'carlos@shoppingnorte.com.br',
      phone: '+55 11 4444-5555',
      position: 'Gerente de Facilities',
      segment: 'shopping_centers',
      status: 'ativo',
      cnpj: '12.345.678/0001-90',
      address: 'Av. das Nações, 2000',
      city: 'São Paulo',
      state: 'SP',
      zipcode: '02001-000',
      website: 'https://shoppingnorte.com.br',
      employees_count: 300,
      monthly_revenue: 50000,
      credit_limit: 100000,
      payment_terms: '30 dias',
      discount_percentage: 5.0,
      notes: 'Cliente VIP desde 2020',
      next_visit_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      conversion_date: new Date('2020-03-15'),
      responsible_id: salesUser.id,
      custom_fields: {
        area_total: '50000m²',
        lojas: 250,
        fluxo_diario: 15000
      },
      tags: ['vip', 'shopping', 'grande_porte'],
      preferences: {
        preferred_contact_method: 'email',
        visit_frequency: 'monthly',
        preferred_visit_time: 'morning'
      }
    });

    console.log('✅ Cliente criado');

    console.log('\n🎉 Seed concluído com sucesso!');
    console.log('\n📋 Dados criados:');
    console.log(`- Usuários: 2`);
    console.log(`- Leads: ${createdLeads.length}`);
    console.log(`- Clientes: 1`);
    console.log('\n🔐 Credenciais de acesso:');
    console.log('Admin: admin@cleanhealth.com / admin123');
    console.log('Vendedor: joao@cleanhealth.com / password');

  } catch (error) {
    console.error('❌ Erro no seed:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

// Executar seed se chamado diretamente
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;