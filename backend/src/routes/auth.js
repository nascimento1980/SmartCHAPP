const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { User } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const authMiddleware = require('../middleware/auth');
const SessionService = require('../services/SessionService');

const router = express.Router();

// Schema de validação para login
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Schema de validação para primeiro acesso
const firstAccessSchema = Joi.object({
  code: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

// POST /api/auth/login - Autenticação de usuário
router.post('/login', asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      error: 'Dados inválidos', 
      details: error.details.map(d => d.message) 
    });
  }

  const { email, password } = value;

  // Buscar usuário por email
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // Verificar se usuário está ativo
  if (!user.is_active) {
    return res.status(401).json({ error: 'Usuário inativo' });
  }

  // Verificar senha
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // Atualizar último login
  await user.update({ last_login_at: new Date() });

  // Gerar token JWT
  const token = jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  // Criar sessão persistida
  try {
    await SessionService.createSession(user.id, token, req, 'password');
  } catch (e) {
    // Não bloquear login em caso de falha de persistência de sessão, apenas logar
    console.error('Falha ao registrar sessão de login:', e?.message);
  }

  // Retornar dados do usuário (sem senha)
  const userResponse = user.toJSON();
  delete userResponse.password;

  res.json({
    message: 'Login realizado com sucesso',
    token,
    user: userResponse,
    expires_in: process.env.JWT_EXPIRES_IN || '1h'
  });
}));

// GET /api/auth/me - Obter dados do usuário logado
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  // O middleware auth já colocou o usuário completo em req.user
  const user = req.user;

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  // Retornar apenas os campos necessários
  res.json({ 
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone,
      is_active: user.is_active,
      last_login_at: user.last_login_at
    }
  });
}));

// POST /api/auth/refresh-token - Renovar token JWT (aceita token expirado)
router.post('/refresh-token', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido', code: 'NO_TOKEN' });
  }

  let decoded;
  try {
    // Decodificar token mesmo expirado para extrair userId/email/role
    decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido', code: 'INVALID_TOKEN' });
  }

  const userId = decoded?.userId;
  if (!userId) {
    return res.status(400).json({ error: 'Payload do token inválido', code: 'INVALID_PAYLOAD' });
  }

  const user = await User.findByPk(userId, {
    attributes: ['id', 'username', 'name', 'email', 'role', 'department', 'phone', 'is_active']
  });

  if (!user || user.is_active === false) {
    return res.status(401).json({ error: 'Usuário inválido ou inativo', code: 'INVALID_USER' });
  }

  const newToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  res.json({
    message: 'Token renovado com sucesso',
    token: newToken,
    user: user.toJSON(),
    expires_in: process.env.JWT_EXPIRES_IN || '1h'
  });
}));

// POST /api/auth/first-access - Primeiro acesso do usuário
router.post('/first-access', asyncHandler(async (req, res) => {
  const { error, value } = firstAccessSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      error: 'Dados inválidos', 
      details: error.details.map(d => d.message) 
    });
  }

  const { code, newPassword } = value;

  // Buscar usuário pelo código de primeiro acesso
  const user = await User.findOne({ 
    where: { 
      first_access_code: code,
      must_change_password: true
    } 
  });

  if (!user) {
    return res.status(400).json({ error: 'Código inválido ou já utilizado' });
  }

  // Hash da nova senha
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Atualizar usuário
  await user.update({
    password: hashedPassword,
    must_change_password: false,
    first_access_code: null,
    is_active: true
  });

  res.json({
    message: 'Senha definida com sucesso',
    success: true
  });
}));

// POST /api/auth/logout - Encerra a sessão atual
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  try {
    if (req.token) {
      await SessionService.endSession(req.token, 'logout');
    }
  } catch (e) {
    console.error('Falha ao encerrar sessão no logout:', e?.message);
    // Não bloquear a resposta de logout
  }

  res.json({ message: 'Logout realizado com sucesso' });
}));

module.exports = router;