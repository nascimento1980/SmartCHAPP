const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../data/chsmart.db');
const settingsPath = path.join(__dirname, '../data/settings.json');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Sincronizando configurações da empresa...');

const syncCompanySettings = () => {
  return new Promise((resolve, reject) => {
    try {
      // Ler o arquivo de configurações
      const settingsData = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      const companySettings = settingsData.company;

      console.log('📋 Configurações encontradas:', Object.keys(companySettings));

      // Preparar as configurações para inserção
      const settingsToInsert = [
        { key: 'companyName', value: companySettings.companyName || '' },
        { key: 'companyLegalName', value: companySettings.companyLegalName || '' },
        { key: 'companyTaxId', value: companySettings.companyTaxId || '' },
        { key: 'companyEmail', value: companySettings.companyEmail || '' },
        { key: 'companyPhone', value: companySettings.companyPhone || '' },
        { key: 'companySite', value: companySettings.companySite || '' },
        { key: 'companyAddress', value: companySettings.companyAddress || '' },
        { key: 'companyCity', value: companySettings.companyCity || '' },
        { key: 'companyState', value: companySettings.companyState || '' },
        { key: 'companyZip', value: companySettings.companyZip || '' },
        { key: 'companyPrimaryColor', value: companySettings.companyPrimaryColor || '#2E7D32' },
        { key: 'companySecondaryColor', value: companySettings.companySecondaryColor || '#1976D2' }
      ];

      // Inserir ou atualizar cada configuração
      const insertPromises = settingsToInsert.map(setting => {
        return new Promise((resolve, reject) => {
          const query = `
            INSERT OR REPLACE INTO company_settings 
            (setting_key, setting_value, setting_type, description, is_public, created_at, updated_at)
            VALUES (?, ?, 'string', ?, 0, datetime('now'), datetime('now'))
          `;
          
          db.run(query, [
            setting.key,
            setting.value,
            `Configuração da empresa: ${setting.key}`
          ], function(err) {
            if (err) {
              console.error(`❌ Erro ao inserir ${setting.key}:`, err.message);
              reject(err);
            } else {
              console.log(`✅ ${setting.key}: ${setting.value}`);
              resolve();
            }
          });
        });
      });

      Promise.all(insertPromises)
        .then(() => {
          console.log('✅ Todas as configurações foram sincronizadas!');
          resolve();
        })
        .catch(reject);

    } catch (error) {
      console.error('❌ Erro ao ler arquivo de configurações:', error.message);
      reject(error);
    }
  });
};

const main = async () => {
  try {
    await syncCompanySettings();
    console.log('🎉 Sincronização concluída com sucesso!');
  } catch (error) {
    console.error('💥 Erro durante a sincronização:', error.message);
  } finally {
    db.close();
  }
};

main();
