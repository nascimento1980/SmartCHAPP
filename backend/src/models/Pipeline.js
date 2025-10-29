const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Pipeline = sequelize.define('Pipeline', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Nome do pipeline (ex: Vendas B2B, Condominios, Hotelaria)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Estágios do pipeline em ordem
  stages: {
    type: DataTypes.JSON,
    defaultValue: [
      { id: 1, name: 'Lead Qualificado', probability: 10, color: '#f44336' },
      { id: 2, name: 'Interesse Demonstrado', probability: 25, color: '#ff9800' },
      { id: 3, name: 'Visita Agendada', probability: 40, color: '#2196f3' },
      { id: 4, name: 'Proposta Enviada', probability: 60, color: '#9c27b0' },
      { id: 5, name: 'Negociação', probability: 80, color: '#607d8b' },
      { id: 6, name: 'Fechado-Ganho', probability: 100, color: '#4caf50' }
    ]
  },
  // Segmento específico do pipeline
  segment: {
    type: DataTypes.ENUM(
      'condominios', 'hotelaria', 'restaurantes', 'escritorios',
      'industria', 'hospitais', 'escolas', 'shopping_centers',
      'cozinhas_industriais', 'geral'
    ),
    defaultValue: 'geral'
  },
  // Se está ativo
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Configurações específicas
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      auto_stage_progression: true,
      email_notifications: true,
      required_fields_per_stage: {},
      automated_actions: {}
    }
  }
}, {
  tableName: 'pipelines',
  indexes: [
    {
      fields: ['segment']
    },
    {
      fields: ['is_active']
    }
  ]
});

// Método para obter estágio por ID
Pipeline.prototype.getStageById = function(stageId) {
  return this.stages.find(stage => stage.id === stageId);
};

// Método para obter próximo estágio
Pipeline.prototype.getNextStage = function(currentStageId) {
  const currentIndex = this.stages.findIndex(stage => stage.id === currentStageId);
  return currentIndex < this.stages.length - 1 ? this.stages[currentIndex + 1] : null;
};

// Método para calcular valor esperado do pipeline
Pipeline.prototype.calculateExpectedValue = async function() {
  const Deal = require('./Deal');
  const deals = await Deal.findAll({
    where: { 
      pipeline_id: this.id,
      status: 'open'
    }
  });
  
  return deals.reduce((total, deal) => {
    const stage = this.getStageById(deal.stage_id);
    const probability = stage ? stage.probability / 100 : 0;
    return total + (deal.value * probability);
  }, 0);
};

module.exports = Pipeline;