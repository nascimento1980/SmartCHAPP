const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const Form = sequelize.define('Form', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [3, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.ENUM('audit', 'checklist', 'contact', 'technical_visit', 'other'),
    allowNull: false
  },
  fields: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      allow_anonymous: false,
      require_authentication: true,
      allow_file_upload: false,
      max_submissions: 0,
      active: true
    }
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'forms',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
  indexes: [
    {
      fields: ['category']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['created_at']
    }
  ],
  validate: {
    fieldsSchema() {
      if (this.fields != null && !Array.isArray(this.fields)) {
        throw new Error('fields deve ser um array');
      }
      if (Array.isArray(this.fields)) {
        for (const f of this.fields) {
          if (typeof f !== 'object' || f == null) {
            throw new Error('fields contém item inválido (esperado objeto)');
          }
          if (typeof f.name !== 'string' || !f.name.trim()) {
            throw new Error('field.name é obrigatório');
          }
          if (typeof f.label !== 'string' || !f.label.trim()) {
            throw new Error('field.label é obrigatório');
          }
          if (typeof f.type !== 'string' || !f.type.trim()) {
            throw new Error('field.type é obrigatório');
          }
        }
      }
      if (typeof this.settings !== 'object' || this.settings == null) {
        throw new Error('settings deve ser um objeto');
      }
      const s = this.settings;
      const bools = ['allow_anonymous','require_authentication','allow_file_upload','active'];
      for (const k of bools) {
        if (typeof s[k] !== 'boolean') throw new Error(`settings.${k} deve ser boolean`);
      }
      if (typeof s.max_submissions !== 'number') {
        throw new Error('settings.max_submissions deve ser número');
      }
    }
  }
})

module.exports = Form