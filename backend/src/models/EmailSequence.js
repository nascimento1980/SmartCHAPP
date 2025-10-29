const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmailSequence = sequelize.define('EmailSequence', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Nome da sequência (ex: Nurturing Condominios, Follow-up Hotelaria)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Segmento alvo
  target_segment: {
    type: DataTypes.ENUM(
      'condominios', 'hotelaria', 'restaurantes', 'escritorios',
      'industria', 'hospitais', 'escolas', 'shopping_centers',
      'cozinhas_industriais', 'todos'
    ),
    defaultValue: 'todos'
  },
  // Trigger que inicia a sequência
  trigger_event: {
    type: DataTypes.ENUM(
      'lead_created',
      'form_filled',
      'email_opened',
      'link_clicked',
      'meeting_scheduled',
      'deal_stage_changed',
      'manual'
    ),
    allowNull: false
  },
  // Status da sequência
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Emails da sequência
  emails: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array de emails com delay, subject, template, etc.'
  },
  // Configurações
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      send_time: '09:00', // Horário preferido
      timezone: 'America/Sao_Paulo',
      skip_weekends: true,
      stop_on_reply: true,
      stop_on_unsubscribe: true
    }
  },
  // Estatísticas
  stats: {
    type: DataTypes.JSON,
    defaultValue: {
      enrolled: 0,
      completed: 0,
      unsubscribed: 0,
      bounced: 0,
      replied: 0
    }
  }
}, {
  tableName: 'email_sequences',
  indexes: [
    {
      fields: ['target_segment']
    },
    {
      fields: ['trigger_event']
    },
    {
      fields: ['is_active']
    }
  ]
});

// Método para adicionar email à sequência
EmailSequence.prototype.addEmail = function(emailData) {
  const newEmail = {
    id: this.emails.length + 1,
    delay_days: emailData.delay_days || 0,
    delay_hours: emailData.delay_hours || 0,
    subject: emailData.subject,
    template: emailData.template,
    personalization: emailData.personalization || {},
    track_opens: emailData.track_opens !== false,
    track_clicks: emailData.track_clicks !== false
  };
  
  this.emails.push(newEmail);
  return this.save();
};

// Método para obter próximo email para envio
EmailSequence.prototype.getNextEmail = function(currentEmailIndex) {
  return this.emails[currentEmailIndex + 1] || null;
};

module.exports = EmailSequence;