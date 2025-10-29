const express = require('express')
const router = express.Router()
const { Form, FormSubmission, User } = require('../models')
const authenticateToken = require('../middleware/auth')
const { asyncHandler } = require('../middleware/errorHandler')
const Joi = require('joi')

// Schema de validação para formulários
const formSchema = Joi.object({
  title: Joi.string().required().min(3).max(100),
  description: Joi.string().optional().max(500),
  category: Joi.string().required().valid('audit', 'checklist', 'contact', 'technical_visit', 'other'),
  fields: Joi.array().items(
    Joi.object({
      id: Joi.number().optional(),
      type: Joi.string().required().valid('text', 'textarea', 'number', 'email', 'select', 'multiselect', 'checkbox', 'radio', 'date', 'file', 'files', 'signature'),
      label: Joi.string().required().min(1).max(100),
      section: Joi.string().optional().max(120),
      bind: Joi.string().optional(),
      required: Joi.boolean().default(false),
      options: Joi.array().items(Joi.string()).optional(),
      placeholder: Joi.string().optional(),
      validation: Joi.object().optional()
    })
  ).optional(),
  settings: Joi.object({
    allow_anonymous: Joi.boolean().default(false),
    require_authentication: Joi.boolean().default(true),
    allow_file_upload: Joi.boolean().default(false),
    max_submissions: Joi.number().integer().min(0).default(0),
    active: Joi.boolean().default(true)
  }).optional()
}).unknown(true)

// Schema de validação para submissões
const submissionSchema = Joi.object({
  form_id: Joi.string().required(),
  data: Joi.object().required(),
  submitted_by: Joi.string().optional(),
  notes: Joi.string().optional()
}).unknown(true)

// GET /api/forms - Listar formulários
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { search, category, status, page = 1, limit = 20 } = req.query
  const offset = (page - 1) * limit

  const whereClause = {}
  
  const { Op } = require('sequelize')
  
  if (search) {
    whereClause[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } }
    ]
  }
  
  if (category) {
    whereClause.category = category
  }
  
  if (status === 'active') {
    whereClause['settings.active'] = true
  } else if (status === 'inactive') {
    whereClause['settings.active'] = false
  }

  const forms = await Form.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'created_by_user',
        attributes: ['id', 'name', 'email']
      }
    ],
    attributes: {
      include: [
        [
          require('sequelize').literal(`(
            SELECT COUNT(*)
            FROM form_submissions
            WHERE form_submissions.form_id = Form.id
          )`),
          'submissions_count'
        ]
      ]
    },
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  })

  res.json({
    forms: forms.rows,
    total: forms.count,
    page: parseInt(page),
    totalPages: Math.ceil(forms.count / limit)
  })
}))

// GET /api/forms/:id - Buscar formulário específico
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const form = await Form.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'created_by_user',
        attributes: ['id', 'name', 'email']
      }
    ]
  })

  if (!form) {
    return res.status(404).json({
      error: 'Formulário não encontrado',
      code: 'FORM_NOT_FOUND'
    })
  }

  res.json(form)
}))

// POST /api/forms - Criar formulário
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { error, value } = formSchema.validate(req.body)
  
  if (error) {
    return res.status(400).json({
      error: 'Dados de entrada inválidos',
      code: 'VALIDATION_ERROR',
      details: error.details
    })
  }

  const form = await Form.create({
    ...value,
    created_by: req.user.userId,
    settings: {
      allow_anonymous: false,
      require_authentication: true,
      allow_file_upload: false,
      max_submissions: 0,
      active: true,
      ...value.settings
    }
  })

  res.status(201).json(form)
}))

// PATCH /api/forms/:id - Atualizar formulário
router.patch('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { error, value } = formSchema.validate(req.body)
  
  if (error) {
    return res.status(400).json({
      error: 'Dados de entrada inválidos',
      code: 'VALIDATION_ERROR',
      details: error.details
    })
  }

  const form = await Form.findByPk(req.params.id)
  
  if (!form) {
    return res.status(404).json({
      error: 'Formulário não encontrado',
      code: 'FORM_NOT_FOUND'
    })
  }

  await form.update(value)
  
  res.json(form)
}))

// DELETE /api/forms/:id - Excluir formulário
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const form = await Form.findByPk(req.params.id)
  
  if (!form) {
    return res.status(404).json({
      error: 'Formulário não encontrado',
      code: 'FORM_NOT_FOUND'
    })
  }

  await form.destroy()
  
  res.json({ message: 'Formulário excluído com sucesso' })
}))

// GET /api/forms/:id/submissions - Listar submissões de um formulário
router.get('/:id/submissions', authenticateToken, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query
  const offset = (page - 1) * limit

  const submissions = await FormSubmission.findAndCountAll({
    where: { form_id: req.params.id },
    include: [
      {
        model: User,
        as: 'submitted_by_user',
        attributes: ['id', 'name', 'email']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  })

  res.json({
    submissions: submissions.rows,
    total: submissions.count,
    page: parseInt(page),
    totalPages: Math.ceil(submissions.count / limit)
  })
}))

// POST /api/forms/:id/submit - Submeter formulário
router.post('/:id/submit', asyncHandler(async (req, res) => {
  const { error, value } = submissionSchema.validate(req.body)
  
  if (error) {
    return res.status(400).json({
      error: 'Dados de entrada inválidos',
      code: 'VALIDATION_ERROR',
      details: error.details
    })
  }

  const form = await Form.findByPk(req.params.id)
  
  if (!form) {
    return res.status(404).json({
      error: 'Formulário não encontrado',
      code: 'FORM_NOT_FOUND'
    })
  }

  if (!form.settings?.active) {
    return res.status(400).json({
      error: 'Formulário não está ativo',
      code: 'FORM_INACTIVE'
    })
  }

  // Verificar limite de submissões
  if (form.settings?.max_submissions > 0) {
    const submissionCount = await FormSubmission.count({
      where: { form_id: req.params.id }
    })
    
    if (submissionCount >= form.settings.max_submissions) {
      return res.status(400).json({
        error: 'Limite de submissões atingido',
        code: 'SUBMISSION_LIMIT_REACHED'
      })
    }
  }

  const submission = await FormSubmission.create({
    form_id: req.params.id,
    data: value.data,
    submitted_by: req.user?.userId || value.submitted_by,
    notes: value.notes
  })

  res.status(201).json(submission)
}))

// GET /api/forms/categories - Listar categorias disponíveis
router.get('/categories', authenticateToken, asyncHandler(async (req, res) => {
  const categories = [
    { value: 'audit', label: 'Auditorias' },
    { value: 'checklist', label: 'Checklists' },
    { value: 'contact', label: 'Contatos' },
    { value: 'technical_visit', label: 'Visita Técnica' },
    { value: 'other', label: 'Outros' }
  ]

  res.json(categories)
}))

// GET /api/forms/field-types - Listar tipos de campo disponíveis
router.get('/field-types', authenticateToken, asyncHandler(async (req, res) => {
  const fieldTypes = [
    { value: 'text', label: 'Texto' },
    { value: 'textarea', label: 'Área de Texto' },
    { value: 'number', label: 'Número' },
    { value: 'email', label: 'Email' },
    { value: 'select', label: 'Seleção' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio' },
    { value: 'date', label: 'Data' },
    { value: 'file', label: 'Arquivo' }
  ]

  res.json(fieldTypes)
}))

module.exports = router 