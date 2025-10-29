import React, { useEffect, useState } from 'react'
import { Box, Card, CardContent, Typography, Button, Grid, TextField, Select, MenuItem, InputLabel, FormControl, Checkbox, FormControlLabel, LinearProgress, Snackbar, Alert, IconButton, Chip, RadioGroup, Radio } from '@mui/material'
import { Assignment, UploadFile, PictureAsPdf, Share, Send } from '@mui/icons-material'
import api from '../services/api'
import native from '../utils/native'
import offlineDb from '../services/offlineDb'

// Util compartilhado em escopo de módulo (acessível pelo SignatureCapture)
const dataURLToFile = (dataUrl, filename) => {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) u8arr[n] = bstr.charCodeAt(n)
  return new File([u8arr], filename, { type: mime })
}

const SignatureCapture = ({ label, onUpload, hasValue }) => {
  const canvasRef = React.useRef(null)
  const drawing = React.useRef(false)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000'
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect()
      const touch = e.touches && e.touches[0]
      const x = (touch ? touch.clientX : e.clientX) - rect.left
      const y = (touch ? touch.clientY : e.clientY) - rect.top
      return { x, y }
    }
    const start = (e) => { drawing.current = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y) }
    const move = (e) => { if (!drawing.current) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke() }
    const end = () => { drawing.current = false }
    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', move)
    window.addEventListener('mouseup', end)
    canvas.addEventListener('touchstart', start, { passive: true })
    canvas.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', end)
    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', end)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
    }
  }, [])

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const save = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const file = dataURLToFile(dataUrl, `signature_${Date.now()}.png`)
    await onUpload(file, dataUrl)
  }

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1 }}>{label}</Typography>
      <Box sx={{ border: '1px solid #ccc', borderRadius: 1, width: '100%', maxWidth: 480 }}>
        <canvas ref={canvasRef} width={480} height={160} style={{ width: '100%', height: 160 }} />
      </Box>
      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
        <Button variant="outlined" onClick={clear}>Limpar</Button>
        <Button variant="contained" onClick={save}>Salvar Assinatura</Button>
        {hasValue && (<Chip label="Assinatura capturada" size="small" />)}
      </Box>
    </Box>
  )
}

