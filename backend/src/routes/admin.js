const express = require('express');
const router = express.Router();
const { cache } = require('../utils/cache');
const auth = require('../middleware/auth');

// Limpar cache (dashboard/planning/analytics). Em desenvolvimento, permite bypass com header X-Admin-Bypass: 1
router.post('/cache/clear', (req, res, next) => {
  const devBypass = (process.env.NODE_ENV === 'development') && req.header('X-Admin-Bypass') === '1';
  if (!devBypass) {
    return auth(req, res, () => {
      if (!['admin', 'master', 'manager'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Sem permissão' });
      }
      clearCacheHandler(req, res);
    });
  }
  clearCacheHandler(req, res);
});

function clearCacheHandler(req, res) {
  try {
    const before = cache.getStats();
    const { pattern } = req.body || {};
    cache.clear(pattern || null); // se não passar pattern, limpa tudo
    const after = cache.getStats();
    return res.json({ message: 'Cache limpo', pattern: pattern || 'ALL', before, after });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao limpar cache', details: err.message });
  }
}

module.exports = router;


