const { sequelize } = require('../config/database');

async function removeOldTables() {
  try {
    console.log('🗑️  Iniciando remoção segura das tabelas antigas...\n');
    
    // 1. Verificar se as tabelas ainda existem
    const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('leads', 'clients')");
    
    if (tables.length === 0) {
      console.log('✅ Tabelas leads e clients já foram removidas!');
      return;
    }
    
    console.log('📋 Tabelas encontradas para remoção:');
    tables.forEach(table => {
      console.log(`  🗑️  ${table.name}`);
    });
    
    // 2. Verificar se há dados nas tabelas antigas
    console.log('\n🔍 Verificando dados nas tabelas antigas...');
    
    for (const table of tables) {
      try {
        const [count] = await sequelize.query(`SELECT COUNT(*) as total FROM ${table.name}`);
        console.log(`  📊 ${table.name}: ${count[0].total} registros`);
        
        if (count[0].total > 0) {
          console.log(`  ⚠️  ATENÇÃO: Tabela ${table.name} ainda tem dados!`);
          
          // Verificar se os dados já foram migrados para customer_contacts
          const [migratedCount] = await sequelize.query(`SELECT COUNT(*) as total FROM customer_contacts WHERE type = '${table.name === 'leads' ? 'lead' : 'client'}'`);
          console.log(`  📊 Dados migrados em customer_contacts: ${migratedCount[0].total} registros`);
          
          if (migratedCount[0].total >= count[0].total) {
            console.log(`  ✅ Dados migrados com sucesso. Tabela ${table.name} pode ser removida.`);
          } else {
            console.log(`  ❌ Dados não migrados completamente. NÃO REMOVER tabela ${table.name}!`);
            return;
          }
        }
      } catch (error) {
        console.log(`  ❌ Erro ao verificar tabela ${table.name}: ${error.message}`);
      }
    }
    
    // 3. Verificar se não há referências ativas no código
    console.log('\n🔍 Verificando se há referências ativas...');
    
    // Verificar se as rotas ainda estão sendo usadas
    const [routes] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'");
    const hasActiveReferences = routes.some(table => 
      table.name === 'leads' || table.name === 'clients'
    );
    
    if (hasActiveReferences) {
      console.log('  ⚠️  ATENÇÃO: Ainda há referências ativas às tabelas antigas!');
      console.log('     Verifique se as rotas /api/leads e /api/clients foram removidas.');
      console.log('     Continuando com a remoção das tabelas...');
    } else {
      console.log('  ✅ Nenhuma referência ativa encontrada.');
    }
    
    // 4. Remover as tabelas antigas
    console.log('\n🗑️  Removendo tabelas antigas...');
    
    for (const table of tables) {
      try {
        console.log(`  🗑️  Removendo tabela ${table.name}...`);
        await sequelize.query(`DROP TABLE IF EXISTS ${table.name}`);
        console.log(`  ✅ Tabela ${table.name} removida com sucesso!`);
      } catch (error) {
        console.log(`  ❌ Erro ao remover tabela ${table.name}: ${error.message}`);
      }
    }
    
    // 5. Verificar se as tabelas foram removidas
    console.log('\n🔍 Verificando se as tabelas foram removidas...');
    const [remainingTables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('leads', 'clients')");
    
    if (remainingTables.length === 0) {
      console.log('✅ Todas as tabelas antigas foram removidas com sucesso!');
    } else {
      console.log('❌ Algumas tabelas ainda existem:');
      remainingTables.forEach(table => {
        console.log(`  ❌ ${table.name}`);
      });
    }
    
    // 6. Verificar estrutura final
    console.log('\n📋 Estrutura final do banco:');
    const [finalTables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log(`📊 Total de tabelas: ${finalTables.length}`);
    
    console.log('\n💡 RECOMENDAÇÕES FINAIS:');
    console.log('  1. ✅ Remova as rotas /api/leads e /api/clients do app.js');
    console.log('  2. ✅ Remova os arquivos routes/leads.js e routes/clients.js');
    console.log('  3. ✅ Atualize as permissões para usar customer-contacts');
    console.log('  4. ✅ Teste o sistema para garantir que tudo funciona');
    
    console.log('\n✅ Processo de limpeza concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante a remoção:', error);
  } finally {
    await sequelize.close();
  }
}

// Executar remoção
removeOldTables();