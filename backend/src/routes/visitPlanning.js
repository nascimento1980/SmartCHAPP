const express = require('express');
const router = express.Router();
const { VisitPlanning, VisitPlanningItem, Visit, User, sequelize } = require('../models');
const auth = require('../middleware/auth');
const { Op } = require('sequelize'); // Import Op para operações de comparação
const { cacheMiddleware, invalidateCache } = require('../utils/cache');
const { broadcast } = require('./events');
const geoLocationService = require('../services/GeoLocationService');

// Helper para obter o label do tipo de visita
const getVisitTypeLabel = (type) => {
  const labels = {
    comercial: 'Visita Comercial',
    tecnica: 'Visita Técnica',
    implantacao: 'Implantação',
    instalacao: 'Instalação',
    manutencao: 'Manutenção',
    suporte: 'Suporte',
    treinamento: 'Treinamento'
  };
  return labels[type] || type;
};

// Middleware de autenticação para todas as rotas
router.use(auth);

// GET /api/visit-planning - Listar planejamentos com filtros
router.get('/', cacheMiddleware('planning-list', 180000), async (req, res) => {
  try {
    const { type, status, week_start, week_end, responsible_id, id } = req.query;

    const where = {};
    if (type) where.planning_type = type;
    if (id) where.id = id;
    if (status) {
      if (Array.isArray(status)) where.status = status;
      else if (typeof status === 'string' && status.includes(',')) where.status = status.split(',');
      else where.status = status;
    }

    // Lógica hierárquica para responsible_id
    if (responsible_id && !['manager', 'admin', 'master'].includes(req.user.role)) {
      where.responsible_id = req.user.id;
    } else if (responsible_id && ['manager', 'admin', 'master'].includes(req.user.role)) {
      where.responsible_id = responsible_id;
    } else if (!responsible_id && !['manager', 'admin', 'master'].includes(req.user.role)) {
      where.responsible_id = req.user.id;
    }

    // Adicionar filtros de data se fornecidos
    if (week_start && week_end) {
      where.week_start_date = { [Op.lte]: week_end };
      where.week_end_date = { [Op.gte]: week_start };
    }

    // Incluir apenas planejamentos que ainda têm pelo menos um compromisso ativo
    const plannings = await VisitPlanning.findAll({
      where,
      attributes: ['id', 'week_start_date', 'week_end_date', 'planning_type', 'status', 'responsible_id'],
      include: [
        { 
          model: User, 
          as: 'responsible', 
          attributes: ['id', 'name'] 
        },
        {
          model: sequelize.models.Visit,
          as: 'visits',
          attributes: ['id', 'planned_distance', 'planned_fuel'],
          where: {
            status: {
              [Op.in]: ['agendada', 'em_andamento', 'planejada']
            }
          },
          required: true
        }
      ],
      distinct: true,
      order: [['week_start_date', 'DESC']]
    });

    // Agregar métricas por planejamento (contagem, distância e combustível planejados)
    try {
      const planningIds = plannings.map(p => p.id);
      if (planningIds.length > 0) {
        const Visit = sequelize.models.Visit;
        const aggregates = await Visit.findAll({
          where: {
            planning_id: { [Op.in]: planningIds },
            status: { [Op.in]: ['agendada', 'em_andamento', 'planejada'] }
          },
          attributes: [
            'planning_id',
            [sequelize.fn('COUNT', sequelize.col('id')), 'visits_count'],
            [sequelize.fn('SUM', sequelize.col('planned_distance')), 'planned_distance_sum'],
            [sequelize.fn('SUM', sequelize.col('planned_fuel')), 'planned_fuel_sum']
          ],
          group: ['planning_id'],
          raw: true
        });

        const mapAgg = new Map();
        aggregates.forEach(row => {
          mapAgg.set(row.planning_id, {
            total_planned_visits: Number(row.visits_count || 0),
            planned_distance: Number(row.planned_distance_sum || 0),
            planned_fuel: Number(row.planned_fuel_sum || 0)
          });
        });

        plannings.forEach(p => {
          const agg = mapAgg.get(p.id) || { total_planned_visits: 0, planned_distance: 0, planned_fuel: 0 };
          p.dataValues.metrics = agg;
        });

        // Fallback inteligente: se alguma métrica ficar zerada, calcular distância aproximada por itinerário
        // Origem = empresa; percurso sequencial pelas visitas do planejamento
        const needFallback = plannings.filter(p => !p.dataValues.metrics || ((p.dataValues.metrics.planned_distance || 0) === 0 && (p.dataValues.metrics.total_planned_visits || 0) > 0));
        if (needFallback.length > 0) {
          const { CompanySetting } = require('../models');
          const [companyLat, companyLon, companyCity, companyState, companyAddress] = await Promise.all([
            CompanySetting.findOne({ where: { setting_key: 'companyLatitude' } }),
            CompanySetting.findOne({ where: { setting_key: 'companyLongitude' } }),
            CompanySetting.findOne({ where: { setting_key: 'companyCity' } }),
            CompanySetting.findOne({ where: { setting_key: 'companyState' } }),
            CompanySetting.findOne({ where: { setting_key: 'companyAddress' } })
          ]);
          const originBase = {
            lat: companyLat?.setting_value ? parseFloat(companyLat.setting_value) : -3.8931091,
            lon: companyLon?.setting_value ? parseFloat(companyLon.setting_value) : -38.4371291,
            city: companyCity?.setting_value,
            state: companyState?.setting_value,
            address: companyAddress?.setting_value,
            country: 'Brasil'
          };

          // Lazy import para evitar ciclo
          const geoLocationService = require('../services/GeoLocationService');

          for (const p of needFallback) {
            const visits = await Visit.findAll({
              where: {
                planning_id: p.id,
                status: { [Op.in]: ['agendada', 'em_andamento', 'planejada'] }
              },
              attributes: ['id', 'address', 'scheduled_date', 'scheduled_time', 'planned_distance', 'planned_fuel'],
              order: [['scheduled_date', 'ASC'], ['scheduled_time', 'ASC']]
            });
            if (visits.length === 0) continue;

            let totalKm = 0;
            let prev = originBase;
            for (const v of visits) {
              const dest = { address: v.address, country: 'Brasil' };
              try {
                const o = (prev.lat && prev.lon) ? prev : await geoLocationService.geocodeAddress(prev.address, prev.city, prev.state, prev.country);
                const d = await geoLocationService.geocodeAddress(dest.address, dest.city, dest.state, dest.country);
                if (o && d) {
                  totalKm += geoLocationService.calculateDistance(o.lat, o.lon, d.lat, d.lon);
                  prev = d;
                }
              } catch (_) {}
            }
            const totalFuel = totalKm > 0 ? geoLocationService.estimateFuelConsumption(totalKm) : 0;
            p.dataValues.metrics = p.dataValues.metrics || {};
            p.dataValues.metrics.total_planned_visits = p.dataValues.metrics.total_planned_visits || visits.length;
            p.dataValues.metrics.planned_distance = totalKm;
            p.dataValues.metrics.planned_fuel = totalFuel;
          }
        }

        // Calcular total de km por itinerário (empresa -> v1 -> ... -> retorno) para cada planejamento
        try {
          const { CompanySetting } = require('../models');
          const [companyLat, companyLon, companyCity, companyState, companyAddress] = await Promise.all([
            CompanySetting.findOne({ where: { setting_key: 'companyLatitude' } }),
            CompanySetting.findOne({ where: { setting_key: 'companyLongitude' } }),
            CompanySetting.findOne({ where: { setting_key: 'companyCity' } }),
            CompanySetting.findOne({ where: { setting_key: 'companyState' } }),
            CompanySetting.findOne({ where: { setting_key: 'companyAddress' } })
          ]);
          const originBase = {
            lat: companyLat?.setting_value ? parseFloat(companyLat.setting_value) : undefined,
            lon: companyLon?.setting_value ? parseFloat(companyLon.setting_value) : undefined,
            city: companyCity?.setting_value,
            state: companyState?.setting_value,
            address: companyAddress?.setting_value,
            country: 'Brasil'
          };

          const geoLocationService = require('../services/GeoLocationService');

          for (const p of plannings) {
            const visits = await Visit.findAll({
              where: {
                planning_id: p.id,
                status: { [Op.in]: ['agendada', 'em_andamento', 'planejada'] }
              },
              attributes: ['id', 'address', 'scheduled_date', 'scheduled_time', 'customer_contact_id', 'client_id', 'lead_id', 'lat', 'lon'],
              order: [['scheduled_date', 'ASC'], ['scheduled_time', 'ASC']]
            });
            if (visits.length === 0) {
              p.dataValues.metrics = {
                total_planned_visits: 0,
                planned_distance: 0,
                planned_fuel: 0,
                itinerary_total_distance: 0,
                itinerary_total_fuel: 0
              };
              continue;
            }

            // Agrupar por dia
            const byDate = new Map();
            for (const v of visits) {
              const raw = v.scheduled_date;
              const dt = raw ? new Date(raw) : null;
              const key = dt && !isNaN(dt.getTime()) ? dt.toISOString().slice(0, 10) : String(raw).slice(0, 10);
              if (!byDate.has(key)) byDate.set(key, []);
              byDate.get(key).push(v);
            }

            let totalKm = 0;
            for (const [date, dayVisits] of byDate.entries()) {
              let previous = originBase;
              for (const v of dayVisits) {
                const dest = { address: v.address || undefined, country: 'Brasil' };
                if (v.lat && v.lon) {
                  dest.lat = parseFloat(v.lat);
                  dest.lon = parseFloat(v.lon);
                }
                const normalizedOrigin = (previous && (previous.lat || previous.address || previous.city || previous.state)) ? previous : originBase;
                const o = (normalizedOrigin && normalizedOrigin.lat && normalizedOrigin.lon)
                  ? normalizedOrigin
                  : await geoLocationService.geocodeAddress(normalizedOrigin?.address, normalizedOrigin?.city, normalizedOrigin?.state, normalizedOrigin?.country || 'Brasil');
                const d = (dest && dest.lat && dest.lon)
                  ? dest
                  : await geoLocationService.geocodeAddress(dest.address || '', dest.city || '', dest.state || '', dest.country || 'Brasil');
                if (o && d) {
                  totalKm += await geoLocationService.getRouteDistanceKm(o, d);
                  previous = d;
                }
              }
              // retorno do dia
              try {
                const endOrigin = (previous && previous.lat && previous.lon) ? previous : await geoLocationService.geocodeAddress(previous?.address, previous?.city, previous?.state, previous?.country || 'Brasil');
                const endDest = (originBase && originBase.lat && originBase.lon) ? originBase : await geoLocationService.geocodeAddress(originBase.address, originBase.city, originBase.state, originBase.country || 'Brasil');
                if (endOrigin && endDest) {
                  totalKm += await geoLocationService.getRouteDistanceKm(endOrigin, endDest);
                }
              } catch (_) {}
            }

            const itineraryKm = Number(totalKm.toFixed(2));
            const consumptionKmPerL = 10;
            const itineraryFuel = Number((itineraryKm / consumptionKmPerL).toFixed(1));
            const totalPlannedVisits = visits.length;

            // Substituir o objeto metrics para evitar resíduos de agregações anteriores
            p.dataValues.metrics = {
              total_planned_visits: totalPlannedVisits,
              planned_distance: itineraryKm,
              planned_fuel: itineraryFuel,
              itinerary_total_distance: itineraryKm,
              itinerary_total_fuel: itineraryFuel
            };
          }
        } catch (e) {
          console.warn('⚠️ Falha ao calcular total de itinerário:', e?.message);
        }
      }
    } catch (e) {
      console.warn('⚠️ Falha ao agregar métricas de planejamentos:', e?.message);
    }

    res.json({ planning: plannings });
  } catch (error) {
    console.error('Erro ao listar planejamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/visit-planning/calendar - Buscar compromissos para o calendário
router.get('/calendar', cacheMiddleware('planning-calendar', 300000), async (req, res) => {
  try {
    const { responsible_id, month, year } = req.query;
    
    // Filtrar por usuário responsável
    let whereResponsible = {};
    if (responsible_id && !['manager', 'admin', 'master'].includes(req.user.role)) {
      whereResponsible.responsible_id = req.user.id;
    } else if (responsible_id && ['manager', 'admin', 'master'].includes(req.user.role)) {
      whereResponsible.responsible_id = responsible_id;
    } else if (!responsible_id && !['manager', 'admin', 'master'].includes(req.user.role)) {
      whereResponsible.responsible_id = req.user.id;
    }
    
    // Buscar compromissos da tabela unificada visits
    const visits = await sequelize.models.Visit.findAll({
      where: {
        ...whereResponsible,
        status: {
          [Op.in]: ['agendada', 'em_andamento', 'planejada'],
          [Op.ne]: 'excluida'
        }
      },
      attributes: [
        'id', 'title', 'type', 'scheduled_date', 'scheduled_time', 'status',
        'priority', 'address', 'planning_id', 'source'
      ],
      order: [['scheduled_date', 'ASC'], ['scheduled_time', 'ASC']]
    });
    
    res.json({ 
      visits: visits,
      total: visits.length
    });
    
  } catch (error) {
    console.error('Erro ao buscar compromissos para calendário:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/visit-planning/history - Buscar histórico de planejamentos finalizados
router.get('/history', cacheMiddleware('planning-history', 600000), async (req, res) => {
  try {
    const { date_from, date_to, type, status, responsible_id, include_metrics } = req.query;
    
    const where = {
      status: ['avaliada', 'concluida']
    };
    
    // Aplicar filtros adicionais
    if (date_from) where.week_start_date = { [Op.gte]: date_from };
    if (date_to) where.week_end_date = { [Op.lte]: date_to };
    if (type && type !== 'all') where.planning_type = type;
    if (status && status !== 'all') where.status = status;
    if (responsible_id && responsible_id !== 'all') where.responsible_id = responsible_id;
    
    // Lógica hierárquica para responsible_id
    if (responsible_id && !['manager', 'admin', 'master'].includes(req.user.role)) {
      where.responsible_id = req.user.id;
    }
    
    const planning = await VisitPlanning.findAll({
      where,
      attributes: ['id', 'week_start_date', 'week_end_date', 'status', 'planning_type', 'efficiency_rate'],
      include: [
        { model: User, as: 'responsible', attributes: ['id', 'name'] },
        {
          model: VisitPlanningItem,
          as: 'items',
          attributes: [
            'id', 'status', 'planned_date', 'client_name', 'visit_type', 'priority',
            'actual_duration', 'actual_date'
          ]
        }
      ],
      order: [['week_start_date', 'DESC']],
      limit: 50
    });
    
    // Métricas são calculadas sob demanda apenas para reduzir carga
    res.json({ 
      planning,
      total: planning.length,
      filters: req.query
    });
    
  } catch (error) {
    console.error('Erro ao buscar histórico de planejamentos:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// GET /api/visit-planning/:id - Buscar planejamento específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const planning = await VisitPlanning.findByPk(id, {
      include: [
        {
          model: User,
          as: 'responsible',
          attributes: ['id', 'name', 'email']
        },
        {
          model: VisitPlanningItem,
          as: 'items',
          attributes: [
            'id', 
            'status', 
            'planned_date', 
            'planned_time',
            'client_id',
            'client_name', 
            'client_address',
            'visit_type',
            'priority',
            'estimated_duration',
            'planned_distance',
            'planned_fuel',
            'planned_cost',
            'notes',
            'visit_id'
          ]
        },
        {
          model: sequelize.models.Visit,
          as: 'visits',
          attributes: [
            'id',
            'title',
            'type',
            'scheduled_date',
            'scheduled_time',
            'status',
            'address',
            'priority',
            'client_id',
            'lead_id',
            'customer_contact_id',
            'notes'
          ],
          where: {
            status: {
              [Op.in]: ['agendada', 'em_andamento', 'planejada']
            }
          },
          required: false
        }
      ],
      order: [[{ model: VisitPlanningItem, as: 'items' }, 'planned_date', 'ASC'], [{ model: VisitPlanningItem, as: 'items' }, 'planned_time', 'ASC']]
    });

    if (!planning) {
      return res.status(404).json({ error: 'Planejamento não encontrado' });
    }

    // Calcular distâncias do itinerário: origem = empresa, depois sequencialmente entre visitas do dia
    try {
      const { CompanySetting } = require('../models');
      const [companyLat, companyLon, companyCity, companyState, companyAddress] = await Promise.all([
        CompanySetting.findOne({ where: { setting_key: 'companyLatitude' } }),
        CompanySetting.findOne({ where: { setting_key: 'companyLongitude' } }),
        CompanySetting.findOne({ where: { setting_key: 'companyCity' } }),
        CompanySetting.findOne({ where: { setting_key: 'companyState' } }),
        CompanySetting.findOne({ where: { setting_key: 'companyAddress' } })
      ]);

      const originBase = {
        lat: companyLat?.setting_value ? parseFloat(companyLat.setting_value) : -3.8931091,
        lon: companyLon?.setting_value ? parseFloat(companyLon.setting_value) : -38.4371291,
        city: companyCity?.setting_value,
        state: companyState?.setting_value,
        address: companyAddress?.setting_value,
        country: 'Brasil'
      };

      // Ordenar visitas por data/hora
      const visits = (planning.visits || []).slice().sort((a, b) => {
        const da = new Date(a.scheduled_date || a.planned_date);
        const db = new Date(b.scheduled_date || b.planned_date);
        if (da.getTime() !== db.getTime()) return da - db;
        const ta = (a.scheduled_time || a.planned_time || '00:00');
        const tb = (b.scheduled_time || b.planned_time || '00:00');
        return ta.localeCompare(tb);
      });

      // Agrupar por dia (chave robusta no formato YYYY-MM-DD)
      const byDate = new Map();
      for (const v of visits) {
        const raw = v.scheduled_date || v.planned_date;
        const dt = raw ? new Date(raw) : null;
        const key = dt && !isNaN(dt.getTime()) ? dt.toISOString().slice(0, 10) : String(raw).slice(0, 10);
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key).push(v);
      }

      // Calcular por dia: origem empresa -> v1 -> v2 -> ... -> retorno empresa
      for (const [date, dayVisits] of byDate.entries()) {
        let previous = originBase;
        for (const v of dayVisits) {
          if (!v || v.status === 'cancelada' || v.status === 'excluida') continue;
          const dest = {
            address: v.address || undefined,
            city: v.customer_city || v.city || undefined,
            state: v.customer_state || v.state || undefined,
            country: 'Brasil'
          };
          // Se já tiver lat/lon no registro, usar
          if (v.lat && v.lon) {
            dest.lat = parseFloat(v.lat);
            dest.lon = parseFloat(v.lon);
          }
          // Fallback: enriquecer com dados do contato quando faltar endereço/coords
          if ((!dest.address && !dest.lat && !dest.lon) || (!dest.city && !dest.state)) {
            try {
              const contactId = v.customer_contact_id || v.client_id || v.lead_id;
              if (contactId) {
                const CustomerContact = sequelize.models.CustomerContact;
                const contact = await CustomerContact.findByPk(contactId, { attributes: ['address','city','state','latitude','longitude','lat','lon'] });
                if (contact) {
                  dest.address = dest.address || contact.address || undefined;
                  dest.city = dest.city || contact.city || undefined;
                  dest.state = dest.state || contact.state || undefined;
                  const cLat = contact.lat ?? contact.latitude;
                  const cLon = contact.lon ?? contact.longitude;
                  if (!dest.lat && !dest.lon && cLat && cLon) {
                    dest.lat = parseFloat(cLat);
                    dest.lon = parseFloat(cLon);
                  }
                }
                // Se ainda sem endereço/cidade/estado, tentar geocodificar pelo título (nome do cliente)
                if (!dest.address && !dest.city && !dest.state && v.title) {
                  dest.address = v.title;
                }
              }
              // Fallback por nome quando não houver vínculo de contato
              if ((!dest.address && !dest.lat && !dest.lon) || (!dest.city && !dest.state)) {
                const guessName = (v.client_name || v.title || '').trim();
                if (guessName.length >= 3) {
                  const CustomerContact = sequelize.models.CustomerContact;
                  const found = await CustomerContact.findOne({
                    where: {
                      [Op.or]: [
                        { company_name: { [Op.like]: `%${guessName}%` } },
                        { name: { [Op.like]: `%${guessName}%` } }
                      ]
                    },
                    attributes: ['address','city','state','latitude','longitude','lat','lon']
                  });
                  if (found) {
                    dest.address = dest.address || found.address || undefined;
                    dest.city = dest.city || found.city || undefined;
                    dest.state = dest.state || found.state || undefined;
                    const fLat = found.lat ?? found.latitude;
                    const fLon = found.lon ?? found.longitude;
                    if (!dest.lat && !dest.lon && fLat && fLon) {
                      dest.lat = parseFloat(fLat);
                      dest.lon = parseFloat(fLon);
                    }
                  }
                }
              }
            } catch (_) {}
          }
          const originCoord = previous;
          // Obter coords se faltar
          // Se a origem ainda não tem coords e também não tem endereço, use a empresa como fallback
          const normalizedOrigin = (originCoord && (originCoord.lat || originCoord.address || originCoord.city || originCoord.state)) ? originCoord : originBase;
          const o = (normalizedOrigin && normalizedOrigin.lat && normalizedOrigin.lon)
            ? normalizedOrigin
            : await geoLocationService.geocodeAddress(normalizedOrigin?.address, normalizedOrigin?.city, normalizedOrigin?.state, normalizedOrigin?.country || 'Brasil');
          const d = (dest && dest.lat && dest.lon)
            ? dest
            : await geoLocationService.geocodeAddress(dest.address || '', dest.city || '', dest.state || '', dest.country || 'Brasil');
          if (o && d) {
            const dist = await geoLocationService.getRouteDistanceKm(o, d);
            // anexar campo calculado no objeto retornado (não persiste)
            v.dataValues.itinerary_distance = dist;
            // Atualizar previous
            previous = d;
          }
        }
        // Retorno à empresa no fim do dia
        try {
          const endOrigin = (previous && previous.lat && previous.lon) ? previous : await geoLocationService.geocodeAddress(previous?.address, previous?.city, previous?.state, previous?.country || 'Brasil');
          const endDest = (originBase && originBase.lat && originBase.lon) ? originBase : await geoLocationService.geocodeAddress(originBase.address, originBase.city, originBase.state, originBase.country || 'Brasil');
          if (endOrigin && endDest) {
            const backDist = await geoLocationService.getRouteDistanceKm(endOrigin, endDest);
            const lastVisit = dayVisits[dayVisits.length - 1];
            if (lastVisit) lastVisit.dataValues.return_to_origin_distance = backDist;
          }
        } catch (_) {}
      }
    } catch (e) {
      // Apenas log; não bloquear resposta
      console.warn('⚠️ Falha ao calcular distances do itinerário:', e?.message);
    }

    res.json({ planning });
  } catch (error) {
    console.error('Erro ao buscar planejamento:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// POST /api/visit-planning - Criar novo planejamento
router.post('/', async (req, res) => {
  try {
    const {
      week_start_date,
      week_end_date,
      planning_type,
      responsible_id,
      notes,
      items
    } = req.body;

    // Validar datas
    if (!week_start_date || !week_end_date) {
      return res.status(400).json({ error: 'Datas de início e fim da semana são obrigatórias' });
    }

    // VERIFICAÇÃO: Verificar se já existe um planejamento ativo para esta semana
    console.log('🔍 Verificando planejamentos existentes para:', {
      responsible_id,
      week_start_date,
      week_end_date,
      user_role: req.user.role
    });

    try {
      // Buscar apenas planejamentos ativos que podem sobrepor
      const activePlannings = await VisitPlanning.findAll({
        where: {
          responsible_id,
          status: { [Op.in]: ['em_planejamento', 'em_execucao'] },
          [Op.or]: [
            {
              week_start_date: { [Op.lte]: week_end_date },
              week_end_date: { [Op.gte]: week_start_date }
            }
          ]
        },
        attributes: ['id', 'week_start_date', 'week_end_date', 'status'],
        limit: 10
      });

      // Verificar sobreposição com cada planejamento ativo
      let existingPlanning = null;
      for (const planning of activePlannings) {
        // Converter para Date para comparação correta
        const planningStart = new Date(planning.week_start_date);
        const planningEnd = new Date(planning.week_end_date);
        const novaStart = new Date(week_start_date);
        const novaEnd = new Date(week_end_date);
        
        const hasOverlap = (
          (planningStart <= novaEnd && planningEnd >= novaStart)
        );
        
        console.log('🔍 Verificando sobreposição com planejamento:', {
          planning_id: planning.id,
          planning_start: planning.week_start_date,
          planning_start_date: planningStart,
          planning_end: planning.week_end_date,
          planning_end_date: planningEnd,
          nova_start: week_start_date,
          nova_start_date: novaStart,
          nova_end: week_end_date,
          nova_end_date: novaEnd,
          hasOverlap,
          condition1: planningStart <= novaEnd,
          condition2: planningEnd >= novaStart
        });

        if (hasOverlap) {
          existingPlanning = planning;
          console.log('🚨 SOBREPOSIÇÃO ENCONTRADA!');
          break;
        }
      }

      console.log('🔍 Resultado da verificação:', {
        found: !!existingPlanning,
        planning: existingPlanning ? {
          id: existingPlanning.id,
          week_start_date: existingPlanning.week_start_date,
          week_end_date: existingPlanning.week_end_date,
          status: existingPlanning.status
        } : null
      });

      if (existingPlanning) {
        // Checar se esse planejamento conflitado possui visitas ativas; se não tiver, reutilizá-lo
        const activeVisitsCount = await sequelize.models.Visit.count({
          where: {
            planning_id: existingPlanning.id,
            status: { [Op.in]: ['agendada', 'em_andamento', 'planejada'] }
          }
        });

        if (activeVisitsCount === 0) {
          // Reusar planejamento vazio em vez de retornar erro
          return res.status(200).json({
            message: 'Planejamento existente reutilizado (sem visitas ativas)',
            planning: existingPlanning
          });
        }

        return res.status(400).json({ 
          error: 'Já existe um planejamento ativo para esta semana',
          details: `Existe um planejamento de ${existingPlanning.week_start_date} a ${existingPlanning.week_end_date} com status: ${existingPlanning.status}. Finalize o planejamento atual antes de criar um novo.`,
          existingPlanning: {
            id: existingPlanning.id,
            week_start_date: existingPlanning.week_start_date,
            week_end_date: existingPlanning.week_end_date,
            status: existingPlanning.status
          }
        });
      }
    } catch (validationError) {
      console.error('❌ Erro na validação de planejamentos existentes:', validationError);
      return res.status(500).json({ 
        error: 'Erro ao verificar planejamentos existentes',
        details: validationError.message 
      });
    }



    // Criar planejamento
    const planning = await VisitPlanning.create({
      week_start_date,
      week_end_date,
      planning_type,
      responsible_id,
      notes,
      status: 'em_planejamento'
    });

    // Criar itens do planejamento se fornecidos
    if (items && items.length > 0) {
      const planningItems = items.map(item => ({
        ...item,
        planning_id: planning.id
      }));
      
      await VisitPlanningItem.bulkCreate(planningItems);
    }

    // Buscar planejamento criado com relacionamentos
    const createdPlanning = await VisitPlanning.findByPk(planning.id, {
      include: [
        {
          model: User,
          as: 'responsible',
          attributes: ['id', 'name', 'email']
        },
        {
          model: VisitPlanningItem,
          as: 'items',
          attributes: [
            'id', 'planning_id', 'visit_id', 'planned_date', 'planned_time',
            'client_id', 'client_name', 'client_address', 'visit_type',
            'priority', 'estimated_duration', 'planned_distance', 'planned_fuel',
            'planned_cost', 'status', 'actual_date', 'actual_time', 'actual_duration',
            'actual_distance', 'actual_fuel', 'actual_cost', 'actual_date',
            'notes', 'completion_notes', 'created_at', 'updated_at'
          ]
        }
      ]
    });

    // SSE broadcast
    broadcast({
      type: 'planning.updated',
      payload: { id: createdPlanning.id }
    });

    // Invalida caches relacionados à lista e visões
    invalidateCache(['planning-list', 'planning-calendar', 'planning-history']);

    res.status(201).json({ 
      message: 'Planejamento criado com sucesso',
      planning: createdPlanning 
    });
  } catch (error) {
    console.error('❌ Erro ao criar planejamento:', error);
    
    // Log detalhado do erro
    if (error.name === 'SequelizeValidationError') {
      console.error('🔍 Erro de validação Sequelize:', error.errors);
    } else if (error.name === 'SequelizeDatabaseError') {
      console.error('🔍 Erro de banco de dados:', error.message);
    }
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message,
      type: error.name || 'UnknownError'
    });
  }
});

// PUT /api/visit-planning/:id - Atualizar planejamento
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Debug desabilitado para performance
    
    const planning = await VisitPlanning.findByPk(id);
    if (!planning) {
      return res.status(404).json({ error: 'Planejamento não encontrado' });
    }

    // VERIFICAÇÃO: Não permitir alterações em planejamentos fechados
    if (planning.status === 'concluida' || planning.status === 'avaliada') {
      return res.status(400).json({ 
        error: 'Não é possível alterar um planejamento fechado',
        details: `O planejamento está com status: ${planning.status}. Apenas planejamentos em aberto podem ser alterados.`
      });
    }

    // Atualizar planejamento
    await planning.update(updateData);

    // Atualizar itens se fornecidos
    if (updateData.items) {
      // Remover itens existentes
      await VisitPlanningItem.destroy({ where: { planning_id: id } });
      
      // Criar novos itens
      const planningItems = updateData.items.map(item => ({
        ...item,
        planning_id: id
      }));
      
      await VisitPlanningItem.bulkCreate(planningItems);
    }

    // Buscar planejamento atualizado
    const updatedPlanning = await VisitPlanning.findByPk(id, {
      include: [
        {
          model: User,
          as: 'responsible',
          attributes: ['id', 'name', 'email']
        },
        {
          model: VisitPlanningItem,
          as: 'items',
          attributes: [
            'id', 'planning_id', 'visit_id', 'planned_date', 'planned_time',
            'client_id', 'client_name', 'client_address', 'visit_type',
            'priority', 'estimated_duration', 'planned_distance', 'planned_fuel',
            'planned_cost', 'status', 'actual_date', 'actual_time', 'actual_duration',
            'actual_distance', 'actual_fuel', 'actual_cost', 'actual_date',
            'notes', 'completion_notes', 'created_at', 'updated_at'
          ]
        }
      ]
    });

    broadcast({
      type: 'planning.updated',
      payload: { id }
    });

    // Invalida caches da lista e visões relacionadas
    invalidateCache(['planning-list', 'planning-calendar', 'planning-history']);

    res.json({ 
      message: 'Planejamento atualizado com sucesso',
      planning: updatedPlanning 
    });
  } catch (error) {
    console.error('Erro ao atualizar planejamento:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// PUT /api/visit-planning/:id/status - Atualizar status do planejamento
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, evaluation_notes, next_week_planning, total_planned_visits, planned_distance, planned_fuel, planned_cost, planned_time } = req.body;
    
    const planning = await VisitPlanning.findByPk(id);
    if (!planning) {
      return res.status(404).json({ error: 'Planejamento não encontrado' });
    }

    // Se estiver marcando como avaliada, calcular métricas
    if (status === 'avaliada') {
      const items = await VisitPlanningItem.findAll({ where: { planning_id: id } });
      
      const metrics = calculatePlanningMetrics(items);
      await planning.update({
        ...metrics,
        status,
        evaluation_notes,
        next_week_planning
      });
    } else {
      // Atualizar com métricas fornecidas (para fechamento do planejamento)
      const updateData = { status };
      if (total_planned_visits !== undefined) updateData.total_planned_visits = total_planned_visits;
      if (planned_distance !== undefined) updateData.planned_distance = planned_distance;
      if (planned_fuel !== undefined) updateData.planned_fuel = planned_fuel;
      if (planned_cost !== undefined) updateData.planned_cost = planned_cost;
      if (planned_time !== undefined) updateData.planned_time = planned_time;
      
      await planning.update(updateData);
    }

    // SSE broadcast
    broadcast({
      type: 'planning.updated',
      payload: { id, status }
    });

    // Invalida caches após mudança de status
    invalidateCache(['planning-list', 'planning-calendar', 'planning-history']);

    res.json({ 
      message: 'Status atualizado com sucesso',
      planning 
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// POST /api/visit-planning-items/:id/checkin - Iniciar visita (check-in)
router.post('/items/:id/checkin', async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, notes, start_time, accuracy, timestamp } = req.body;
    
    // Validações obrigatórias
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Coordenadas são obrigatórias',
        details: 'Latitude e longitude devem ser fornecidas'
      });
    }

    if (!accuracy || accuracy > 100) {
      return res.status(400).json({ 
        error: 'Precisão da localização insuficiente',
        details: 'A precisão deve ser menor que 100 metros'
      });
    }

    if (!timestamp) {
      return res.status(400).json({ 
        error: 'Timestamp da localização é obrigatório',
        details: 'A localização deve ser obtida em tempo real'
      });
    }

    // Verificar se o timestamp não é muito antigo (máximo 30 segundos)
    const now = Date.now();
    const locationAge = now - timestamp;
    
    if (locationAge > 30000) { // 30 segundos
      return res.status(400).json({ 
        error: 'Localização muito antiga',
        details: 'A localização deve ser obtida nos últimos 30 segundos'
      });
    }

    // Validar se as coordenadas estão dentro do Brasil
    if (latitude > 5 || latitude < -34 || longitude > -34 || longitude < -74) {
      return res.status(400).json({ 
        error: 'Localização fora da área de cobertura',
        details: 'As coordenadas devem estar dentro do território brasileiro'
      });
    }

    const item = await VisitPlanningItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: 'Item de planejamento não encontrado' });
    }

    // VALIDAÇÃO: Não permitir check-in em visitas concluídas
    if (item.status === 'concluida') {
      return res.status(400).json({ 
        error: 'Não é possível fazer check-in em uma visita concluída',
        details: 'Visitas concluídas são somente leitura'
      });
    }

    // Verificar se a visita pode ser iniciada
    if (item.status !== 'planejada') {
      return res.status(400).json({ 
        error: 'Apenas visitas planejadas podem ser iniciadas',
        details: `Status atual: ${item.status}`
      });
    }

    // Atualizar item com dados do check-in (persistir coords/horário)
    await item.update({
      status: 'em_andamento',
      actual_date: new Date().toISOString().split('T')[0],
      actual_time: new Date().toTimeString().split(' ')[0],
      checkin_latitude: latitude,
      checkin_longitude: longitude,
      checkin_time: new Date().toTimeString().split(' ')[0],
      checkin_notes: notes || null,
      actual_start_time: new Date()
    });

    // NEW: SSE broadcast for visit update if linked
    if (item.visit_id) {
      broadcast({
        type: 'visit.updated',
        payload: { id: item.visit_id, planning_id: item.planning_id, status: 'em_andamento' }
      });
    }

    // Log de auditoria
    console.log(`🔍 Check-in realizado: Item ${id}, Coordenadas: ${latitude},${longitude}, Precisão: ${accuracy}m, Timestamp: ${new Date().toISOString()}`);

    res.json({ 
      message: 'Check-in realizado com sucesso',
      item,
      location: {
        latitude,
        longitude,
        accuracy,
        timestamp: new Date(timestamp).toISOString()
      }
    });
  } catch (error) {
    console.error('Erro ao realizar check-in:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// POST /api/visit-planning-items/:id/checkout - Finalizar visita (check-out)
router.post('/items/:id/checkout', async (req, res) => {
  try {
    const { id } = req.params;
    const { end_time, visit_report, next_steps, client_satisfaction } = req.body;
    
    const item = await VisitPlanningItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: 'Item de planejamento não encontrado' });
    }

    // Verificar se a visita pode ser finalizada
    if (item.status !== 'em_andamento') {
      return res.status(400).json({ 
        error: 'Apenas visitas em andamento podem ser finalizadas',
        details: `Status atual: ${item.status}`
      });
    }

    // Calcular duração real da visita em horas com 1 casa decimal
    const startTime = item.actual_start_time || (item.actual_date && item.actual_time ? new Date(`${item.actual_date}T${item.actual_time}`) : null);
    const endTime = new Date();
    const actualDuration = startTime ? Number(((endTime - startTime) / 3600000).toFixed(1)) : 0;

    // Atualizar item com dados do check-out (persistir horário e avaliação)
    await item.update({
      status: 'concluida',
      actual_duration: actualDuration,
      checkout_time: new Date().toTimeString().split(' ')[0],
      visit_report: visit_report || null,
      next_steps: next_steps || null,
      client_satisfaction: client_satisfaction || null,
      actual_end_time: endTime,
      completion_notes: visit_report || ''
    });

    // NEW: SSE broadcast for visit update if linked
    if (item.visit_id) {
      broadcast({
        type: 'visit.updated',
        payload: { id: item.visit_id, planning_id: item.planning_id, status: 'concluida' }
      });
    }

    res.json({ 
      message: 'Check-out realizado com sucesso',
      item 
    });
  } catch (error) {
    console.error('Erro ao realizar check-out:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// PUT /api/visit-planning-items/:id/reschedule - Reagendar visita individual
router.put('/items/:id/reschedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { new_date, new_time, reason, notes } = req.body;
    
    const item = await VisitPlanningItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: 'Item de planejamento não encontrado' });
    }

    // VALIDAÇÃO: Não permitir reagendar visitas concluídas
    if (item.status === 'concluida') {
      return res.status(400).json({ 
        error: 'Não é possível reagendar uma visita concluída',
        details: 'Visitas concluídas são somente leitura'
      });
    }

    // Atualizar item com nova data/hora e motivo
    await item.update({
      planned_date: new_date,
      planned_time: new_time,
      status: 'reagendada',
      completion_notes: `Reagendada: ${reason}. ${notes || ''}`
    });

    // NEW: SSE broadcast for visit update if linked
    if (item.visit_id) {
      broadcast({
        type: 'visit.updated',
        payload: { id: item.visit_id, planning_id: item.planning_id }
      });
    }

    res.json({ 
      message: 'Visita reagendada com sucesso',
      item 
    });
  } catch (error) {
    console.error('Erro ao reagendar visita:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// GET /api/visit-planning/:id/report - Gerar relatório previsto x realizado
router.get('/:id/report', async (req, res) => {
  try {
    const { id } = req.params;
    
    const planning = await VisitPlanning.findByPk(id, {
      include: [
        {
          model: VisitPlanningItem,
          as: 'items',
          attributes: [
            'id', 'planning_id', 'visit_id', 'planned_date', 'planned_time',
            'client_id', 'client_name', 'client_address', 'visit_type',
            'priority', 'estimated_duration', 'planned_distance', 'planned_fuel',
            'planned_cost', 'status', 'actual_date', 'actual_time', 'actual_duration',
            'actual_distance', 'actual_fuel', 'actual_cost', 'actual_date',
            'notes', 'completion_notes', 'created_at', 'updated_at'
          ]
        }
      ]
    });
    
    if (!planning) {
      return res.status(404).json({ error: 'Planejamento não encontrado' });
    }

    // Calcular métricas do relatório
    const report = {
      id: planning.id,
      week_start_date: planning.week_start_date,
      week_end_date: planning.week_end_date,
      planning_type: planning.planning_type,
      status: planning.status,
      
      // Métricas planejadas
      total_planned_visits: planning.total_planned_visits || 0,
      planned_distance: planning.planned_distance || 0,
      planned_fuel: planning.planned_fuel || 0,
      planned_cost: planning.planned_cost || 0,
      planned_time: planning.planned_time || 0,
      
      // Métricas reais
      total_completed_visits: planning.total_completed_visits || 0,
      actual_distance: planning.actual_distance || 0,
      actual_fuel: planning.actual_fuel || 0,
      actual_cost: planning.actual_cost || 0,
      actual_time: planning.actual_time || 0,
      
      // Contadores por status
      total_cancelled_visits: planning.total_cancelled_visits || 0,
      total_rescheduled_visits: 0,
      
      // Taxa de eficiência
      efficiency_rate: 0
    };

    // Calcular visitas reagendadas
    if (planning.items) {
      report.total_rescheduled_visits = planning.items.filter(item => 
        item.status === 'reagendada'
      ).length;
    }

    // Calcular taxa de eficiência baseada no custo
    if (report.planned_cost > 0) {
      report.efficiency_rate = ((report.planned_cost - report.actual_cost) / report.planned_cost) * 100;
    }

    res.json(report);
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// DELETE /api/visit-planning/:id - Excluir planejamento completo (DEPRECATED - usar a rota de baixo)

// PUT /api/visit-planning/:id/items/:itemId - Atualizar item do planejamento
router.put('/:id/items/:itemId', async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const updateData = req.body;
    
    const item = await VisitPlanningItem.findOne({
      where: { id: itemId, planning_id: id }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    // VALIDAÇÃO: Não permitir edição de visitas concluídas
    if (item.status === 'concluida') {
      return res.status(400).json({ 
        error: 'Não é possível editar uma visita concluída',
        details: 'Visitas concluídas são somente leitura'
      });
    }

    await item.update(updateData);

    // NEW: SSE broadcast for visit update if linked
    if (item.visit_id) {
      broadcast({
        type: 'visit.updated',
        payload: { id: item.visit_id, planning_id: item.planning_id }
      });
    }

    res.json({ 
      message: 'Item atualizado com sucesso',
      item 
    });
  } catch (error) {
    console.error('Erro ao atualizar item:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// POST /api/visit-planning/:id/items - Adicionar item ao planejamento
router.post('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const itemData = req.body;
    
    console.log('📅 Criando compromisso unificado:', {
      planningId: id,
      itemData: itemData,
      plannedDate: itemData.planned_date,
      plannedDateType: typeof itemData.planned_date,
      plannedDateISO: itemData.planned_date ? new Date(itemData.planned_date).toISOString() : null,
      plannedDateLocal: itemData.planned_date ? new Date(itemData.planned_date).toLocaleDateString('pt-BR') : null
    });
    
    const planning = await VisitPlanning.findByPk(id);
    if (!planning) {
      return res.status(404).json({ error: 'Planejamento não encontrado' });
    }

    // VERIFICAÇÃO: Não permitir adicionar compromissos se o planejamento estiver fechado
    if (planning.status === 'concluida' || planning.status === 'avaliada') {
      return res.status(400).json({ 
        error: 'Não é possível adicionar compromissos a um planejamento fechado',
        details: `O planejamento está com status: ${planning.status}. Apenas planejamentos em aberto permitem novos compromissos.`
      });
    }

    // Garantir que a data seja tratada corretamente (sem conversão de fuso horário)
    const scheduledDate = new Date(itemData.planned_date);
    const localDate = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
    
    console.log('📅 Data processada:', {
      original: itemData.planned_date,
      scheduledDate: scheduledDate,
      localDate: localDate,
      localDateISO: localDate.toISOString(),
      localDateString: localDate.toLocaleDateString('pt-BR')
    });
    
    // Validação de conflito de horário
    if (itemData.planned_time) {
      // Criar range de data para comparação (dia todo)
      const startOfDay = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 0, 0, 0);
      const endOfDay = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 23, 59, 59);

      const conflictingVisit = await sequelize.models.Visit.findOne({
        where: {
          responsible_id: planning.responsible_id,
          scheduled_date: {
            [Op.between]: [startOfDay, endOfDay]
          },
          scheduled_time: itemData.planned_time,
          status: {
            [Op.in]: ['agendada', 'em_andamento', 'planejada']
          }
        }
      });

      if (conflictingVisit) {
        const conflictDate = localDate.toLocaleDateString('pt-BR');
        return res.status(400).json({
          error: 'Conflito de horário detectado',
          message: `Já existe um compromisso agendado para ${conflictDate} às ${conflictingVisit.scheduled_time}. Escolha outro horário.`,
          conflictingVisit: {
            id: conflictingVisit.id,
            title: conflictingVisit.title,
            scheduled_date: conflictDate,
            scheduled_time: conflictingVisit.scheduled_time
          }
        });
      }
    }
    
    // Criar compromisso na tabela unificada visits
    const visit = await sequelize.models.Visit.create({
      title: `${itemData.client_name} - ${getVisitTypeLabel(itemData.visit_type)}`,
      type: itemData.visit_type,
      scheduled_date: localDate,
      scheduled_time: itemData.planned_time,
      address: itemData.client_address,
      notes: itemData.notes,
      priority: itemData.priority,
      estimated_duration: itemData.estimated_duration,
      status: 'agendada',
      client_id: itemData.client_id,
      responsible_id: planning.responsible_id,
      planning_id: id,
      planned_distance: itemData.planned_distance || 0,
      planned_fuel: itemData.planned_fuel || 0,
      planned_cost: itemData.planned_cost || 0,
      source: 'planning'
    });

    // NEW: SSE broadcast
    broadcast({
      type: 'visit.created',
      payload: { id: visit.id, planning_id: id }
    });

    // Invalida caches porque itens afetam a visão geral
    invalidateCache(['planning-list', 'planning-calendar', 'planning-history']);

    // Recalcular distâncias planejadas do DIA (empresa -> v1 -> v2 ...), em background
    try {
      const { CompanySetting, CustomerContact } = require('../models');
      const geoLocationService = require('../services/GeoLocationService');
      const planningDate = new Date(visit.scheduled_date || itemData.planned_date);
      const dateKey = planningDate.toISOString().slice(0,10);

      const [companyLat, companyLon, companyCity, companyState, companyAddress] = await Promise.all([
        CompanySetting.findOne({ where: { setting_key: 'companyLatitude' } }),
        CompanySetting.findOne({ where: { setting_key: 'companyLongitude' } }),
        CompanySetting.findOne({ where: { setting_key: 'companyCity' } }),
        CompanySetting.findOne({ where: { setting_key: 'companyState' } }),
        CompanySetting.findOne({ where: { setting_key: 'companyAddress' } })
      ]);
      const originBase = {
        lat: companyLat?.setting_value ? parseFloat(companyLat.setting_value) : undefined,
        lon: companyLon?.setting_value ? parseFloat(companyLon.setting_value) : undefined,
        city: companyCity?.setting_value,
        state: companyState?.setting_value,
        address: companyAddress?.setting_value,
        country: 'Brasil'
      };

      const dayVisits = await sequelize.models.Visit.findAll({
        where: {
          planning_id: id,
          scheduled_date: {
            [Op.between]: [new Date(dateKey + 'T00:00:00'), new Date(dateKey + 'T23:59:59')]
          },
          status: { [Op.in]: ['agendada', 'em_andamento', 'planejada'] }
        },
        order: [['scheduled_time','ASC']],
        attributes: ['id','address','scheduled_date','scheduled_time','customer_contact_id','client_id','lead_id','lat','lon']
      });

      let previous = originBase;
      for (const v of dayVisits) {
        let dest = { address: v.address || undefined, country: 'Brasil' };
        if (!dest.address || (!v.lat && !v.lon)) {
          const contactId = v.customer_contact_id || v.client_id || v.lead_id;
          if (contactId) {
            const contact = await CustomerContact.findByPk(contactId, { attributes: ['address','city','state','latitude','longitude','lat','lon'] });
            if (contact) {
              dest.address = dest.address || contact.address || undefined;
              dest.city = contact.city || undefined;
              dest.state = contact.state || undefined;
              const cLat = contact.lat ?? contact.latitude;
              const cLon = contact.lon ?? contact.longitude;
              if (cLat && cLon) { dest.lat = parseFloat(cLat); dest.lon = parseFloat(cLon); }
            }
          }
        }
        const normalizedOrigin = (previous && (previous.lat || previous.address || previous.city || previous.state)) ? previous : originBase;
        const o = (normalizedOrigin.lat && normalizedOrigin.lon) ? normalizedOrigin : await geoLocationService.geocodeAddress(normalizedOrigin.address, normalizedOrigin.city, normalizedOrigin.state, normalizedOrigin.country || 'Brasil');
        const d = (dest && dest.lat && dest.lon) ? dest : await geoLocationService.geocodeAddress(dest.address || '', dest.city || '', dest.state || '', dest.country || 'Brasil');
        let distKm = 0;
        if (o && d) distKm = await geoLocationService.getRouteDistanceKm(o, d);
        await sequelize.models.Visit.update({ planned_distance: distKm }, { where: { id: v.id } });
        previous = d || previous;
      }
    } catch (recalcErr) {
      console.warn('⚠️ Falha ao recalcular distâncias do dia:', recalcErr?.message);
    }

    res.json({ 
      message: 'Item adicionado com sucesso',
      visit 
    });
  } catch (error) {
    console.error('Erro ao adicionar item:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// DELETE /api/visit-planning/:id/items/:itemId - Remover item do planejamento
router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    const { id, itemId } = req.params;
    
    const item = await VisitPlanningItem.findOne({
      where: { id: itemId, planning_id: id }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    await item.destroy();

    // NEW: SSE broadcast — cause list refresh
    broadcast({ type: 'planning.updated', payload: { id } });
    if (item.visit_id) {
      broadcast({ type: 'visit.updated', payload: { id: item.visit_id, planning_id: id } });
    }

    res.json({ message: 'Item removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover item:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// GET /api/visit-planning/:id/metrics - Obter métricas do planejamento
router.get('/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    
    const planning = await VisitPlanning.findByPk(id, {
      include: [
        {
          model: VisitPlanningItem,
          as: 'items',
          attributes: [
            'id', 'planning_id', 'visit_id', 'planned_date', 'planned_time',
            'client_id', 'client_name', 'client_address', 'visit_type',
            'priority', 'estimated_duration', 'planned_distance', 'planned_fuel',
            'planned_cost', 'status', 'actual_date', 'actual_time', 'actual_duration',
            'actual_distance', 'actual_fuel', 'actual_cost', 'actual_date',
            'notes', 'completion_notes', 'created_at', 'updated_at'
          ]
        }
      ]
    });

    if (!planning) {
      return res.status(404).json({ error: 'Planejamento não encontrado' });
    }

    const metrics = calculatePlanningMetrics(planning.items);
    
    res.json({ metrics });
  } catch (error) {
    console.error('Erro ao calcular métricas:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Função para calcular métricas do planejamento
function calculatePlanningMetrics(items) {
  const metrics = {
    total_planned_visits: items.length,
    total_completed_visits: items.filter(item => item.status === 'concluida').length,
    total_cancelled_visits: items.filter(item => item.status === 'cancelada').length,
    planned_distance: 0,
    actual_distance: 0,
    planned_fuel: 0,
    actual_fuel: 0,
    planned_time: 0,
    actual_time: 0,
    planned_cost: 0,
    actual_cost: 0
  };

  items.forEach(item => {
    metrics.planned_distance += parseFloat(item.planned_distance || 0);
    metrics.actual_distance += parseFloat(item.actual_distance || 0);
    metrics.planned_fuel += parseFloat(item.planned_fuel || 0);
    metrics.actual_fuel += parseFloat(item.actual_fuel || 0);
    metrics.planned_time += parseFloat(item.planned_time || 0);
    metrics.actual_time += parseFloat(item.actual_time || 0);
    metrics.planned_cost += parseFloat(item.planned_cost || 0);
    metrics.actual_cost += parseFloat(item.actual_cost || 0);
  });

  // Calcular taxa de eficiência
  if (metrics.planned_cost > 0) {
    metrics.efficiency_rate = ((metrics.planned_cost - metrics.actual_cost) / metrics.planned_cost) * 100;
  }

  return metrics;
}

// GET /api/visit-planning/reports/weekly - Relatório semanal
router.get('/reports/weekly', async (req, res) => {
  try {
    const { week_start, week_end, type, responsible_id } = req.query;
    
    const where = {};
    if (week_start) where.week_start_date = { [sequelize.Op.gte]: week_start };
    if (week_end) where.week_end_date = { [sequelize.Op.lte]: week_end };
    if (type) where.planning_type = type;
    if (responsible_id) where.responsible_id = responsible_id;

    const planning = await VisitPlanning.findAll({
      where,
      include: [
        {
          model: User,
          as: 'responsible',
          attributes: ['id', 'name', 'email']
        },
        {
          model: VisitPlanningItem,
          as: 'items',
          attributes: [
            'id', 'planning_id', 'visit_id', 'planned_date', 'planned_time',
            'client_id', 'client_name', 'client_address', 'visit_type',
            'priority', 'estimated_duration', 'planned_distance', 'planned_fuel',
            'planned_cost', 'status', 'actual_date', 'actual_time', 'actual_duration',
            'actual_distance', 'actual_fuel', 'actual_cost', 'actual_date',
            'notes', 'completion_notes', 'created_at', 'updated_at'
          ]
        }
      ],
      order: [['week_start_date', 'ASC']]
    });

    // Calcular métricas agregadas
    const aggregatedMetrics = planning.reduce((acc, plan) => {
      const metrics = calculatePlanningMetrics(plan.items);
      
      acc.total_weeks++;
      acc.total_planned_visits += metrics.total_planned_visits;
      acc.total_completed_visits += metrics.total_completed_visits;
      acc.total_planned_distance += metrics.planned_distance;
      acc.total_actual_distance += metrics.actual_distance;
      acc.total_planned_fuel += metrics.planned_fuel;
      acc.total_actual_fuel += metrics.actual_fuel;
      acc.total_planned_cost += metrics.planned_cost;
      acc.total_actual_cost += metrics.actual_cost;
      
      return acc;
    }, {
      total_weeks: 0,
      total_planned_visits: 0,
      total_completed_visits: 0,
      total_planned_distance: 0,
      total_actual_distance: 0,
      total_planned_fuel: 0,
      total_actual_fuel: 0,
      total_planned_cost: 0,
      total_actual_cost: 0
    });

    // Calcular médias
    if (aggregatedMetrics.total_weeks > 0) {
      aggregatedMetrics.avg_planned_visits = aggregatedMetrics.total_planned_visits / aggregatedMetrics.total_weeks;
      aggregatedMetrics.avg_completed_visits = aggregatedMetrics.total_completed_visits / aggregatedMetrics.total_weeks;
      aggregatedMetrics.avg_planned_distance = aggregatedMetrics.total_planned_distance / aggregatedMetrics.total_weeks;
      aggregatedMetrics.avg_actual_distance = aggregatedMetrics.total_actual_distance / aggregatedMetrics.total_weeks;
      aggregatedMetrics.avg_planned_fuel = aggregatedMetrics.total_planned_fuel / aggregatedMetrics.total_weeks;
      aggregatedMetrics.avg_actual_fuel = aggregatedMetrics.total_actual_fuel / aggregatedMetrics.total_weeks;
      aggregatedMetrics.avg_planned_cost = aggregatedMetrics.total_planned_cost / aggregatedMetrics.total_weeks;
      aggregatedMetrics.avg_actual_cost = aggregatedMetrics.total_actual_cost / aggregatedMetrics.total_weeks;
    }

    res.json({ 
      planning,
      aggregatedMetrics 
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// PUT /api/visit-planning/:id/visits/batch-status - Atualizar status de todos os compromissos do planejamento
router.put('/:id/visits/batch-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { newStatus, reason } = req.body;
    
    // Validar status permitidos
    const allowedStatuses = ['cancelada', 'concluida'];
    if (!allowedStatuses.includes(newStatus)) {
      return res.status(400).json({ 
        error: 'Status inválido',
        details: `Apenas os status ${allowedStatuses.join(' ou ')} são permitidos para atualização em lote.`
      });
    }

    // Verificar se o planejamento existe
    const planning = await VisitPlanning.findByPk(id);
    if (!planning) {
      return res.status(404).json({ error: 'Planejamento não encontrado' });
    }

    // Verificar se o usuário tem permissão
    if (planning.responsible_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'master') {
      return res.status(403).json({ error: 'Sem permissão para alterar este planejamento' });
    }

    // Buscar compromissos ativos do planejamento
    const { Visit } = require('../models');
    const activeVisits = await Visit.findAll({
      where: { 
        planning_id: id,
        status: ['agendada', 'em_andamento']
      },
      attributes: ['id', 'title', 'scheduled_date', 'status']
    });

    if (activeVisits.length === 0) {
      return res.status(400).json({ 
        error: 'Nenhum compromisso ativo encontrado',
        details: 'Todos os compromissos já foram finalizados ou cancelados.'
      });
    }

    // Atualizar status de todos os compromissos ativos
    const updatePromises = activeVisits.map(visit => {
      const updateData = { status: newStatus };
      
      // Adicionar motivo se for cancelamento
      if (newStatus === 'cancelada' && reason) {
        updateData.notes = `Cancelado: ${reason}`;
      }
      
      // Adicionar data de conclusão se for finalização
      if (newStatus === 'concluida') {
        updateData.actual_date = new Date().toISOString().split('T')[0];
        updateData.actual_time = new Date().toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
      
      return visit.update(updateData);
    });

    await Promise.all(updatePromises);

    // Log da operação
    console.log(`📋 Atualizando status de ${activeVisits.length} compromissos para '${newStatus}' no planejamento ${id}`);

    // NEW: SSE broadcast — one event invalidates all
    broadcast({
      type: 'visit.updated',
      payload: { planning_id: id, batch: true, newStatus }
    });

    res.json({ 
      message: `Status de ${activeVisits.length} compromissos atualizado para '${newStatus}'`,
      updatedVisits: activeVisits.length,
      newStatus,
      reason: reason || null,
      details: `Compromissos atualizados: ${activeVisits.map(v => v.title).join(', ')}`
    });
  } catch (error) {
    console.error('Erro ao atualizar status dos compromissos:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// DELETE /api/visit-planning/:id - Excluir planejamento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se o planejamento existe
    const planning = await VisitPlanning.findByPk(id);
    if (!planning) {
      return res.status(404).json({ error: 'Planejamento não encontrado' });
    }

    // Verificar se o usuário tem permissão para excluir
    if (planning.responsible_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'master') {
      return res.status(403).json({ error: 'Sem permissão para excluir este planejamento' });
    }

    // Verificar se o planejamento pode ser excluído (não pode estar em execução ou concluído)
    if (planning.status === 'em_execucao' || planning.status === 'concluida' || planning.status === 'avaliada') {
      return res.status(400).json({ 
        error: 'Não é possível excluir um planejamento em execução, concluído ou avaliado' 
      });
    }

    // Buscar visitas associadas ao planejamento antes de excluir (para log)
    const { Visit } = require('../models');
    const associatedVisits = await Visit.findAll({
      where: { 
        planning_id: id,
        status: { [Op.ne]: 'excluida' } // Excluir visitas excluídas
      },
      attributes: ['id', 'title', 'scheduled_date', 'status']
    });

    // VERIFICAÇÃO: Não permitir exclusão se houver compromissos ativos
    const activeVisits = associatedVisits.filter(visit => 
      visit.status === 'agendada' || visit.status === 'em_andamento'
    );

    if (activeVisits.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir um planejamento com compromissos ativos',
        details: `Existem ${activeVisits.length} compromissos ativos (agendados ou em andamento). Finalize ou cancele todos os compromissos antes de excluir o planejamento.`,
        activeVisits: activeVisits.map(v => ({
          id: v.id,
          title: v.title,
          date: v.scheduled_date,
          status: v.status
        })),
        suggestion: 'Use a rota PUT /:id/visits/batch-status para cancelar ou finalizar todos os compromissos de uma vez.'
      });
    }

    // Excluindo planejamento e visitas associadas

    // Excluir visitas associadas ao planejamento
    const deletedVisitsCount = await Visit.destroy({ where: { planning_id: id } });
    
    // Excluir itens do planejamento
    const deletedItemsCount = await VisitPlanningItem.destroy({ where: { planning_id: id } });
    
    // Excluir o planejamento
    await planning.destroy();

    // NEW: SSE broadcast(s)
    broadcast({ type: 'planning.updated', payload: { id } });
    broadcast({ type: 'visit.deleted', payload: { planning_id: id, count: deletedVisitsCount } });

    // Invalida caches da lista e histórico
    invalidateCache(['planning-list', 'planning-calendar', 'planning-history']);

    res.json({ 
      message: 'Planejamento excluído com sucesso',
      deletedPlanning: { id: planning.id, week_start_date: planning.week_start_date },
      deletedVisits: deletedVisitsCount,
      deletedPlanningItems: deletedItemsCount,
      details: `Excluídos: 1 planejamento, ${deletedVisitsCount} visitas e ${deletedItemsCount} itens de planejamento`
    });
  } catch (error) {
    console.error('Erro ao excluir planejamento:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

module.exports = router;
