// Top-level imports
const express = require('express');
const router = express.Router();
const { PlanningInvite, PlanningCollaborator, VisitPlanning, User, Visit } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const emailService = require('../services/EmailService');

// Middleware de autenticação para todas as rotas
router.use(auth);

// =====================================
// GESTÃO DE CONVITES
// =====================================

// POST /api/planning-collaboration/invite - Enviar convite para colaboração
router.post('/invite', asyncHandler(async (req, res) => {
  try {
    console.log('📧 Recebendo requisição de convite:', {
      body: req.body,
      user: req.user?.id
    });

    const { planning_id, invited_user_id, message } = req.body;

    // Validar campos obrigatórios
    if (!planning_id || !invited_user_id) {
      console.log('❌ Campos obrigatórios faltando');
      return res.status(400).json({
        error: 'Campos obrigatórios',
        message: 'planning_id e invited_user_id são obrigatórios'
      });
    }

  // Verificar se o planejamento existe e se o usuário é o responsável
  const planning = await VisitPlanning.findByPk(planning_id);
  if (!planning) {
    return res.status(404).json({
      error: 'Planejamento não encontrado'
    });
  }

  // Verificar se o usuário tem permissão para convidar (é o responsável ou colaborador com permissão)
  let hasPermission = planning.responsible_id === req.user.id;
  
  if (!hasPermission) {
    // Verificar se é colaborador com permissão de convite
    const collaborator = await PlanningCollaborator.findOne({
      where: {
        planning_id,
        user_id: req.user.id,
        is_active: true
      }
    });
    
    if (collaborator) {
      // Verificar permissão can_invite no objeto permissions
      const permissions = typeof collaborator.permissions === 'string' 
        ? JSON.parse(collaborator.permissions) 
        : collaborator.permissions;
      
      hasPermission = permissions?.can_invite === true;
    }
  }

  if (!hasPermission) {
    return res.status(403).json({
      error: 'Permissão negada',
      message: 'Apenas o responsável pelo planejamento ou colaboradores com permissão podem enviar convites'
    });
  }

  // Verificar se o usuário convidado existe
  const invitedUser = await User.findByPk(invited_user_id);
  if (!invitedUser) {
    return res.status(404).json({
      error: 'Usuário convidado não encontrado'
    });
  }

  // Verificar se já existe convite pendente ou se já é colaborador
  const existingInvite = await PlanningInvite.findOne({
    where: {
      planning_id,
      invited_user_id,
      status: 'pending'
    }
  });

  if (existingInvite) {
    return res.status(400).json({
      error: 'Convite já enviado',
      message: 'Já existe um convite pendente para este usuário neste planejamento'
    });
  }

  const existingCollaborator = await PlanningCollaborator.findOne({
    where: {
      planning_id,
      user_id: invited_user_id,
      is_active: true
    }
  });

  if (existingCollaborator) {
    return res.status(400).json({
      error: 'Usuário já é colaborador',
      message: 'Este usuário já é colaborador deste planejamento'
    });
  }

  // Criar convite
  const invite = await PlanningInvite.create({
    planning_id,
    inviter_id: req.user.id,
    invited_user_id,
    message: message || `${req.user.name} convidou você para colaborar no planejamento semanal`,
    status: 'pending'
  });

  // Buscar convite com dados relacionados
  const inviteWithData = await PlanningInvite.findByPk(invite.id, {
    include: [
      {
        model: User,
        as: 'inviter',
        attributes: ['id', 'name', 'email']
      },
      {
        model: User,
        as: 'invitedUser',
        attributes: ['id', 'name', 'email']
      },
      {
        model: VisitPlanning,
        as: 'planning',
        attributes: ['id', 'week_start_date', 'week_end_date', 'planning_type', 'status']
      }
    ]
  });

  // Enviar email de convite (não bloqueante - sem await)
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const acceptUrl = `${frontendUrl}/planning/invites`;
    
    // Formatar período
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('pt-BR');
    };
    
    emailService.sendCollaborationInvite({
      to: invitedUser.email,
      inviterName: req.user.name,
      invitedUserName: invitedUser.name,
      planningDetails: {
        period: `${formatDate(planning.week_start_date)} a ${formatDate(planning.week_end_date)}`,
        type: planning.planning_type === 'weekly' ? 'Semanal' : 'Mensal',
        description: message
      },
      acceptUrl
    }).catch(err => {
      console.warn('⚠️ Erro ao enviar email de convite (operação não bloqueante):', err.message);
    });
  } catch (emailError) {
    // Log do erro mas não bloqueia a criação do convite
    console.warn('⚠️ Erro ao preparar email de convite:', emailError.message);
  }

  res.status(201).json({
    message: 'Convite enviado com sucesso',
    invite: inviteWithData
  });
  } catch (error) {
    console.error('❌ Erro ao processar convite:', {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    throw error; // O asyncHandler vai pegar e retornar erro apropriado
  }
}));

