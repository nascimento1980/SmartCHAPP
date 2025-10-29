const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FacilityExecutionStep = sequelize.define('FacilityExecutionStep', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  execution_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'facility_executions',
      key: 'id'
    },
    comment: 'ID da execução'
  },
  step_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'facility_pop_steps',
      key: 'id'
    },
    comment: 'ID da etapa do POP'
  },
  status: {
    type: DataTypes.ENUM('pendente', 'em_andamento', 'concluido', 'nao_conforme', 'pulado'),
    defaultValue: 'pendente',
    comment: 'Status da etapa'
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Hora de início da etapa'
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Hora de conclusão da etapa'
  },
  observations: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Observações específicas da etapa'
  },
  non_conformity_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Motivo da não conformidade'
  },
  corrective_action: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Ação corretiva aplicada'
  }
}, {
  tableName: 'facility_execution_steps',
  timestamps: true,
  indexes: [
    { fields: ['execution_id'] },
    { fields: ['step_id'] },
    { fields: ['status'] }
  ]
});

module.exports = FacilityExecutionStep;