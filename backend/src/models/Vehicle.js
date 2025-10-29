const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Vehicle = sequelize.define('Vehicle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  plate: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    validate: {
      len: [5, 10]
    }
  },
  brand: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  model: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1900,
      max: new Date().getFullYear() + 1
    }
  },
  color: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('carro', 'moto', 'caminhao', 'van', 'utilitario'),
    defaultValue: 'carro'
  },
  fuel_type: {
    type: DataTypes.ENUM('gasolina', 'etanol', 'diesel', 'flex', 'eletrico', 'hibrido'),
    defaultValue: 'flex'
  },
  transmission: {
    type: DataTypes.ENUM('manual', 'automatico', 'cvt'),
    defaultValue: 'manual'
  },
  engine_capacity: {
    type: DataTypes.DECIMAL(3,1), // 1.0, 2.0, etc.
    allowNull: true
  },
  mileage: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('ativo', 'manutencao', 'inativo', 'acidente'),
    defaultValue: 'ativo'
  },
  purchase_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  purchase_price: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true
  },
  insurance_expiry: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  inspection_expiry: {
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
  department_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'departments',
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
  tableName: 'vehicles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['plate']
    },
    {
      fields: ['status']
    },
    {
      fields: ['responsible_id']
    },
    {
      fields: ['department_id']
    }
  ]
});

module.exports = Vehicle;
