const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDatabase } = require('./config/database');
const fs = require('fs');
const path = require('path');
const correlationId = require('./middleware/correlationId');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');
const { requireRole } = require('./middleware/auth');

// Definir associações ANTES de importar as rotas
const { defineAssociations } = require('./models');
if (!global.__ASSOCS_DEFINED__) {
  console.log('🔄 Definindo associações dos modelos...');
  defineAssociations();
  global.__ASSOCS_DEFINED__ = true;
  console.log('✅ Associações definidas com sucesso!');
}

// Importar rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
// Rotas antigas removidas - usando customer-contacts unificado
// const leadsRoutes = require('./routes/leads');
// const clientsRoutes = require('./routes/clients');
const productsRoutes = require('./routes/products');
const proposalsRoutes = require('./routes/proposals');
const visitsRoutes = require('./routes/visits');
const fleetRoutes = require('./routes/fleet');
const analyticsRoutes = require('./routes/analytics');
const formsRoutes = require('./routes/forms');
const formsExportRoutes = require('./routes/forms-export');
const uploadRoutes = require('./routes/upload');
const visitPlanningRoutes = require('./routes/visitPlanning');
const planningCollaborationRoutes = require('./routes/planningCollaboration');
const settingsRoutes = require('./routes/settings');
const { router: eventsRouter } = require('./routes/events');
const customerContactsRoutes = require('./routes/customer-contacts');
const employeesRoutes = require('./routes/employees');
const integrationsRoutes = require('./routes/integrations');
const permissionsRoutes = require('./routes/permissions');
const flywheelRoutes = require('./routes/flywheel');
const autoInvitesRoutes = require('./routes/autoInvites');
const sessionsRoutes = require('./routes/sessions');
const facilitiesRoutes = require('./routes/facilities');
const externalDataRoutes = require('./routes/external-data');
const geolocationRoutes = require('./routes/geolocation');
const adminRoutes = require('./routes/admin');

const app = express();

// Configuração de segurança
app.use(helmet());

// Configuração de CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://chealth.com.br', 'https://crm.chealth.com.br']
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-Id', 'X-Request-Duration'],
  exposedHeaders: ['X-Correlation-Id', 'X-Request-Duration']
}));

// Correlation Id
app.use(correlationId);

// Expor X-Correlation-Id em todas as respostas
app.use((req, res, next) => {
  if (req.correlationId) {
    res.setHeader('X-Correlation-Id', req.correlationId);
  }
  next();
});

// Medir duração e registrar logs estruturados
app.use((req, res, next) => {
  const startHr = process.hrtime.bigint ? process.hrtime.bigint() : process.hrtime();
  const originalEnd = res.end;

  res.end = function(chunk, encoding, cb) {
    let durationMs;
    if (typeof process.hrtime.bigint === 'function') {
      const diff = Number(process.hrtime.bigint() - startHr);
      durationMs = diff / 1e6;
    } else {
      const diff = process.hrtime(startHr);
      durationMs = (diff[0] * 1000) + (diff[1] / 1e6);
    }
    res.locals.requestDurationMs = durationMs;
    try {
      res.setHeader('X-Request-Duration', durationMs.toFixed(1));
    } catch (_) {}
    return originalEnd.call(this, chunk, encoding, cb);
  };

  res.on('finish', () => {
    const log = {
      level: 'info',
      type: 'access',
      timestamp: new Date().toISOString(),
      cid: req.correlationId || '-',
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration_ms: typeof res.locals.requestDurationMs === 'number' ? Number(res.locals.requestDurationMs.toFixed(1)) : null,
      ip: req.ip,
      user_id: req.user?.id || null,
      referer: req.headers['referer'] || req.headers['referrer'] || null,
      user_agent: req.headers['user-agent'] || null,
      content_length: res.getHeader('content-length') || null
    };
    try {
      console.log(JSON.stringify(log));
    } catch (e) {
      console.log('access_log_fallback', log);
    }
  });

  next();
});

// Middleware de logging com correlationId (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  morgan.token('correlationId', (req) => req.correlationId || '-');
  app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" cid=:correlationId'));
}

// Compressão
app.use(compression());

