import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Chip,
  Box,
  TextField,
  Autocomplete,
  FormControlLabel,
  Switch,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon,
  Mail as MailIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const PlanningCollaboration = ({ planning, open, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para colaboradores
  const [collaborators, setCollaborators] = useState([]);
  const [responsible, setResponsible] = useState(null);

  // Estados para convites
  const [sentInvites, setSentInvites] = useState([]);
  const [receivedInvites, setReceivedInvites] = useState([]);

  // Estados para novo convite
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviteMessage, setInviteMessage] = useState('');

  // Carregar dados quando o diálogo abre
  useEffect(() => {
    if (open && planning) {
      loadCollaborationData();
    }
  }, [open, planning]);

  const loadCollaborationData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Carregar colaboradores
      const collabResponse = await api.get(`/planning-collaboration/${planning.id}/collaborators`);
      setCollaborators(collabResponse.data.collaborators || []);
      setResponsible(collabResponse.data.responsible);

      // Carregar convites enviados
      const sentResponse = await api.get('/planning-collaboration/invites/sent');
      const planningInvites = sentResponse.data.invites.filter(
        invite => invite.planning.id === planning.id
      );
      setSentInvites(planningInvites);

      // Carregar convites recebidos (apenas para referência)
      const receivedResponse = await api.get('/planning-collaboration/invites/received');
      setReceivedInvites(receivedResponse.data.invites || []);

    } catch (error) {
      console.error('Erro ao carregar dados de colaboração:', error);
      setError('Erro ao carregar dados de colaboração: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await api.get('/users');
      const users = response.data.users || [];
      
      // Filtrar usuários que já são colaboradores ou responsável
      const collaboratorIds = collaborators.map(c => c.user.id);
      const filtered = users.filter(u => 
        u.id !== responsible?.id && 
        !collaboratorIds.includes(u.id) &&
        u.id !== user.id
      );
      
      setAvailableUsers(filtered);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setError('Erro ao carregar lista de usuários');
    }
  };

  const handleInviteUser = async () => {
    if (!selectedUser) {
      setError('Selecione um usuário para convidar');
      return;
    }

    setLoading(true);
    try {
      await api.post('/planning-collaboration/invite', {
        planning_id: planning.id,
        invited_user_id: selectedUser.id,
        message: inviteMessage || `${user.name} convidou você para colaborar no planejamento semanal`
      });

      setSuccess('Convite enviado com sucesso!');
      setShowInviteForm(false);
      setSelectedUser(null);
      setInviteMessage('');
      
      // Recarregar dados
      await loadCollaborationData();
      
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      setError('Erro ao enviar convite: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId) => {
    if (!confirm('Tem certeza que deseja remover este colaborador?')) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/planning-collaboration/collaborators/${collaboratorId}`);
      setSuccess('Colaborador removido com sucesso!');
      await loadCollaborationData();
    } catch (error) {
      console.error('Erro ao remover colaborador:', error);
      setError('Erro ao remover colaborador: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId) => {
    setLoading(true);
    try {
      // Implementar cancelamento de convite se necessário
      setSuccess('Convite cancelado!');
      await loadCollaborationData();
    } catch (error) {
      console.error('Erro ao cancelar convite:', error);
      setError('Erro ao cancelar convite: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'declined': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'accepted': return 'Aceito';
      case 'declined': return 'Recusado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner': return <PersonIcon color="primary" />;
      case 'collaborator': return <GroupIcon color="secondary" />;
      case 'viewer': return <ScheduleIcon color="disabled" />;
      default: return <PersonIcon />;
    }
  };

  if (!planning) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { minHeight: '600px' } }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <GroupIcon />
          <Typography variant="h6">
            Colaboração - Planejamento {planning.week_start_date} a {planning.week_end_date}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
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

        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Colaboradores" />
          <Tab label="Convites" />
        </Tabs>

        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {!loading && activeTab === 0 && (
          <Box sx={{ mt: 2 }}>
            {/* Responsável */}
            {responsible && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Responsável Principal
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon color="primary" />
                    <Typography variant="body1">{responsible.name}</Typography>
                    <Chip label="Responsável" color="primary" size="small" />
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    {responsible.email}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {/* Colaboradores */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Colaboradores ({collaborators.length})
              </Typography>
              
              {planning.responsible_id === user.id && (
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={() => {
                    setShowInviteForm(true);
                    loadAvailableUsers();
                  }}
                  disabled={loading}
                >
                  Convidar
                </Button>
              )}
            </Box>

            {collaborators.length === 0 ? (
              <Alert severity="info">
                Nenhum colaborador neste planejamento. 
                {planning.responsible_id === user.id && ' Convide outros usuários para colaborar!'}
              </Alert>
            ) : (
              <List>
                {collaborators.map((collaborator) => (
                  <ListItem key={collaborator.id} divider>
                    <Box display="flex" alignItems="center" gap={2} width="100%">
                      {getRoleIcon(collaborator.role)}
                      <Box flexGrow={1}>
                        <Typography variant="body1">{collaborator.user.name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {collaborator.user.email}
                        </Typography>
                        <Box mt={1}>
                          <Chip 
                            label={collaborator.role === 'collaborator' ? 'Colaborador' : 'Visualizador'} 
                            size="small" 
                            color="secondary"
                          />
                          {collaborator.sync_to_calendar && (
                            <Chip 
                              label="Sincronizado" 
                              size="small" 
                              color="success" 
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      </Box>
                      
                      {(planning.responsible_id === user.id || collaborator.user_id === user.id) && (
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveCollaborator(collaborator.id)}
                          disabled={loading}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}

            {/* Formulário de convite */}
            {showInviteForm && (
              <Card sx={{ mt: 2, bgcolor: 'background.paper' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Convidar Usuário
                  </Typography>
                  
                  <Autocomplete
                    options={availableUsers}
                    getOptionLabel={(option) => `${option.name} (${option.email})`}
                    value={selectedUser}
                    onChange={(event, newValue) => setSelectedUser(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Selecionar usuário"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                      />
                    )}
                  />

                  <TextField
                    label="Mensagem (opcional)"
                    multiline
                    rows={3}
                    fullWidth
                    margin="normal"
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Adicione uma mensagem personalizada ao convite..."
                  />
                </CardContent>
                
                <CardActions>
                  <Button onClick={() => setShowInviteForm(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleInviteUser}
                    disabled={!selectedUser || loading}
                    startIcon={<MailIcon />}
                  >
                    Enviar Convite
                  </Button>
                </CardActions>
              </Card>
            )}
          </Box>
        )}

        {!loading && activeTab === 1 && (
          <Box sx={{ mt: 2 }}>
            {/* Convites enviados */}
            <Typography variant="h6" gutterBottom>
              Convites Enviados ({sentInvites.length})
            </Typography>
            
            {sentInvites.length === 0 ? (
              <Alert severity="info" sx={{ mb: 3 }}>
                Nenhum convite foi enviado para este planejamento.
              </Alert>
            ) : (
              <List sx={{ mb: 3 }}>
                {sentInvites.map((invite) => (
                  <ListItem key={invite.id} divider>
                    <ListItemText
                      primary={`${invite.invitedUser.name} (${invite.invitedUser.email})`}
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" color="textSecondary" component="span" sx={{ display: 'block' }}>
                            Enviado em: {formatDate(invite.invited_at)}
                          </Typography>
                          {invite.message && (
                            <Typography variant="body2" component="span" sx={{ mt: 1, display: 'block' }}>
                              "{invite.message}"
                            </Typography>
                          )}
                        </React.Fragment>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Chip 
                        label={getStatusText(invite.status)}
                        color={getStatusColor(invite.status)}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Convites recebidos (geral) */}
            <Typography variant="h6" gutterBottom>
              Meus Convites Recebidos ({receivedInvites.length})
            </Typography>
            
            {receivedInvites.length === 0 ? (
              <Alert severity="info">
                Você não tem convites pendentes.
              </Alert>
            ) : (
              <List>
                {receivedInvites.map((invite) => (
                  <ListItem key={invite.id} divider>
                    <ListItemText
                      primary={`Planejamento: ${invite.planning.week_start_date} a ${invite.planning.week_end_date}`}
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" color="textSecondary" component="span" sx={{ display: 'block' }}>
                            De: {invite.inviter.name} ({invite.inviter.email})
                          </Typography>
                          <Typography variant="body2" color="textSecondary" component="span" sx={{ display: 'block' }}>
                            Enviado: {formatDate(invite.invited_at)}
                          </Typography>
                          {invite.message && (
                            <Typography variant="body2" component="span" sx={{ mt: 1, display: 'block' }}>
                              "{invite.message}"
                            </Typography>
                          )}
                        </React.Fragment>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" gap={1} alignItems="center">
                        <Chip 
                          label={getStatusText(invite.status)}
                          color={getStatusColor(invite.status)}
                          size="small"
                        />
                        {invite.status === 'pending' && (
                          <Box>
                            <IconButton color="success" size="small">
                              <CheckIcon />
                            </IconButton>
                            <IconButton color="error" size="small">
                              <CloseIcon />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlanningCollaboration;


