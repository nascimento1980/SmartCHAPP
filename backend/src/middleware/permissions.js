const { RolePermission } = require('../models')
const { isManagerOrHigher, hasHierarchicalAccess } = require('./auth')

// Cache simples em memória por role para reduzir consultas
const rolePermissionsCache = new Map()
let lastCacheAt = 0
const CACHE_TTL_MS = 60 * 1000

async function getPermissionsForRole(role) {
  const now = Date.now()
  if (rolePermissionsCache.has(role) && (now - lastCacheAt) < CACHE_TTL_MS) {
    return rolePermissionsCache.get(role)
  }
  const row = await RolePermission.findOne({ where: { role } })
  const perms = row?.permissions || []
  rolePermissionsCache.set(role, perms)
  lastCacheAt = now
  return perms
}

// Função para obter permissões considerando hierarquia
async function getPermissionsWithHierarchy(userRole) {
  const userPerms = await getPermissionsForRole(userRole)
  
  // Se o usuário é gerencial ou superior, incluir permissões de roles inferiores
  if (isManagerOrHigher(userRole)) {
    const allPerms = new Set(userPerms)
    
    // Adicionar permissões de roles inferiores
    const roles = ['agent', 'sales', 'technician', 'manager', 'admin', 'master']
    for (const role of roles) {
      if (hasHierarchicalAccess(userRole, role)) {
        const rolePerms = await getPermissionsForRole(role)
        rolePerms.forEach(perm => allPerms.add(perm))
      }
    }
    
    return Array.from(allPerms)
  }
  
  return userPerms
}

function hasRequired(perms, anyOf = [], allOf = []) {
  const hasAny = anyOf.length === 0 || anyOf.some((p) => perms.includes(p))
  const hasAll = allOf.length === 0 || allOf.every((p) => perms.includes(p))
  return hasAny && hasAll
}

const requirePermission = ({ anyOf = [], allOf = [] } = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autenticado', code: 'NO_AUTH' })
      }
      
      // Obter permissões considerando hierarquia
      const perms = await getPermissionsWithHierarchy(req.user.role)
      
      if (!hasRequired(perms, anyOf, allOf)) {
        return res.status(403).json({ 
          error: 'Acesso negado', 
          code: 'INSUFFICIENT_PERMISSION',
          details: `Usuário: ${req.user.role}, Permissões requeridas: ${anyOf.join(', ')}`
        })
      }
      next()
    } catch (e) { next(e) }
  }
}

module.exports = { requirePermission, getPermissionsWithHierarchy }




