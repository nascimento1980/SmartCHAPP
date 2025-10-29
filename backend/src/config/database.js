const path = require('path');
const { Sequelize } = require('sequelize');

// Detecta ambiente e configurações básicas
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Usa DATABASE_URL (Postgres, por exemplo) se fornecido; caso contrário, SQLite local
const databaseUrl = process.env.DATABASE_URL || process.env.DB_URL || null;

let sequelize;

if (databaseUrl) {
  // Ex.: postgres://user:pass@host:5432/dbname
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: process.env.DB_LOG_SQL === '1' ? console.log : false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : undefined,
    },
    define: { timestamps: false },
  });
} else {
  const storage = process.env.DB_STORAGE || path.resolve(__dirname, '../../data/chsmart.db');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: process.env.DB_LOG_SQL === '1' ? console.log : false,
    define: { timestamps: false },
  });
}

// Pequenas migrações seguras para SQLite
const runSafeMigrations = async () => {
  if (sequelize.getDialect() !== 'sqlite') return;

  // users: colunas auxiliares
  const [usersCols] = await sequelize.query("PRAGMA table_info('users')");
  const hasEmployeeId = usersCols.some((r) => r.name === 'employee_id');
  if (!hasEmployeeId) {
    await sequelize.query("ALTER TABLE users ADD COLUMN employee_id UUID");
  }
  const hasMustChange = usersCols.some((r) => r.name === 'must_change_password');
  if (!hasMustChange) {
    await sequelize.query("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0");
  }
  const hasUsername = usersCols.some((r) => r.name === 'username');
  if (!hasUsername) {
    await sequelize.query("ALTER TABLE users ADD COLUMN username TEXT");
  }
  await sequelize.query("CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users(username)");
  const [usersNoUsername] = await sequelize.query("SELECT id, email FROM users WHERE (username IS NULL OR username = '') AND email IS NOT NULL");
  for (const row of usersNoUsername) {
    const email = row.email;
    const local = email.split('@')[0];
    let candidate = `${local}@ch_smart`;
    let counter = 1;
    // tentar até encontrar disponível
    // Nota: usar SELECT COUNT(*) para verificar disponibilidade
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const [c] = await sequelize.query("SELECT COUNT(1) as cnt FROM users WHERE username = ?", { replacements: [candidate] });
      const taken = Array.isArray(c) ? c[0]?.cnt : c?.cnt;
      if (!taken) break;
      counter += 1;
      candidate = `${local}${counter}@ch_smart`;
    }
    await sequelize.query("UPDATE users SET username = ? WHERE id = ?", { replacements: [candidate, row.id] });
  }
  // Criar tabelas simples se não existirem
  await sequelize.query("CREATE TABLE IF NOT EXISTS segments (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, code TEXT UNIQUE)");
  await sequelize.query("CREATE TABLE IF NOT EXISTS departments (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL)");
  await sequelize.query("CREATE TABLE IF NOT EXISTS role_profiles (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, role TEXT)");

  // employees: adicionar coluna uuid e index único
  const [empCols] = await sequelize.query("PRAGMA table_info('employees')");
  const hasEmpUuid = empCols.some((r) => r.name === 'uuid');
  if (!hasEmpUuid) {
    await sequelize.query("ALTER TABLE employees ADD COLUMN uuid UUID");
    // popular uuid gerando valores aleatórios estilo UUID v4
    await sequelize.query(`
      UPDATE employees
      SET uuid = lower(
        hex(randomblob(4)) || '-' ||
        hex(randomblob(2)) || '-' ||
        '4' || substr(hex(randomblob(2)), 2) || '-' ||
        substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' ||
        hex(randomblob(6))
      )
      WHERE uuid IS NULL
    `);
    await sequelize.query("CREATE UNIQUE INDEX IF NOT EXISTS employees_uuid_unique ON employees(uuid)");
  }

  // visits: garantir customer_contact_id e preencher a partir de client_id/lead_id
  const [visitCols] = await sequelize.query("PRAGMA table_info('visits')");
  const hasVisitCC = visitCols.some((r) => r.name === 'customer_contact_id');
  if (!hasVisitCC) {
    await sequelize.query("ALTER TABLE visits ADD COLUMN customer_contact_id UUID");
    await sequelize.query("UPDATE visits SET customer_contact_id = COALESCE(client_id, lead_id) WHERE customer_contact_id IS NULL");
    await sequelize.query("CREATE INDEX IF NOT EXISTS visits_customer_contact_id_idx ON visits(customer_contact_id)");
  }

  // customer_contacts: garantir segment_id e preencher via segments.name
  const [ccCols] = await sequelize.query("PRAGMA table_info('customer_contacts')");
  const hasSegmentId = ccCols.some((r) => r.name === 'segment_id');
  if (!hasSegmentId) {
    await sequelize.query("ALTER TABLE customer_contacts ADD COLUMN segment_id UUID");
    await sequelize.query(`
      UPDATE customer_contacts
      SET segment_id = (
        SELECT id FROM segments WHERE segments.name = customer_contacts.segment
      )
      WHERE segment_id IS NULL AND segment IS NOT NULL
    `);
    await sequelize.query("CREATE INDEX IF NOT EXISTS customer_contacts_segment_id_idx ON customer_contacts(segment_id)");
  }
};

// Otimizações SQLite
const applySqlitePragmas = async () => {
  if (sequelize.getDialect() !== 'sqlite') return;
  try {
    await sequelize.query("PRAGMA journal_mode=WAL");
    await sequelize.query("PRAGMA synchronous=NORMAL");
    await sequelize.query("PRAGMA temp_store=MEMORY");
  } catch (_) {}
};

// Conecta e sincroniza modelos
const connectDatabase = async () => {
  await sequelize.authenticate();
  await applySqlitePragmas();

  const isLight = (process.env.NODE_ENV === 'development' && process.env.DEV_LIGHT_MODE === '1');
  if (isLight) {
    console.log('🪶 DEV_LIGHT_MODE ativo: pulando sequelize.sync() e migrações seguras');
    return;
  }

  // Executar migrações seguras ANTES do sync para garantir colunas requeridas
  console.log('🧩 Executando migrações seguras antes do sync...');
  await runSafeMigrations();
  console.log('🔄 Prosseguindo com sincronização do Sequelize...');
  await sequelize.sync();
};

module.exports = {
  sequelize,
  connectDatabase,
};

