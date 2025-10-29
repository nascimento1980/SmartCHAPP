import React, { useState, useEffect } from 'react';
import DailyVisitTracker from '../components/DailyVisitTracker';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  LocationOn,
  Schedule,
  CheckCircle,
  Cancel,
  Refresh,
  Assessment,
  ExpandMore,
  DirectionsCar,
  Engineering,
  Build,
  Assignment,
  Info,
  Warning,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const VisitsExecutionPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Estados para execução de visitas
  const [executionDialog, setExecutionDialog] = useState(false);
  const [executionData, setExecutionData] = useState({
    visitId: '',
    step: 'checkin',
    notes: '',
    coordinates: { lat: '', lon: '' }
  });
  
  // Estados para reagendamento
  const [rescheduleDialog, setRescheduleDialog] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({
    visitId: '',
    newDate: null,
    newTime: null,
    reason: '',
    notes: ''
  });
  
  // Estados para relatório
  const [reportDialog, setReportDialog] = useState(false);
  const [selectedPlanning, setSelectedPlanning] = useState(null);
  const [reportData, setReportData] = useState(null);
  
  // Estado para acompanhamento diário
  const [selectedPlanningForTracking, setSelectedPlanningForTracking] = useState(null);

  useEffect(() => {
    console.log('👤 Usuário atual:', user);
    fetchPlanning();
  }, [user?.id]);

  // Buscar planejamentos em execução
  const fetchPlanning = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) return;
      
      // Usuários master podem ver todos os tipos, outros veem apenas seu tipo
      const params = { 
        status: 'em_execucao'
      };
      
      // Se não for master, filtrar por tipo e responsável
      if (user.role !== 'master') {
        params.type = user.role === 'sales' ? 'comercial' : 'tecnica';
        params.responsible_id = user.id;
      }
      
      console.log('🔍 Parâmetros da busca:', params);
      console.log('👤 Role do usuário:', user.role);
      
      const response = await api.get('/visit-planning', { params });
      
      console.log('📥 Planejamentos em execução:', response.data);
      console.log('📊 Total de planejamentos:', response.data.planning?.length || 0);
      setPlanning(response.data.planning || []);
    } catch (error) {
      console.error('Erro ao buscar planejamentos:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar planejamentos: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Obter localização atual
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude.toFixed(8),
            lon: position.coords.longitude.toFixed(8)
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  // Preencher coordenadas automaticamente
  const fillCoordinates = async () => {
    try {
      const location = await getCurrentLocation();
      setExecutionData(prev => ({
        ...prev,
        coordinates: location
      }));
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erro ao obter localização: ' + error.message,
        severity: 'error'
      });
    }
  };

  // Executar check-in/check-out
  const executeVisitStep = async () => {
    try {
      if (!executionData.coordinates.lat || !executionData.coordinates.lon) {
        setSnackbar({
          open: true,
          message: 'Coordenadas são obrigatórias',
          severity: 'error'
        });
        return;
      }

      const { step, visitId, notes, coordinates } = executionData;
      
      if (step === 'checkin') {
        await api.post(`/visits/${visitId}/checkin`, {
          latitude: parseFloat(coordinates.lat),
          longitude: parseFloat(coordinates.lon),
          notes
        });
      } else if (step === 'checkout') {
        await api.post(`/visits/${visitId}/checkout`, {
          latitude: parseFloat(coordinates.lat),
          longitude: parseFloat(coordinates.lon),
          notes
        });
      }

      setSnackbar({
        open: true,
        message: `${step === 'checkin' ? 'Check-in' : 'Check-out'} realizado com sucesso!`,
        severity: 'success'
      });

      setExecutionDialog(false);
      resetExecutionData();
      fetchPlanning();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erro ao executar etapa: ' + (error.response?.data?.error || error.message),
        severity: 'error'
      });
    }
  };

  // Reagendar visita
  const rescheduleVisit = async () => {
    try {
      if (!rescheduleData.newDate || !rescheduleData.reason) {
        setSnackbar({
          open: true,
          message: 'Data e motivo são obrigatórios',
          severity: 'error'
        });
        return;
      }

      await api.put(`/visit-planning-items/${rescheduleData.visitId}/reschedule`, {
        new_date: rescheduleData.newDate,
        new_time: rescheduleData.newTime,
        reason: rescheduleData.reason,
        notes: rescheduleData.notes
      });

      setSnackbar({
        open: true,
        message: 'Visita reagendada com sucesso!',
        severity: 'success'
      });

      setRescheduleDialog(false);
      resetRescheduleData();
      fetchPlanning();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erro ao reagendar visita: ' + (error.response?.data?.error || error.message),
        severity: 'error'
      });
    }
  };

  // Gerar relatório previsto x realizado
  const generateReport = async (planningId) => {
    try {
      const response = await api.get(`/visit-planning/${planningId}/report`);
      setReportData(response.data);
      setReportDialog(true);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erro ao gerar relatório: ' + error.message,
        severity: 'error'
      });
    }
  };

  // Abrir diálogo de execução
  const openExecutionDialog = (visitId, step) => {
    setExecutionData({
      visitId,
      step,
      notes: '',
      coordinates: { lat: '', lon: '' }
    });
    setExecutionDialog(true);
  };

  // Abrir diálogo de reagendamento
  const openRescheduleDialog = (visitId) => {
    setRescheduleData({
      visitId,
      newDate: null,
      newTime: null,
      reason: '',
      notes: ''
    });
    setRescheduleDialog(true);
  };

  // Resetar dados de execução
  const resetExecutionData = () => {
    setExecutionData({
      visitId: '',
      step: 'checkin',
      notes: '',
      coordinates: { lat: '', lon: '' }
    });
  };

  // Resetar dados de reagendamento
  const resetRescheduleData = () => {
    setRescheduleData({
      visitId: '',
      newDate: null,
      newTime: null,
      reason: '',
      notes: ''
    });
  };

  // Obter ícone do tipo de visita
  const getVisitTypeIcon = (type) => {
    const icons = {
      'comercial': <DirectionsCar />,
      'tecnica': <Engineering />,
      'suporte': <Assignment />,
      'manutencao': <Build />,
      'instalacao': <Engineering />,
      'treinamento': <Assignment />
    };
    return icons[type] || <Info />;
  };

  // Obter cor do status
  const getStatusColor = (status) => {
    const colors = {
      'planejada': 'info',
      'em_andamento': 'warning',
      'concluida': 'success',
      'cancelada': 'error',
      'reagendada': 'secondary'
    };
    return colors[status] || 'default';
  };

  // Formatar data
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Formatar hora
  const formatTime = (timeString) => {
    if (!timeString) return 'Não definido';
    try {
      return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Formato inválido';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Carregando planejamentos...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🚀 Execução de Visitas Planejadas
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Gerencie a execução das visitas planejadas, realize check-ins/check-outs e acompanhe o progresso
      </Typography>

      {planning.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhum planejamento em execução encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Os planejamentos aparecerão aqui após serem fechados no sistema de planejamento
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {planning.map((plan) => (
            <Grid item xs={12} key={plan.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      📅 Semana de {formatDate(plan.week_start_date)} a {formatDate(plan.week_end_date)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        icon={<PlayArrow />}
                        label="Em Execução"
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                      <Button
                        size="small"
                        startIcon={<Assessment />}
                        onClick={() => generateReport(plan.id)}
                        variant="outlined"
                      >
                        Relatório
                      </Button>
                      <Button
                        size="small"
                        startIcon={<Schedule />}
                        onClick={() => setSelectedPlanningForTracking(plan.id)}
                        color="primary"
                        variant="contained"
                      >
                        🚀 Acompanhar Visitas
                      </Button>
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Responsável: {plan.responsible?.name || 'N/A'}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {plan.items?.length || 0} visitas planejadas
                  </Typography>

                  {/* Lista de visitas */}
                  {plan.items && plan.items.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Visitas da Semana:
                      </Typography>
                      
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Data</TableCell>
                              <TableCell>Horário</TableCell>
                              <TableCell>Cliente</TableCell>
                              <TableCell>Tipo</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Ações</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {plan.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{formatDate(item.planned_date)}</TableCell>
                                <TableCell>{formatTime(item.planned_time)}</TableCell>
                                <TableCell>{item.client_name}</TableCell>
                                <TableCell>
                                  <Chip
                                    icon={getVisitTypeIcon(item.visit_type)}
                                    label={item.visit_type}
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={item.status}
                                    color={getStatusColor(item.status)}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    {item.status === 'planejada' && (
                                      <>
                                        <Tooltip title="Check-in">
                                          <IconButton
                                            size="small"
                                            color="success"
                                            onClick={() => openExecutionDialog(item.id, 'checkin')}
                                          >
                                            <PlayArrow />
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Reagendar">
                                          <IconButton
                                            size="small"
                                            color="warning"
                                            onClick={() => openRescheduleDialog(item.id)}
                                          >
                                            <Schedule />
                                          </IconButton>
                                        </Tooltip>
                                      </>
                                    )}
                                    
                                    {item.status === 'em_andamento' && (
                                      <Tooltip title="Check-out">
                                        <IconButton
                                          size="small"
                                          color="primary"
                                          onClick={() => openExecutionDialog(item.id, 'checkout')}
                                        >
                                          <Stop />
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
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Diálogo de Execução (Check-in/Check-out) */}
      <Dialog open={executionDialog} onClose={() => setExecutionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {executionData.step === 'checkin' ? <PlayArrow color="success" /> : <Stop color="primary" />}
            {executionData.step === 'checkin' ? 'Check-in da Visita' : 'Check-out da Visita'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Localização:</strong> As coordenadas são obrigatórias para registrar sua presença no local
                </Typography>
              </Alert>
            </Grid>
            
            <Grid item xs={12}>
              <Button
                variant="outlined"
                startIcon={<LocationOn />}
                onClick={fillCoordinates}
                fullWidth
              >
                Obter Localização Atual
              </Button>
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Latitude"
                value={executionData.coordinates.lat}
                onChange={(e) => setExecutionData(prev => ({
                  ...prev,
                  coordinates: { ...prev.coordinates, lat: e.target.value }
                }))}
                placeholder="Ex: -23.5505"
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Longitude"
                value={executionData.coordinates.lon}
                onChange={(e) => setExecutionData(prev => ({
                  ...prev,
                  coordinates: { ...prev.coordinates, lon: e.target.value }
                }))}
                placeholder="Ex: -46.6333"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={3}
                value={executionData.notes}
                onChange={(e) => setExecutionData(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                placeholder="Observações sobre a visita..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExecutionDialog(false)}>Cancelar</Button>
          <Button 
            onClick={executeVisitStep}
            variant="contained"
            color={executionData.step === 'checkin' ? 'success' : 'primary'}
            disabled={!executionData.coordinates.lat || !executionData.coordinates.lon}
          >
            {executionData.step === 'checkin' ? 'Realizar Check-in' : 'Realizar Check-out'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Reagendamento */}
      <Dialog open={rescheduleDialog} onClose={() => setRescheduleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Schedule color="warning" />
            Reagendar Visita
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Importante:</strong> Informe o motivo do reagendamento para manter o histórico
                </Typography>
              </Alert>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nova Data"
                type="date"
                value={rescheduleData.newDate || ''}
                onChange={(e) => setRescheduleData(prev => ({
                  ...prev,
                  newDate: e.target.value
                }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Novo Horário"
                type="time"
                value={rescheduleData.newTime || ''}
                onChange={(e) => setRescheduleData(prev => ({
                  ...prev,
                  newTime: e.target.value
                }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Motivo do Reagendamento</InputLabel>
                <Select
                  value={rescheduleData.reason}
                  onChange={(e) => setRescheduleData(prev => ({
                    ...prev,
                    reason: e.target.value
                  }))}
                  label="Motivo do Reagendamento"
                >
                  <MenuItem value="cliente_indisponivel">Cliente Indisponível</MenuItem>
                  <MenuItem value="problema_tecnico">Problema Técnico</MenuItem>
                  <MenuItem value="condicoes_climaticas">Condições Climáticas</MenuItem>
                  <MenuItem value="problema_veiculo">Problema com Veículo</MenuItem>
                  <MenuItem value="emergencia">Emergência</MenuItem>
                  <MenuItem value="outro">Outro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações Adicionais"
                multiline
                rows={3}
                value={rescheduleData.notes}
                onChange={(e) => setRescheduleData(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                placeholder="Detalhes adicionais sobre o reagendamento..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRescheduleDialog(false)}>Cancelar</Button>
          <Button 
            onClick={rescheduleVisit}
            variant="contained"
            color="warning"
            disabled={!rescheduleData.newDate || !rescheduleData.reason}
          >
            Reagendar Visita
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Relatório */}
      <Dialog open={reportDialog} onClose={() => setReportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Assessment color="primary" />
            Relatório Previsto x Realizado
          </Box>
        </DialogTitle>
        <DialogContent>
          {reportData && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Semana de {formatDate(reportData.week_start_date)} a {formatDate(reportData.week_end_date)}
                </Typography>
              </Grid>
              
              {/* Métricas Gerais */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      📊 Métricas Gerais
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">
                            {reportData.total_planned_visits || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Visitas Planejadas
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="success">
                            {reportData.total_completed_visits || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Visitas Concluídas
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="warning">
                            {reportData.total_cancelled_visits || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Visitas Canceladas
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="info">
                            {reportData.total_rescheduled_visits || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Visitas Reagendadas
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Comparativo Previsto x Realizado */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      📈 Comparativo Previsto x Realizado
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="h6" gutterBottom>
                            Distância
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h4" color="primary">
                              {reportData.planned_distance?.toFixed(1) || 0} km
                            </Typography>
                            <Typography variant="h4" color="success">
                              {reportData.actual_distance?.toFixed(1) || 0} km
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Previsto vs Realizado
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="h6" gutterBottom>
                            Combustível
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h4" color="primary">
                              {reportData.planned_fuel?.toFixed(1) || 0} L
                            </Typography>
                            <Typography variant="h4" color="success">
                              {reportData.actual_fuel?.toFixed(1) || 0} L
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Previsto vs Realizado
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="h6" gutterBottom>
                            Custo
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h4" color="primary">
                              R$ {reportData.planned_cost?.toFixed(2) || 0}
                            </Typography>
                            <Typography variant="h4" color="success">
                              R$ {reportData.actual_cost?.toFixed(2) || 0}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Previsto vs Realizado
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="h6" gutterBottom>
                            Tempo
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h4" color="primary">
                              {reportData.planned_time?.toFixed(1) || 0} h
                            </Typography>
                            <Typography variant="h4" color="success">
                              {reportData.actual_time?.toFixed(1) || 0} h
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Previsto vs Realizado
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Taxa de Eficiência */}
              {reportData.efficiency_rate !== undefined && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        🎯 Taxa de Eficiência
                      </Typography>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h3" color={reportData.efficiency_rate >= 80 ? 'success' : reportData.efficiency_rate >= 60 ? 'warning' : 'error'}>
                          {reportData.efficiency_rate?.toFixed(1) || 0}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {reportData.efficiency_rate >= 80 ? 'Excelente' : reportData.efficiency_rate >= 60 ? 'Bom' : 'Precisa Melhorar'}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Acompanhamento Diário */}
      {selectedPlanningForTracking && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">
              📅 Acompanhamento Diário
            </Typography>
            <Button
              variant="outlined"
              onClick={() => setSelectedPlanningForTracking(null)}
              startIcon={<Close />}
            >
              Voltar para Lista
            </Button>
          </Box>
          <DailyVisitTracker 
            planningId={selectedPlanningForTracking}
            onVisitCompleted={() => {
              fetchPlanning();
              setSnackbar({
                open: true,
                message: 'Visita atualizada com sucesso!',
                severity: 'success'
              });
            }}
          />
        </Box>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VisitsExecutionPage;
