const { sequelize } = require('../config/database');

async function createPlanningTables() {
  try {
    console.log('🔄 Criando tabelas de planejamento de visitas...');
    
    // Criar tabela de planejamento semanal
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS visit_planning (
        id TEXT PRIMARY KEY,
        week_start_date TEXT NOT NULL,
        week_end_date TEXT NOT NULL,
        responsible_id TEXT NOT NULL,
        planning_type TEXT NOT NULL CHECK (planning_type IN ('comercial', 'tecnica')),
        status TEXT DEFAULT 'em_planejamento' CHECK (status IN ('em_planejamento', 'em_execucao', 'concluida', 'avaliada')),
        total_planned_visits INTEGER DEFAULT 0,
        total_completed_visits INTEGER DEFAULT 0,
        total_cancelled_visits INTEGER DEFAULT 0,
        planned_distance DECIMAL(8,2) DEFAULT 0,
        actual_distance DECIMAL(8,2) DEFAULT 0,
        planned_fuel DECIMAL(6,2) DEFAULT 0,
        actual_fuel DECIMAL(6,2) DEFAULT 0,
        planned_time DECIMAL(5,2) DEFAULT 0,
        actual_time DECIMAL(5,2) DEFAULT 0,
        planned_cost DECIMAL(10,2) DEFAULT 0,
        actual_cost DECIMAL(10,2) DEFAULT 0,
        efficiency_rate DECIMAL(5,2) DEFAULT 0,
        notes TEXT,
        evaluation_notes TEXT,
        next_week_planning TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (responsible_id) REFERENCES users(id)
      )
    `);
    console.log('✅ Tabela visit_planning criada');

    // Criar tabela de itens do planejamento
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS visit_planning_items (
        id TEXT PRIMARY KEY,
        planning_id TEXT NOT NULL,
        visit_id TEXT,
        planned_date TEXT NOT NULL,
        planned_time TEXT NOT NULL,
        client_name TEXT NOT NULL,
        client_address TEXT NOT NULL,
        visit_type TEXT NOT NULL CHECK (visit_type IN ('comercial', 'tecnica', 'suporte', 'manutencao', 'instalacao', 'treinamento')),
        priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'critica')),
        estimated_duration DECIMAL(4,1),
        planned_distance DECIMAL(6,2) DEFAULT 0,
        planned_fuel DECIMAL(5,2) DEFAULT 0,
        planned_cost DECIMAL(8,2) DEFAULT 0,
        status TEXT DEFAULT 'planejada' CHECK (status IN ('planejada', 'em_andamento', 'concluida', 'cancelada', 'reagendada')),
        actual_date TEXT,
        actual_time TEXT,
        actual_duration DECIMAL(4,1),
        actual_distance DECIMAL(6,2) DEFAULT 0,
        actual_fuel DECIMAL(5,2) DEFAULT 0,
        actual_cost DECIMAL(8,2) DEFAULT 0,
        notes TEXT,
        completion_notes TEXT,
        reschedule_reason TEXT,
        reschedule_notes TEXT,
        rescheduled_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (planning_id) REFERENCES visit_planning(id),
        FOREIGN KEY (visit_id) REFERENCES visits(id)
      )
    `);
    console.log('✅ Tabela visit_planning_items criada');

    // Criar índices para melhor performance
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_planning_week_dates ON visit_planning(week_start_date, week_end_date)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_planning_type ON visit_planning(planning_type)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_planning_status ON visit_planning(status)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_planning_responsible ON visit_planning(responsible_id)');
    
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_planning_items_planning ON visit_planning_items(planning_id)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_planning_items_date ON visit_planning_items(planned_date)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_planning_items_status ON visit_planning_items(status)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_planning_items_visit ON visit_planning_items(visit_id)');
    
    console.log('✅ Índices criados');

    console.log('✅ Tabelas de planejamento criadas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    process.exit(1);
  }
}

createPlanningTables();
