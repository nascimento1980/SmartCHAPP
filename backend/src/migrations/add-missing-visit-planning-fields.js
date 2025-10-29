const { sequelize } = require('../config/database');

async function addMissingFields() {
  console.log('🔧 Adicionando campos faltantes na tabela visit_planning_items...');

  try {
    // Verificar se os campos já existem
    const tableInfo = await sequelize.query(
      "PRAGMA table_info(visit_planning_items);",
      { type: sequelize.QueryTypes.SELECT }
    );

    const existingColumns = tableInfo.map(col => col.name);
    console.log('📋 Colunas existentes:', existingColumns);

    const fieldsToAdd = [
      {
        name: 'checkin_latitude',
        type: 'DECIMAL(10, 8)',
        sql: 'ALTER TABLE visit_planning_items ADD COLUMN checkin_latitude DECIMAL(10, 8);'
      },
      {
        name: 'checkin_longitude',
        type: 'DECIMAL(11, 8)',
        sql: 'ALTER TABLE visit_planning_items ADD COLUMN checkin_longitude DECIMAL(11, 8);'
      },
      {
        name: 'checkin_time',
        type: 'TIME',
        sql: 'ALTER TABLE visit_planning_items ADD COLUMN checkin_time TIME;'
      },
      {
        name: 'checkin_notes',
        type: 'TEXT',
        sql: 'ALTER TABLE visit_planning_items ADD COLUMN checkin_notes TEXT;'
      },
      {
        name: 'actual_start_time',
        type: 'DATETIME',
        sql: 'ALTER TABLE visit_planning_items ADD COLUMN actual_start_time DATETIME;'
      },
      {
        name: 'checkout_time',
        type: 'TIME',
        sql: 'ALTER TABLE visit_planning_items ADD COLUMN checkout_time TIME;'
      },
      {
        name: 'visit_report',
        type: 'TEXT',
        sql: 'ALTER TABLE visit_planning_items ADD COLUMN visit_report TEXT;'
      },
      {
        name: 'next_steps',
        type: 'TEXT',
        sql: 'ALTER TABLE visit_planning_items ADD COLUMN next_steps TEXT;'
      },
      {
        name: 'client_satisfaction',
        type: 'TEXT',
        sql: 'ALTER TABLE visit_planning_items ADD COLUMN client_satisfaction TEXT;'
      },
      {
        name: 'actual_end_time',
        type: 'DATETIME',
        sql: 'ALTER TABLE visit_planning_items ADD COLUMN actual_end_time DATETIME;'
      },
      {
        name: 'reschedule_reason',
        type: 'VARCHAR(255)',
        sql: 'ALTER TABLE visit_planning_items ADD COLUMN reschedule_reason VARCHAR(255);'
      },
      {
        name: 'reschedule_notes',
        type: 'TEXT',
        sql: 'ALTER TABLE visit_planning_items ADD COLUMN reschedule_notes TEXT;'
      },
      {
        name: 'rescheduled_at',
        type: 'DATETIME',
        sql: 'ALTER TABLE visit_planning_items ADD COLUMN rescheduled_at DATETIME;'
      }
    ];

    let addedCount = 0;

    for (const field of fieldsToAdd) {
      if (!existingColumns.includes(field.name)) {
        console.log(`  ➕ Adicionando campo: ${field.name} (${field.type})`);
        await sequelize.query(field.sql);
        addedCount++;
      } else {
        console.log(`  ✓ Campo já existe: ${field.name}`);
      }
    }

    if (addedCount > 0) {
      console.log(`✅ ${addedCount} campos adicionados com sucesso!`);
    } else {
      console.log('✅ Todos os campos já existem!');
    }

    // Verificar estrutura final
    const updatedTableInfo = await sequelize.query(
      "PRAGMA table_info(visit_planning_items);",
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log(`📊 Total de colunas na tabela: ${updatedTableInfo.length}`);

  } catch (error) {
    console.error('❌ Erro ao adicionar campos:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  addMissingFields()
    .then(() => {
      console.log('🎉 Migração concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro na migração:', error);
      process.exit(1);
    });
}

module.exports = { addMissingFields };

