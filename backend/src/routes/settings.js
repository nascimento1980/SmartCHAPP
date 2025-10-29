const express = require('express');
const fs = require('fs');
const path = require('path');
const Joi = require('joi');
const { CompanySetting, Segment, Department, RoleProfile, Lead, Employee } = require('../models');
const { Op } = require('sequelize')

const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data');
// usar extensão .db para evitar reinícios do nodemon (que observa .json)
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.db');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readSettings() {
  try {
    ensureDataDir();
    if (!fs.existsSync(SETTINGS_FILE)) return {};
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

function writeSettings(data) {
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const companySchema = Joi.object({
  companyName: Joi.string().allow('', null),
  companyLegalName: Joi.string().allow('', null),
  companyTaxId: Joi.string().allow('', null),
  companyEmail: Joi.string().email().allow('', null),
  companyPhone: Joi.string().allow('', null),
  companySite: Joi.string().allow('', null),
  companyAddress: Joi.string().allow('', null),
  companyCity: Joi.string().allow('', null),
  companyState: Joi.string().allow('', null),
  companyZip: Joi.string().allow('', null),
  companyLatitude: Joi.string().allow('', null),
  companyLongitude: Joi.string().allow('', null),
  companyLogo: Joi.string().allow('', null),
  companyPrimaryColor: Joi.string().allow('', null),
  companySecondaryColor: Joi.string().allow('', null),
  // Campos adicionais do componente AddressFields
  address: Joi.string().allow('', null),
  number: Joi.string().allow('', null),
  complement: Joi.string().allow('', null),
  neighborhood: Joi.string().allow('', null),
  city: Joi.string().allow('', null),
  state: Joi.string().allow('', null),
  zipcode: Joi.string().allow('', null),
  lat: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null),
  lon: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null),
  cnpj: Joi.string().allow('', null),
  company_name: Joi.string().allow('', null),
  fantasy_name: Joi.string().allow('', null),
}).unknown(true); // Permite campos desconhecidos sem erro

