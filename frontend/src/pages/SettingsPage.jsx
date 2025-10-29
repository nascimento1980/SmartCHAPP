import React, { useEffect, useMemo, useState } from 'react'
import { Box, Tabs, Tab, Grid, TextField, Button, Paper, Typography, Avatar, Divider, MenuItem, Stack, FormControlLabel, Checkbox, CircularProgress } from '@mui/material'
import { Map } from '@mui/icons-material'
import api from '../services/api'
import PermissionsPanel from './PermissionsPanel'
import { useSnackbar } from 'notistack'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import CatalogManager from './components/CatalogManager'
import FormattedField from '../components/FormattedField'
import AddressFields from '../components/AddressFields'

import UserManagementPanel from '../components/UserManagementPanel'
import { removeFormatting, autoFormat } from '../utils/formatters'

const SettingsPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { permissions } = useAuth()

  const allowedTabs = useMemo(() => [
    { key: 'company', label: 'Dados da Empresa', perm: 'menu.settings' },
    permissions.includes('menu.settings.users') && { key: 'users', label: 'Usuários', perm: 'menu.settings.users' },
    permissions.includes('menu.settings.integrations') && { key: 'integrations', label: 'Integrações', perm: 'menu.settings.integrations' },
    permissions.includes('menu.settings.permissions') && { key: 'permissions', label: 'Permissões', perm: 'menu.settings.permissions' },
    { key: 'catalogs', label: 'Cadastros', perm: 'menu.settings' }
  ].filter(Boolean), [permissions])

  const getTabFromQuery = () => new URLSearchParams(location.search).get('tab') || (allowedTabs[0]?.key || 'company')
  const [tab, setTab] = useState(getTabFromQuery())

  useEffect(() => { setTab(getTabFromQuery()) }, [location.search, allowedTabs.length])

  const handleTabChange = (_, newKey) => {
    setTab(newKey)
    const params = new URLSearchParams(location.search)
    params.set('tab', newKey)
    navigate(`/settings?${params.toString()}`)
  }

  // Dados da empresa
  const [companyName, setCompanyName] = useState('')
  const [companyLegalName, setCompanyLegalName] = useState('')
  const [companyTaxId, setCompanyTaxId] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companySite, setCompanySite] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyNumber, setCompanyNumber] = useState('')
  const [companyComplement, setCompanyComplement] = useState('')
  const [companyNeighborhood, setCompanyNeighborhood] = useState('')
  const [companyCity, setCompanyCity] = useState('')
  const [companyState, setCompanyState] = useState('')
  const [companyZip, setCompanyZip] = useState('')
  const [companyLatitude, setCompanyLatitude] = useState('')
  const [companyLongitude, setCompanyLongitude] = useState('')
  const [companyLogo, setCompanyLogo] = useState('')
  const [companyLogoWhiteBg, setCompanyLogoWhiteBg] = useState('')
  const [companyLogoBlueBg, setCompanyLogoBlueBg] = useState('')
  const [companyLogoGreenBg, setCompanyLogoGreenBg] = useState('')
  const [companyLogoBlackBg, setCompanyLogoBlackBg] = useState('')
  const [companyPrimaryColor, setCompanyPrimaryColor] = useState('#2E7D32')
  const [companySecondaryColor, setCompanySecondaryColor] = useState('#1976D2')


  // Integrações (SMTP / WhatsApp)
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState(587)
  const [smtpSecure, setSmtpSecure] = useState(false)
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [smtpFrom, setSmtpFrom] = useState('')

  const { enqueueSnackbar } = useSnackbar()
  const [objectUrl, setObjectUrl] = useState('')

  const loadLogoPreview = async () => {
    try {
              const res = await api.get('/settings/company/logo', { responseType: 'arraybuffer' })
      const mime = res.headers['content-type'] || 'image/png'
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }))
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setObjectUrl(url)
      setCompanyLogo(url)
    } catch (e) {
      // ignora se não existir
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        console.log('🔄 Carregando configurações da empresa...');
        const { data } = await api.get('/settings/company')
        console.log('📊 Dados recebidos da API:', data);
        const c = data?.company || {}
        console.log('🏢 Configurações da empresa:', c);
        
        // Atualizar estados apenas se os dados existirem
        if (c.companyName !== undefined) setCompanyName(c.companyName);
        if (c.companyLegalName !== undefined) setCompanyLegalName(c.companyLegalName);
        if (c.companyTaxId !== undefined) setCompanyTaxId(c.companyTaxId);
        if (c.companyEmail !== undefined) setCompanyEmail(c.companyEmail);
        if (c.companyPhone !== undefined) setCompanyPhone(c.companyPhone);
        if (c.companySite !== undefined) setCompanySite(c.companySite);
        if (c.companyAddress !== undefined) setCompanyAddress(c.companyAddress);
        if (c.companyNumber !== undefined) setCompanyNumber(c.companyNumber);
        if (c.companyComplement !== undefined) setCompanyComplement(c.companyComplement);
        if (c.companyNeighborhood !== undefined) setCompanyNeighborhood(c.companyNeighborhood);
        if (c.companyCity !== undefined) setCompanyCity(c.companyCity);
        if (c.companyState !== undefined) setCompanyState(c.companyState);
        if (c.companyZip !== undefined) setCompanyZip(c.companyZip);
        if (c.companyLatitude !== undefined) setCompanyLatitude(c.companyLatitude);
        if (c.companyLongitude !== undefined) setCompanyLongitude(c.companyLongitude);
        if (c.companyPrimaryColor !== undefined) setCompanyPrimaryColor(c.companyPrimaryColor);
        if (c.companySecondaryColor !== undefined) setCompanySecondaryColor(c.companySecondaryColor);
        
        // Se há logo salva no banco, a URL deve apontar para endpoint binário
        if (c.logoMime) await loadLogoPreview()
        else if (c.companyLogo !== undefined) setCompanyLogo(c.companyLogo);
        
        console.log('✅ Configurações carregadas com sucesso');
      } catch (e) {
        console.error('❌ Erro ao carregar configurações:', e);
        enqueueSnackbar('Não foi possível carregar os dados da empresa', { variant: 'error' })
      }
      try {
        const { data: integ } = await api.get('/integrations/settings')
        const s = integ?.settings || {}
        setSmtpHost(s.smtp_host || '')
        setSmtpPort(s.smtp_port || 587)
        setSmtpSecure(Boolean(s.smtp_secure))
        setSmtpUser(s.smtp_user || '')
        setSmtpPass(s.smtp_pass ? '********' : '')
        setSmtpFrom(s.smtp_from || '')
      } catch {}
    }
    load()
  }, [])
  
  // Definir valores padrão se não houver dados carregados
  useEffect(() => {
    if (!companyName && !companyLegalName) {
      console.log('🏗️ Definindo valores padrão...');
      setCompanyName('Clean & Health Soluções');
      setCompanyLegalName('Clean & Health Soluções Ltda');
    }
  }, [companyName, companyLegalName]);

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingWhiteBg, setUploadingWhiteBg] = useState(false)
  const [uploadingBlueBg, setUploadingBlueBg] = useState(false)
  const [uploadingGreenBg, setUploadingGreenBg] = useState(false)
  const [uploadingBlackBg, setUploadingBlackBg] = useState(false)
  const [objectUrlWhiteBg, setObjectUrlWhiteBg] = useState('')
  const [objectUrlBlueBg, setObjectUrlBlueBg] = useState('')
  const [objectUrlGreenBg, setObjectUrlGreenBg] = useState('')
  const [objectUrlBlackBg, setObjectUrlBlackBg] = useState('')


  const handleSaveCompany = async () => {
    const companyData = {
      companyName,
      companyLegalName,
      companyTaxId: removeFormatting(companyTaxId),
      companyEmail,
      companyPhone: removeFormatting(companyPhone),
      companySite,
      companyAddress,
      companyNumber,
      companyComplement,
      companyNeighborhood,
      companyCity,
      companyState,
      companyZip: removeFormatting(companyZip),
      companyLatitude: companyLatitude ? String(companyLatitude) : '',
      companyLongitude: companyLongitude ? String(companyLongitude) : '',
      companyLogo,
      companyPrimaryColor,
      companySecondaryColor,
    };
    
    try {
      setSaving(true)
      console.log('💾 Salvando dados da empresa:', companyData);
      
      const response = await api.put('/settings/company', companyData);
      console.log('✅ Resposta do salvamento:', response.data);
      
      enqueueSnackbar('Dados da empresa salvos com sucesso', { variant: 'success' })
    } catch (e) {
      console.error('❌ Erro ao salvar dados da empresa:', e);
      console.error('❌ Detalhes do erro:', e.response?.data);
      console.error('❌ Dados enviados:', companyData);
      
      // Exibir cada detalhe de erro individualmente
      if (e.response?.data?.details && Array.isArray(e.response.data.details)) {
        console.error('❌ Detalhes de validação:');
        e.response.data.details.forEach((detail, idx) => {
          console.error(`   ${idx + 1}. ${JSON.stringify(detail)}`);
        });
      }
      
      const errorMsg = e.response?.data?.error || e.response?.data?.message || 'Falha ao salvar dados da empresa';
      const errorDetails = e.response?.data?.details ? ` - ${JSON.stringify(e.response.data.details)}` : '';
      enqueueSnackbar(errorMsg + errorDetails, { variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleUploadLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const toBase64 = (f) => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(f)
    })
    try {
      setUploading(true)
      const fileBase64 = await toBase64(file)
      // Salva logo diretamente no banco
      await api.post('/settings/company/logo', { fileBase64, filename: file.name })
      await loadLogoPreview()
      enqueueSnackbar('Logo carregada com sucesso', { variant: 'success' })
    } catch (err) {
      enqueueSnackbar('Falha ao carregar logo', { variant: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const handleUploadLogoWhiteBg = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const toBase64 = (f) => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(f)
    })
    try {
      setUploadingWhiteBg(true)
      const fileBase64 = await toBase64(file)
      await api.post('/settings/company/logo/white-bg', { fileBase64, filename: file.name })
      const res = await api.get('/settings/company/logo/white-bg', { responseType: 'arraybuffer' })
      const mime = res.headers['content-type'] || 'image/png'
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }))
      if (objectUrlWhiteBg) URL.revokeObjectURL(objectUrlWhiteBg)
      setObjectUrlWhiteBg(url)
      setCompanyLogoWhiteBg(url)
      enqueueSnackbar('Logo para fundo branco carregada', { variant: 'success' })
    } catch (err) {
      enqueueSnackbar('Falha ao carregar logo', { variant: 'error' })
    } finally {
      setUploadingWhiteBg(false)
    }
  }

  const handleUploadLogoBlueBg = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const toBase64 = (f) => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(f)
    })
    try {
      setUploadingBlueBg(true)
      const fileBase64 = await toBase64(file)
      await api.post('/settings/company/logo/blue-bg', { fileBase64, filename: file.name })
      const res = await api.get('/settings/company/logo/blue-bg', { responseType: 'arraybuffer' })
      const mime = res.headers['content-type'] || 'image/png'
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }))
      if (objectUrlBlueBg) URL.revokeObjectURL(objectUrlBlueBg)
      setObjectUrlBlueBg(url)
      setCompanyLogoBlueBg(url)
      enqueueSnackbar('Logo para fundo azul carregada', { variant: 'success' })
    } catch (err) {
      enqueueSnackbar('Falha ao carregar logo', { variant: 'error' })
    } finally {
      setUploadingBlueBg(false)
    }
  }

  const handleUploadLogoGreenBg = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const toBase64 = (f) => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(f)
    })
    try {
      setUploadingGreenBg(true)
      const fileBase64 = await toBase64(file)
      await api.post('/settings/company/logo/green-bg', { fileBase64, filename: file.name })
      const res = await api.get('/settings/company/logo/green-bg', { responseType: 'arraybuffer' })
      const mime = res.headers['content-type'] || 'image/png'
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }))
      if (objectUrlGreenBg) URL.revokeObjectURL(objectUrlGreenBg)
      setObjectUrlGreenBg(url)
      setCompanyLogoGreenBg(url)
      enqueueSnackbar('Logo para fundo verde carregada', { variant: 'success' })
    } catch (err) {
      enqueueSnackbar('Falha ao carregar logo', { variant: 'error' })
    } finally {
      setUploadingGreenBg(false)
    }
  }

  const handleUploadLogoBlackBg = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const toBase64 = (f) => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(f)
    })
    try {
      setUploadingBlackBg(true)
      const fileBase64 = await toBase64(file)
      await api.post('/settings/company/logo/black-bg', { fileBase64, filename: file.name })
      const res = await api.get('/settings/company/logo/black-bg', { responseType: 'arraybuffer' })
      const mime = res.headers['content-type'] || 'image/png'
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }))
      if (objectUrlBlackBg) URL.revokeObjectURL(objectUrlBlackBg)
      setObjectUrlBlackBg(url)
      setCompanyLogoBlackBg(url)
      enqueueSnackbar('Logo para fundo preto carregada', { variant: 'success' })
    } catch (err) {
      enqueueSnackbar('Falha ao carregar logo', { variant: 'error' })
    } finally {
      setUploadingBlackBg(false)
    }
  }





  const validateCoordinates = (lat, lon) => {
    const latNum = parseFloat(lat)
    const lonNum = parseFloat(lon)
    
    if (isNaN(latNum) || isNaN(lonNum)) {
      return false
    }
    
    // Latitude: -90 a 90
    if (latNum < -90 || latNum > 90) {
      return false
    }
    
    // Longitude: -180 a 180
    if (lonNum < -180 || lonNum > 180) {
      return false
    }
    
    return true
  }

  const handleCoordinateChange = (type, value) => {
    // Limpar caracteres não numéricos exceto ponto e vírgula
    const cleanValue = value.replace(/[^0-9.-]/g, '')
    
    if (type === 'latitude') {
      setCompanyLatitude(cleanValue)
    } else {
      setCompanyLongitude(cleanValue)
    }
  }

  const handleCoordinatePaste = (type, value) => {
    // Processar coordenadas coladas do Google Maps
    let processedValue = value
    
    // Remover espaços e caracteres especiais
    processedValue = processedValue.replace(/\s+/g, '')
    
    // Detectar formato de coordenadas do Google Maps (ex: -23.5505, -46.6333)
    if (processedValue.includes(',')) {
      const parts = processedValue.split(',')
      if (parts.length === 2) {
        const lat = parts[0].trim().replace(/[^0-9.-]/g, '')
        const lon = parts[1].trim().replace(/[^0-9.-]/g, '')
        
        // Validar se são coordenadas válidas
        if (lat && lon && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon))) {
          // Preencher ambos os campos
          setCompanyLatitude(lat)
          setCompanyLongitude(lon)
          enqueueSnackbar(`✅ Coordenadas coladas: ${lat}, ${lon}`, { variant: 'success' })
          return
        }
      }
    }
    
    // Se não for formato de coordenadas duplas, processar normalmente
    const cleanValue = processedValue.replace(/[^0-9.-]/g, '')
    
    if (type === 'latitude') {
      setCompanyLatitude(cleanValue)
    } else {
      setCompanyLongitude(cleanValue)
    }
  }

  const handleSaveSmtp = async () => {
    try {
      const payload = {
        smtp_host: smtpHost,
        smtp_port: Number(smtpPort),
        smtp_secure: Boolean(smtpSecure),
        smtp_user: smtpUser,
        smtp_pass: smtpPass && smtpPass !== '********' ? smtpPass : undefined,
        smtp_from: smtpFrom
      }
      
      const response = await api.put('/integrations/smtp', payload)
      enqueueSnackbar(response.data.message || 'SMTP salvo com sucesso', { variant: 'success' })
    } catch (e) {
      console.error('Erro ao salvar SMTP:', e)
      const errorMessage = e.response?.data?.error || e.response?.data?.details?.[0] || 'Falha ao salvar SMTP'
      enqueueSnackbar(errorMessage, { variant: 'error' })
    }
  }

  const handleTestSmtp = async () => {
    try {
      enqueueSnackbar('Testando conexão SMTP... Aguarde até 30 segundos', { variant: 'info' })
      const response = await api.post('/integrations/smtp/send-test', 
        { to: smtpSettings.smtp_from || 'test@example.com' },
        { timeout: 30000 } // 30 segundos para teste SMTP
      )
      enqueueSnackbar(response.data.message || 'Email de teste enviado com sucesso!', { variant: 'success' })
    } catch (e) {
      console.error('Erro teste SMTP:', e)
      
      if (e.code === 'ECONNABORTED') {
        enqueueSnackbar('Timeout: Servidor SMTP não respondeu em 30 segundos. Verifique host/porta.', { variant: 'error' })
      } else {
        const errorMessage = e.response?.data?.error || 'Teste SMTP falhou'
        const errorDetails = e.response?.data?.details || e.response?.data?.message
        
        if (errorDetails) {
          enqueueSnackbar(`${errorMessage}: ${errorDetails}`, { variant: 'error' })
        } else {
          enqueueSnackbar(errorMessage, { variant: 'error' })
        }
      }
    }
  }



  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Configurações</Typography>
      <Paper>
        <Tabs value={tab} onChange={handleTabChange} aria-label="tabs settings">
          {allowedTabs.map(t => (
            <Tab key={t.key} value={t.key} label={t.label} className={`tab tab-settings tab-${t.key}`} />
          ))}
        </Tabs>
        <Divider />
        <Box sx={{ p: 2 }}>
          {tab === 'company' && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Nome Fantasia" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Razão Social" value={companyLegalName} onChange={(e) => setCompanyLegalName(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormattedField 
                  type="email"
                  label="E-mail" 
                  value={companyEmail} 
                  onChange={setCompanyEmail}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormattedField 
                  type="phone"
                  label="Telefone" 
                  value={companyPhone} 
                  onChange={setCompanyPhone}
                  helperText="Telefone fixo ou celular"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Site" value={companySite} onChange={(e) => setCompanySite(e.target.value)} />
              </Grid>

              {/* Campos de Endereço com busca automática por CEP e CNPJ */}
              <AddressFields
                formData={{
                  cnpj: companyTaxId,
                  zipcode: companyZip,
                  address: companyAddress,
                  number: companyNumber,
                  complement: companyComplement,
                  neighborhood: companyNeighborhood,
                  city: companyCity,
                  state: companyState,
                  lat: companyLatitude,
                  lon: companyLongitude
                }}
                onChange={(data) => {
                  if (data.cnpj !== undefined) setCompanyTaxId(data.cnpj);
                  if (data.zipcode !== undefined) setCompanyZip(data.zipcode);
                  if (data.address !== undefined) setCompanyAddress(data.address);
                  if (data.number !== undefined) setCompanyNumber(data.number);
                  if (data.complement !== undefined) setCompanyComplement(data.complement);
                  if (data.neighborhood !== undefined) setCompanyNeighborhood(data.neighborhood);
                  if (data.city !== undefined) setCompanyCity(data.city);
                  if (data.state !== undefined) setCompanyState(data.state);
                  if (data.lat !== undefined) setCompanyLatitude(data.lat);
                  if (data.lon !== undefined) setCompanyLongitude(data.lon);
                }}
                showCnpj={true}
                variant="outlined"
              />

              {/* Logos para diferentes fundos */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Logos da Empresa</Typography>
                <Typography variant="caption" color="text.secondary">
                  Carregue diferentes versões da logo para usar em fundos de cores diferentes. A logo apropriada será automaticamente selecionada nos PDFs.
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField fullWidth label="Logo Principal (Legado)" value={companyLogo} onChange={(e) => setCompanyLogo(e.target.value)} disabled />
                  <Button variant="outlined" component="label" disabled={uploading}>{uploading ? 'Enviando...' : 'Carregar'}
                    <input type="file" accept="image/*" hidden onChange={handleUploadLogo} />
                  </Button>
                </Stack>
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Avatar src={companyLogo} variant="rounded" sx={{ width: 72, height: 72 }} />
                  <Typography variant="caption" color="text.secondary">Logo padrão (uso legado)</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Button variant="outlined" component="label" fullWidth disabled={uploadingWhiteBg} sx={{ height: 56 }}>
                  {uploadingWhiteBg ? 'Enviando...' : 'Logo para Fundo Branco (Colorida)'}
                  <input type="file" accept="image/*" hidden onChange={handleUploadLogoWhiteBg} />
                </Button>
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2, p: 1, bgcolor: '#FFFFFF', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Avatar src={companyLogoWhiteBg} variant="rounded" sx={{ width: 72, height: 72 }} />
                  <Typography variant="caption" color="text.secondary">Use logo colorida para fundo branco</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Button variant="outlined" component="label" fullWidth disabled={uploadingBlueBg} sx={{ height: 56 }}>
                  {uploadingBlueBg ? 'Enviando...' : 'Logo para Fundo Azul (Negativa)'}
                  <input type="file" accept="image/*" hidden onChange={handleUploadLogoBlueBg} />
                </Button>
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2, p: 1, bgcolor: companySecondaryColor || '#1976D2', borderRadius: 1 }}>
                  <Avatar src={companyLogoBlueBg} variant="rounded" sx={{ width: 72, height: 72 }} />
                  <Typography variant="caption" sx={{ color: '#FFFFFF' }}>Use logo branca/negativa para fundo azul</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Button variant="outlined" component="label" fullWidth disabled={uploadingGreenBg} sx={{ height: 56 }}>
                  {uploadingGreenBg ? 'Enviando...' : 'Logo para Fundo Verde (Negativa)'}
                  <input type="file" accept="image/*" hidden onChange={handleUploadLogoGreenBg} />
                </Button>
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2, p: 1, bgcolor: companyPrimaryColor || '#2E7D32', borderRadius: 1 }}>
                  <Avatar src={companyLogoGreenBg} variant="rounded" sx={{ width: 72, height: 72 }} />
                  <Typography variant="caption" sx={{ color: '#FFFFFF' }}>Use logo branca/negativa para fundo verde</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Button variant="outlined" component="label" fullWidth disabled={uploadingBlackBg} sx={{ height: 56 }}>
                  {uploadingBlackBg ? 'Enviando...' : 'Logo para Fundo Preto (Negativa)'}
                  <input type="file" accept="image/*" hidden onChange={handleUploadLogoBlackBg} />
                </Button>
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2, p: 1, bgcolor: '#000000', borderRadius: 1 }}>
                  <Avatar src={companyLogoBlackBg} variant="rounded" sx={{ width: 72, height: 72 }} />
                  <Typography variant="caption" sx={{ color: '#FFFFFF' }}>Use logo branca/negativa para fundo preto</Typography>
                </Box>
              </Grid>

              {/* Cores da empresa */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Cores da Marca</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField type="color" fullWidth label="Cor primária (Verde)" value={companyPrimaryColor} onChange={(e) => setCompanyPrimaryColor(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField type="color" fullWidth label="Cor secundária (Azul)" value={companySecondaryColor} onChange={(e) => setCompanySecondaryColor(e.target.value)} />
              </Grid>
               <Grid item xs={12}>
                 <Button
                   variant="contained"
                   onClick={handleSaveCompany}
                   disabled={saving}
                   className="action action-settings action-settings-update"
                 >
                   {saving ? 'Salvando...' : 'Salvar dados da empresa'}
                 </Button>
               </Grid>
            </Grid>
          )}

          {tab === 'users' && (
            <UserManagementPanel />
          )}

          {tab === 'integrations' && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1">SMTP (Email)</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Configure o servidor de email para envio de notificações e convites
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="field field-settings field-settings-smtp-host" />
              </Grid>
              <Grid item xs={6} md={2}>
                 <TextField fullWidth type="number" label="Porta" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className="field field-settings field-settings-smtp-port" />
              </Grid>
              <Grid item xs={6} md={2} sx={{ display: 'flex', alignItems: 'center' }}>
                 <FormControlLabel className="field field-settings field-settings-smtp-secure" control={<Checkbox checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} />} label="Seguro (SSL/TLS)" />
              </Grid>
              <Grid item xs={12} md={4}>
                 <TextField fullWidth label="Remetente (From)" placeholder="ex.: no-reply@empresa.com" value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} className="field field-settings field-settings-smtp-from" />
              </Grid>
              <Grid item xs={12} md={4}>
                 <TextField fullWidth label="Usuário" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} className="field field-settings field-settings-smtp-user" />
              </Grid>
              <Grid item xs={12} md={4}>
                 <TextField fullWidth type="password" label="Senha" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} className="field field-settings field-settings-smtp-pass" />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1}>
                   <Button variant="contained" onClick={handleSaveSmtp} className="action action-integrations action-integrations-update">Salvar SMTP</Button>
                   <Button variant="outlined" onClick={handleTestSmtp} className="action action-integrations action-integrations-test">Testar SMTP</Button>
                </Stack>
              </Grid>
              
              {/* Informações sobre servidores SMTP populares */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    📧 Servidores SMTP Populares
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        Gmail
                      </Typography>
                      <Typography variant="caption" display="block">
                        Host: smtp.gmail.com | Porta: 587 | Seguro: Não
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        ⚠️ Requer autenticação de 2 fatores e senha de app
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        Outlook/Hotmail
                      </Typography>
                      <Typography variant="caption" display="block">
                        Host: smtp-mail.outlook.com | Porta: 587 | Seguro: Não
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        ✅ Usar conta Microsoft normal
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        Yahoo
                      </Typography>
                      <Typography variant="caption" display="block">
                        Host: smtp.mail.yahoo.com | Porta: 587 | Seguro: Não
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        ⚠️ Requer senha de app específica
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        Provedor Local
                      </Typography>
                      <Typography variant="caption" display="block">
                        Host: smtp.provedor.com.br | Porta: 587 | Seguro: Não
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        🔧 Substitua pelo seu provedor de internet
                      </Typography>
                    </Grid>
                  </Grid>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, fontStyle: 'italic' }}>
                    💡 Dica: Para Gmail, ative a autenticação de 2 fatores e gere uma senha de app específica para o sistema
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle1">WhatsApp (futuro)</Typography>
                <Typography variant="caption" color="text.secondary">Integração com provedor (ex.: Meta Cloud, Z-API) — endpoints a configurar.</Typography>
              </Grid>
            </Grid>
          )}

          {tab === 'permissions' && (
            <PermissionsPanel />
          )}

          {tab === 'catalogs' && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1">Segmentos (Formulário de Leads)</Typography>
              </Grid>
              <CatalogManager type="segments" labels={{ add: 'Adicionar Segmento', placeholder: 'Nome do segmento' }} />

              <Grid item xs={12} sx={{ mt: 2 }}>
                <Divider />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1">Perfis (Tela Colaboradores)</Typography>
              </Grid>
              <CatalogManager type="role-profiles" labels={{ add: 'Adicionar Perfil', placeholder: 'Nome do perfil' }} />

              <Grid item xs={12} sx={{ mt: 2 }}>
                <Divider />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1">Departamentos (Tela Colaboradores)</Typography>
              </Grid>
              <CatalogManager type="departments" labels={{ add: 'Adicionar Departamento', placeholder: 'Nome do departamento' }} />
            </Grid>
          )}
        </Box>
      </Paper>


    </Box>
  )
}

export default SettingsPage


