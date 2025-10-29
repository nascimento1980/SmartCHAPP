const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho para o banco de dados
const dbPath = path.join(__dirname, '../../data/chsmart.db');

// Conectar ao banco
const db = new sqlite3.Database(dbPath);

console.log('🔧 Adicionando campos de check-in/check-out na tabela visits...');

// Adicionar novos campos
const alterTableQueries = [
  'ALTER TABLE visits ADD COLUMN checkin_time DATETIME',
  'ALTER TABLE visits ADD COLUMN checkout_time DATETIME',
  'ALTER TABLE visits ADD COLUMN checkin_latitude DECIMAL(10, 8)',
  'ALTER TABLE visits ADD COLUMN checkin_longitude DECIMAL(11, 8)',
  'ALTER TABLE visits ADD COLUMN checkout_latitude DECIMAL(10, 8)',
  'ALTER TABLE visits ADD COLUMN checkout_longitude DECIMAL(11, 8)',
  'ALTER TABLE visits ADD COLUMN actual_duration DECIMAL(4, 1)',
  'ALTER TABLE visits ADD COLUMN travel_distance DECIMAL(8, 2)',
  'ALTER TABLE visits ADD COLUMN travel_time DECIMAL(4, 1)',
  'ALTER TABLE visits ADD COLUMN fuel_consumed DECIMAL(6, 2)',
  'ALTER TABLE visits ADD COLUMN travel_cost DECIMAL(8, 2)',
  'ALTER TABLE visits ADD COLUMN notes_checkin TEXT',
  'ALTER TABLE visits ADD COLUMN notes_checkout TEXT'
];

// Executar cada query
alterTableQueries.forEach((query, index) => {
  db.run(query, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log(`✅ Campo já existe: ${query.split('ADD COLUMN ')[1]}`);
      } else {
        console.error(`❌ Erro ao executar query ${index + 1}:`, err.message);
      }
    } else {
      console.log(`✅ Campo adicionado: ${query.split('ADD COLUMN ')[1]}`);
    }
  });
});

// Verificar estrutura da tabela
db.all("PRAGMA table_info(visits)", (err, rows) => {
  if (err) {
    console.error('❌ Erro ao verificar estrutura da tabela:', err.message);
  } else {
    console.log('\n📋 Estrutura atual da tabela visits:');
    rows.forEach(row => {
      console.log(`  - ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : 'NULL'}`);
    });
  }
  
  // Fechar conexão
  db.close((err) => {
    if (err) {
      console.error('❌ Erro ao fechar banco:', err.message);
    } else {
      console.log('\n✅ Script executado com sucesso!');
    }
  });
});