router.get('/company', async (req, res) => {
  try {
    // Buscar todas as configurações da empresa
    const settings = await CompanySetting.findAll({
      where: {
        setting_key: {
          [Op.like]: 'company%'
        }
      },
      attributes: ['id', 'setting_key', 'setting_value', 'setting_type', 'description', 'is_public', 'created_at', 'updated_at']
    });
    
    // Construir objeto company a partir das configurações
    const company = {};
    settings.forEach(setting => {
      const key = setting.setting_key;
      company[key] = setting.setting_value;
    });
    
    // Não retornar binário no GET principal
    delete company.logoData;
    
    res.json({ company });
  } catch (error) {
    console.error('Erro ao buscar configurações da empresa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
})

router.get('/company/logo', async (req, res) => {
  try {
    // Buscar configurações de logo
    const [mimeSetting, dataSetting] = await Promise.all([
      CompanySetting.findOne({ 
        where: { setting_key: 'logoMime' },
        attributes: ['id', 'setting_key', 'setting_value', 'setting_type', 'description', 'is_public', 'created_at', 'updated_at']
      }),
      CompanySetting.findOne({ 
        where: { setting_key: 'logoData' },
        attributes: ['id', 'setting_key', 'setting_value', 'setting_type', 'description', 'is_public', 'created_at', 'updated_at']
      })
    ]);
    
    if (!mimeSetting || !dataSetting || !dataSetting.setting_value) {
      // Retornar logo padrão SVG em vez de 404
      const defaultLogo = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
        <rect width="120" height="40" fill="#1976d2" rx="4"/>
        <text x="60" y="25" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">CH SMART</text>
      </svg>`;
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(defaultLogo);
    }
    
    res.setHeader('Content-Type', mimeSetting.setting_value || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.end(dataSetting.setting_value);
  } catch (error) {
    console.error('Erro ao buscar logo:', error);
    
    // Retornar logo padrão mesmo em caso de erro
    const defaultLogo = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
      <rect width="120" height="40" fill="#1976d2" rx="4"/>
      <text x="60" y="25" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">CH SMART</text>
    </svg>`;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(defaultLogo);
  }
})

router.put('/company', async (req, res) => {
  try {
    console.log('📥 PUT /company - Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    const { error, value } = companySchema.validate(req.body || {}, { abortEarly: false });
    if (error) {
      console.error('❌ Validação falhou:', error.details);
      return res.status(400).json({ error: 'Dados inválidos', details: error.details });
    }
    
    console.log('✅ Validação OK. Salvando...');
    
    // Salvar cada campo SEQUENCIALMENTE para evitar lock do SQLite
    for (const [key, fieldValue] of Object.entries(value)) {
      if (key === 'companyLogo') continue; // Pular logo neste endpoint
      
      console.log(`  💾 Salvando ${key}:`, fieldValue);
      
      const [setting, created] = await CompanySetting.findOrCreate({
        where: { setting_key: key },
        defaults: {
          setting_key: key,
          setting_value: fieldValue || '',
          setting_type: 'string',
          description: `Configuração da empresa: ${key}`,
          is_public: false
        }
      });
      
      if (!created) {
        await setting.update({
          setting_value: fieldValue || '',
          updated_at: new Date()
        });
      }
    }
    
    // Retornar dados atualizados
    const settings = await CompanySetting.findAll({
      where: {
        setting_key: {
          [Op.like]: 'company%'
        }
      },
      attributes: ['id', 'setting_key', 'setting_value', 'setting_type', 'description', 'is_public', 'created_at', 'updated_at']
    });
    
    const company = {};
    settings.forEach(setting => {
      const key = setting.setting_key;
      company[key] = setting.setting_value;
    });
    
    delete company.logoData;
    
    console.log('✅ Dados salvos com sucesso!');
    try {
      const { broadcast } = require('./events');
      broadcast({ type: 'settings.updated', payload: company });
    } catch (e) {
      console.warn('SSE broadcast indisponível:', e?.message);
    }
    return res.json({ success: true, company });
  } catch (error) {
    console.error('❌ ERRO CRÍTICO ao atualizar configurações da empresa:');
    console.error('Tipo:', error.name);
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
})

router.post('/company/logo', async (req, res) => {
  try {
    const { fileBase64, filename } = req.body || {}
    if (!fileBase64) return res.status(400).json({ error: 'Arquivo (base64) é obrigatório' })
    const mime = (fileBase64.match(/^data:(.*?);base64,/) || [])[1] || 'image/png'
    const data = Buffer.from(fileBase64.split(',').pop(), 'base64')
    
    // Buscar ou criar configuração para logoMime
    const [mimeSetting, mimeCreated] = await CompanySetting.findOrCreate({
      where: { setting_key: 'logoMime' },
      defaults: {
        setting_key: 'logoMime',
        setting_value: mime,
        setting_type: 'string',
        description: 'Configuração da empresa: logoMime',
        is_public: false
      }
    });
    
    if (!mimeCreated) {
      await mimeSetting.update({ setting_value: mime });
    }
    
    // Buscar ou criar configuração para logoData
    const [dataSetting, dataCreated] = await CompanySetting.findOrCreate({
      where: { setting_key: 'logoData' },
      defaults: {
        setting_key: 'logoData',
        setting_value: data,
        setting_type: 'json',
        description: 'Configuração da empresa: logoData',
        is_public: false
      }
    });
    
    if (!dataCreated) {
      await dataSetting.update({ setting_value: data });
    }
    
    return res.json({ success: true })
  } catch (e) {
    console.error('Erro ao salvar logo:', e);
    return res.status(500).json({ error: 'Falha ao salvar logo' })
  }
})

module.exports = router;

// ----- Catálogos: Segmentos, Departamentos, Perfis -----
const expressCat = require('express')
// Segmentos
router.get('/catalogs/segments', async (req, res) => {
  const rows = await Segment.findAll({ order: [['name','ASC']] })
  if (req.query.includeUsage === '1') {
    const data = []
    for (const r of rows) {
      const orConds = [{ segment: r.name }]
      if (r.code) orConds.push({ segment: r.code })
      const usageCount = await Lead.count({ where: { [Op.or]: orConds } })
      data.push({ ...r.toJSON(), usageCount })
    }
    return res.json({ data })
  }
  res.json({ data: rows })
})
router.post('/catalogs/segments', async (req, res) => {
  const schema = Joi.object({ name: Joi.string().min(2).max(80).required(), code: Joi.string().allow('', null) })
  const { error, value } = schema.validate(req.body)
  if (error) return res.status(400).json({ error: 'Dados inválidos' })
  const row = await Segment.create({ name: value.name, code: value.code || null })
  res.status(201).json({ data: row })
})
router.put('/catalogs/segments/:id', async (req, res) => {
  const schema = Joi.object({ name: Joi.string().min(2).max(80).required(), code: Joi.string().allow('', null), update_references: Joi.boolean().default(false) })
  const { error, value } = schema.validate(req.body)
  if (error) return res.status(400).json({ error: 'Dados inválidos' })
  const row = await Segment.findByPk(req.params.id)
  if (!row) return res.status(404).json({ error: 'Não encontrado' })
  const oldName = row.name
  const oldCode = row.code
  await row.update({ name: value.name, code: value.code || null })
  if (value.update_references) {
    const target = value.code || value.name
    const match = [oldName]
    if (oldCode) match.push(oldCode)
    await Lead.update({ segment: target }, { where: { segment: { [Op.in]: match } } })
  }
  res.json({ data: row })
})
router.delete('/catalogs/segments/:id', async (req, res) => {
  const row = await Segment.findByPk(req.params.id)
  if (!row) return res.status(404).json({ error: 'Não encontrado' })
  const orConds = [{ segment: row.name }]
  if (row.code) orConds.push({ segment: row.code })
  const cnt = await Lead.count({ where: { [Op.or]: orConds } })
  if (cnt > 0) return res.status(409).json({ error: 'Segmento em uso. Não é possível excluir.' })
  await row.destroy()
  res.json({ success: true })
})
// Departamentos
router.get('/catalogs/departments', async (req, res) => {
  const rows = await Department.findAll({ order: [['name','ASC']] })
  if (req.query.includeUsage === '1') {
    const data = []
    for (const r of rows) {
      const usageCount = await Employee.count({ where: { department: r.name } })
      data.push({ ...r.toJSON(), usageCount })
    }
    return res.json({ data })
  }
  res.json({ data: rows })
})
router.post('/catalogs/departments', async (req, res) => {
  const schema = Joi.object({ name: Joi.string().min(2).max(80).required() })
  const { error, value } = schema.validate(req.body)
  if (error) return res.status(400).json({ error: 'Dados inválidos' })
  const row = await Department.create({ name: value.name })
  res.status(201).json({ data: row })
})
router.put('/catalogs/departments/:id', async (req, res) => {
  const schema = Joi.object({ name: Joi.string().min(2).max(80).required(), update_references: Joi.boolean().default(false) })
  const { error, value } = schema.validate(req.body)
  if (error) return res.status(400).json({ error: 'Dados inválidos' })
  const row = await Department.findByPk(req.params.id)
  if (!row) return res.status(404).json({ error: 'Não encontrado' })
  const oldName = row.name
  await row.update({ name: value.name })
  if (value.update_references) {
    await Employee.update({ department: value.name }, { where: { department: oldName } })
  }
  res.json({ data: row })
})
router.delete('/catalogs/departments/:id', async (req, res) => {
  const row = await Department.findByPk(req.params.id)
  if (!row) return res.status(404).json({ error: 'Não encontrado' })
  const cnt = await Employee.count({ where: { department: row.name } })
  if (cnt > 0) return res.status(409).json({ error: 'Departamento em uso. Não é possível excluir.' })
  await row.destroy()
  res.json({ success: true })
})
// Perfis (perfil funcional de colaborador)
router.get('/catalogs/role-profiles', async (req, res) => {
  const rows = await RoleProfile.findAll({ order: [['name','ASC']] })
  if (req.query.includeUsage === '1') {
    const data = []
    for (const r of rows) {
      const usageCount = await Employee.count({ where: { job_title: r.name } })
      data.push({ ...r.toJSON(), usageCount })
    }
    return res.json({ data })
  }
  res.json({ data: rows })
})
router.post('/catalogs/role-profiles', async (req, res) => {
  const schema = Joi.object({ name: Joi.string().min(2).max(80).required(), role: Joi.string().valid('admin','manager','sales','technician').allow(null) })
  const { error, value } = schema.validate(req.body)
  if (error) return res.status(400).json({ error: 'Dados inválidos' })
  const row = await RoleProfile.create({ name: value.name, role: value.role || null })
  res.status(201).json({ data: row })
})
router.put('/catalogs/role-profiles/:id', async (req, res) => {
  const schema = Joi.object({ name: Joi.string().min(2).max(80).required(), role: Joi.string().valid('admin','manager','sales','technician').allow(null), update_references: Joi.boolean().default(false) })
  const { error, value } = schema.validate(req.body)
  if (error) return res.status(400).json({ error: 'Dados inválidos' })
  const row = await RoleProfile.findByPk(req.params.id)
  if (!row) return res.status(404).json({ error: 'Não encontrado' })
  const oldName = row.name
  await row.update({ name: value.name, role: value.role || null })
  if (value.update_references) {
    await Employee.update({ job_title: value.name }, { where: { job_title: oldName } })
  }
  res.json({ data: row })
})
router.delete('/catalogs/role-profiles/:id', async (req, res) => {
  const row = await RoleProfile.findByPk(req.params.id)
  if (!row) return res.status(404).json({ error: 'Não encontrado' })
  const cnt = await Employee.count({ where: { job_title: row.name } })
  if (cnt > 0) return res.status(409).json({ error: 'Perfil em uso. Não é possível excluir.' })
  await row.destroy()
  res.json({ success: true })
})

// Importa valores existentes do banco (leads.segment, employees.department/job_title)
router.post('/catalogs/import', async (req, res) => {
  const segments = await Lead.findAll({ attributes: ['segment'], group: ['segment'], raw: true })
  for (const s of segments) {
    const name = s.segment
    if (!name) continue
    const exists = await Segment.findOne({ where: { name } })
    if (!exists) await Segment.create({ name, code: null })
  }
  const deps = await Employee.findAll({ attributes: ['department'], group: ['department'], raw: true })
  for (const d of deps) {
    const name = d.department
    if (!name) continue
    const exists = await Department.findOne({ where: { name } })
    if (!exists) await Department.create({ name })
  }
  const roles = await Employee.findAll({ attributes: ['job_title'], group: ['job_title'], raw: true })
  for (const r of roles) {
    const name = r.job_title
    if (!name) continue
    const exists = await RoleProfile.findOne({ where: { name } })
    if (!exists) await RoleProfile.create({ name })
  }
  res.json({ success: true })
})

