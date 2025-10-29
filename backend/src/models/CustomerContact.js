const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CustomerContact = sequelize.define('CustomerContact', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Campos comuns
  company_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 200]
    }
  },
  contact_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  mobile: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  position: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  state: {
    type: DataTypes.STRING(2),
    allowNull: true
  },
  zipcode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  employees_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  segment_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'segments', key: 'id' }
  },
  segment: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'novo'
  },
  responsible_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  custom_fields: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Campo para diferenciar tipo
  type: {
    type: DataTypes.ENUM('lead', 'client'),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  
  // Campos específicos de leads
  source: {
    type: DataTypes.STRING(100),
    allowNull: true // obrigatório apenas para leads
  },
  priority: {
    type: DataTypes.ENUM('baixa', 'media', 'alta'),
    allowNull: true,
    defaultValue: 'media'
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  estimated_revenue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  next_contact_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Campos específicos de clientes
  cnpj: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  cpf: {
    type: DataTypes.STRING(15),
    allowNull: true
  },
  monthly_revenue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  credit_limit: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  payment_terms: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: '30 dias'
  },
  discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  next_visit_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_visit_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Datas de conversão e controle
  conversion_date: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'customer_contacts',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['segment']
    },
    {
      fields: ['segment_id']
    },
    {
      fields: ['responsible_id']
    },
    {
      fields: ['company_name']
    },
    {
      fields: ['email']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['type', 'status']
    }
  ],
  validate: {
    // Validações condicionais baseadas no tipo
    leadValidation() {
      if (this.type === 'lead' && !this.source) {
        throw new Error('Source é obrigatório para leads');
      }
    },
    clientValidation() {
      if (this.type === 'client' && !this.cnpj && !this.cpf) {
        throw new Error('CNPJ ou CPF é obrigatório para clientes');
      }
    }
  },
  hooks: {
    beforeCreate: (customerContact, options) => {
      // Lógica para conversão de lead para cliente
      if (customerContact.type === 'client') {
        customerContact.conversion_date = new Date();
      }
    },
    beforeUpdate: (customerContact, options) => {
      // Lógica para conversão de lead para cliente
      if (customerContact.changed('type') && customerContact.type === 'client' && !customerContact.conversion_date) {
        customerContact.conversion_date = new Date();
      }
    }
  }
});

// Métodos de instância
CustomerContact.prototype.toClientView = function() {
  const contact = this.toJSON();
  
  if (contact.type === 'client') {
    // Remover campos específicos de lead
    delete contact.source;
    delete contact.priority;
    delete contact.score;
    delete contact.estimated_revenue;
    delete contact.next_contact_date;
  } else {
    // Remover campos específicos de cliente
    delete contact.cnpj;
    delete contact.cpf;
    delete contact.monthly_revenue;
    delete contact.credit_limit;
    delete contact.payment_terms;
    delete contact.discount_percentage;
    delete contact.next_visit_date;
    delete contact.last_visit_date;
  }
  
  return contact;
};

CustomerContact.prototype.convertToClient = async function(clientData = {}) {
  if (this.type !== 'lead') {
    throw new Error('Apenas leads podem ser convertidos para clientes');
  }
  
  // Manter ID do lead original
  const leadId = this.id;
  
  // Atualizar para cliente
  await this.update({
    type: 'client',
    status: 'ativo',
    conversion_date: new Date(),
    ...clientData
  });
  
  return this;
};

// Métodos estáticos
CustomerContact.getLeads = function(options = {}) {
  return this.findAll({
    where: {
      type: 'lead',
      ...options.where
    },
    ...options
  });
};

CustomerContact.getClients = function(options = {}) {
  return this.findAll({
    where: {
      type: 'client',
      ...options.where
    },
    ...options
  });
};

CustomerContact.getByType = function(type, options = {}) {
  return this.findAll({
    where: {
      type,
      ...options.where
    },
    ...options
  });
};

module.exports = CustomerContact;

