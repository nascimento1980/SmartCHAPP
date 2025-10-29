import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Divider,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  FileDownload,
  FileUpload,
  VpnKey,
  Assessment,
  Group,
  Security,
  Refresh
} from '@mui/icons-material';
import api from '../services/api';

/**
 * Componente para ações avançadas de gestão de usuários
 */
const UserAdvancedActions = ({ users, onUsersUpdate }) => {
  const [openBulkPasswordDialog, setOpenBulkPasswordDialog] = useState(false);
  const [openReportDialog, setOpenReportDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const [reportType, setReportType] = useState('activity');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleBulkPasswordReset = async () => {
    if (!newPassword || selectedUsers.length === 0) {
      setSnackbar({
        open: true,
        message: 'Selecione usuários e defina uma nova senha',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Reset de senha para usuários selecionados
      const promises = selectedUsers.map(userId => 
        api.patch(`/users/${userId}`, { 
          password: newPassword,
          must_change_password: true 
        })
      );

      await Promise.all(promises);

      setSnackbar({
        open: true,
        message: `Senha redefinida para ${selectedUsers.length} usuários`,
        severity: 'success'
      });

      setOpenBulkPasswordDialog(false);
      setSelectedUsers([]);
      setNewPassword('');
      onUsersUpdate && onUsersUpdate();

    } catch (error) {
      console.error('Erro no reset de senhas:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao redefinir senhas',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportUsers = async () => {
    try {
      setLoading(true);
      
      const response = await api.get('/users/export', {
        responseType: 'blob'
      });

      // Criar download do arquivo
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSnackbar({
        open: true,
        message: 'Usuários exportados com sucesso!',
        severity: 'success'
      });

    } catch (error) {
      console.error('Erro ao exportar usuários:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao exportar usuários',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      
      const response = await api.get(`/users/reports/${reportType}`);
      
      // Simular download do relatório
      const reportData = JSON.stringify(response.data, null, 2);
      const blob = new Blob([reportData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSnackbar({
        open: true,
        message: 'Relatório gerado com sucesso!',
        severity: 'success'
      });

      setOpenReportDialog(false);

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao gerar relatório',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const activeUsers = users.filter(user => user.is_active);
  const inactiveUsers = users.filter(user => !user.is_active);

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Ações Avançadas
        </Typography>
        
        <Grid container spacing={2}>
          {/* Estatísticas Rápidas */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {activeUsers.length}
                </Typography>
                <Typography variant="body2">Usuários Ativos</Typography>
              </Paper>
              <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {inactiveUsers.length}
                </Typography>
                <Typography variant="body2">Usuários Inativos</Typography>
              </Paper>
              <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {users.filter(u => u.must_change_password).length}
                </Typography>
                <Typography variant="body2">Devem Trocar Senha</Typography>
              </Paper>
            </Box>
          </Grid>

          {/* Ações em Massa */}
          <Grid item xs={12} md={6}>
            <Button
              variant="outlined"
              startIcon={<VpnKey />}
              fullWidth
              onClick={() => setOpenBulkPasswordDialog(true)}
              disabled={loading}
            >
              Reset de Senhas em Massa
            </Button>
          </Grid>

          <Grid item xs={12} md={6}>
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              fullWidth
              onClick={handleExportUsers}
              disabled={loading}
            >
              Exportar Usuários
            </Button>
          </Grid>

          <Grid item xs={12} md={6}>
            <Button
              variant="outlined"
              startIcon={<Assessment />}
              fullWidth
              onClick={() => setOpenReportDialog(true)}
              disabled={loading}
            >
              Gerar Relatórios
            </Button>
          </Grid>

          <Grid item xs={12} md={6}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              fullWidth
              onClick={onUsersUpdate}
              disabled={loading}
            >
              Atualizar Dados
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Dialog para Reset de Senhas em Massa */}
      <Dialog 
        open={openBulkPasswordDialog} 
        onClose={() => setOpenBulkPasswordDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Reset de Senhas em Massa
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Nova Senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Selecionar Usuários ({selectedUsers.length} selecionados):
              </Typography>
              
              <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                {activeUsers.map(user => (
                  <ListItem
                    key={user.id}
                    button
                    onClick={() => handleUserSelection(user.id)}
                  >
                    <ListItemIcon>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleUserSelection(user.id)}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={user.name}
                      secondary={`${user.email} • ${user.role}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBulkPasswordDialog(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleBulkPasswordReset}
            disabled={loading || selectedUsers.length === 0 || !newPassword}
            startIcon={loading && <CircularProgress size={16} />}
          >
            Redefinir Senhas
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Relatórios */}
      <Dialog 
        open={openReportDialog} 
        onClose={() => setOpenReportDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Gerar Relatório
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Tipo de Relatório</InputLabel>
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              label="Tipo de Relatório"
            >
              <MenuItem value="activity">Atividade dos Usuários</MenuItem>
              <MenuItem value="permissions">Permissões por Perfil</MenuItem>
              <MenuItem value="departments">Usuários por Departamento</MenuItem>
              <MenuItem value="inactive">Usuários Inativos</MenuItem>
              <MenuItem value="security">Auditoria de Segurança</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReportDialog(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={generateReport}
            disabled={loading}
            startIcon={loading && <CircularProgress size={16} />}
          >
            Gerar Relatório
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificações */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
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

export default UserAdvancedActions;

