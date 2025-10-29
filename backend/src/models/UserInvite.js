const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserInvite = sequelize.define('UserInvite', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: { type: DataTypes.STRING(255), allowNull: false },
  employee_id: { type: DataTypes.UUID, allowNull: true },
  token_hash: { type: DataTypes.STRING(255), allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  used_at: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'user_invites'
});

module.exports = UserInvite;




