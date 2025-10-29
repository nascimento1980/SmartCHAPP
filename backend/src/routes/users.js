const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User } = require('../models');
const { requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/users - Listar todos os usuários
router.get('/', requireRole(['admin', 'manager', 'master']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, role, is_active } = req.query;
  
  const where = {};
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { username: { [Op.like]: `%${search}%` } }
    ];
  }
  if (role) where.role = role;
  if (is_active !== undefined) where.is_active = is_active === 'true';

  const offset = (page - 1) * limit;
  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: ['id', 'username', 'name', 'email', 'role', 'is_active', 'department', 'phone', 'last_login_at'],
    order: [['name', 'ASC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    users: rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  });
}));

// GET /api/users/available - Listar usuários disponíveis para convite (acesso público para usuários autenticados)
router.get('/available', asyncHandler(async (req, res) => {
  const { search, role, exclude_user_id } = req.query;
  
  const where = { is_active: true };
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } }
    ];
  }
  if (role) where.role = role;
  if (exclude_user_id) where.id = { [Op.ne]: exclude_user_id };

  const users = await User.findAll({
    where,
    attributes: ['id', 'username', 'name', 'email', 'role', 'department'],
    order: [['name', 'ASC']]
  });

  res.json({
    users: users,
    total: users.length
  });
}));

// POST /api/users - Criar novo usuário
router.post('/', requireRole(['admin', 'manager', 'master']), asyncHandler(async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    username: Joi.string().optional(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'manager', 'sales', 'technician', 'agent', 'master').required(),
    department: Joi.string().optional(),
    phone: Joi.string().optional(),
    is_active: Joi.boolean().default(true)
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      error: 'Dados inválidos', 
      details: error.details.map(d => d.message) 
    });
  }

  // Verificar se email já existe
  const existingUser = await User.findOne({ where: { email: value.email } });
  if (existingUser) {
    return res.status(400).json({ error: 'Email já está em uso' });
  }

  // Hash da senha
  const hashedPassword = await bcrypt.hash(value.password, 12);
  
  // Criar usuário
  const user = await User.create({
    ...value,
    password: hashedPassword,
    username: value.username || value.email,
    must_change_password: false
  });

  // Retornar sem a senha
  const userResponse = user.toJSON();
  delete userResponse.password;

  res.status(201).json({
    message: 'Usuário criado com sucesso',
    user: userResponse
  });
}));

// PUT /api/users/:id - Atualizar usuário
router.put('/:id', requireRole(['admin', 'manager', 'master']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
      const schema = Joi.object({
      name: Joi.string().optional(),
      email: Joi.string().email().optional(),
      username: Joi.string().optional(),
      role: Joi.string().valid('admin', 'manager', 'sales', 'technician', 'agent', 'master').optional(),
      department: Joi.string().optional(),
      phone: Joi.string().optional(),
      is_active: Joi.boolean().optional(),
      password: Joi.string().min(6).optional().allow('')
    });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      error: 'Dados inválidos', 
      details: error.details.map(d => d.message) 
    });
  }

  const user = await User.findByPk(id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  // Se está atualizando email, verificar se não existe outro usuário com esse email
  if (value.email && value.email !== user.email) {
    const existingUser = await User.findOne({ where: { email: value.email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email já está em uso' });
    }
  }

        // Se está atualizando senha, fazer hash
      if (value.password && value.password.trim() !== '') {
        value.password = await bcrypt.hash(value.password, 12);
      } else {
        // Se senha estiver vazia, remover do objeto para não sobrescrever
        delete value.password;
      }

  await user.update(value);

  // Retornar sem a senha
  const userResponse = user.toJSON();
  delete userResponse.password;

  res.json({
    message: 'Usuário atualizado com sucesso',
    user: userResponse
  });
}));

// DELETE /api/users/:id - Desativar usuário (soft delete)
router.delete('/:id', requireRole(['admin', 'master']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  // Não permitir desativar o próprio usuário
  if (user.id === req.user.id) {
    return res.status(400).json({ error: 'Você não pode desativar sua própria conta' });
  }

  await user.update({ is_active: false });

  res.json({
    message: 'Usuário desativado com sucesso'
  });
}));

// PUT /api/users/:id/activate - Reativar usuário
router.put('/:id/activate', requireRole(['admin', 'master']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  await user.update({ is_active: true });

  res.json({
    message: 'Usuário reativado com sucesso'
  });
}));

// Atualizar papel do usuário por email (rota legacy)
router.put('/role', requireRole('master'), async (req, res, next) => {
  try {
    const schema = Joi.object({ email: Joi.string().email().required(), role: Joi.string().valid('admin','manager','sales','technician').required() })
    const { error, value } = schema.validate(req.body)
    if (error) return res.status(400).json({ error: 'Dados inválidos' })
    const user = await User.findOne({ where: { email: value.email } })
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    await user.update({ role: value.role })
    res.json({ success: true, user: user.toJSON() })
  } catch (e) { next(e) }
})

module.exports = router;