const express = require('express');
const { CustomerContact, Proposal, Visit, User, sequelize } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

const router = express.Router();

// GET /api/analytics/overview - Visão geral dos analytics
router.get('/overview', asyncHandler(async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Período para estatísticas (fallback: mês atual)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const leadsWhere = { type: 'lead' };
    if (startDate && endDate) {
      leadsWhere.created_at = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    // Contagens básicas
    const [
      totalLeads,
      totalClients,
      totalVisits,
      convertedLeads
    ] = await Promise.all([
      CustomerContact.count({ where: leadsWhere }),
      CustomerContact.count({ where: { type: 'client' } }),
      Visit.count(),
      CustomerContact.count({ where: { ...leadsWhere, status: 'fechado' } })
    ]);

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Vendas do mês (soma de propostas aprovadas/ganhas no mês)
    let salesMonth = 0;
    try {
      const salesWhere = {
        created_at: { [Op.between]: [startOfMonth, endOfMonth] },
        status: { [Op.in]: ['approved', 'won', 'aprovado', 'fechado'] }
      };
      // Campo pode variar entre total_value/amount; tenta ambos
      const sumTotalValue = await Proposal.sum('total_value', { where: salesWhere });
      if (typeof sumTotalValue === 'number') {
        salesMonth = sumTotalValue || 0;
      } else {
        const sumAmount = await Proposal.sum('amount', { where: salesWhere });
        salesMonth = sumAmount || 0;
      }
    } catch (_) {
      salesMonth = 0;
    }

    // Leads por status/segmento para gráficos
    const [leadsByStatus, leadsBySegment] = await Promise.all([
      CustomerContact.findAll({
        where: leadsWhere,
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('CustomerContact.id')), 'count']],
        group: ['CustomerContact.status'],
        raw: true
      }),
      CustomerContact.findAll({
        where: leadsWhere,
        attributes: ['segment', [sequelize.fn('COUNT', sequelize.col('CustomerContact.id')), 'count']],
        group: ['CustomerContact.segment'],
        raw: true
      })
    ]);

    res.json({
      overview: {
        total_leads: totalLeads,
        total_clients: totalClients,
        total_visits: totalVisits,
        sales_month: Number(salesMonth) || 0,
        conversion_rate: Number(conversionRate.toFixed(2)),
        converted_leads: convertedLeads
      },
      leads_by_status: leadsByStatus,
      leads_by_segment: leadsBySegment,
      proposals_by_status: []
    });
  } catch (error) {
    console.error('Erro na rota analytics/overview:', error);
    res.status(500).json({
      error: 'Erro ao buscar dados de analytics',
      details: error.message
    });
  }
}));

// GET /api/analytics/performance - Performance por período
router.get('/performance', asyncHandler(async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Leads por período
    const leadsByPeriod = await CustomerContact.findAll({
      attributes: [
        [sequelize.fn('strftime', '%Y-%m', sequelize.col('CustomerContact.created_at')), 'period'],
        [sequelize.fn('COUNT', sequelize.col('CustomerContact.id')), 'count']
      ],
      group: ['period'],
      order: [[sequelize.literal('period'), 'ASC']],
      raw: true
    });

    res.json({
      period,
      leads_by_period: leadsByPeriod,
      proposals_by_period: [], // Temporariamente vazio
      visits_by_period: [] // Temporariamente vazio
    });
  } catch (error) {
    console.error('Erro na rota analytics/performance:', error);
    res.status(500).json({
      error: 'Erro ao buscar dados de performance',
      details: error.message
    });
  }
}));

// GET /api/analytics/team - Performance da equipe
router.get('/team', asyncHandler(async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Performance por responsável
    const teamPerformance = await CustomerContact.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'responsible',
          attributes: ['id', 'name', 'email']
        }
      ],
      attributes: [
        'responsible_id',
        [sequelize.fn('COUNT', sequelize.col('CustomerContact.id')), 'total_leads'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN CustomerContact.status = "fechado" THEN 1 END')), 'converted_leads']
      ],
      group: ['responsible_id'],
      raw: true
    });

    res.json({
      team_performance: teamPerformance,
      proposals_by_responsible: [] // Temporariamente vazio
    });
  } catch (error) {
    console.error('Erro na rota analytics/team:', error);
    res.status(500).json({
      error: 'Erro ao buscar dados da equipe',
      details: error.message
    });
  }
}));

