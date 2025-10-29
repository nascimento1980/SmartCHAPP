const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RoleProfile = sequelize.define('RoleProfile', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  // optional mapping to app roles if desired
  role: { type: DataTypes.ENUM('admin','manager','sales','technician','agent','master'), allowNull: true }
}, { tableName: 'role_profiles' });

module.exports = RoleProfile;




