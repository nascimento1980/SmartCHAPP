const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Visit = sequelize.define('Visit', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('comercial', 'tecnica', 'implantacao', 'instalacao', 'manutencao', 'suporte', 'treinamento'),
    defaultValue: 'comercial'
  },
  scheduled_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  scheduled_time: {
    type: DataTypes.TIME,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('baixa', 'media', 'alta', 'urgente'),
    defaultValue: 'media'
  },
  estimated_duration: {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('agendada', 'em_andamento', 'concluida', 'cancelada', 'reagendada', 'planejada', 'excluida'),
    defaultValue: 'agendada'
  },
  checkin_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checkout_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checkin_latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  checkin_longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  checkout_latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  checkout_longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  actual_duration: {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: true
  },
  travel_distance: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  travel_time: {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: true
  },
  fuel_consumed: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true
  },
  travel_cost: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  notes_checkin: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes_checkout: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  customer_contact_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'customer_contacts', key: 'id' }
  },
  // Remover client_id/lead_id depois de migrar dados
  client_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'customer_contacts',
      key: 'id'
    }
  },
  lead_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'customer_contacts',
      key: 'id'
    }
  },
  responsible_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  planning_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'visit_planning',
      key: 'id'
    }
  },
  planned_distance: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
    defaultValue: 0
  },
  planned_fuel: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0
  },
  planned_cost: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    defaultValue: 0
  },
  actual_distance: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
    defaultValue: 0
  },
  actual_fuel: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0
  },
  actual_cost: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    defaultValue: 0
  },
  completion_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  source: {
    type: DataTypes.ENUM('direct', 'planning', 'legacy'),
    defaultValue: 'direct'
  },
  // Campos para soft delete e justificativa de exclusão
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deleted_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  deletion_reason: {
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
  tableName: 'visits',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deleted_at',
  defaultScope: {
    where: {
      deleted_at: null
    }
  },
  scopes: {
    withDeleted: {
      where: {}
    }
  }
});

module.exports = Visit;