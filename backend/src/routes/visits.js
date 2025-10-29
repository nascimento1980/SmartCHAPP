// Top-level imports
const express = require('express');
const router = express.Router();
const { Visit, User, VisitPlanning, VisitPlanningItem, Form, FormSubmission } = require('../models');
const { Op } = require('sequelize');
const { asyncHandler } = require('../middleware/errorHandler');
const Joi = require('joi');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { broadcast } = require('./events');

// Importar funções de agendamento de horários
const { suggestAvailableTimes, checkTimeConflictWithSuggestions } = require('../utils/timeScheduling');

// Middleware para verificar permissões
const { requireRoleForMethod } = require('../middleware/hierarchicalAuth');

// Aplicar middleware de permissões para todas as rotas
router.use(requireRoleForMethod({
  get: 'sales',     // Role mínimo para GET
  post: 'sales',    // Role mínimo para POST
  put: 'sales',     // Role mínimo para PUT
  delete: 'manager' // Role mínimo para DELETE
}));

// Esquemas de validação
const visitSchema = Joi.object({
  title: Joi.string().required().min(3).max(255),
  description: Joi.string().allow('').max(1000),
  scheduled_date: Joi.date().required(),
  scheduled_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  estimated_duration: Joi.number().positive().max(24),
  visit_type: Joi.string().valid('prospeccao', 'apresentacao', 'negociacao', 'fechamento', 'pos_venda', 'suporte').required(),
  priority: Joi.string().valid('baixa', 'media', 'alta', 'urgente').default('media'),
  client_name: Joi.string().required().min(2).max(255),
  client_email: Joi.string().email().allow(''),
  client_phone: Joi.string().allow('').max(20),
  address: Joi.string().required().min(5).max(500),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  responsible_id: Joi.number().integer().positive(),
  planning_id: Joi.number().integer().positive().allow(null),
  notes: Joi.string().allow('').max(1000)
});

const updateVisitSchema = visitSchema.fork(['title', 'scheduled_date', 'scheduled_time', 'visit_type', 'client_name', 'address'], (schema) => schema.optional());

// ==========================================
// ROTA DE AUDITORIA - DEVE VIR PRIMEIRO
// ==========================================

// GET /api/visits/audit/deleted - Buscar visitas excluídas (auditoria)
router.get('/audit/deleted', asyncHandler(async (req, res) => {
  // CONTROLE DE ACESSO: Apenas níveis superiores de gestão podem acessar auditoria
  const authorizedRoles = ['manager', 'admin', 'master'];
  if (!req.user || !authorizedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'Acesso negado',
      message: 'Apenas gestores, administradores e masters podem acessar relatórios de auditoria de visitas excluídas.',
      requiredRoles: authorizedRoles,
      userRole: req.user?.role || 'não identificado'
    });
  }

  // Acesso autorizado - retornar dados de auditoria
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Query SQL direta para contornar problemas do Sequelize
    const { sequelize } = require('../models');
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM visits 
      WHERE status = 'excluida'
    `;
    
    const dataQuery = `
      SELECT 
        v.id, v.title, v.status, v.scheduled_date, v.scheduled_time,
        v.deleted_at, v.deletion_reason,
        u1.name as responsible_name, u1.email as responsible_email,
        u2.name as deleted_by_name, u2.email as deleted_by_email
      FROM visits v
      LEFT JOIN users u1 ON v.responsible_id = u1.id
      LEFT JOIN users u2 ON v.deleted_by = u2.id
      WHERE v.status = 'excluida'
      ORDER BY v.deleted_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;

    const [countResult] = await sequelize.query(countQuery);
    const [visits] = await sequelize.query(dataQuery);
    
    const total = countResult[0].total;

    res.json({
      success: true,
      visits: visits,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Erro na consulta de auditoria:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao buscar dados de auditoria'
    });
  }
}));

// ==========================================
// ROTAS DE SUGESTÃO DE HORÁRIOS
// ==========================================

