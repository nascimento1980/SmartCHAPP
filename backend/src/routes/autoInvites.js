const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');
const AutoInviteService = require('../services/AutoInviteService');

// Rota para executar verificação manual de convites automáticos
router.post('/check-manual', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    console.log('🔧 Executando verificação manual de convites automáticos...');
    await AutoInviteService.runManualCheck();
    
    res.json({
      success: true,
      message: 'Verificação manual de convites executada com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro na verificação manual:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao executar verificação manual',
      error: error.message
    });
  }
});

// Rota para obter status do serviço
router.get('/status', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    res.json({
      success: true,
      service: 'AutoInviteService',
      status: 'running',
      description: 'Serviço de convites automáticos ativo',
      schedule: [
        'Execução diária às 7:00',
        'Verificações a cada 2 horas durante horário comercial (8:00-18:00)'
      ]
    });
  } catch (error) {
    console.error('❌ Erro ao obter status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter status do serviço',
      error: error.message
    });
  }
});

module.exports = router;

