const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Proposal = sequelize.define('Proposal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'accepted', 'rejected'),
    defaultValue: 'draft'
  },
  total_value: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  customer_contact_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'customer_contacts',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'proposals'
});

module.exports = Proposal;