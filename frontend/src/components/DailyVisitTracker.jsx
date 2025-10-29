import React, { useState, useEffect } from 'react';
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
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails
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
  TrendingDown,
  AccessTime,
  Directions,
  Report,
  Close,
  NavigateNext,
  NavigateBefore
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const DailyVisitTracker = ({ planningId, onVisitCompleted }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState(null);
  const [currentVisitIndex, setCurrentVisitIndex] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Estados para check-in/check-out
  const [checkinDialog, setCheckinDialog] = useState(false);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [currentVisit, setCurrentVisit] = useState(null);
  const [checkinData, setCheckinData] = useState({
    latitude: '',
    longitude: '',
    notes: '',
    startTime: ''
  });
  const [checkoutData, setCheckoutData] = useState({
    endTime: '',
    visitReport: '',
    nextSteps: '',
    clientSatisfaction: 'satisfeito'
  });
  
  // Estados para reagendamento
  const [rescheduleDialog, setRescheduleDialog] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({
    newDate: '',
    newTime: '',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    if (planningId) {
      fetchPlanning();
    }
  }, [planningId]);

  // Buscar planejamento específico
  const fetchPlanning = async () => {
    try {
      setLoading(true);
      
      const response = await api.get(`/visit-planning/${planningId}`);
      setPlanning(response.data);
      
      // Encontrar primeira visita não concluída
      const firstPendingIndex = response.data.items?.findIndex(item => 
        item.status === 'planejada' || item.status === 'em_andamento'
      ) || 0;
      setCurrentVisitIndex(firstPendingIndex);
      
    } catch (error) {
      console.error('Erro ao buscar planejamento:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar planejamento: ' + error.message,
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
      setCheckinData(prev => ({
        ...prev,
        latitude: location.lat,
        longitude: location.lon
      }));
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erro ao obter localização: ' + error.message,
        severity: 'error'
      });
    }
  };

  // Iniciar check-in
  const startCheckin = (visit) => {
    setCurrentVisit(visit);
    setCheckinData({
      latitude: '',
      longitude: '',
      notes: '',
      startTime: new Date().toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    });
    setCheckinDialog(true);
  };

  // Confirmar check-in
  const confirmCheckin = async () => {
    try {
      if (!checkinData.latitude || !checkinData.longitude) {
        setSnackbar({
          open: true,
          message: 'Coordenadas são obrigatórias',
          severity: 'error'
        });
        return;
      }

      await api.post(`/visit-planning/items/${currentVisit.id}/checkin`, {
        latitude: parseFloat(checkinData.latitude),
        longitude: parseFloat(checkinData.longitude),
        notes: checkinData.notes,
        start_time: checkinData.startTime
      });

      setSnackbar({
        open: true,
        message: 'Check-in realizado com sucesso!',
        severity: 'success'
      });

      setCheckinDialog(false);
      fetchPlanning();
      
      if (onVisitCompleted) onVisitCompleted();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erro ao realizar check-in: ' + error.message,
        severity: 'error'
      });
    }
  };

  // Iniciar check-out
  const startCheckout = (visit) => {
    setCurrentVisit(visit);
    setCheckoutData({
      endTime: new Date().toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      visitReport: '',
      nextSteps: '',
      clientSatisfaction: 'satisfeito'
    });
    setCheckoutDialog(true);
  };

  // Confirmar check-out
  const confirmCheckout = async () => {
    try {
      if (!checkoutData.visitReport) {
        setSnackbar({
          open: true,
          message: 'Relatório da visita é obrigatório',
          severity: 'error'
        });
        return;
      }

      await api.post(`/visit-planning/items/${currentVisit.id}/checkout`, {
        end_time: checkoutData.endTime,
        visit_report: checkoutData.visitReport,
        next_steps: checkoutData.nextSteps,
        client_satisfaction: checkoutData.clientSatisfaction
      });

      setSnackbar({
        open: true,
        message: 'Check-out realizado com sucesso!',
        severity: 'success'
      });

      setCheckoutDialog(false);
      fetchPlanning();
      
      if (onVisitCompleted) onVisitCompleted();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erro ao realizar check-out: ' + error.message,
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

      await api.put(`/visit-planning-items/${currentVisit.id}/reschedule`, {
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
      fetchPlanning();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erro ao reagendar visita: ' + error.message,
        severity: 'error'
      });
    }
  };

  // Navegar para próxima visita
  const goToNextVisit = () => {
    if (currentVisitIndex < (planning?.items?.length || 0) - 1) {
      setCurrentVisitIndex(currentVisitIndex + 1);
    }
  };

  // Navegar para visita anterior
  const goToPreviousVisit = () => {
    if (currentVisitIndex > 0) {
      setCurrentVisitIndex(currentVisitIndex - 1);
    }
  };

  // Obter status da visita
  const getVisitStatus = (visit) => {
    if (visit.status === 'concluida') return { label: 'Concluída', color: 'success' };
    if (visit.status === 'em_andamento') return { label: 'Em Andamento', color: 'warning' };
    if (visit.status === 'reagendada') return { label: 'Reagendada', color: 'info' };
    if (visit.status === 'cancelada') return { label: 'Cancelada', color: 'error' };
    return { label: 'Planejada', color: 'default' };
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

  // Formatar data
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Formatar hora
  const formatTime = (timeString) => {
    if (!timeString) return 'Não definido';
    
    try {
      // Se for um objeto Date, extrair HH:MM
      if (timeString instanceof Date) {
        return timeString.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Se for string no formato HH:MM
      if (typeof timeString === 'string' && /^\d{2}:\d{2}$/.test(timeString)) {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return date.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Se for string no formato ISO ou outro formato de data
      if (typeof timeString === 'string') {
        const date = new Date(timeString);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
      
      return timeString;
    } catch (error) {
      console.warn('Erro ao formatar horário:', timeString, error);
      return 'Formato inválido';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Carregando planejamento...
        </Typography>
      </Box>
    );
  }

  if (!planning) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Planejamento não encontrado
        </Alert>
      </Box>
    );
  }

  const currentVisit = planning.items?.[currentVisitIndex];
  const totalVisits = planning.items?.length || 0;
  const completedVisits = planning.items?.filter(item => item.status === 'concluida').length || 0;
  const progress = totalVisits > 0 ? (completedVisits / totalVisits) * 100 : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        📅 Acompanhamento Diário - {formatDate(planning.week_start_date)}
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Acompanhe suas visitas planejadas e gerencie o progresso da semana
      </Typography>

      {/* Progresso Geral */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Progresso da Semana
            </Typography>
            <Typography variant="h6" color="primary">
              {completedVisits}/{totalVisits} visitas concluídas
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ height: 10, borderRadius: 5 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {progress.toFixed(1)}% concluído
          </Typography>
        </CardContent>
      </Card>

      {/* Navegação entre Visitas */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Visita {currentVisitIndex + 1} de {totalVisits}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                startIcon={<NavigateBefore />}
                onClick={goToPreviousVisit}
                disabled={currentVisitIndex === 0}
              >
                Anterior
              </Button>
              <Button
                size="small"
                endIcon={<NavigateNext />}
                onClick={goToNextVisit}
                disabled={currentVisitIndex === totalVisits - 1}
              >
                Próxima
              </Button>
            </Box>
          </Box>

          {currentVisit && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>
                  {currentVisit.client_name}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Chip
                    icon={getVisitTypeIcon(currentVisit.visit_type)}
                    label={currentVisit.visit_type}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={getVisitStatus(currentVisit).label}
                    color={getVisitStatus(currentVisit).color}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  📍 {currentVisit.client_address}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  🕐 {formatDate(currentVisit.planned_date)} às {formatTime(currentVisit.planned_time)}
                </Typography>

                {currentVisit.notes && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    📝 {currentVisit.notes}
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {currentVisit.status === 'planejada' && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<PlayArrow />}
                      onClick={() => startCheckin(currentVisit)}
                      fullWidth
                    >
                      Iniciar Visita
                    </Button>
                  )}
                  
                  {currentVisit.status === 'em_andamento' && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<Stop />}
                      onClick={() => startCheckout(currentVisit)}
                      fullWidth
                    >
                      Finalizar Visita
                    </Button>
                  )}
                  
                  {(currentVisit.status === 'planejada' || currentVisit.status === 'em_andamento') && (
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<Schedule />}
                      onClick={() => {
                        setCurrentVisit(currentVisit);
                        setRescheduleDialog(true);
                      }}
                      fullWidth
                    >
                      Reagendar
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Lista de Todas as Visitas */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Agenda da Semana
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Horário</TableCell>
                  <TableCell>Cliente/Lead</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {planning.items?.map((item, index) => (
                  <TableRow 
                    key={item.id}
                    sx={{ 
                      backgroundColor: index === currentVisitIndex ? 'action.selected' : 'inherit',
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
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
                        label={getVisitStatus(item).label}
                        color={getVisitStatus(item).color}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {item.status === 'planejada' && (
                          <Tooltip title="Iniciar Visita">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => startCheckin(item)}
                            >
                              <PlayArrow />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {item.status === 'em_andamento' && (
                          <Tooltip title="Finalizar Visita">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => startCheckout(item)}
                            >
                              <Stop />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {(item.status === 'planejada' || item.status === 'em_andamento') && (
                          <Tooltip title="Reagendar">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => {
                                setCurrentVisit(item);
                                setRescheduleDialog(true);
                              }}
                            >
                              <Schedule />
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
        </CardContent>
      </Card>

      {/* Diálogo de Check-in */}
      <Dialog open={checkinDialog} onClose={() => setCheckinDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PlayArrow color="success" />
            Iniciar Visita - {currentVisit?.client_name}
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
                value={checkinData.latitude}
                onChange={(e) => setCheckinData(prev => ({
                  ...prev,
                  latitude: e.target.value
                }))}
                placeholder="Ex: -23.5505"
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Longitude"
                value={checkinData.longitude}
                onChange={(e) => setCheckinData(prev => ({
                  ...prev,
                  longitude: e.target.value
                }))}
                placeholder="Ex: -46.6333"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações Iniciais"
                multiline
                rows={3}
                value={checkinData.notes}
                onChange={(e) => setCheckinData(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                placeholder="Observações sobre o início da visita..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckinDialog(false)}>Cancelar</Button>
          <Button 
            onClick={confirmCheckin}
            variant="contained"
            color="success"
            disabled={!checkinData.latitude || !checkinData.longitude}
          >
            Iniciar Visita
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Check-out */}
      <Dialog open={checkoutDialog} onClose={() => setCheckoutDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Stop color="primary" />
            Finalizar Visita - {currentVisit?.client_name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Relatório:</strong> Preencha o relatório da visita para manter o histórico completo
                </Typography>
              </Alert>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Relatório da Visita"
                multiline
                rows={4}
                value={checkoutData.visitReport}
                onChange={(e) => setCheckoutData(prev => ({
                  ...prev,
                  visitReport: e.target.value
                }))}
                placeholder="Descreva o que foi realizado na visita..."
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Próximos Passos"
                multiline
                rows={3}
                value={checkoutData.nextSteps}
                onChange={(e) => setCheckoutData(prev => ({
                  ...prev,
                  nextSteps: e.target.value
                }))}
                placeholder="O que deve ser feito em seguida..."
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Satisfação do Cliente</InputLabel>
                <Select
                  value={checkoutData.clientSatisfaction}
                  onChange={(e) => setCheckoutData(prev => ({
                    ...prev,
                    clientSatisfaction: e.target.value
                  }))}
                  label="Satisfação do Cliente"
                >
                  <MenuItem value="muito_satisfeito">Muito Satisfeito</MenuItem>
                  <MenuItem value="satisfeito">Satisfeito</MenuItem>
                  <MenuItem value="neutro">Neutro</MenuItem>
                  <MenuItem value="insatisfeito">Insatisfeito</MenuItem>
                  <MenuItem value="muito_insatisfeito">Muito Insatisfeito</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckoutDialog(false)}>Cancelar</Button>
          <Button 
            onClick={confirmCheckout}
            variant="contained"
            color="primary"
            disabled={!checkoutData.visitReport}
          >
            Finalizar Visita
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Reagendamento */}
      <Dialog open={rescheduleDialog} onClose={() => setRescheduleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Schedule color="warning" />
            Reagendar Visita - {currentVisit?.client_name}
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
                value={rescheduleData.newDate}
                onChange={(e) => setRescheduleData(prev => ({
                  ...prev,
                  newDate: e.target.value
                }))}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Novo Horário"
                type="time"
                value={rescheduleData.newTime}
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
                  required
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

export default DailyVisitTracker;
