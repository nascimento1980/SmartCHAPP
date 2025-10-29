const { v4: uuidv4 } = require('uuid');

// Middleware para anexar um X-Correlation-Id em cada requisição
module.exports = function correlationIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-correlation-id'] || req.headers['x-request-id'];
  const correlationId = typeof incomingId === 'string' && incomingId.trim().length > 0
    ? incomingId.trim()
    : uuidv4();

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
};



