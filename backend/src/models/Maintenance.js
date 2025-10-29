const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Maintenance = sequelize.define('Maintenance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  vehicle_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'vehicles',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('preventiva', 'corretiva', 'emergencial', 'inspecao'),
    defaultValue: 'preventiva'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  scheduled_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  completed_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('agendada', 'em_andamento', 'concluida', 'cancelada'),
    defaultValue: 'agendada'
  },
  priority: {
    type: DataTypes.ENUM('baixa', 'media', 'alta', 'critica'),
    defaultValue: 'media'
  },
  cost: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true
  },
  mechanic: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  workshop: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  mileage_at_service: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  next_maintenance_mileage: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  next_maintenance_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  responsible_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'maintenances',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['vehicle_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['scheduled_date']
    },
    {
      fields: ['responsible_id']
    }
  ]
});

module.exports = Maintenance;
