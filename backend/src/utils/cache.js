// Sistema de cache simples para melhorar performance
class SimpleCache {
  constructor(defaultTTL = 300000) { // 5 minutos padrão
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  // Gerar chave única para a consulta
  generateKey(prefix, params) {
    const sortedParams = Object.keys(params || {})
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  // Armazenar no cache
  set(key, data, ttl = null) {
    const expireTime = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, {
      data,
      expires: expireTime
    });
  }

  // Recuperar do cache
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Verificar se expirou
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  // Remover item do cache
  delete(key) {
    return this.cache.delete(key);
  }

  // Limpar cache por padrão
  clear(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // Limpar apenas chaves que combinam com o padrão
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Estatísticas do cache
  getStats() {
    const now = Date.now();
    let activeItems = 0;
    let expiredItems = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        expiredItems++;
      } else {
        activeItems++;
      }
    }

    return {
      totalItems: this.cache.size,
      activeItems,
      expiredItems,
      memoryUsage: this.cache.size * 100 // Estimativa simplificada
    };
  }

  // Limpar itens expirados
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

// Instância singleton do cache
const cache = new SimpleCache();

// Middleware para cache automático
const cacheMiddleware = (prefix, ttl = 300000) => {
  return (req, res, next) => {
    // Só aplicar cache em requests GET
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = cache.generateKey(prefix, {
      ...req.query,
      userId: req.user?.id,
      userRole: req.user?.role
    });

    // Tentar recuperar do cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Interceptar res.json para armazenar no cache
    const originalJson = res.json;
    res.json = function(data) {
      // Só cachear respostas de sucesso
      if (res.statusCode === 200) {
        cache.set(cacheKey, data, ttl);
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// Função para invalidar cache relacionado a uma entidade
const invalidateCache = (patterns) => {
  if (!Array.isArray(patterns)) {
    patterns = [patterns];
  }

  patterns.forEach(pattern => {
    cache.clear(pattern);
  });
};

module.exports = {
  cache,
  cacheMiddleware,
  invalidateCache,
  SimpleCache
};


