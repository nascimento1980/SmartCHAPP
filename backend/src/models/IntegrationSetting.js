const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const IntegrationSetting = sequelize.define('IntegrationSetting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  smtp_host: { type: DataTypes.STRING(255) },
  smtp_port: { type: DataTypes.INTEGER },
  smtp_secure: { type: DataTypes.BOOLEAN, defaultValue: false },
  smtp_user: { type: DataTypes.STRING(255) },
  smtp_pass: { type: DataTypes.STRING(255) },
  smtp_from: { type: DataTypes.STRING(255) },
  whatsapp_provider: { type: DataTypes.STRING(64) },
  whatsapp_api_url: { type: DataTypes.STRING(255) },
  whatsapp_token: { type: DataTypes.STRING(255) }
}, {
  tableName: 'integration_settings'
});

module.exports = IntegrationSetting;




