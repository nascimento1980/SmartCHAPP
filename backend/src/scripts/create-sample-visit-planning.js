const { VisitPlanning, VisitPlanningItem, Visit, User, Client, sequelize } = require('../models');

const createSampleData = async () => {
  try {
    console.log('🔧 Criando dados de exemplo para planejamento de visitas...');

    // Buscar usuário admin
    const user = await User.findOne({ where: { role: 'admin' } });
    if (!user) {
      console.error('❌ Usuário admin não encontrado');
      return;
    }

    // Buscar alguns clientes
    const clients = await Client.findAll({ limit: 5 });
    if (clients.length === 0) {
      console.error('❌ Nenhum cliente encontrado');
      return;
    }

    // Data da semana atual
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // Criar planejamento semanal comercial
    const commercialPlanning = await VisitPlanning.create({
      week_start_date: startOfWeek,
      week_end_date: endOfWeek,
      planning_type: 'comercial',
      responsible_id: user.id,
      status: 'em_planejamento',
      notes: 'Planejamento de visitas comerciais da semana'
    });

    console.log('✅ Planejamento comercial criado:', commercialPlanning.id);

    // Criar itens do planejamento
    const planningItems = [];
    
    for (let i = 0; i < Math.min(clients.length, 3); i++) {
      const client = clients[i];
      const plannedDate = new Date(startOfWeek);
      plannedDate.setDate(startOfWeek.getDate() + i + 1); // Segunda, terça, quarta
      
      // Criar visita para o item
      const visit = await Visit.create({
        title: `Visita comercial - ${client.company_name}`,
        type: 'comercial',
        scheduled_date: plannedDate,
        scheduled_time: `${9 + i}:00`,
        address: client.address || `Endereço do cliente ${client.company_name}`,
        notes: `Visita comercial agendada para ${client.company_name}`,
        description: 'Apresentação de produtos e negociação',
        priority: i === 0 ? 'alta' : (i === 1 ? 'media' : 'baixa'),
        estimated_duration: 2,
        status: 'agendada',
        client_id: client.id,
        responsible_id: user.id
      });

      // Criar item do planejamento
      const item = await VisitPlanningItem.create({
        planning_id: commercialPlanning.id,
        visit_id: visit.id,
        planned_date: plannedDate,
        planned_time: `${9 + i}:00`,
        client_name: client.company_name,
        client_address: client.address || `Endereço do cliente ${client.company_name}`,
        visit_type: 'comercial',
        priority: i === 0 ? 'alta' : (i === 1 ? 'media' : 'baixa'),
        estimated_duration: 2,
        planned_distance: Math.round(Math.random() * 20 + 5), // 5-25 km
        planned_fuel: Math.round((Math.random() * 20 + 5) / 8 * 100) / 100, // consumo baseado em 8km/l
        planned_cost: Math.round((Math.random() * 20 + 5) / 8 * 5.5 * 100) / 100, // custo baseado em R$ 5,50/l
        planned_time: 2,
        status: 'planejada'
      });

      planningItems.push(item);
      console.log(`✅ Item de planejamento criado: ${client.company_name}`);
    }

    // Criar planejamento técnico
    const technicalPlanning = await VisitPlanning.create({
      week_start_date: startOfWeek,
      week_end_date: endOfWeek,
      planning_type: 'tecnica',
      responsible_id: user.id,
      status: 'em_planejamento',
      notes: 'Planejamento de visitas técnicas da semana'
    });

    console.log('✅ Planejamento técnico criado:', technicalPlanning.id);

    // Criar alguns itens técnicos
    for (let i = 0; i < Math.min(clients.length, 2); i++) {
      const client = clients[i];
      const plannedDate = new Date(startOfWeek);
      plannedDate.setDate(startOfWeek.getDate() + i + 3); // Quinta, sexta
      
      // Criar visita técnica
      const visit = await Visit.create({
        title: `Manutenção técnica - ${client.company_name}`,
        type: 'tecnica',
        scheduled_date: plannedDate,
        scheduled_time: `${14 + i}:00`,
        address: client.address || `Endereço do cliente ${client.company_name}`,
        notes: `Manutenção técnica agendada para ${client.company_name}`,
        description: 'Manutenção preventiva de equipamentos',
        equipment_required: 'Kit de ferramentas, peças de reposição',
        priority: 'alta',
        estimated_duration: 3,
        status: 'agendada',
        client_id: client.id,
        responsible_id: user.id
      });

      // Criar item do planejamento técnico
      await VisitPlanningItem.create({
        planning_id: technicalPlanning.id,
        visit_id: visit.id,
        planned_date: plannedDate,
        planned_time: `${14 + i}:00`,
        client_name: client.company_name,
        client_address: client.address || `Endereço do cliente ${client.company_name}`,
        visit_type: 'tecnica',
        priority: 'alta',
        estimated_duration: 3,
        planned_distance: Math.round(Math.random() * 30 + 10), // 10-40 km
        planned_fuel: Math.round((Math.random() * 30 + 10) / 8 * 100) / 100,
        planned_cost: Math.round((Math.random() * 30 + 10) / 8 * 5.5 * 100) / 100,
        planned_time: 3,
        status: 'planejada'
      });

      console.log(`✅ Item técnico criado: ${client.company_name}`);
    }

    console.log('\n🎉 Dados de exemplo criados com sucesso!');
    console.log(`📊 Planejamento comercial: ${commercialPlanning.id} (${planningItems.length} itens)`);
    console.log(`🔧 Planejamento técnico: ${technicalPlanning.id} (2 itens)`);
    console.log(`📅 Semana: ${startOfWeek.toLocaleDateString('pt-BR')} a ${endOfWeek.toLocaleDateString('pt-BR')}`);

  } catch (error) {
    console.error('❌ Erro ao criar dados de exemplo:', error);
  }
};

// Executar script se chamado diretamente
if (require.main === module) {
  createSampleData().then(() => {
    console.log('\n✅ Script finalizado!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Erro na execução:', error);
    process.exit(1);
  });
}

module.exports = { createSampleData };
