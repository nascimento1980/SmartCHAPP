import React, { useState, useEffect } from 'react';
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
  Slider,
  FormControlLabel,
  Switch,
  Alert,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  Route,
  Timeline,
  Speed,
  LocalGasStation,
  Savings,
  Schedule,
  LocationOn,
  DirectionsCar,
  Engineering,
  Assignment,
  Build,
  CheckCircle,
  Warning,
  Info,
  ExpandMore,
  Download,
  Print,
  Share,
  Refresh,
  Settings,
  TrendingUp,
  AccessTime,
  Straighten,
  Assessment
} from '@mui/icons-material';
import routingService from '../services/routingService';
import api from '../services/api';

const RoutingOptimizer = ({ visits, onRouteGenerated }) => {
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Configurações de otimização
  const [constraints, setConstraints] = useState({
    maxVisitsPerDay: 8,
    workingHours: 8,
    lunchBreak: 1,
    vehicleCapacity: 1000,
    priorityVisits: [],
    algorithm: 'genetic', // 'nearest' ou 'genetic'
    populationSize: 50,
    generations: 100
  });

  // Estado para configuração do endereço da empresa
  const [showCompanyAddressDialog, setShowCompanyAddressDialog] = useState(false);
  const [companyAddressForm, setCompanyAddressForm] = useState({
    address: '',
    lat: 0,
    lon: 0
  });

  // Localização de partida (empresa)
  const [startLocation, setStartLocation] = useState({
    lat: -3.8931091, // Ceará (Eusébio) como fallback coerente
    lon: -38.4371291,
    address: 'Sede da Empresa'
  });

  // Buscar endereço da empresa ao montar o componente
  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const response = await api.get('/settings/company');
        const company = response.data.company;
        
        if (company.companyAddress || company.companyCity || company.companyState) {
          // Construir endereço completo
          const addressParts = [
            company.companyAddress,
            company.companyCity,
            company.companyState
          ].filter(Boolean);
          
          const fullAddress = addressParts.join(', ');
          
          // Coordenadas padrão: Ceará (Eusébio) quando não houver coordenadas salvas
          let lat = -3.8931091;
          let lon = -38.4371291;
          
          if (company.companyCity && company.companyState) {
            const cityState = `${company.companyCity}, ${company.companyState}`.toLowerCase();
            
            // Mapeamento básico de coordenadas por cidade/estado
            if (cityState.includes('rio de janeiro') || cityState.includes('rj')) {
              lat = -22.9068;
              lon = -43.1729;
            } else if (cityState.includes('belo horizonte') || cityState.includes('bh')) {
              lat = -19.9167;
              lon = -43.9345;
            } else if (cityState.includes('brasília') || cityState.includes('df')) {
              lat = -15.7942;
              lon = -47.8822;
            } else if (cityState.includes('salvador') || cityState.includes('ba')) {
              lat = -12.9714;
              lon = -38.5011;
            } else if (cityState.includes('fortaleza') || cityState.includes('ce')) {
              lat = -3.7319;
              lon = -38.5267;
            } else if (cityState.includes('curitiba') || cityState.includes('pr')) {
              lat = -25.4289;
              lon = -49.2671;
            } else if (cityState.includes('porto alegre') || cityState.includes('rs')) {
              lat = -30.0346;
              lon = -51.2177;
            } else if (cityState.includes('recife') || cityState.includes('pe')) {
              lat = -8.0476;
              lon = -34.8770;
            } else if (cityState.includes('manaus') || cityState.includes('am')) {
              lat = -3.1190;
              lon = -60.0217;
            }
          }
          
          setStartLocation({
            lat,
            lon,
            address: fullAddress
          });
          
          // Inicializar formulário com endereço atual
          setCompanyAddressForm({
            address: fullAddress,
            lat,
            lon
          });
        }
      } catch (error) {
        console.error('Erro ao buscar endereço da empresa:', error);
      }
    };

    fetchCompanySettings();
  }, []);

  // Filtrar visitas com coordenadas
  const visitsWithCoordinates = visits.filter(visit => 
    visit.latitude && visit.longitude && 
    !isNaN(visit.latitude) && !isNaN(visit.longitude)
  );

  // Função para salvar endereço da empresa
  const handleSaveCompanyAddress = async () => {
    try {
      // Aqui você pode implementar a lógica para salvar no backend
      // Por enquanto, vamos apenas atualizar o estado local
      setStartLocation({
        lat: companyAddressForm.lat,
        lon: companyAddressForm.lon,
        address: companyAddressForm.address
      });
      
      setShowCompanyAddressDialog(false);
      setSnackbar({
        open: true,
        message: 'Endereço da empresa configurado com sucesso!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao salvar endereço da empresa:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar endereço da empresa',
        severity: 'error'
      });
    }
  };

  const handleOptimizeRoute = async () => {
    if (visitsWithCoordinates.length < 2) {
      setSnackbar({
        open: true,
        message: 'É necessário pelo menos 2 visitas com coordenadas para otimizar a rota',
        severity: 'warning'
      });
      return;
    }

    setIsOptimizing(true);
    try {
      let result;
      
      if (constraints.algorithm === 'nearest') {
        result = routingService.nearestNeighborAlgorithm(visitsWithCoordinates, startLocation);
      } else {
        result = routingService.optimizeRouteWithConstraints(
          visitsWithCoordinates, 
          startLocation, 
          constraints
        );
      }

      setOptimizedRoute(result);
      
      if (onRouteGenerated) {
        onRouteGenerated(result);
      }

      setSnackbar({
        open: true,
        message: 'Rota otimizada com sucesso!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao otimizar rota:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao otimizar rota',
        severity: 'error'
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleExportRoute = (format = 'csv') => {
    if (!optimizedRoute) return;

    let content = '';
    let filename = `rota_otimizada_${new Date().toISOString().split('T')[0]}.${format}`;

    if (format === 'csv') {
      content = generateCSVContent();
    } else if (format === 'json') {
      content = JSON.stringify(optimizedRoute, null, 2);
      filename = filename.replace('.csv', '.json');
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const generateCSVContent = () => {
    if (!optimizedRoute) return '';

    let csv = 'Ordem,Cliente,Endereço,Distância (km),Tempo (min),Cumulativo (km),Cumulativo (min)\n';
    
    optimizedRoute.route.forEach(visit => {
      const clientName = visit.client?.company_name || visit.lead?.company_name || 'N/A';
      const address = visit.address || 'N/A';
      csv += `${visit.order},"${clientName}","${address}",${visit.distanceFromPrevious},${Math.round(visit.estimatedTime * 60)},${visit.cumulativeDistance},${Math.round(visit.cumulativeTime * 60)}\n`;
    });

    csv += `\nTotal: ${optimizedRoute.totalDistance} km, ${Math.round(optimizedRoute.totalTime * 60)} min\n`;
    csv += `Combustível estimado: ${optimizedRoute.estimatedFuel} L\n`;
    
    return csv;
  };

  const generateRoutingReport = () => {
    if (!optimizedRoute) return null;
    return routingService.generateRoutingReport(optimizedRoute);
  };

  const report = generateRoutingReport();

  return (
    <Box>
      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          🚗 Otimizador de Rotas
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<LocationOn />}
            onClick={() => setShowCompanyAddressDialog(true)}
          >
            {startLocation.address !== 'Sede da Empresa' ? 'Editar Endereço da Empresa' : 'Configurar Endereço da Empresa'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={() => setShowSettings(true)}
          >
            Configurações
          </Button>
          <Button
            variant="contained"
            startIcon={<Route />}
            onClick={handleOptimizeRoute}
            disabled={isOptimizing || visitsWithCoordinates.length < 2}
          >
            {isOptimizing ? 'Otimizando...' : 'Otimizar Rota'}
          </Button>
        </Box>
      </Box>

      {/* Informações do Endereço da Empresa */}
      {startLocation.address !== 'Sede da Empresa' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Ponto de partida:</strong> {startLocation.address} 
            (Lat: {startLocation.lat.toFixed(4)}, Lon: {startLocation.lon.toFixed(4)})
          </Typography>
        </Alert>
      )}

      {/* Estatísticas das Visitas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="primary.main">
                    {visits.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total de Visitas
                  </Typography>
                </Box>
                <Assignment color="primary" />
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
                    {visitsWithCoordinates.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Com Coordenadas
                  </Typography>
                </Box>
                <LocationOn color="success" />
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
                    {visits.filter(v => v.type === 'comercial').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Visitas Comerciais
                  </Typography>
                </Box>
                <DirectionsCar color="warning" />
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
                    {visits.filter(v => ['tecnica', 'instalacao', 'manutencao'].includes(v.type)).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Visitas Técnicas
                  </Typography>
                </Box>
                <Engineering color="info" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progresso de Otimização */}
      {isOptimizing && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Otimizando Rota...
            </Typography>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Aplicando algoritmo {constraints.algorithm === 'genetic' ? 'genético' : 'do vizinho mais próximo'}...
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Rota Otimizada */}
      {optimizedRoute && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                🎯 Rota Otimizada
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => handleExportRoute('csv')}
                >
                  Exportar CSV
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => handleExportRoute('json')}
                >
                  Exportar JSON
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Assessment />}
                  onClick={() => setShowReport(true)}
                >
                  Relatório
                </Button>
              </Box>
            </Box>

            {/* Resumo da Rota */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="h6" color="primary.contrastText">
                    {optimizedRoute.totalDistance} km
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    Distância Total
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="h6" color="success.contrastText">
                    {Math.round(optimizedRoute.totalTime * 60)} min
                  </Typography>
                  <Typography variant="body2" color="success.contrastText">
                    Tempo Total
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography variant="h6" color="warning.contrastText">
                    {optimizedRoute.estimatedFuel} L
                  </Typography>
                  <Typography variant="body2" color="warning.contrastText">
                    Combustível
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="h6" color="info.contrastText">
                    R$ {Math.round(optimizedRoute.estimatedFuel * 5.5 * 100) / 100}
                  </Typography>
                  <Typography variant="body2" color="info.contrastText">
                    Custo Estimado
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Economias */}
            {optimizedRoute.savings && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography variant="h6" color="success.main" gutterBottom>
                  💰 Economias Estimadas
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="success.main">
                      <strong>Distância:</strong> {optimizedRoute.savings.distanceSaved} km
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="success.main">
                      <strong>Combustível:</strong> {optimizedRoute.savings.fuelSaved} L
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="success.main">
                      <strong>Tempo:</strong> {Math.round(optimizedRoute.savings.timeSaved * 60)} min
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="success.main">
                      <strong>Economia:</strong> R$ {optimizedRoute.savings.costSaved}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Tabela da Rota */}
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ordem</TableCell>
                    <TableCell>Cliente/Lead</TableCell>
                    <TableCell>Endereço</TableCell>
                    <TableCell>Distância</TableCell>
                    <TableCell>Tempo</TableCell>
                    <TableCell>Cumulativo</TableCell>
                    <TableCell>Tipo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {optimizedRoute.route.map((visit) => (
                    <TableRow key={visit.id} hover>
                      <TableCell>
                        <Chip
                          label={visit.order}
                          color="primary"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {visit.client?.company_name || visit.lead?.company_name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {visit.address || 'Endereço não informado'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Straighten fontSize="small" color="action" />
                          <Typography variant="body2">
                            {visit.distanceFromPrevious} km
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTime fontSize="small" color="action" />
                          <Typography variant="body2">
                            {Math.round(visit.estimatedTime * 60)} min
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {visit.cumulativeDistance} km
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {Math.round(visit.cumulativeTime * 60)} min
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={visit.type === 'comercial' ? <DirectionsCar /> : <Engineering />}
                          label={visit.type}
                          size="small"
                          color={visit.type === 'comercial' ? 'primary' : 'secondary'}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Rotas Diárias */}
      {optimizedRoute?.dailyRoutes && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📅 Distribuição por Dias
            </Typography>
            <Grid container spacing={2}>
              {optimizedRoute.dailyRoutes.map((day) => (
                <Grid item xs={12} md={6} lg={4} key={day.day}>
                  <Paper sx={{ p: 2, border: 1, borderColor: day.isFeasible ? 'success.main' : 'warning.main' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" color={day.isFeasible ? 'success.main' : 'warning.main'}>
                        {day.day}
                      </Typography>
                      <Chip
                        icon={day.isFeasible ? <CheckCircle /> : <Warning />}
                        label={day.isFeasible ? 'Viável' : 'Excede Horário'}
                        color={day.isFeasible ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {day.visits.length} visitas
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tempo: {Math.round(day.totalTime * 60)} min
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Término: {Math.round(day.estimatedFinishTime)}:00
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Configurações */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Settings />
            Configurações de Otimização
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Algoritmo</InputLabel>
                <Select
                  value={constraints.algorithm}
                  onChange={(e) => setConstraints({ ...constraints, algorithm: e.target.value })}
                  label="Algoritmo"
                >
                  <MenuItem value="nearest">Vizinho Mais Próximo (Rápido)</MenuItem>
                  <MenuItem value="genetic">Algoritmo Genético (Otimizado)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Visitas por Dia"
                type="number"
                value={constraints.maxVisitsPerDay}
                onChange={(e) => setConstraints({ ...constraints, maxVisitsPerDay: parseInt(e.target.value) })}
                inputProps={{ min: 1, max: 20 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Horas de Trabalho"
                type="number"
                value={constraints.workingHours}
                onChange={(e) => setConstraints({ ...constraints, workingHours: parseInt(e.target.value) })}
                inputProps={{ min: 4, max: 12 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Intervalo para Almoço (h)"
                type="number"
                value={constraints.lunchBreak}
                onChange={(e) => setConstraints({ ...constraints, lunchBreak: parseInt(e.target.value) })}
                inputProps={{ min: 0, max: 2 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Capacidade do Veículo (kg)"
                type="number"
                value={constraints.vehicleCapacity}
                onChange={(e) => setConstraints({ ...constraints, vehicleCapacity: parseInt(e.target.value) })}
                inputProps={{ min: 100, max: 5000 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Latitude de Partida"
                type="number"
                value={startLocation.lat}
                onChange={(e) => setStartLocation({ ...startLocation, lat: parseFloat(e.target.value) })}
                inputProps={{ step: 0.0001 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Longitude de Partida"
                type="number"
                value={startLocation.lon}
                onChange={(e) => setStartLocation({ ...startLocation, lon: parseFloat(e.target.value) })}
                inputProps={{ step: 0.0001 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Endereço de Partida"
                value={startLocation.address}
                onChange={(e) => setStartLocation({ ...startLocation, address: e.target.value })}
              />
            </Grid>
            
            {constraints.algorithm === 'genetic' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Tamanho da População"
                    type="number"
                    value={constraints.populationSize}
                    onChange={(e) => setConstraints({ ...constraints, populationSize: parseInt(e.target.value) })}
                    inputProps={{ min: 10, max: 200 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Número de Gerações"
                    type="number"
                    value={constraints.generations}
                    onChange={(e) => setConstraints({ ...constraints, generations: parseInt(e.target.value) })}
                    inputProps={{ min: 10, max: 500 }}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Cancelar</Button>
          <Button onClick={() => setShowSettings(false)} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Relatório */}
      <Dialog open={showReport} onClose={() => setShowReport(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Assessment />
            Relatório de Roteirização
          </Box>
        </DialogTitle>
        <DialogContent>
          {report && (
            <Box sx={{ mt: 2 }}>
              {/* Resumo */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>📊 Resumo da Rota</Typography>
                  <Grid container spacing={2}>
                    {Object.entries(report.summary).map(([key, value]) => (
                      <Grid item xs={6} md={3} key={key}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                          <Typography variant="h6" color="primary.main">
                            {value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>

              {/* Economias */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>💰 Economias</Typography>
                  <Grid container spacing={2}>
                    {Object.entries(report.savings).map(([key, value]) => (
                      <Grid item xs={6} md={3} key={key}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                          <Typography variant="h6" color="success.main">
                            {value}
                          </Typography>
                          <Typography variant="caption" color="success.main">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>

              {/* Distribuição Diária */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>📅 Distribuição por Dias</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Dia</TableCell>
                          <TableCell>Visitas</TableCell>
                          <TableCell>Tempo Total</TableCell>
                          <TableCell>Horário de Término</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {report.dailyBreakdown.map((day) => (
                          <TableRow key={day.day}>
                            <TableCell>{day.day}</TableCell>
                            <TableCell>{day.visits}</TableCell>
                            <TableCell>{day.totalTime}</TableCell>
                            <TableCell>{day.estimatedFinish}</TableCell>
                            <TableCell>
                              <Chip
                                label={day.status}
                                color={day.status.includes('✅') ? 'success' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Recomendações */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>💡 Recomendações</Typography>
                  <List>
                    {report.recommendations.map((recommendation, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Info color="info" />
                        </ListItemIcon>
                        <ListItemText primary={recommendation} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReport(false)}>Fechar</Button>
          <Button
            onClick={() => {
              handleExportRoute('csv');
              setShowReport(false);
            }}
            variant="contained"
            startIcon={<Download />}
          >
            Exportar CSV
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para Configurar Endereço da Empresa */}
      <Dialog open={showCompanyAddressDialog} onClose={() => setShowCompanyAddressDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn color="primary" />
            Configurar Endereço da Empresa
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure o endereço da empresa que será usado como ponto de partida para todas as rotas.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Endereço Completo"
                placeholder="Ex: Rua das Flores, 123, Centro, São Paulo, SP"
                value={companyAddressForm.address}
                onChange={(e) => setCompanyAddressForm({ ...companyAddressForm, address: e.target.value })}
                helperText="Digite o endereço completo da empresa"
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Latitude"
                type="number"
                placeholder="-23.5505"
                value={companyAddressForm.lat}
                onChange={(e) => setCompanyAddressForm({ ...companyAddressForm, lat: parseFloat(e.target.value) || 0 })}
                helperText="Coordenada de latitude (ex: -23.5505)"
                inputProps={{ step: "any" }}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Longitude"
                type="number"
                placeholder="-46.6333"
                value={companyAddressForm.lon}
                onChange={(e) => setCompanyAddressForm({ ...companyAddressForm, lon: parseFloat(e.target.value) || 0 })}
                helperText="Coordenada de longitude (ex: -46.6333)"
                inputProps={{ step: "any" }}
              />
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Dica:</strong> Para obter coordenadas precisas, use serviços como Google Maps, 
              OpenStreetMap ou aplicativos de GPS. Clique com o botão direito no mapa e selecione "O que há aqui?" 
              para ver as coordenadas.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCompanyAddressDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleSaveCompanyAddress}
            variant="contained"
            disabled={!companyAddressForm.address || !companyAddressForm.lat || !companyAddressForm.lon}
          >
            Salvar Endereço
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
    </Box>
  );
};

export default RoutingOptimizer;
