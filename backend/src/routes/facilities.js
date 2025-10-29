const express = require('express');
const { 
  FacilityPOP, 
  FacilityPOPStep, 
  FacilityExecution, 
  FacilityExecutionStep, 
  FacilityEvidence,
  User 
} = require('../models');
const authMiddleware = require('../middleware/auth');
const { 
  requireFacilitiesAccess, 
  requirePermission,
  requireMinimumRole 
} = require('../middleware/hierarchicalAuth');
const { asyncHandler } = require('../middleware/errorHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configuração do multer para upload de evidências
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/facilities/evidences');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `evidence-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

// Middleware de autenticação e acesso
router.use(authMiddleware);
router.use(requireFacilitiesAccess());

// ===== ROTAS DE POPs =====

// GET /api/facilities/pops - Listar POPs
router.get('/pops', requirePermission('facilities.pops.read'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, status, search } = req.query;
  
  const where = {};
  if (category) where.category = category;
  if (status) where.status = status;
  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  const pops = await FacilityPOP.findAndCountAll({
    where,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'approver', attributes: ['id', 'name', 'email'] },
      { model: FacilityPOPStep, as: 'steps', attributes: ['id', 'step_number', 'title'] }
    ],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['created_at', 'DESC']]
  });
  
  res.json({
    pops: pops.rows,
    pagination: {
      total: pops.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(pops.count / parseInt(limit))
    }
  });
}));

// GET /api/facilities/pops/:id - Obter POP específico
router.get('/pops/:id', requirePermission('facilities.pops.read'), asyncHandler(async (req, res) => {
  const pop = await FacilityPOP.findByPk(req.params.id, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'approver', attributes: ['id', 'name', 'email'] },
      { 
        model: FacilityPOPStep, 
        as: 'steps', 
        order: [['step_number', 'ASC']]
      }
    ]
  });
  
  if (!pop) {
    return res.status(404).json({ error: 'POP não encontrado' });
  }
  
  res.json(pop);
}));

// POST /api/facilities/pops - Criar novo POP
router.post('/pops', requirePermission('facilities.pops.write'), asyncHandler(async (req, res) => {
  const popData = {
    ...req.body,
    created_by: req.user.id
  };
  
  const pop = await FacilityPOP.create(popData);
  
  // Criar etapas se fornecidas
  if (req.body.steps && Array.isArray(req.body.steps)) {
    const steps = req.body.steps.map((step, index) => ({
      ...step,
      pop_id: pop.id,
      step_number: index + 1
    }));
    
    await FacilityPOPStep.bulkCreate(steps);
  }
  
  const createdPOP = await FacilityPOP.findByPk(pop.id, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
      { model: FacilityPOPStep, as: 'steps', order: [['step_number', 'ASC']] }
    ]
  });
  
  res.status(201).json(createdPOP);
}));

// PUT /api/facilities/pops/:id - Atualizar POP
router.put('/pops/:id', requirePermission('facilities.pops.write'), asyncHandler(async (req, res) => {
  const pop = await FacilityPOP.findByPk(req.params.id);
  
  if (!pop) {
    return res.status(404).json({ error: 'POP não encontrado' });
  }
  
  await pop.update(req.body);
  
  // Atualizar etapas se fornecidas
  if (req.body.steps && Array.isArray(req.body.steps)) {
    // Remover etapas existentes
    await FacilityPOPStep.destroy({ where: { pop_id: pop.id } });
    
    // Criar novas etapas
    const steps = req.body.steps.map((step, index) => ({
      ...step,
      pop_id: pop.id,
      step_number: index + 1
    }));
    
    await FacilityPOPStep.bulkCreate(steps);
  }
  
  const updatedPOP = await FacilityPOP.findByPk(pop.id, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'approver', attributes: ['id', 'name', 'email'] },
      { model: FacilityPOPStep, as: 'steps', order: [['step_number', 'ASC']] }
    ]
  });
  
  res.json(updatedPOP);
}));

// POST /api/facilities/pops/:id/approve - Aprovar POP
router.post('/pops/:id/approve', requirePermission('facilities.pops.approve'), asyncHandler(async (req, res) => {
  const pop = await FacilityPOP.findByPk(req.params.id);
  
  if (!pop) {
    return res.status(404).json({ error: 'POP não encontrado' });
  }
  
  await pop.update({
    approved_by: req.user.id,
    approved_at: new Date(),
    status: 'ativo'
  });
  
  res.json({ message: 'POP aprovado com sucesso' });
}));

