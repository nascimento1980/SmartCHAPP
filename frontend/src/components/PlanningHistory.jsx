import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
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
  IconButton,
  Tooltip,
  Divider,
  Tabs,
  Tab
} from '@mui/material';
import {
  Timeline,
  Assessment,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Schedule,
  AccessTime,
  Business,
  Engineering,
  Build,
  Assignment,
  CalendarMonth,
  FilterList,
  Download,
  Visibility,
  Close as CloseIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { formatDate, formatTime } from '../utils/dateUtils';

const PlanningHistory = () => {
  const { user } = useAuth();
  const [planningHistory, setPlanningHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    type: 'all',
    status: 'all',
    responsible: 'all'
  });
  
  // Estados para análise detalhada
  const [selectedPlanning, setSelectedPlanning] = useState(null);
  const [detailedMetrics, setDetailedMetrics] = useState(null);
  const [metricsDialog, setMetricsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  // Estados para gráficos
  const [performanceData, setPerformanceData] = useState([]);
  const [efficiencyTrends, setEfficiencyTrends] = useState([]);
  const [costAnalysis, setCostAnalysis] = useState([]);

  useEffect(() => {
    fetchPlanningHistory();
  }, [filters]);

  // Buscar histórico de planejamentos
  const fetchPlanningHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        status: ['avaliada', 'concluida'], // Apenas planejamentos finalizados
        include_metrics: true
      };
      
      // Aplicar filtros
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      if (filters.type !== 'all') params.type = filters.type;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.responsible !== 'all') params.responsible_id = filters.responsible;
      
      console.log('🔍 Buscando histórico com params:', params);
      
      const response = await api.get('/visit-planning/history', { params });
      console.log('📊 Resposta do histórico:', response.data);
      
      setPlanningHistory(response.data.planning || []);
      
      // Processar dados para gráficos
      processChartData(response.data.planning || []);
      
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      console.error('Detalhes do erro:', error.response?.data);
      
      let errorMessage = 'Erro ao carregar histórico';
      if (error.response?.data?.error) {
        errorMessage += ': ' + error.response.data.error;
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Processar dados para gráficos
  const processChartData = (planning) => {
    // Dados de performance ao longo do tempo
    const performance = planning
      .sort((a, b) => new Date(a.week_start_date) - new Date(b.week_start_date))
      .map(plan => ({
        week: `${formatDate(plan.week_start_date)} - ${formatDate(plan.week_end_date)}`,
        efficiency: plan.efficiency_rate || 0,
        completion: plan.total_completed_visits && plan.total_planned_visits ? 
          (plan.total_completed_visits / plan.total_planned_visits) * 100 : 0,
        costEfficiency: plan.planned_cost && plan.actual_cost ? 
          ((plan.planned_cost - plan.actual_cost) / plan.planned_cost) * 100 : 0
      }));
    
    setPerformanceData(performance);
    
    // Tendências de eficiência
    const efficiency = planning
      .sort((a, b) => new Date(a.week_start_date) - new Date(b.week_start_date))
      .map(plan => ({
        week: formatDate(plan.week_start_date),
        planned: plan.planned_cost || 0,
        actual: plan.actual_cost || 0,
        efficiency: plan.efficiency_rate || 0
      }));
    
    setEfficiencyTrends(efficiency);
    
    // Análise de custos por tipo
    const costByType = planning.reduce((acc, plan) => {
      const type = plan.planning_type || 'outro';
      if (!acc[type]) acc[type] = { planned: 0, actual: 0, count: 0 };
      
      acc[type].planned += plan.planned_cost || 0;
      acc[type].actual += plan.actual_cost || 0;
      acc[type].count += 1;
      
      return acc;
    }, {});
    
    const costData = Object.entries(costByType).map(([type, data]) => ({
      type: type === 'comercial' ? 'Comercial' : type === 'tecnica' ? 'Técnica' : type,
      planned: data.planned,
      actual: data.actual,
      efficiency: data.planned > 0 ? ((data.planned - data.actual) / data.planned) * 100 : 0
    }));
    
    setCostAnalysis(costData);
  };

  // Carregar métricas detalhadas de um planejamento
  const loadDetailedMetrics = async (planningId) => {
    try {
      const response = await api.get(`/visit-planning/${planningId}/report`);
      setDetailedMetrics(response.data);
      setMetricsDialog(true);
    } catch (error) {
      console.error('Erro ao carregar métricas detalhadas:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar métricas detalhadas',
        severity: 'error'
      });
    }
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

  // Obter cor do status
  const getStatusColor = (status) => {
    switch (status) {
      case 'avaliada': return 'success';
      case 'concluida': return 'info';
      default: return 'default';
    }
  };

  // Obter label do status
  const getStatusLabel = (status) => {
    switch (status) {
      case 'avaliada': return 'Avaliada';
      case 'concluida': return 'Concluída';
      default: return status;
    }
  };

  // Obter cor do tipo
  const getTypeColor = (type) => {
    switch (type) {
      case 'comercial': return 'primary';
      case 'tecnica': return 'warning';
      default: return 'default';
    }
  };

  // Obter label do tipo
  const getTypeLabel = (type) => {
    switch (type) {
      case 'comercial': return 'Comercial';
      case 'tecnica': return 'Técnica';
      default: type;
    }
  };

  // Calcular estatísticas gerais
  const calculateGeneralStats = () => {
    if (planningHistory.length === 0) return null;
    
    const total = planningHistory.length;
    const totalVisits = planningHistory.reduce((sum, plan) => sum + (plan.total_planned_visits || 0), 0);
    const completedVisits = planningHistory.reduce((sum, plan) => sum + (plan.total_completed_visits || 0), 0);
    const totalPlannedCost = planningHistory.reduce((sum, plan) => sum + (plan.planned_cost || 0), 0);
    const totalActualCost = planningHistory.reduce((sum, plan) => sum + (plan.actual_cost || 0), 0);
    const avgEfficiency = planningHistory.reduce((sum, plan) => sum + (plan.efficiency_rate || 0), 0) / total;
    
    return {
      total,
      totalVisits,
      completedVisits,
      completionRate: totalVisits > 0 ? (completedVisits / totalVisits) * 100 : 0,
      totalPlannedCost,
      totalActualCost,
      costSavings: totalPlannedCost - totalActualCost,
      avgEfficiency
    };
  };

  const generalStats = calculateGeneralStats();

  if (loading) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          📊 Histórico de Planejamentos
        </Typography>
        <LinearProgress sx={{ width: '100%' }} />
        <Typography variant="body2" color="text.secondary">
          Carregando histórico...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          📊 Histórico de Planejamentos
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

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
        📊 Histórico de Planejamentos
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Análise completa de todos os planejamentos finalizados com métricas de performance
      </Typography>

      {/* Estatísticas Gerais */}
      {generalStats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent>
                <Typography variant="h4" gutterBottom>
                  {generalStats.total}
                </Typography>
                <Typography variant="body2">
                  Planejamentos Finalizados
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
              <CardContent>
                <Typography variant="h4" gutterBottom>
                  {generalStats.completionRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2">
                  Taxa de Conclusão
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
              <CardContent>
                <Typography variant="h4" gutterBottom>
                  {generalStats.avgEfficiency.toFixed(1)}%
                </Typography>
                <Typography variant="body2">
                  Eficiência Média
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: generalStats.costSavings >= 0 ? 'success.light' : 'error.light', color: generalStats.costSavings >= 0 ? 'success.contrastText' : 'error.contrastText' }}>
              <CardContent>
                <Typography variant="h4" gutterBottom>
                  R$ {generalStats.costSavings.toFixed(2)}
                </Typography>
                <Typography variant="body2">
                  {generalStats.costSavings >= 0 ? 'Economia Total' : 'Gasto Extra'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🔍 Filtros de Análise
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Data Início"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Data Fim"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={filters.type}
                  label="Tipo"
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="comercial">Comercial</MenuItem>
                  <MenuItem value="tecnica">Técnica</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="avaliada">Avaliada</MenuItem>
                  <MenuItem value="concluida">Concluída</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={fetchPlanningHistory}
              >
                Aplicar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Gráficos de Performance */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📈 Análise de Performance
          </Typography>
          
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
            <Tab label="Eficiência ao Longo do Tempo" />
            <Tab label="Análise de Custos" />
            <Tab label="Tendências de Performance" />
          </Tabs>
          
          {activeTab === 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <RechartsTooltip />
                <Line type="monotone" dataKey="efficiency" stroke="#8884d8" name="Eficiência (%)" />
                <Line type="monotone" dataKey="completion" stroke="#82ca9d" name="Conclusão (%)" />
                <Line type="monotone" dataKey="costEfficiency" stroke="#ffc658" name="Eficiência de Custo (%)" />
              </LineChart>
            </ResponsiveContainer>
          )}
          
          {activeTab === 1 && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="planned" fill="#8884d8" name="Custo Planejado" />
                <Bar dataKey="actual" fill="#82ca9d" name="Custo Real" />
              </BarChart>
            </ResponsiveContainer>
          )}
          
          {activeTab === 2 && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={efficiencyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <RechartsTooltip />
                <Line type="monotone" dataKey="planned" stroke="#8884d8" name="Custo Planejado" />
                <Line type="monotone" dataKey="actual" stroke="#82ca9d" name="Custo Real" />
                <Line type="monotone" dataKey="efficiency" stroke="#ffc658" name="Eficiência (%)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Histórico */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 Histórico Detalhado ({planningHistory.length} planejamentos)
          </Typography>
          
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Semana</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Visitas</TableCell>
                  <TableCell>Custo Planejado</TableCell>
                  <TableCell>Custo Real</TableCell>
                  <TableCell>Eficiência</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {planningHistory.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {formatDate(plan.week_start_date)} a {formatDate(plan.week_end_date)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {plan.responsible?.name || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={getTypeLabel(plan.planning_type)}
                        color={getTypeColor(plan.planning_type)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={getStatusLabel(plan.status)}
                        color={getStatusColor(plan.status)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {plan.total_completed_visits || 0} / {plan.total_planned_visits || 0}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={plan.total_planned_visits > 0 ? 
                            (plan.total_completed_visits / plan.total_planned_visits) * 100 : 0}
                          sx={{ height: 4, mt: 0.5 }}
                        />
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      R$ {(plan.planned_cost || 0).toFixed(2)}
                    </TableCell>
                    
                    <TableCell>
                      <Typography
                        color={plan.actual_cost && plan.planned_cost && 
                          plan.actual_cost > plan.planned_cost ? 'error.main' : 'success.main'}
                      >
                        R$ {(plan.actual_cost || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={`${(plan.efficiency_rate || 0).toFixed(1)}%`}
                        color={plan.efficiency_rate >= 80 ? 'success' : 
                               plan.efficiency_rate >= 60 ? 'warning' : 'error'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Ver Métricas Detalhadas">
                          <IconButton
                            size="small"
                            onClick={() => loadDetailedMetrics(plan.id)}
                          >
                            <Assessment />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Diálogo de Métricas Detalhadas */}
      <Dialog open={metricsDialog} onClose={() => setMetricsDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment color="primary" />
              Métricas Detalhadas do Planejamento
            </Box>
            <IconButton onClick={() => setMetricsDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {detailedMetrics && (
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
                          <TableCell align="right">{detailedMetrics.total_planned_visits || 0}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Concluídas</TableCell>
                          <TableCell align="right">{detailedMetrics.total_completed_visits || 0}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Canceladas</TableCell>
                          <TableCell align="right">{detailedMetrics.total_cancelled_visits || 0}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Reagendadas</TableCell>
                          <TableCell align="right">{detailedMetrics.total_rescheduled_visits || 0}</TableCell>
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
                          <TableCell align="right">{detailedMetrics.planned_time ? detailedMetrics.planned_time.toFixed(1) : 0}h</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Tempo Real</TableCell>
                          <TableCell align="right">{detailedMetrics.actual_time ? detailedMetrics.actual_time.toFixed(1) : 0}h</TableCell>
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
                          <TableCell align="right">{detailedMetrics.planned_distance ? detailedMetrics.planned_distance.toFixed(1) : 0} km</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Distância Real</TableCell>
                          <TableCell align="right">{detailedMetrics.actual_distance ? detailedMetrics.actual_distance.toFixed(1) : 0} km</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Combustível Planejado</TableCell>
                          <TableCell align="right">{detailedMetrics.planned_fuel ? detailedMetrics.planned_fuel.toFixed(1) : 0}L</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Combustível Real</TableCell>
                          <TableCell align="right">{detailedMetrics.actual_fuel ? detailedMetrics.actual_fuel.toFixed(1) : 0}L</TableCell>
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
                          <TableCell align="right">R$ {detailedMetrics.planned_cost ? detailedMetrics.planned_cost.toFixed(2) : '0,00'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Custo Real</TableCell>
                          <TableCell align="right">R$ {detailedMetrics.actual_cost ? detailedMetrics.actual_cost.toFixed(2) : '0,00'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Diferença</TableCell>
                          <TableCell align="right" sx={{ 
                            color: detailedMetrics.actual_cost && detailedMetrics.planned_cost && 
                              detailedMetrics.actual_cost > detailedMetrics.planned_cost ? 'error.main' : 'success.main',
                            fontWeight: 'bold'
                          }}>
                            R$ {detailedMetrics.actual_cost && detailedMetrics.planned_cost ? 
                              (detailedMetrics.actual_cost - detailedMetrics.planned_cost).toFixed(2) : '0,00'}
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
                          {detailedMetrics.efficiency_rate ? detailedMetrics.efficiency_rate.toFixed(1) : 0}%
                        </Typography>
                        <Typography variant="body2" color="primary.contrastText">
                          Taxa de Eficiência
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h4" color="primary.contrastText" gutterBottom>
                          {detailedMetrics.total_planned_visits && detailedMetrics.total_completed_visits ? 
                            Math.round((detailedMetrics.total_completed_visits / detailedMetrics.total_planned_visits) * 100) : 0}%
                        </Typography>
                        <Typography variant="body2" color="primary.contrastText">
                          Taxa de Conclusão
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h4" color="primary.contrastText" gutterBottom>
                          {detailedMetrics.actual_time && detailedMetrics.planned_time ? 
                            Math.round((detailedMetrics.actual_time / detailedMetrics.planned_time) * 100) : 0}%
                        </Typography>
                        <Typography variant="body2" color="primary.contrastText">
                          Eficiência de Tempo
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h4" color="primary.contrastText" gutterBottom>
                          {detailedMetrics.actual_distance && detailedMetrics.planned_distance ? 
                            Math.round((detailedMetrics.planned_distance / detailedMetrics.actual_distance) * 100) : 0}%
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
        <DialogActions>
          <Button onClick={() => setMetricsDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlanningHistory;
