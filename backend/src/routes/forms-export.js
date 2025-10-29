const express = require('express')
const router = express.Router()
const { Form, FormSubmission } = require('../models')
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

    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument({ size: 'A4', margin: 40 })
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
    const drawSectionTitle = (title) => {
      ensureSpace(30)
      
      // Box com fundo e borda para o título
      const titleY = doc.y
      doc.save()
      
      // Fundo do título
      doc.fillColor('#F0F8FF').rect(PAGE.left, titleY, PAGE.right - PAGE.left, 24).fill()
      
      // Borda inferior com cor da marca
      doc.fillColor('#00AA66').rect(PAGE.left, titleY + 24, PAGE.right - PAGE.left, 3).fill()
      
      // Detalhe lateral esquerdo
      doc.fillColor('#003366').rect(PAGE.left, titleY, 5, 24).fill()
      
      doc.restore()
      
      // Texto do título
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#003366')
      doc.text(`▶  ${title}`, PAGE.left + 12, titleY + 7, { width: PAGE.right - PAGE.left - 20, align: 'left' })
      
      doc.fillColor('#000').font('Helvetica')
      doc.y = titleY + 32
    }
    const normalizeVal = (value) => (value === undefined || value === null || value === '' ? '—' : (Array.isArray(value) ? value.join(', ') : String(value)))
    const drawTable = (headers, rows, widths) => {
      const startX = PAGE.left
      const totalW = widths.reduce((a,b)=>a+b,0)
      // Remove linhas totalmente vazias
      const bodyRows = (rows || []).filter(cols => (cols || []).some(c => normalizeVal(c) !== '—'))
      if (!bodyRows.length) return
      // Header drawer com estilo Clean & Health
      const drawHeader = () => {
        ensureSpace(22)
        let yh = doc.y
        doc.save()
        
        // Fundo gradiente simulado do header
        doc.fillColor('#003366').rect(startX, yh, totalW, 18).fill()
        
        doc.restore()
        let xh = startX
        headers.forEach((h, idx) => {
          // Borda das células do header
          doc.strokeColor('#FFFFFF').lineWidth(0.5).rect(xh, yh, widths[idx], 18).stroke()
          
          // Texto do header em branco e negrito
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF').text(h, xh + 6, yh + 5, { width: widths[idx] - 12, align: 'left' })
          xh += widths[idx]
        })
        
        doc.fillColor('#000').strokeColor('#000').lineWidth(1).font('Helvetica')
        return yh + 18
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
      ensureSpace(140)
      
      // Título da seção com estilo Clean & Health
      doc.fontSize(13).fillColor('#003366').text('━━━━━━━━━━━━━━━  AUTENTICAÇÃO  ━━━━━━━━━━━━━━━', { align: 'center' })
      doc.fillColor('#000').moveDown(0.6)
      
      const boxW = ((PAGE.right - PAGE.left) / 2) - 15
      const boxH = 90
      const startY = doc.y
      
      pairs.forEach(({ label, key }, index) => {
        const xPos = index === 0 ? PAGE.left : (PAGE.left + boxW + 30)
        const yPos = startY
        
        // Moldura com sombra
        doc.save()
        doc.fillColor('#E0E0E0').rect(xPos + 2, yPos + 2, boxW, boxH).fill()
        doc.restore()
        
        // Moldura principal
        doc.lineWidth(1.5)
        doc.strokeColor('#003366')
        doc.rect(xPos, yPos, boxW, boxH).stroke()
        
        // Label com fundo colorido
        doc.fillColor('#003366').rect(xPos, yPos, boxW, 22).fill()
        doc.fontSize(9).fillColor('#FFFFFF').text(label, xPos + 4, yPos + 7, { width: boxW - 8, align: 'center' })
        
        // Área da assinatura
        const src = data[key]
        const imgPath = urlToLocalPath(src)
        
        if (imgPath === 'DATA_URL') {
          try {
            const base64 = (src || '').split(',')[1] || ''
            const buffer = Buffer.from(base64, 'base64')
            doc.image(buffer, xPos + 8, yPos + 28, { fit: [boxW - 16, boxH - 38], align: 'center', valign: 'center' })
          } catch (_) {
            doc.fontSize(9).fillColor('#999').text('⚠️ Erro ao carregar assinatura', xPos, yPos + boxH / 2, { width: boxW, align: 'center' })
          }
        } else if (imgPath && fs.existsSync(imgPath)) {
          try {
            doc.image(imgPath, xPos + 8, yPos + 28, { fit: [boxW - 16, boxH - 38], align: 'center', valign: 'center' })
          } catch (_) {
            doc.fontSize(9).fillColor('#999').text('⚠️ Erro ao carregar assinatura', xPos, yPos + boxH / 2, { width: boxW, align: 'center' })
          }
        } else {
          // Placeholder para assinatura não fornecida
          doc.fontSize(8).fillColor('#AAAAAA').text('____________________________', xPos, yPos + 50, { width: boxW, align: 'center' })
          doc.fontSize(9).fillColor('#888').text('Assinatura Pendente', xPos, yPos + 64, { width: boxW, align: 'center' })
        }
        
        // Linha de base para assinatura
        doc.strokeColor('#CCCCCC').lineWidth(0.5)
        doc.moveTo(xPos + 10, yPos + boxH - 8).lineTo(xPos + boxW - 10, yPos + boxH - 8).stroke()
        
        doc.fillColor('#000').strokeColor('#000')
      })
      
      doc.y = startY + boxH + 12
    }

    // Header
    doc.fontSize(16).fillColor('#003366').text(form.title, { underline: true })
    doc.fillColor('#000')
    doc.moveDown(0.5)
    doc.fontSize(10).text(`Enviado em: ${new Date(submission.created_at).toLocaleString('pt-BR')}`)
    doc.moveDown(0.5)

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
      // ============================================
      // CABEÇALHO PROFISSIONAL CLEAN & HEALTH
      // ============================================
      
      // Barra superior com gradiente simulado (3 barras)
      doc.save()
      doc.fillColor('#00AA66').rect(PAGE.left - 40, PAGE.top - 40, 595, 8).fill()
      doc.fillColor('#007744').rect(PAGE.left - 40, PAGE.top - 32, 595, 5).fill()
      doc.fillColor('#005533').rect(PAGE.left - 40, PAGE.top - 27, 595, 3).fill()
      doc.restore()
      
      // Box do cabeçalho com fundo
      doc.save()
      doc.fillColor('#F8F9FA').rect(PAGE.left, PAGE.top, PAGE.right - PAGE.left, 95).fill()
      doc.strokeColor('#00AA66').lineWidth(2).rect(PAGE.left, PAGE.top, PAGE.right - PAGE.left, 95).stroke()
      doc.restore()
      
      // Logo/Marca Clean & Health (simulada com texto estilizado)
      doc.fontSize(24).fillColor('#00AA66').font('Helvetica-Bold')
      doc.text('CLEAN & HEALTH', PAGE.left + 15, PAGE.top + 12, { width: 200 })
      
      doc.fontSize(9).fillColor('#555').font('Helvetica')
      doc.text('SOLUÇÕES INTELIGENTES EM HIGIENIZAÇÃO', PAGE.left + 15, PAGE.top + 40, { width: 200 })
      
      // Linha vertical separadora
      doc.save()
      doc.strokeColor('#00AA66').lineWidth(1.5)
      doc.moveTo(PAGE.left + 230, PAGE.top + 10).lineTo(PAGE.left + 230, PAGE.top + 85).stroke()
      doc.restore()
      
      // Título do documento
      doc.fontSize(16).fillColor('#003366').font('Helvetica-Bold')
      doc.text('CHECKLIST MESTRE', PAGE.left + 245, PAGE.top + 15, { width: 260, align: 'center' })
      
      doc.fontSize(14).fillColor('#00AA66').font('Helvetica-Bold')
      doc.text('DIAGNÓSTICO E VIABILIDADE', PAGE.left + 245, PAGE.top + 35, { width: 260, align: 'center' })
      
      // Badge do setor
      doc.save()
      doc.fillColor('#003366').roundedRect(PAGE.left + 290, PAGE.top + 58, 170, 22, 3).fill()
      doc.fontSize(11).fillColor('#FFFFFF').font('Helvetica-Bold')
      doc.text('🏨 SETOR: HOTELARIA', PAGE.left + 290, PAGE.top + 64, { width: 170, align: 'center' })
      doc.restore()
      
      // Informações de rodapé do cabeçalho
      doc.fontSize(7).fillColor('#666').font('Helvetica')
      doc.text(`Documento Confidencial | Emitido em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`, 
               PAGE.left + 15, PAGE.top + 82, { width: 500, align: 'left' })
      
      doc.fillColor('#000').font('Helvetica')
      doc.y = PAGE.top + 110

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
        
        // ============================================
        // CABEÇALHO DE SETOR - DESIGN ÚNICO
        // ============================================
        
        // Barra superior colorida
        doc.save()
        doc.fillColor('#00AA66').rect(PAGE.left - 40, PAGE.top - 40, 595, 5).fill()
        doc.restore()
        
        // Box do título do setor
        doc.save()
        doc.fillColor('#F8F9FA').rect(PAGE.left, PAGE.top, PAGE.right - PAGE.left, 50).fill()
        doc.strokeColor('#00AA66').lineWidth(2).rect(PAGE.left, PAGE.top, PAGE.right - PAGE.left, 50).stroke()
        
        // Número do setor (badge circular)
        doc.fillColor('#003366').circle(PAGE.left + 25, PAGE.top + 25, 18).fill()
        doc.fontSize(14).fillColor('#FFFFFF').font('Helvetica-Bold')
        doc.text(`${index + 1}`, PAGE.left + 18, PAGE.top + 18, { width: 14, align: 'center' })
        
        // Título do setor
        doc.fontSize(14).fillColor('#003366').font('Helvetica-Bold')
        doc.text(titulo, PAGE.left + 55, PAGE.top + 12, { width: 340, align: 'left' })
        
        // Ícone grande do setor
        doc.fontSize(28).fillColor('#00AA66')
        doc.text(icone, PAGE.right - 50, PAGE.top + 8, { width: 40, align: 'center' })
        
        doc.restore()
        doc.fillColor('#000').font('Helvetica')
        doc.y = PAGE.top + 60

        // Diagnóstico Atual
        doc.fontSize(12).fillColor('#006633').text('DIAGNÓSTICO DA SITUAÇÃO ATUAL')
        doc.fillColor('#000').moveDown(0.3)
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
        doc.fontSize(12).fillColor('#006633').text('TESTE DE PRODUTOS SMART')
        doc.fillColor('#000').moveDown(0.3)
        drawTable(['Item','Detalhes'], [
          ['Produto(s) Testado(s)', normalizeVal(data[`${prefix}_produto_smart`])],
          ['Diluição Aplicada', normalizeVal(data[`${prefix}_diluicao_smart`])],
          ['Superfície Testada', normalizeVal(data[`${prefix}_superficie_teste`])],
          ['Resultado do Teste', normalizeVal(data[`${prefix}_resultado_teste`])],
          ['Comparativo (Antes x Depois)', normalizeVal(data[`${prefix}_comparativo`])],
        ], [180, PAGE.right - PAGE.left - 180])

        // Avaliação e Viabilidade
        doc.moveDown(0.5)
        doc.fontSize(12).fillColor('#006633').text('AVALIAÇÃO E VIABILIDADE')
        doc.fillColor('#000').moveDown(0.3)
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
          doc.fontSize(11).fillColor('#333').text('Observações Adicionais:', { underline: true })
          doc.fontSize(10).fillColor('#000').text(normalizeVal(data[`${prefix}_observacoes`]), { width: PAGE.right - PAGE.left })
        }
      })

      // Página de Conclusão
      doc.addPage()
      drawSectionTitle('ANÁLISE CONSOLIDADA E RECOMENDAÇÕES')
      
      doc.fontSize(11).fillColor('#006633').text('OPORTUNIDADES IDENTIFICADAS')
      doc.fillColor('#000').fontSize(10).moveDown(0.3)
      drawTable(['Setor','Oportunidade','Estimativa de Economia Mensal'], [
        ['Setores Prioritários', normalizeVal(data['setores_prioritarios']), normalizeVal(data['economia_estimada'])],
      ], [200, 200, PAGE.right - PAGE.left - 400])

      doc.moveDown(0.5)
      doc.fontSize(11).fillColor('#006633').text('PROPOSTA DE VALOR SMART')
      doc.fillColor('#000').fontSize(10).moveDown(0.3)
      drawTable(['Item','Valor'], [
        ['Investimento Mensal Estimado', normalizeVal(data['investimento_mensal'])],
        ['Economia Mensal Estimada', normalizeVal(data['economia_mensal'])],
        ['ROI Esperado (meses)', normalizeVal(data['roi_meses'])],
        ['Benefícios Adicionais', normalizeVal(data['beneficios_adicionais'])],
      ], [220, PAGE.right - PAGE.left - 220])

      doc.moveDown(0.5)
      doc.fontSize(11).fillColor('#006633').text('PRÓXIMOS PASSOS')
      doc.fillColor('#000').fontSize(10).moveDown(0.3)
      const proximosPassos = normalizeVal(data['proximos_passos'])
      doc.text(proximosPassos, { width: PAGE.right - PAGE.left, align: 'justify' })

      doc.moveDown(0.5)
      doc.fontSize(11).fillColor('#006633').text('OBSERVAÇÕES FINAIS DO CONSULTOR')
      doc.fillColor('#000').fontSize(10).moveDown(0.3)
      const observacoesFinais = normalizeVal(data['observacoes_finais'])
      doc.text(observacoesFinais, { width: PAGE.right - PAGE.left, align: 'justify' })

      // ============================================
      // CLASSIFICAÇÃO DE VIABILIDADE - DESTAQUE
      // ============================================
      doc.moveDown(1)
      ensureSpace(100)
      
      const viabilidadeY = doc.y
      const viabilidadeGeral = normalizeVal(data['viabilidade_geral'])
      
      // Determinar cor e ícone baseado na viabilidade
      let corViabilidade, bgViabilidade, iconeViabilidade, textoStatus
      if (viabilidadeGeral.toLowerCase().includes('alta')) {
        corViabilidade = '#00AA00'
        bgViabilidade = '#E8F5E9'
        iconeViabilidade = '✅'
        textoStatus = 'ALTA VIABILIDADE'
      } else if (viabilidadeGeral.toLowerCase().includes('média')) {
        corViabilidade = '#FF8800'
        bgViabilidade = '#FFF3E0'
        iconeViabilidade = '⚠️'
        textoStatus = 'VIABILIDADE MÉDIA'
      } else {
        corViabilidade = '#CC0000'
        bgViabilidade = '#FFEBEE'
        iconeViabilidade = '❌'
        textoStatus = 'BAIXA VIABILIDADE'
      }
      
      // Box de destaque para viabilidade
      doc.save()
      doc.fillColor(bgViabilidade).rect(PAGE.left, viabilidadeY, PAGE.right - PAGE.left, 75).fill()
      doc.strokeColor(corViabilidade).lineWidth(3).rect(PAGE.left, viabilidadeY, PAGE.right - PAGE.left, 75).stroke()
      doc.restore()
      
      // Título
      doc.fontSize(11).fillColor('#555').font('Helvetica')
      doc.text('RESULTADO DA ANÁLISE:', PAGE.left + 15, viabilidadeY + 12, { width: PAGE.right - PAGE.left - 30, align: 'center' })
      
      // Status principal com ícone
      doc.fontSize(22).fillColor(corViabilidade).font('Helvetica-Bold')
      doc.text(`${iconeViabilidade}  ${textoStatus}`, PAGE.left + 15, viabilidadeY + 30, { width: PAGE.right - PAGE.left - 30, align: 'center' })
      
      // Descrição detalhada
      if (viabilidadeGeral !== '—' && viabilidadeGeral !== textoStatus) {
        doc.fontSize(9).fillColor('#666').font('Helvetica')
        doc.text(viabilidadeGeral, PAGE.left + 15, viabilidadeY + 58, { width: PAGE.right - PAGE.left - 30, align: 'center' })
      }
      
      doc.fillColor('#000').font('Helvetica')
      doc.y = viabilidadeY + 80

      // Assinaturas
      doc.moveDown(1)
      drawSignatures([
        { label: 'Assinatura do Consultor SMART', key: 'assinatura_consultor' },
        { label: 'Assinatura do Responsável do Hotel', key: 'assinatura_hotel' },
      ])

      // ============================================
      // RODAPÉ PROFISSIONAL CLEAN & HEALTH
      // ============================================
      doc.moveDown(1)
      ensureSpace(60)
      
      const footerY = doc.y
      
      // Linha decorativa superior
      doc.save()
      doc.fillColor('#00AA66').rect(PAGE.left, footerY, PAGE.right - PAGE.left, 2).fill()
      doc.restore()
      
      // Box do rodapé
      doc.save()
      doc.fillColor('#F8F9FA').rect(PAGE.left, footerY + 2, PAGE.right - PAGE.left, 45).fill()
      doc.strokeColor('#CCCCCC').lineWidth(0.5).rect(PAGE.left, footerY + 2, PAGE.right - PAGE.left, 45).stroke()
      doc.restore()
      
      // Conteúdo do rodapé
      doc.fontSize(8).fillColor('#003366').font('Helvetica-Bold')
      doc.text('🔒 DOCUMENTO CONFIDENCIAL', PAGE.left + 10, footerY + 10, { width: 200, align: 'left' })
      
      doc.fontSize(7).fillColor('#555').font('Helvetica')
      doc.text('Este relatório é propriedade da Clean & Health Soluções Inteligentes em Higienização.', 
               PAGE.left + 10, footerY + 22, { width: 500, align: 'left' })
      
      doc.fontSize(7).fillColor('#777')
      doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 
               PAGE.left + 10, footerY + 32, { width: 300, align: 'left' })
      
      // Informações de contato no rodapé
      doc.fontSize(7).fillColor('#00AA66').font('Helvetica-Bold')
      doc.text('🌐 www.chealth.com.br', PAGE.right - 150, footerY + 10, { width: 140, align: 'right' })
      
      doc.fontSize(7).fillColor('#003366')
      doc.text('📧 contato@chealth.com.br', PAGE.right - 150, footerY + 22, { width: 140, align: 'right' })
      doc.text('📱 (11) 0000-0000', PAGE.right - 150, footerY + 32, { width: 140, align: 'right' })
      
      doc.fillColor('#000').font('Helvetica')
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
