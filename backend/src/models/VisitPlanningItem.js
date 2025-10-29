const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VisitPlanningItem = sequelize.define('VisitPlanningItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  planning_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'visit_planning',
      key: 'id'
    },
    comment: 'ID do planejamento semanal'
  },
  visit_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'visits',
      key: 'id'
    },
    comment: 'ID da visita (se já existir)'
  },
  planned_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Data planejada para a visita'
  },
  planned_time: {
    type: DataTypes.TIME,
    allowNull: false,
    comment: 'Horário planejado para a visita'
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID do cliente ou lead'
  },
  client_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nome do cliente'
  },
  client_address: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Endereço do cliente'
  },
  visit_type: {
    type: DataTypes.ENUM('comercial', 'tecnica', 'implantacao', 'instalacao', 'manutencao', 'suporte', 'treinamento'),
    allowNull: false,
    comment: 'Tipo da visita'
  },
  priority: {
    type: DataTypes.ENUM('baixa', 'media', 'alta', 'critica'),
    defaultValue: 'media',
    comment: 'Prioridade da visita'
  },
  estimated_duration: {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: true,
    comment: 'Duração estimada em horas'
  },
  planned_distance: {
    type: DataTypes.DECIMAL(6, 2),
    defaultValue: 0,
    comment: 'Distância planejada em km'
  },
  planned_fuel: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Combustível planejado em litros'
  },
  planned_cost: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0,
    comment: 'Custo planejado em R$'
  },
  status: {
    type: DataTypes.ENUM('planejada', 'em_andamento', 'concluida', 'cancelada', 'reagendada'),
    defaultValue: 'planejada',
    comment: 'Status da visita planejada'
  },
  actual_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Data real da visita'
  },
  actual_time: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Horário real da visita'
  },
  actual_duration: {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: true,
    comment: 'Duração real em horas'
  },
  actual_distance: {
    type: DataTypes.DECIMAL(6, 2),
    defaultValue: 0,
    comment: 'Distância real percorrida em km'
  },
  actual_fuel: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Combustível real consumido em litros'
  },
  actual_cost: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0,
    comment: 'Custo real em R$'
  },
  
  // Campos de check-in
  checkin_latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: 'Latitude do check-in'
  },
  checkin_longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    comment: 'Longitude do check-in'
  },
  checkin_time: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Horário do check-in'
  },
  checkin_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Observações do check-in'
  },
  actual_start_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data/hora real do início da visita'
  },
  
  // Campos de check-out
  checkout_time: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Horário do check-out'
  },
  visit_report: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Relatório da visita'
  },
  next_steps: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Próximos passos'
  },
  client_satisfaction: {
    type: DataTypes.ENUM('muito_satisfeito', 'satisfeito', 'neutro', 'insatisfeito', 'muito_insatisfeito'),
    allowNull: true,
    comment: 'Satisfação do cliente'
  },
  actual_end_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data/hora real do fim da visita'
  },
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Observações sobre a visita'
  },
  completion_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas sobre a conclusão da visita'
  },
  reschedule_reason: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Motivo do reagendamento'
  },
  reschedule_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Observações sobre o reagendamento'
  },
  rescheduled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data/hora do reagendamento'
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
  tableName: 'visit_planning_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['planning_id', 'planned_date']
    },
    {
      fields: ['visit_id']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = VisitPlanningItem;
