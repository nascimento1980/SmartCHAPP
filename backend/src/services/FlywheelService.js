/**
 * FlywheelService - Implementação do conceito Flywheel da HubSpot
 * 
 * O Flywheel substitui o funil tradicional, focando em um ciclo contínuo:
 * ATRAIR → ENGAJAR → ENCANTAR → (cliente vira promotor) → ATRAIR mais clientes
 */

const { CustomerContact, Proposal, Visit } = require('../models');

class FlywheelService {
  // Calcular velocidade geral do Flywheel
  static async calculateFlywheelVelocity() {
    try {
      // Buscar dados dos últimos 30 dias
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Contar leads criados
      const totalLeads = await CustomerContact.count({
        where: {
          type: 'lead',
          created_at: {
            [require('sequelize').Op.gte]: thirtyDaysAgo
          }
        }
      });

      // Contar leads convertidos (status fechado)
      const convertedLeads = await CustomerContact.count({
        where: {
          type: 'lead',
          status: 'fechado',
          created_at: {
            [require('sequelize').Op.gte]: thirtyDaysAgo
          }
        }
      });

      // Contar clientes ativos
      const activeClients = await CustomerContact.count({
        where: {
          type: 'client',
          status: 'ativo'
        }
      });

      // Contar propostas aprovadas (sem filtro de data pois não há created_at)
      const approvedProposals = await Proposal.count({
        where: {
          status: 'aprovada'
        }
      });

      // Contar visitas concluídas nos últimos 30 dias
      const completedVisits = await Visit.count({
        where: {
          status: 'concluida',
          scheduled_date: {
            [require('sequelize').Op.gte]: thirtyDaysAgo
          }
        }
      });

      // Calcular velocidade (métrica simplificada)
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
      const proposalRate = totalLeads > 0 ? (approvedProposals / totalLeads) * 100 : 0;
      const visitRate = totalLeads > 0 ? (completedVisits / totalLeads) * 100 : 0;

      // Velocidade geral (média ponderada)
      const velocity = Math.round((conversionRate * 0.4 + proposalRate * 0.3 + visitRate * 0.3));

      return {
        velocity: Math.min(velocity, 100), // Máximo 100%
        breakdown: {
          total_leads: totalLeads,
          converted_leads: convertedLeads,
          active_clients: activeClients,
          approved_proposals: approvedProposals,
          completed_visits: completedVisits,
          conversion_rate: Math.round(conversionRate * 100) / 100,
          proposal_rate: Math.round(proposalRate * 100) / 100,
          visit_rate: Math.round(visitRate * 100) / 100
        },
        recommendations: FlywheelService.generateRecommendations(velocity, conversionRate, proposalRate, visitRate)
      };
    } catch (error) {
      console.error('Erro ao calcular velocidade do Flywheel:', error);
      return {
        velocity: 0,
        breakdown: {
          total_leads: 0,
          converted_leads: 0,
          active_clients: 0,
          approved_proposals: 0,
          completed_visits: 0,
          conversion_rate: 0,
          proposal_rate: 0,
          visit_rate: 0
        },
        recommendations: []
      };
    }
  }

  // Calcular métricas da fase Atrair
  static async calculateAttractMetrics(dateRange = {}) {
    try {
      const { start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end = new Date() } = dateRange;

      const leads = await CustomerContact.findAll({
        where: {
          type: 'lead',
          created_at: {
            [require('sequelize').Op.between]: [start, end]
          }
        }
      });

      // Agrupar por origem
      const sources = {};
      leads.forEach(lead => {
        sources[lead.source] = (sources[lead.source] || 0) + 1;
      });

      // Agrupar por segmento
      const segments = {};
      leads.forEach(lead => {
        segments[lead.segment] = (segments[lead.segment] || 0) + 1;
      });

      return {
        total_leads: leads.length,
        sources,
        segments,
        growth_rate: this.calculateGrowthRate(leads),
        quality_score: this.calculateLeadQuality(leads)
      };
    } catch (error) {
      console.error('Erro ao calcular métricas de atração:', error);
      return {
        total_leads: 0,
        sources: {},
        segments: {},
        growth_rate: 0,
        quality_score: 0
      };
    }
  }

  // Calcular métricas da fase Engajar
  static async calculateEngageMetrics(dateRange = {}) {
    try {
      const { start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end = new Date() } = dateRange;

      const visits = await Visit.findAll({
        where: {
          scheduled_date: {
            [require('sequelize').Op.between]: [start, end]
          }
        }
      });

      const proposals = await Proposal.findAll({
        where: {
          created_at: {
            [require('sequelize').Op.between]: [start, end]
          }
        }
      });

      return {
        total_visits: visits.length,
        completed_visits: visits.filter(v => v.status === 'concluida').length,
        total_proposals: proposals.length,
        sent_proposals: proposals.filter(p => p.status === 'enviada').length,
        engagement_rate: this.calculateEngagementRate(visits, proposals)
      };
    } catch (error) {
      console.error('Erro ao calcular métricas de engajamento:', error);
      return {
        total_visits: 0,
        completed_visits: 0,
        total_proposals: 0,
        sent_proposals: 0,
        engagement_rate: 0
      };
    }
  }

