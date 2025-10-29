const { CompanySetting } = require('../models');
const { sequelize } = require('../config/database');

async function populateCompanySettings() {
  try {
    console.log('🚀 Iniciando população da tabela company_settings...');
    
    // Dados padrão da empresa
    const defaultSettings = [
      { key: 'companyName', value: 'CleanHealth', description: 'Nome da empresa' },
      { key: 'companyLegalName', value: 'CleanHealth Ltda', description: 'Razão social' },
      { key: 'companyTaxId', value: '', description: 'CNPJ/CPF da empresa' },
      { key: 'companyEmail', value: '', description: 'Email da empresa' },
      { key: 'companyPhone', value: '', description: 'Telefone da empresa' },
      { key: 'companySite', value: '', description: 'Site da empresa' },
      { key: 'companyAddress', value: '', description: 'Endereço da empresa' },
      { key: 'companyCity', value: '', description: 'Cidade da empresa' },
      { key: 'companyState', value: '', description: 'Estado da empresa' },
      { key: 'companyZip', value: '', description: 'CEP da empresa' },
      { key: 'companyLatitude', value: '', description: 'Latitude da empresa' },
      { key: 'companyLongitude', value: '', description: 'Longitude da empresa' },
      { key: 'companyLogo', value: '', description: 'Logo da empresa' },
      { key: 'companyPrimaryColor', value: '#1976d2', description: 'Cor primária da empresa' },
      { key: 'companySecondaryColor', value: '#dc004e', description: 'Cor secundária da empresa' }
    ];

    // Inserir ou atualizar cada configuração
    for (const setting of defaultSettings) {
      const [companySetting, created] = await CompanySetting.findOrCreate({
        where: { setting_key: setting.key },
        defaults: {
          setting_key: setting.key,
          setting_value: setting.value,
          setting_type: 'string',
          description: setting.description,
          is_public: false
        }
      });

      if (!created) {
        await companySetting.update({
          setting_value: setting.value,
          description: setting.description,
          updated_at: new Date()
        });
        console.log(`✅ Atualizado: ${setting.key}`);
      } else {
        console.log(`✅ Criado: ${setting.key}`);
      }
    }

    console.log('🎉 Tabela company_settings populada com sucesso!');
    
    // Verificar dados inseridos
    const allSettings = await CompanySetting.findAll({
      where: {
        setting_key: {
          [require('sequelize').Op.like]: 'company%'
        }
      }
    });
    
    console.log('\n📊 Configurações da empresa no banco:');
    allSettings.forEach(setting => {
      console.log(`  ${setting.setting_key}: ${setting.setting_value}`);
    });

  } catch (error) {
    console.error('❌ Erro ao popular company_settings:', error);
  } finally {
    await sequelize.close();
  }
}

populateCompanySettings();
