const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FuelExpense = sequelize.define('FuelExpense', {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  fuel_type: {
    type: DataTypes.ENUM('gasolina', 'etanol', 'diesel', 'aditivada'),
    allowNull: false
  },
  quantity_liters: {
    type: DataTypes.DECIMAL(6,2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  price_per_liter: {
    type: DataTypes.DECIMAL(5,3),
    allowNull: false,
    validate: {
      min: 0.001
    }
  },
  total_cost: {
    type: DataTypes.DECIMAL(8,2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  gas_station: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  mileage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  driver_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  purpose: {
    type: DataTypes.ENUM('trabalho', 'pessoal', 'entrega', 'visita_cliente'),
    defaultValue: 'trabalho'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  receipt_number: {
    type: DataTypes.STRING(50),
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
  tableName: 'fuel_expenses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['vehicle_id']
    },
    {
      fields: ['date']
    },
    {
      fields: ['fuel_type']
    },
    {
      fields: ['driver_id']
    }
  ]
});

module.exports = FuelExpense;
