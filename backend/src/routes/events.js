const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Clientes SSE conectados
const clients = new Set();

function sendEvent(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// Broadcast público do módulo
function broadcast(event) {
  for (const res of clients) {
    try { sendEvent(res, event); } catch (_) {}
  }
}

// Rota SSE: /api/events?token=...
router.get('/', (req, res) => {
  try {
    const token = req.query.token || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) {
      res.status(401).json({ error: 'NO_TOKEN' });
      return;
    }
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      res.status(401).json({ error: 'INVALID_TOKEN' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    // Confirma conexão
    sendEvent(res, { type: 'connected', payload: { ts: Date.now() } });

    clients.add(res);
    req.on('close', () => { clients.delete(res); });

    // Keepalive
    const keepalive = setInterval(() => {
      try { res.write(': keepalive\n\n'); } catch (_) {}
    }, 30000);
    req.on('close', () => clearInterval(keepalive));
  } catch (err) {
    res.status(500).json({ error: 'SSE_FAILED', details: err.message });
  }
});

module.exports = { router, broadcast };



