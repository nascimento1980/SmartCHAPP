const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho para o banco de dados
const dbPath = path.join(__dirname, '../../data/chsmart.db');

// Conectar ao banco
const db = new sqlite3.Database(dbPath);

console.log('🔄 Atualizando tabela visit_planning_items...');

// Adicionar novos campos
const addNewFields = () => {
  return new Promise((resolve, reject) => {
      const queries = [
    'ALTER TABLE visit_planning_items ADD COLUMN client_id TEXT'
  ];

    let completed = 0;
    const total = queries.length;

    queries.forEach((query, index) => {
      db.run(query, (err) => {
        if (err) {
          // Ignorar erro se a coluna já existir
          if (err.message.includes('duplicate column name')) {
            console.log(`✅ Coluna já existe: ${query}`);
          } else {
            console.log(`⚠️  Aviso: ${err.message}`);
          }
        } else {
          console.log(`✅ Campo adicionado: ${query}`);
        }

        completed++;
        if (completed === total) {
          resolve();
        }
      });
    });
  });
};

// Verificar estrutura da tabela
const checkTableStructure = () => {
  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info(visit_planning_items)", (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('\n📋 Estrutura atual da tabela visit_planning_items:');
      rows.forEach(row => {
        console.log(`  - ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : 'NULL'}`);
      });
      resolve();
    });
  });
};

// Executar atualizações
const main = async () => {
  try {
    await addNewFields();
    await checkTableStructure();
    
    console.log('\n✅ Tabela visit_planning_items atualizada com sucesso!');
    console.log('🔄 Reinicie o backend para aplicar as mudanças.');
  } catch (error) {
    console.error('❌ Erro ao atualizar tabela:', error);
  } finally {
    db.close();
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { addNewFields, checkTableStructure };
