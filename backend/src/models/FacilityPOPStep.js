const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FacilityPOPStep = sequelize.define('FacilityPOPStep', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  pop_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'facility_pops',
      key: 'id'
    },
    comment: 'ID do POP'
  },
  step_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Número da etapa (ordem)'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Título da etapa'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Descrição detalhada da etapa'
  },
  requires_evidence: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Se a etapa requer evidência fotográfica'
  },
  evidence_type: {
    type: DataTypes.ENUM('foto', 'video', 'documento', 'assinatura'),
    allowNull: true,
    comment: 'Tipo de evidência requerida'
  },
  critical_point: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Se é um ponto crítico de controle'
  },
  estimated_time: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Tempo estimado para esta etapa em minutos'
  },
  tools_required: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Ferramentas necessárias para esta etapa'
  },
  safety_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Observações de segurança específicas'
  }
}, {
  tableName: 'facility_pop_steps',
  timestamps: true,
  indexes: [
    { fields: ['pop_id'] },
    { fields: ['step_number'] },
    { fields: ['critical_point'] }
  ]
});

module.exports = FacilityPOPStep;