import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  Stack
} from '@mui/material';
import {
  Computer,
  Smartphone,
  Tablet,
  DeviceUnknown,
  ExitToApp,
  Delete,
  Refresh,
  Security,
  AccessTime,
  LocationOn,
  Language,
  Info,
  Warning,
  PowerSettingsNew
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../services/api';

const SessionManagement = () => {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null, session: null });
  const { enqueueSnackbar } = useSnackbar();

  // Carregar sessões do usuário
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionsRes, statsRes] = await Promise.all([
        api.get('/sessions/my'),
        api.get('/sessions/my/stats')
      ]);
      
      setSessions(sessionsRes.data.sessions || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
      enqueueSnackbar('Erro ao carregar sessões', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadSessions();
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  // Obter ícone do dispositivo
  const getDeviceIcon = (deviceInfo) => {
    if (!deviceInfo?.device?.type) return <DeviceUnknown />;
    
    switch (deviceInfo.device.type) {
      case 'mobile':
        return <Smartphone />;
      case 'tablet':
        return <Tablet />;
      default:
        return <Computer />;
    }
  };

  // Formatar informações do dispositivo
  const formatDeviceInfo = (deviceInfo) => {
    if (!deviceInfo) return 'Desconhecido';
    
    const browser = deviceInfo.browser?.name || 'Desconhecido';
    const os = deviceInfo.os?.name || 'Desconhecido';
    
    return `${browser} em ${os}`;
  };

  // Encerrar sessão específica
  const endSession = async (sessionId) => {
    try {
      await api.post(`/sessions/end/${sessionId}`);
      enqueueSnackbar('Sessão encerrada com sucesso', { variant: 'success' });
      loadSessions();
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
      enqueueSnackbar('Erro ao encerrar sessão', { variant: 'error' });
    }
  };

  // Encerrar todas as outras sessões
  const endAllOtherSessions = async () => {
    try {
      const response = await api.post('/sessions/end-all');
      enqueueSnackbar(response.data.message, { variant: 'success' });
      loadSessions();
    } catch (error) {
      console.error('Erro ao encerrar sessões:', error);
      enqueueSnackbar('Erro ao encerrar sessões', { variant: 'error' });
    }
  };

  // Abrir diálogo de confirmação
  const openConfirmDialog = (type, session = null) => {
    setConfirmDialog({ open: true, type, session });
  };

  // Fechar diálogo de confirmação
  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, type: null, session: null });
  };

  // Confirmar ação
  const confirmAction = async () => {
    const { type, session } = confirmDialog;
    
    if (type === 'end-session' && session) {
      await endSession(session.id);
    } else if (type === 'end-all') {
      await endAllOtherSessions();
    }
    
    closeConfirmDialog();
  };

  // Obter cor do status da sessão
  const getStatusColor = (session) => {
    if (session.is_current) return 'success';
    
    const lastActivity = new Date(session.last_activity);
    const now = new Date();
    const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);
    
    if (hoursSinceActivity < 1) return 'success';
    if (hoursSinceActivity < 24) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Carregando sessões...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Título e ações */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
          Gestão de Sessões
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadSessions}
          >
            Atualizar
          </Button>
          {sessions.filter(s => !s.is_current).length > 0 && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<PowerSettingsNew />}
              onClick={() => openConfirmDialog('end-all')}
            >
              Encerrar Outras Sessões
            </Button>
          )}
        </Stack>
      </Box>

      {/* Estatísticas */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {stats.active_sessions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sessões Ativas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="secondary">
                  {stats.total_sessions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de Sessões
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {stats.today_sessions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Hoje
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {stats.unique_days}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Dias Únicos
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Lista de sessões */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Sessões Ativas ({sessions.length})
          </Typography>
          
          {sessions.length === 0 ? (
            <Alert severity="info">
              Nenhuma sessão ativa encontrada.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Dispositivo</TableCell>
                    <TableCell>Local</TableCell>
                    <TableCell>Última Atividade</TableCell>
                    <TableCell>Criada em</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {getDeviceIcon(session.device_info)}
                          <Chip
                            label={session.is_current ? 'ATUAL' : 'ATIVA'}
                            color={getStatusColor(session)}
                            size="small"
                            variant={session.is_current ? 'filled' : 'outlined'}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDeviceInfo(session.device_info)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {session.user_agent ? session.user_agent.substring(0, 50) + '...' : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <LocationOn fontSize="small" color="action" />
                          <Typography variant="body2">
                            {session.ip_address || 'N/A'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDistanceToNow(new Date(session.last_activity), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(session.last_activity), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(session.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </Typography>
                        <Chip
                          label={session.login_method}
                          size="small"
                          variant="outlined"
                          color="default"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="Ver detalhes">
                            <IconButton
                              size="small"
                              onClick={() => setSelectedSession(session)}
                            >
                              <Info />
                            </IconButton>
                          </Tooltip>
                          {!session.is_current && (
                            <Tooltip title="Encerrar sessão">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => openConfirmDialog('end-session', session)}
                              >
                                <ExitToApp />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de detalhes da sessão */}
      <Dialog
        open={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalhes da Sessão
          {selectedSession?.is_current && (
            <Chip label="ATUAL" color="success" size="small" sx={{ ml: 1 }} />
          )}
        </DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <List dense>
                  <ListItem>
                    <ListItemIcon><Computer /></ListItemIcon>
                    <ListItemText
                      primary="Dispositivo"
                      secondary={formatDeviceInfo(selectedSession.device_info)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><LocationOn /></ListItemIcon>
                    <ListItemText
                      primary="Endereço IP"
                      secondary={selectedSession.ip_address || 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><AccessTime /></ListItemIcon>
                    <ListItemText
                      primary="Criada em"
                      secondary={format(new Date(selectedSession.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} sm={6}>
                <List dense>
                  <ListItem>
                    <ListItemIcon><AccessTime /></ListItemIcon>
                    <ListItemText
                      primary="Última Atividade"
                      secondary={format(new Date(selectedSession.last_activity), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Language /></ListItemIcon>
                    <ListItemText
                      primary="Método de Login"
                      secondary={selectedSession.login_method}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Security /></ListItemIcon>
                    <ListItemText
                      primary="Token"
                      secondary={selectedSession.token_hash}
                    />
                  </ListItem>
                </List>
              </Grid>
              {selectedSession.user_agent && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    User Agent:
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                    {selectedSession.user_agent}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedSession(null)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmação */}
      <Dialog
        open={confirmDialog.open}
        onClose={closeConfirmDialog}
      >
        <DialogTitle>
          <Warning color="warning" sx={{ mr: 1, verticalAlign: 'middle' }} />
          Confirmar Ação
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.type === 'end-session' && 
              'Tem certeza que deseja encerrar esta sessão? O usuário será desconectado imediatamente.'
            }
            {confirmDialog.type === 'end-all' && 
              'Tem certeza que deseja encerrar todas as outras sessões? Você permanecerá conectado apenas nesta sessão atual.'
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog}>
            Cancelar
          </Button>
          <Button 
            onClick={confirmAction}
            color="warning"
            variant="contained"
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionManagement;

