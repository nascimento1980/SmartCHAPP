const jwt = require('jsonwebtoken');
const { User } = require('../models');
const SessionService = require('../services/SessionService');

// Definição da hierarquia de roles (do menor para o maior)
const ROLE_HIERARCHY = {
  'agent': 1,
  'sales': 2,
  'technician': 2,
  'manager': 3,
  'admin': 4,
  'master': 5
};

// Função para verificar se um usuário tem acesso a um recurso baseado na hierarquia
const hasHierarchicalAccess = (userRole, requiredRole) => {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  
  // Usuários de nível gerencial ou superior podem acessar recursos de níveis inferiores
  return userLevel >= requiredLevel;
};

// Função para verificar se um usuário é gerencial ou superior
const isManagerOrHigher = (role) => {
  return ['manager', 'admin', 'master'].includes(role);
};

// Função para verificar se um usuário pode acessar recursos de outros usuários
const canAccessUserResource = (currentUser, targetUserId) => {
  // Se for o próprio usuário, sempre pode acessar
  if (currentUser.id === targetUserId) {
    return true;
  }
  
  // Se for gerencial ou superior, pode acessar recursos de usuários de nível inferior
  if (isManagerOrHigher(currentUser.role)) {
    return true;
  }
  
  return false;
};

// Middleware principal de autenticação via Bearer token
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido', code: 'NO_TOKEN' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Usuário inválido', code: 'INVALID_USER' });
    }

    req.user = user;
    req.token = token; // Armazenar token para uso posterior
    
    // Atualizar atividade da sessão de forma assíncrona (não bloquear a requisição)
    SessionService.updateSessionActivity(token).catch(err => {
      console.warn('⚠️ Falha ao atualizar atividade da sessão:', err.message);
    });
    
    next();
  } catch (error) {
    next(error);
  }
};

// Guard para roles mínimas com verificação hierárquica
const requireRole = (roles) => (req, res, next) => {
  if (!req.user) {
    const err = new Error('Não autenticado');
    err.status = 401;
    err.code = 'NO_AUTH';
    return next(err);
  }
  
  // Verificar se o usuário tem um dos roles requeridos
  const hasDirectRole = roles.includes(req.user.role);
  
  // Se não tem role direto, verificar se é gerencial e pode acessar por hierarquia
  if (!hasDirectRole && isManagerOrHigher(req.user.role)) {
    // Usuários gerenciais podem acessar recursos de níveis inferiores
    const canAccessByHierarchy = roles.some(role => hasHierarchicalAccess(req.user.role, role));
    if (canAccessByHierarchy) {
      return next();
    }
  }
  
  if (!hasDirectRole) {
    const err = new Error('Acesso negado. Permissão insuficiente.');
    err.status = 403;
    err.code = 'INSUFFICIENT_PERMISSION';
    return next(err);
  }
  
  next();
};

// Middleware para verificar se o usuário pode acessar recursos de outro usuário
const requireUserAccess = (targetUserIdField = 'id') => (req, res, next) => {
  if (!req.user) {
    const err = new Error('Não autenticado');
    err.status = 401;
    err.code = 'NO_AUTH';
    return next(err);
  }
  
  const targetUserId = req.params[targetUserIdField] || req.body[targetUserIdField];
  
  if (!canAccessUserResource(req.user, targetUserId)) {
    const err = new Error('Acesso negado. Não pode acessar recursos deste usuário.');
    err.status = 403;
    err.code = 'INSUFFICIENT_PERMISSION';
    return next(err);
  }
  
  next();
};

// Middleware para verificar se o usuário pode acessar recursos de sua equipe
const requireTeamAccess = () => (req, res, next) => {
  if (!req.user) {
    const err = new Error('Não autenticado');
    err.status = 401;
    err.code = 'NO_AUTH';
    return next(err);
  }
  
  // Usuários gerenciais sempre podem acessar recursos da equipe
  if (isManagerOrHigher(req.user.role)) {
    return next();
  }
  
  // Outros usuários só podem acessar seus próprios recursos
  // (implementação específica depende da estrutura da equipe)
  next();
};

const requireManager = requireRole(['admin', 'manager']);

module.exports = auth;
module.exports.requireRole = requireRole;
module.exports.requireManager = requireManager;
module.exports.hasHierarchicalAccess = hasHierarchicalAccess;
module.exports.isManagerOrHigher = isManagerOrHigher;
module.exports.canAccessUserResource = canAccessUserResource;
module.exports.requireUserAccess = requireUserAccess;
module.exports.requireTeamAccess = requireTeamAccess;
