const express = require('express');
const router = express.Router();

// Upload simples base64 -> salva arquivo em disco local (dev)
router.post('/logo', (req, res) => {
  try {
    const { fileBase64, filename } = req.body || {}
    if (!fileBase64) return res.status(400).json({ error: 'Arquivo (base64) é obrigatório' })
    const safeName = (filename || `logo_${Date.now()}.png`).replace(/[^a-zA-Z0-9_.-]/g, '_')
    const buffer = Buffer.from(fileBase64.split(',').pop(), 'base64')
    const fs = require('fs')
    const path = require('path')
    // salvar em backend/public/uploads (caminho servido por estático)
    const dir = path.join(__dirname, '..', 'public', 'uploads')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const fullPath = path.join(dir, safeName)
    fs.writeFileSync(fullPath, buffer)
    // URL absoluta do arquivo servido
    const host = req.get('host')
    const protocol = (req.headers['x-forwarded-proto'] || req.protocol || 'http')
    const absoluteUrl = `${protocol}://${host}/static/uploads/${safeName}`
    return res.json({ success: true, url: absoluteUrl })
  } catch (e) {
    return res.status(500).json({ error: 'Falha no upload' })
  }
})

module.exports = router;
 
// Upload de evidências (fotos/áudios/PDF) em base64
router.post('/evidence', (req, res) => {
  try {
    const { fileBase64, filename } = req.body || {}
    if (!fileBase64) return res.status(400).json({ error: 'Arquivo (base64) é obrigatório' })
    const safeName = (filename || `evidence_${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, '_')
    const buffer = Buffer.from((fileBase64.includes(',') ? fileBase64.split(',').pop() : fileBase64), 'base64')
    const fs = require('fs')
    const path = require('path')
    const dir = path.join(__dirname, '..', 'public', 'uploads')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    // preservar extensão se existir no filename
    const fullPath = path.join(dir, safeName)
    fs.writeFileSync(fullPath, buffer)
    const host = req.get('host')
    const protocol = (req.headers['x-forwarded-proto'] || req.protocol || 'http')
    const absoluteUrl = `${protocol}://${host}/static/uploads/${safeName}`
    return res.json({ success: true, url: absoluteUrl, filename: safeName })
  } catch (e) {
    return res.status(500).json({ error: 'Falha no upload' })
  }
})