// DELETE /api/facilities/pops/:id - Deletar POP
router.delete('/pops/:id', requirePermission('facilities.pops.delete'), asyncHandler(async (req, res) => {
  const pop = await FacilityPOP.findByPk(req.params.id);
  
  if (!pop) {
    return res.status(404).json({ error: 'POP não encontrado' });
  }
  
  await pop.destroy();
  res.json({ message: 'POP deletado com sucesso' });
}));

// ===== ROTAS DE EXECUÇÕES =====

// GET /api/facilities/executions - Listar execuções
router.get('/executions', requirePermission('facilities.executions.read'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, pop_id, executed_by } = req.query;
  
  const where = {};
  if (status) where.status = status;
  if (pop_id) where.pop_id = pop_id;
  if (executed_by) where.executed_by = executed_by;
  
  const executions = await FacilityExecution.findAndCountAll({
    where,
    include: [
      { model: FacilityPOP, as: 'pop', attributes: ['id', 'title', 'code', 'category'] },
      { model: User, as: 'executor', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'supervisor', attributes: ['id', 'name', 'email'] }
    ],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['created_at', 'DESC']]
  });
  
  res.json({
    executions: executions.rows,
    pagination: {
      total: executions.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(executions.count / parseInt(limit))
    }
  });
}));

// POST /api/facilities/executions - Iniciar nova execução
router.post('/executions', requirePermission('facilities.executions.write'), asyncHandler(async (req, res) => {
  const { pop_id, location } = req.body;
  
  const pop = await FacilityPOP.findByPk(pop_id, {
    include: [{ model: FacilityPOPStep, as: 'steps', order: [['step_number', 'ASC']] }]
  });
  
  if (!pop) {
    return res.status(404).json({ error: 'POP não encontrado' });
  }
  
  if (pop.status !== 'ativo') {
    return res.status(400).json({ error: 'POP não está ativo' });
  }
  
  // Criar execução
  const execution = await FacilityExecution.create({
    pop_id,
    executed_by: req.user.id,
    location,
    start_time: new Date(),
    status: 'em_andamento'
  });
  
  // Criar etapas de execução
  const executionSteps = pop.steps.map(step => ({
    execution_id: execution.id,
    step_id: step.id,
    status: 'pendente'
  }));
  
  await FacilityExecutionStep.bulkCreate(executionSteps);
  
  const createdExecution = await FacilityExecution.findByPk(execution.id, {
    include: [
      { model: FacilityPOP, as: 'pop' },
      { model: User, as: 'executor', attributes: ['id', 'name', 'email'] },
      { 
        model: FacilityExecutionStep, 
        as: 'steps',
        include: [{ model: FacilityPOPStep, as: 'step' }],
        order: [['step', 'step_number', 'ASC']]
      }
    ]
  });
  
  res.status(201).json(createdExecution);
}));

// PUT /api/facilities/executions/:id/steps/:stepId - Atualizar etapa de execução
router.put('/executions/:id/steps/:stepId', requirePermission('facilities.executions.write'), asyncHandler(async (req, res) => {
  const { status, observations, non_conformity_reason, corrective_action } = req.body;
  
  const executionStep = await FacilityExecutionStep.findOne({
    where: {
      execution_id: req.params.id,
      step_id: req.params.stepId
    }
  });
  
  if (!executionStep) {
    return res.status(404).json({ error: 'Etapa de execução não encontrada' });
  }
  
  const updateData = {
    status,
    observations,
    non_conformity_reason,
    corrective_action
  };
  
  if (status === 'em_andamento' && !executionStep.started_at) {
    updateData.started_at = new Date();
  }
  
  if (status === 'concluido' || status === 'nao_conforme') {
    updateData.completed_at = new Date();
  }
  
  await executionStep.update(updateData);
  
  // Atualizar percentual de conclusão da execução
  const execution = await FacilityExecution.findByPk(req.params.id, {
    include: [{ model: FacilityExecutionStep, as: 'steps' }]
  });
  
  const totalSteps = execution.steps.length;
  const completedSteps = execution.steps.filter(s => 
    s.status === 'concluido' || s.status === 'nao_conforme'
  ).length;
  
  const completionPercentage = (completedSteps / totalSteps) * 100;
  
  await execution.update({ 
    completion_percentage: completionPercentage,
    status: completionPercentage === 100 ? 'concluido' : 'em_andamento'
  });
  
  res.json({ message: 'Etapa atualizada com sucesso' });
}));