// GET /api/planning-collaboration/invites/received - Listar convites recebidos
router.get('/invites/received', asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;

  const invites = await PlanningInvite.findAll({
    where: {
      invited_user_id: req.user.id,
      ...(status !== 'all' && { status })
    },
    include: [
      {
        model: User,
        as: 'inviter',
        attributes: ['id', 'name', 'email']
      },
      {
        model: VisitPlanning,
        as: 'planning',
        attributes: ['id', 'week_start_date', 'week_end_date', 'planning_type', 'status'],
        include: [
          {
            model: User,
            as: 'responsible',
            attributes: ['id', 'name', 'email']
          }
        ]
      }
    ],
    order: [['invited_at', 'DESC']]
  });

  res.json({
    invites,
    total: invites.length
  });
}));

// GET /api/planning-collaboration/invites/sent - Listar convites enviados
router.get('/invites/sent', asyncHandler(async (req, res) => {
  const { status = 'all' } = req.query;

  const invites = await PlanningInvite.findAll({
    where: {
      inviter_id: req.user.id,
      ...(status !== 'all' && { status })
    },
    include: [
      {
        model: User,
        as: 'invitedUser',
        attributes: ['id', 'name', 'email']
      },
      {
        model: VisitPlanning,
        as: 'planning',
        attributes: ['id', 'week_start_date', 'week_end_date', 'planning_type', 'status']
      }
    ],
    order: [['invited_at', 'DESC']]
  });

  res.json({
    invites,
    total: invites.length
  });
}));

// PUT /api/planning-collaboration/invites/:id/respond - Responder convite
router.put('/invites/:id/respond', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { response, response_message } = req.body; // 'accepted' ou 'declined'

  if (!['accepted', 'declined'].includes(response)) {
    return res.status(400).json({
      error: 'Resposta inválida',
      message: 'A resposta deve ser "accepted" ou "declined"'
    });
  }

  // Buscar convite
  const invite = await PlanningInvite.findByPk(id, {
    include: [
      {
        model: VisitPlanning,
        as: 'planning',
        attributes: ['id', 'week_start_date', 'week_end_date', 'planning_type', 'responsible_id']
      }
    ]
  });

  if (!invite) {
    return res.status(404).json({
      error: 'Convite não encontrado'
    });
  }

  // Verificar se o usuário é o destinatário do convite
  if (invite.invited_user_id !== req.user.id) {
    return res.status(403).json({
      error: 'Permissão negada',
      message: 'Você só pode responder convites enviados para você'
    });
  }

  // Verificar se o convite ainda está pendente
  if (invite.status !== 'pending') {
    return res.status(400).json({
      error: 'Convite já respondido',
      message: `Este convite já foi ${invite.status === 'accepted' ? 'aceito' : 'recusado'}`
    });
  }

  // Atualizar convite
  await invite.update({
    status: response,
    responded_at: new Date(),
    response_message: response_message || null
  });

  // Se aceito, criar colaborador e sincronizar agendamentos
  if (response === 'accepted') {
    // Criar colaborador
    await PlanningCollaborator.create({
      planning_id: invite.planning_id,
      user_id: req.user.id,
      role: 'collaborator',
      permissions: {
        can_view: true,
        can_edit: false,
        can_delete: false,
        can_invite: false,
        can_execute: false
      },
      added_by: invite.inviter_id,
      sync_to_calendar: true
    });

    // Sincronizar agendamentos (criar cópias das visitas no calendário do colaborador)
    await syncPlanningToCollaborator(invite.planning_id, req.user.id);
  }

  res.json({
    message: response === 'accepted' ? 'Convite aceito com sucesso' : 'Convite recusado',
    invite: {
      ...invite.toJSON(),
      status: response,
      responded_at: new Date(),
      response_message
    }
  });
}));