// GET /api/visits/suggest-times - Sugerir horários disponíveis
router.get('/suggest-times', asyncHandler(async (req, res) => {
  const { date, user_id, duration } = req.query;

  // Validar parâmetros obrigatórios
  if (!date) {
    return res.status(400).json({
      error: 'Parâmetro obrigatório',
      message: 'O parâmetro "date" é obrigatório (formato: YYYY-MM-DD)'
    });
  }

  // Usar ID do usuário da query ou do usuário logado
  const targetUserId = user_id || req.user.id;

  // Verificar se o usuário pode consultar horários de outro usuário
  if (user_id && user_id !== req.user.id) {
    const authorizedRoles = ['manager', 'admin', 'master'];
    if (!authorizedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Você só pode consultar seus próprios horários'
      });
    }
  }

  try {
    // Converter data string para objeto Date
    const targetDate = new Date(date + 'T00:00:00');
    
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        error: 'Data inválida',
        message: 'Formato de data inválido. Use YYYY-MM-DD'
      });
    }

    // Sugerir horários disponíveis
    const suggestions = await suggestAvailableTimes(
      targetUserId, 
      targetDate, 
      duration ? parseInt(duration) : null
    );

    res.json({
      message: 'Horários sugeridos com sucesso',
      ...suggestions
    });

  } catch (error) {
    console.error('Erro ao sugerir horários:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao processar sugestões de horário'
    });
  }
}));

// POST /api/visits/check-time-conflict - Verificar conflito de horário com sugestões
router.post('/check-time-conflict', asyncHandler(async (req, res) => {
  const { date, time, user_id, duration } = req.body;

  // Validar parâmetros obrigatórios
  if (!date || !time) {
    return res.status(400).json({
      error: 'Parâmetros obrigatórios',
      message: 'Os parâmetros "date" e "time" são obrigatórios'
    });
  }

  // Usar ID do usuário do body ou do usuário logado
  const targetUserId = user_id || req.user.id;

  // Verificar se o usuário pode consultar horários de outro usuário
  if (user_id && user_id !== req.user.id) {
    const authorizedRoles = ['manager', 'admin', 'master'];
    if (!authorizedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Você só pode verificar seus próprios horários'
      });
    }
  }

  try {
    // Converter data string para objeto Date
    const targetDate = new Date(date + 'T00:00:00');
    
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        error: 'Data inválida',
        message: 'Formato de data inválido. Use YYYY-MM-DD'
      });
    }

    // Validar formato de horário
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({
        error: 'Horário inválido',
        message: 'Formato de horário inválido. Use HH:MM'
      });
    }

    // Verificar conflito e sugerir alternativas
    const conflictCheck = await checkTimeConflictWithSuggestions(
      targetUserId,
      targetDate,
      time,
      duration ? parseInt(duration) : null
    );

    res.json({
      message: conflictCheck.hasConflict 
        ? 'Conflito de horário detectado com sugestões de alternativas'
        : 'Horário disponível',
      ...conflictCheck
    });

  } catch (error) {
    console.error('Erro ao verificar conflito de horário:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao verificar conflito de horário'
    });
  }
}));

// GET /api/visits - Listar visitas
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status, date } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = {
    // Filtrar visitas excluídas por padrão
    status: { [Op.ne]: 'excluida' }
  };
  
  if (search) {
    whereClause[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { address: { [Op.like]: `%${search}%` } },
      { notes: { [Op.like]: `%${search}%` } }
    ];
  }

  if (status) {
    // Se o status específico for solicitado, substituir o filtro padrão
    whereClause.status = status;
  }

  if (date) {
    whereClause.scheduled_date = {
      [Op.between]: [`${date} 00:00:00`, `${date} 23:59:59`]
    };
  }

  const { count, rows } = await Visit.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'responsible',
        attributes: ['id', 'name']
      }
    ],
    attributes: [
      'id', 'title', 'type', 'scheduled_date', 'scheduled_time', 'address',
      'priority', 'status', 'responsible_id', 'planning_id', 'source'
    ],
    order: [['scheduled_date', 'ASC'], ['scheduled_time', 'ASC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    visits: rows,
    total: count,
    page: parseInt(page),
    totalPages: Math.ceil(count / limit)
  });
}));

