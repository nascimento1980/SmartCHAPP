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
      ensureSpace(22)
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#003366')
      doc.text(title, PAGE.left, doc.y, { width: PAGE.right - PAGE.left, align: 'center' })
      doc.fillColor('#000').font('Helvetica')
      doc.moveDown(0.4)
    }
    const normalizeVal = (value) => (value === undefined || value === null || value === '' ? '—' : (Array.isArray(value) ? value.join(', ') : String(value)))
    const drawTable = (headers, rows, widths) => {
      const startX = PAGE.left
      const totalW = widths.reduce((a,b)=>a+b,0)
      // Remove linhas totalmente vazias
      const bodyRows = (rows || []).filter(cols => (cols || []).some(c => normalizeVal(c) !== '—'))
      if (!bodyRows.length) return
      // Header drawer
      const drawHeader = () => {
        ensureSpace(22)
        let yh = doc.y
        doc.save()
        doc.rect(startX, yh, totalW, 16).fill('#eef6fa')
        doc.restore()
        let xh = startX
        headers.forEach((h, idx) => {
          doc.rect(xh, yh, widths[idx], 16).stroke()
          doc.fontSize(10).fillColor('#003366').text(h, xh + 4, yh + 4, { width: widths[idx] - 8 })
          xh += widths[idx]
        })
        doc.fillColor('#000')
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
      ensureSpace(110)
      drawSectionTitle('Assinaturas')
      const boxW = (PAGE.right - PAGE.left - 20) / 2
      const boxH = 80
      let x = PAGE.left
      const y = doc.y
      const fetchToBuffer = (url) => new Promise((resolve, reject) => {
        try {
          const client = url.startsWith('https') ? https : http
          client.get(url, (res) => {
            if (res.statusCode !== 200) { resolve(null); return }
            const chunks = []
            res.on('data', (d) => chunks.push(d))
            res.on('end', () => resolve(Buffer.concat(chunks)))
          }).on('error', () => resolve(null))
        } catch (e) { resolve(null) }
      })

      pairs.forEach(async ({ label, key }) => {
        // moldura
        doc.rect(x, y, boxW, boxH).stroke()
        doc.fontSize(9).text(label, x + 4, y + 4, { width: boxW - 8, align: 'left' })
        const src = data[key]
        const imgPath = urlToLocalPath(src)
        if (imgPath === 'DATA_URL') {
          try {
            // converter data URL para buffer
            const base64 = (src || '').split(',')[1] || ''
            const buffer = Buffer.from(base64, 'base64')
            doc.image(buffer, x + 6, y + 16, { fit: [boxW - 12, boxH - 28], align: 'center', valign: 'center' })
          } catch (_) {}
        } else if (imgPath && fs.existsSync(imgPath)) {
          try {
            doc.image(imgPath, x + 6, y + 16, { fit: [boxW - 12, boxH - 28], align: 'center', valign: 'center' })
          } catch (_) {}
        } else {
          // última tentativa: baixar via HTTP
          const buf = await fetchToBuffer(src || '')
          if (buf) {
            try { doc.image(buf, x + 6, y + 16, { fit: [boxW - 12, boxH - 28], align: 'center', valign: 'center' }) } catch (_) {}
          } else {
            doc.fontSize(9).fillColor('#888').text('— assinatura não anexada —', x, y + boxH / 2 - 6, { width: boxW, align: 'center' })
            doc.fillColor('#000')
          }
        }
        x += boxW + 20
      })
      doc.y = y + boxH + 8
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

    // Renderização especial para Hotelaria
    if (form.title && form.title.toLowerCase().includes('hotelaria')) {
      // Cabeçalho do hotel
      drawSectionTitle('Cabeçalho')
      drawTable(['Campo','Valor'], [
        ['Hotel', data['hotel_nome']],
        ['Categoria', data['hotel_categoria']],
        ['Responsável Higienização', data['responsavel_hig']],
        ['Data da Visita', data['data_visita']],
      ], [150, PAGE.right - PAGE.left - 150])

      const setores = [
        'Seção 1 – Recepção 🏢',
        'Seção 2 – Quartos 🛏️',
        'Seção 3 – Banheiros 🚿',
        'Seção 4 – Restaurante 🍽️',
        'Seção 5 – Lavanderia 🧺',
        'Seção 6 – Piscina 🏊',
        'Seção 7 – SPA / Academia 💆‍♂️',
        'Seção 8 – Áreas de Lazer 🌳'
      ]
      setores.forEach((titulo, i) => {
        drawSectionTitle(titulo)
        const p = `setor_${i}`
        const headers = ['Item','Detalhes','Avaliação','Fornecedor Atual']
        const widths = [140, 200, 110, 85]
        const rows = [
          ['Produto(s) Testado(s)', data[`${p}_produto`], data[`${p}_resultado_teste`], data[`${p}_fornecedor_atual`]],
          ['Diluição(ões)', data[`${p}_diluicao`], data[`${p}_avaliacao_geral`], ''],
          ['Superfícies', data[`${p}_superficies`] || [], '', ''],
          ['Problemas Frequentes', data[`${p}_problemas`] || [], '', ''],
          ['Uso de Produtos Agressivos', data[`${p}_agressivos`], '', ''],
        ]
        drawTable(headers, rows, widths)
      })
      // Assinaturas hotelaria
      drawSignatures([
        { label: 'Técnico', key: 'assinatura_tecnico' },
        { label: 'Responsável do Hotel', key: 'assinatura_hotel' },
      ])
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
