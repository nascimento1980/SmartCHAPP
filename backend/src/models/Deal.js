const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Deal = sequelize.define('Deal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Título do negócio (ex: Produtos de limpeza - Hotel Plaza)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Valor do negócio
  value: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  // Moeda
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'BRL'
  },
  // Pipeline e estágio
  pipeline_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'pipelines',
      key: 'id'
    }
  },
  stage_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID do estágio dentro do pipeline'
  },
  // Status do deal
  status: {
    type: DataTypes.ENUM('open', 'won', 'lost'),
    defaultValue: 'open'
  },
  // Probabilidade de fechamento (0-100)
  probability: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  // Data prevista de fechamento
  expected_close_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Data real de fechamento
  actual_close_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Relacionamentos
  customer_contact_id: {
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
  // Fonte do negócio
  source: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  // Motivo de perda (se status = lost)
  lost_reason: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  // Próxima ação
  next_action: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  next_action_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Dados customizados por segmento
  custom_fields: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  // Tags
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  }
}, {
  tableName: 'deals',
  indexes: [
    {
      fields: ['pipeline_id', 'stage_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['responsible_id']
    },
    {
      fields: ['expected_close_date']
    },
    {
      fields: ['customer_contact_id']
    }
  ]
});

// Método para mover para próximo estágio
Deal.prototype.moveToNextStage = async function() {
  const Pipeline = require('./Pipeline');
  const pipeline = await Pipeline.findByPk(this.pipeline_id);
  
  if (pipeline) {
    const nextStage = pipeline.getNextStage(this.stage_id);
    if (nextStage) {
      this.stage_id = nextStage.id;
      this.probability = nextStage.probability;
      await this.save();
      return true;
    }
  }
  return false;
};

// Método para marcar como ganho
Deal.prototype.markAsWon = async function() {
  this.status = 'won';
  this.actual_close_date = new Date();
  this.probability = 100;
  await this.save();
};

// Método para marcar como perdido
Deal.prototype.markAsLost = async function(reason) {
  this.status = 'lost';
  this.actual_close_date = new Date();
  this.probability = 0;
  this.lost_reason = reason;
  await this.save();
};

module.exports = Deal;