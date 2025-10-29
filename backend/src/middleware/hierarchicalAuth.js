const jwt = require('jsonwebtoken');

/**
 * Sistema Hierárquico de Permissões CH_SMART
 * 
 * Hierarquia (do maior para o menor):
 * 1. master    - Acesso total ao sistema
 * 2. admin     - Administração geral
 * 3. manager   - Gerenciamento operacional
 * 4. sales     - Vendas e relacionamento
 * 5. agent     - Operações básicas
 * 6. technician - Suporte técnico específico
 */

const ROLE_HIERARCHY = {
  master: 6,     // Nível mais alto
  admin: 5,      // Administração
  manager: 4,    // Gerenciamento
  sales: 3,      // Vendas
  agent: 2,      // Agente básico
  technician: 1  // Técnico
};

const ROLE_PERMISSIONS = {
  // Configurações da empresa
  'settings.company.read': ['agent', 'technician', 'sales', 'manager', 'admin', 'master'],
  'settings.company.write': ['manager', 'admin', 'master'],
  'settings.system.read': ['admin', 'master'],
  'settings.system.write': ['admin', 'master'],
  
  // CRM - Clientes e Leads
  'crm.leads.read': ['sales', 'manager', 'admin', 'master'],
  'crm.leads.write': ['sales', 'manager', 'admin', 'master'],
  'crm.leads.delete': ['manager', 'admin', 'master'],
  'crm.clients.read': ['sales', 'manager', 'admin', 'master'],
  'crm.clients.write': ['sales', 'manager', 'admin', 'master'],
  'crm.clients.delete': ['manager', 'admin', 'master'],
  'crm.import': ['manager', 'admin', 'master'],
  'crm.export': ['manager', 'admin', 'master'],
  
  // Visitas
  'visits.read': ['sales', 'manager', 'admin', 'master'],
  'visits.write': ['sales', 'manager', 'admin', 'master'],
  'visits.delete': ['manager', 'admin', 'master'],
  'visits.planning': ['sales', 'manager', 'admin', 'master'],
  'visits.execution': ['sales', 'manager', 'admin', 'master'],
  
  // Dashboard
  'dashboard.view': ['sales', 'manager', 'admin', 'master'],
  'dashboard.sales': ['sales', 'manager', 'admin', 'master'],
  'dashboard.performance': ['sales', 'manager', 'admin', 'master'],
  
  // Pipeline de Vendas
  'pipeline.read': ['sales', 'manager', 'admin', 'master'],
  'pipeline.write': ['sales', 'manager', 'admin', 'master'],
  'pipeline.delete': ['manager', 'admin', 'master'],
  'pipeline.assign': ['sales', 'manager', 'admin', 'master'],
  
  // Planejamento
  'planning.read': ['agent', 'technician', 'sales', 'manager', 'admin', 'master'],
  'planning.write': ['sales', 'manager', 'admin', 'master'],
  'planning.delete': ['manager', 'admin', 'master'],
  
  // Produtos e Propostas
  'products.read': ['sales', 'manager', 'admin', 'master'],
  'products.write': ['manager', 'admin', 'master'],
  'products.delete': ['admin', 'master'],
  'proposals.read': ['sales', 'manager', 'admin', 'master'],
  'proposals.write': ['sales', 'manager', 'admin', 'master'],
  'proposals.delete': ['manager', 'admin', 'master'],
  
  // Formulários
  'forms.read': ['sales', 'manager', 'admin', 'master'],
  'forms.write': ['sales', 'manager', 'admin', 'master'],
  'forms.submit': ['sales', 'manager', 'admin', 'master'],
  
  // Usuários
  'users.read': ['manager', 'admin', 'master'],
  'users.write': ['admin', 'master'],
  'users.delete': ['master'],
  
  // Relatórios
  'reports.basic': ['sales', 'manager', 'admin', 'master'],
  'reports.advanced': ['manager', 'admin', 'master'],
  'reports.financial': ['admin', 'master'],
  
  // Integrações
  'integrations.read': ['admin', 'master'],
  'integrations.write': ['master'],

  // Facilities - POPs
  'facilities.pops.read': ['technician', 'agent', 'sales', 'manager', 'admin', 'master'],
  'facilities.pops.write': ['manager', 'admin', 'master'],
  'facilities.pops.delete': ['admin', 'master'],
  'facilities.pops.approve': ['manager', 'admin', 'master'],
  
  // Facilities - Execuções
  'facilities.executions.read': ['technician', 'agent', 'sales', 'manager', 'admin', 'master'],
  'facilities.executions.write': ['technician', 'agent', 'sales', 'manager', 'admin', 'master'],
  'facilities.executions.validate': ['manager', 'admin', 'master'],
  'facilities.executions.delete': ['manager', 'admin', 'master'],
  
  // Facilities - Evidências
  'facilities.evidences.read': ['technician', 'agent', 'sales', 'manager', 'admin', 'master'],
  'facilities.evidences.upload': ['technician', 'agent', 'sales', 'manager', 'admin', 'master'],
  'facilities.evidences.delete': ['manager', 'admin', 'master'],
  
  // Facilities - Relatórios
  'facilities.reports.basic': ['technician', 'agent', 'sales', 'manager', 'admin', 'master'],
  'facilities.reports.advanced': ['manager', 'admin', 'master'],
  'facilities.reports.audit': ['admin', 'master'],
  
  // Menu access
  'menu.facilities': ['technician', 'agent', 'sales', 'manager', 'admin', 'master']
};

