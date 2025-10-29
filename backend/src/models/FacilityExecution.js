const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FacilityExecution = sequelize.define('FacilityExecution', {
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
    comment: 'ID do POP executado'
  },
  executed_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usuário que executou o procedimento'
  },
  location: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Local onde foi executado'
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Hora de início da execução'
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Hora de término da execução'
  },
  status: {
    type: DataTypes.ENUM('em_andamento', 'concluido', 'pausado', 'cancelado', 'nao_conforme'),
    defaultValue: 'em_andamento',
    comment: 'Status da execução'
  },
  completion_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    comment: 'Percentual de conclusão'
  },
  observations: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Observações gerais da execução'
  },
  non_conformities: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Lista de não conformidades encontradas'
  },
  corrective_actions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Ações corretivas tomadas'
  },
  supervisor_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Supervisor que validou a execução'
  },
  validated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data de validação pelo supervisor'
  },
  validation_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Observações da validação'
  }
}, {
  tableName: 'facility_executions',
  timestamps: true,
  indexes: [
    { fields: ['pop_id'] },
    { fields: ['executed_by'] },
    { fields: ['status'] },
    { fields: ['start_time'] },
    { fields: ['supervisor_id'] }
  ]
});

module.exports = FacilityExecution;