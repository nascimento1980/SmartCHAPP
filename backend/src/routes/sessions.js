const express = require('express');
const Joi = require('joi');
const { UserSession } = require('../models');
const { asyncHandler, validateRequest } = require('../middleware/errorHandler');
const authMiddleware = require('../middleware/auth');
const SessionService = require('../services/SessionService');

const router = express.Router();

// Middleware de autenticação aplicado a todas as rotas
router.use(authMiddleware);

// GET /api/sessions/my - Listar sessões ativas do usuário logado
router.get('/my', asyncHandler(async (req, res) => {
  const sessions = await SessionService.getActiveSessions(req.user.id);
  
  // Marcar a sessão atual
  const currentTokenHash = SessionService.createTokenHash(req.token);
  const sessionsWithCurrent = sessions.map(session => ({
    ...session.toJSON(),
    is_current: session.token_hash === currentTokenHash,
    // Não expor o hash completo do token
    token_hash: session.token_hash.substring(0, 8) + '...'
  }));

  res.json({
    sessions: sessionsWithCurrent,
    total: sessionsWithCurrent.length
  });
}));

// GET /api/sessions/my/stats - Estatísticas das sessões do usuário
router.get('/my/stats', asyncHandler(async (req, res) => {
  const stats = await SessionService.getUserSessionStats(req.user.id);
  res.json(stats);
}));

// POST /api/sessions/end/:sessionId - Encerrar uma sessão específica
router.post('/end/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  // Buscar a sessão
  const session = await UserSession.findOne({
    where: {
      id: sessionId,
      user_id: req.user.id,
      is_active: true
    }
  });

  if (!session) {
    return res.status(404).json({
      error: 'Sessão não encontrada ou já encerrada',
      code: 'SESSION_NOT_FOUND'
    });
  }

  // Verificar se não é a sessão atual
  const currentTokenHash = SessionService.createTokenHash(req.token);
  if (session.token_hash === currentTokenHash) {
    return res.status(400).json({
      error: 'Não é possível encerrar a sessão atual. Use logout.',
      code: 'CANNOT_END_CURRENT_SESSION'
    });
  }

  // Encerrar a sessão
  await SessionService.endSession(session.token_hash, 'revoked');

  res.json({
    message: 'Sessão encerrada com sucesso'
  });
}));

// POST /api/sessions/end-all - Encerrar todas as outras sessões (manter apenas a atual)
router.post('/end-all', asyncHandler(async (req, res) => {
  const endedCount = await SessionService.endAllUserSessions(req.user.id, req.token, 'revoked');
  
  res.json({
    message: `${endedCount} sessão(ões) encerrada(s) com sucesso`,
    ended_sessions: endedCount
  });
}));

// Admin routes (apenas para admins e managers)
router.use(authMiddleware.requireRole(['admin', 'manager', 'master']));

// GET /api/sessions/user/:userId - Listar sessões de um usuário específico (admin)
router.get('/user/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const sessions = await SessionService.getActiveSessions(userId);
  const sessionsData = sessions.map(session => ({
    ...session.toJSON(),
    // Não expor o hash completo do token
    token_hash: session.token_hash.substring(0, 8) + '...'
  }));

  res.json({
    sessions: sessionsData,
    total: sessionsData.length,
    user_id: userId
  });
}));

// GET /api/sessions/all - Listar todas as sessões ativas do sistema (admin)
router.get('/all', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  const { count, rows: sessions } = await UserSession.findAndCountAll({
    where: {
      is_active: true
    },
    include: [
      {
        association: 'user',
        attributes: ['id', 'name', 'email', 'role']
      }
    ],
    limit,
    offset,
    order: [['last_activity', 'DESC']]
  });

  const sessionsData = sessions.map(session => ({
    ...session.toJSON(),
    // Não expor o hash completo do token
    token_hash: session.token_hash.substring(0, 8) + '...'
  }));

  res.json({
    sessions: sessionsData,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    }
  });
}));

// POST /api/sessions/admin/end/:sessionId - Encerrar qualquer sessão (admin)
router.post('/admin/end/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  const session = await UserSession.findOne({
    where: {
      id: sessionId,
      is_active: true
    },
    include: [
      {
        association: 'user',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  if (!session) {
    return res.status(404).json({
      error: 'Sessão não encontrada ou já encerrada',
      code: 'SESSION_NOT_FOUND'
    });
  }

  // Encerrar a sessão
  await SessionService.endSession(session.token_hash, 'revoked');

  res.json({
    message: 'Sessão encerrada com sucesso',
    session: {
      id: session.id,
      user: session.user
    }
  });
}));

// POST /api/sessions/admin/end-user/:userId - Encerrar todas as sessões de um usuário (admin)
router.post('/admin/end-user/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const sessions = await SessionService.getActiveSessions(userId);
  
  if (sessions.length === 0) {
    return res.json({
      message: 'Nenhuma sessão ativa encontrada para este usuário',
      ended_sessions: 0
    });
  }

  // Encerrar todas as sessões do usuário
  let endedCount = 0;
  for (const session of sessions) {
    await SessionService.endSession(session.token_hash, 'revoked');
    endedCount++;
  }

  res.json({
    message: `${endedCount} sessão(ões) do usuário encerrada(s) com sucesso`,
    ended_sessions: endedCount,
    user_id: userId
  });
}));

// POST /api/sessions/cleanup - Limpar sessões expiradas (admin)
router.post('/cleanup', asyncHandler(async (req, res) => {
  const cleanedCount = await SessionService.cleanExpiredSessions();
  
  res.json({
    message: `${cleanedCount} sessão(ões) expirada(s) foram limpas`,
    cleaned_sessions: cleanedCount
  });
}));

// GET /api/sessions/stats - Estatísticas gerais do sistema (admin)
router.get('/stats', asyncHandler(async (req, res) => {
  const { sequelize } = require('../config/database');
  
  const [results] = await sequelize.query(`
    SELECT 
      COUNT(*) as total_sessions,
      COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_sessions,
      COUNT(CASE WHEN date(created_at) = date('now') THEN 1 END) as today_sessions,
      COUNT(CASE WHEN date(created_at) >= date('now', '-7 days') THEN 1 END) as week_sessions,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT date(created_at)) as unique_days,
      AVG(CASE WHEN ended_at IS NOT NULL THEN 
        (julianday(ended_at) - julianday(created_at)) * 24 * 60 
      END) as avg_session_duration_minutes
    FROM user_sessions
  `, {
    type: sequelize.QueryTypes.SELECT
  });

  const deviceStats = await sequelize.query(`
    SELECT 
      json_extract(device_info, '$.browser.name') as browser_name,
      json_extract(device_info, '$.os.name') as os_name,
      COUNT(*) as count
    FROM user_sessions 
    WHERE is_active = 1 AND device_info IS NOT NULL
    GROUP BY browser_name, os_name
    ORDER BY count DESC
    LIMIT 10
  `, {
    type: sequelize.QueryTypes.SELECT
  });

  res.json({
    general: results[0] || {},
    devices: deviceStats || []
  });
}));

module.exports = router;
