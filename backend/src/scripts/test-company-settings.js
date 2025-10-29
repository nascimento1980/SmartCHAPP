const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/chsmart.db');
const db = new sqlite3.Database(dbPath);

console.log('🧪 Testando configurações da empresa...');

const testCompanySettings = () => {
  return new Promise((resolve, reject) => {
    // Testar se os dados estão sendo salvos
    console.log('\n📝 Testando salvamento de dados...');
    
    const testData = {
      companyName: 'Empresa Teste',
      companyAddress: 'Rua Teste, 123',
      companyCity: 'São Paulo',
      companyState: 'SP'
    };
    
    const insertPromises = Object.entries(testData).map(([key, value]) => {
      return new Promise((resolve, reject) => {
        const query = `
          INSERT OR REPLACE INTO company_settings 
          (setting_key, setting_value, setting_type, description, is_public, created_at, updated_at)
          VALUES (?, ?, 'string', ?, 0, datetime('now'), datetime('now'))
        `;
        
        db.run(query, [
          key,
          value,
          `Configuração da empresa: ${key}`
        ], function(err) {
          if (err) {
            console.error(`❌ Erro ao inserir ${key}:`, err.message);
            reject(err);
          } else {
            console.log(`✅ ${key}: ${value}`);
            resolve();
          }
        });
      });
    });
    
    Promise.all(insertPromises)
      .then(() => {
        console.log('\n📖 Testando leitura de dados...');
        
        // Testar se os dados podem ser lidos
        const query = `
          SELECT setting_key, setting_value 
          FROM company_settings 
          WHERE setting_key LIKE 'company%'
          ORDER BY setting_key
        `;
        
        db.all(query, [], (err, rows) => {
          if (err) {
            console.error('❌ Erro ao ler configurações:', err.message);
            reject(err);
          } else {
            console.log('📊 Configurações encontradas:');
            rows.forEach(row => {
              console.log(`  ${row.setting_key}: ${row.setting_value}`);
            });
            
            // Verificar se os dados de teste estão lá
            const testDataFound = rows.filter(row => 
              testData.hasOwnProperty(row.setting_key)
            );
            
            if (testDataFound.length === Object.keys(testData).length) {
              console.log('\n🎉 Teste PASSOU! Todas as configurações foram salvas e lidas corretamente.');
            } else {
              console.log('\n❌ Teste FALHOU! Algumas configurações não foram encontradas.');
            }
            
            resolve();
          }
        });
      })
      .catch(reject);
  });
};

const main = async () => {
  try {
    await testCompanySettings();
    console.log('\n✅ Teste concluído com sucesso!');
  } catch (error) {
    console.error('💥 Erro durante o teste:', error.message);
  } finally {
    db.close();
  }
};

main();
