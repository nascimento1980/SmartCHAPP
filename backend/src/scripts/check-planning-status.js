const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Conectar ao banco
const dbPath = path.join(__dirname, '..', 'data', 'chsmart.db');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: dbPath, logging: false });

async function checkPlanningStatus() {
  try {
    console.log('🔍 Verificando status dos itens de planejamento...');
    
    // Verificar estrutura da tabela
    const tableInfo = await sequelize.query("PRAGMA table_info(visit_planning_items)");
    console.log('📋 Colunas da tabela visit_planning_items:');
    tableInfo[0].forEach(col => {
      console.log(`  - ${col.name}: ${col.type}`);
    });
    
    // Verificar dados dos itens
    const items = await sequelize.query(`
      SELECT 
        id, 
        status, 
        planned_date, 
        planned_time, 
        client_name,
        visit_type,
        priority
      FROM visit_planning_items 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n📊 Itens de planejamento encontrados:');
    items[0].forEach(item => {
      console.log(`  - ID: ${item.id}`);
      console.log(`    Status: ${item.status || 'NULL'}`);
      console.log(`    Cliente: ${item.client_name}`);
      console.log(`    Data: ${item.planned_date}`);
      console.log(`    Hora: ${item.planned_time}`);
      console.log(`    Tipo: ${item.visit_type}`);
      console.log(`    Prioridade: ${item.priority}`);
      console.log('    ---');
    });
    
    // Verificar valores únicos de status
    const statusValues = await sequelize.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM visit_planning_items 
      GROUP BY status
    `);
    
    console.log('\n📈 Distribuição de status:');
    statusValues[0].forEach(status => {
      console.log(`  - ${status.status || 'NULL'}: ${status.count}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  checkPlanningStatus();
}

module.exports = checkPlanningStatus;
