const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Número sequencial do ticket
  ticket_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  // Tipo do ticket
  type: {
    type: DataTypes.ENUM(
      'support',
      'bug',
      'feature_request',
      'billing',
      'product_info',
      'complaint',
      'compliment'
    ),
    defaultValue: 'support'
  },
  // Prioridade
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  // Status
  status: {
    type: DataTypes.ENUM(
      'open',
      'in_progress',
      'waiting_customer',
      'resolved',
      'closed'
    ),
    defaultValue: 'open'
  },
  // Canal de origem
  channel: {
    type: DataTypes.ENUM('email', 'phone', 'chat', 'whatsapp', 'form', 'manual'),
    defaultValue: 'manual'
  },
  // Relacionamentos
  customer_contact_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'customer_contacts',
      key: 'id'
    }
  },
  assigned_to: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // Tempos de SLA
  first_response_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  closed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Satisfação do cliente (1-5)
  satisfaction_rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  satisfaction_comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Tags
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  // Dados customizados
  custom_fields: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'tickets',
  indexes: [
    {
      unique: true,
      fields: ['ticket_number']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['assigned_to']
    },
    {
      fields: ['customer_contact_id']
    },
    {
      fields: ['type']
    }
  ],
  hooks: {
    beforeCreate: async (ticket) => {
      // Gerar número sequencial do ticket
      const count = await Ticket.count();
      const year = new Date().getFullYear();
      ticket.ticket_number = `CH${year}${String(count + 1).padStart(6, '0')}`;
    }
  }
});

// Método para calcular tempo de primeira resposta
Ticket.prototype.calculateFirstResponseTime = function() {
  if (!this.first_response_at) return null;
  
  const created = new Date(this.created_at);
  const firstResponse = new Date(this.first_response_at);
  
  return Math.round((firstResponse - created) / (1000 * 60 * 60)); // em horas
};

// Método para calcular tempo de resolução
Ticket.prototype.calculateResolutionTime = function() {
  if (!this.resolved_at) return null;
  
  const created = new Date(this.created_at);
  const resolved = new Date(this.resolved_at);
  
  return Math.round((resolved - created) / (1000 * 60 * 60)); // em horas
};

// Método para verificar se está dentro do SLA
Ticket.prototype.isWithinSLA = function() {
  const slaHours = {
    'low': 48,
    'medium': 24,
    'high': 8,
    'urgent': 2
  };
  
  const maxHours = slaHours[this.priority];
  const hoursOpen = Math.round((new Date() - new Date(this.created_at)) / (1000 * 60 * 60));
  
  return hoursOpen <= maxHours;
};

module.exports = Ticket;