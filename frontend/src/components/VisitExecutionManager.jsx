import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Snackbar,
  Fab,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Schedule,
  AccessTime,
  CheckCircle,
  ExpandMore,
  Business,
  Engineering,
  Build,
  Assignment,
  PlayArrow,
  Stop,
  LocationOn,
  Assessment,
  Timeline,
  Close as CloseIcon,
  Map
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { formatDate, formatTime } from '../utils/dateUtils';

const VisitExecutionManager = ({ planningType, planningId, onPlanningUpdated }) => {
  const { user } = useAuth();
  
  console.log('🚀 VisitExecutionManager renderizando...');
  console.log('📋 Props recebidas:', { planningType, planningId, onPlanningUpdated });
  console.log('👤 Usuário:', user);
  
  const [planning, setPlanning] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Estados para check-in/check-out
  const [executionDialog, setExecutionDialog] = useState(false);
  const [executionData, setExecutionData] = useState({
    visitId: '',
    step: 'checkin',
    notes: '',
    coordinates: { lat: '', lon: '' },
    locationData: null // Adicionado para armazenar dados da localização
  });
  
  // Estados para fechamento de planejamento
  const [closingDialog, setClosingDialog] = useState(false);
  const [selectedPlanning, setSelectedPlanning] = useState(null);
  const [closingData, setClosingData] = useState({
    evaluation_notes: '',
    next_week_planning: ''
  });
  
  // Estados para métricas
  const [metricsDialog, setMetricsDialog] = useState(false);
  const [planningMetrics, setPlanningMetrics] = useState(null);

  useEffect(() => {
    fetchPlanning();
  }, [planningType, user?.id, planningId]);

  // Buscar planejamentos disponíveis para execução (após fechamento)
  const fetchPlanning = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user?.id) return;
      
      const params = { 
        type: planningType,
        status: 'em_execucao' // Apenas planejamentos fechados e disponíveis para execução
      };
      
      // Usuários não-gerenciais só veem seus próprios planejamentos
      if (!['manager', 'admin', 'master'].includes(user.role)) {
        params.responsible_id = user.id;
      }
      
      if (planningId) {
        params.id = planningId;
      }

      console.log('🔍 Buscando planejamentos disponíveis para execução com params:', params);
      const response = await api.get('/visit-planning', { params });
      
      let fetched = response.data.planning || [];
      if (planningId) {
        fetched = fetched.filter(p => p.id === planningId);
      }
      
      console.log('📊 Planejamentos disponíveis para execução encontrados:', fetched.length);
      setPlanning(fetched);
    } catch (error) {
      console.error('Erro ao buscar planejamentos:', error);
      setError('Erro ao carregar planejamentos disponíveis para execução: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Obter localização atual com validação rigorosa
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não é suportada pelo navegador'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Validar precisão da localização
          if (position.coords.accuracy > 100) { // Precisão deve ser menor que 100 metros
            reject(new Error('Precisão da localização insuficiente. Posicione-se melhor no local da visita.'));
            return;
          }

          // Validar se as coordenadas são razoáveis (dentro do Brasil)
          const { latitude, longitude } = position.coords;
          if (latitude > 5 || latitude < -34 || longitude > -34 || longitude < -74) {
            reject(new Error('Localização fora da área de cobertura. Verifique se está no local correto.'));
            return;
          }

          resolve({
            lat: latitude,
            lon: longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          let errorMessage = 'Erro ao obter localização';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permissão de localização negada. É obrigatório permitir o acesso para fazer check-in/check-out.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Informações de localização indisponíveis. Verifique se o GPS está ativo.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tempo limite para obter localização. Verifique a conexão GPS.';
              break;
            default:
              errorMessage = `Erro de geolocalização: ${error.message}`;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true, // Força alta precisão
          timeout: 30000, // 30 segundos de timeout
          maximumAge: 0 // Sempre obter localização atual
        }
      );
    });
  };

  // Preencher coordenadas automaticamente (única opção permitida)
  const fillCoordinates = async () => {
    try {
      setSnackbar({
        open: true,
        message: 'Obtendo localização em tempo real...',
        severity: 'info'
      });
      
      const location = await getCurrentLocation();
      
      // Validar se a localização foi obtida recentemente (últimos 5 segundos)
      const now = Date.now();
      const locationAge = now - location.timestamp;
      
      if (locationAge > 5000) { // 5 segundos
        throw new Error('Localização muito antiga. Obtenha uma nova localização.');
      }
      
      setExecutionData(prev => ({
        ...prev,
        coordinates: {
          lat: location.lat,
          lon: location.lon
        },
        locationData: {
          accuracy: location.accuracy,
          timestamp: location.timestamp
        }
      }));
      
      setSnackbar({
        open: true,
        message: `Localização obtida com sucesso! Precisão: ${Math.round(location.accuracy)}m`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      
      // Se for erro de permissão, mostrar instruções obrigatórias
      if (error.message.includes('negada')) {
        setSnackbar({
          open: true,
          message: 'PERMISSÃO OBRIGATÓRIA: É necessário permitir o acesso à localização para fazer check-in/check-out. Verifique as configurações do navegador.',
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: error.message,
          severity: 'error'
        });
      }
    }
  };

  // Executar check-in/check-out com validação rigorosa
  const executeVisitStep = async () => {
    try {
      // Verificar se as coordenadas foram obtidas automaticamente
      if (!executionData.locationData || !executionData.locationData.timestamp) {
        setSnackbar({
          open: true,
          message: 'Localização deve ser obtida automaticamente. Clique em "Obter Localização Atual".',
          severity: 'error'
        });
        return;
      }

      // Verificar se a localização não é muito antiga (máximo 10 segundos)
      const now = Date.now();
      const locationAge = now - executionData.locationData.timestamp;
      
      if (locationAge > 10000) { // 10 segundos
        setSnackbar({
          open: true,
          message: 'Localização expirada. Obtenha uma nova localização antes de continuar.',
          severity: 'error'
        });
        return;
      }

      // Verificar precisão da localização
      if (executionData.locationData.accuracy > 100) {
        setSnackbar({
          open: true,
          message: 'Precisão da localização insuficiente. Posicione-se melhor no local da visita.',
          severity: 'error'
        });
        return;
      }

      const { step, visitId, notes, coordinates } = executionData;
      
      if (step === 'checkin') {
        await api.post(`/visit-planning/items/${visitId}/checkin`, {
          latitude: parseFloat(coordinates.lat),
          longitude: parseFloat(coordinates.lon),
          notes,
          start_time: new Date().toISOString(),
          accuracy: executionData.locationData.accuracy,
          timestamp: executionData.locationData.timestamp
        });
      } else if (step === 'checkout') {
        await api.post(`/visit-planning/items/${visitId}/checkout`, {
          end_time: new Date().toISOString(),
          visit_report: notes,
          next_steps: '',
          client_satisfaction: 'satisfeito'
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
      
      if (onPlanningUpdated) onPlanningUpdated();
    } catch (error) {
      console.error('Erro ao executar etapa:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao executar etapa: ' + (error.response?.data?.error || error.message),
        severity: 'error'
      });
    }
  };

  // Verificar se todas as visitas do planejamento foram concluídas
  const allVisitsCompleted = (plan) => {
    if (!plan.items || plan.items.length === 0) return false;
    
    return plan.items.every(item => {
      // Verificar se a visita foi concluída
      if (item.status === 'concluida') return true;
      if (item.checkin_time && item.checkout_time) return true;
      return false;
    });
  };

  // Verificar se o planejamento pode ser fechado
  const canClosePlanning = (plan) => {
    return plan.status === 'em_execucao' && allVisitsCompleted(plan);
  };

  // Abrir diálogo de fechamento de planejamento
  const openClosingDialog = (plan) => {
    setSelectedPlanning(plan);
    setClosingData({
      evaluation_notes: '',
      next_week_planning: ''
    });
    setClosingDialog(true);
  };

  // Fechar planejamento
  const closePlanning = async () => {
    try {
      if (!closingData.evaluation_notes) {
        setSnackbar({
          open: true,
          message: 'Observações de avaliação são obrigatórias',
          severity: 'error'
        });
        return;
      }

      if (!selectedPlanning) {
        setSnackbar({
          open: true,
          message: 'Planejamento não selecionado',
          severity: 'error'
        });
        return;
      }

      // Verificar se ainda pode ser fechado
      if (!canClosePlanning(selectedPlanning)) {
        setSnackbar({
          open: true,
          message: 'Todas as visitas devem estar concluídas para fechar o planejamento',
          severity: 'error'
        });
        return;
      }

      await api.put(`/visit-planning/${selectedPlanning.id}/status`, {
        status: 'avaliada',
        evaluation_notes: closingData.evaluation_notes,
        next_week_planning: closingData.next_week_planning
      });

      setSnackbar({
        open: true,
        message: 'Planejamento fechado com sucesso!',
        severity: 'success'
      });

      setClosingDialog(false);
      resetClosingData();
      fetchPlanning();
      
      if (onPlanningUpdated) onPlanningUpdated();
    } catch (error) {
      console.error('Erro ao fechar planejamento:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao fechar planejamento: ' + (error.response?.data?.error || error.message),
        severity: 'error'
      });
    }
  };

  // Carregar métricas do planejamento
  const loadPlanningMetrics = async (planningId) => {
    try {
      const response = await api.get(`/visit-planning/${planningId}/report`);
      setPlanningMetrics(response.data);
      setMetricsDialog(true);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar métricas do planejamento',
        severity: 'error'
      });
    }
  };

  // Funções auxiliares
  const resetExecutionData = () => {
    setExecutionData({
      visitId: '',
      step: 'checkin',
      notes: '',
      coordinates: { lat: '', lon: '' },
      locationData: null
    });
  };

  const resetClosingData = () => {
    setClosingData({
      evaluation_notes: '',
      next_week_planning: ''
    });
  };

  const openExecutionDialog = (visit, step) => {
    setExecutionData({
      visitId: visit.id,
      step,
      notes: '',
      coordinates: { lat: '', lon: '' },
      locationData: null
    });
    setExecutionDialog(true);
  };

  // Status do planejamento
  const getPlanningStatus = (planning) => {
    if (planning.status === 'avaliada') return { color: 'success', text: 'Finalizado', icon: <CheckCircle /> };
    if (planning.status === 'em_execucao') return { color: 'warning', text: 'Em Execução', icon: <AccessTime /> };
    return { color: 'info', text: 'Em Planejamento', icon: <Schedule /> };
  };

  // Verificar se uma visita pode ser iniciada (sequência cronológica)
  const canStartVisit = (currentItem, allItems) => {
    // Ordenar itens por data e horário
    const sortedItems = [...allItems].sort((a, b) => {
      const dateA = new Date(`${a.planned_date}T${a.planned_time || '00:00'}`);
      const dateB = new Date(`${b.planned_date}T${b.planned_time || '00:00'}`);
      return dateA - dateB;
    });

    // Encontrar o índice do item atual
    const currentIndex = sortedItems.findIndex(item => item.id === currentItem.id);
    
    // Se é o primeiro item, pode iniciar
    if (currentIndex === 0) {
      return true;
    }

    // Verificar se todos os itens anteriores foram finalizados
    for (let i = 0; i < currentIndex; i++) {
      const prevItem = sortedItems[i];
      const isCompleted = prevItem.status === 'concluida' || 
                         (prevItem.checkin_time && prevItem.checkout_time);
      
      if (!isCompleted) {
        return false; // Item anterior ainda não foi finalizado
      }
    }

    return true;
  };

  // Obter status da visita
  const getVisitStatus = (item) => {
    // Se o item tem status específico, usar ele
    if (item.status === 'concluida') {
      return { color: 'success', text: 'Concluída', icon: <CheckCircle /> };
    }
    if (item.status === 'em_andamento') {
      return { color: 'warning', text: 'Em Andamento', icon: <AccessTime /> };
    }
    if (item.status === 'reagendada') {
      return { color: 'info', text: 'Reagendada', icon: <Schedule /> };
    }
    if (item.status === 'planejada') {
      return { color: 'info', text: 'Planejada', icon: <Schedule /> };
    }
    
    // Se não tem status específico, verificar se tem check-in/check-out
    if (item.checkin_time && item.checkout_time) {
      return { color: 'success', text: 'Concluída', icon: <CheckCircle /> };
    }
    if (item.checkin_time && !item.checkout_time) {
      return { color: 'warning', text: 'Em Andamento', icon: <AccessTime /> };
    }
    
    // Status padrão
    return { color: 'info', text: 'Planejada', icon: <Schedule /> };
  };

  // Calcular progresso do planejamento
  const calculateProgress = (planning) => {
    if (!planning.items || planning.items.length === 0) return 0;
    
    const completed = planning.items.filter(item => {
      // Verificar se a visita foi concluída
      if (item.status === 'concluida') return true;
      if (item.checkin_time && item.checkout_time) return true;
      return false;
    }).length;
    
    return Math.round((completed / planning.items.length) * 100);
  };

  // Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Formatar tempo
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
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
      return timeString || '';
    }
  };

  // Funções auxiliares para renderização
  const getVisitTypeIcon = (type) => {
    switch (type) {
      case 'comercial': return <Business />;
      case 'tecnica': return <Engineering />;
      case 'instalacao': return <Build />;
      case 'manutencao': return <Engineering />;
      case 'suporte': return <Assignment />;
      case 'treinamento': return <Assignment />;
      default: return <Assignment />;
    }
  };

  const getVisitTypeLabel = (type) => {
    switch (type) {
      case 'comercial': return 'Comercial';
      case 'tecnica': return 'Técnica';
      case 'instalacao': return 'Instalação';
      case 'manutencao': return 'Manutenção';
      case 'suporte': return 'Suporte';
      case 'treinamento': return 'Treinamento';
      default: return type;
    }
  };

  const getVisitTypeColor = (type) => {
    switch (type) {
      case 'comercial': return 'primary';
      case 'tecnica': return 'warning';
      case 'instalacao': return 'success';
      case 'manutencao': return 'error';
      case 'suporte': return 'info';
      case 'treinamento': return 'default';
      default: return 'default';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'baixa': return 'Baixa';
      case 'media': return 'Média';
      case 'alta': return 'Alta';
      case 'urgente': return 'Urgente';
      default: return priority;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'baixa': return 'success';
      case 'media': return 'warning';
      case 'alta': return 'error';
      case 'urgente': return 'error';
      default: return 'default';
    }
  };

  const startVisitExecution = (visitId) => {
    console.log('🚀 Iniciando execução da visita:', visitId);
    
    // Encontrar o item da visita
    const visitItem = planning.flatMap(plan => plan.items).find(item => item.id === visitId);
    if (!visitItem) {
      setSnackbar({
        open: true,
        message: 'Visita não encontrada',
        severity: 'error'
      });
      return;
    }
    
    // Abrir diálogo de execução para check-in
    setExecutionData({
      visitId: visitId,
      step: 'checkin',
      notes: '',
      coordinates: { lat: '', lon: '' },
      locationData: null
    });
    setExecutionDialog(true);
  };

  const finishVisitExecution = (visitId) => {
    console.log('✅ Finalizando execução da visita:', visitId);
    
    // Encontrar o item da visita
    const visitItem = planning.flatMap(plan => plan.items).find(item => item.id === visitId);
    if (!visitItem) {
      setSnackbar({
        open: true,
        message: 'Visita não encontrada',
        severity: 'error'
      });
      return;
    }
    
    // Abrir diálogo de execução para check-out
    setExecutionData({
      visitId: visitId,
      step: 'checkout',
      notes: '',
      coordinates: { lat: '', lon: '' },
      locationData: null
    });
    setExecutionDialog(true);
  };

  // Renderização condicional baseada no estado
  if (loading) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          🚀 Execução de Visitas Planejadas
        </Typography>
        <LinearProgress sx={{ width: '100%' }} />
        <Typography variant="body2" color="text.secondary">
          Carregando planejamentos...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          🚀 Execução de Visitas Planejadas
        </Typography>
        <Alert severity="error">{error}</Alert>
        <Typography variant="body2" color="text.secondary">
          Erro ao carregar dados
        </Typography>
      </Box>
    );
  }

  if (planning.length === 0) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          🚀 Execução de Visitas Planejadas
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Esta página exibe apenas planejamentos que foram fechados e estão disponíveis para execução.
        </Typography>
        <Alert severity="info">
                          Nenhum planejamento disponível para execução encontrado para você.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Total de planejamentos disponíveis para execução: {planning.length}
        </Typography>
      </Box>
    );
  }

  console.log('📊 Renderizando planejamentos:', planning);

  return (
    <Box>
      {/* Alertas */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Typography variant="h5" gutterBottom>
        🚀 Execução de Visitas Planejadas - {planningType === 'comercial' ? 'Comercial' : 'Técnica'}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Esta página exibe apenas planejamentos que foram fechados e estão disponíveis para execução.
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Total de planejamentos disponíveis para execução: {planning.length}
      </Typography>
      
      {planning.map((plan) => {
        const statusInfo = getPlanningStatus(plan);
        const progress = calculateProgress(plan);
        
        console.log('📋 Renderizando planejamento:', plan.id, 'com', plan.items?.length || 0, 'visitas');
        
        return (
          <Card key={plan.id} sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">
                  Semana de {formatDate(plan.week_start_date)} a {formatDate(plan.week_end_date)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    icon={statusInfo.icon}
                    label={statusInfo.text}
                    color={statusInfo.color}
                    variant="outlined"
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Assessment />}
                    onClick={() => loadPlanningMetrics(plan.id)}
                  >
                    Métricas
                  </Button>
                  {canClosePlanning(plan) && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() => openClosingDialog(plan)}
                    >
                      Finalizar Planejamento
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Progresso */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Progresso: {progress}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {plan.items?.filter(item => item.status === 'concluida' || (item.visit && item.visit.checkout_time)).length || 0} / {plan.items?.length || 0} visitas
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                {canClosePlanning(plan) && (
                  <Box sx={{ mt: 1, textAlign: 'center' }}>
                    <Chip
                      label="✅ Todas as visitas concluídas - Pode finalizar o planejamento"
                      color="success"
                      size="small"
                      variant="filled"
                    />
                  </Box>
                )}
              </Box>

              {/* Lista de Visitas */}
              {plan.items && plan.items.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    📋 Visitas Planejadas ({plan.items.length})
                  </Typography>

                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Sequência Obrigatória:</strong> As visitas devem ser executadas em ordem cronológica 
                      (data e horário). Finalize a visita anterior antes de iniciar a próxima.
                    </Typography>
                  </Alert>
                  
                  <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table size="small">
                                          <TableHead>
                      <TableRow>
                        <TableCell>Ordem</TableCell>
                        <TableCell>Data</TableCell>
                        <TableCell>Hora</TableCell>
                        <TableCell>Cliente/Lead</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Prioridade</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Ações</TableCell>
                      </TableRow>
                    </TableHead>
                      <TableBody>
                        {plan.items
                          .sort((a, b) => {
                            const dateA = new Date(`${a.planned_date}T${a.planned_time || '00:00'}`);
                            const dateB = new Date(`${b.planned_date}T${b.planned_time || '00:00'}`);
                            return dateA - dateB;
                          })
                          .map((item, index) => {
                            const visitStatus = getVisitStatus(item);
                            const canStart = canStartVisit(item, plan.items);
                            console.log('📍 Renderizando visita:', item.id, 'status:', visitStatus.text, 'canStart:', canStart);
                            
                            return (
                              <TableRow key={item.id} sx={{ 
                                backgroundColor: !canStart && visitStatus.text === 'Planejada' ? 'action.hover' : 'inherit'
                              }}>
                                <TableCell>
                                  <Chip
                                    label={index + 1}
                                    size="small"
                                    color={visitStatus.text === 'Concluída' ? 'success' : 
                                           visitStatus.text === 'Em Andamento' ? 'warning' :
                                           canStart ? 'primary' : 'default'}
                                    variant={canStart || visitStatus.text !== 'Planejada' ? 'filled' : 'outlined'}
                                  />
                                </TableCell>
                                <TableCell>{formatDate(item.planned_date)}</TableCell>
                                <TableCell>{formatTime(item.planned_time)}</TableCell>
                                <TableCell>{item.client_name}</TableCell>
                                <TableCell>
                                  <Chip
                                    icon={getVisitTypeIcon(item.visit_type)}
                                    label={getVisitTypeLabel(item.visit_type)}
                                    color={getVisitTypeColor(item.visit_type)}
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={getPriorityLabel(item.priority)}
                                    color={getPriorityColor(item.priority)}
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    icon={visitStatus.icon}
                                    label={visitStatus.text}
                                    color={visitStatus.color}
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    {visitStatus.text === 'Planejada' && (
                                      <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<PlayArrow />}
                                        onClick={() => startVisitExecution(item.id)}
                                        color="success"
                                        disabled={!canStart}
                                        title={!canStart ? 
                                          'Finalize as visitas anteriores antes de iniciar esta' : 
                                          'Iniciar visita'}
                                      >
                                        Iniciar
                                      </Button>
                                    )}
                                    {visitStatus.text === 'Em Andamento' && (
                                      <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<Stop />}
                                        onClick={() => finishVisitExecution(item.id)}
                                        color="warning"
                                      >
                                        Finalizar
                                      </Button>
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Diálogo de Execução (Check-in/Check-out) */}
      <Dialog open={executionDialog} onClose={() => setExecutionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {executionData.step === 'checkin' ? <PlayArrow color="primary" /> : <Stop color="success" />}
            {executionData.step === 'checkin' ? 'Fazer Check-in' : 'Fazer Check-out'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Confirme sua localização para {executionData.step === 'checkin' ? 'iniciar' : 'finalizar'} a visita.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                📍 Obter Localização Automática
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<LocationOn />}
                  onClick={fillCoordinates}
                  fullWidth
                >
                  Obter Localização Atual
                </Button>
              </Box>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Dica:</strong> Para garantir a precisão da localização, você deve:
                </Typography>
                <Typography variant="body2" component="ul" sx={{ mt: 1, mb: 0 }}>
                  <li>Estar próximo ao local da visita</li>
                  <li>Ter GPS ativo no dispositivo</li>
                  <li>Permitir o acesso à localização nas configurações do navegador</li>
                </Typography>
              </Alert>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                📍 Coordenadas da Visita
              </Typography>
              
              {executionData.coordinates.lat && executionData.coordinates.lon ? (
                <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2" color="success.dark" gutterBottom>
                    ✅ Localização obtida automaticamente
                  </Typography>
                  <Typography variant="body2" color="success.dark">
                    <strong>Latitude:</strong> {executionData.coordinates.lat}
                  </Typography>
                  <Typography variant="body2" color="success.dark">
                    <strong>Longitude:</strong> {executionData.coordinates.lon}
                  </Typography>
                  {executionData.locationData && (
                    <>
                      <Typography variant="body2" color="success.dark">
                        <strong>Precisão:</strong> {Math.round(executionData.locationData.accuracy)}m
                      </Typography>
                      <Typography variant="body2" color="success.dark">
                        <strong>Obtida em:</strong> {new Date(executionData.locationData.timestamp).toLocaleTimeString('pt-BR')}
                      </Typography>
                    </>
                  )}
                </Box>
              ) : (
                <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2" color="warning.dark">
                    ⚠️ Clique em "Obter Localização Atual" para capturar suas coordenadas
                  </Typography>
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={3}
                value={executionData.notes}
                onChange={(e) => setExecutionData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={`Observações sobre o ${executionData.step === 'checkin' ? 'início' : 'término'} da visita...`}
                helperText={`Descreva detalhes sobre o ${executionData.step === 'checkin' ? 'início' : 'término'} da visita`}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExecutionDialog(false)}>Cancelar</Button>
          <Button
            onClick={executeVisitStep}
            variant="contained"
            disabled={!executionData.locationData || !executionData.coordinates.lat || !executionData.coordinates.lon}
          >
            Confirmar {executionData.step === 'checkin' ? 'Check-in' : 'Check-out'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Fechamento de Planejamento */}
      <Dialog open={closingDialog} onClose={() => setClosingDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color="success" />
            Fechar Planejamento Semanal
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Avalie o planejamento da semana e planeje a próxima semana.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Avaliação da Semana *"
                multiline
                rows={4}
                value={closingData.evaluation_notes}
                onChange={(e) => setClosingData(prev => ({ ...prev, evaluation_notes: e.target.value }))}
                placeholder="Avalie o que foi realizado, dificuldades encontradas, sucessos, pontos de melhoria..."
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Planejamento da Próxima Semana"
                multiline
                rows={4}
                value={closingData.next_week_planning}
                onChange={(e) => setClosingData(prev => ({ ...prev, next_week_planning: e.target.value }))}
                placeholder="O que será planejado para a próxima semana baseado na avaliação atual..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClosingDialog(false)}>Cancelar</Button>
          <Button
            onClick={closePlanning}
            variant="contained"
            color="success"
            disabled={!closingData.evaluation_notes}
          >
            Fechar Planejamento
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Métricas */}
      <Dialog open={metricsDialog} onClose={() => setMetricsDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Timeline color="primary" />
              Métricas do Planejamento
            </Box>
            <Button onClick={() => setMetricsDialog(false)} startIcon={<CloseIcon />}>
              Fechar
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Métricas do planejamento */}
          {planningMetrics && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    📊 Visitas
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>Planejadas</TableCell>
                          <TableCell align="right">{planningMetrics.total_planned_visits || 0}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Concluídas</TableCell>
                          <TableCell align="right">{planningMetrics.total_completed_visits || 0}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Canceladas</TableCell>
                          <TableCell align="right">{planningMetrics.total_cancelled_visits || 0}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Reagendadas</TableCell>
                          <TableCell align="right">{planningMetrics.total_rescheduled_visits || 0}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    ⏱️ Tempo
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>Tempo Planejado</TableCell>
                          <TableCell align="right">{planningMetrics.planned_time ? planningMetrics.planned_time.toFixed(1) : 0}h</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Tempo Real</TableCell>
                          <TableCell align="right">{planningMetrics.actual_time ? planningMetrics.actual_time.toFixed(1) : 0}h</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    🚗 Deslocamento
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>Distância Planejada</TableCell>
                          <TableCell align="right">{planningMetrics.planned_distance ? planningMetrics.planned_distance.toFixed(1) : 0} km</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Distância Real</TableCell>
                          <TableCell align="right">{planningMetrics.actual_distance ? planningMetrics.actual_distance.toFixed(1) : 0} km</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Combustível Planejado</TableCell>
                          <TableCell align="right">{planningMetrics.planned_fuel ? planningMetrics.planned_fuel.toFixed(1) : 0}L</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Combustível Real</TableCell>
                          <TableCell align="right">{planningMetrics.actual_fuel ? planningMetrics.actual_fuel.toFixed(1) : 0}L</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    💰 Custos
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>Custo Planejado</TableCell>
                          <TableCell align="right">R$ {planningMetrics.planned_cost ? planningMetrics.planned_cost.toFixed(2) : '0,00'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Custo Real</TableCell>
                          <TableCell align="right">R$ {planningMetrics.actual_cost ? planningMetrics.actual_cost.toFixed(2) : '0,00'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Diferença</TableCell>
                          <TableCell align="right" sx={{ 
                            color: planningMetrics.actual_cost && planningMetrics.planned_cost && 
                              planningMetrics.actual_cost > planningMetrics.planned_cost ? 'error.main' : 'success.main',
                            fontWeight: 'bold'
                          }}>
                            R$ {planningMetrics.actual_cost && planningMetrics.planned_cost ? 
                              (planningMetrics.actual_cost - planningMetrics.planned_cost).toFixed(2) : '0,00'}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'primary.light' }}>
                  <Typography variant="h6" gutterBottom color="primary.contrastText">
                    📈 Indicadores de Performance
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h4" color="primary.contrastText" gutterBottom>
                          {planningMetrics.efficiency_rate ? planningMetrics.efficiency_rate.toFixed(1) : 0}%
                        </Typography>
                        <Typography variant="body2" color="primary.contrastText">
                          Taxa de Eficiência
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h4" color="primary.contrastText" gutterBottom>
                          {planningMetrics.total_planned_visits && planningMetrics.total_completed_visits ? 
                            Math.round((planningMetrics.total_completed_visits / planningMetrics.total_planned_visits) * 100) : 0}%
                        </Typography>
                        <Typography variant="body2" color="primary.contrastText">
                          Taxa de Conclusão
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h4" color="primary.contrastText" gutterBottom>
                          {planningMetrics.actual_time && planningMetrics.planned_time ? 
                            Math.round((planningMetrics.actual_time / planningMetrics.planned_time) * 100) : 0}%
                        </Typography>
                        <Typography variant="body2" color="primary.contrastText">
                          Eficiência de Tempo
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h4" color="primary.contrastText" gutterBottom>
                          {planningMetrics.actual_distance && planningMetrics.planned_distance ? 
                            Math.round((planningMetrics.planned_distance / planningMetrics.actual_distance) * 100) : 0}%
                        </Typography>
                        <Typography variant="body2" color="primary.contrastText">
                          Eficiência de Rota
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default VisitExecutionManager