// POST /api/facilities/executions/:id/steps/:stepId/evidence - Upload de evidência
router.post('/executions/:id/steps/:stepId/evidence', 
  requirePermission('facilities.evidences.upload'),
  upload.single('evidence'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de evidência é obrigatório' });
    }
    
    const executionStep = await FacilityExecutionStep.findOne({
      where: {
        execution_id: req.params.id,
        step_id: req.params.stepId
      }
    });
    
    if (!executionStep) {
      return res.status(404).json({ error: 'Etapa de execução não encontrada' });
    }
    
    // Determinar tipo de evidência baseado no arquivo
    let evidenceType = 'documento';
    if (req.file.mimetype.startsWith('image/')) {
      evidenceType = 'foto';
    } else if (req.file.mimetype.startsWith('video/')) {
      evidenceType = 'video';
    }
    
    const evidence = await FacilityEvidence.create({
      execution_step_id: executionStep.id,
      type: evidenceType,
      file_path: req.file.path,
      file_name: req.file.originalname,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      description: req.body.description,
      metadata: req.body.metadata ? JSON.parse(req.body.metadata) : null,
      uploaded_by: req.user.id
    });
    
    res.status(201).json(evidence);
  })
);

// GET /api/facilities/executions/:id - Obter execução específica
router.get('/executions/:id', requirePermission('facilities.executions.read'), asyncHandler(async (req, res) => {
  const execution = await FacilityExecution.findByPk(req.params.id, {
    include: [
      { model: FacilityPOP, as: 'pop' },
      { model: User, as: 'executor', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'supervisor', attributes: ['id', 'name', 'email'] },
      {
        model: FacilityExecutionStep,
        as: 'steps',
        include: [
          { model: FacilityPOPStep, as: 'step' },
          { 
            model: FacilityEvidence, 
            as: 'evidences',
            include: [{ model: User, as: 'uploader', attributes: ['id', 'name'] }]
          }
        ],
        order: [['step', 'step_number', 'ASC']]
      }
    ]
  });
  
  if (!execution) {
    return res.status(404).json({ error: 'Execução não encontrada' });
  }
  
  res.json(execution);
}));

// POST /api/facilities/executions/:id/validate - Validar execução
router.post('/executions/:id/validate', requirePermission('facilities.executions.validate'), asyncHandler(async (req, res) => {
  const { validation_notes } = req.body;
  
  const execution = await FacilityExecution.findByPk(req.params.id);
  
  if (!execution) {
    return res.status(404).json({ error: 'Execução não encontrada' });
  }
  
  await execution.update({
    supervisor_id: req.user.id,
    validated_at: new Date(),
    validation_notes
  });
  
  res.json({ message: 'Execução validada com sucesso' });
}));

// ===== ROTAS DE RELATÓRIOS =====

// GET /api/facilities/reports/dashboard - Dashboard de facilities
router.get('/reports/dashboard', requirePermission('facilities.reports.basic'), asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  
  const dateFilter = {};
  if (start_date && end_date) {
    dateFilter.created_at = {
      [Op.between]: [new Date(start_date), new Date(end_date)]
    };
  }
  
  // Estatísticas gerais
  const totalPOPs = await FacilityPOP.count({ where: { status: 'ativo' } });
  const totalExecutions = await FacilityExecution.count({ where: dateFilter });
  const completedExecutions = await FacilityExecution.count({ 
    where: { ...dateFilter, status: 'concluido' } 
  });
  const pendingExecutions = await FacilityExecution.count({ 
    where: { ...dateFilter, status: 'em_andamento' } 
  });
  
  // Execuções por categoria
  const executionsByCategory = await FacilityExecution.findAll({
    attributes: [
      [sequelize.col('pop.category'), 'category'],
      [sequelize.fn('COUNT', sequelize.col('FacilityExecution.id')), 'count']
    ],
    include: [{
      model: FacilityPOP,
      as: 'pop',
      attributes: []
    }],
    where: dateFilter,
    group: ['pop.category'],
    raw: true
  });
  
  // Taxa de conformidade
  const conformityRate = totalExecutions > 0 ? 
    ((completedExecutions / totalExecutions) * 100).toFixed(2) : 0;
  
  res.json({
    summary: {
      totalPOPs,
      totalExecutions,
      completedExecutions,
      pendingExecutions,
      conformityRate
    },
    executionsByCategory
  });
}));

module.exports = router;