const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FacilityPOP = sequelize.define('FacilityPOP', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Título do POP'
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Código único do POP (ex: POP-001)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Descrição detalhada do procedimento'
  },
  category: {
    type: DataTypes.ENUM('limpeza', 'higiene', 'desinfeccao', 'manutencao', 'seguranca'),
    allowNull: false,
    comment: 'Categoria do procedimento'
  },
  priority: {
    type: DataTypes.ENUM('baixa', 'media', 'alta', 'critica'),
    defaultValue: 'media',
    comment: 'Prioridade do procedimento'
  },
  frequency: {
    type: DataTypes.ENUM('diaria', 'semanal', 'quinzenal', 'mensal', 'trimestral', 'semestral', 'anual', 'sob_demanda'),
    allowNull: false,
    comment: 'Frequência de execução'
  },
  estimated_duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duração estimada em minutos'
  },
  required_materials: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Lista de materiais necessários'
  },
  safety_requirements: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Requisitos de segurança (EPIs, etc.)'
  },
  status: {
    type: DataTypes.ENUM('ativo', 'inativo', 'revisao'),
    defaultValue: 'ativo',
    comment: 'Status do POP'
  },
  version: {
    type: DataTypes.STRING(10),
    defaultValue: '1.0',
    comment: 'Versão do documento'
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usuário que criou o POP'
  },
  approved_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usuário que aprovou o POP'
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data de aprovação'
  },
  next_review_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data da próxima revisão'
  }
}, {
  tableName: 'facility_pops',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['code'] },
    { fields: ['category'] },
    { fields: ['status'] },
    { fields: ['created_by'] },
    { fields: ['frequency'] }
  ]
});

module.exports = FacilityPOP;