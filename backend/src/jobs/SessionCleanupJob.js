const cron = require('node-cron');
const SessionService = require('../services/SessionService');

class SessionCleanupJob {
  
  static start() {
    console.log('📅 Iniciando job de limpeza de sessões...');
    
    // Executar a cada hora (0 minutos de cada hora)
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('🧹 Executando limpeza de sessões expiradas...');
        const cleanedCount = await SessionService.cleanExpiredSessions();
        
        if (cleanedCount > 0) {
          console.log(`✅ ${cleanedCount} sessão(ões) expirada(s) foram limpas`);
        } else {
          console.log('ℹ️ Nenhuma sessão expirada encontrada');
        }
      } catch (error) {
        console.error('❌ Erro na limpeza de sessões:', error);
      }
    });
    
    // Executar uma vez na inicialização (após 5 segundos)
    setTimeout(async () => {
      try {
        console.log('🧹 Executando limpeza inicial de sessões...');
        const cleanedCount = await SessionService.cleanExpiredSessions();
        
        if (cleanedCount > 0) {
          console.log(`✅ Limpeza inicial: ${cleanedCount} sessão(ões) expirada(s) foram limpas`);
        } else {
          console.log('ℹ️ Limpeza inicial: Nenhuma sessão expirada encontrada');
        }
      } catch (error) {
        console.error('❌ Erro na limpeza inicial de sessões:', error);
      }
    }, 5000);
    
    console.log('✅ Job de limpeza de sessões configurado (executa a cada hora)');
  }
  
  static stop() {
    console.log('🛑 Parando job de limpeza de sessões...');
    // node-cron não tem método direto para parar tarefas específicas
    // mas elas param quando o processo termina
  }
}

module.exports = SessionCleanupJob;

