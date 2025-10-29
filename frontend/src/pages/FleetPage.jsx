import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
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
  Fab,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  DirectionsCar,
  Build,
  LocalGasStation,
  Add,
  Edit,
  Delete,
  Visibility,
  Warning,
  CheckCircle,
  Schedule,
  AttachMoney,
  Speed,
  CalendarToday,
  Person
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const FleetPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [fuelExpenses, setFuelExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({});
  
  // Estados para diálogos
  const [vehicleDialog, setVehicleDialog] = useState({ open: false, mode: 'create', vehicle: null });
  const [maintenanceDialog, setMaintenanceDialog] = useState({ open: false, mode: 'create', maintenance: null });
  const [fuelDialog, setFuelDialog] = useState({ open: false, mode: 'create', fuel: null });
  
  // Estados para formulários
  const [vehicleForm, setVehicleForm] = useState({
    plate: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    type: 'carro',
    fuel_type: 'flex',
    transmission: 'manual',
    engine_capacity: '',
    mileage: 0,
    status: 'ativo',
    purchase_date: '',
    purchase_price: '',
    insurance_expiry: '',
    inspection_expiry: '',
    responsible_id: '',
    department_id: '',
    notes: ''
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    vehicle_id: '',
    type: 'preventiva',
    description: '',
    scheduled_date: '',
    priority: 'media',
    cost: '',
    mechanic: '',
    workshop: '',
    notes: ''
  });

  const [fuelForm, setFuelForm] = useState({
    vehicle_id: '',
    date: new Date().toISOString().split('T')[0],
    fuel_type: 'gasolina',
    quantity_liters: '',
    price_per_liter: '',
    gas_station: '',
    mileage: '',
    purpose: 'trabalho',
    notes: ''
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadData();
  }, [activeTab, page, rowsPerPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 0) {
        const response = await api.get(`/fleet/vehicles?page=${page + 1}&limit=${rowsPerPage}`);
        setVehicles(response.data.vehicles);
        setTotal(response.data.total);
      } else if (activeTab === 1) {
        const response = await api.get(`/fleet/maintenance?page=${page + 1}&limit=${rowsPerPage}`);
        setMaintenances(response.data.maintenances);
        setTotal(response.data.total);
      } else if (activeTab === 2) {
        const response = await api.get(`/fleet/fuel?page=${page + 1}&limit=${rowsPerPage}`);
        setFuelExpenses(response.data.fuelExpenses);
        setTotal(response.data.total);
      }

      // Carregar resumo
      const summaryResponse = await api.get('/fleet/reports/summary');
      setSummary(summaryResponse.data.summary);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar dados da frota',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPage(0);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleVehicleSubmit = async () => {
    try {
      if (vehicleDialog.mode === 'create') {
        await api.post('/fleet/vehicles', vehicleForm);
        setSnackbar({
          open: true,
          message: 'Veículo criado com sucesso!',
          severity: 'success'
        });
      } else {
        await api.put(`/fleet/vehicles/${vehicleDialog.vehicle.id}`, vehicleForm);
        setSnackbar({
          open: true,
          message: 'Veículo atualizado com sucesso!',
          severity: 'success'
        });
      }
      
      setVehicleDialog({ open: false, mode: 'create', vehicle: null });
      setVehicleForm({
        plate: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        type: 'carro',
        fuel_type: 'flex',
        transmission: 'manual',
        engine_capacity: '',
        mileage: 0,
        status: 'ativo',
        purchase_date: '',
        purchase_price: '',
        insurance_expiry: '',
        inspection_expiry: '',
        responsible_id: '',
        department_id: '',
        notes: ''
      });
      loadData();
    } catch (error) {
      console.error('Erro ao salvar veículo:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar veículo',
        severity: 'error'
      });
    }
  };

  const handleMaintenanceSubmit = async () => {
    try {
      if (maintenanceDialog.mode === 'create') {
        await api.post('/fleet/maintenance', maintenanceForm);
        setSnackbar({
          open: true,
          message: 'Manutenção agendada com sucesso!',
          severity: 'success'
        });
      } else {
        await api.put(`/fleet/maintenance/${maintenanceDialog.maintenance.id}`, maintenanceForm);
        setSnackbar({
          open: true,
          message: 'Manutenção atualizada com sucesso!',
          severity: 'success'
        });
      }
      
      setMaintenanceDialog({ open: false, mode: 'create', maintenance: null });
      setMaintenanceForm({
        vehicle_id: '',
        type: 'preventiva',
        description: '',
        scheduled_date: '',
        priority: 'media',
        cost: '',
        mechanic: '',
        workshop: '',
        notes: ''
      });
      loadData();
    } catch (error) {
      console.error('Erro ao salvar manutenção:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar manutenção',
        severity: 'error'
      });
    }
  };

  const handleFuelSubmit = async () => {
    try {
      if (fuelDialog.mode === 'create') {
        await api.post('/fleet/fuel', fuelForm);
        setSnackbar({
          open: true,
          message: 'Gasto com combustível registrado com sucesso!',
          severity: 'success'
        });
      }
      
      setFuelDialog({ open: false, mode: 'create', fuel: null });
      setFuelForm({
        vehicle_id: '',
        date: new Date().toISOString().split('T')[0],
        fuel_type: 'gasolina',
        quantity_liters: '',
        price_per_liter: '',
        gas_station: '',
        mileage: '',
        purpose: 'trabalho',
        notes: ''
      });
      loadData();
    } catch (error) {
      console.error('Erro ao salvar gasto com combustível:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar gasto com combustível',
        severity: 'error'
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ativo': return 'success';
      case 'manutencao': return 'error';
      case 'inativo': return 'error';
      case 'acidente': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'baixa': return 'success';
      case 'media': return 'warning';
      case 'alta': return 'error';
      case 'critica': return 'error';
      default: return 'default';
    }
  };

  // Funções de edição e exclusão
  const handleEditVehicle = (vehicle) => {
    setVehicleForm({
      plate: vehicle.plate || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      year: vehicle.year || new Date().getFullYear(),
      color: vehicle.color || '',
      type: vehicle.type || 'carro',
      fuel_type: vehicle.fuel_type || 'flex',
      transmission: vehicle.transmission || 'manual',
      engine_capacity: vehicle.engine_capacity || '',
      mileage: vehicle.mileage || 0,
      status: vehicle.status || 'ativo',
      purchase_date: vehicle.purchase_date || '',
      purchase_price: vehicle.purchase_price || '',
      insurance_expiry: vehicle.insurance_expiry || '',
      inspection_expiry: vehicle.inspection_expiry || '',
      responsible_id: vehicle.responsible_id || '',
      department_id: vehicle.department_id || '',
      notes: vehicle.notes || ''
    });
    setVehicleDialog({ open: true, mode: 'edit', vehicle });
  };

  const handleViewVehicle = (vehicle) => {
    // Exibir informações do veículo usando o mesmo diálogo de edição, mas em modo de visualização
    setFormData({
      plate: vehicle.plate || '',
      model: vehicle.model || '',
      brand: vehicle.brand || '',
      year: vehicle.year || '',
      color: vehicle.color || '',
      status: vehicle.status || 'active',
      responsible_id: vehicle.responsible_id || '',
      department_id: vehicle.department_id || '',
      notes: vehicle.notes || ''
    });
    setVehicleDialog({ open: true, mode: 'view', vehicle });
  };

  const handleViewMaintenance = (maintenance) => {
    // Exibir informações da manutenção usando snackbar
    setSnackbar({
      open: true,
      message: `Manutenção: ${maintenance.description} - ${new Date(maintenance.date).toLocaleDateString()}`,
      severity: 'info'
    });
  };

  const handleViewFuel = (fuel) => {
    // Exibir informações do abastecimento usando snackbar
    setSnackbar({
      open: true,
      message: `Abastecimento: ${fuel.liters}L - R$ ${fuel.cost.toFixed(2)} - ${new Date(fuel.date).toLocaleDateString()}`,
      severity: 'info'
    });
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (window.confirm('Tem certeza que deseja excluir este veículo?')) {
      try {
        await api.delete(`/fleet/vehicles/${vehicleId}`);
        setSnackbar({
          open: true,
          message: 'Veículo excluído com sucesso!',
          severity: 'success'
        });
        loadData();
      } catch (error) {
        console.error('Erro ao excluir veículo:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao excluir veículo',
          severity: 'error'
        });
      }
    }
  };

  const handleEditMaintenance = (maintenance) => {
    setMaintenanceForm({
      vehicle_id: maintenance.vehicle_id || '',
      type: maintenance.type || 'preventiva',
      description: maintenance.description || '',
      scheduled_date: maintenance.scheduled_date || '',
      priority: maintenance.priority || 'media',
      cost: maintenance.cost || '',
      mechanic: maintenance.mechanic || '',
      workshop: maintenance.workshop || '',
      notes: maintenance.notes || ''
    });
    setMaintenanceDialog({ open: true, mode: 'edit', maintenance });
  };

  const handleDeleteMaintenance = async (maintenanceId) => {
    if (window.confirm('Tem certeza que deseja excluir esta manutenção?')) {
      try {
        await api.delete(`/fleet/maintenance/${maintenanceId}`);
        setSnackbar({
          open: true,
          message: 'Manutenção excluída com sucesso!',
          severity: 'success'
        });
        loadData();
      } catch (error) {
        console.error('Erro ao excluir manutenção:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao excluir manutenção',
          severity: 'error'
        });
      }
    }
  };

  const handleEditFuel = (fuel) => {
    setFuelForm({
      vehicle_id: fuel.vehicle_id || '',
      date: fuel.date || new Date().toISOString().split('T')[0],
      fuel_type: fuel.fuel_type || 'gasolina',
      quantity_liters: fuel.quantity_liters || '',
      price_per_liter: fuel.price_per_liter || '',
      gas_station: fuel.gas_station || '',
      mileage: fuel.mileage || '',
      purpose: fuel.purpose || 'trabalho',
      notes: fuel.notes || ''
    });
    setFuelDialog({ open: true, mode: 'edit', fuel });
  };

  const handleDeleteFuel = async (fuelId) => {
    if (window.confirm('Tem certeza que deseja excluir este registro de combustível?')) {
      try {
        await api.delete(`/fleet/fuel/${fuelId}`);
        setSnackbar({
          open: true,
          message: 'Registro de combustível excluído com sucesso!',
          severity: 'success'
        });
        loadData();
      } catch (error) {
        console.error('Erro ao excluir registro de combustível:', error);
        setSnackbar({
          open: true,
          message: 'Erro ao excluir registro de combustível',
          severity: 'error'
        });
      }
    }
  };

  const renderVehiclesTab = () => (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Placa</TableCell>
              <TableCell>Marca/Modelo</TableCell>
              <TableCell>Ano</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Responsável</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell>
                  <Typography variant="h6" component="span">
                    {vehicle.plate}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body1">
                    {vehicle.brand} {vehicle.model}
                  </Typography>
                </TableCell>
                <TableCell>{vehicle.year}</TableCell>
                <TableCell>
                  <Chip 
                    label={vehicle.type} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={vehicle.status} 
                    size="small" 
                    color={getStatusColor(vehicle.status)}
                  />
                </TableCell>
                <TableCell>
                  {vehicle.responsible?.name || 'Não atribuído'}
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => handleViewVehicle(vehicle)}
                  >
                    <Visibility />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="secondary"
                    onClick={() => handleEditVehicle(vehicle)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          labelRowsPerPage="Linhas por página:"
        />
      </TableContainer>
    </Box>
  );

  const renderMaintenanceTab = () => (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Veículo</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Data Agendada</TableCell>
              <TableCell>Prioridade</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {maintenances.map((maintenance) => (
              <TableRow key={maintenance.id}>
                <TableCell>
                  <Typography variant="body2">
                    {maintenance.vehicle?.plate} - {maintenance.vehicle?.brand}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={maintenance.type} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap>
                    {maintenance.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  {new Date(maintenance.scheduled_date).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={maintenance.priority} 
                    size="small" 
                    color={getPriorityColor(maintenance.priority)}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={maintenance.status} 
                    size="small" 
                    color={getStatusColor(maintenance.status)}
                  />
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => handleViewMaintenance(maintenance)}
                  >
                    <Visibility />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="secondary"
                    onClick={() => handleEditMaintenance(maintenance)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleDeleteMaintenance(maintenance.id)}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          labelRowsPerPage="Linhas por página:"
        />
      </TableContainer>
    </Box>
  );

  const renderFuelTab = () => (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Veículo</TableCell>
              <TableCell>Combustível</TableCell>
              <TableCell>Quantidade</TableCell>
              <TableCell>Preço Total</TableCell>
              <TableCell>Posto</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fuelExpenses.map((fuel) => (
              <TableRow key={fuel.id}>
                <TableCell>
                  {new Date(fuel.date).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {fuel.vehicle?.plate} - {fuel.vehicle?.brand}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={fuel.fuel_type} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {fuel.quantity_liters}L
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="primary">
                    R$ {parseFloat(fuel.total_cost).toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  {fuel.gas_station}
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => handleViewFuel(fuel)}
                  >
                    <Visibility />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="secondary"
                    onClick={() => handleEditFuel(fuel)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleDeleteFuel(fuel.id)}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          labelRowsPerPage="Linhas por página:"
        />
      </TableContainer>
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        🚗 Gestão de Frota
      </Typography>

      {/* Cards de Resumo */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total de Veículos
              </Typography>
              <Typography variant="h4" component="div">
                {summary.totalVehicles || 0}
              </Typography>
              <DirectionsCar color="primary" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Veículos Ativos
              </Typography>
              <Typography variant="h4" component="div" color="success.main">
                {summary.activeVehicles || 0}
              </Typography>
              <CheckCircle color="success" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Em Manutenção
              </Typography>
              <Typography variant="h4" component="div" color="warning.main">
                {summary.maintenanceVehicles || 0}
              </Typography>
              <Build color="warning" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Gasto Combustível (Ano)
              </Typography>
              <Typography variant="h4" component="div" color="error.main">
                R$ {(summary.totalFuelCost || 0).toFixed(2)}
              </Typography>
              <LocalGasStation color="error" />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros e Busca */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Buscar"
              placeholder={activeTab === 0 ? "Placa, marca ou modelo..." : activeTab === 1 ? "Veículo ou descrição..." : "Veículo ou posto..."}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select label="Status" defaultValue="">
                <MenuItem value="">Todos</MenuItem>
                {activeTab === 0 && (
                  <>
                    <MenuItem value="ativo">Ativo</MenuItem>
                    <MenuItem value="manutencao">Em Manutenção</MenuItem>
                    <MenuItem value="inativo">Inativo</MenuItem>
                    <MenuItem value="acidente">Acidente</MenuItem>
                  </>
                )}
                {activeTab === 1 && (
                  <>
                    <MenuItem value="agendada">Agendada</MenuItem>
                    <MenuItem value="em_andamento">Em Andamento</MenuItem>
                    <MenuItem value="concluida">Concluída</MenuItem>
                    <MenuItem value="cancelada">Cancelada</MenuItem>
                  </>
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Data Início"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="small"
            >
              Filtrar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Ações e Relatórios */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="h6" color="primary">
              Ações Rápidas
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<AttachMoney />}
              >
                Relatório de Custos
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<Speed />}
              >
                Relatório de Quilometragem
              </Button>
              <Button
                variant="outlined"
                color="success"
                size="small"
                startIcon={<LocalGasStation />}
              >
                Relatório de Combustível
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} centered>
          <Tab 
            label="Veículos" 
            icon={<DirectionsCar />} 
            iconPosition="start"
          />
          <Tab 
            label="Manutenções" 
            icon={<Build />} 
            iconPosition="start"
          />
          <Tab 
            label="Combustível" 
            icon={<LocalGasStation />} 
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Conteúdo das Tabs */}
      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && renderVehiclesTab()}
        {activeTab === 1 && renderMaintenanceTab()}
        {activeTab === 2 && renderFuelTab()}
      </Box>

      {/* FAB para adicionar */}
      <Tooltip title={activeTab === 0 ? "Adicionar Veículo" : activeTab === 1 ? "Agendar Manutenção" : "Registrar Combustível"}>
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => {
            if (activeTab === 0) {
              setVehicleDialog({ open: true, mode: 'create', vehicle: null });
            } else if (activeTab === 1) {
              setMaintenanceDialog({ open: true, mode: 'create', maintenance: null });
            } else {
              setFuelDialog({ open: true, mode: 'create', fuel: null });
            }
          }}
        >
          <Add />
        </Fab>
      </Tooltip>

      {/* Diálogo de Veículo */}
      <Dialog 
        open={vehicleDialog.open} 
        onClose={() => setVehicleDialog({ open: false, mode: 'create', vehicle: null })}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {vehicleDialog.mode === 'create' ? 'Novo Veículo' : 'Editar Veículo'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Placa"
                value={vehicleForm.plate}
                onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value.toUpperCase() })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Marca"
                value={vehicleForm.brand}
                onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Modelo"
                value={vehicleForm.model}
                onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ano"
                type="number"
                value={vehicleForm.year}
                onChange={(e) => setVehicleForm({ ...vehicleForm, year: parseInt(e.target.value) })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cor"
                value={vehicleForm.color}
                onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={vehicleForm.type}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })}
                  label="Tipo"
                >
                  <MenuItem value="carro">Carro</MenuItem>
                  <MenuItem value="moto">Moto</MenuItem>
                  <MenuItem value="caminhao">Caminhão</MenuItem>
                  <MenuItem value="van">Van</MenuItem>
                  <MenuItem value="utilitario">Utilitário</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Combustível</InputLabel>
                <Select
                  value={vehicleForm.fuel_type}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, fuel_type: e.target.value })}
                  label="Combustível"
                >
                  <MenuItem value="flex">Flex</MenuItem>
                  <MenuItem value="gasolina">Gasolina</MenuItem>
                  <MenuItem value="etanol">Etanol</MenuItem>
                  <MenuItem value="diesel">Diesel</MenuItem>
                  <MenuItem value="eletrico">Elétrico</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={vehicleForm.status}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="manutencao">Em Manutenção</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
                  <MenuItem value="acidente">Acidente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quilometragem"
                type="number"
                value={vehicleForm.mileage}
                onChange={(e) => setVehicleForm({ ...vehicleForm, mileage: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data de Compra"
                type="date"
                value={vehicleForm.purchase_date}
                onChange={(e) => setVehicleForm({ ...vehicleForm, purchase_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Preço de Compra"
                type="number"
                value={vehicleForm.purchase_price}
                onChange={(e) => setVehicleForm({ ...vehicleForm, purchase_price: parseFloat(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={3}
                value={vehicleForm.notes}
                onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVehicleDialog({ open: false, mode: 'create', vehicle: null })}>
            Cancelar
          </Button>
          <Button onClick={handleVehicleSubmit} variant="contained">
            {vehicleDialog.mode === 'create' ? 'Criar' : 'Atualizar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Manutenção */}
      <Dialog 
        open={maintenanceDialog.open} 
        onClose={() => setMaintenanceDialog({ open: false, mode: 'create', maintenance: null })}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {maintenanceDialog.mode === 'create' ? 'Nova Manutenção' : 'Editar Manutenção'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Veículo</InputLabel>
                <Select
                  value={maintenanceForm.vehicle_id}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, vehicle_id: e.target.value })}
                  label="Veículo"
                  required
                >
                  {vehicles.map((vehicle) => (
                    <MenuItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate} - {vehicle.brand} {vehicle.model}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={maintenanceForm.type}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
                  label="Tipo"
                >
                  <MenuItem value="preventiva">Preventiva</MenuItem>
                  <MenuItem value="corretiva">Corretiva</MenuItem>
                  <MenuItem value="emergencial">Emergencial</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data Agendada"
                type="date"
                value={maintenanceForm.scheduled_date}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, scheduled_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  value={maintenanceForm.priority}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, priority: e.target.value })}
                  label="Prioridade"
                >
                  <MenuItem value="baixa">Baixa</MenuItem>
                  <MenuItem value="media">Média</MenuItem>
                  <MenuItem value="alta">Alta</MenuItem>
                  <MenuItem value="critica">Crítica</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Custo Estimado"
                type="number"
                value={maintenanceForm.cost}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: parseFloat(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mecânico/Oficina"
                value={maintenanceForm.mechanic}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, mechanic: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                multiline
                rows={3}
                value={maintenanceForm.description}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={2}
                value={maintenanceForm.notes}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMaintenanceDialog({ open: false, mode: 'create', maintenance: null })}>
            Cancelar
          </Button>
          <Button onClick={handleMaintenanceSubmit} variant="contained">
            {maintenanceDialog.mode === 'create' ? 'Criar' : 'Atualizar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Combustível */}
      <Dialog 
        open={fuelDialog.open} 
        onClose={() => setFuelDialog({ open: false, mode: 'create', fuel: null })}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {fuelDialog.mode === 'create' ? 'Novo Registro de Combustível' : 'Editar Registro de Combustível'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Veículo</InputLabel>
                <Select
                  value={fuelForm.vehicle_id}
                  onChange={(e) => setFuelForm({ ...fuelForm, vehicle_id: e.target.value })}
                  label="Veículo"
                  required
                >
                  {vehicles.map((vehicle) => (
                    <MenuItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate} - {vehicle.brand} {vehicle.model}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data"
                type="date"
                value={fuelForm.date}
                onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Combustível</InputLabel>
                <Select
                  value={fuelForm.fuel_type}
                  onChange={(e) => setFuelForm({ ...fuelForm, fuel_type: e.target.value })}
                  label="Tipo de Combustível"
                >
                  <MenuItem value="gasolina">Gasolina</MenuItem>
                  <MenuItem value="etanol">Etanol</MenuItem>
                  <MenuItem value="diesel">Diesel</MenuItem>
                  <MenuItem value="flex">Flex</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quantidade (L)"
                type="number"
                value={fuelForm.quantity_liters}
                onChange={(e) => setFuelForm({ ...fuelForm, quantity_liters: parseFloat(e.target.value) })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Preço por Litro (R$)"
                type="number"
                step="0.01"
                value={fuelForm.price_per_liter}
                onChange={(e) => setFuelForm({ ...fuelForm, price_per_liter: parseFloat(e.target.value) })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Posto"
                value={fuelForm.gas_station}
                onChange={(e) => setFuelForm({ ...fuelForm, gas_station: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quilometragem"
                type="number"
                value={fuelForm.mileage}
                onChange={(e) => setFuelForm({ ...fuelForm, mileage: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Finalidade</InputLabel>
                <Select
                  value={fuelForm.purpose}
                  onChange={(e) => setFuelForm({ ...fuelForm, purpose: e.target.value })}
                  label="Finalidade"
                >
                  <MenuItem value="trabalho">Trabalho</MenuItem>
                  <MenuItem value="pessoal">Pessoal</MenuItem>
                  <MenuItem value="entrega">Entrega</MenuItem>
                  <MenuItem value="manutencao">Manutenção</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={2}
                value={fuelForm.notes}
                onChange={(e) => setFuelForm({ ...fuelForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFuelDialog({ open: false, mode: 'create', fuel: null })}>
            Cancelar
          </Button>
          <Button onClick={handleFuelSubmit} variant="contained">
            {fuelDialog.mode === 'create' ? 'Registrar' : 'Atualizar'}
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
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default FleetPage;
