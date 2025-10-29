const express = require('express');
const Joi = require('joi');
const nodemailer = require('nodemailer');
const { IntegrationSetting } = require('../models');
const auth = require('../middleware/auth');
const emailService = require('../services/EmailService');

const router = express.Router();

const smtpSchema = Joi.object({
  smtp_host: Joi.string().required(),
  smtp_port: Joi.number().required(),
  smtp_secure: Joi.boolean().default(false),
  smtp_user: Joi.string().required(),
  smtp_pass: Joi.string().optional(), // opcional em update (mantém existente)
  smtp_from: Joi.string().email().required()
})

router.get('/settings', auth, async (req, res, next) => {
  try {
    const s = await IntegrationSetting.findByPk(1)
    res.json({ settings: s || {} })
  } catch (e) { next(e) }
})

// Rota para obter servidores SMTP populares
router.get('/smtp/servers', auth, async (req, res, next) => {
  try {
    const popularServers = [
      {
        name: 'Gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        note: 'Requer autenticação de 2 fatores e senha de app'
      },
      {
        name: 'Outlook/Hotmail',
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        note: 'Usar conta Microsoft'
      },
      {
        name: 'Yahoo',
        host: 'smtp.mail.yahoo.com',
        port: 587,
        secure: false,
        note: 'Requer senha de app'
      },
      {
        name: 'Provedor Local',
        host: 'smtp.provedor.com.br',
        port: 587,
        secure: false,
        note: 'Substitua pelo seu provedor'
      }
    ]
    
    res.json({ 
      servers: popularServers,
      note: 'Configure a autenticação de acordo com seu provedor de email'
    })
  } catch (e) { next(e) }
})

router.put('/smtp', auth, async (req, res, next) => {
  try {
    const { error, value } = smtpSchema.validate(req.body, { abortEarly: false })
    if (error) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.details.map(d => d.message) 
      })
    }
    
    // Validações adicionais
    if (value.smtp_port < 1 || value.smtp_port > 65535) {
      return res.status(400).json({ 
        error: 'Porta inválida', 
        details: 'A porta deve estar entre 1 e 65535' 
      })
    }
    
    // Validar formato do host (deve ser um domínio válido ou IP)
    const hostRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$|^(\d{1,3}\.){3}\d{1,3}$/
    if (!hostRegex.test(value.smtp_host)) {
      return res.status(400).json({ 
        error: 'Host inválido', 
        details: 'Digite um domínio válido ou endereço IP' 
      })
    }
    
    let s = await IntegrationSetting.findByPk(1)
    
    // Se não existe registro, exigir senha
    if (!s && !value.smtp_pass) {
      return res.status(400).json({ 
        error: 'Senha SMTP obrigatória no primeiro cadastro' 
      })
    }
    
    if (!s) {
      s = await IntegrationSetting.create({ id: 1, ...value })
      res.json({ 
        success: true, 
        message: 'Configuração SMTP criada com sucesso',
        id: s.id
      })
    } else {
      // Manter senha atual se não enviada
      const payload = { ...value }
      if (!('smtp_pass' in value) || value.smtp_pass === undefined) {
        delete payload.smtp_pass
      }
      
      await s.update(payload)
      res.json({ 
        success: true, 
        message: 'Configuração SMTP atualizada com sucesso',
        id: s.id
      })
    }
  } catch (e) { 
    console.error('Erro ao salvar SMTP:', e)
    next(e) 
  }
})

