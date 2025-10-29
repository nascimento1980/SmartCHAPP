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
  Badge
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  Visibility,
  Description,
  AttachMoney,
  Schedule,
  CheckCircle,
  Cancel,
  Pending
} from '@mui/icons-material'
import { Fab } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

const ProposalsPage = () => {
  const { user } = useAuth()
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  const statusColors = {
    rascunho: 'default',
    enviada: 'info',
    em_analise: 'warning',
    aprovada: 'success',
    rejeitada: 'error',
    cancelada: 'error',
    vencida: 'error'
  }

  const statusIcons = {
    rascunho: <Description />,
    enviada: <Schedule />,
    em_analise: <Pending />,
    aprovada: <CheckCircle />,
    rejeitada: <Cancel />,
    cancelada: <Cancel />,
    vencida: <Cancel />
  }

  useEffect(() => {
    fetchProposals()
  }, [searchTerm, filterStatus, filterClient])

  const fetchProposals = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filterStatus) params.append('status', filterStatus)
      if (filterClient) params.append('client_id', filterClient)
      
      const response = await api.get(`/proposals?${params.toString()}`)
      setProposals(response.data.proposals || [])
    } catch (error) {
      console.error('Erro ao buscar propostas:', error)
      setSnackbar({
        open: true,
        message: 'Erro ao carregar propostas',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (proposalId) => {
    if (window.confirm('Tem certeza que deseja excluir esta proposta?')) {
      try {
        await api.delete(`/proposals/${proposalId}`)
        setSnackbar({
          open: true,
          message: 'Proposta excluída com sucesso',
          severity: 'success'
        })
        fetchProposals()
      } catch (error) {
        setSnackbar({
          open: true,
          message: 'Erro ao excluir proposta',
          severity: 'error'
        })
      }
    }
  }

  const handleStatusChange = async (proposalId, newStatus) => {
    try {
      await api.patch(`/proposals/${proposalId}`, { status: newStatus })
      setSnackbar({
        open: true,
        message: 'Status da proposta atualizado',
        severity: 'success'
      })
      fetchProposals()
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erro ao atualizar status',
        severity: 'error'
      })
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getExpiryColor = (expiryDate) => {
    const days = getDaysUntilExpiry(expiryDate)
    if (days < 0) return 'error'
    if (days <= 3) return 'warning'
    return 'success'
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Propostas Comerciais
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Nova Proposta
        </Button>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar propostas..."
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
                  <MenuItem value="rascunho">Rascunho</MenuItem>
                  <MenuItem value="enviada">Enviada</MenuItem>
                  <MenuItem value="em_analise">Em Análise</MenuItem>
                  <MenuItem value="aprovada">Aprovada</MenuItem>
                  <MenuItem value="rejeitada">Rejeitada</MenuItem>
                  <MenuItem value="cancelada">Cancelada</MenuItem>
                  <MenuItem value="vencida">Vencida</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Cliente</InputLabel>
                <Select
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                  label="Cliente"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {/* Aqui seria carregado dinamicamente */}
                  <MenuItem value="1">Cliente A</MenuItem>
                  <MenuItem value="2">Cliente B</MenuItem>
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
                  setFilterClient('')
                }}
              >
                Limpar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de Propostas */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Proposta</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Validade</TableCell>
                  <TableCell>Responsável</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {proposals.map((proposal) => (
                  <TableRow key={proposal.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          #{proposal.number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {proposal.title}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                          {proposal.client?.company_name?.charAt(0) || 'C'}
                        </Avatar>
                        <Typography variant="body2">
                          {proposal.client?.company_name || 'Cliente não definido'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(proposal.total_value)}
                      </Typography>
                      {proposal.discount_value > 0 && (
                        <Typography variant="caption" color="success.main">
                          Desconto: {formatCurrency(proposal.discount_value)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          icon={statusIcons[proposal.status]}
                          label={proposal.status}
                          color={statusColors[proposal.status] || 'default'}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {formatDate(proposal.expiry_date)}
                        </Typography>
                        <Chip
                          label={`${getDaysUntilExpiry(proposal.expiry_date)} dias`}
                          color={getExpiryColor(proposal.expiry_date)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {proposal.responsible?.name || 'Não atribuído'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Visualizar">
                          <IconButton size="small">
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setSelectedProposal(proposal)
                              setOpenDialog(true)
                            }}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton 
                            size="small"
                            color="error"
                            onClick={() => handleDelete(proposal.id)}
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
          
          {proposals.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhuma proposta encontrada
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
                  <Typography variant="h4" color="primary">
                    {proposals.filter(p => p.status === 'aprovada').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Aprovadas
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
                  <Typography variant="h4" color="warning.main">
                    {proposals.filter(p => p.status === 'em_analise').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Em Análise
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
                  <Typography variant="h4" color="info.main">
                    {formatCurrency(proposals.reduce((sum, p) => sum + (p.total_value || 0), 0))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Valor Total
                  </Typography>
                </Box>
                <AttachMoney color="info" />
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
                    {proposals.filter(p => getDaysUntilExpiry(p.expiry_date) <= 3 && getDaysUntilExpiry(p.expiry_date) >= 0).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vencendo
                  </Typography>
                </Box>
                <Schedule color="error" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
        onClick={() => setOpenDialog(true)}
      >
        <Add />
      </Fab>
    </Box>
  )
}

export default ProposalsPage