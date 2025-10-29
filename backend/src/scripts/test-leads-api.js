const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/chsmart.db');
const db = new sqlite3.Database(dbPath);

console.log('🧪 Testando API de leads...');

const testLeadsAPI = () => {
  return new Promise((resolve, reject) => {
    // Testar busca de leads
    console.log('📊 Buscando leads do banco...');
    
    const query = `
      SELECT 
        id, 
        company_name, 
        contact_name, 
        email, 
        phone, 
        mobile, 
        address, 
        city, 
        state,
        segment,
        status
      FROM leads 
      LIMIT 5
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('❌ Erro ao buscar leads:', err.message);
        reject(err);
        return;
      }
      
      console.log('✅ Leads encontrados:', rows.length);
      rows.forEach((lead, index) => {
        console.log(`\n📋 Lead ${index + 1}:`);
        console.log(`   ID: ${lead.id}`);
        console.log(`   Empresa: ${lead.company_name}`);
        console.log(`   Contato: ${lead.contact_name}`);
        console.log(`   Email: ${lead.email || 'N/A'}`);
        console.log(`   Telefone: ${lead.phone || lead.mobile || 'N/A'}`);
        console.log(`   Endereço: ${lead.address || 'N/A'}`);
        console.log(`   Cidade: ${lead.city || 'N/A'}`);
        console.log(`   Estado: ${lead.state || 'N/A'}`);
        console.log(`   Segmento: ${lead.segment}`);
        console.log(`   Status: ${lead.status}`);
      });
      
      resolve(rows);
    });
  });
};

const testLeadsStructure = () => {
  return new Promise((resolve, reject) => {
    console.log('\n🔍 Verificando estrutura da tabela leads...');
    
    db.all("PRAGMA table_info(leads)", [], (err, rows) => {
      if (err) {
        console.error('❌ Erro ao verificar estrutura:', err.message);
        reject(err);
        return;
      }
      
      console.log('✅ Estrutura da tabela leads:');
      rows.forEach(row => {
        console.log(`   ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : 'NULL'} ${row.pk ? 'PRIMARY KEY' : ''}`);
      });
      
      resolve(rows);
    });
  });
};

const main = async () => {
  try {
    await testLeadsAPI();
    await testLeadsStructure();
    console.log('\n🎉 Teste concluído com sucesso!');
  } catch (error) {
    console.error('💥 Erro durante o teste:', error.message);
  } finally {
    db.close();
  }
};

main();
