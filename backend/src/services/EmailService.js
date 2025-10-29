const nodemailer = require('nodemailer');
const { IntegrationSetting } = require('../models');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
  }

  /**
   * Inicializa o transporter com as configurações SMTP
   */
  async initialize() {
    try {
      const settings = await IntegrationSetting.findByPk(1);
      
      if (!settings || !settings.smtp_host || !settings.smtp_user || !settings.smtp_pass) {
        console.warn('⚠️ Configurações SMTP não encontradas. Email service desabilitado.');
        this.isConfigured = false;
        return false;
      }

      this.transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: settings.smtp_port,
        secure: !!settings.smtp_secure, // true para 465, false para outras portas
        auth: {
          user: settings.smtp_user,
          pass: settings.smtp_pass
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000,
        tls: {
          rejectUnauthorized: false
        }
      });

      this.defaultFrom = settings.smtp_from || settings.smtp_user;
      this.isConfigured = true;
      
      console.log('✅ Email Service inicializado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao inicializar Email Service:', error.message);
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Verifica se o serviço está configurado
   */
  async ensureConfigured() {
    if (!this.isConfigured) {
      await this.initialize();
    }
    return this.isConfigured;
  }

  /**
   * Envia um email genérico
   * @param {Object} options - Opções do email
   * @param {string|string[]} options.to - Destinatário(s)
   * @param {string} options.subject - Assunto
   * @param {string} options.text - Corpo em texto simples
   * @param {string} options.html - Corpo em HTML
   * @param {string} options.from - Remetente (opcional)
   */
  async sendMail({ to, subject, text, html, from }) {
    if (!await this.ensureConfigured()) {
      throw new Error('Email service não está configurado. Configure o SMTP primeiro.');
    }

    try {
      const info = await this.transporter.sendMail({
        from: from || this.defaultFrom,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text,
        html: html || text
      });

      console.log('📧 Email enviado:', {
        messageId: info.messageId,
        to,
        subject
      });

      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      throw error;
    }
  }

  /**
   * Envia convite de colaboração
   */
  async sendCollaborationInvite({ to, inviterName, invitedUserName, planningDetails, acceptUrl }) {
    const subject = `🤝 Convite de Colaboração - ${inviterName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; padding: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🤝 Convite de Colaboração</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${invitedUserName}</strong>,</p>
            
            <p><strong>${inviterName}</strong> convidou você para colaborar em um planejamento de visitas.</p>
            
            <div class="details">
              <h3 style="margin-top: 0;">📋 Detalhes do Planejamento</h3>
              <p><strong>Período:</strong> ${planningDetails.period}</p>
              <p><strong>Tipo:</strong> ${planningDetails.type}</p>
              ${planningDetails.description ? `<p><strong>Descrição:</strong> ${planningDetails.description}</p>` : ''}
            </div>
            
            <p>Como colaborador, você poderá visualizar e acompanhar as visitas planejadas.</p>
            
            <div style="text-align: center;">
              <a href="${acceptUrl}" class="button">Aceitar Convite</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">Este convite expira em 7 dias. Se você não deseja colaborar, simplesmente ignore este email.</p>
          </div>
          <div class="footer">
            <p>CH SMART - Sistema de Gestão de Visitas</p>
            <p>Clean & Health Soluções</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Convite de Colaboração
      
      Olá ${invitedUserName},
      
      ${inviterName} convidou você para colaborar em um planejamento de visitas.
      
      Detalhes do Planejamento:
      - Período: ${planningDetails.period}
      - Tipo: ${planningDetails.type}
      ${planningDetails.description ? `- Descrição: ${planningDetails.description}` : ''}
      
      Acesse o link para aceitar: ${acceptUrl}
      
      Este convite expira em 7 dias.
      
      ---
      CH SMART - Sistema de Gestão de Visitas
      Clean & Health Soluções
    `;

    return await this.sendMail({ to, subject, text, html });
  }

  /**
   * Envia notificação de visita agendada
   */
  async sendVisitNotification({ to, userName, visitDetails }) {
    const subject = `📅 Visita Agendada - ${visitDetails.clientName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; padding: 20px; font-size: 12px; }
          .highlight { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📅 Nova Visita Agendada</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <p>Uma nova visita foi agendada para você:</p>
            
            <div class="details">
              <h3 style="margin-top: 0;">👤 ${visitDetails.clientName}</h3>
              <p><strong>📅 Data:</strong> ${visitDetails.date}</p>
              <p><strong>🕐 Horário:</strong> ${visitDetails.time}</p>
              <p><strong>📍 Local:</strong> ${visitDetails.address}</p>
              ${visitDetails.notes ? `<p><strong>📝 Observações:</strong> ${visitDetails.notes}</p>` : ''}
            </div>
            
            <div class="highlight">
              ⚠️ <strong>Lembre-se:</strong> Confirme sua presença e prepare os materiais necessários.
            </div>
          </div>
          <div class="footer">
            <p>CH SMART - Sistema de Gestão de Visitas</p>
            <p>Clean & Health Soluções</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Nova Visita Agendada
      
      Olá ${userName},
      
      Uma nova visita foi agendada para você:
      
      Cliente: ${visitDetails.clientName}
      Data: ${visitDetails.date}
      Horário: ${visitDetails.time}
      Local: ${visitDetails.address}
      ${visitDetails.notes ? `Observações: ${visitDetails.notes}` : ''}
      
      Lembre-se de confirmar sua presença e preparar os materiais necessários.
      
      ---
      CH SMART - Sistema de Gestão de Visitas
      Clean & Health Soluções
    `;

    return await this.sendMail({ to, subject, text, html });
  }

  /**
   * Envia email de teste
   */
  async sendTestEmail({ to }) {
    const subject = '✅ Teste de Configuração SMTP - CH SMART';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .success-box { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; padding: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✅ Teste de Email</h1>
          </div>
          <div class="content">
            <div class="success-box">
              <h2 style="margin-top: 0;">🎉 Configuração realizada com sucesso!</h2>
              <p>Se você recebeu este email, significa que sua configuração SMTP está funcionando perfeitamente.</p>
            </div>
            
            <p>O servidor de email está configurado e pronto para enviar notificações do sistema CH SMART.</p>
            
            <p><strong>Funcionalidades de email disponíveis:</strong></p>
            <ul>
              <li>📧 Convites de colaboração</li>
              <li>📅 Notificações de visitas agendadas</li>
              <li>🔔 Alertas e lembretes</li>
              <li>📊 Relatórios automáticos</li>
            </ul>
            
            <p>Data/Hora do teste: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
          <div class="footer">
            <p>CH SMART - Sistema de Gestão de Visitas</p>
            <p>Clean & Health Soluções</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Teste de Email - CH SMART
      
      Configuração realizada com sucesso!
      
      Se você recebeu este email, significa que sua configuração SMTP está funcionando perfeitamente.
      
      O servidor de email está configurado e pronto para enviar notificações do sistema CH SMART.
      
      Funcionalidades de email disponíveis:
      - Convites de colaboração
      - Notificações de visitas agendadas
      - Alertas e lembretes
      - Relatórios automáticos
      
      Data/Hora do teste: ${new Date().toLocaleString('pt-BR')}
      
      ---
      CH SMART - Sistema de Gestão de Visitas
      Clean & Health Soluções
    `;

    return await this.sendMail({ to, subject, text, html });
  }
}

// Exportar instância única (singleton)
module.exports = new EmailService();

