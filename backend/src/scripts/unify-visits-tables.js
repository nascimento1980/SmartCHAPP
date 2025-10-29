const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/chsmart.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Iniciando unificação das tabelas de visitas...');

// 1. Criar nova estrutura da tabela visits unificada
const createUnifiedVisitsTable = () => {
  return new Promise((resolve, reject) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS visits_new (
        id UUID PRIMARY KEY,
        title VARCHAR(255),
        type TEXT DEFAULT 'comercial',
        scheduled_date DATE NOT NULL,
        scheduled_time TIME NOT NULL,
        address TEXT,
        notes TEXT,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        description TEXT,
        equipment_required TEXT,
        priority TEXT DEFAULT 'media',
        estimated_duration DECIMAL(4,1),
        status TEXT DEFAULT 'agendada',
        checkin_time DATETIME,
        checkout_time DATETIME,
        checkin_latitude DECIMAL(10,8),
        checkin_longitude DECIMAL(11,8),
        checkout_latitude DECIMAL(10,8),
        checkout_longitude DECIMAL(11,8),
        actual_duration DECIMAL(4,1),
        travel_distance DECIMAL(8,2),
        travel_time DECIMAL(4,1),
        fuel_consumed DECIMAL(6,2),
        travel_cost DECIMAL(8,2),
        notes_checkin TEXT,
        notes_checkout TEXT,
        client_id UUID,
        lead_id UUID,
        responsible_id UUID NOT NULL,
        planning_id UUID,
        planned_distance DECIMAL(6,2) DEFAULT 0,
        planned_fuel DECIMAL(5,2) DEFAULT 0,
        planned_cost DECIMAL(8,2) DEFAULT 0,
        actual_distance DECIMAL(6,2) DEFAULT 0,
        actual_fuel DECIMAL(5,2) DEFAULT 0,
        actual_cost DECIMAL(8,2) DEFAULT 0,
        completion_notes TEXT,
        source TEXT DEFAULT 'direct',
        created_at DATETIME,
        updated_at DATETIME
      )
    `;
    
    db.run(sql, (err) => {
      if (err) {
        console.error('❌ Erro ao criar tabela visits_new:', err);
        reject(err);
      } else {
        console.log('✅ Tabela visits_new criada com sucesso');
        resolve();
      }
    });
  });
};

// 2. Migrar dados da tabela visits antiga
const migrateOldVisits = () => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO visits_new (
        id, title, type, scheduled_date, scheduled_time, address, notes,
        latitude, longitude, description, equipment_required, priority,
        estimated_duration, status, checkin_time, checkout_time,
        checkin_latitude, checkin_longitude, checkout_latitude, checkout_longitude,
        actual_duration, travel_distance, travel_time, fuel_consumed, travel_cost,
        notes_checkin, notes_checkout, client_id, lead_id, responsible_id,
        source, created_at, updated_at
      )
      SELECT 
        id, title, type, scheduled_date, scheduled_time, address, notes,
        latitude, longitude, description, equipment_required, priority,
        estimated_duration, status, checkin_time, checkout_time,
        checkin_latitude, checkin_longitude, checkout_latitude, checkout_longitude,
        actual_duration, travel_distance, travel_time, fuel_consumed, travel_cost,
        notes_checkin, notes_checkout, client_id, lead_id, responsible_id,
        'legacy', created_at, updated_at
      FROM visits
    `;
    
    db.run(sql, function(err) {
      if (err) {
        console.error('❌ Erro ao migrar visits antiga:', err);
        reject(err);
      } else {
        console.log(`✅ Migrados ${this.changes} registros da tabela visits antiga`);
        resolve();
      }
    });
  });
};

