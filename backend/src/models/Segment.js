const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Segment = sequelize.define('Segment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  code: { type: DataTypes.STRING(80), allowNull: true, unique: true }
}, { tableName: 'segments' });

module.exports = Segment;




