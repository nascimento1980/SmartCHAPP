import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Alert,
  Snackbar,
  Avatar,
  Rating
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  Phone,
  Email,
  Business,
  Search,
  FilterList,
  Visibility,
  Star,
  StarBorder,
  Upload
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import CSVImportModal from '../components/CSVImportModal'


const ClientsPage = () => {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSegment, setFilterSegment] = useState('')
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [viewClient, setViewClient] = useState(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    segment: '',
    status: 'prospecto',
    monthly_value: '',
    rating: 0,
    address: '',
    city: '',
    state: '',
    zip_code: '',
    notes: '',
    responsible_id: user?.id || ''
  })

  const statusColors = {
    ativo: 'success',
    inativo: 'error',
    prospecto: 'warning',
    potencial: 'info'
  }

  const segmentLabels = {
    condominios: 'Condomínios',
    hotelaria: 'Hotelaria',
    restaurantes: 'Restaurantes',
    escritorios: 'Escritórios',
    industria: 'Indústria',
    hospitais: 'Hospitais',
    escolas: 'Escolas',
    shopping_centers: 'Shopping Centers',
    cozinhas_industriais: 'Cozinhas Industriais',
    outros: 'Outros'
  }

  useEffect(() => {
    fetchClients()
  }, [searchTerm, filterStatus, filterSegment])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filterStatus) params.append('status', filterStatus)
      if (filterSegment) params.append('segment', filterSegment)
      params.append('type', 'client')
      params.append('include', 'responsible')
      
      const response = await api.get(`/customer-contacts?${params.toString()}`)
      setClients(response.data.data || [])
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
      setSnackbar({
        open: true,
        message: 'Erro ao carregar clientes',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (clientId) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await api.delete(`/customer-contacts/${clientId}`)
        setSnackbar({
          open: true,
          message: 'Cliente excluído com sucesso',
          severity: 'success'
        })
        fetchClients()
      } catch (error) {
        setSnackbar({
          open: true,
          message: 'Erro ao excluir cliente',
          severity: 'error'
        })
      }
    }
  }

  const handleOpenDialog = (client = null) => {
    if (client) {
      setFormData({
        company_name: client.company_name || '',
        contact_name: client.contact_name || '',
        email: client.email || '',
        phone: client.phone || '',
        segment: client.segment || '',
        status: client.status || 'prospecto',
        monthly_value: client.monthly_value || '',
        rating: client.rating || 0,
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zip_code: client.zip_code || '',
        notes: client.notes || '',
        responsible_id: client.responsible_id || user?.id || ''
      })
      setSelectedClient(client)
    } else {
      setFormData({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        segment: '',
        status: 'prospecto',
        monthly_value: '',
        rating: 0,
        address: '',
        city: '',
        state: '',
        zip_code: '',
        notes: '',
        responsible_id: user?.id || ''
      })
      setSelectedClient(null)
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedClient(null)
    setFormData({
      company_name: '',
      contact_name: '',
      email: '',
      phone: '',
      segment: '',
      status: 'prospecto',
      monthly_value: '',
      rating: 0,
      address: '',
      city: '',
      state: '',
      zip_code: '',
      notes: '',
      responsible_id: user?.id || ''
    })
  }

  const handleSubmit = async () => {
    try {
      const clientData = {
        ...formData,
        type: 'client'
      }
      
      if (selectedClient) {
        await api.put(`/customer-contacts/${selectedClient.id}`, clientData)
        setSnackbar({
          open: true,
          message: 'Cliente atualizado com sucesso',
          severity: 'success'
        })
      } else {
        await api.post('/customer-contacts', clientData)
        setSnackbar({
          open: true,
          message: 'Cliente criado com sucesso',
          severity: 'success'
        })
      }
      handleCloseDialog()
      fetchClients()
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erro ao salvar cliente',
        severity: 'error'
      })
    }
  }

  const handleImportSuccess = () => {
    setImportModalOpen(false)
    fetchClients()
    setSnackbar({
      open: true,
      message: 'Dados importados com sucesso!',
      severity: 'success'
    })
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Gestão de Clientes
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Novo Cliente
          </Button>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={() => setImportModalOpen(true)}
          >
            Importar CSV
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
                  <MenuItem value="prospecto">Prospecto</MenuItem>
                  <MenuItem value="potencial">Potencial</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Segmento</InputLabel>
                <Select
                  value={filterSegment}
                  onChange={(e) => setFilterSegment(e.target.value)}
                  label="Segmento"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {Object.entries(segmentLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm('')
                  setFilterStatus('')
                  setFilterSegment('')
                }}
              >
                Limpar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Contato</TableCell>
                  <TableCell>Segmento</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Responsável</TableCell>
                  <TableCell>Valor Mensal</TableCell>
                  <TableCell>Avaliação</TableCell>
                  <TableCell>Última Compra</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {getInitials(client.company_name)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {client.company_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {client.contact_name}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {client.contact_name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          {client.email && (
                            <Tooltip title={client.email}>
                              <IconButton size="small">
                                <Email fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {client.phone && (
                            <Tooltip title={client.phone}>
                              <IconButton size="small">
                                <Phone fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={segmentLabels[client.segment] || client.segment}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={client.status}
                        color={statusColors[client.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {client.responsible ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                            {client.responsible.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {client.responsible.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {client.responsible.role}
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Não atribuído
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(client.monthly_value)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Rating
                        value={client.rating || 0}
                        readOnly
                        size="small"
                        emptyIcon={<StarBorder fontSize="small" />}
                        icon={<Star fontSize="small" />}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {client.last_purchase_date ? 
                          new Date(client.last_purchase_date).toLocaleDateString('pt-BR') : 
                          'Nunca'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Visualizar">
                          <IconButton 
                            size="small"
                            onClick={() => setViewClient(client)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton 
                            size="small"
                            onClick={() => handleOpenDialog(client)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton 
                            size="small"
                            color="error"
                            onClick={() => handleDelete(client.id)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {clients.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhum cliente encontrado
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criação/Edição */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedClient ? 'Editar Cliente' : 'Novo Cliente'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome da Empresa"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome do Contato"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Telefone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Segmento</InputLabel>
                <Select
                  value={formData.segment}
                  onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                  label="Segmento"
                >
                  {Object.entries(segmentLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="prospecto">Prospecto</MenuItem>
                  <MenuItem value="potencial">Potencial</MenuItem>
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Valor Mensal"
                type="number"
                value={formData.monthly_value}
                onChange={(e) => setFormData({ ...formData, monthly_value: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography component="legend">Avaliação</Typography>
                <Rating
                  value={formData.rating}
                  onChange={(e, newValue) => setFormData({ ...formData, rating: newValue })}
                />
              </Box>
            </Grid>


            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Endereço"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cidade"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Estado"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="CEP"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedClient ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={!!viewClient} onClose={() => setViewClient(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {viewClient && getInitials(viewClient.company_name)}
            </Avatar>
            Detalhes do Cliente
          </Box>
        </DialogTitle>
        <DialogContent>
          {viewClient && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Informações Básicas</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Empresa</Typography>
                  <Typography variant="body1">{viewClient.company_name}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Contato</Typography>
                  <Typography variant="body1">{viewClient.contact_name}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Email</Typography>
                  <Typography variant="body1">{viewClient.email || 'Não informado'}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Telefone</Typography>
                  <Typography variant="body1">{viewClient.phone || 'Não informado'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Status e Avaliação</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Segmento</Typography>
                  <Chip
                    label={segmentLabels[viewClient.segment] || viewClient.segment}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                  <Chip
                    label={viewClient.status}
                    color={statusColors[viewClient.status] || 'default'}
                    size="small"
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Valor Mensal</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(viewClient.monthly_value)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Avaliação</Typography>
                  <Rating value={viewClient.rating || 0} readOnly />
                </Box>
              </Grid>
              {viewClient.address && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Endereço</Typography>
                  <Typography variant="body1">
                    {viewClient.address}
                    {viewClient.city && `, ${viewClient.city}`}
                    {viewClient.state && ` - ${viewClient.state}`}
                    {viewClient.zip_code && ` - ${viewClient.zip_code}`}
                  </Typography>
                </Grid>
              )}
              {viewClient.notes && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Observações</Typography>
                  <Typography variant="body1">{viewClient.notes}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewClient(null)}>Fechar</Button>
          <Button 
            onClick={() => {
              setViewClient(null)
              handleOpenDialog(viewClient)
            }} 
            variant="contained"
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Importação CSV */}
      <CSVImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default ClientsPage