// Rate limiting - Desabilitado em desenvolvimento
if (process.env.NODE_ENV !== 'development') {
  const limiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutos
    max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
    message: {
      error: 'Muitas tentativas de acesso. Tente novamente em alguns minutos.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    skip: (req) => {
      // Pular rate limiting para health check
      return req.path === '/health';
    }
  });
  app.use('/api/', limiter);
} else {
  console.log('🔓 Rate limiting desabilitado em desenvolvimento');
}

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static for uploaded files (dev)
// servir diretório público de uploads (backend/public/uploads)
app.use('/static/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

// Health check
app.get('/health', (req, res) => {
  if (req.correlationId) {
    res.setHeader('X-Correlation-Id', req.correlationId);
  }
  res.json({
    status: 'OK',
    message: 'CH_SMART API funcionando!',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    company: process.env.COMPANY_NAME || 'Clean & Health Soluções'
  });
});

// Alias v1 para health
app.get('/api/v1/health', (req, res) => {
  if (req.correlationId) {
    res.setHeader('X-Correlation-Id', req.correlationId);
  }
  res.json({
    status: 'OK',
    message: 'CH_SMART API v1 funcionando!',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    company: process.env.COMPANY_NAME || 'Clean & Health Soluções'
  });
});

// Rota raiz - redirecionar para health check
app.get('/', (req, res) => {
  res.json({
    message: 'CH_SMART API - Backend funcionando!',
    status: 'OK',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/*'
    },
    documentation: 'Acesse /health para verificar o status da API'
  });
});

// Função para validar middlewares
const validateMiddleware = (middleware) => {
  if (typeof middleware !== 'function') {
    throw new Error(`Middleware inválido: ${middleware}`);
  }
};

// Validar todas as rotas antes de usá-las
validateMiddleware(authRoutes);
validateMiddleware(userRoutes);
validateMiddleware(productsRoutes);
validateMiddleware(proposalsRoutes);
validateMiddleware(visitsRoutes);
validateMiddleware(fleetRoutes);
validateMiddleware(analyticsRoutes);
validateMiddleware(formsRoutes);
validateMiddleware(uploadRoutes);
validateMiddleware(visitPlanningRoutes);
validateMiddleware(planningCollaborationRoutes);
validateMiddleware(settingsRoutes);
validateMiddleware(customerContactsRoutes);
validateMiddleware(employeesRoutes);
validateMiddleware(integrationsRoutes);
validateMiddleware(permissionsRoutes);
validateMiddleware(flywheelRoutes);
validateMiddleware(sessionsRoutes);

// Importar middleware hierárquico
const { 
  requireSettingsAccess, 
  requireMinimumRole, 
  requireRoleForMethod,
  requireCrmAccess,
  requireVisitsAccess,
  requireDashboardAccess,
  requirePipelineAccess
} = require('./middleware/hierarchicalAuth');

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/facilities', facilitiesRoutes);

// Rota de usuários com middleware customizado que permite acesso livre à rota /available
app.use('/api/users', authMiddleware, (req, res, next) => {
  const method = req.method.toLowerCase();
  
  // Rota /available é acessível para todos os usuários autenticados
  if (req.path === '/available' && method === 'get') {
    return next();
  }
  
  // Outras rotas seguem as regras hierárquicas
  return requireRoleForMethod({
    get: 'sales',
    post: 'admin',
    put: 'admin', 
    patch: 'admin',
    delete: 'master'
  })(req, res, next);
}, userRoutes);

// Rotas antigas removidas - usando customer-contacts unificado
// app.use('/api/leads', authMiddleware, leadsRoutes);
// app.use('/api/clients', authMiddleware, clientsRoutes);
app.use('/api/products', authMiddleware, requireCrmAccess(), productsRoutes);
app.use('/api/proposals', authMiddleware, requirePipelineAccess(), proposalsRoutes);
app.use('/api/visits', authMiddleware, requireVisitsAccess(), visitsRoutes);
app.use('/api/fleet', authMiddleware, fleetRoutes);
app.use('/api/analytics', authMiddleware, requireDashboardAccess(), analyticsRoutes);
app.use('/api/forms', authMiddleware, requireVisitsAccess(), formsRoutes);
app.use('/api/forms-export', authMiddleware, requireVisitsAccess(), formsExportRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);
app.use('/api/visit-planning', authMiddleware, requireVisitsAccess(), visitPlanningRoutes);
app.use('/api/planning-collaboration', authMiddleware, requireVisitsAccess(), planningCollaborationRoutes);
// Sistema hierárquico para settings
// Rota pública do logo (antes dos middlewares de permissão)
app.get('/api/settings/company/logo', authMiddleware, async (req, res) => {
  try {
    const { CompanySetting } = require('./models');
    
    const [mimeSetting, dataSetting] = await Promise.all([
      CompanySetting.findOne({ where: { setting_key: 'logoMime' } }),
      CompanySetting.findOne({ where: { setting_key: 'logoData' } })
    ]);
    
    if (!mimeSetting || !dataSetting || !dataSetting.setting_value) {
      const defaultLogo = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
        <rect width="120" height="40" fill="#1976d2" rx="4"/>
        <text x="60" y="25" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">CH SMART</text>
      </svg>`;
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(defaultLogo);
    }
    
    res.setHeader('Content-Type', mimeSetting.setting_value || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.end(dataSetting.setting_value);
  } catch (error) {
    console.error('Erro ao buscar logo:', error);
    
    const defaultLogo = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
      <rect width="120" height="40" fill="#1976d2" rx="4"/>
      <text x="60" y="25" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">CH SMART</text>
    </svg>`;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(defaultLogo);
  }
});

app.use('/api/settings', authMiddleware, requireSettingsAccess(), settingsRoutes);
app.use('/api/events', eventsRouter);
app.use('/api/customer-contacts', authMiddleware, requireCrmAccess(), customerContactsRoutes);
app.use('/api/employees', authMiddleware, requireMinimumRole('sales'), employeesRoutes);
app.use('/api/integrations', authMiddleware, requireMinimumRole('admin'), integrationsRoutes);
app.use('/api/permissions', authMiddleware, permissionsRoutes);
app.use('/api/flywheel', authMiddleware, flywheelRoutes);
app.use('/api/auto-invites', authMiddleware, autoInvitesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/external-data', authMiddleware, externalDataRoutes);
app.use('/api/geolocation', authMiddleware, geolocationRoutes);
app.use('/api/admin', adminRoutes);

// Aliases v1 (compatibilidade com clientes antigos)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/facilities', facilitiesRoutes);
app.use('/api/v1/users', authMiddleware, (req, res, next) => {
  const method = req.method.toLowerCase();
  if (req.path === '/available' && method === 'get') {
    return next();
  }
  return requireRoleForMethod({
    get: 'sales',
    post: 'admin',
    put: 'admin',
    patch: 'admin',
    delete: 'master'
  })(req, res, next);
}, userRoutes);
app.use('/api/v1/products', authMiddleware, requireCrmAccess(), productsRoutes);
app.use('/api/v1/proposals', authMiddleware, requirePipelineAccess(), proposalsRoutes);
app.use('/api/v1/visits', authMiddleware, requireVisitsAccess(), visitsRoutes);
app.use('/api/v1/fleet', authMiddleware, fleetRoutes);
app.use('/api/v1/analytics', authMiddleware, requireDashboardAccess(), analyticsRoutes);
app.use('/api/v1/forms', authMiddleware, requireVisitsAccess(), formsRoutes);
app.use('/api/v1/forms-export', authMiddleware, requireVisitsAccess(), formsExportRoutes);
app.use('/api/v1/upload', authMiddleware, uploadRoutes);
app.use('/api/v1/visit-planning', authMiddleware, requireVisitsAccess(), visitPlanningRoutes);
app.use('/api/v1/planning-collaboration', authMiddleware, requireVisitsAccess(), planningCollaborationRoutes);
app.use('/api/v1/settings', authMiddleware, requireSettingsAccess(), settingsRoutes);
app.use('/api/v1/customer-contacts', authMiddleware, requireCrmAccess(), customerContactsRoutes);
app.use('/api/v1/employees', authMiddleware, requireMinimumRole('sales'), employeesRoutes);
app.use('/api/v1/integrations', authMiddleware, requireMinimumRole('admin'), integrationsRoutes);
app.use('/api/v1/permissions', authMiddleware, permissionsRoutes);
app.use('/api/v1/flywheel', authMiddleware, flywheelRoutes);
app.use('/api/v1/auto-invites', authMiddleware, autoInvitesRoutes);
app.use('/api/v1/sessions', sessionsRoutes);
app.use('/api/v1/external-data', authMiddleware, externalDataRoutes);
app.use('/api/v1/geolocation', authMiddleware, geolocationRoutes);
app.use('/api/v1/admin', adminRoutes);

// Middleware de tratamento de erros
app.use(notFoundHandler);
app.use(errorHandler);

// Conectar ao banco de dados e iniciar servidor
const PORT = process.env.PORT || 3001; // Backend na porta 3001
const HOST = process.env.HOST || 'localhost';

const startServer = async () => {
  try {
    // Conectar ao banco de dados
    await connectDatabase();
    console.log('✅ Conectado ao banco de dados');

    // Inicializar serviços automáticos (pular em modo leve de desenvolvimento)
    const isLight = process.env.NODE_ENV === 'development' && process.env.DEV_LIGHT_MODE === '1';
    if (isLight) {
      console.log('🪶 Modo leve (DEV_LIGHT_MODE=1): pulando serviços automáticos pesados.');
    } else {
      console.log('🔔 Inicializando serviços automáticos...');
      const AutoInviteService = require('./services/AutoInviteService');
      console.log('✅ Serviço de convites automáticos inicializado');
      const SessionCleanupJob = require('./jobs/SessionCleanupJob');
      SessionCleanupJob.start();
      console.log('✅ Job de limpeza de sessões inicializado');
    }

    // Trava de PID para evitar múltiplas instâncias
    const tmpDir = path.join(__dirname, '..', 'tmp');
    const pidFile = path.join(tmpDir, 'server.pid');
    try {
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      if (fs.existsSync(pidFile)) {
        const existingPid = Number(fs.readFileSync(pidFile, 'utf8').trim());
        if (!Number.isNaN(existingPid)) {
          try {
            process.kill(existingPid, 0);
            console.error(JSON.stringify({ level: 'error', type: 'startup', code: 'ALREADY_RUNNING', message: 'Servidor já em execução', pid: existingPid }));
            process.exit(1);
          } catch (_) {
            // PID órfão, seguir e sobrescrever
          }
        }
      }
      fs.writeFileSync(pidFile, String(process.pid));
      const cleanupPid = () => { try { fs.unlinkSync(pidFile); } catch (_) {} };
      process.on('exit', cleanupPid);
      process.on('SIGTERM', () => { cleanupPid(); process.exit(0); });
      process.on('SIGINT', () => { cleanupPid(); process.exit(0); });
    } catch (e) {
      console.error(JSON.stringify({ level: 'error', type: 'startup', code: 'PID_LOCK_FAILED', message: e.message }));
    }

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      console.log(`🚀 CH_SMART API rodando em http://${HOST}:${PORT}`);
      console.log(`🏥 ${process.env.COMPANY_NAME || 'Clean & Health Soluções'}`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });

    // Tratar erro de porta em uso
    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        const payload = { level: 'error', type: 'startup', code: 'EADDRINUSE', message: `Porta ${PORT} já está em uso`, port: PORT };
        try { console.error(JSON.stringify(payload)); } catch (_) { console.error('EADDRINUSE', payload); }
        process.exit(1);
      }
      throw err;
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM. Encerrando servidor graciosamente...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT. Encerrando servidor graciosamente...');
  process.exit(0);
});

// Falhas globais: log estruturado + saída assertiva (evita travas silenciosas)
process.on('unhandledRejection', (reason) => {
  const payload = {
    level: 'error',
    type: 'fatal',
    code: 'UNHANDLED_REJECTION',
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    timestamp: new Date().toISOString(),
  };
  try { console.error(JSON.stringify(payload)); } catch (_) { console.error('UNHANDLED_REJECTION', payload); }
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  const payload = {
    level: 'error',
    type: 'fatal',
    code: 'UNCAUGHT_EXCEPTION',
    message: err?.message,
    stack: err?.stack,
    timestamp: new Date().toISOString(),
  };
  try { console.error(JSON.stringify(payload)); } catch (_) { console.error('UNCAUGHT_EXCEPTION', payload); }
  process.exit(1);
});

if (require.main === module) {
  startServer();
}

module.exports = app;