const VisitFormsPanel = ({ visit }) => {
  const [forms, setForms] = useState([])
  const [selectedForm, setSelectedForm] = useState('')
  const [formDef, setFormDef] = useState(null)
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [lastSubmissionId, setLastSubmissionId] = useState('')
  const [emailTo, setEmailTo] = useState('')
  const panelRef = React.useRef(null)

  useEffect(() => {
    // init offline db
    offlineDb.init().catch(() => {})
    const fetchForms = async () => {
      try {
        setLoading(true)
        const [resTech, resChecklist] = await Promise.all([
          api.get('/forms?category=technical_visit'),
          api.get('/forms?category=checklist')
        ])
        const all = [...(resTech.data.forms || []), ...(resChecklist.data.forms || [])]
        setForms(all)
        offlineDb.saveForms(all).catch(() => {})
        return all
      } catch (e) {
        // fallback offline
        const cached = await offlineDb.getForms()
        if (cached.length) {
          setForms(cached)
          setSnackbar({ open: true, message: 'Offline: exibindo formulários em cache', severity: 'warning' })
          return cached
        } else {
          setSnackbar({ open: true, message: 'Erro ao carregar formulários', severity: 'error' })
          return []
        }
      } finally {
        setLoading(false)
      }
    }

    // carregar logo na montagem
    fetchForms()

    // refs para evitar rebind de listeners e re-seleções
    const formsRef = { current: [] }
    const selectedFormRef = { current: '' }
    const visitRef = { current: visit }

    // sincronizar refs
    const syncRefs = () => {
      formsRef.current = forms
      selectedFormRef.current = selectedForm
      visitRef.current = visit
    }
    syncRefs()

    const openListener = () => {
      if (panelRef.current) {
        try { panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch (_) {}
      }
      // evitar re-seleção se já há formulário selecionado
      if (selectedFormRef.current) return
      const list = formsRef.current || []
      if (!list.length) return
      const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}+/gu, '')
      const byTitle = (needle) => (list || []).find(f => norm(f.title).includes(norm(needle)))
      let preferred = null
      if (visitRef.current && (visitRef.current.type === 'comercial' || visitRef.current.type === 'diagnostico')) {
        preferred = byTitle('hotelaria') || byTitle('smart de higienizacao') || byTitle('smart de higienização')
      }
      if (!preferred) preferred = byTitle('nti nc100')
      if (!preferred && list && list[0] && list[0].id) preferred = list[0]
      if (preferred && preferred.id !== selectedFormRef.current) {
        handleSelect(preferred.id)
      }
    }
    window.addEventListener('visit:openForms', openListener)
    window.addEventListener('visitCheckinCompleted', openListener)
    return () => {
      window.removeEventListener('visit:openForms', openListener)
      window.removeEventListener('visitCheckinCompleted', openListener)
    }
  }, [])

  const handleSelect = async (id) => {
    try {
      setSelectedForm(id)
      setLoading(true)
      const res = await api.get(`/forms/${id}`)
      setFormDef(res.data)
      // inicializa valores e pré-preenche com dados da visita
      const init = {}
      ;(res.data.fields || []).forEach(f => {
        if (f.type === 'checkbox') init[f.name] = false
        else init[f.name] = ''
      })
      if (visit) {
        if (init['cliente'] !== undefined) init['cliente'] = visit.title || visit.client_name || ''
        if (init['local_instalacao'] !== undefined) init['local_instalacao'] = visit.address || ''
        if (init['data_instalacao'] !== undefined) init['data_instalacao'] = (visit.scheduled_date ? new Date(visit.scheduled_date).toISOString().slice(0,10) : '')
      }
      setValues(init)
    } catch (e) {
      setSnackbar({ open: true, message: 'Erro ao carregar formulário', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const uploadEvidenceAndGetUrl = async (fieldName, file) => {
    try {
      const b64 = await fileToBase64(file)
      const filename = `${fieldName}_${Date.now()}_${file.name}`
      const res = await api.post('/upload/evidence', { fileBase64: b64, filename })
      const url = res.data?.url
      return url
    } catch (e) {
      throw e
    }
  }

  const handleUploadEvidence = async (fieldName, file, dataUrlOverride) => {
    try {
      const url = await uploadEvidenceAndGetUrl(fieldName, file)
      setValues(prev => ({ ...prev, [fieldName]: dataUrlOverride || url }))
      setSnackbar({ open: true, message: 'Evidência anexada', severity: 'success' })
    } catch (e) {
      setSnackbar({ open: true, message: 'Falha ao anexar evidência', severity: 'error' })
    }
  }

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  // dataURLToFile moved to module scope

  const submitForm = async () => {
    try {
      if (!selectedForm) return
      setLoading(true)
      const payload = { form_id: selectedForm, data: values, notes: `Submetido a partir da visita ${visit?.id || ''}` }
      try {
        const res = await api.post(`/forms/${selectedForm}/submit`, payload)
        if (res?.data?.id) setLastSubmissionId(res.data.id)
        setSnackbar({ open: true, message: 'Formulário salvo com sucesso', severity: 'success' })
      } catch (e) {
        await offlineDb.queueSubmission(selectedForm, payload)
        setSnackbar({ open: true, message: 'Sem conexão. Enfileirado para envio.', severity: 'warning' })
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Erro ao submeter formulário', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const openPdf = async () => {
    try {
      if (!lastSubmissionId) return
      const res = await api.get(`/forms-export/submissions/${lastSubmissionId}/pdf`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (e) {
      setSnackbar({ open: true, message: 'Falha ao abrir PDF. Faça login novamente.', severity: 'error' })
    }
  }

  const sendEmail = async () => {
    try {
      if (!lastSubmissionId || !emailTo) {
        setSnackbar({ open: true, message: 'Informe um email válido', severity: 'warning' })
        return
      }
      setLoading(true)
      await api.post(`/forms-export/submissions/${lastSubmissionId}/email`, { to: emailTo })
      setSnackbar({ open: true, message: 'Email enviado', severity: 'success' })
    } catch (e) {
      setSnackbar({ open: true, message: 'Falha ao enviar email', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const shareWhatsApp = () => {
    const text = lastSubmissionId
      ? `Segue o checklist: ${window.location.origin}/api/forms-export/submissions/${lastSubmissionId}/pdf`
      : 'Checklist preenchido no CH SMART.'
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(wa, '_blank')
  }

  const renderField = (field) => {
    const commonProps = {
      fullWidth: true,
      value: values[field.name] ?? '',
      onChange: (e) => setValues(prev => ({ ...prev, [field.name]: e.target.value }))
    }
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'date':
      case 'textarea':
        return (
          <TextField
            {...commonProps}
            type={field.type === 'textarea' ? 'text' : field.type}
            label={field.label}
            multiline={field.type === 'textarea'}
            rows={field.type === 'textarea' ? 3 : 1}
            required={!!field.required}
          />
        )
      case 'select':
        return (
          <FormControl fullWidth>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={values[field.name] || ''}
              label={field.label}
              onChange={(e) => setValues(prev => ({ ...prev, [field.name]: e.target.value }))}
            >
              {(field.options || []).map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )
      case 'multiselect':
        return (
          <FormControl fullWidth>
            <InputLabel>{field.label}</InputLabel>
            <Select
              multiple
              value={Array.isArray(values[field.name]) ? values[field.name] : []}
              label={field.label}
              onChange={(e) => setValues(prev => ({ ...prev, [field.name]: e.target.value }))}
              renderValue={(selected) => (selected || []).join(', ')}
            >
              {(field.options || []).map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )
      case 'radio':
        return (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>{field.label}</Typography>
            <RadioGroup
              row
              value={values[field.name] || ''}
              onChange={(e) => setValues(prev => ({ ...prev, [field.name]: e.target.value }))}
            >
              {(field.options || []).map(opt => (
                <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />
              ))}
            </RadioGroup>
          </Box>
        )
      case 'checkbox':
        return (
          <FormControlLabel
            control={<Checkbox checked={!!values[field.name]} onChange={(e) => setValues(prev => ({ ...prev, [field.name]: e.target.checked }))} />}
            label={field.label}
          />
        )
      case 'file':
        return (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>{field.label}</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button component="label" variant="outlined" startIcon={<UploadFile />}>
                Anexar
                <input hidden type="file" onChange={(e) => e.target.files?.[0] && handleUploadEvidence(field.name, e.target.files[0])} />
              </Button>
              <Button variant="outlined" onClick={async () => {
                try {
                  const dataUrl = await native.takePhoto()
                  // converter para File apenas para manter o fluxo de upload
                  const res = await fetch(dataUrl)
                  const blob = await res.blob()
                  const file = new File([blob], `photo_${Date.now()}.png`, { type: blob.type || 'image/png' })
                  await handleUploadEvidence(field.name, file, dataUrl)
                } catch (err) {
                  setSnackbar({ open: true, message: 'Captura de foto cancelada/sem permissão', severity: 'warning' })
                }
              }}>Câmera</Button>
            </Box>
            {values[field.name] && (
              <Chip label="Anexo enviado" sx={{ ml: 1 }} size="small" />
            )}
          </Box>
        )
      case 'files':
        return (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>{field.label}</Typography>
            <Button component="label" variant="outlined" startIcon={<UploadFile />}>
              Anexar múltiplos
              <input hidden multiple type="file" onChange={async (e) => {
                try {
                  const files = Array.from(e.target.files || [])
                  const urls = []
                  for (const f of files) {
                    const url = await uploadEvidenceAndGetUrl(field.name, f)
                    urls.push(url)
                  }
                  setValues(prev => ({ ...prev, [field.name]: urls }))
                  setSnackbar({ open: true, message: `${urls.length} anexos enviados`, severity: 'success' })
                } catch (err) {
                  setSnackbar({ open: true, message: 'Falha ao anexar arquivos', severity: 'error' })
                }
              }} />
            </Button>
            {Array.isArray(values[field.name]) && values[field.name].length > 0 && (
              <Chip label={`${values[field.name].length} anexos`} sx={{ ml: 1 }} size="small" />
            )}
          </Box>
        )
      case 'signature':
        return (
          <SignatureCapture
            label={field.label}
            hasValue={!!values[field.name]}
            onUpload={(file, dataUrl) => handleUploadEvidence(field.name, file, dataUrl)}
          />
        )
      default:
        return null
    }
  }

  return (
    <Card variant="outlined" ref={panelRef}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Assignment color="primary" />
          <Typography variant="h6">Formulários da Visita</Typography>
        </Box>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Selecionar Formulário</InputLabel>
              <Select value={selectedForm} label="Selecionar Formulário" onChange={(e) => handleSelect(e.target.value)}>
                {forms.map(f => (
                  <MenuItem key={f.id} value={f.id}>{f.title}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {formDef && (() => {
          const fields = formDef.fields || []
          // Preservar ordem das seções conforme aparecem
          const sectionOrder = []
          const bySection = {}
          fields.forEach((f) => {
            const sec = f.section || 'Outros'
            if (!bySection[sec]) sectionOrder.push(sec)
            bySection[sec] = bySection[sec] || []
            bySection[sec].push(f)
          })
          return (
            <Grid container spacing={2}>
              {sectionOrder.map((sectionTitle) => (
                <Grid key={sectionTitle} item xs={12}>
                  <Box sx={{ mt: 2, mb: 1 }}>
                    <Typography variant="subtitle1" color="primary">{sectionTitle}</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    {bySection[sectionTitle].map((field) => (
                      <Grid key={field.name} item xs={12} md={field.type === 'textarea' ? 12 : 6}>
                        {renderField(field)}
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              ))}
            </Grid>
          )
        })()}

        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={submitForm} disabled={loading}>Salvar</Button>
          <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={openPdf} disabled={!lastSubmissionId || loading}>PDF</Button>
          <TextField
            size="small"
            placeholder="email@cliente.com"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <Button variant="outlined" startIcon={<Send />} onClick={sendEmail} disabled={!lastSubmissionId || loading}>Email</Button>
          <Button variant="outlined" startIcon={<Share />} onClick={shareWhatsApp} disabled={!lastSubmissionId}>WhatsApp</Button>
        </Box>

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  )
}

export default VisitFormsPanel


