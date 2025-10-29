const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FacilityEvidence = sequelize.define('FacilityEvidence', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  execution_step_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'facility_execution_steps',
      key: 'id'
    },
    comment: 'ID da etapa de execução'
  },
  type: {
    type: DataTypes.ENUM('foto', 'video', 'documento', 'assinatura'),
    allowNull: false,
    comment: 'Tipo de evidência'
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Caminho do arquivo'
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Nome original do arquivo'
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Tamanho do arquivo em bytes'
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Tipo MIME do arquivo'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Descrição da evidência'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Metadados adicionais (GPS, timestamp, etc.)'
  },
  uploaded_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usuário que fez o upload'
  }
}, {
  tableName: 'facility_evidences',
  timestamps: true,
  indexes: [
    { fields: ['execution_step_id'] },
    { fields: ['type'] },
    { fields: ['uploaded_by'] }
  ]
});

module.exports = FacilityEvidence;