import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  LocationOn,
  AccessTime,
  DirectionsCar,
  AttachMoney,
  Speed,
  Timeline,
  CheckCircle,
  Schedule,
  Warning
} from '@mui/icons-material';
import api from '../services/api';
import native from '../utils/native';

const VisitTimeControl = ({ visit, onVisitUpdated }) => {
  // Verificação de segurança: se visit não existe ou não tem ID, não renderizar
  if (!visit || !visit.id) {
    return null;
  }

  const [checkinDialog, setCheckinDialog] = useState(false);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [metricsDialog, setMetricsDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados para check-in
  const [checkinData, setCheckinData] = useState({
    latitude: '',
    longitude: '',
    notes: ''
  });
  
  // Estados para check-out
  const [checkoutData, setCheckoutData] = useState({
    latitude: '',
    longitude: '',
    notes: '',
    actual_duration: ''
  });
  
  // Estado para métricas
  const [metrics, setMetrics] = useState(null);

  // Obter localização atual
  const getCurrentLocation = () => native.geolocate();

  // Preencher coordenadas automaticamente
  const fillCoordinates = async () => {
    try {
      setLoading(true);
      const location = await getCurrentLocation();
      setCheckinData(prev => ({
        ...prev,
        latitude: location.latitude.toFixed(8),
        longitude: location.longitude.toFixed(8)
      }));
      setSuccess('Coordenadas obtidas automaticamente!');
    } catch (error) {
      setError('Erro ao obter localização: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fazer check-in
  const handleCheckin = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!checkinData.latitude || !checkinData.longitude) {
        setError('Coordenadas são obrigatórias');
        return;
      }

      const response = await api.post(`/visits/${visit.id}/checkin`, {
        latitude: parseFloat(checkinData.latitude),
        longitude: parseFloat(checkinData.longitude),
        notes: checkinData.notes
      });

      setSuccess('Check-in realizado com sucesso!');
      setCheckinDialog(false);
      setCheckinData({ latitude: '', longitude: '', notes: '' });
      
      // Sinalizar UI para disponibilizar os formulários da visita
      try {
        window.dispatchEvent(new CustomEvent('visit:openForms', { detail: { visitId: visit.id } }));
        window.dispatchEvent(new CustomEvent('visitCheckinCompleted', { detail: { visitId: visit.id } }));
      } catch (_) {}

      // Atualizar estado da visita para refletir check-in
      if (onVisitUpdated) {
        onVisitUpdated(response.data.visit);
      }
    } catch (error) {
      setError('Erro ao fazer check-in: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Fazer check-out
  const handleCheckout = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!checkoutData.latitude || !checkoutData.longitude) {
        setError('Coordenadas são obrigatórias');
        return;
      }

      const response = await api.post(`/visits/${visit.id}/checkout`, {
        latitude: parseFloat(checkoutData.latitude),
        longitude: parseFloat(checkoutData.longitude),
        notes: checkoutData.notes,
        actual_duration: checkoutData.actual_duration ? parseFloat(checkoutData.actual_duration) : null
      });

      setSuccess('Check-out realizado com sucesso!');
      setCheckoutDialog(false);
      setCheckoutData({ latitude: '', longitude: '', notes: '', actual_duration: '' });
      
      if (onVisitUpdated) {
        onVisitUpdated(response.data.visit);
      }
    } catch (error) {
      setError('Erro ao fazer check-out: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Carregar métricas
  const loadMetrics = async () => {
    try {
      const response = await api.get(`/visits/${visit.id}/metrics`);
      setMetrics(response.data.metrics);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    }
  };

  // Abrir diálogo de métricas
  const openMetricsDialog = () => {
    loadMetrics();
    setMetricsDialog(true);
  };

  // Formatar tempo
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(timeString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Status da visita
  const getStatusInfo = () => {
    switch (visit.status) {
      case 'agendada':
        return { color: 'info', icon: <Schedule />, text: 'Agendada' };
      case 'em_andamento':
        return { color: 'warning', icon: <AccessTime />, text: 'Em Andamento' };
      case 'concluida':
        return { color: 'success', icon: <CheckCircle />, text: 'Concluída' };
      case 'cancelada':
        return { color: 'error', icon: <Warning />, text: 'Cancelada' };
      default:
        return { color: 'default', icon: <Schedule />, text: visit.status };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Box>
      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Card de Controle de Tempo */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" component="div">
              ⏱️ Controle de Tempo
            </Typography>
            <Chip
              icon={statusInfo.icon}
              label={statusInfo.text}
              color={statusInfo.color}
              variant="outlined"
            />
          </Box>

          <Grid container spacing={2}>
            {/* Informações da Visita */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Visita: {visit.title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Data:</strong> {formatDate(visit.scheduled_date)} às {visit.scheduled_time}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Duração Estimada:</strong> {visit.estimated_duration || 'N/A'} horas
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Endereço:</strong> {visit.address || 'N/A'}
              </Typography>
            </Grid>

            {/* Status e Controles */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Aviso de visita concluída */}
                {visit.status === 'concluida' && (
                  <Alert severity="info" sx={{ mb: 1 }}>
                    <strong>Visita Concluída</strong> - Esta visita é somente leitura
                  </Alert>
                )}
                
                {/* Check-in - Não mostrar se visita estiver concluída */}
                {!visit.checkin_time && visit.status !== 'concluida' && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PlayArrow />}
                    onClick={() => setCheckinDialog(true)}
                    fullWidth
                  >
                    Fazer Check-in
                  </Button>
                )}

                {/* Check-out - Não mostrar se visita estiver concluída */}
                {visit.checkin_time && !visit.checkout_time && visit.status !== 'concluida' && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<Stop />}
                    onClick={() => setCheckoutDialog(true)}
                    fullWidth
                  >
                    Fazer Check-out
                  </Button>
                )}

                {/* Métricas */}
                {(visit.checkin_time || visit.checkout_time) && (
                  <Button
                    variant="outlined"
                    startIcon={<Timeline />}
                    onClick={openMetricsDialog}
                    fullWidth
                  >
                    Ver Métricas
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Progresso da Visita */}
          {visit.checkin_time && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Progresso da Visita
              </Typography>
              <LinearProgress
                variant="determinate"
                value={visit.checkout_time ? 100 : 50}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Check-in: {formatTime(visit.checkin_time)}
                </Typography>
                {visit.checkout_time && (
                  <Typography variant="caption" color="text.secondary">
                    Check-out: {formatTime(visit.checkout_time)}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Check-in */}
      <Dialog open={checkinDialog} onClose={() => setCheckinDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PlayArrow color="primary" />
            Fazer Check-in
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Confirme sua localização e faça o check-in da visita.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                startIcon={<LocationOn />}
                onClick={fillCoordinates}
                disabled={loading}
                fullWidth
              >
                Obter Localização Atual
              </Button>
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Latitude"
                type="number"
                value={checkinData.latitude}
                onChange={(e) => setCheckinData({ ...checkinData, latitude: e.target.value })}
                inputProps={{ step: "any" }}
                required
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Longitude"
                type="number"
                value={checkinData.longitude}
                onChange={(e) => setCheckinData({ ...checkinData, longitude: e.target.value })}
                inputProps={{ step: "any" }}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={3}
                value={checkinData.notes}
                onChange={(e) => setCheckinData({ ...checkinData, notes: e.target.value })}
                placeholder="Observações sobre o início da visita..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckinDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleCheckin}
            variant="contained"
            disabled={loading || !checkinData.latitude || !checkinData.longitude}
          >
            {loading ? 'Processando...' : 'Confirmar Check-in'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Check-out */}
      <Dialog open={checkoutDialog} onClose={() => setCheckoutDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Stop color="success" />
            Fazer Check-out
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Confirme sua localização e finalize a visita.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                startIcon={<LocationOn />}
                onClick={async () => {
                  try {
                    const location = await getCurrentLocation();
                    setCheckoutData(prev => ({
                      ...prev,
                      latitude: location.latitude.toFixed(8),
                      longitude: location.longitude.toFixed(8)
                    }));
                  } catch (error) {
                    setError('Erro ao obter localização: ' + error.message);
                  }
                }}
                fullWidth
              >
                Obter Localização Atual
              </Button>
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Latitude"
                type="number"
                value={checkoutData.latitude}
                onChange={(e) => setCheckoutData({ ...checkoutData, latitude: e.target.value })}
                inputProps={{ step: "any" }}
                required
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Longitude"
                type="number"
                value={checkoutData.longitude}
                onChange={(e) => setCheckoutData({ ...checkoutData, longitude: e.target.value })}
                inputProps={{ step: "any" }}
                required
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Duração Real (h)"
                type="number"
                value={checkoutData.actual_duration}
                onChange={(e) => setCheckoutData({ ...checkoutData, actual_duration: e.target.value })}
                inputProps={{ step: 0.1, min: 0 }}
                placeholder="Deixe vazio para cálculo automático"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={3}
                value={checkoutData.notes}
                onChange={(e) => setCheckoutData({ ...checkoutData, notes: e.target.value })}
                placeholder="Observações sobre o término da visita..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckoutDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleCheckout}
            variant="contained"
            disabled={loading || !checkoutData.latitude || !checkoutData.longitude}
          >
            {loading ? 'Processando...' : 'Confirmar Check-out'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Métricas */}
      <Dialog open={metricsDialog} onClose={() => setMetricsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Timeline color="primary" />
            Métricas da Visita
          </Box>
        </DialogTitle>
        <DialogContent>
          {metrics ? (
            <Grid container spacing={3}>
              {/* Tempo */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <AccessTime color="primary" /> Tempo
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Estimado:</Typography>
                      <Typography>{metrics.scheduled_duration}h</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Real:</Typography>
                      <Typography>{metrics.actual_duration}h</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Eficiência:</Typography>
                      <Typography color={metrics.efficiency >= 0 ? 'success.main' : 'error.main'}>
                        {metrics.efficiency}%
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Viagem */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <DirectionsCar color="primary" /> Viagem
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Distância:</Typography>
                      <Typography>{metrics.travel_distance} km</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Tempo:</Typography>
                      <Typography>{metrics.travel_time}h</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Combustível:</Typography>
                      <Typography>{metrics.fuel_consumed} L</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Custos */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <AttachMoney color="primary" /> Custos
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Custo da Viagem:</Typography>
                      <Typography>R$ {metrics.travel_cost}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Horários */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <Schedule color="primary" /> Horários
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Check-in
                        </Typography>
                        <Typography>
                          {formatDate(metrics.checkin_time)} às {formatTime(metrics.checkin_time)}
                        </Typography>
                      </Grid>
                      {metrics.checkout_time && (
                        <Grid item xs={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Check-out
                          </Typography>
                          <Typography>
                            {formatDate(metrics.checkout_time)} às {formatTime(metrics.checkout_time)}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <Typography>Carregando métricas...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMetricsDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VisitTimeControl;
