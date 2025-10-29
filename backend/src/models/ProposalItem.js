const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProposalItem = sequelize.define('ProposalItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  proposal_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'proposals',
      key: 'id'
    }
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  }
}, {
  tableName: 'proposal_items'
});

module.exports = ProposalItem;