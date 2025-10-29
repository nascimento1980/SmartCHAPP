const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const UserSession = sequelize.define('UserSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  token_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Hash do token JWT para identificação única'
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  device_info: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Informações do dispositivo e navegador'
  },
  location: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Localização geográfica aproximada'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  last_activity: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  login_method: {
    type: DataTypes.ENUM('password', 'invite', 'refresh'),
    defaultValue: 'password'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  ended_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  end_reason: {
    type: DataTypes.ENUM('logout', 'timeout', 'revoked', 'expired'),
    allowNull: true
  }
}, {
  tableName: 'user_sessions',
  timestamps: false,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['token_hash']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['last_activity']
    }
  ]
});

// Relacionamentos
UserSession.associate = function(models) {
  UserSession.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

// Métodos estáticos
// UserSession.createSession
UserSession.createSession = async function(userId, tokenHash, sessionInfo) {
  const ttlHours = parseInt(process.env.SESSION_TTL_HOURS || '168', 10);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  return await this.create({
    user_id: userId,
    token_hash: tokenHash,
    ip_address: sessionInfo.ip,
    user_agent: sessionInfo.userAgent,
    device_info: sessionInfo.deviceInfo,
    location: sessionInfo.location,
    expires_at: expiresAt,
    login_method: sessionInfo.loginMethod || 'password'
  });
};

UserSession.getActiveSessions = async function(userId) {
  return await this.findAll({
    where: {
      user_id: userId,
      is_active: true,
      expires_at: {
        [Op.gt]: new Date()
      }
    },
    order: [['last_activity', 'DESC']]
  });
};

UserSession.updateActivity = async function(tokenHash) {
  return await this.update(
    { last_activity: new Date() },
    { where: { token_hash: tokenHash, is_active: true } }
  );
};

UserSession.endSession = async function(tokenHash, reason = 'logout') {
  return await this.update(
    {
      is_active: false,
      ended_at: new Date(),
      end_reason: reason
    },
    { where: { token_hash: tokenHash } }
  );
};

UserSession.cleanExpiredSessions = async function() {
  return await this.update(
    {
      is_active: false,
      ended_at: new Date(),
      end_reason: 'expired'
    },
    {
      where: {
        is_active: true,
        expires_at: {
          [Op.lt]: new Date()
        }
      }
    }
  );
};

module.exports = UserSession;