// =====================================
// GESTÃO DE COLABORADORES
// =====================================

// GET /api/planning-collaboration/:planningId/collaborators - Listar colaboradores
router.get('/:planningId/collaborators', asyncHandler(async (req, res) => {
  const { planningId } = req.params;

  // Verificar se o planejamento existe e se o usuário tem acesso
  const planning = await VisitPlanning.findByPk(planningId);
  if (!planning) {
    return res.status(404).json({
      error: 'Planejamento não encontrado'
    });
  }

  // Verificar permissão de visualização
  const hasAccess = planning.responsible_id === req.user.id ||
    await PlanningCollaborator.findOne({
      where: {
        planning_id: planningId,
        user_id: req.user.id,
        is_active: true
      }
    });

  if (!hasAccess) {
    return res.status(403).json({
      error: 'Permissão negada',
      message: 'Você não tem acesso a este planejamento'
    });
  }

  // Buscar colaboradores
  const collaborators = await PlanningCollaborator.findAll({
    where: {
      planning_id: planningId,
      is_active: true
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role', 'department']
      },
      {
        model: User,
        as: 'addedBy',
        attributes: ['id', 'name', 'email']
      }
    ],
    order: [['added_at', 'ASC']]
  });

  // Incluir o responsável principal
  const responsible = await User.findByPk(planning.responsible_id, {
    attributes: ['id', 'name', 'email', 'role', 'department']
  });

  res.json({
    collaborators,
    responsible,
    total: collaborators.length + 1 // +1 para incluir o responsável
  });
}));

// PUT /api/planning-collaboration/collaborators/:id/permissions - Atualizar permissões
router.put('/collaborators/:id/permissions', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;

  // Buscar colaborador
  const collaborator = await PlanningCollaborator.findByPk(id, {
    include: [
      {
        model: VisitPlanning,
        as: 'planning',
        attributes: ['responsible_id']
      }
    ]
  });

  if (!collaborator) {
    return res.status(404).json({
      error: 'Colaborador não encontrado'
    });
  }

  // Verificar se o usuário é o responsável pelo planejamento
  if (collaborator.planning.responsible_id !== req.user.id) {
    return res.status(403).json({
      error: 'Permissão negada',
      message: 'Apenas o responsável pelo planejamento pode alterar permissões'
    });
  }

  // Validar estrutura de permissões
  const validPermissions = ['can_view', 'can_edit', 'can_delete', 'can_invite', 'can_execute'];
  const invalidPermissions = Object.keys(permissions).filter(p => !validPermissions.includes(p));
  
  if (invalidPermissions.length > 0) {
    return res.status(400).json({
      error: 'Permissões inválidas',
      message: `Permissões inválidas: ${invalidPermissions.join(', ')}`,
      validPermissions
    });
  }

  // Atualizar permissões
  await collaborator.update({
    permissions: {
      ...collaborator.permissions,
      ...permissions
    }
  });

  res.json({
    message: 'Permissões atualizadas com sucesso',
    collaborator: collaborator.toJSON()
  });
}));

