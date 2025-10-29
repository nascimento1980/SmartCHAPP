const express = require('express');
const Joi = require('joi');
const { Employee } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

const employeeSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().allow('', null),
  cpf: Joi.string().allow('', null),
  department: Joi.string().allow('', null),
  job_title: Joi.string().allow('', null),
  admission_date: Joi.date().allow('', null),
  status: Joi.string().valid('active', 'inactive').default('active')
})

router.get('/', auth, async (req, res, next) => {
  try {
    const rows = await Employee.findAll({ order: [['name', 'ASC']] })
    res.json({ data: rows })
  } catch (e) { next(e) }
})

router.post('/', auth, async (req, res, next) => {
  try {
    const { error, value } = employeeSchema.validate(req.body, { abortEarly: false })
    if (error) return res.status(400).json({ error: 'Dados inválidos', details: error.details })
    const exists = await Employee.findOne({ where: { email: value.email } })
    if (exists) return res.status(409).json({ error: 'Colaborador já existe' })
    const row = await Employee.create(value)
    res.status(201).json({ data: row })
  } catch (e) { next(e) }
})

// Atualizar colaborador
router.put('/:id', auth, async (req, res, next) => {
  try {
    const partialSchema = employeeSchema.fork(Object.keys(employeeSchema.describe().keys), (s) => s.optional())
    const { error, value } = partialSchema.validate(req.body, { abortEarly: false })
    if (error) return res.status(400).json({ error: 'Dados inválidos', details: error.details })
    const row = await Employee.findByPk(req.params.id)
    if (!row) return res.status(404).json({ error: 'Colaborador não encontrado' })
    if (value.email && value.email !== row.email) {
      const exists = await Employee.findOne({ where: { email: value.email } })
      if (exists) return res.status(409).json({ error: 'E-mail já utilizado por outro colaborador' })
    }
    await row.update(value)
    res.json({ data: row })
  } catch (e) { next(e) }
})

// Excluir colaborador
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const row = await Employee.findByPk(req.params.id)
    if (!row) return res.status(404).json({ error: 'Colaborador não encontrado' })
    await row.destroy()
    res.json({ success: true })
  } catch (e) { next(e) }
})

module.exports = router;


