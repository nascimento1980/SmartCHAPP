const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PlanningInvite = sequelize.define('PlanningInvite', {
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
    comment: 'ID do planejamento que está sendo compartilhado'
  },
  inviter_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usuário que está enviando o convite'
  },
  invited_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usuário que está sendo convidado'
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'declined', 'cancelled'),
    defaultValue: 'pending',
    comment: 'Status do convite'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mensagem opcional do convite'
  },
  invited_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Data e hora do envio do convite'
  },
  responded_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data e hora da resposta ao convite'
  },
  response_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mensagem opcional na resposta'
  },
  is_automatic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indica se o convite foi enviado automaticamente'
  },
  notification_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indica se a notificação foi enviada'
  }
}, {
  tableName: 'planning_invites',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['planning_id']
    },
    {
      fields: ['invited_user_id']
    },
    {
      fields: ['inviter_id']
    },
    {
      fields: ['status']
    },
    {
      unique: true,
      fields: ['planning_id', 'invited_user_id'],
      name: 'unique_planning_invite'
    }
  ]
});

module.exports = PlanningInvite;

