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
  Avatar
} from '@mui/material'
import {
  Add,
  Edit,
  Search,
  FilterList,
  Visibility,
  Schedule,
  CheckCircle,
  Cancel,
  Pending,
  DirectionsCar,
  Event
} from '@mui/icons-material'
import { Fab } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'
import { useVisitSync } from '../contexts/VisitSyncContext'
import UserSelector from '../components/UserSelector'
import api from '../services/api'
import VisitFormsPanel from '../components/VisitFormsPanel'
import VisitTimeControl from '../components/VisitTimeControl'

const VisitsPage = () => {
  const { user } = useAuth()
  const { syncKey } = useVisitSync()
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [viewVisit, setViewVisit] = useState(null)

  // Estado para seleção de usuários para convite
  const [selectedUsersForInvite, setSelectedUsersForInvite] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    type: 'comercial',
    client_id: '',
    scheduled_date: '',
    scheduled_time: '',
    address: '',
    responsible_id: '',
    notes: '',
    status: 'agendada'
  })

  const statusColors = {
    agendada: 'info',
    em_andamento: 'warning',
    concluida: 'success',
    cancelada: 'error',
    reagendada: 'default'
  }

  const statusIcons = {
    agendada: <Schedule />,
    em_andamento: <Pending />,
    concluida: <CheckCircle />,
    cancelada: <Cancel />,
    reagendada: <Schedule />
  }

  useEffect(() => {
    fetchVisits()
  }, [searchTerm, filterStatus, filterDate, syncKey]) // Adicionar syncKey para sincronização

  const fetchVisits = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filterStatus) params.append('status', filterStatus)
      if (filterDate) params.append('date', filterDate)
      
      const response = await api.get(`/visits?${params.toString()}`)
      setVisits(response.data.visits || [])
    } catch (error) {
      console.error('Erro ao buscar visitas:', error)
      setSnackbar({
        open: true,
        message: 'Erro ao carregar visitas',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }



  const handleStatusChange = async (visitId, newStatus) => {
    try {
      await api.patch(`/visits/${visitId}`, { status: newStatus })
      setSnackbar({
        open: true,
        message: 'Status da visita atualizado',
        severity: 'success'
      })
      fetchVisits()
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erro ao atualizar status',
        severity: 'error'
      })
    }
  }

  const handleOpenDialog = (visit = null) => {
    if (visit) {
      setFormData({
        title: visit.title || '',
        type: visit.type || 'comercial',
        client_id: visit.client_id || '',
        scheduled_date: visit.scheduled_date ? visit.scheduled_date.split('T')[0] : '',
        scheduled_time: visit.scheduled_time || '',
        address: visit.address || '',
        responsible_id: visit.responsible_id || '',
        notes: visit.notes || '',
        status: visit.status || 'agendada'
      })
      setSelectedVisit(visit)
    } else {
      setFormData({
        title: '',
        type: 'comercial',
        client_id: '',
        scheduled_date: '',
        scheduled_time: '',
        address: '',
        responsible_id: '',
        notes: '',
        status: 'agendada'
      })
      setSelectedVisit(null)
      setSelectedUsersForInvite([])
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedVisit(null)
    setFormData({
      title: '',
      type: 'comercial',
      client_id: '',
      scheduled_date: '',
      scheduled_time: '',
      address: '',
      responsible_id: '',
      notes: '',
      status: 'agendada'
    })
    setSelectedUsersForInvite([])
  }

  const handleSubmit = async () => {
    try {
      let visitResponse
      
      if (selectedVisit) {
        await api.put(`/visits/${selectedVisit.id}`, formData)
        setSnackbar({
          open: true,
          message: 'Visita atualizada com sucesso',
          severity: 'success'
        })
      } else {
        visitResponse = await api.post('/visits', formData)
        
        // Enviar convites para usuários selecionados (apenas para novas visitas)
        if (selectedUsersForInvite.length > 0 && visitResponse.data) {
          await sendInvitesToUsers(visitResponse.data)
        }
        
        setSnackbar({
          open: true,
          message: 'Visita criada com sucesso',
          severity: 'success'
        })
      }
      handleCloseDialog()
      fetchVisits()
    } catch (error) {
      console.error('Erro ao salvar visita:', error)
      setSnackbar({
        open: true,
        message: 'Erro ao salvar visita',
        severity: 'error'
      })
    }
  }

  // Função para enviar convites aos usuários selecionados
  const sendInvitesToUsers = async (visit) => {
    try {
      const invitePromises = selectedUsersForInvite.map(userId => 
        api.post('/planning-collaboration/invite', {
          visit_id: visit.id,
          invited_user_id: userId,
          message: `Você foi convidado para a visita: ${visit.title} em ${new Date(visit.scheduled_date).toLocaleDateString('pt-BR')}`
        })
      )
      
      await Promise.all(invitePromises)
      console.log(`✅ Convites enviados para ${selectedUsersForInvite.length} usuários`)
      
    } catch (error) {
      console.error('Erro ao enviar convites:', error)
      // Não mostra erro para o usuário pois a visita foi criada com sucesso
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getVisitPriority = (visit) => {
    const today = new Date()
    const visitDate = new Date(visit.scheduled_date)
    const diffTime = visitDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'error' // Atrasada
    if (diffDays === 0) return 'warning' // Hoje
    if (diffDays <= 3) return 'info' // Esta semana
    return 'default'
  }

  const getVisitTypeIcon = (type) => {
    switch (type) {
      case 'tecnica':
        return <Event />
      case 'comercial':
        return <DirectionsCar />
      case 'instalacao':
        return <CheckCircle />
      default:
        return <Schedule />
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Agendamento de Visitas - Vendas
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Nova Visita Comercial
        </Button>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="Buscar visitas..."
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
                  <MenuItem value="agendada">Agendada</MenuItem>
                  <MenuItem value="em_andamento">Em Andamento</MenuItem>
                  <MenuItem value="concluida">Concluída</MenuItem>
                  <MenuItem value="cancelada">Cancelada</MenuItem>
                  <MenuItem value="reagendada">Reagendada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="Data"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm('')
                  setFilterStatus('')
                  setFilterDate('')
                }}
              >
                Limpar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de Visitas */}
      <Card sx={{ mb: 15 }}>
        <CardContent sx={{ pb: 0 }}>
          <TableContainer 
            component={Paper} 
            variant="outlined"
            sx={{ 
              maxHeight: 'calc(100vh - 480px)', 
              overflow: 'auto',
              mb: 3,
              pb: 2,
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#888',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                backgroundColor: '#555',
              },
            }}
          >
            <Table stickyHeader sx={{ '& tbody': { pb: 3 } }}>
              <TableHead>
                <TableRow>
                  <TableCell>Visita</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Data & Hora</TableCell>
                  <TableCell>Local</TableCell>
                  <TableCell>Responsável</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visits.map((visit) => (
                  <TableRow key={visit.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          {getVisitTypeIcon(visit.type)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {visit.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {visit.type === 'tecnica' ? 'Visita Técnica' : 
                             visit.type === 'comercial' ? 'Visita Comercial' : 
                             visit.type === 'instalacao' ? 'Instalação' : 'Visita'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                          {visit.client?.company_name?.charAt(0) || 'C'}
                        </Avatar>
                        <Typography variant="body2">
                          {visit.client?.company_name || 'Cliente não definido'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {formatDate(visit.scheduled_date)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(visit.scheduled_time)}
                        </Typography>
                        <Chip
                          label={`${getVisitPriority(visit) === 'error' ? 'Atrasada' : 
                                   getVisitPriority(visit) === 'warning' ? 'Hoje' : 
                                   getVisitPriority(visit) === 'info' ? 'Esta semana' : 'Futura'}`}
                          color={getVisitPriority(visit)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                                         <TableCell>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                         <Event fontSize="small" color="action" />
                         <Typography variant="body2">
                           {visit.address || 'Endereço não informado'}
                         </Typography>
                       </Box>
                     </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {visit.responsible?.name || 'Não atribuído'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          icon={statusIcons[visit.status]}
                          label={visit.status}
                          color={statusColors[visit.status] || 'default'}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Visualizar">
                          <IconButton 
                            size="small"
                            onClick={() => setViewVisit(visit)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={visit.status === 'concluida' ? 'Visitas concluídas não podem ser editadas' : 'Editar'}>
                          <span>
                            <IconButton 
                              size="small"
                              onClick={() => handleOpenDialog(visit)}
                              disabled={visit.status === 'concluida'}
                            >
                              <Edit />
                            </IconButton>
                          </span>
                        </Tooltip>

                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {visits.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhuma visita encontrada
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas Rápidas */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="info.main">
                    {visits.filter(v => v.status === 'agendada').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Agendadas
                  </Typography>
                </Box>
                <Schedule color="info" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {visits.filter(v => v.status === 'em_andamento').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Em Andamento
                  </Typography>
                </Box>
                <Pending color="warning" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="success.main">
                    {visits.filter(v => v.status === 'concluida').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Concluídas
                  </Typography>
                </Box>
                <CheckCircle color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="error">
                    {visits.filter(v => getVisitPriority(v) === 'error').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Atrasadas
                  </Typography>
                </Box>
                <Cancel color="error" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de Criação/Edição */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedVisit ? 'Editar Visita Comercial' : 'Nova Visita Comercial'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Título da Visita"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Visita</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  label="Tipo de Visita"
                >
                  <MenuItem value="comercial">Comercial</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data da Visita"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Horário"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Endereço"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="agendada">Agendada</MenuItem>
                  <MenuItem value="em_andamento">Em Andamento</MenuItem>
                  <MenuItem value="concluida">Concluída</MenuItem>
                  <MenuItem value="cancelada">Cancelada</MenuItem>
                  <MenuItem value="reagendada">Reagendada</MenuItem>
                </Select>
              </FormControl>
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
            
            {/* Seleção de usuários para convite - apenas para novas visitas */}
            {!selectedVisit && (
              <Grid item xs={12}>
                <UserSelector
                  selectedUsers={selectedUsersForInvite}
                  onSelectionChange={setSelectedUsersForInvite}
                  label="Convidar usuários para esta visita"
                  helperText="Usuários selecionados receberão convites automáticos na data do compromisso"
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedVisit ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={!!viewVisit} onClose={() => setViewVisit(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {viewVisit && getVisitTypeIcon(viewVisit.type)}
            </Avatar>
            Detalhes da Visita
          </Box>
        </DialogTitle>
        <DialogContent>
          {viewVisit && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Informações da Visita</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Título</Typography>
                  <Typography variant="body1">{viewVisit.title}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Tipo</Typography>
                  <Typography variant="body1">
                    {viewVisit.type === 'tecnica' ? 'Visita Técnica' : 
                     viewVisit.type === 'comercial' ? 'Visita Comercial' : 
                     viewVisit.type === 'instalacao' ? 'Instalação' : 'Visita'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Data e Hora</Typography>
                  <Typography variant="body1">
                    {formatDate(viewVisit.scheduled_date)} às {formatTime(viewVisit.scheduled_time)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                  <Chip
                    icon={statusIcons[viewVisit.status]}
                    label={viewVisit.status}
                    color={statusColors[viewVisit.status] || 'default'}
                    size="small"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Cliente e Local</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Cliente</Typography>
                  <Typography variant="body1">
                    {viewVisit.client?.company_name || 'Cliente não definido'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Endereço</Typography>
                  <Typography variant="body1">{viewVisit.address || 'Endereço não informado'}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Responsável</Typography>
                  <Typography variant="body1">
                    {viewVisit.responsible?.name || 'Não atribuído'}
                  </Typography>
                </Box>
              </Grid>
              {viewVisit.notes && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Observações</Typography>
                  <Typography variant="body1">{viewVisit.notes}</Typography>
                </Grid>
              )}

              {/* Controle de Tempo - Check-in / Check-out */
              <Grid item xs={12}>
                <VisitTimeControl
                  visit={viewVisit}
                  onVisitUpdated={(updatedVisit) => {
                    setVisits(prev => prev.map(v => v.id === updatedVisit.id ? updatedVisit : v))
                    setViewVisit(updatedVisit)
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <VisitFormsPanel visit={viewVisit} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewVisit(null)}>Fechar</Button>
          {viewVisit?.status !== 'concluida' && (
            <Button 
              onClick={() => {
                setViewVisit(null)
                handleOpenDialog(viewVisit)
              }} 
              variant="contained"
            >
              Editar
            </Button>
          )}
        </DialogActions>
      </Dialog>



      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => handleOpenDialog()}
      >
        <Add />
      </Fab>
    </Box>
  )
}

export default VisitsPage