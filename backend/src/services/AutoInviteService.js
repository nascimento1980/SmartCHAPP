const { Op } = require('sequelize');
const cron = require('node-cron');
const Visit = require('../models/Visit');
const VisitPlanningItem = require('../models/VisitPlanningItem');
const User = require('../models/User');
const PlanningInvite = require('../models/PlanningInvite');
const PlanningCollaborator = require('../models/PlanningCollaborator');

class AutoInviteService {
  constructor() {
    this.isRunning = false;
    this.initScheduler();
  }

  /**
   * Inicializa o agendador de tarefas
   */
  initScheduler() {
    // Executa todos os dias às 7:00 da manhã
    cron.schedule('0 7 * * *', async () => {
      console.log('🔔 Executando verificação de convites automáticos...');
      await this.processDailyInvites();
    });

    // Executa também a cada 2 horas durante o horário comercial
    cron.schedule('0 8-18/2 * * 1-5', async () => {
      console.log('🔔 Verificação de convites automáticos (horário comercial)...');
      await this.processDailyInvites();
    });

    console.log('✅ Agendador de convites automáticos iniciado');
  }

  /**
   * Processa convites automáticos para o dia atual
   */
  async processDailyInvites() {
    if (this.isRunning) {
      console.log('⏳ Processamento de convites já em execução...');
      return;
    }

    this.isRunning = true;
    
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      console.log(`📅 Processando convites para ${todayStr}`);

      // Buscar visitas agendadas para hoje
      const todayVisits = await this.getTodayVisits(todayStr);
      console.log(`📋 Encontradas ${todayVisits.length} visitas para hoje`);

      // Buscar itens de planejamento para hoje
      const todayPlanningItems = await this.getTodayPlanningItems(todayStr);
      console.log(`📋 Encontrados ${todayPlanningItems.length} itens de planejamento para hoje`);

      // Processar convites para visitas
      for (const visit of todayVisits) {
        await this.processVisitInvites(visit);
      }

      // Processar convites para itens de planejamento
      for (const planningItem of todayPlanningItems) {
        await this.processPlanningItemInvites(planningItem);
      }

      console.log('✅ Processamento de convites automáticos concluído');

    } catch (error) {
      console.error('❌ Erro ao processar convites automáticos:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Busca visitas agendadas para hoje
   */
  async getTodayVisits(todayStr) {
    return await Visit.findAll({
      where: {
        scheduled_date: {
          [Op.gte]: new Date(todayStr + 'T00:00:00'),
          [Op.lt]: new Date(todayStr + 'T23:59:59')
        },
        status: {
          [Op.in]: ['agendada', 'planejada']
        }
      },
      include: [
        {
          model: User,
          as: 'responsible',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
  }

  /**
   * Busca itens de planejamento para hoje
   */
  async getTodayPlanningItems(todayStr) {
    return await VisitPlanningItem.findAll({
      where: {
        planned_date: todayStr,
        status: {
          [Op.in]: ['planejada', 'em_andamento']
        }
      }
    });
  }

  /**
   * Processa convites automáticos para uma visita
   */
  async processVisitInvites(visit) {
    try {
      // Verificar se a visita tem planejamento associado
      if (!visit.planning_id) {
        console.log(`ℹ️ Visita ${visit.id} não tem planejamento associado`);
        return;
      }

      // Buscar colaboradores do planejamento
      const collaborators = await PlanningCollaborator.findAll({
        where: {
          planning_id: visit.planning_id,
          is_active: true,
          user_id: {
            [Op.ne]: visit.responsible_id // Não incluir o próprio responsável
          }
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      console.log(`👥 Encontrados ${collaborators.length} colaboradores para visita ${visit.id}`);

      // Enviar convites para colaboradores
      for (const collaborator of collaborators) {
        await this.sendVisitInvite(visit, collaborator.user);
      }

    } catch (error) {
      console.error(`❌ Erro ao processar convites para visita ${visit.id}:`, error);
    }
  }

  /**
   * Processa convites automáticos para um item de planejamento
   */
  async processPlanningItemInvites(planningItem) {
    try {
      // Buscar colaboradores do planejamento
      const collaborators = await PlanningCollaborator.findAll({
        where: {
          planning_id: planningItem.planning_id,
          is_active: true
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      console.log(`👥 Encontrados ${collaborators.length} colaboradores para item de planejamento ${planningItem.id}`);

      // Enviar convites para colaboradores
      for (const collaborator of collaborators) {
        await this.sendPlanningItemInvite(planningItem, collaborator.user);
      }

    } catch (error) {
      console.error(`❌ Erro ao processar convites para item de planejamento ${planningItem.id}:`, error);
    }
  }

  /**
   * Envia convite automático para uma visita
   */
  async sendVisitInvite(visit, user) {
    try {
      // Verificar se já foi enviado convite hoje
      const today = new Date().toISOString().split('T')[0];
      const existingInvite = await PlanningInvite.findOne({
        where: {
          planning_id: visit.planning_id,
          invited_user_id: user.id,
          invited_at: {
            [Op.gte]: new Date(today + 'T00:00:00')
          }
        }
      });

      if (existingInvite) {
        console.log(`ℹ️ Convite já enviado hoje para ${user.name} - visita ${visit.id}`);
        return;
      }

      // Criar notificação/convite automático
      const inviteMessage = `🔔 Lembrete automático: Você tem uma visita agendada hoje!
      
📅 Data: ${visit.scheduled_date.toLocaleDateString('pt-BR')}
⏰ Horário: ${visit.scheduled_time || 'A definir'}
📍 Local: ${visit.address || 'A definir'}
📝 Título: ${visit.title}
🎯 Tipo: ${visit.type}
⚡ Prioridade: ${visit.priority}

Acesse o sistema para mais detalhes e atualizações.`;

      // Criar registro de convite automático
      await PlanningInvite.create({
        planning_id: visit.planning_id,
        inviter_id: visit.responsible_id,
        invited_user_id: user.id,
        message: inviteMessage,
        status: 'accepted', // Convites automáticos são aceitos automaticamente
        invited_at: new Date(),
        responded_at: new Date(),
        response_message: 'Convite automático aceito automaticamente',
        is_automatic: true,
        notification_sent: true
      });

      // Enviar email se configurado
      await this.sendNotificationEmail(user, visit, inviteMessage);

      console.log(`✅ Convite automático enviado para ${user.name} - visita ${visit.id}`);

    } catch (error) {
      console.error(`❌ Erro ao enviar convite para ${user.name}:`, error);
    }
  }

  /**
   * Envia convite automático para um item de planejamento
   */
  async sendPlanningItemInvite(planningItem, user) {
    try {
      // Verificar se já foi enviado convite hoje
      const today = new Date().toISOString().split('T')[0];
      const existingInvite = await PlanningInvite.findOne({
        where: {
          planning_id: planningItem.planning_id,
          invited_user_id: user.id,
          invited_at: {
            [Op.gte]: new Date(today + 'T00:00:00')
          }
        }
      });

      if (existingInvite) {
        console.log(`ℹ️ Convite já enviado hoje para ${user.name} - item de planejamento ${planningItem.id}`);
        return;
      }

      // Criar notificação/convite automático
      const inviteMessage = `🔔 Lembrete automático: Você tem uma visita planejada para hoje!
      
📅 Data: ${planningItem.planned_date}
⏰ Horário: ${planningItem.planned_time}
📍 Local: ${planningItem.client_address}
🏢 Cliente: ${planningItem.client_name}
🎯 Tipo: ${planningItem.visit_type}
⚡ Prioridade: ${planningItem.priority}

Acesse o sistema para mais detalhes e atualizações.`;

      // Criar registro de convite automático
      await PlanningInvite.create({
        planning_id: planningItem.planning_id,
        inviter_id: null, // Sistema automático
        invited_user_id: user.id,
        message: inviteMessage,
        status: 'accepted', // Convites automáticos são aceitos automaticamente
        invited_at: new Date(),
        responded_at: new Date(),
        response_message: 'Convite automático aceito automaticamente',
        is_automatic: true,
        notification_sent: true
      });

      // Enviar email se configurado
      await this.sendPlanningItemNotificationEmail(user, planningItem, inviteMessage);

      console.log(`✅ Convite automático enviado para ${user.name} - item de planejamento ${planningItem.id}`);

    } catch (error) {
      console.error(`❌ Erro ao enviar convite para ${user.name}:`, error);
    }
  }

  /**
   * Envia email de notificação para visita
   */
  async sendNotificationEmail(user, visit, message) {
    try {
      // TODO: Implementar envio de email quando SMTP estiver configurado
      console.log(`📧 Notificação de email seria enviada para ${user.email}:`);
      console.log(`   Assunto: 🔔 Lembrete: Visita agendada para hoje - ${visit.title}`);
      console.log(`   Destinatário: ${user.name} (${user.email})`);
    } catch (error) {
      console.error('❌ Erro ao enviar email de notificação:', error);
    }
  }

  /**
   * Envia email de notificação para item de planejamento
   */
  async sendPlanningItemNotificationEmail(user, planningItem, message) {
    try {
      // TODO: Implementar envio de email quando SMTP estiver configurado
      console.log(`📧 Notificação de email seria enviada para ${user.email}:`);
      console.log(`   Assunto: 🔔 Lembrete: Visita planejada para hoje - ${planningItem.client_name}`);
      console.log(`   Destinatário: ${user.name} (${user.email})`);
    } catch (error) {
      console.error('❌ Erro ao enviar email de notificação:', error);
    }
  }

  /**
   * Executa verificação manual (para testes)
   */
  async runManualCheck() {
    console.log('🔧 Executando verificação manual de convites...');
    await this.processDailyInvites();
  }

  /**
   * Para o serviço
   */
  stop() {
    console.log('🛑 Parando serviço de convites automáticos...');
    this.isRunning = false;
  }
}

module.exports = new AutoInviteService();