// 3. Migrar dados da tabela visit_planning_items
const migratePlanningItems = () => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO visits_new (
        id, title, type, scheduled_date, scheduled_time, address, notes,
        priority, estimated_duration, status, client_id, responsible_id,
        planning_id, planned_distance, planned_fuel, planned_cost,
        actual_distance, actual_fuel, actual_cost, completion_notes,
        source, created_at, updated_at
      )
      SELECT 
        vpi.id,
        vpi.client_name || ' - ' || CASE 
          WHEN vpi.visit_type = 'comercial' THEN 'Visita Comercial'
          WHEN vpi.visit_type = 'tecnica' THEN 'Visita Técnica'
          ELSE vpi.visit_type
        END as title,
        vpi.visit_type as type,
        vpi.planned_date as scheduled_date,
        vpi.planned_time as scheduled_time,
        vpi.client_address as address,
        vpi.notes,
        vpi.priority,
        vpi.estimated_duration,
        vpi.status,
        vpi.client_id,
        vp.responsible_id,
        vpi.planning_id,
        vpi.planned_distance,
        vpi.planned_fuel,
        vpi.planned_cost,
        vpi.actual_distance,
        vpi.actual_fuel,
        vpi.actual_cost,
        vpi.completion_notes,
        'planning',
        vpi.created_at,
        vpi.updated_at
      FROM visit_planning_items vpi
      LEFT JOIN visit_planning vp ON vpi.planning_id = vp.id
    `;
    
    db.run(sql, function(err) {
      if (err) {
        console.error('❌ Erro ao migrar visit_planning_items:', err);
        reject(err);
      } else {
        console.log(`✅ Migrados ${this.changes} registros da tabela visit_planning_items`);
        resolve();
      }
    });
  });
};

// 4. Substituir tabela antiga pela nova
const replaceTable = () => {
  return new Promise((resolve, reject) => {
    const steps = [
      'DROP TABLE IF EXISTS visits_old',
      'ALTER TABLE visits RENAME TO visits_old',
      'ALTER TABLE visits_new RENAME TO visits'
    ];
    
    let currentStep = 0;
    
    const executeStep = () => {
      if (currentStep >= steps.length) {
        console.log('✅ Tabela visits substituída com sucesso');
        resolve();
        return;
      }
      
      const sql = steps[currentStep];
      console.log(`🔄 Executando: ${sql}`);
      
      db.run(sql, (err) => {
        if (err) {
          console.error(`❌ Erro no passo ${currentStep + 1}:`, err);
          reject(err);
        } else {
          currentStep++;
          executeStep();
        }
      });
    };
    
    executeStep();
  });
};

// 5. Criar índices para a nova tabela
const createIndexes = () => {
  return new Promise((resolve, reject) => {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_visits_scheduled_date ON visits(scheduled_date)',
      'CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status)',
      'CREATE INDEX IF NOT EXISTS idx_visits_type ON visits(type)',
      'CREATE INDEX IF NOT EXISTS idx_visits_responsible_id ON visits(responsible_id)',
      'CREATE INDEX IF NOT EXISTS idx_visits_client_id ON visits(client_id)',
      'CREATE INDEX IF NOT EXISTS idx_visits_planning_id ON visits(planning_id)',
      'CREATE INDEX IF NOT EXISTS idx_visits_source ON visits(source)'
    ];
    
    let currentIndex = 0;
    
    const executeIndex = () => {
      if (currentIndex >= indexes.length) {
        console.log('✅ Índices criados com sucesso');
        resolve();
        return;
      }
      
      const sql = indexes[currentIndex];
      console.log(`🔄 Criando índice: ${sql}`);
      
      db.run(sql, (err) => {
        if (err) {
          console.error(`❌ Erro ao criar índice ${currentIndex + 1}:`, err);
          reject(err);
        } else {
          currentIndex++;
          executeIndex();
        }
      });
    };
    
    executeIndex();
  });
};

// 6. Verificar resultado da migração
const verifyMigration = () => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT COUNT(*) as total, source FROM visits GROUP BY source';
    
    db.all(sql, (err, rows) => {
      if (err) {
        console.error('❌ Erro ao verificar migração:', err);
        reject(err);
      } else {
        console.log('📊 Resultado da migração:');
        rows.forEach(row => {
          console.log(`  - ${row.source}: ${row.total} registros`);
        });
        resolve();
      }
    });
  });
};

// Executar migração
const runMigration = async () => {
  try {
    console.log('🔄 Iniciando processo de unificação...');
    
    await createUnifiedVisitsTable();
    await migrateOldVisits();
    await migratePlanningItems();
    await replaceTable();
    await createIndexes();
    await verifyMigration();
    
    console.log('✅ Migração concluída com sucesso!');
    console.log('📝 Próximos passos:');
    console.log('  1. Atualizar as rotas da API para usar apenas a tabela visits');
    console.log('  2. Remover referências às tabelas antigas');
    console.log('  3. Testar funcionalidades');
    
  } catch (error) {
    console.error('❌ Erro durante migração:', error);
  } finally {
    db.close();
  }
};

runMigration();




