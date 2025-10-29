import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar
} from '@mui/material';
import {
  PersonAdd,
  Link,
  LinkOff,
  Visibility,
  Edit,
  AccountCircle
} from '@mui/icons-material';
import api from '../services/api';

/**
 * Componente para integrar colaboradores com usuários do sistema
 */
const EmployeeUserIntegration = () => {
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreateUserDialog, setOpenCreateUserDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Formulário para criar usuário a partir de colaborador
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'sales',
    department: ''
  });

  const roles = [
    { value: 'sales', label: 'Vendedor' },
    { value: 'agent', label: 'Atendente' },
    { value: 'manager', label: 'Gerente' },
    { value: 'admin', label: 'Administrador' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeesResponse, usersResponse] = await Promise.all([
        api.get('/employees'),
        api.get('/users')
      ]);
      
      setEmployees(employeesResponse.data.employees || []);
      setUsers(usersResponse.data.users || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar dados',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = (employee) => {
    setSelectedEmployee(employee);
    setUserForm({
      username: employee.email,
      password: '',
      role: 'sales',
      department: employee.department || ''
    });
    setOpenCreateUserDialog(true);
  };

  const handleSubmitCreateUser = async () => {
    try {
      if (!userForm.password) {
        setSnackbar({
          open: true,
          message: 'Senha é obrigatória',
          severity: 'error'
        });
        return;
      }

      const userData = {
        name: selectedEmployee.name,
        email: selectedEmployee.email,
        username: userForm.username,
        password: userForm.password,
        role: userForm.role,
        department: userForm.department,
        phone: selectedEmployee.phone,
        employee_id: selectedEmployee.id,
        is_active: true
      };

      await api.post('/users', userData);
      
      setSnackbar({
        open: true,
        message: 'Usuário criado com sucesso!',
        severity: 'success'
      });

      setOpenCreateUserDialog(false);
      loadData();
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Erro ao criar usuário',
        severity: 'error'
      });
    }
  };

  const handleUnlinkUser = async (userId) => {
    if (!window.confirm('Tem certeza que deseja desvincular este usuário do colaborador?')) return;

    try {
      await api.patch(`/users/${userId}`, { employee_id: null });
      
      setSnackbar({
        open: true,
        message: 'Usuário desvinculado com sucesso!',
        severity: 'success'
      });

      loadData();
    } catch (error) {
      console.error('Erro ao desvincular usuário:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao desvincular usuário',
        severity: 'error'
      });
    }
  };

  // Criar mapa de colaboradores com usuários
  const employeeUserMap = employees.map(employee => {
    const linkedUser = users.find(user => user.employee_id === employee.id);
    return {
      ...employee,
      linkedUser
    };
  });

  // Usuários órfãos (sem colaborador vinculado)
  const orphanUsers = users.filter(user => !user.employee_id);

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Carregando integração...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Integração Colaboradores ↔ Usuários
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Gerencie a vinculação entre colaboradores e contas de usuário no sistema
      </Typography>

      {/* Estatísticas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="primary">
              {employees.length}
            </Typography>
            <Typography variant="body2">Colaboradores</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">
              {employeeUserMap.filter(emp => emp.linkedUser).length}
            </Typography>
            <Typography variant="body2">Com Usuário</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">
              {employeeUserMap.filter(emp => !emp.linkedUser).length}
            </Typography>
            <Typography variant="body2">Sem Usuário</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="error.main">
              {orphanUsers.length}
            </Typography>
            <Typography variant="body2">Usuários Órfãos</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabela de Colaboradores */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Colaboradores e Usuários</Typography>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Colaborador</TableCell>
                <TableCell>Departamento</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Usuário Vinculado</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employeeUserMap.map((employee) => (
                <TableRow key={employee.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {employee.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {employee.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {employee.department || 'Não definido'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={employee.status === 'active' ? 'Ativo' : 'Inativo'}
                      color={employee.status === 'active' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {employee.linkedUser ? (
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {employee.linkedUser.username}
                        </Typography>
                        <Chip
                          label={employee.linkedUser.role}
                          size="small"
                          color="primary"
                        />
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Sem usuário
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {employee.linkedUser ? (
                      <Tooltip title="Desvincular usuário">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => handleUnlinkUser(employee.linkedUser.id)}
                        >
                          <LinkOff />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Criar usuário">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleCreateUser(employee)}
                          disabled={employee.status !== 'active'}
                        >
                          <PersonAdd />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Usuários órfãos */}
      {orphanUsers.length > 0 && (
        <Paper>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" color="error">
              Usuários sem Colaborador Vinculado
            </Typography>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Perfil</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orphanUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email} • {user.username}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={user.role} size="small" color="primary" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'Ativo' : 'Inativo'}
                        color={user.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Vincular a colaborador">
                        <IconButton size="small" color="primary">
                          <Link />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Dialog para criar usuário */}
      <Dialog 
        open={openCreateUserDialog} 
        onClose={() => setOpenCreateUserDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Criar Usuário para {selectedEmployee?.name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome de Usuário"
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Senha"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Perfil</InputLabel>
                <Select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  label="Perfil"
                >
                  {roles.map(role => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Departamento"
                value={userForm.department}
                onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateUserDialog(false)}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSubmitCreateUser}>
            Criar Usuário
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

export default EmployeeUserIntegration;
