const crypto = require('crypto');
const UAParser = require('ua-parser-js');
const { UserSession } = require('../models');
const { sequelize } = require('../config/database');
const { QueryTypes, Op } = require('sequelize');

class SessionService {
  
  /**
   * Cria um hash único para o token
   */
  static createTokenHash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Extrai informações do dispositivo e navegador
   */
  static parseDeviceInfo(userAgent) {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    
    return {
      browser: {
        name: result.browser.name || 'Unknown',
        version: result.browser.version || 'Unknown'
      },
      os: {
        name: result.os.name || 'Unknown',
        version: result.os.version || 'Unknown'
      },
      device: {
        type: result.device.type || 'desktop',
        model: result.device.model || 'Unknown',
        vendor: result.device.vendor || 'Unknown'
      },
      engine: {
        name: result.engine.name || 'Unknown',
        version: result.engine.version || 'Unknown'
      }
    };
  }

  /**
   * Obtém o IP do cliente considerando proxies
   */
  static getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '127.0.0.1';
  }

  /**
   * Cria uma nova sessão após login bem-sucedido
   */
  static async createSession(userId, token, req, loginMethod = 'password') {
    try {
      const tokenHash = this.createTokenHash(token);
      const userAgent = req.headers['user-agent'] || '';
      const ip = this.getClientIP(req);
      const deviceInfo = this.parseDeviceInfo(userAgent);

      // Informações da sessão
      const sessionInfo = {
        ip,
        userAgent,
        deviceInfo,
        loginMethod,
        location: null // TODO: Implementar geolocalização por IP se necessário
      };

      // Criar sessão no banco
      const session = await UserSession.createSession(userId, tokenHash, sessionInfo);

      console.log('✅ Nova sessão criada:', {
        userId,
        sessionId: session.id,
        ip,
        device: `${deviceInfo.browser.name} on ${deviceInfo.os.name}`,
        loginMethod
      });

      return session;
    } catch (error) {
      console.error('❌ Erro ao criar sessão:', error);
      throw error;
    }
  }

  /**
   * Atualiza a atividade da sessão
   */
  static async updateSessionActivity(token) {
    try {
      const tokenHash = this.createTokenHash(token);
      await UserSession.updateActivity(tokenHash);
    } catch (error) {
      console.error('❌ Erro ao atualizar atividade da sessão:', error);
    }
  }

  /**
   * Encerra uma sessão específica
   */
  static async endSession(token, reason = 'logout') {
    try {
      const tokenHash = this.createTokenHash(token);
      await UserSession.endSession(tokenHash, reason);
      
      console.log('✅ Sessão encerrada:', { tokenHash: tokenHash.substring(0, 8) + '...', reason });
    } catch (error) {
      console.error('❌ Erro ao encerrar sessão:', error);
    }
  }

  /**
   * Obtém sessões ativas de um usuário
   */
  static async getActiveSessions(userId) {
    try {
      return await UserSession.getActiveSessions(userId);
    } catch (error) {
      console.error('❌ Erro ao buscar sessões ativas:', error);
      return [];
    }
  }

  /**
   * Encerra todas as sessões de um usuário (exceto a atual)
   */
  static async endAllUserSessions(userId, currentToken, reason = 'revoked') {
    try {
      const currentTokenHash = this.createTokenHash(currentToken);
      const sessions = await UserSession.getActiveSessions(userId);
      
      let endedCount = 0;
      for (const session of sessions) {
        if (session.token_hash !== currentTokenHash) {
          await UserSession.endSession(session.token_hash, reason);
          endedCount++;
        }
      }

      console.log(`✅ ${endedCount} sessões encerradas para usuário ${userId}`);
      return endedCount;
    } catch (error) {
      console.error('❌ Erro ao encerrar todas as sessões:', error);
      throw error;
    }
  }

  /**
   * Limpa sessões expiradas (para ser executado periodicamente)
   */
  static async cleanExpiredSessions() {
    try {
      const result = await UserSession.cleanExpiredSessions();
      if (result[0] > 0) {
        console.log(`🧹 ${result[0]} sessões expiradas foram limpas`);
      }
      return result[0];
    } catch (error) {
      console.error('❌ Erro ao limpar sessões expiradas:', error);
      return 0;
    }
  }

  /**
   * Verifica se uma sessão é válida
   */
  static async isSessionValid(token) {
    try {
      const tokenHash = this.createTokenHash(token);
      const session = await UserSession.findOne({
        where: {
          token_hash: tokenHash,
          is_active: true,
          expires_at: {
            [Op.gt]: new Date()
          }
        }
      });

      return !!session;
    } catch (error) {
      console.error('❌ Erro ao verificar validade da sessão:', error);
      return false;
    }
  }

  /**
   * Obtém estatísticas das sessões de um usuário
   */
  static async getUserSessionStats(userId) {
    try {
      const [results] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_sessions,
          COUNT(CASE WHEN date(created_at) = date('now') THEN 1 END) as today_sessions,
          MAX(last_activity) as last_activity,
          COUNT(DISTINCT date(created_at)) as unique_days
        FROM user_sessions 
        WHERE user_id = ?
      `, {
        replacements: [userId],
        type: QueryTypes.SELECT
      });

      return results[0] || {
        total_sessions: 0,
        active_sessions: 0,
        today_sessions: 0,
        last_activity: null,
        unique_days: 0
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas de sessão:', error);
      return null;
    }
  }
}

module.exports = SessionService;