// GET /api/analytics/segments - Análise por segmentos
router.get('/segments', asyncHandler(async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Análise detalhada por segmento
    const segmentAnalysis = await CustomerContact.findAll({
      where: whereClause,
      attributes: [
        'segment',
        [sequelize.fn('COUNT', sequelize.col('CustomerContact.id')), 'total_leads'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN CustomerContact.status = "fechado" THEN 1 END')), 'converted_leads'],
        [sequelize.fn('AVG', sequelize.col('CustomerContact.score')), 'avg_score']
      ],
      group: ['CustomerContact.segment'],
      raw: true
    });

    res.json({
      segment_analysis: segmentAnalysis,
      proposals_by_segment: [] // Temporariamente vazio
    });
  } catch (error) {
    console.error('Erro na rota analytics/segments:', error);
    res.status(500).json({
      error: 'Erro ao buscar dados de segmentos',
      details: error.message
    });
  }
}));

// GET /api/analytics/reports - Relatórios específicos
router.get('/reports', asyncHandler(async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.query;
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    let reportData = {};

    switch (reportType) {
      case 'leads_conversion':
        // Relatório de conversão de leads
        const leadsConversion = await CustomerContact.findAll({
          where: whereClause,
          attributes: [
            'status',
            [sequelize.fn('COUNT', sequelize.col('CustomerContact.id')), 'count'],
            [sequelize.fn('AVG', sequelize.col('CustomerContact.score')), 'avg_score']
          ],
          group: ['CustomerContact.status'],
          raw: true
        });
        reportData = { leads_conversion: leadsConversion };
        break;

      case 'sales_pipeline':
        // Relatório do pipeline de vendas - temporariamente vazio
        reportData = { sales_pipeline: [] };
        break;

      case 'team_performance':
        // Relatório de performance da equipe
        const teamReport = await CustomerContact.findAll({
          where: whereClause,
          include: [
            {
              model: User,
              as: 'responsible',
              attributes: ['name']
            }
          ],
          attributes: [
            'responsible_id',
            [sequelize.fn('COUNT', sequelize.col('CustomerContact.id')), 'total_leads'],
            [sequelize.fn('COUNT', sequelize.literal('CASE WHEN CustomerContact.status = "fechado" THEN 1 END')), 'converted_leads']
          ],
          group: ['responsible_id'],
          raw: true
        });
        reportData = { team_performance: teamReport };
        break;

      default:
        reportData = { message: 'Tipo de relatório não especificado' };
    }

    res.json(reportData);
  } catch (error) {
    console.error('Erro na rota analytics/reports:', error);
    res.status(500).json({
      error: 'Erro ao buscar relatórios',
      details: error.message
    });
  }
}));

// GET /api/analytics/export - Exportar dados
router.get('/export', asyncHandler(async (req, res) => {
  try {
    const { dataType, format = 'json', startDate, endDate } = req.query;
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    let exportData = {};

    switch (dataType) {
      case 'leads':
        exportData = await CustomerContact.findAll({
          where: whereClause,
          include: [
            {
              model: User,
              as: 'responsible',
              attributes: ['name', 'email']
            }
          ],
          raw: true
        });
        break;

      case 'proposals':
        // Temporariamente vazio
        exportData = [];
        break;

      case 'clients':
        // Temporariamente vazio
        exportData = [];
        break;

      default:
        return res.status(400).json({ error: 'Tipo de dados não especificado' });
    }

    if (format === 'csv') {
      // Implementar exportação CSV
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${dataType}_${new Date().toISOString().split('T')[0]}.csv`);
      // TODO: Implementar conversão para CSV
      res.json(exportData);
    } else {
      res.json(exportData);
    }
  } catch (error) {
    console.error('Erro na rota analytics/export:', error);
    res.status(500).json({
      error: 'Erro ao exportar dados',
      details: error.message
    });
  }
}));

module.exports = router;