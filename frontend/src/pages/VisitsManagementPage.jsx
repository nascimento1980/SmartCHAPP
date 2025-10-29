import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DeletionReasonDialog from '../components/DeletionReasonDialog';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  Tooltip,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Avatar,
  LinearProgress
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
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
  DirectionsCar,
  Engineering,
  Assignment,
  Build,
  History,
  AccessTime,
  Timeline,
  PlayArrow,
  Business
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useVisitSync } from '../contexts/VisitSyncContext';
import api from '../services/api';
import RoutingOptimizer from '../components/RoutingOptimizer';
import WeeklyPlanningManager from '../components/WeeklyPlanningManager';
import VisitTimeControl from '../components/VisitTimeControl';
import VisitExecutionManager from '../components/VisitExecutionManager';
import PlanningHistory from '../components/PlanningHistory';
import VisitsCalendar from '../components/VisitsCalendar';
import UserSelector from '../components/UserSelector';
import VisitFormsPanel from '../components/VisitFormsPanel';

const VisitsManagementPage = () => {
  const { user } = useAuth();
  const { notifyVisitDeleted, syncKey } = useVisitSync();
  const [searchParams, setSearchParams] = useSearchParams();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);
  const [deletionTarget, setDeletionTarget] = useState(null); // { id }
  
  // Estados para edição e visualização
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [viewVisit, setViewVisit] = useState(null);
  const [selectedUsersForInvite, setSelectedUsersForInvite] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    type: 'comercial',
    client_id: '',
    lead_id: '',
    scheduled_date: '',
    scheduled_time: '',
    address: '',
    responsible_id: '',
    notes: '',
    status: 'agendada'
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

  const typeIcons = {
    comercial: <DirectionsCar />,
    tecnica: <Assignment />,
    instalacao: <Build />,
    manutencao: <Engineering />
  };

  const typeColors = {
    comercial: 'primary',
    tecnica: 'warning',
    instalacao: 'success',
    manutencao: 'error'
  };

  useEffect(() => {
    if (activeTab === 0) {
      fetchVisits();
    }
  }, [searchTerm, filterStatus, filterType, filterDate, activeTab, syncKey]); // Adicionar syncKey para sincronização

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'execution') setActiveTab(3);
    else if (tab === 'planning') setActiveTab(2);
    else if (tab === 'history') setActiveTab(4);
    else if (tab === 'calendar') setActiveTab(1);
    else setActiveTab(0);
  }, [searchParams]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      
      // Buscar visitas da tabela unificada visits
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus) params.append('status', filterStatus);
      if (filterType) params.append('type', filterType);
      if (filterDate) params.append('date', filterDate);
      
      const response = await api.get(`/visits?${params.toString()}`);
      const allVisits = response.data.visits || [];
      
      setVisits(allVisits);
    } catch (error) {
      console.error('Erro ao buscar visitas:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar visitas',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    const tabNames = ['visits', 'calendar', 'planning', 'execution', 'history'];
    const tabName = tabNames[newValue] || 'visits';
    setSearchParams({ tab: tabName });
  };

  const handleOpenDialog = async (visit = null) => {
    if (visit) {
      setSelectedVisit(visit);
      setFormData({
        title: visit.title || '',
        type: visit.type || 'comercial',
        client_id: visit.client_id || '',
        lead_id: visit.lead_id || '',
        scheduled_date: visit.scheduled_date || '',
        scheduled_time: visit.scheduled_time || '',
        address: visit.address || visit.location || visit.endereco || '',
        responsible_id: visit.responsible_id || '',
        notes: visit.notes || '',
        status: visit.status || 'agendada'
      });
      // Form data set
      
      // Carregar usuários convidados para esta visita
      // Substituir a linha 199:
      // const invitesResponse = await api.get(`/visits/${visit.id}/invites`);
      
      // Por:
      try {
        // Buscar convites através do planning_id se existir
        if (visit.planning_id) {
          const invitesResponse = await api.get('/planning-collaboration/invites/sent', {
            params: { planning_id: visit.planning_id }
          });
          const invitedUserIds = invitesResponse.data.invites?.map(invite => invite.invited_user_id) || [];
          setSelectedUsersForInvite(invitedUserIds);
        } else {
          setSelectedUsersForInvite([]);
        }
      } catch (error) {
        console.error('Erro ao carregar convites:', error);
        setSelectedUsersForInvite([]);
      }
    } else {
      setSelectedVisit(null);
      setSelectedUsersForInvite([]);
      setFormData({
        title: '',
        type: 'comercial',
        client_id: '',
        lead_id: '',
        scheduled_date: '',
        scheduled_time: '',
        address: '',
        responsible_id: '',
        notes: '',
        status: 'agendada'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedVisit(null);
    setSelectedUsersForInvite([]);
    setFormData({
      title: '',
      type: 'comercial',
      client_id: '',
      lead_id: '',
      scheduled_date: '',
      scheduled_time: '',
      address: '',
      responsible_id: '',
      notes: '',
      status: 'agendada'
    });
  };

  const handleSubmit = async () => {
    try {
      let visitId;
      
      if (selectedVisit) {
        await api.put(`/visits/${selectedVisit.id}`, formData);
        visitId = selectedVisit.id;
        setSnackbar({
          open: true,
          message: 'Visita atualizada com sucesso!',
          severity: 'success'
        });
      } else {
        const response = await api.post('/visits', formData);
        visitId = response.data.visit?.id;
        setSnackbar({
          open: true,
          message: 'Visita criada com sucesso!',
          severity: 'success'
        });
      }
      
      // Enviar convites para usuários selecionados se houver
      if (selectedUsersForInvite.length > 0 && visitId) {
        await sendInvitesToUsers(visitId);
      }
      
      handleCloseDialog();
      fetchVisits();
    } catch (error) {
      console.error('Erro ao salvar visita:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar visita: ' + error.message,
        severity: 'error'
      });
    }
  };

  // Função para enviar convites aos usuários selecionados
  const sendInvitesToUsers = async (visitId) => {
    try {
      for (const userId of selectedUsersForInvite) {
        // Verificar disponibilidade através da rota de sugestão de horários
        const availabilityResponse = await api.get('/visits/suggest-times', {
          params: {
            date: formData.scheduled_date,
            user_id: userId
          }
        });

        // Assumir que está disponível se não houver conflitos
        if (availabilityResponse.data.suggested_times.length > 0) {
          // Usar a rota correta de planejamento colaborativo
          await api.post('/planning-collaboration/invite', {
            planning_id: visitId, // Assumindo que visitId é o planning_id
            invited_user_id: userId,
            message: `Convite para visita técnica agendada para ${formData.scheduled_date}`
          });
        }
      }

      setSnackbar({
        open: true,
        message: `Convites enviados para ${selectedUsersForInvite.length} colaborador(es)`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao enviar convites:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao enviar convites para colaboradores',
        severity: 'warning'
      });
    }
  };

  const handleDelete = async (visitId) => {
    setDeletionTarget({ id: visitId });
    setShowDeletionDialog(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderVisitsList = () => {
    if (activeTab !== 0) return null;

    return (
      <Box>
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
                    <MenuItem value="comercial">Comercial</MenuItem>
                    <MenuItem value="tecnica">Técnica</MenuItem>
                    <MenuItem value="implantacao">Implantação</MenuItem>
                    <MenuItem value="instalacao">Instalação</MenuItem>
                    <MenuItem value="manutencao">Manutenção</MenuItem>
                    <MenuItem value="suporte">Suporte</MenuItem>
                    <MenuItem value="treinamento">Treinamento</MenuItem>
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

        {/* Lista de Visitas (virtualizada) */}
        <Card>
          <CardContent>
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <LinearProgress sx={{ width: '100%', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Carregando visitas...
                </Typography>
              </Box>
            ) : (
              <Box sx={{ height: 560, width: '100%' }}>
                <DataGrid
                  rows={visits}
                  getRowId={(row) => row.id}
                  columns={[
                    {
                      field: 'title',
                      headerName: 'Visita',
                      flex: 1.2,
                      renderCell: (params) => (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ bgcolor: `${typeColors[params.row.type] || 'default'}.main`, width: 32, height: 32 }}>
                            {typeIcons[params.row.type] || <Schedule />}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {params.row.title}
                            </Typography>
                            <Chip
                              label={params.row.type}
                              size="small"
                              color={typeColors[params.row.type] || 'default'}
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      )
                    },
                    {
                      field: 'entity',
                      headerName: 'Tipo',
                      flex: 0.8,
                      sortable: false,
                      valueGetter: (params) => params.row.client ? 'Cliente' : 'Lead',
                      renderCell: (params) => (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            icon={params.row.client ? <Business /> : <Assignment />}
                            label={params.row.client ? 'Cliente' : 'Lead'}
                            size="small"
                            color={params.row.client ? 'primary' : 'secondary'}
                            variant="outlined"
                          />
                          <Typography variant="body2" color="text.secondary">
                            {params.row.client?.company_name || params.row.lead?.company_name || ''}
                          </Typography>
                        </Box>
                      )
                    },
                    {
                      field: 'scheduled',
                      headerName: 'Data & Hora',
                      flex: 0.9,
                      valueGetter: (params) => `${formatDate(params.row.scheduled_date)} ${formatTime(params.row.scheduled_time)}`,
                      renderCell: (params) => (
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {formatDate(params.row.scheduled_date)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTime(params.row.scheduled_time)}
                          </Typography>
                        </Box>
                      )
                    },
                    {
                      field: 'address',
                      headerName: 'Local',
                      flex: 1,
                      valueGetter: (params) => params.row.address || 'Endereço não informado'
                    },
                    {
                      field: 'status',
                      headerName: 'Status',
                      flex: 0.7,
                      renderCell: (params) => (
                        <Chip
                          icon={statusIcons[params.row.status]}
                          label={params.row.status}
                          color={statusColors[params.row.status] || 'default'}
                          size="small"
                        />
                      )
                    },
                    {
                      field: 'actions',
                      headerName: 'Ações',
                      sortable: false,
                      align: 'center',
                      headerAlign: 'center',
                      flex: 0.6,
                      renderCell: (params) => (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Visualizar">
                            <IconButton size="small" onClick={() => setViewVisit(params.row)}>
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => handleOpenDialog(params.row)}>
                              <Edit />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )
                    }
                  ]}
                  disableRowSelectionOnClick
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10, page: 0 } }
                  }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Gestão de Visitas
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Gerencie visitas, planejamentos e execuções de forma integrada
      </Typography>

      {/* Abas Principais */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="Gerenciamento de Visitas">
          <Tab label="Visitas" icon={<Schedule />} iconPosition="start" />
          <Tab label="Calendário" icon={<AccessTime />} iconPosition="start" />
          <Tab label="Planejamento" icon={<Timeline />} iconPosition="start" />
          <Tab label="Execução" icon={<PlayArrow />} iconPosition="start" />
          <Tab label="Histórico" icon={<History />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Conteúdo das Abas */}
      {activeTab === 0 && renderVisitsList()}
      
      {activeTab === 1 && <VisitsCalendar />}
      
      {activeTab === 2 && (
        <WeeklyPlanningManager 
          planningType={user.role === 'sales' ? 'comercial' : 
                       ['admin', 'master', 'manager'].includes(user.role) ? 'comercial' : 'tecnica'}
          onPlanningUpdated={() => {
            // Planejamento atualizado
          }}
        />
      )}
      
      {activeTab === 3 && (
        <VisitExecutionManager
          planningType={user.role === 'sales' ? 'comercial' : 
                       ['admin', 'master', 'manager'].includes(user.role) ? 'comercial' : 'tecnica'}
          planningId={searchParams.get('planningId')}
          onPlanningUpdated={() => {
            // Execução de planejamento atualizada
          }}
        />
      )}
      
      {activeTab === 4 && <PlanningHistory />}

      {/* Floating Action Button para criar nova visita */}
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

      {/* Dialog de Visualização da Visita */}
      <Dialog open={!!viewVisit} onClose={() => setViewVisit(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: `${typeColors[viewVisit?.type] || 'default'}.main` }}>
              {viewVisit && typeIcons[viewVisit.type]}
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
                    {viewVisit.client?.company_name || viewVisit.lead?.company_name || 'Cliente não definido'}
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
              
              {/* Controle de Tempo */}
              <Grid item xs={12}>
                <VisitTimeControl 
                  visit={viewVisit} 
                  onVisitUpdated={(updatedVisit) => {
                    setVisits(prevVisits => 
                      prevVisits.map(v => v.id === updatedVisit.id ? updatedVisit : v)
                    );
                    setViewVisit(updatedVisit);
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

      {/* Dialog de Criação/Edição */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedVisit ? 'Editar Visita' : 'Nova Visita'}
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
                  <MenuItem value="tecnica">Técnica</MenuItem>
                  <MenuItem value="implantacao">Implantação</MenuItem>
                  <MenuItem value="instalacao">Instalação</MenuItem>
                  <MenuItem value="manutencao">Manutenção</MenuItem>
                  <MenuItem value="suporte">Suporte</MenuItem>
                  <MenuItem value="treinamento">Treinamento</MenuItem>
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
                disabled={!!selectedVisit}
                helperText={selectedVisit ? "Endereço não pode ser alterado após criação" : ""}
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
              <Typography variant="subtitle1" gutterBottom>
                Convidar Colaboradores
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Selecione usuários para participar desta visita. O sistema verificará a disponibilidade e fará a reserva na agenda.
              </Typography>
              <UserSelector
                selectedUsers={selectedUsersForInvite}
                onSelectionChange={setSelectedUsersForInvite}
                multiple={true}
                disabled={false}
                fullWidth={true}
                label="Selecionar Colaboradores"
                helperText="Escolha os usuários que participarão desta visita"
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
            {selectedVisit ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <DeletionReasonDialog
        open={showDeletionDialog}
        title="Excluir Visita"
        onCancel={() => { setShowDeletionDialog(false); setDeletionTarget(null); }}
        onConfirm={async (reason) => {
          try {
            const visitId = deletionTarget?.id;
            await api.delete(`/visits/${visitId}`, { data: { deletion_reason: reason } });
            notifyVisitDeleted(visitId);
            setSnackbar({ open: true, message: 'Visita excluída com sucesso!', severity: 'success' });
            fetchVisits();
          } catch (error) {
            const msg = error.response?.data?.error || error.message || 'Falha ao excluir visita';
            setSnackbar({ open: true, message: msg, severity: 'error' });
          } finally {
            setShowDeletionDialog(false);
            setDeletionTarget(null);
          }
        }}
      />
    </Box>
  );
};

export default VisitsManagementPage;
