const express = require('express')
const router = express.Router()
const { Form, FormSubmission, CompanySetting } = require('../models')
const EmailService = require('../services/EmailService')
const path = require('path')
const fs = require('fs')
const http = require('http')
const https = require('https')

// Exportação simples de submissão em PDF (HTML -> PDFKit mínimo)
router.get('/submissions/:id/pdf', async (req, res) => {
  try {
    const submission = await FormSubmission.findByPk(req.params.id)
    if (!submission) return res.status(404).json({ error: 'Submissão não encontrada' })
    const form = await Form.findByPk(submission.form_id)
    if (!form) return res.status(404).json({ error: 'Formulário não encontrado' })
    
    // Buscar TODAS as configurações da empresa
    const companySettings = await CompanySetting.findAll({
      where: {
        setting_key: [
          'companyName', 'companyLegalName', 'companyTaxId',
          'companyEmail', 'companyPhone', 'companySite',
          'companyAddress', 'companyNumber', 'companyComplement',
          'companyNeighborhood', 'companyCity', 'companyState', 'companyZip',
          'companyPrimaryColor', 'companySecondaryColor',
          'logoMime', 'logoData'
        ]
      }
    })
    
    const company = {}
    let logoBuffer = null
    companySettings.forEach(setting => {
      if (setting.setting_key === 'logoData' && setting.setting_value) {
        logoBuffer = Buffer.isBuffer(setting.setting_value) ? setting.setting_value : Buffer.from(setting.setting_value)
      } else {
        company[setting.setting_key] = setting.setting_value
      }
    })
    
    // Definir valores padrão se não existirem
    company.companyName = company.companyName || 'Clean & Health'
    company.companyPrimaryColor = company.companyPrimaryColor || '#00AA66'
    company.companySecondaryColor = company.companySecondaryColor || '#003366'
    
    // Montar endereço completo
    const addressParts = [
      company.companyAddress,
      company.companyNumber,
      company.companyComplement,
      company.companyNeighborhood,
      company.companyCity && company.companyState ? `${company.companyCity}/${company.companyState}` : (company.companyCity || company.companyState),
      company.companyZip ? `CEP: ${company.companyZip}` : null
    ].filter(Boolean)
    company.fullAddress = addressParts.join(', ')

    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 40,
      bufferPages: true
    })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="submission_${submission.id}.pdf"`)
    doc.pipe(res)

    // Helpers
    const PAGE = { left: 40, right: 555, top: 40, bottom: doc.page.height - 40 }
    const ensureSpace = (needed) => {
      if (doc.y + needed > PAGE.bottom) {
        doc.addPage()
        doc.y = PAGE.top
      }
    }
    const drawDivider = () => { ensureSpace(12); doc.moveDown(0.3); doc.moveTo(PAGE.left, doc.y).lineTo(PAGE.right, doc.y).stroke(); doc.moveDown(0.6) }
    
    // FUNÇÃO UNIVERSAL: Desenhar cabeçalho da empresa em qualquer página
    const drawCompanyHeader = (pageTitle = '') => {
      // Fundo verde no topo
      doc.save()
      doc.fillColor(company.companyPrimaryColor).rect(PAGE.left - 40, PAGE.top - 40, 595, 50).fill()
      doc.restore()
      
      // Logo ou nome da empresa
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, PAGE.left + 10, PAGE.top - 30, { width: 100, height: 35, fit: [100, 35] })
        } catch (err) {
          doc.font('Helvetica-Bold').fontSize(14).fillColor('#FFFFFF')
          doc.text(company.companyName, PAGE.left + 10, PAGE.top - 20)
        }
      } else {
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#FFFFFF')
        doc.text(company.companyName.toUpperCase(), PAGE.left + 10, PAGE.top - 20)
      }
      
      // Título da página (se fornecido)
      if (pageTitle) {
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF')
        doc.text(pageTitle, PAGE.left + 200, PAGE.top - 18, { width: 300 })
      }
      
      // Informações de contato no cabeçalho (lado direito)
      doc.font('Helvetica').fontSize(6).fillColor('#FFFFFF')
      let contactY = PAGE.top - 28
      
      if (company.companyTaxId) {
        doc.text(`CNPJ: ${company.companyTaxId}`, PAGE.right - 150, contactY, { width: 140, align: 'right' })
        contactY += 7
      }
      if (company.companyPhone) {
        doc.text(`Tel: ${company.companyPhone}`, PAGE.right - 150, contactY, { width: 140, align: 'right' })
        contactY += 7
      }
      if (company.companyEmail) {
        doc.text(company.companyEmail, PAGE.right - 150, contactY, { width: 140, align: 'right' })
      }
      
      // Resetar posição e cores
      doc.fillColor('#000000').font('Helvetica').fontSize(10)
      doc.y = PAGE.top + 15
    }
    
    // FUNÇÃO UNIVERSAL: Desenhar rodapé da empresa
    const drawCompanyFooter = () => {
      doc.moveDown(1)
      ensureSpace(60)
      
      const footerY = doc.y
      
      // Linha superior verde
      doc.save()
      doc.strokeColor(company.companyPrimaryColor).lineWidth(1)
      doc.moveTo(PAGE.left, footerY).lineTo(PAGE.right, footerY).stroke()
      doc.restore()
      
      // Nome da empresa
      doc.fontSize(8).fillColor('#333333').font('Helvetica-Bold')
      doc.text(company.companyName || 'Clean & Health', PAGE.left, footerY + 8, { width: PAGE.right - PAGE.left, align: 'center' })
      
      // Razão social e CNPJ
      doc.fontSize(6).fillColor('#666666').font('Helvetica')
      const legalInfo = []
      if (company.companyLegalName && company.companyLegalName !== company.companyName) {
        legalInfo.push(company.companyLegalName)
      }
      if (company.companyTaxId) {
        legalInfo.push(`CNPJ: ${company.companyTaxId}`)
      }
      if (legalInfo.length > 0) {
        doc.text(legalInfo.join(' - '), PAGE.left, footerY + 17, { width: PAGE.right - PAGE.left, align: 'center' })
      }
      
      // Endereço
      if (company.fullAddress) {
        doc.fontSize(6).fillColor('#999999')
        doc.text(company.fullAddress, PAGE.left, footerY + (legalInfo.length > 0 ? 25 : 17), { width: PAGE.right - PAGE.left, align: 'center' })
      }
      
      // Contatos
      const contactInfo = [
        company.companyPhone ? `Tel: ${company.companyPhone}` : null,
        company.companyEmail || null,
        company.companySite || null
      ].filter(Boolean).join(' | ')
      
      if (contactInfo) {
        doc.fontSize(6).fillColor('#666666')
        doc.text(contactInfo, PAGE.left, footerY + (company.fullAddress ? 33 : 25), { width: PAGE.right - PAGE.left, align: 'center' })
      }
      
      // Data de emissão
      doc.fontSize(6).fillColor('#999999')
      doc.text(`Documento Confidencial | Emitido em: ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 
               PAGE.left, footerY + 43, { width: PAGE.right - PAGE.left, align: 'center' })
      
      doc.fillColor('#000000').font('Helvetica').fontSize(10)
    }
    const drawSectionTitle = (title) => {
      ensureSpace(25)
      const titleY = doc.y
      
      // Linha superior
      doc.save()
      doc.strokeColor('#00AA66').lineWidth(2)
      doc.moveTo(PAGE.left, titleY).lineTo(PAGE.right, titleY).stroke()
      doc.restore()
      
      // Texto do título
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#003366')
      doc.text(title.toUpperCase(), PAGE.left, titleY + 6, { width: PAGE.right - PAGE.left })
      
      doc.fillColor('#000').font('Helvetica').fontSize(10)
      doc.y = titleY + 24
    }
    const normalizeVal = (value) => (value === undefined || value === null || value === '' ? '—' : (Array.isArray(value) ? value.join(', ') : String(value)))
    const drawTable = (headers, rows, widths) => {
      const startX = PAGE.left
      const totalW = widths.reduce((a,b)=>a+b,0)
      // Remove linhas totalmente vazias
      const bodyRows = (rows || []).filter(cols => (cols || []).some(c => normalizeVal(c) !== '—'))
      if (!bodyRows.length) return
      // Header drawer minimalista
      const drawHeader = () => {
        ensureSpace(20)
        let yh = doc.y
        doc.save()
        
        // Fundo cinza claro
        doc.fillColor('#F5F5F5').rect(startX, yh, totalW, 16).fill()
        
        doc.restore()
        let xh = startX
        headers.forEach((h, idx) => {
          // Borda
          doc.strokeColor('#CCCCCC').lineWidth(0.5).rect(xh, yh, widths[idx], 16).stroke()
          
          // Texto do header
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333')
          doc.text(h, xh + 4, yh + 4, { width: widths[idx] - 8 })
          xh += widths[idx]
        })
        
        doc.fillColor('#000').strokeColor('#000').lineWidth(1).font('Helvetica')
        return yh + 16
      }

      // First header
      let y = drawHeader()
      // Rows
      bodyRows.forEach((cols) => {
        // Measure row height
        let rowH = 16
        cols.forEach((c, i) => {
          const h = doc.heightOfString(normalizeVal(c), { width: widths[i] - 8, align: 'left' }) + 8
          if (h > rowH) rowH = h
        })
        // If row won't fit, add page and redraw header
        if (doc.y + rowH + 4 > PAGE.bottom) {
          doc.addPage(); doc.y = PAGE.top; y = drawHeader()
        }
        ensureSpace(rowH + 4)
        x = startX
        cols.forEach((c, i) => {
          doc.rect(x, y, widths[i], rowH).stroke()
          doc.fontSize(10).text(normalizeVal(c), x + 4, y + 4, { width: widths[i] - 8 })
          x += widths[i]
        })
        y += rowH
      })
      doc.y = y + 6
    }

    const urlToLocalPath = (maybeUrl) => {
      try {
        if (!maybeUrl || typeof maybeUrl !== 'string') return null
        // Data URL handled elsewhere
        if (maybeUrl.startsWith('data:image/')) return 'DATA_URL'
        const u = new URL(maybeUrl, 'http://localhost')
        let pth = u.pathname || ''
        // Remover prefixos /api ou /api/v1
        if (pth.startsWith('/api/v1/')) pth = pth.replace('/api/v1', '')
        else if (pth.startsWith('/api/')) pth = pth.replace('/api', '')
        // Mapear /static/* para /public/*
        if (pth.startsWith('/static/')) {
          return path.join(__dirname, '../../public', pth.replace('/static/', ''))
        }
        // Tentativa genérica para uploads
        if (pth.includes('/uploads/')) {
          const idx = pth.indexOf('/uploads/')
          const rel = pth.slice(idx)
          return path.join(__dirname, '../../public', rel)
        }
        return null
      } catch (_) {
        return null
      }
    }

    const drawSignatures = (pairs) => {
      ensureSpace(100)
      
      // Título simples
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333')
      doc.text('AUTENTICACAO', PAGE.left, doc.y, { align: 'center' })
      doc.moveDown(0.5)
      
      const boxW = ((PAGE.right - PAGE.left) / 2) - 20
      const boxH = 70
      const startY = doc.y
      
      pairs.forEach(({ label, key }, index) => {
        const xPos = index === 0 ? PAGE.left : (PAGE.left + boxW + 40)
        const yPos = startY
        
        // Moldura simples
        doc.save()
        doc.strokeColor('#CCCCCC').lineWidth(1)
        doc.rect(xPos, yPos, boxW, boxH).stroke()
        doc.restore()
        
        // Label
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#333333')
        doc.text(label, xPos + 5, yPos + 5, { width: boxW - 10 })
        
        // Área da assinatura
        const src = data[key]
        const imgPath = urlToLocalPath(src)
        
        if (imgPath === 'DATA_URL') {
          try {
            const base64 = (src || '').split(',')[1] || ''
            const buffer = Buffer.from(base64, 'base64')
            doc.image(buffer, xPos + 5, yPos + 18, { fit: [boxW - 10, boxH - 28] })
          } catch (_) {
            doc.fontSize(8).fillColor('#999999').text('Erro ao carregar', xPos, yPos + 35, { width: boxW, align: 'center' })
          }
        } else if (imgPath && fs.existsSync(imgPath)) {
          try {
            doc.image(imgPath, xPos + 5, yPos + 18, { fit: [boxW - 10, boxH - 28] })
          } catch (_) {
            doc.fontSize(8).fillColor('#999999').text('Erro ao carregar', xPos, yPos + 35, { width: boxW, align: 'center' })
          }
        } else {
          doc.fontSize(8).fillColor('#AAAAAA').text('_________________________', xPos, yPos + 40, { width: boxW, align: 'center' })
          doc.fontSize(7).fillColor('#888888').text('Pendente', xPos, yPos + 52, { width: boxW, align: 'center' })
        }
        
        // Linha de base
        doc.strokeColor('#CCCCCC').lineWidth(0.5)
        doc.moveTo(xPos + 5, yPos + boxH - 5).lineTo(xPos + boxW - 5, yPos + boxH - 5).stroke()
        
        doc.fillColor('#000000').strokeColor('#000000')
      })
      
      doc.y = startY + boxH + 10
    }

    // Header UNIVERSAL com identidade da empresa
    drawCompanyHeader()
    
    // Título do formulário
    doc.font('Helvetica-Bold').fontSize(14).fillColor(company.companySecondaryColor)
    doc.text(form.title, PAGE.left, doc.y, { align: 'center' })
    
    // Data de submissão
    doc.font('Helvetica').fontSize(8).fillColor('#999999')
    doc.text(`Enviado em: ${new Date(submission.created_at).toLocaleString('pt-BR')}`, PAGE.left, doc.y + 20, { align: 'right' })
    
    // Linha separadora
    doc.strokeColor(company.companyPrimaryColor).lineWidth(1)
    doc.moveTo(PAGE.left, doc.y + 30).lineTo(PAGE.right, doc.y + 30).stroke()
    
    doc.fillColor('#000000').font('Helvetica').fontSize(10)
    doc.y = doc.y + 40

    const data = submission.data || {}

    const drawTableHeader = (headers, x, y, widths) => {
      doc.fontSize(10).fillColor('#003366')
      headers.forEach((h, idx) => {
        doc.text(h, x + (widths.slice(0, idx).reduce((a,b)=>a+b,0)), y, { width: widths[idx], continued: false })
      })
      doc.fillColor('#000')
      doc.moveTo(x, y + 12).lineTo(x + widths.reduce((a,b)=>a+b,0), y + 12).stroke()
      return y + 16
    }

    const drawRow = (cols, x, y, widths) => {
      doc.fontSize(10)
      cols.forEach((c, idx) => {
        const text = Array.isArray(c) ? c.join(', ') : (c ?? '')
        doc.text(String(text), x + (widths.slice(0, idx).reduce((a,b)=>a+b,0)), y, { width: widths[idx] })
      })
      return y + 14
    }

    const renderSetor = (idx, titulo) => {
      let y = doc.y + 10
      doc.fontSize(12).fillColor('#003366').text(titulo)
      doc.fillColor('#000')
      const x = 40
      const widths = [140, 180, 100, 80]
      y = drawTableHeader(['Item','Detalhes','Avaliação','Fornecedor Atual'], x, y, widths)

      const g = (k) => data[k]
      const p = `setor_${idx}`
      y = drawRow(['Produto(s) Testado(s)', g(`${p}_produto`), g(`${p}_resultado_teste`), g(`${p}_fornecedor_atual`)], x, y, widths)
      y = drawRow(['Diluição(ões)', g(`${p}_diluicao`), g(`${p}_avaliacao_geral`), ''], x, y, widths)
      y = drawRow(['Superfícies', g(`${p}_superficies`) || [], '', ''], x, y, widths)
      y = drawRow(['Problemas Frequentes', g(`${p}_problemas`) || [], '', ''], x, y, widths)
      y = drawRow(['Uso de Produtos Agressivos', g(`${p}_agressivos`), '', ''], x, y, widths)
      doc.moveDown(0.5)
    }

    // Renderização especial para Hotelaria - CheckList Mestre de Diagnóstico e Viabilidade
    if (form.title && form.title.toLowerCase().includes('hotelaria')) {
      // Usar cabeçalho universal da empresa
      drawCompanyHeader()
      
      // Título do documento
      doc.font('Helvetica-Bold').fontSize(14).fillColor(company.companySecondaryColor)
      doc.text('CHECKLIST MESTRE DE DIAGNOSTICO E VIABILIDADE', PAGE.left, doc.y, { align: 'center' })
      
      doc.font('Helvetica').fontSize(11).fillColor('#666666')
      doc.text('Setor: Hotelaria', PAGE.left, doc.y + 20, { align: 'center' })
      
      // Linha separadora
      doc.strokeColor(company.companyPrimaryColor).lineWidth(1)
      doc.moveTo(PAGE.left, doc.y + 35).lineTo(PAGE.right, doc.y + 35).stroke()
      
      // Data de emissão
      doc.fontSize(8).fillColor('#999999')
      doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, PAGE.left, doc.y + 40, { align: 'right' })
      
      doc.fillColor('#000000').font('Helvetica').fontSize(10)
      doc.y = doc.y + 55

      // Informações do Hotel
      drawSectionTitle('INFORMAÇÕES DO ESTABELECIMENTO')
      drawTable(['Campo','Informação'], [
        ['Nome do Hotel', normalizeVal(data['hotel_nome'])],
        ['Categoria', normalizeVal(data['hotel_categoria'])],
        ['Endereço', normalizeVal(data['hotel_endereco'])],
        ['Contato Principal', normalizeVal(data['hotel_contato'])],
        ['Telefone', normalizeVal(data['hotel_telefone'])],
        ['E-mail', normalizeVal(data['hotel_email'])],
      ], [170, PAGE.right - PAGE.left - 170])

      // Informações da Visita
      drawSectionTitle('INFORMAÇÕES DA VISITA TÉCNICA')
      drawTable(['Campo','Informação'], [
        ['Data da Visita', normalizeVal(data['data_visita'])],
        ['Horário', normalizeVal(data['horario_visita'])],
        ['Consultor Responsável', normalizeVal(data['consultor_nome'])],
        ['Responsável pela Higienização', normalizeVal(data['responsavel_hig'])],
        ['Cargo do Responsável', normalizeVal(data['responsavel_cargo'])],
      ], [170, PAGE.right - PAGE.left - 170])

      // Estrutura do Hotel
      drawSectionTitle('ESTRUTURA DO HOTEL')
      drawTable(['Item','Quantidade'], [
        ['Total de Quartos', normalizeVal(data['total_quartos'])],
        ['Taxa de Ocupação Média', normalizeVal(data['taxa_ocupacao'])],
        ['Equipe de Limpeza', normalizeVal(data['equipe_limpeza'])],
        ['Turnos de Trabalho', normalizeVal(data['turnos_trabalho'])],
      ], [250, PAGE.right - PAGE.left - 250])

      // Fornecedor Atual
      drawSectionTitle('FORNECEDOR ATUAL DE PRODUTOS DE LIMPEZA')
      drawTable(['Item','Informação'], [
        ['Nome do Fornecedor', normalizeVal(data['fornecedor_atual'])],
        ['Tempo de Parceria', normalizeVal(data['tempo_parceria'])],
        ['Valor Mensal Aproximado', normalizeVal(data['valor_mensal'])],
        ['Nível de Satisfação (1-10)', normalizeVal(data['satisfacao_fornecedor'])],
        ['Principais Problemas', normalizeVal(data['problemas_fornecedor'])],
      ], [200, PAGE.right - PAGE.left - 200])

      // Setores para Diagnóstico - Layout Aprimorado
      const setores = [
        { titulo: 'SEÇÃO 1 – RECEPÇÃO E LOBBY', icone: '🏢', prefix: 'recepcao' },
        { titulo: 'SEÇÃO 2 – APARTAMENTOS/QUARTOS', icone: '🛏️', prefix: 'quartos' },
        { titulo: 'SEÇÃO 3 – BANHEIROS (Quartos)', icone: '🚿', prefix: 'banheiros' },
        { titulo: 'SEÇÃO 4 – RESTAURANTE E ÁREA DE ALIMENTAÇÃO', icone: '🍽️', prefix: 'restaurante' },
        { titulo: 'SEÇÃO 5 – COZINHA INDUSTRIAL', icone: '👨‍🍳', prefix: 'cozinha' },
        { titulo: 'SEÇÃO 6 – LAVANDERIA', icone: '🧺', prefix: 'lavanderia' },
        { titulo: 'SEÇÃO 7 – PISCINA E ÁREA EXTERNA', icone: '🏊', prefix: 'piscina' },
        { titulo: 'SEÇÃO 8 – SPA E ACADEMIA', icone: '💆‍♂️', prefix: 'spa' },
        { titulo: 'SEÇÃO 9 – ÁREAS COMUNS', icone: '🌳', prefix: 'areas_comuns' },
        { titulo: 'SEÇÃO 10 – ÁREAS DE SERVIÇO', icone: '🔧', prefix: 'areas_servico' }
      ]

      setores.forEach(({ titulo, icone, prefix }, index) => {
        doc.addPage()
        
        // Usar cabeçalho universal com título do setor
        drawCompanyHeader(`${index + 1}. ${titulo}`)

        // Diagnóstico Atual
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333')
        doc.text('DIAGNOSTICO DA SITUACAO ATUAL', PAGE.left, doc.y)
        doc.fillColor('#000000').font('Helvetica').moveDown(0.3)
        drawTable(['Item','Resposta/Observação'], [
          ['Produtos Utilizados Atualmente', normalizeVal(data[`${prefix}_produtos_atuais`])],
          ['Diluições Praticadas', normalizeVal(data[`${prefix}_diluicao_atual`])],
          ['Superfícies Predominantes', normalizeVal(data[`${prefix}_superficies`])],
          ['Frequência de Limpeza', normalizeVal(data[`${prefix}_frequencia`])],
          ['Problemas Identificados', normalizeVal(data[`${prefix}_problemas`])],
          ['Manchas Persistentes', normalizeVal(data[`${prefix}_manchas`])],
          ['Odores Residuais', normalizeVal(data[`${prefix}_odores`])],
          ['Uso de Produtos Agressivos', normalizeVal(data[`${prefix}_produtos_agressivos`])],
        ], [220, PAGE.right - PAGE.left - 220])

        // Teste de Produtos SMART
        doc.moveDown(0.5)
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333')
        doc.text('TESTE DE PRODUTOS SMART', PAGE.left, doc.y)
        doc.fillColor('#000000').font('Helvetica').moveDown(0.3)
        drawTable(['Item','Detalhes'], [
          ['Produto(s) Testado(s)', normalizeVal(data[`${prefix}_produto_smart`])],
          ['Diluição Aplicada', normalizeVal(data[`${prefix}_diluicao_smart`])],
          ['Superfície Testada', normalizeVal(data[`${prefix}_superficie_teste`])],
          ['Resultado do Teste', normalizeVal(data[`${prefix}_resultado_teste`])],
          ['Comparativo (Antes x Depois)', normalizeVal(data[`${prefix}_comparativo`])],
        ], [180, PAGE.right - PAGE.left - 180])

        // Avaliação e Viabilidade
        doc.moveDown(0.5)
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333')
        doc.text('AVALIACAO E VIABILIDADE', PAGE.left, doc.y)
        doc.fillColor('#000000').font('Helvetica').moveDown(0.3)
        drawTable(['Critério','Avaliação'], [
          ['Eficácia do Produto SMART', normalizeVal(data[`${prefix}_eficacia`])],
          ['Redução de Custos Estimada', normalizeVal(data[`${prefix}_reducao_custos`])],
          ['Melhoria de Produtividade', normalizeVal(data[`${prefix}_produtividade`])],
          ['Segurança e Sustentabilidade', normalizeVal(data[`${prefix}_sustentabilidade`])],
          ['Viabilidade de Implementação', normalizeVal(data[`${prefix}_viabilidade`])],
          ['Prioridade (Baixa/Média/Alta)', normalizeVal(data[`${prefix}_prioridade`])],
        ], [230, PAGE.right - PAGE.left - 230])

        // Observações do Setor
        if (data[`${prefix}_observacoes`]) {
          doc.moveDown(0.5)
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333')
          doc.text('Observacoes Adicionais:', PAGE.left, doc.y)
          doc.font('Helvetica').fontSize(9).fillColor('#000000')
          doc.text(normalizeVal(data[`${prefix}_observacoes`]), PAGE.left, doc.y + 2, { width: PAGE.right - PAGE.left })
        }
      })

      // Página de Conclusão
      doc.addPage()
      
      // Usar cabeçalho universal
      drawCompanyHeader('CONCLUSAO')
      
      drawSectionTitle('ANÁLISE CONSOLIDADA E RECOMENDAÇÕES')
      
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333')
      doc.text('OPORTUNIDADES IDENTIFICADAS', PAGE.left, doc.y)
      doc.fillColor('#000000').font('Helvetica').fontSize(9).moveDown(0.3)
      drawTable(['Setor','Oportunidade','Estimativa de Economia Mensal'], [
        ['Setores Prioritários', normalizeVal(data['setores_prioritarios']), normalizeVal(data['economia_estimada'])],
      ], [200, 200, PAGE.right - PAGE.left - 400])

      doc.moveDown(0.5)
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333')
      doc.text('PROPOSTA DE VALOR SMART', PAGE.left, doc.y)
      doc.fillColor('#000000').font('Helvetica').fontSize(9).moveDown(0.3)
      drawTable(['Item','Valor'], [
        ['Investimento Mensal Estimado', normalizeVal(data['investimento_mensal'])],
        ['Economia Mensal Estimada', normalizeVal(data['economia_mensal'])],
        ['ROI Esperado (meses)', normalizeVal(data['roi_meses'])],
        ['Benefícios Adicionais', normalizeVal(data['beneficios_adicionais'])],
      ], [220, PAGE.right - PAGE.left - 220])

      doc.moveDown(0.5)
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333')
      doc.text('PROXIMOS PASSOS', PAGE.left, doc.y)
      doc.fillColor('#000000').font('Helvetica').fontSize(9).moveDown(0.3)
      const proximosPassos = normalizeVal(data['proximos_passos'])
      doc.text(proximosPassos, PAGE.left, doc.y, { width: PAGE.right - PAGE.left })

      doc.moveDown(0.5)
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333')
      doc.text('OBSERVACOES FINAIS DO CONSULTOR', PAGE.left, doc.y)
      doc.fillColor('#000000').font('Helvetica').fontSize(9).moveDown(0.3)
      const observacoesFinais = normalizeVal(data['observacoes_finais'])
      doc.text(observacoesFinais, PAGE.left, doc.y, { width: PAGE.right - PAGE.left })

      // CLASSIFICAÇÃO DE VIABILIDADE
      doc.moveDown(1)
      ensureSpace(50)
      
      const viabilidadeY = doc.y
      const viabilidadeGeral = normalizeVal(data['viabilidade_geral'])
      
      // Determinar cor baseado na viabilidade
      let corViabilidade
      if (viabilidadeGeral.toLowerCase().includes('alta')) {
        corViabilidade = '#00AA00'
      } else if (viabilidadeGeral.toLowerCase().includes('media')) {
        corViabilidade = '#FF8800'
      } else {
        corViabilidade = '#CC0000'
      }
      
      // Box simples
      doc.save()
      doc.strokeColor(corViabilidade).lineWidth(2)
      doc.rect(PAGE.left, viabilidadeY, PAGE.right - PAGE.left, 40).stroke()
      doc.restore()
      
      // Título
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333')
      doc.text('CLASSIFICACAO DE VIABILIDADE GERAL:', PAGE.left + 10, viabilidadeY + 8, { width: PAGE.right - PAGE.left - 20 })
      
      // Status principal
      doc.font('Helvetica-Bold').fontSize(14).fillColor(corViabilidade)
      doc.text(viabilidadeGeral, PAGE.left + 10, viabilidadeY + 22, { width: PAGE.right - PAGE.left - 20 })
      
      doc.fillColor('#000000').font('Helvetica').fontSize(10)
      doc.y = viabilidadeY + 50

      // Assinaturas
      doc.moveDown(1)
      drawSignatures([
        { label: 'Assinatura do Consultor SMART', key: 'assinatura_consultor' },
        { label: 'Assinatura do Responsável do Hotel', key: 'assinatura_hotel' },
      ])

      // Usar rodapé universal da empresa
      drawCompanyFooter()
    } else if (form.title && form.title.toLowerCase().includes('smart de higieniza')) {
      // Cabeçalho
      drawSectionTitle('Cabeçalho')
      drawTable(['Campo','Valor'], [
        ['Hotel / Cliente', data['cliente']],
        ['Categoria', data['tipo_cliente']],
        ['Responsável Higienização', data['responsavel']],
        ['Consultor', data['consultor']],
        ['Data', data['data']],
      ], [170, PAGE.right - PAGE.left - 170])

      // 1) Apresentação da Empresa
      drawSectionTitle('1) Apresentação da Empresa')
      drawTable(['Item','Valor'], [
        ['Apresentação Realizada?', data['apresentacao_realizada']],
        ['Grau de Interesse', data['grau_interesse']],
        ['Observações / Expectativas', data['observacoes_expectativas']],
      ], [220, PAGE.right - PAGE.left - 220])

      // 2) Diagnóstico da Situação Atual
      drawSectionTitle('2) Diagnóstico da Situação Atual')
      drawTable(['Item','Resposta','Aval./Conf.'], [
        ['Contrato vigente com outro fornecedor?', data['contrato_vigente'], ''],
        ['Satisfação com resultados atuais', data['satisfacao_atual'], data['satisfacao_atual_avaliacao']],
        ['Produtos atuais são biodegradáveis?', data['produtos_biodegradaveis'], data['produtos_biodegradaveis_conformidade']],
        ['Produtos atendem ANVISA/ABNT?', data['atende_normas'], data['atende_normas_conf']],
        ['Controle de diluição e treinamento', data['controle_diluicao'], data['controle_diluicao_conf']],
        ['Suporte técnico do fornecedor', data['suporte_tecnico'], data['suporte_tecnico_conf']],
        ['Custo-benefício percebido', data['custo_beneficio'], data['custo_beneficio_avaliacao']],
        ['Pontos fortes e fracos do fornecedor atual', data['fornecedor_pontos'], ''],
      ], [230, 140, PAGE.right - PAGE.left - 230 - 140])

      // 3) Oportunidades SMART
      drawSectionTitle('3) Identificação de Oportunidades SMART')
      drawTable(['Setor','Problema / Desafio','Oportunidade SMART','Avaliação'], [
        ['Recepção', data['recepcao_problema'], data['recepcao_oportunidade'], data['recepcao_avaliacao']],
        ['Áreas Comuns', data['areas_comuns_problema'], data['areas_comuns_oportunidade'], data['areas_comuns_avaliacao']],
        ['Banheiros', data['banheiros_problema'], data['banheiros_oportunidade'], data['banheiros_avaliacao']],
        ['Cozinha / Copa', data['cozinha_problema'], data['cozinha_oportunidade'], data['cozinha_avaliacao']],
        ['Lavanderia', data['lavanderia_problema'], data['lavanderia_oportunidade'], data['lavanderia_avaliacao']],
      ], [90, 150, 150, PAGE.right - PAGE.left - 90 - 150 - 150])

      // 4) Demonstração Técnica
      drawSectionTitle('4) Demonstração Técnica das Soluções SMART')
      drawTable(['Setor','Produto','Diluição','Resultado (Antes/Depois)','Avaliação'], [
        ['Banheiros', data['demo_banheiros_produto'], data['demo_banheiros_diluicao'], data['demo_banheiros_resultado'], data['demo_banheiros_avaliacao']],
        ['Cozinha', data['demo_cozinha_produto'], data['demo_cozinha_diluicao'], data['demo_cozinha_resultado'], data['demo_cozinha_avaliacao']],
      ], [70, 110, 90, 180, PAGE.right - PAGE.left - 70 - 110 - 90 - 180])

      // 5) Comparativo Técnico e Normativo
      drawSectionTitle('5) Comparativo Técnico e Normativo')
      drawTable(['Critério','Fornecedor Atual','Solução SMART','Observação'], [
        ['Biodegradável e sustentável', data['comp_biodegradavel_atual'], data['comp_biodegradavel_smart'], data['comp_biodegradavel_obs']],
        ['Atende normas ANVISA/ABNT', data['comp_normas_atual'], data['comp_normas_smart'], data['comp_normas_obs']],
        ['Versatilidade (multiuso)', data['comp_versatilidade_atual'], data['comp_versatilidade_smart'], data['comp_versatilidade_obs']],
        ['Alta performance / rendimento', data['comp_performance_atual'], data['comp_performance_smart'], data['comp_performance_obs']],
        ['Treinamento e suporte técnico', data['comp_treinamento_atual'], data['comp_treinamento_smart'], data['comp_treinamento_obs']],
      ], [150, 110, 110, PAGE.right - PAGE.left - 150 - 110 - 110])

      // 6) Avaliação Final do Cliente
      drawSectionTitle('6) Avaliação Final do Cliente')
      drawTable(['Pergunta','Resposta'], [
        ['Percebeu melhoria após demonstração?', data['final_melhoria']],
        ['Soluções atendem normas?', data['final_normas']],
        ['Grau geral de satisfação', data['final_satisfacao']],
        ['Interesse em proposta formal?', data['final_interesse_proposta']],
        ['Observações / próximos passos', data['final_observacoes']],
      ], [230, PAGE.right - PAGE.left - 230])
      // Assinaturas SMART
      drawSignatures([
        { label: 'Assinatura do Cliente', key: 'assinatura_cliente' },
        { label: 'Assinatura do Consultor', key: 'assinatura_consultor' },
      ])
    } else {
      // PDF GENÉRICO - Qualquer outro formulário
      Object.keys(data).forEach((k) => {
        const v = data[k]
        if (typeof v === 'string' && v.startsWith('http') && v.includes('/static/uploads/')) {
          doc.fontSize(12).text(`${k}:`)
          doc.fontSize(9).fillColor('#555').text(v)
          doc.fillColor('#000')
          doc.moveDown(0.5)
        } else {
          doc.fontSize(12).text(`${k}: ${typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : (v ?? '')}`)
        }
      })
      
      // Adicionar rodapé universal para PDFs genéricos também
      drawCompanyFooter()
    }

    doc.end()
  } catch (e) {
    res.status(500).json({ error: 'Falha ao gerar PDF' })
  }
})

// Enviar submissão por email simples (precisa SMTP configurado)
router.post('/submissions/:id/email', async (req, res) => {
  try {
    const submission = await FormSubmission.findByPk(req.params.id)
    if (!submission) return res.status(404).json({ error: 'Submissão não encontrada' })
    const form = await Form.findByPk(submission.form_id)
    if (!form) return res.status(404).json({ error: 'Formulário não encontrado' })

    const { to } = req.body || {}
    if (!to) return res.status(400).json({ error: 'Destinatário (to) é obrigatório' })

    const html = `
      <h2>${form.title}</h2>
      <p>Enviado em ${new Date(submission.created_at).toLocaleString('pt-BR')}</p>
      <pre style="font-family: monospace; white-space: pre-wrap">${JSON.stringify(submission.data, null, 2)}</pre>
    `

    await EmailService.sendMail({ to, subject: `Formulário: ${form.title}`, html, text: JSON.stringify(submission.data, null, 2) })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Falha ao enviar email' })
  }
})

module.exports = router
