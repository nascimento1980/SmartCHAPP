const { sequelize } = require('../config/database');
const { defineAssociations, VisitPlanning, VisitPlanningItem, User } = require('../models');

async function testAssociationsFixed() {
  try {
    console.log('🧪 Testando associações do Sequelize (versão corrigida)...\n');
    
    // 1. Definir associações primeiro
    console.log('🔗 Definindo associações...');
    defineAssociations();
    console.log('✅ Associações definidas!');
    
    // 2. Testar associação VisitPlanning -> User
    console.log('\n🔗 Testando VisitPlanning -> User...');
    try {
      const planning = await VisitPlanning.findOne({
        include: [
          { model: User, as: 'responsible', attributes: ['id', 'name', 'email'] }
        ]
      });
      
      if (planning) {
        console.log('  ✅ VisitPlanning -> User funcionou');
        console.log(`    - Planning ID: ${planning.id}`);
        console.log(`    - Responsável: ${planning.responsible?.name || 'N/A'}`);
      } else {
        console.log('  ⚠️  Nenhum planejamento encontrado');
      }
    } catch (error) {
      console.log(`  ❌ Erro na associação VisitPlanning -> User: ${error.message}`);
      console.log(`  🔍 Stack trace: ${error.stack}`);
    }
    
    // 3. Testar associação completa (como na rota)
    console.log('\n🔗 Testando associação completa (como na rota)...');
    try {
      const plannings = await VisitPlanning.findAll({
        include: [
          { model: User, as: 'responsible', attributes: ['id', 'name', 'email'] },
          { 
            model: VisitPlanningItem, 
            as: 'items', 
            attributes: [
              'id', 'status', 'planned_date', 'planned_time', 'client_id', 'client_name', 
              'client_address', 'visit_type', 'priority', 'estimated_duration', 'planned_distance', 
              'planned_fuel', 'planned_cost', 'notes', 'visit_id', 'actual_date', 
              'actual_time', 'actual_duration', 'actual_distance', 'actual_fuel', 'actual_cost', 
              'completion_notes'
            ]
          }
        ],
        order: [['week_start_date', 'DESC']]
      });
      
      if (plannings.length > 0) {
        console.log('  ✅ Associação completa funcionou');
        console.log(`    - Total de planejamentos: ${plannings.length}`);
        plannings.forEach((planning, index) => {
          console.log(`    ${index + 1}. Planning: ${planning.id}, Status: ${planning.status}`);
          console.log(`       Responsável: ${planning.responsible?.name || 'N/A'}`);
          console.log(`       Itens: ${planning.items?.length || 0}`);
        });
      } else {
        console.log('  ⚠️  Nenhum planejamento encontrado');
      }
    } catch (error) {
      console.log(`  ❌ Erro na associação completa: ${error.message}`);
      console.log(`  🔍 Stack trace: ${error.stack}`);
    }
    
    console.log('\n✅ Teste de associações corrigidas concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await sequelize.close();
  }
}

// Executar teste
testAssociationsFixed();