// router.post('/') - Criar nova visita
router.post('/', asyncHandler(async (req, res) => {
  // Limpar e validar dados
  const visitData = {
    title: req.body.title,
    type: req.body.type || 'comercial',
    scheduled_date: req.body.scheduled_date,
    scheduled_time: req.body.scheduled_time,
    address: req.body.address,
    notes: req.body.notes,
    priority: req.body.priority || 'media',
    estimated_duration: req.body.estimated_duration,
    status: req.body.status || 'agendada',
    responsible_id: req.body.responsible_id || req.user.id,
    planning_id: req.body.planning_id,
    planned_distance: req.body.planned_distance || 0,
    planned_fuel: req.body.planned_fuel || 0,
    planned_cost: req.body.planned_cost || 0,
    source: req.body.source || 'direct'
  };

  // Só incluir foreign keys se não estiverem vazias ou null
  if (req.body.client_id && req.body.client_id !== '' && req.body.client_id !== null) {
    visitData.client_id = req.body.client_id;
  }
  
  if (req.body.lead_id && req.body.lead_id !== '' && req.body.lead_id !== null) {
    visitData.lead_id = req.body.lead_id;
  }

  // NOVA FUNCIONALIDADE: Validação automática de planejamento semanal
  if (visitData.scheduled_date && !visitData.planning_id) {
    try {
      const visitDate = new Date(visitData.scheduled_date);
      const planning = await ensureWeeklyPlanning(
        visitDate, 
        visitData.responsible_id, 
        visitData.type
      );
      
      // Associar a visita ao planejamento criado/encontrado
      visitData.planning_id = planning.id;
      
      console.log('✅ Visita associada ao planejamento:', {
        visitDate: visitData.scheduled_date,
        planningId: planning.id,
        planningWeek: `${planning.week_start_date} a ${planning.week_end_date}`
      });
      
    } catch (planningError) {
      console.error('⚠️ Erro ao criar planejamento automático:', planningError);
      // Continuar sem planejamento se houver erro (não bloquear criação da visita)
    }
  }

  // Validação de conflito de horário com sugestões inteligentes
  if (visitData.scheduled_date && visitData.scheduled_time) {
    const targetDate = new Date(visitData.scheduled_date);
    
    // Usar nova função de verificação de conflitos com sugestões
    const conflictCheck = await checkTimeConflictWithSuggestions(
      visitData.responsible_id,
      targetDate,
      visitData.scheduled_time,
      visitData.estimated_duration
    );

    if (conflictCheck.hasConflict) {
      return res.status(400).json({
        error: 'Conflito de horário detectado',
        message: conflictCheck.message,
        conflictingAppointment: conflictCheck.conflictingAppointment,
        alternativeTimes: conflictCheck.alternativeTimes || [],
        nextAvailableDay: conflictCheck.nextAvailableDay || null,
        suggestions: {
          message: 'Horários alternativos disponíveis:',
          times: (conflictCheck.alternativeTimes || []).map(slot => ({
            time: slot.time,
            formatted: slot.formatted
          }))
        }
      });
    }
  }

  const visit = await Visit.create(visitData);
  
  const createdVisit = await Visit.findByPk(visit.id, {
    include: [
      {
        model: User,
        as: 'responsible',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  // NEW: SSE broadcast
  broadcast({
    type: 'visit.created',
    payload: { id: createdVisit.id, planning_id: createdVisit.planning_id, responsible_id: createdVisit.responsible_id }
  });

  res.status(201).json({
    message: 'Visita criada com sucesso',
    visit: createdVisit,
    planning_info: visitData.planning_id ? {
      planning_id: visitData.planning_id,
      message: 'Visita associada ao planejamento semanal automaticamente'
    } : null
  });
}));

// GET /api/visits/:id - Buscar visita por ID
router.get('/:id', asyncHandler(async (req, res) => {
  const visit = await Visit.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'responsible',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  if (!visit) {
    return res.status(404).json({ error: 'Visita não encontrada' });
  }

  res.json({ visit });
}));

// router.put('/:id') - Atualizar visita
router.put('/:id', asyncHandler(async (req, res) => {
  const visit = await Visit.findByPk(req.params.id);

  if (!visit) {
    return res.status(404).json({ error: 'Visita não encontrada' });
  }

  // VALIDAÇÃO: Não permitir edição de visitas concluídas
  if (visit.status === 'concluida') {
    return res.status(400).json({ 
      error: 'Não é possível editar uma visita concluída',
      details: 'Visitas concluídas são somente leitura'
    });
  }

  // NOVA FUNCIONALIDADE: Validação automática de planejamento semanal ao editar
  const updateData = { ...req.body };
  
  if (updateData.scheduled_date && !updateData.planning_id) {
    try {
      const visitDate = new Date(updateData.scheduled_date);
      const responsibleId = updateData.responsible_id || visit.responsible_id;
      const visitType = updateData.type || visit.type;
      
      const planning = await ensureWeeklyPlanning(
        visitDate, 
        responsibleId, 
        visitType
      );
      
      // Associar a visita ao planejamento criado/encontrado
      updateData.planning_id = planning.id;
      
      console.log('✅ Visita editada associada ao planejamento:', {
        visitId: visit.id,
        newDate: updateData.scheduled_date,
        planningId: planning.id
      });
      
    } catch (planningError) {
      console.error('⚠️ Erro ao criar planejamento automático na edição:', planningError);
      // Continuar sem planejamento se houver erro
    }
  }

  await visit.update(updateData);
  
  const updatedVisit = await Visit.findByPk(visit.id, {
    include: [
      {
        model: User,
        as: 'responsible',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  // NEW: SSE broadcast
  broadcast({
    type: 'visit.updated',
    payload: { id: updatedVisit.id, planning_id: updatedVisit.planning_id, status: updatedVisit.status }
  });

  res.json({
    message: 'Visita atualizada com sucesso',
    visit: updatedVisit,
    planning_info: updateData.planning_id ? {
      planning_id: updateData.planning_id,
      message: 'Visita associada ao planejamento semanal automaticamente'
    } : null
  });
}));

// DELETE /api/visits/:id - Deletar visita (soft delete com justificativa)
router.delete('/:id', asyncHandler(async (req, res) => {
  const { deletion_reason } = req.body;

  // Validar se a justificativa foi fornecida
  if (!deletion_reason || deletion_reason.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Justificativa obrigatória',
      message: 'É obrigatório fornecer uma justificativa para exclusão da visita.'
    });
  }

  // Validar tamanho mínimo da justificativa
  if (deletion_reason.trim().length < 10) {
    return res.status(400).json({ 
      error: 'Justificativa muito curta',
      message: 'A justificativa deve ter pelo menos 10 caracteres.'
    });
  }

  const visit = await Visit.scope('withDeleted').findByPk(req.params.id);

  if (!visit) {
    return res.status(404).json({ error: 'Visita não encontrada' });
  }

  // Verificar se a visita já foi excluída
  if (visit.deleted_at || visit.status === 'excluida') {
    return res.status(400).json({ 
      error: 'Visita já excluída',
      message: 'Esta visita já foi excluída anteriormente.'
    });
  }

  // Implementar soft delete
  const deletedAt = new Date();
  await visit.update({
    status: 'excluida',
    deleted_at: deletedAt,
    deleted_by: req.user.id,
    deletion_reason: deletion_reason.trim()
  });

  // NEW: SSE broadcast
  broadcast({
    type: 'visit.deleted',
    payload: { id: visit.id, planning_id: visit.planning_id }
  });

  res.json({ 
    message: 'Visita excluída com sucesso',
    deletion_info: {
      deleted_at: deletedAt,
      deleted_by: req.user.id,
      deletion_reason: deletion_reason.trim()
    }
  });
}));

// router.put('/:id/status') - Atualizar status da visita
router.put('/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  const visit = await Visit.findByPk(req.params.id);

  if (!visit) {
    return res.status(404).json({ error: 'Visita não encontrada' });
  }

  // VALIDAÇÃO: Não permitir alteração de status se já estiver concluída
  if (visit.status === 'concluida' && status !== 'concluida') {
    return res.status(400).json({ 
      error: 'Não é possível alterar o status de uma visita concluída',
      details: 'Visitas concluídas são somente leitura'
    });
  }

  await visit.update({ status });

  // NEW: SSE broadcast
  broadcast({
    type: 'visit.updated',
    payload: { id: visit.id, status }
  });

  res.json({
    message: 'Status da visita atualizado com sucesso',
    visit
  });
}));

// POST /api/visits/:id/checkin - Fazer check-in na visita
// router.post('/:id/checkin') - Check-in
router.post('/:id/checkin', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude, notes } = req.body;

  // Validações
  if (!latitude || !longitude) {
    return res.status(400).json({ 
      error: 'Coordenadas obrigatórias',
      details: 'Latitude e longitude devem ser fornecidas'
    });
  }

  const visit = await Visit.findByPk(id);
  if (!visit) {
    return res.status(404).json({ error: 'Visita não encontrada' });
  }

  // VALIDAÇÃO: Não permitir check-in em visitas concluídas
  if (visit.status === 'concluida') {
    return res.status(400).json({ 
      error: 'Não é possível fazer check-in em uma visita concluída',
      details: 'Visitas concluídas são somente leitura'
    });
  }

  // Atualizar visita com check-in (alinhar com o modelo)
  await visit.update({
    status: 'em_andamento',
    checkin_time: new Date(),
    checkin_latitude: latitude,
    checkin_longitude: longitude,
    notes_checkin: notes || null
  });

  // NEW: SSE broadcast
  broadcast({
    type: 'visit.updated',
    payload: { id: visit.id, status: 'em_andamento' }
  });

  res.json({
    message: 'Check-in realizado com sucesso',
    visit
  });
}));

// POST /api/visits/:id/checkout - Fazer check-out na visita
// router.post('/:id/checkout') - Check-out
router.post('/:id/checkout', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes, client_satisfaction, latitude, longitude, actual_duration } = req.body;

  const visit = await Visit.findByPk(id);
  if (!visit) {
    return res.status(404).json({ error: 'Visita não encontrada' });
  }

  // VALIDAÇÃO: Não permitir check-out em visitas concluídas
  if (visit.status === 'concluida') {
    return res.status(400).json({ 
      error: 'Não é possível fazer check-out em uma visita já concluída',
      details: 'Visitas concluídas são somente leitura'
    });
  }

  // Validar se já foi feito check-in
  if (visit.status !== 'em_andamento') {
    return res.status(400).json({ 
      error: 'Check-in deve ser feito primeiro',
      details: 'Apenas visitas em andamento podem fazer check-out'
    });
  }

  // Bloqueio: exigir formulário SMART para tipos específicos
  try {
    const typeNorm = (s) => (s || '').toLowerCase();
    const needsSmart = ['comercial','diagnostico'].includes(typeNorm(visit.type));
    if (needsSmart) {
      const smartForm = await Form.findOne({ where: { title: { [Op.like]: '%SMART de Higieniza%' } } });
      if (smartForm) {
        const submitted = await FormSubmission.count({ where: { form_id: smartForm.id }, limit: 1 });
        if (!submitted) {
          return res.status(400).json({ error: 'Preencha o formulário SMART antes do check-out', code: 'SMART_FORM_REQUIRED' });
        }
      }
    }
  } catch (_) {}

  // Calcular duração real caso não seja fornecida (em horas, 1 casa decimal)
  let computedActualDuration = null;
  try {
    if (!actual_duration && visit.checkin_time) {
      const diffMs = Date.now() - new Date(visit.checkin_time).getTime();
      const hours = diffMs / 3600000; // ms -> h
      computedActualDuration = Number(hours.toFixed(1));
    }
  } catch (_) {}

  // Atualizar visita com check-out (alinhar com o modelo)
  await visit.update({
    status: 'concluida',
    checkout_time: new Date(),
    checkout_latitude: typeof latitude === 'number' ? latitude : undefined,
    checkout_longitude: typeof longitude === 'number' ? longitude : undefined,
    notes_checkout: notes || null,
    client_satisfaction: client_satisfaction || null,
    actual_duration: typeof actual_duration === 'number' ? actual_duration : computedActualDuration
  });

  // NEW: SSE broadcast
  broadcast({
    type: 'visit.updated',
    payload: { id: visit.id, status: 'concluida' }
  });

  res.json({ 
    message: 'Check-out realizado com sucesso',
    visit
  });
}));