// DELETE /api/planning-collaboration/collaborators/:id - Remover colaborador
router.delete('/collaborators/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Buscar colaborador
  const collaborator = await PlanningCollaborator.findByPk(id, {
    include: [
      {
        model: VisitPlanning,
        as: 'planning',
        attributes: ['responsible_id']
      }
    ]
  });

  if (!collaborator) {
    return res.status(404).json({
      error: 'Colaborador não encontrado'
    });
  }

  // Verificar permissão (responsável ou o próprio colaborador)
  const canRemove = collaborator.planning.responsible_id === req.user.id || 
                   collaborator.user_id === req.user.id;

  if (!canRemove) {
    return res.status(403).json({
      error: 'Permissão negada',
      message: 'Apenas o responsável pelo planejamento ou o próprio colaborador pode remover a colaboração'
    });
  }

  // Marcar como inativo ao invés de deletar
  await collaborator.update({
    is_active: false
  });

  // Remover visitas sincronizadas do calendário do colaborador
  await removeSyncedVisitsFromCollaborator(collaborator.planning_id, collaborator.user_id);

  res.json({
    message: 'Colaborador removido com sucesso'
  });
}));

// =====================================
// FUNÇÕES AUXILIARES
// =====================================

// Sincronizar planejamento com colaborador (criar cópias das visitas)
const syncPlanningToCollaborator = async (planningId, collaboratorUserId) => {
  try {
    // Buscar todas as visitas ativas do planejamento
    const visits = await Visit.findAll({
      where: {
        planning_id: planningId,
        status: { [Op.in]: ['agendada', 'em_andamento', 'planejada'] }
      }
    });

    let createdCount = 0;
    // Criar uma cópia de cada visita para o colaborador
    for (const visit of visits) {
      // Verificar se já existe uma cópia sincronizada
      const existingSync = await Visit.findOne({
        where: {
          responsible_id: collaboratorUserId,
          scheduled_date: visit.scheduled_date,
          scheduled_time: visit.scheduled_time,
          source: `sync_${visit.id}` // Identificador de sincronização
        }
      });

      if (!existingSync) {
        await Visit.create({
          title: `[SYNC] ${visit.title}`,
          type: visit.type,
          scheduled_date: visit.scheduled_date,
          scheduled_time: visit.scheduled_time,
          address: visit.address,
          notes: `Compromisso sincronizado do planejamento compartilhado. Original: ${visit.title}`,
          priority: visit.priority,
          estimated_duration: visit.estimated_duration,
          status: 'planejada', // Status específico para sincronizados
          responsible_id: collaboratorUserId,
          planning_id: planningId,
          client_id: visit.client_id,
          lead_id: visit.lead_id,
          client_name: visit.client_name,
          client_address: visit.client_address,
          visit_type: visit.visit_type,
          source: `sync_${visit.id}` // Identificador de sincronização
        });
        createdCount++;
      }
    }

    // Atualizar data de sincronização
    await PlanningCollaborator.update(
      { last_sync_at: new Date() },
      {
        where: { planning_id: planningId, user_id: collaboratorUserId }
      }
    );
    broadcast({ type: 'visit.created', payload: { planning_id: planningId, responsible_id: collaboratorUserId, batch: true, count: createdCount } });
  } catch (error) {
    console.error('Erro ao sincronizar planejamento:', error);
    throw error;
  }
};

// Remover visitas sincronizadas do colaborador
const removeSyncedVisitsFromCollaborator = async (planningId, collaboratorUserId) => {
  try {
    // Buscar visitas originais do planejamento
    const originalVisits = await Visit.findAll({
      where: {
        planning_id: planningId,
        responsible_id: { [Op.ne]: collaboratorUserId } // Não é do colaborador
      },
      attributes: ['id']
    });

    // Remover visitas sincronizadas
    const syncSources = originalVisits.map(v => `sync_${v.id}`);
    const deletedCount = await Visit.destroy({
      where: {
        responsible_id: collaboratorUserId,
        source: { [Op.in]: syncSources }
      }
    });
    broadcast({ type: 'visit.deleted', payload: { planning_id: planningId, responsible_id: collaboratorUserId, batch: true, count: deletedCount } });
  } catch (error) {
    console.error('Erro ao remover visitas sincronizadas:', error);
    throw error;
  }
};

module.exports = router;


