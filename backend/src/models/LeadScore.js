const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LeadScore = sequelize.define('LeadScore', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  customer_contact_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'customer_contacts',
      key: 'id'
    }
  },
  // Pontuação por características demográficas
  demographic_score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Pontos baseados em segmento, tamanho da empresa, localização'
  },
  // Pontuação por comportamento digital
  behavior_score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Pontos baseados em interações, emails abertos, site visitado'
  },
  // Pontuação por engajamento
  engagement_score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Pontos baseados em respostas, ligações atendidas, reuniões agendadas'
  },
  // Pontuação por timing
  timing_score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Pontos baseados em urgência, sazonalidade, necessidade expressa'
  },
  // Score total
  total_score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  // Classificação qualitativa
  classification: {
    type: DataTypes.ENUM('cold', 'warm', 'hot', 'very_hot'),
    defaultValue: 'cold'
  },
  // Última atualização do score
  last_calculated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  // Fatores que influenciaram o score
  score_factors: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'lead_scores',
  indexes: [
    {
      fields: ['customer_contact_id']
    },
    {
      fields: ['total_score']
    },
    {
      fields: ['classification']
    }
  ]
});

// Método para calcular score total
LeadScore.prototype.calculateTotalScore = function() {
  this.total_score = Math.min(
    this.demographic_score + 
    this.behavior_score + 
    this.engagement_score + 
    this.timing_score,
    100
  );
  
  // Definir classificação baseada no score
  if (this.total_score >= 80) {
    this.classification = 'very_hot';
  } else if (this.total_score >= 60) {
    this.classification = 'hot';
  } else if (this.total_score >= 30) {
    this.classification = 'warm';
  } else {
    this.classification = 'cold';
  }
  
  this.last_calculated = new Date();
  return this.total_score;
};

module.exports = LeadScore;