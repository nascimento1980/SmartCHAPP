import React, { useState, useEffect } from 'react';
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
  Fab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Build,
  Engineering,
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  Visibility,
  Schedule,
  CheckCircle,
  Cancel,
  Pending,
  Assignment,
  Event,
  Warning,
  Error,
  Person,
  Business,
  LocationOn,
  Phone,
  Email,
  AttachFile,
  Speed,
  LocalGasStation
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useVisitSync } from '../contexts/VisitSyncContext';
import api from '../services/api';

const TechnicalVisitsPage = () => {
  const { user } = useAuth();
  const { notifyVisitDeleted, syncKey } = useVisitSync();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [viewVisit, setViewVisit] = useState(null);
  
  // Estados para modal de justificativa de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    type: 'tecnica',
    client_id: '',
    lead_id: '',
    priority: 'media',
    scheduled_date: '',
    scheduled_time: '',
    address: '',
    description: '',
    equipment_required: '',
    technician_id: '',
    estimated_duration: '',
    status: 'agendada',
    notes: ''
  });

  const statusColors = {
    agendada: 'info',
    em_andamento: 'warning',
    concluida: 'success',
    cancelada: 'error',
    reagendada: 'default'
  };

  const statusIcons = {
    agendada: <Schedule />,
    em_andamento: <Pending />,
    concluida: <CheckCircle />,
    cancelada: <Cancel />,
    reagendada: <Schedule />
  };

  const priorityColors = {
    baixa: 'success',
    media: 'warning',
    alta: 'error',
    critica: 'error'
  };

  const typeIcons = {
    tecnica: <Assignment />,
    instalacao: <Build />,
    manutencao: <Engineering />
  };

  useEffect(() => {
    fetchVisits();
  }, [searchTerm, filterStatus, filterType, filterDate, syncKey]); // Adicionar syncKey para sincronização

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus) params.append('status', filterStatus);
      if (filterType) params.append('type', filterType);
      if (filterDate) params.append('date', filterDate);
      
      const response = await api.get(`/visits?${params.toString()}`);
      // Filtrar apenas visitas técnicas
      const technicalVisits = (response.data.visits || []).filter(v => 
        ['tecnica', 'instalacao', 'manutencao'].includes(v.type)
      );
      setVisits(technicalVisits);
    } catch (error) {
      console.error('Erro ao buscar visitas técnicas:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar visitas técnicas',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (visit) => {
    setVisitToDelete(visit);
    setDeletionReason('');
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletionReason.trim()) {
      setSnackbar({
        open: true,
        message: 'É obrigatório fornecer uma justificativa',
        severity: 'error'
      });
      return;
    }

    if (deletionReason.trim().length < 10) {
      setSnackbar({
        open: true,
        message: 'A justificativa deve ter pelo menos 10 caracteres',
        severity: 'error'
      });
      return;
    }

    try {
      await api.delete(`/visits/${visitToDelete.id}`, {
        data: { deletion_reason: deletionReason.trim() }
      });
      
      // Notificar o contexto de sincronização
      notifyVisitDeleted(visitToDelete.id);
      
      setSnackbar({
        open: true,
        message: 'Visita técnica excluída com sucesso',
        severity: 'success'
      });
      
      setDeleteDialogOpen(false);
      setVisitToDelete(null);
      setDeletionReason('');
      fetchVisits();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Erro ao excluir visita técnica',
        severity: 'error'
      });
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setVisitToDelete(null);
    setDeletionReason('');
  };

  const handleStatusChange = async (visitId, newStatus) => {
    try {
      await api.patch(`/visits/${visitId}`, { status: newStatus });
      setSnackbar({
        open: true,
        message: 'Status da visita técnica atualizado',
        severity: 'success'
      });
      fetchVisits();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erro ao atualizar status',
        severity: 'error'
      });
    }
  };

  const handleOpenDialog = (visit = null) => {
    if (visit) {
      setFormData({
        title: visit.title || '',
        type: visit.type || 'tecnica',
        client_id: visit.client_id || '',
        lead_id: visit.lead_id || '',
        priority: visit.priority || 'media',
        scheduled_date: visit.scheduled_date ? visit.scheduled_date.split('T')[0] : '',
        scheduled_time: visit.scheduled_time || '',
        address: visit.address || '',
        description: visit.description || '',
        equipment_required: visit.equipment_required || '',
        technician_id: visit.technician_id || '',
        estimated_duration: visit.estimated_duration || '',
        status: visit.status || 'agendada',
        notes: visit.notes || ''
      });
      setSelectedVisit(visit);
    } else {
      setFormData({
        title: '',
        type: 'tecnica',
        client_id: '',
        lead_id: '',
        priority: 'media',
        scheduled_date: '',
        scheduled_time: '',
        address: '',
        description: '',
        equipment_required: '',
        technician_id: '',
        estimated_duration: '',
        status: 'agendada',
        notes: ''
      });
      setSelectedVisit(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedVisit(null);
    setFormData({
      title: '',
      type: 'tecnica',
      client_id: '',
      lead_id: '',
      priority: 'media',
      scheduled_date: '',
      scheduled_time: '',
      address: '',
      description: '',
      equipment_required: '',
      technician_id: '',
      estimated_duration: '',
      status: 'agendada',
      notes: ''
    });
  };

  const handleSubmit = async () => {
    try {
      if (selectedVisit) {
        await api.put(`/visits/${selectedVisit.id}`, formData);
        setSnackbar({
          open: true,
          message: 'Visita técnica atualizada com sucesso',
          severity: 'success'
        });
      } else {
        await api.post('/visits', formData);
        setSnackbar({
          open: true,
          message: 'Visita técnica criada com sucesso',
          severity: 'success'
        });
      }
      handleCloseDialog();
      fetchVisits();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erro ao salvar visita técnica',
        severity: 'error'
      });
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVisitPriority = (visit) => {
    const today = new Date();
    const visitDate = new Date(visit.scheduled_date);
    const diffTime = visitDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'error'; // Atrasada
    if (diffDays === 0) return 'warning'; // Hoje
    if (diffDays <= 3) return 'info'; // Esta semana
    return 'default';
  };

  const getVisitTypeLabel = (type) => {
    switch (type) {
      case 'tecnica': return 'Visita Técnica';
      case 'instalacao': return 'Instalação';
      case 'manutencao': return 'Manutenção';
      default: return 'Visita';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          🔧 Agendamento de Visitas - Técnicas
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Nova Visita Técnica
        </Button>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="Buscar visitas técnicas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
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
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="Tipo"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="tecnica">Técnica</MenuItem>
                  <MenuItem value="instalacao">Instalação</MenuItem>
                  <MenuItem value="manutencao">Manutenção</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
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
                  setSearchTerm('');
                  setFilterStatus('');
                  setFilterType('');
                  setFilterDate('');
                }}
              >
                Limpar Filtros
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de Visitas Técnicas */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Visita</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Data & Hora</TableCell>
                  <TableCell>Local</TableCell>
                  <TableCell>Prioridade</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Técnico</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visits.map((visit) => (
                  <TableRow key={visit.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          {typeIcons[visit.type] || <Assignment />}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {visit.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getVisitTypeLabel(visit.type)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                          {visit.client?.company_name?.charAt(0) || visit.lead?.company_name?.charAt(0) || 'C'}
                        </Avatar>
                        <Typography variant="body2">
                          {visit.client?.company_name || visit.lead?.company_name || 'Cliente não definido'}
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
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2">
                          {visit.address || 'Endereço não informado'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={visit.priority || 'média'}
                        color={priorityColors[visit.priority] || 'default'}
                        size="small"
                        variant="outlined"
                      />
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
                    <TableCell>
                      <Typography variant="body2">
                        {visit.responsible?.name || 'Não atribuído'}
                      </Typography>
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
                        <Tooltip title="Editar">
                          <IconButton 
                            size="small"
                            onClick={() => handleOpenDialog(visit)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton 
                            size="small"
                            color="error"
                            onClick={() => handleDelete(visit)}
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
          
          {visits.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhuma visita técnica encontrada
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
                <Warning color="error" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de Criação/Edição */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedVisit ? 'Editar Visita Técnica' : 'Nova Visita Técnica'}
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
                  <MenuItem value="tecnica">Técnica</MenuItem>
                  <MenuItem value="instalacao">Instalação</MenuItem>
                  <MenuItem value="manutencao">Manutenção</MenuItem>
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
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  label="Prioridade"
                >
                  <MenuItem value="baixa">Baixa</MenuItem>
                  <MenuItem value="media">Média</MenuItem>
                  <MenuItem value="alta">Alta</MenuItem>
                  <MenuItem value="critica">Crítica</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Duração Estimada (horas)"
                value={formData.estimated_duration}
                onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                placeholder="2.5"
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição Técnica"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o problema técnico ou serviço a ser realizado..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Equipamentos Necessários"
                value={formData.equipment_required}
                onChange={(e) => setFormData({ ...formData, equipment_required: e.target.value })}
                placeholder="Liste os equipamentos, ferramentas ou peças necessárias..."
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
                label="Observações Adicionais"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações técnicas, instruções especiais, etc..."
              />
            </Grid>
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
              {viewVisit && typeIcons[viewVisit.type]}
            </Avatar>
            Detalhes da Visita Técnica
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
                  <Typography variant="body1">{getVisitTypeLabel(viewVisit.type)}</Typography>
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
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Prioridade</Typography>
                  <Chip
                    label={viewVisit.priority || 'média'}
                    color={priorityColors[viewVisit.priority] || 'default'}
                    size="small"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Cliente e Local</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Cliente</Typography>
                  <Typography variant="body1">
                    {viewVisit.client?.company_name || viewVisit.lead?.company_name || 'Cliente não definido'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Endereço</Typography>
                  <Typography variant="body1">{viewVisit.address || 'Endereço não informado'}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Técnico Responsável</Typography>
                  <Typography variant="body1">
                    {viewVisit.responsible?.name || 'Não atribuído'}
                  </Typography>
                </Box>
                {viewVisit.estimated_duration && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary">Duração Estimada</Typography>
                    <Typography variant="body1">{viewVisit.estimated_duration} horas</Typography>
                  </Box>
                )}
              </Grid>
              {viewVisit.description && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Descrição Técnica</Typography>
                  <Typography variant="body1">{viewVisit.description}</Typography>
                </Grid>
              )}
              {viewVisit.equipment_required && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Equipamentos Necessários</Typography>
                  <Typography variant="body1">{viewVisit.equipment_required}</Typography>
                </Grid>
              )}
              {viewVisit.notes && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Observações</Typography>
                  <Typography variant="body1">{viewVisit.notes}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewVisit(null)}>Fechar</Button>
          <Button 
            onClick={() => {
              setViewVisit(null);
              handleOpenDialog(viewVisit);
            }} 
            variant="contained"
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Justificativa para Exclusão */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={cancelDelete}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Delete color="error" />
            Confirmar Exclusão
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta ação não pode ser desfeita. A visita será excluída permanentemente.
          </Alert>
          
          {visitToDelete && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="textSecondary">Visita a ser excluída:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {visitToDelete.title}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {new Date(visitToDelete.scheduled_date).toLocaleDateString('pt-BR')} às {visitToDelete.scheduled_time}
              </Typography>
            </Box>
          )}
          
          <TextField
            label="Justificativa para exclusão *"
            placeholder="Ex: Reagendamento solicitado pelo cliente, cancelamento por motivos técnicos, etc."
            multiline
            rows={4}
            fullWidth
            value={deletionReason}
            onChange={(e) => setDeletionReason(e.target.value)}
            helperText={`${deletionReason.length}/200 caracteres (mínimo 10)`}
            inputProps={{ maxLength: 200 }}
            error={deletionReason.length > 0 && deletionReason.length < 10}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>
            Cancelar
          </Button>
          <Button 
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={!deletionReason.trim() || deletionReason.trim().length < 10}
            startIcon={<Delete />}
          >
            Confirmar Exclusão
          </Button>
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
  );
};

export default TechnicalVisitsPage;
