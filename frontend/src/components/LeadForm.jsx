import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'


const LeadForm = ({ open, onClose, lead = null, onSuccess }) => {
  const { user, isAuthenticated } = useAuth()
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    mobile: '',
    position: '',
    segment: '',
    source: '',
    priority: 'media',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    cnpj: '',
    website: '',
    notes: '',
    next_contact_date: '',
    responsible_id: user?.id || '',
    custom_fields: {},
    tags: []
  })
  const [loading, setLoading] = useState(false)
  const [loadingCep, setLoadingCep] = useState(false)
  const [loadingCnpj, setLoadingCnpj] = useState(false)
  const [catalogSegments, setCatalogSegments] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const loadSegments = async () => {
      try {
        const { data } = await api.get('/settings/catalogs/segments')
        setCatalogSegments(data.data || [])
      } catch {}
    }
    loadSegments()
    if (lead) {
      setFormData({
        ...lead,
        next_contact_date: lead.next_contact_date ? 
          new Date(lead.next_contact_date).toISOString().split('T')[0] : ''
      })
    } else {
      setFormData({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        mobile: '',
        position: '',
        segment: '',
        source: '',
        priority: 'media',
        address: '',
        city: '',
        state: '',
        zipcode: '',
        cnpj: '',
        website: '',
        notes: '',
        next_contact_date: '',
        responsible_id: user?.id || '',
        custom_fields: {},
        tags: []
      })
    }
  }, [lead, user])

  // Buscar dados do CEP
  const handleCepSearch = async () => {
    const cep = formData.zipcode?.replace(/\D/g, '')
    if (!cep || cep.length !== 8) {
      setError('CEP inválido. Digite apenas números.')
      return
    }

    setLoadingCep(true)
    setError('')

    try {
      const { data } = await api.get(`/external-data/cep/${cep}`)
      
      console.log('✅ Dados do CEP recebidos:', data)
      
      setFormData({
        ...formData,
        address: data.address || formData.address,
        city: data.city || formData.city,
        state: data.state || formData.state,
        zipcode: data.cep || formData.zipcode
      })
    } catch (error) {
      console.error('❌ Erro ao buscar CEP:', error)
      console.error('Detalhes:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
      setError(error.response?.data?.error || error.message || 'Erro ao buscar CEP')
    } finally {
      setLoadingCep(false)
    }
  }

  // Buscar dados do CNPJ
  const handleCnpjSearch = async () => {
    const cnpj = formData.cnpj?.replace(/\D/g, '')
    if (!cnpj || cnpj.length !== 14) {
      setError('CNPJ inválido. Digite 14 números.')
      return
    }

    setLoadingCnpj(true)
    setError('')

    try {
      const { data } = await api.get(`/external-data/cnpj/${cnpj}`)
      
      console.log('✅ Dados do CNPJ recebidos:', data)
      
      setFormData({
        ...formData,
        company_name: data.company_name || formData.company_name,
        email: data.email || formData.email,
        phone: data.phone || formData.phone,
        address: data.address + (data.number ? ', ' + data.number : '') || formData.address,
        city: data.city || formData.city,
        state: data.state || formData.state,
        zipcode: data.zipcode?.replace(/\D/g, '') || formData.zipcode,
        cnpj: data.cnpj || formData.cnpj
      })
    } catch (error) {
      console.error('❌ Erro ao buscar CNPJ:', error)
      console.error('Detalhes:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
      
      if (error.response?.status === 429) {
        setError('Limite de consultas excedido. Aguarde alguns minutos.')
      } else {
        setError(error.response?.data?.error || error.message || 'Erro ao buscar CNPJ')
      }
    } finally {
      setLoadingCnpj(false)
    }
  }

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validação de campos obrigatórios
    const errors = {};
    let isValid = true;

    if (!formData.company_name || formData.company_name.trim() === '') {
      errors.company_name = 'Nome da empresa é obrigatório';
      isValid = false;
    }

    if (!formData.contact_name || formData.contact_name.trim() === '') {
      errors.contact_name = 'Nome do contato é obrigatório';
      isValid = false;
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email inválido. Verifique o formato correto.';
      isValid = false;
    }

    if (formData.phone && !/^\(\d{2}\) \d{5}-\d{4}$/.test(formData.phone)) {
      errors.phone = 'Telefone inválido. Formato esperado: (XX) XXXXX-XXXX';
      isValid = false;
    }

    if (!isValid) {
      setError('Por favor, corrija os campos destacados.');
      setFormData({...formData, errors});
      setLoading(false);
      return;
    }
    
    setLoading(true)
    setError('')

    try {
      // Limpar campos vazios para evitar problemas de validação
      const dataToSend = {
        company_name: formData.company_name.trim(),
        contact_name: formData.contact_name.trim(),
        segment: formData.segment || 'outros',
        source: formData.source || 'outros',
        email: formData.email && formData.email.trim() !== '' ? formData.email.trim() : null,
        phone: formData.phone && formData.phone.trim() !== '' ? formData.phone.trim() : null,
        mobile: formData.mobile && formData.mobile.trim() !== '' ? formData.mobile.trim() : null,
        position: formData.position && formData.position.trim() !== '' ? formData.position.trim() : null,
        address: formData.address && formData.address.trim() !== '' ? formData.address.trim() : null,
        city: formData.city && formData.city.trim() !== '' ? formData.city.trim() : null,
        state: formData.state && formData.state.trim() !== '' ? formData.state.trim() : null,
        zipcode: formData.zipcode && formData.zipcode.trim() !== '' ? formData.zipcode.trim() : null,
        cnpj: formData.cnpj && formData.cnpj.trim() !== '' ? formData.cnpj.trim() : null,
        website: formData.website && formData.website.trim() !== '' ? formData.website.trim() : null,
        notes: formData.notes && formData.notes.trim() !== '' ? formData.notes.trim() : null,
        next_contact_date: formData.next_contact_date && formData.next_contact_date.trim() !== '' ? formData.next_contact_date.trim() : null,
        responsible_id: formData.responsible_id && formData.responsible_id.trim() !== '' ? formData.responsible_id.trim() : null,
        priority: formData.priority || 'media',
        status: formData.status || 'novo',
        score: formData.score || 0,
        type: 'lead'
      }
      

      



      

      
      // Remover campos que podem estar causando problemas
      delete dataToSend.custom_fields
      delete dataToSend.tags

      if (lead) {
        await api.patch(`/customer-contacts/${lead.id}`, dataToSend)
      } else {
        await api.post('/customer-contacts', dataToSend)
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao salvar lead:', error)
      console.error('Detalhes completos do erro:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      })
      
      // Montar mensagem de erro detalhada
      let errorMessage = 'Erro ao salvar lead: '
      
      if (error.response?.data?.error) {
        errorMessage += error.response.data.error
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message
      } else if (error.response?.data?.details) {
        errorMessage += error.response.data.details
      } else if (error.message) {
        errorMessage += error.message
      } else {
        errorMessage += 'Erro desconhecido'
      }
      
      // Adicionar detalhes extras se houver
      if (error.response?.data?.details && Array.isArray(error.response.data.details)) {
        errorMessage += '\n' + error.response.data.details.join('\n')
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const segments = [
    { value: 'Condomínios', label: 'Condomínios' },
    { value: 'Hotelaria', label: 'Hotelaria' },
    { value: 'Restaurantes', label: 'Restaurantes' },
    { value: 'Escritórios', label: 'Escritórios' },
    { value: 'Indústria', label: 'Indústria' },
    { value: 'Hospitais', label: 'Hospitais' },
    { value: 'Escolas', label: 'Escolas' },
    { value: 'Shopping Centers', label: 'Shopping Centers' },
    { value: 'Cozinhas Industriais', label: 'Cozinhas Industriais' },
    { value: 'Outros', label: 'Outros' }
  ]

  const sources = [
    { value: 'website', label: 'Website' },
    { value: 'indicacao', label: 'Indicação' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'feira_evento', label: 'Feira/Evento' },
    { value: 'cold_call', label: 'Cold Call' },
    { value: 'email_marketing', label: 'Email Marketing' },
    { value: 'google_ads', label: 'Google Ads' },
    { value: 'telemarketing', label: 'Telemarketing' },
    { value: 'outros', label: 'Outros' }
  ]

  const priorities = [
    { value: 'baixa', label: 'Baixa' },
    { value: 'media', label: 'Média' },
    { value: 'alta', label: 'Alta' },
    { value: 'urgente', label: 'Urgente' }
  ]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {lead ? 'Editar Lead' : 'Novo Lead'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nome da Empresa"
                name="company_name"
                value={formData.company_name || ''}
                onChange={handleChange('company_name')}
                required
                error={Boolean(formData.errors?.company_name)}
                helperText={formData.errors?.company_name}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nome do Contato"
                name="contact_name"
                value={formData.contact_name || ''}
                onChange={handleChange('contact_name')}
                required
                error={Boolean(formData.errors?.contact_name)}
                helperText={formData.errors?.contact_name}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange('email')}
                error={Boolean(formData.errors?.email)}
                helperText={formData.errors?.email}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefone"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange('phone')}
                error={Boolean(formData.errors?.phone)}
                helperText={formData.errors?.phone}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Website"
                className="field field-lead field-lead-website"
                value={formData.website}
                onChange={handleChange('website')}
                placeholder="https://exemplo.com"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="CNPJ"
                value={formData.cnpj || ''}
                onChange={handleChange('cnpj')}
                placeholder="00.000.000/0000-00"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleCnpjSearch}
                        disabled={loadingCnpj || !formData.cnpj}
                        edge="end"
                      >
                        {loadingCnpj ? <CircularProgress size={20} /> : <SearchIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                helperText="Digite o CNPJ e clique na lupa para buscar dados"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Segmento</InputLabel>
                <Select
                  value={formData.segment}
                  onChange={handleChange('segment')}
                  label="Segmento"
                >
                  {(catalogSegments.length > 0 ? catalogSegments : segments).map((s) => (
                    <MenuItem key={s.id || s.value} value={(s.name || s.label)}>
                      {s.name || s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Origem</InputLabel>
                <Select
                  value={formData.source}
                  onChange={handleChange('source')}
                  label="Origem"
                >
                  {sources.map((source) => (
                    <MenuItem key={source.value} value={source.value}>
                      {source.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={handleChange('priority')}
                  label="Prioridade"
                >
                  {priorities.map((priority) => (
                    <MenuItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Informações do Contato */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Informações do Contato
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome do Contato"
                className="field field-lead field-lead-contact-name"
                value={formData.contact_name}
                onChange={handleChange('contact_name')}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cargo"
                className="field field-lead field-lead-position"
                value={formData.position}
                onChange={handleChange('position')}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                className="field field-lead field-lead-email"
                value={formData.email}
                onChange={handleChange('email')}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Telefone"
                className="field field-lead field-lead-phone"
                value={formData.phone}
                onChange={handleChange('phone')}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Celular"
                className="field field-lead field-lead-mobile"
                value={formData.mobile}
                onChange={handleChange('mobile')}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Próximo Contato"
                type="date"
                className="field field-lead field-lead-next-contact-date"
                value={formData.next_contact_date}
                onChange={handleChange('next_contact_date')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>



            {/* Endereço */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Endereço
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Endereço"
                className="field field-lead field-lead-address"
                value={formData.address}
                onChange={handleChange('address')}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Cidade"
                className="field field-lead field-lead-city"
                value={formData.city}
                onChange={handleChange('city')}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Estado"
                className="field field-lead field-lead-state"
                value={formData.state}
                onChange={handleChange('state')}
                placeholder="SP"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="CEP"
                className="field field-lead field-lead-zipcode"
                value={formData.zipcode}
                onChange={handleChange('zipcode')}
                placeholder="00000-000"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleCepSearch}
                        disabled={loadingCep || !formData.zipcode}
                        edge="end"
                      >
                        {loadingCep ? <CircularProgress size={20} /> : <SearchIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                helperText="Digite o CEP e clique na lupa"
              />
            </Grid>

            {/* Observações */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Observações
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={4}
                className="field field-lead field-lead-notes"
                value={formData.notes}
                onChange={handleChange('notes')}
                placeholder="Digite observações sobre o lead..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
          >
            {loading ? 'Salvando...' : (lead ? 'Atualizar' : 'Criar')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default LeadForm