// Testar conexão SMTP (sem enviar email)
router.post('/smtp/test', auth, async (req, res, next) => {
  try {
    const s = await IntegrationSetting.findByPk(1)
    if (!s) return res.status(400).json({ error: 'SMTP não configurado' })
    
    // Validar configurações básicas
    if (!s.smtp_host || !s.smtp_port || !s.smtp_user || !s.smtp_pass) {
      return res.status(400).json({ 
        error: 'Configuração SMTP incompleta', 
        details: 'Host, porta, usuário e senha são obrigatórios' 
      })
    }
    
    const transporter = nodemailer.createTransport({
      host: s.smtp_host,
      port: s.smtp_port,
      secure: !!s.smtp_secure,
      auth: { 
        user: s.smtp_user, 
        pass: s.smtp_pass 
      },
      // Timeouts mais generosos para diferentes tipos de servidor
      connectionTimeout: 15000,    // 15 segundos para conexão
      greetingTimeout: 15000,      // 15 segundos para greeting
      socketTimeout: 15000,        // 15 segundos para socket
      // Configurações adicionais para melhor compatibilidade
      tls: {
        rejectUnauthorized: false  // Aceitar certificados auto-assinados
      },
      // Fallback para diferentes tipos de conexão
      requireTLS: false,
      ignoreTLS: false
    })
    
    // Testar conexão com timeout personalizado
    const verifyPromise = transporter.verify()
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout: Servidor SMTP não respondeu em 15 segundos')), 15000)
    })
    
    await Promise.race([verifyPromise, timeoutPromise])
    
    res.json({ 
      ok: true, 
      message: 'Conexão SMTP estabelecida com sucesso',
      server: `${s.smtp_host}:${s.smtp_port}`
    })
    
  } catch (e) {
    console.error('Erro teste SMTP:', e)
    
    // Mapear erros comuns para mensagens mais claras
    let errorMessage = 'Falha na conexão SMTP'
    let errorCode = e?.code || 'UNKNOWN_ERROR'
    
    if (e?.code === 'ETIMEDOUT') {
      errorMessage = 'Timeout de conexão: Servidor SMTP não respondeu'
    } else if (e?.code === 'ECONNREFUSED') {
      errorMessage = 'Conexão recusada: Verifique host e porta'
    } else if (e?.code === 'EAUTH') {
      errorMessage = 'Falha na autenticação: Verifique usuário e senha'
    } else if (e?.code === 'ENOTFOUND') {
      errorMessage = 'Host não encontrado: Verifique o endereço do servidor'
    } else if (e?.message?.includes('Invalid login')) {
      errorMessage = 'Credenciais inválidas: Verifique usuário e senha'
    } else if (e?.message?.includes('Timeout')) {
      errorMessage = 'Timeout: Servidor SMTP não respondeu'
    }
    
    res.status(400).json({ 
      error: errorMessage, 
      message: e?.message, 
      code: errorCode,
      details: 'Verifique as configurações e tente novamente'
    })
  }
})

// Enviar email de teste
router.post('/smtp/send-test', auth, async (req, res, next) => {
  try {
    const { to } = req.body
    
    if (!to) {
      return res.status(400).json({ 
        error: 'Email de destino é obrigatório',
        details: 'Informe o email para onde deseja enviar o teste'
      })
    }
    
    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return res.status(400).json({ 
        error: 'Email inválido',
        details: 'Informe um endereço de email válido'
      })
    }
    
    // Forçar reinicialização do EmailService para usar configurações atualizadas
    await emailService.initialize()
    
    // Enviar email de teste
    const result = await emailService.sendTestEmail({ to })
    
    res.json({ 
      success: true, 
      message: `Email de teste enviado para ${to}`,
      messageId: result.messageId
    })
    
  } catch (e) {
    console.error('Erro ao enviar email de teste:', e)
    
    let errorMessage = 'Erro ao enviar email de teste'
    let errorDetails = ''
    
    if (e?.message?.includes('não está configurado')) {
      errorMessage = 'SMTP não configurado. Configure primeiro.'
    } else if (e?.code === 'EAUTH') {
      errorMessage = 'Falha na autenticação'
      errorDetails = 'Verifique usuário e senha do SMTP'
    } else if (e?.code === 'ECONNREFUSED') {
      errorMessage = 'Conexão recusada'
      errorDetails = 'Verifique host e porta. Servidor SMTP pode estar offline.'
    } else if (e?.code === 'ETIMEDOUT' || e?.code === 'ESOCKET') {
      errorMessage = 'Timeout na conexão'
      errorDetails = 'Servidor SMTP não respondeu. Verifique firewall/host/porta.'
    } else if (e?.code === 'ENOTFOUND') {
      errorMessage = 'Host não encontrado'
      errorDetails = 'Verifique o endereço do servidor SMTP'
    }
    
    res.status(400).json({ 
      error: errorMessage,
      message: e?.message,
      details: errorDetails || 'Verifique as configurações SMTP'
    })
  }
})

module.exports = router;


