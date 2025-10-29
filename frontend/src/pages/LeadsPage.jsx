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
  Fab,
  Tooltip,
  Alert,
  Snackbar
} from '@mui/material'
import { InputAdornment } from '@mui/material'
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
  Close,
  Upload
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import LeadForm from '../components/LeadForm'
import SegmentContactForm from '../components/SegmentContactForm'
import SmartCallScript from '../components/SmartCallScript'
import CSVImportModal from '../components/CSVImportModal'

const LeadsPage = () => {
  const { user, permissions } = useAuth()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [viewLead, setViewLead] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSegment, setFilterSegment] = useState('')
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [contactFormOpen, setContactFormOpen] = useState(false)
  const [contactFormCtx, setContactFormCtx] = useState(null)
  const [smartScriptOpen, setSmartScriptOpen] = useState(false)
  const [smartScriptCtx, setSmartScriptCtx] = useState(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [filterCity, setFilterCity] = useState('')

  const statusColors = {
    novo: 'default',
    ativo: 'info',
    agendado: 'info',
    contatado: 'info',
    qualificado: 'warning',
    proposta: 'primary',
    fechado: 'success',
    convertido: 'success',
    perdido: 'error',
    inativo: 'default'
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

  const [catalogSegments, setCatalogSegments] = useState([])

  useEffect(() => {
    fetchLeads()
  }, [searchTerm, filterStatus, filterSegment, filterCity])

  useEffect(() => {
    const loadSegments = async () => {
      try {
        const { data } = await api.get('/settings/catalogs/segments')
        setCatalogSegments(data.data || [])
      } catch {}
    }
    loadSegments()
  }, [])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filterStatus) params.append('status', filterStatus)
      if (filterSegment) params.append('segment', filterSegment)
      if (filterCity) params.append('city', filterCity)
      params.append('type', 'lead')
      params.append('include', 'responsible')
      params.append('limit', '1000')
      
      const response = await api.get(`/customer-contacts?${params.toString()}`)
      setLeads(response.data.data || [])
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
      setSnackbar({
        open: true,
        message: 'Erro ao carregar leads',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (leadId) => {
    if (window.confirm('Tem certeza que deseja excluir este lead?')) {
      try {
        await api.delete(`/customer-contacts/${leadId}`)
        setSnackbar({
          open: true,
          message: 'Lead excluído com sucesso',
          severity: 'success'
        })
        fetchLeads()
      } catch (error) {
        setSnackbar({
          open: true,
          message: 'Erro ao excluir lead',
          severity: 'error'
        })
      }
    }
  }

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await api.patch(`/customer-contacts/${leadId}`, { status: newStatus })
      setSnackbar({
        open: true,
        message: 'Status atualizado com sucesso',
        severity: 'success'
      })
      fetchLeads()
    } catch (edit) {
      setSnackbar({
        open: true,
        message: 'Erro ao atualizar status',
        severity: 'error'
      })
    }
  }

  const handleFormSuccess = () => {
    fetchLeads()
    setSnackbar({
      open: true,
      message: selectedLead ? 'Lead atualizado com sucesso' : 'Lead criado com sucesso',
      severity: 'success'
    })
  }

  const handleImportSuccess = () => {
    setImportModalOpen(false)
    fetchLeads()
    setSnackbar({
      open: true,
      message: 'Dados importados com sucesso!',
      severity: 'success'
    })
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Gestão de Leads
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {permissions.includes('leads.create') && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
              className="action action-leads action-leads-create"
            >
              Novo Lead
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={() => setImportModalOpen(true)}
            className="action action-leads action-leads-import"
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
                placeholder="Buscar leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                 }}
                 className="field field-leads-filter field-leads-filter-search"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                 <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                   className="field field-leads-filter field-leads-filter-status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="novo">Novo</MenuItem>
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="agendado">Agendado</MenuItem>
                  <MenuItem value="contatado">Contatado</MenuItem>
                  <MenuItem value="qualificado">Qualificado</MenuItem>
                  <MenuItem value="proposta">Proposta</MenuItem>
                  <MenuItem value="fechado">Fechado</MenuItem>
                  <MenuItem value="convertido">Convertido</MenuItem>
                  <MenuItem value="perdido">Perdido</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
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
                   className="field field-leads-filter field-leads-filter-segment"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {catalogSegments.map((s) => (
                    <MenuItem key={s.id} value={s.code || s.name}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="Cidade"
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchLeads() }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => fetchLeads()} aria-label="Aplicar filtro de cidade">
                        <Search fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                className="field field-leads-filter field-leads-filter-city"
              />
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
                  setFilterCity('')
                }}
              >
                Limpar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de Leads */}
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
                  <TableCell>Empresa</TableCell>
                  <TableCell>Contato</TableCell>
                  <TableCell>Segmento</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Responsável</TableCell>
                  <TableCell>Próximo Contato</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {lead.company_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {lead.position}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {lead.contact_name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          {lead.email && (
                            <Tooltip title={lead.email}>
                              <IconButton size="small">
                                <Email fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {lead.phone && (
                            <Tooltip title={lead.phone}>
                              <IconButton 
                                size="small"
                                onClick={() => {
                                  setContactFormCtx({
                                    leadId: lead.id,
                                    leadName: lead.contact_name,
                                    companyName: lead.company_name,
                                    segment: lead.segment,
                                    stage: lead.status
                                  })
                                  setContactFormOpen(true)
                                }}
                              >
                                <Phone fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={segmentLabels[lead.segment] || lead.segment}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={lead.status}
                        color={statusColors[lead.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {lead.responsible?.name || 'Não atribuído'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {lead.next_contact_date ? 
                          new Date(lead.next_contact_date).toLocaleDateString('pt-BR') : 
                          'Não agendado'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Visualizar">
                          <IconButton 
                            size="small"
                            onClick={() => setViewLead(lead)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                         {permissions.includes('leads.edit') && (
                           <Tooltip title="Editar">
                             <IconButton 
                               size="small"
                               onClick={() => {
                                 setSelectedLead(lead)
                                 setOpenDialog(true)
                               }}
                               className="action action-leads action-leads-edit"
                             >
                               <Edit />
                             </IconButton>
                           </Tooltip>
                         )}
                         {permissions.includes('leads.delete') && (
                           <Tooltip title="Excluir">
                             <IconButton 
                               size="small"
                               color="error"
                               onClick={() => handleDelete(lead.id)}
                               className="action action-leads action-leads-delete"
                             >
                               <Delete />
                             </IconButton>
                           </Tooltip>
                         )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {leads.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhum lead encontrado
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <LeadForm
        open={openDialog}
        onClose={() => {
          setOpenDialog(false)
          setSelectedLead(null)
        }}
        lead={selectedLead}
        onSuccess={handleFormSuccess}
      />

      {/* Formulário de atendimento segmentado */}
      <SegmentContactForm
        open={contactFormOpen}
        onClose={() => setContactFormOpen(false)}
        context={contactFormCtx}
        onSuccess={() => {
          setSnackbar({ open: true, message: 'Atendimento registrado', severity: 'success' })
          fetchLeads()
        }}
      />
      <SmartCallScript
        open={smartScriptOpen}
        onClose={() => setSmartScriptOpen(false)}
        context={smartScriptCtx}
        onSuccess={() => {
          setSnackbar({ open: true, message: 'Ligação registrada (SMART)', severity: 'success' })
          fetchLeads()
        }}
      />

      {/* Modal de Visualização */}
      <Dialog 
        open={!!viewLead} 
        onClose={() => setViewLead(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              Detalhes do Lead
            </Typography>
            <IconButton onClick={() => setViewLead(null)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {viewLead && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Empresa
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewLead.company_name}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Contato
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewLead.contact_name}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewLead.email || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Telefone
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewLead.phone || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Celular
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewLead.mobile || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Cargo
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewLead.position || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Segmento
                </Typography>
                <Chip
                  label={segmentLabels[viewLead.segment] || viewLead.segment}
                  size="small"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Origem
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewLead.source}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={viewLead.status}
                  color={statusColors[viewLead.status] || 'default'}
                  size="small"
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Prioridade
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewLead.priority}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Endereço
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewLead.address || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Cidade
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewLead.city || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Estado
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewLead.state || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  CEP
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewLead.zipcode || 'Não informado'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Observações
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewLead.notes || 'Nenhuma observação'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Próximo Contato
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewLead.next_contact_date ? 
                    new Date(viewLead.next_contact_date).toLocaleDateString('pt-BR') : 
                    'Não agendado'
                  }
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Responsável
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewLead.responsible?.name || 'Não atribuído'}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewLead(null)}>
            Fechar
          </Button>
          <Button 
            variant="contained"
            onClick={() => {
              setSelectedLead(viewLead)
              setViewLead(null)
              setOpenDialog(true)
            }}
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

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => setOpenDialog(true)}
      >
        <Add />
      </Fab>
    </Box>
  )
}

export default LeadsPage
