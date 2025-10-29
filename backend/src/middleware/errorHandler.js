const { ValidationError, DatabaseError } = require('sequelize');

// Middleware para capturar rotas não encontradas
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Rota não encontrada: ${req.method} ${req.path}`);
  error.status = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
};

// Middleware principal de tratamento de erros
const errorHandler = (error, req, res, next) => {
  let statusCode = error.status || 500;
  let message = error.message || 'Erro interno do servidor';
  let code = error.code || 'INTERNAL_ERROR';
  let details = null;

  // Log do erro para debugging
  if (process.env.NODE_ENV !== 'test') {
    console.error('❌ Erro capturado:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      user: req.user?.id || 'não autenticado',
      correlationId: req.correlationId || '-'
    });
  }

  // Tratar erros específicos do Sequelize
  if (error instanceof ValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Dados inválidos fornecidos';
    details = error.errors.map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
  } else if (error instanceof DatabaseError) {
    statusCode = 500;
    code = 'DATABASE_ERROR';
    message = 'Erro no banco de dados';
    
    // Não expor detalhes do banco em produção
    if (process.env.NODE_ENV !== 'production') {
      details = error.message;
    }
  }

  // Tratar erros de JWT
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Token de acesso inválido';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token de acesso expirado';
  }

  // Tratar erros de permissão
  if (error.code === 'INSUFFICIENT_PERMISSION') {
    statusCode = 403;
    message = 'Acesso negado. Permissão insuficiente.';
  }

  // Resposta padronizada de erro
  const errorResponse = {
    error: message,
    code,
    status: statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    correlationId: req.correlationId
  };

  // Adicionar detalhes apenas se existirem
  if (details) {
    errorResponse.details = details;
  }

  // Adicionar stack trace apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// Wrapper para async handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Middleware para validação de dados
const validateRequest = (schema) => {
  return (req, res, next) => {
    // Log para debug
    console.log('🔍 Validando dados:', {
      body: req.body,
      url: req.url,
      method: req.method
    });

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      console.log('❌ Erro de validação:', error.details);
      console.log('❌ Dados recebidos:', req.body);
      
      const validationError = new Error('Dados de entrada inválidos');
      validationError.status = 400;
      validationError.code = 'VALIDATION_ERROR';
      validationError.details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      return next(validationError);
    }

    console.log('✅ Dados validados com sucesso:', value);
    req.validatedBody = value;
    next();
  };
};

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  validateRequest
};