  // Calcular métricas da fase Encantar
  static async calculateDelightMetrics(dateRange = {}) {
    try {
      const { start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end = new Date() } = dateRange;

      const clients = await CustomerContact.findAll({
        where: {
          type: 'client',
          status: 'ativo'
        }
      });

      const proposals = await Proposal.findAll({
        where: {
          status: 'aprovada',
          created_at: {
            [require('sequelize').Op.between]: [start, end]
          }
        }
      });

      return {
        active_clients: clients.length,
        client_satisfaction: this.calculateClientSatisfaction(clients),
        approved_proposals: proposals.length,
        revenue_growth: this.calculateRevenueGrowth(proposals),
        retention_rate: this.calculateRetentionRate(clients)
      };
    } catch (error) {
      console.error('Erro ao calcular métricas de encantamento:', error);
      return {
        active_clients: 0,
        client_satisfaction: 0,
        approved_proposals: 0,
        revenue_growth: 0,
        retention_rate: 0
      };
    }
  }

  // Métodos auxiliares
  static calculateGrowthRate(leads) {
    if (leads.length < 2) return 0;
    
    const recentLeads = leads.slice(-7).length;
    const previousLeads = leads.slice(-14, -7).length;
    
    if (previousLeads === 0) return recentLeads > 0 ? 100 : 0;
    
    return Math.round(((recentLeads - previousLeads) / previousLeads) * 100);
  }

  static calculateLeadQuality(leads) {
    if (leads.length === 0) return 0;
    
    const qualifiedLeads = leads.filter(lead => 
      ['qualificado', 'proposta', 'fechado'].includes(lead.status)
    ).length;
    
    return Math.round((qualifiedLeads / leads.length) * 100);
  }

  static calculateEngagementRate(visits, proposals) {
    const totalActivities = visits.length + proposals.length;
    if (totalActivities === 0) return 0;
    
    const completedActivities = visits.filter(v => v.status === 'concluida').length +
                               proposals.filter(p => p.status === 'enviada').length;
    
    return Math.round((completedActivities / totalActivities) * 100);
  }

  static calculateClientSatisfaction(clients) {
    if (clients.length === 0) return 0;
    
    const totalRating = clients.reduce((sum, client) => sum + (client.rating || 0), 0);
    return Math.round(totalRating / clients.length);
  }

  static calculateRevenueGrowth(proposals) {
    if (proposals.length < 2) return 0;
    
    const recentRevenue = proposals.slice(-7).reduce((sum, p) => sum + (p.total_value || 0), 0);
    const previousRevenue = proposals.slice(-14, -7).reduce((sum, p) => sum + (p.total_value || 0), 0);
    
    if (previousRevenue === 0) return recentRevenue > 0 ? 100 : 0;
    
    return Math.round(((recentRevenue - previousRevenue) / previousRevenue) * 100);
  }

  static calculateRetentionRate(clients) {
    if (clients.length === 0) return 0;
    
    const activeClients = clients.filter(client => client.status === 'ativo').length;
    return Math.round((activeClients / clients.length) * 100);
  }

  static generateRecommendations(velocity, conversionRate, proposalRate, visitRate) {
    const recommendations = [];

    if (velocity <= 0) {
      recommendations.push({
        priority: 'high',
        title: 'Sistema inicial - sem dados',
        description: 'Comece cadastrando leads e clientes para ver métricas',
        action: 'Cadastrar primeiros leads no sistema'
      });
      return recommendations;
    }

    if (velocity < 40) {
      recommendations.push({
        priority: 'high',
        title: 'Velocidade muito baixa',
        description: 'Implemente estratégias para acelerar o ciclo de vendas',
        action: 'Revisar processo de qualificação de leads'
      });
    }

    if (conversionRate < 20) {
      recommendations.push({
        priority: 'medium',
        title: 'Taxa de conversão baixa',
        description: 'Melhore a qualificação e acompanhamento de leads',
        action: 'Implementar follow-up automático'
      });
    }

    if (proposalRate < 30) {
      recommendations.push({
        priority: 'medium',
        title: 'Poucas propostas enviadas',
        description: 'Aumente o número de propostas comerciais',
        action: 'Criar templates de proposta'
      });
    }

    if (visitRate < 50) {
      recommendations.push({
        priority: 'low',
        title: 'Visitas técnicas insuficientes',
        description: 'Agende mais visitas técnicas para qualificar leads',
        action: 'Automatizar agendamento de visitas'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        title: 'Performance excelente',
        description: 'Mantenha as boas práticas atuais',
        action: 'Continuar com estratégia atual'
      });
    }

    return recommendations;
  }
}

module.exports = FlywheelService;