// GET /api/visits/:id/metrics - Buscar métricas de uma visita específica
router.get('/:id/metrics', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const visit = await Visit.findByPk(id, {
    include: [
      {
        model: User,
        as: 'responsible',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  if (!visit) {
    return res.status(404).json({ error: 'Visita não encontrada' });
  }

  const metrics = {
    id: visit.id,
    title: visit.title,
    scheduled_duration: visit.estimated_duration || 0,
    actual_duration: visit.actual_duration || 0,
    travel_distance: visit.travel_distance || 0,
    travel_time: visit.travel_time || 0,
    fuel_consumed: visit.fuel_consumed || 0,
    travel_cost: visit.travel_cost || 0,
    efficiency: visit.estimated_duration > 0 ? 
      Math.round(((visit.estimated_duration - (visit.actual_duration || 0)) / visit.estimated_duration) * 100) : 0,
    checkin_time: visit.checkin_time,
    checkout_time: visit.checkout_time,
    status: visit.status
  };

  res.json({ metrics });
}));

// GET /api/visits/planning/:planningId - Buscar visitas de um planejamento específico
router.get('/planning/:planningId', asyncHandler(async (req, res) => {
  const { planningId } = req.params;

  const visits = await Visit.findAll({
    where: {
      planning_id: planningId
    },
    include: [
      {
        model: User,
        as: 'responsible',
        attributes: ['id', 'name', 'email']
      }
    ],
    order: [['scheduled_date', 'ASC'], ['scheduled_time', 'ASC']]
  });

  res.json({ visits });
}));

// GET /api/visits/:id/invites - Buscar convites de uma visita específica
router.get('/:id/invites', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verificar se a visita existe
  const visit = await Visit.findByPk(id);
  if (!visit) {
    return res.status(404).json({ error: 'Visita não encontrada' });
  }

  // Buscar convites relacionados à visita através do planning_id
  const { PlanningInvite, User, VisitPlanning } = require('../models');
  
  let invites = [];
  
  if (visit.planning_id) {
    invites = await PlanningInvite.findAll({
      where: {
        planning_id: visit.planning_id
      },
      include: [
        {
          model: User,
          as: 'invitedUser',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['invited_at', 'DESC']]
    });
  }

  res.json({
    invites: invites,
    total: invites.length
  });
}));

// Função para calcular datas da semana (segunda a sexta)
function getWeekDates(date) {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    
    // Calcular segunda-feira (dia 1)
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() + daysToMonday);
    
    // Calcular sexta-feira (segunda + 4 dias)
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    
    return {
        start: monday.toISOString().split('T')[0],
        end: friday.toISOString().split('T')[0]
    };
}

// Função para garantir planejamento semanal
async function ensureWeeklyPlanning(visitDate, userId, visitType) {
    const weekDates = getWeekDates(visitDate);
    
    // Verificar se já existe planejamento para a semana
    let planning = await VisitPlanning.findOne({
        where: {
            user_id: userId,
            start_date: weekDates.start,
            end_date: weekDates.end
        }
    });
    
    // Se não existe, criar automaticamente
    if (!planning) {
        planning = await VisitPlanning.create({
            user_id: userId,
            start_date: weekDates.start,
            end_date: weekDates.end,
            planning_type: visitType,
            status: 'active',
            created_at: new Date()
        });
    }
    
    return planning;
}

module.exports = router;