const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VisitPlanning = sequelize.define('VisitPlanning', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  week_start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Data de início da semana (segunda-feira)'
  },
  week_end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Data de fim da semana (domingo)'
  },
  responsible_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usuário responsável pelo planejamento'
  },
  planning_type: {
    type: DataTypes.ENUM('comercial', 'tecnica'),
    allowNull: false,
    comment: 'Tipo de planejamento (comercial ou técnica)'
  },
  status: {
    type: DataTypes.ENUM('em_planejamento', 'em_execucao', 'concluida', 'avaliada'),
    defaultValue: 'em_planejamento',
    comment: 'Status do planejamento da semana'
  },
  total_planned_visits: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total de visitas planejadas para a semana'
  },
  total_completed_visits: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total de visitas realizadas na semana'
  },
  total_cancelled_visits: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total de visitas canceladas na semana'
  },
  planned_distance: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0,
    comment: 'Distância total planejada em km'
  },
  actual_distance: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0,
    comment: 'Distância real percorrida em km'
  },
  planned_fuel: {
    type: DataTypes.DECIMAL(6, 2),
    defaultValue: 0,
    comment: 'Combustível planejado em litros'
  },
  actual_fuel: {
    type: DataTypes.DECIMAL(6, 2),
    defaultValue: 0,
    comment: 'Combustível real consumido em litros'
  },
  planned_time: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Tempo planejado em horas'
  },
  actual_time: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Tempo real gasto em horas'
  },
  planned_cost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Custo planejado em R$'
  },
  actual_cost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Custo real em R$'
  },
  efficiency_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Taxa de eficiência (0-100%)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Observações sobre o planejamento'
  },
  evaluation_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas da avaliação semanal'
  },
  next_week_planning: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Planejamento para a próxima semana baseado na avaliação'
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
  tableName: 'visit_planning',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['week_start_date', 'planning_type']
    },
    {
      fields: ['responsible_id']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = VisitPlanning;