/**
 * Verifica se um role tem permissão hierárquica para acessar determinado recurso
 */
function hasHierarchicalPermission(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
}

/**
 * Verifica se um usuário tem uma permissão específica
 */
function hasSpecificPermission(userRole, permission) {
  const allowedRoles = ROLE_PERMISSIONS[permission] || [];
  return allowedRoles.includes(userRole);
}

/**
 * Middleware para verificar permissão hierárquica mínima
 */
function requireMinimumRole(minimumRole) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'UNAUTHENTICATED' 
      });
    }
    
    if (!hasHierarchicalPermission(userRole, minimumRole)) {
      return res.status(403).json({ 
        error: 'Acesso negado. Nível de permissão insuficiente.',
        code: 'INSUFFICIENT_ROLE_LEVEL',
        required: minimumRole,
        current: userRole,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
}

/**
 * Middleware para verificar permissão específica
 */
function requirePermission(permission) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'UNAUTHENTICATED' 
      });
    }
    
    if (!hasSpecificPermission(userRole, permission)) {
      return res.status(403).json({ 
        error: 'Acesso negado. Permissão específica insuficiente.',
        code: 'INSUFFICIENT_PERMISSION',
        required: permission,
        current: userRole,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
}

/**
 * Middleware dinâmico baseado no método HTTP
 */
function requireRoleForMethod(config) {
  return (req, res, next) => {
    const method = req.method.toLowerCase();
    const requiredRole = config[method];
    
    if (!requiredRole) {
      // Se não há configuração para o método, negar acesso
      return res.status(405).json({ 
        error: 'Método não permitido',
        code: 'METHOD_NOT_ALLOWED' 
      });
    }
    
    return requireMinimumRole(requiredRole)(req, res, next);
  };
}

/**
 * Middleware específico para configurações da empresa
 */
function requireSettingsAccess() {
  return requireRoleForMethod({
    get: 'agent',        // Qualquer usuário pode ler configurações básicas
    post: 'manager',     // Apenas manager+ pode criar
    put: 'manager',      // Apenas manager+ pode editar
    patch: 'manager',    // Apenas manager+ pode editar
    delete: 'admin'      // Apenas admin+ pode deletar
  });
}

/**
 * Middleware para acesso ao CRM (apenas dados próprios para sales)
 */
function requireCrmAccess() {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'UNAUTHENTICATED' 
      });
    }
    
    // Sales podem acessar apenas seus próprios dados
    if (userRole === 'sales') {
      // Garantir que o usuário só acesse dados relacionados a ele
      req.userRestriction = 'own_data_only';
    }
    
    next();
  };
}

/**
 * Middleware para acesso às visitas (apenas próprias para sales)
 */
function requireVisitsAccess() {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'UNAUTHENTICATED' 
      });
    }
    
    // Sales podem acessar apenas suas próprias visitas
    if (userRole === 'sales') {
      req.userRestriction = 'own_data_only';
    }
    
    next();
  };
}

/**
 * Middleware para dashboard (sales veem apenas seus dados)
 */
function requireDashboardAccess() {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'UNAUTHENTICATED' 
      });
    }
    
    // Sales veem apenas seu próprio dashboard
    if (userRole === 'sales') {
      req.userRestriction = 'own_data_only';
    }
    
    next();
  };
}

/**
 * Middleware para pipeline (sales veem apenas seus dados)
 */
function requirePipelineAccess() {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'UNAUTHENTICATED' 
      });
    }
    
    // Sales veem apenas seu próprio pipeline
    if (userRole === 'sales') {
      req.userRestriction = 'own_data_only';
    }
    
    next();
  };
}

/**
 * Utilitário para verificar se usuário pode acessar dados de outro usuário
 */
function canAccessUserData(currentUser, targetUserId) {
  // Usuário pode sempre acessar seus próprios dados
  if (currentUser.id === targetUserId) {
    return true;
  }
  
  // Hierarquia: manager+ pode acessar dados de níveis inferiores
  return hasHierarchicalPermission(currentUser.role, 'manager');
}

/**
 * Função específica para controle de acesso ao Facilities
 */
function requireFacilitiesAccess() {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'UNAUTHENTICATED' 
      });
    }
    
    // Verificar se tem acesso ao menu facilities
    if (!hasSpecificPermission(userRole, 'menu.facilities')) {
      return res.status(403).json({ 
        error: 'Acesso negado ao módulo Facilities',
        code: 'INSUFFICIENT_FACILITIES_ACCESS',
        required: 'technician+',
        current: userRole
      });
    }
    
    next();
  };
}

module.exports = {
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  hasHierarchicalPermission,
  hasSpecificPermission,
  requireMinimumRole,
  requirePermission,
  requireRoleForMethod,
  requireSettingsAccess,
  requireCrmAccess,
  requireVisitsAccess,
  requireDashboardAccess,
  requirePipelineAccess,
  canAccessUserData,
  requireFacilitiesAccess
};
