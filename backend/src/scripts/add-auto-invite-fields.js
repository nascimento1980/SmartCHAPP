const { connectDatabase, sequelize } = require('../config/database');

/**
 * Script para adicionar campos de convites automáticos à tabela planning_invites
 */
async function addAutoInviteFields() {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    await connectDatabase();
    
    console.log('🔄 Adicionando campos de convites automáticos...');
    
    // Adicionar campo is_automatic
    try {
      await sequelize.query(`
        ALTER TABLE planning_invites 
        ADD COLUMN is_automatic BOOLEAN DEFAULT 0
      `);
      console.log('✅ Campo is_automatic adicionado');
    } catch (error) {
      if (error.message.includes('duplicate column name') || error.message.includes('already exists')) {
        console.log('ℹ️ Campo is_automatic já existe');
      } else {
        console.error('❌ Erro ao adicionar is_automatic:', error.message);
      }
    }
    
    // Adicionar campo notification_sent
    try {
      await sequelize.query(`
        ALTER TABLE planning_invites 
        ADD COLUMN notification_sent BOOLEAN DEFAULT 0
      `);
      console.log('✅ Campo notification_sent adicionado');
    } catch (error) {
      if (error.message.includes('duplicate column name') || error.message.includes('already exists')) {
        console.log('ℹ️ Campo notification_sent já existe');
      } else {
        console.error('❌ Erro ao adicionar notification_sent:', error.message);
      }
    }
    
    console.log('✅ Migração de campos concluída com sucesso!');
    
    // Verificar estrutura da tabela
    console.log('🔍 Verificando estrutura da tabela...');
    const [results] = await sequelize.query('PRAGMA table_info(planning_invites)');
    
    const hasAutomatic = results.some(field => field.name === 'is_automatic');
    const hasNotificationSent = results.some(field => field.name === 'notification_sent');
    
    console.log(`📊 Campo is_automatic: ${hasAutomatic ? '✅' : '❌'}`);
    console.log(`📊 Campo notification_sent: ${hasNotificationSent ? '✅' : '❌'}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  addAutoInviteFields();
}

module.exports = { addAutoInviteFields };
