const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Contact = sequelize.define('Contact', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('call', 'email', 'whatsapp', 'meeting', 'other'),
    allowNull: false
  },
  direction: {
    type: DataTypes.ENUM('inbound', 'outbound'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  contact_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  customer_contact_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'customer_contacts',
      key: 'id'
    }
  }
}, {
  tableName: 'contacts'
});

module.exports = Contact;