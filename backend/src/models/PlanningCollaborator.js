const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PlanningCollaborator = sequelize.define('PlanningCollaborator', {
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
    comment: 'ID do planejamento compartilhado'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usuário colaborador'
  },
  role: {
    type: DataTypes.ENUM('owner', 'collaborator', 'viewer'),
    defaultValue: 'collaborator',
    comment: 'Papel do usuário no planejamento'
  },
  permissions: {
    type: DataTypes.JSON,
    defaultValue: {
      can_view: true,
      can_edit: false,
      can_delete: false,
      can_invite: false,
      can_execute: false
    },
    comment: 'Permissões específicas do colaborador'
  },
  sync_to_calendar: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Se deve sincronizar automaticamente com o calendário do colaborador'
  },
  added_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Data e hora que foi adicionado como colaborador'
  },
  added_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usuário que adicionou este colaborador'
  },
  last_sync_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Última vez que foi sincronizado'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Se a colaboração está ativa'
  }
}, {
  tableName: 'planning_collaborators',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['planning_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['role']
    },
    {
      fields: ['is_active']
    },
    {
      unique: true,
      fields: ['planning_id', 'user_id'],
      name: 'unique_planning_collaborator'
    }
  ]
});

module.exports = PlanningCollaborator;


