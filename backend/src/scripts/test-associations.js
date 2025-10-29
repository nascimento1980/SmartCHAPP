const { sequelize } = require('../config/database');
const { VisitPlanning, VisitPlanningItem, User } = require('../models');

async function testAssociations() {
  try {
    console.log('🧪 Testando associações do Sequelize...\n');
    
    // 1. Testar associação VisitPlanning -> User
    console.log('🔗 Testando VisitPlanning -> User...');
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
    
    console.log('\n✅ Teste de associações concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await sequelize.close();
  }
}

// Executar teste
testAssociations();