const express = require('express');
const Joi = require('joi');
const { RolePermission } = require('../models');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

const schema = Joi.object({
  role: Joi.string().valid('admin','manager','sales','technician','agent','master').required(),
  permissions: Joi.array().items(Joi.string()).required()
})

router.get('/', auth, async (req, res, next) => {
  try {
    // Seed de permissões padrão, se vazio
    const existing = await RolePermission.count()
    if (!existing) {
      const all = [
        // Menus
        'menu.crm','menu.crm.leads','menu.crm.clients',
        'menu.products','menu.proposals','menu.visits','menu.forms','menu.analytics','menu.pipeline',
        'menu.people','menu.people.teams','menu.people.employees',
        'menu.settings','menu.settings.integrations','menu.settings.permissions',
        // Ações (CRUD)
        'leads.view','leads.create','leads.edit','leads.delete',
        'clients.view','clients.create','clients.edit','clients.delete',
        'forms.submit','forms.view',
        'settings.update','integrations.update','permissions.update'
      ]
      
      const masterPermissions = [
        'menu.dashboard','menu.crm','menu.crm.leads','menu.crm.clients',
        'menu.products','menu.proposals','menu.visits','menu.forms','menu.analytics','menu.pipeline',
        'menu.people','menu.people.teams','menu.people.employees',
        'menu.settings','menu.settings.users','menu.settings.integrations','menu.settings.permissions',
        'menu.settings.catalogs','menu.fleet','menu.fleet.vehicles','menu.fleet.maintenance','menu.fleet.fuel',
        'menu.sales',
        'leads.view','leads.create','leads.edit','leads.delete','leads.import','leads.export',
        'clients.view','clients.create','clients.edit','clients.delete','clients.import','clients.export',
        'products.view','products.create','products.edit','products.delete',
        'proposals.view','proposals.create','proposals.edit','proposals.delete',
        'visits.view','visits.create','visits.edit','visits.delete','visits.planning','visits.execution',
        'forms.view','forms.create','forms.edit','forms.delete','forms.submit',
        'analytics.view','analytics.export',
        'pipeline.view','pipeline.create','pipeline.edit','pipeline.delete',
        'people.view','people.create','people.edit','people.delete',
        'teams.view','teams.create','teams.edit','teams.delete',
        'employees.view','employees.create','employees.edit','employees.delete',
        'settings.view','settings.update','settings.company','settings.users','settings.integrations',
        'settings.permissions','settings.catalogs',
        'users.view','users.create','users.edit','users.delete','users.permissions',
        'integrations.view','integrations.create','integrations.edit','integrations.delete','integrations.update',
        'permissions.view','permissions.create','permissions.edit','permissions.delete','permissions.update',
        'fleet.view','fleet.create','fleet.edit','fleet.delete',
        'vehicles.view','vehicles.create','vehicles.edit','vehicles.delete',
        'maintenance.view','maintenance.create','maintenance.edit','maintenance.delete',
        'fuel.view','fuel.create','fuel.edit','fuel.delete',
        'sales.view','sales.leads','sales.performance','sales.assign','sales.dashboard',
        'catalogs.view','catalogs.create','catalogs.edit','catalogs.delete',
        'segments.view','segments.create','segments.edit','segments.delete',
        'departments.view','departments.create','departments.edit','departments.delete',
        'role_profiles.view','role_profiles.create','role_profiles.edit','role_profiles.delete'
      ]
      
      await RolePermission.bulkCreate([
        { role: 'master', permissions: masterPermissions },
        { role: 'admin', permissions: all },
        { role: 'manager', permissions: all },
        { role: 'sales', permissions: ['menu.crm','menu.crm.leads','menu.crm.clients','menu.pipeline','menu.visits','menu.forms'] },
        { role: 'technician', permissions: ['menu.visits','menu.forms'] }
      ])
    }
    const rows = await RolePermission.findAll()
    res.json({ data: rows })
  } catch (e) { next(e) }
})

// Resumo das permissões do usuário logado
router.get('/me', auth, async (req, res, next) => {
  try {
    console.log('🔑 Buscando permissões para usuário:', req.user.role)
    
    // Buscar permissões do banco de dados
    const row = await RolePermission.findOne({ where: { role: req.user.role } })
    
    if (!row) {
      console.log('⚠️ Nenhuma permissão encontrada para role:', req.user.role)
      // Retornar permissões padrão se não houver no banco
      const defaultPermissions = {
        'master': ['menu.dashboard','menu.crm','menu.crm.leads','menu.crm.clients','menu.products','menu.proposals','menu.visits','menu.forms','menu.analytics','menu.pipeline','menu.people','menu.settings','menu.fleet'],
        'admin': ['menu.dashboard','menu.crm','menu.crm.leads','menu.crm.clients','menu.products','menu.proposals','menu.visits','menu.forms','menu.analytics','menu.pipeline','menu.people','menu.settings','menu.fleet'],
        'manager': ['menu.dashboard','menu.crm','menu.crm.leads','menu.crm.clients','menu.products','menu.proposals','menu.visits','menu.forms','menu.analytics','menu.pipeline','menu.people','menu.settings','menu.fleet'],
        'sales': ['menu.dashboard','menu.crm','menu.crm.leads','menu.crm.clients','menu.products','menu.proposals','menu.visits','menu.forms','menu.analytics','menu.pipeline'],
        'technician': ['menu.visits','menu.forms'],
        'agent': ['menu.visits','menu.forms']
      }
      
      const permissions = defaultPermissions[req.user.role] || []
      console.log('🔑 Usando permissões padrão:', permissions)
      return res.json({ role: req.user.role, permissions })
    }
    
    const permissions = row.permissions || []
    console.log('🔑 Permissões encontradas no banco:', {
      role: req.user.role,
      total: permissions.length,
      permissoes: permissions.slice(0, 10)
    })
    
    res.json({ role: req.user.role, permissions })
  } catch (e) { 
    console.error('❌ Erro ao buscar permissões:', e)
    next(e) 
  }
})

router.put('/', auth, requireRole(['admin', 'manager', 'master']), async (req, res, next) => {
  try {
    const { error, value } = schema.validate(req.body, { abortEarly: false })
    if (error) return res.status(400).json({ error: 'Dados inválidos', details: error.details })
    let row = await RolePermission.findOne({ where: { role: value.role } })
    if (!row) row = await RolePermission.create(value)
    else await row.update({ permissions: value.permissions })
    res.json({ success: true, data: row })
  } catch (e) { next(e) }
})

module.exports = router;

