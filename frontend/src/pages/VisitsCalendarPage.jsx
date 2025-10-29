import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  Tooltip,
  Alert,
  Snackbar,
  Fab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider
} from '@mui/material';
import {
  CalendarToday,
  Add,
  Edit,
  Delete,
  Visibility,
  Schedule,
  CheckCircle,
  Cancel,
  Pending,
  DirectionsCar,
  Build,
  Engineering,
  Assignment,
  LocationOn,
  Person,
  Business,
  ExpandMore,
  ExpandLess,
  Today,
  NavigateNext,
  NavigateBefore,
  FilterList
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const VisitsCalendarPage = () => {
  const { user } = useAuth();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [viewVisit, setViewVisit] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchVisits();
  }, [filterType, filterStatus]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (filterStatus) params.append('status', filterStatus);
      
      const response = await api.get(`/visits?${params.toString()}`);
      setVisits(response.data.visits || []);
    } catch (error) {
      console.error('Erro ao buscar visitas:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar visitas',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Adicionar dias do mês anterior para completar a primeira semana
    for (let i = startingDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false, visits: [] });
    }
    
    // Adicionar dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month, i);
      const dayVisits = visits.filter(visit => {
        const visitDate = new Date(visit.scheduled_date);
        return visitDate.toDateString() === currentDate.toDateString();
      });
      days.push({ date: currentDate, isCurrentMonth: true, visits: dayVisits });
    }
    
    // Adicionar dias do próximo mês para completar a última semana
    const remainingDays = 42 - days.length; // 6 semanas * 7 dias
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({ date: nextDate, isCurrentMonth: false, visits: [] });
    }
    
    return days;
  };

  const getMonthName = (date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const getDayName = (date) => {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' });
  };

  const getVisitTypeIcon = (type) => {
    switch (type) {
      case 'comercial': return <DirectionsCar />;
      case 'tecnica': return <Assignment />;
      case 'instalacao': return <Build />;
      case 'manutencao': return <Engineering />;
      default: return <Schedule />;
    }
  };

  const getVisitTypeColor = (type) => {
    switch (type) {
      case 'comercial': return 'primary';
      case 'tecnica': return 'warning';
      case 'instalacao': return 'success';
      case 'manutencao': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'agendada': return 'info';
      case 'em_andamento': return 'warning';
      case 'concluida': return 'success';
      case 'cancelada': return 'error';
      case 'reagendada': return 'default';
      default: return 'default';
    }
  };

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDateClick = (day) => {
    if (day.isCurrentMonth) {
      setSelectedDate(day.date);
      setSelectedVisit(null);
    }
  };

  const handleVisitClick = (visit) => {
    setViewVisit(visit);
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const getVisitsForDate = (date) => {
    return visits.filter(visit => {
      const visitDate = new Date(visit.scheduled_date);
      return visitDate.toDateString() === date.toDateString();
    });
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();
  const isToday = (date) => date.toDateString() === today.toDateString();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          📅 Calendário de Visitas
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Tipo"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="comercial">Comercial</MenuItem>
              <MenuItem value="tecnica">Técnica</MenuItem>
              <MenuItem value="instalacao">Instalação</MenuItem>
              <MenuItem value="manutencao">Manutenção</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="agendada">Agendada</MenuItem>
              <MenuItem value="em_andamento">Em Andamento</MenuItem>
              <MenuItem value="concluida">Concluída</MenuItem>
              <MenuItem value="cancelada">Cancelada</MenuItem>
              <MenuItem value="reagendada">Reagendada</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Controles do Calendário */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigateMonth(-1)}>
              <NavigateBefore />
            </IconButton>
            <Typography variant="h5" sx={{ minWidth: 200, textAlign: 'center' }}>
              {getMonthName(currentDate)}
            </Typography>
            <IconButton onClick={() => navigateMonth(1)}>
              <NavigateNext />
            </IconButton>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Today />}
            onClick={goToToday}
          >
            Hoje
          </Button>
        </Box>
      </Paper>

      {/* Calendário */}
      <Paper sx={{ p: 2 }}>
        {/* Cabeçalho dos dias da semana */}
        <Grid container sx={{ mb: 1 }}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <Grid item xs={12/7} key={day}>
              <Box sx={{ p: 1, textAlign: 'center', fontWeight: 'bold', color: 'text.secondary' }}>
                {day}
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Dias do calendário */}
        <Grid container>
          {days.map((day, index) => (
            <Grid item xs={12/7} key={index}>
              <Box
                sx={{
                  p: 1,
                  minHeight: 120,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: day.isCurrentMonth ? 'background.paper' : 'action.hover',
                  cursor: day.isCurrentMonth ? 'pointer' : 'default',
                  '&:hover': day.isCurrentMonth ? {
                    backgroundColor: 'action.hover'
                  } : {},
                  position: 'relative'
                }}
                onClick={() => handleDateClick(day)}
              >
                {/* Número do dia */}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isToday(day.date) ? 'bold' : 'normal',
                    color: isToday(day.date) ? 'primary.main' : 
                           day.isCurrentMonth ? 'text.primary' : 'text.disabled',
                    textAlign: 'center',
                    mb: 1
                  }}
                >
                  {day.date.getDate()}
                </Typography>

                {/* Visitas do dia */}
                <Box sx={{ maxHeight: 80, overflow: 'hidden' }}>
                  {day.visits.slice(0, 3).map((visit, visitIndex) => (
                    <Tooltip
                      key={visit.id}
                      title={`${visit.title} - ${formatTime(visit.scheduled_time)}`}
                      arrow
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          mb: 0.5,
                          p: 0.5,
                          borderRadius: 1,
                          backgroundColor: `${getVisitTypeColor(visit.type)}.light`,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: `${getVisitTypeColor(visit.type)}.main`,
                            color: 'white'
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVisitClick(visit);
                        }}
                      >
                        <Box sx={{ fontSize: '0.75rem' }}>
                          {getVisitTypeIcon(visit.type)}
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {visit.title.length > 15 ? visit.title.substring(0, 15) + '...' : visit.title}
                        </Typography>
                      </Box>
                    </Tooltip>
                  ))}
                  {day.visits.length > 3 && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontStyle: 'italic',
                        textAlign: 'center',
                        display: 'block'
                      }}
                    >
                      +{day.visits.length - 3} mais
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Painel lateral com detalhes da data selecionada */}
      {selectedDate && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Visitas para {selectedDate.toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Typography>
          
          {getVisitsForDate(selectedDate).length === 0 ? (
            <Typography color="text.secondary">
              Nenhuma visita agendada para esta data.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {getVisitsForDate(selectedDate).map((visit) => (
                <Grid item xs={12} md={6} lg={4} key={visit.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 3 }
                    }}
                    onClick={() => handleVisitClick(visit)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Avatar sx={{ bgcolor: `${getVisitTypeColor(visit.type)}.main`, width: 32, height: 32 }}>
                          {getVisitTypeIcon(visit.type)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight="bold" noWrap>
                            {visit.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTime(visit.scheduled_time)}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Business fontSize="small" color="action" />
                        <Typography variant="body2" noWrap>
                          {visit.client?.company_name || visit.lead?.company_name || 'Cliente não definido'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2" noWrap>
                          {visit.address || 'Endereço não informado'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={visit.type}
                          size="small"
                          color={getVisitTypeColor(visit.type)}
                          variant="outlined"
                        />
                        <Chip
                          label={visit.status}
                          size="small"
                          color={getStatusColor(visit.status)}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      {/* Dialog de visualização da visita */}
      <Dialog open={!!viewVisit} onClose={() => setViewVisit(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: `${getVisitTypeColor(viewVisit?.type)}.main` }}>
              {viewVisit && getVisitTypeIcon(viewVisit.type)}
            </Avatar>
            Detalhes da Visita
          </Box>
        </DialogTitle>
        <DialogContent>
          {viewVisit && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Informações da Visita</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Título</Typography>
                  <Typography variant="body1">{viewVisit.title}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Tipo</Typography>
                  <Typography variant="body1">
                    {viewVisit.type === 'tecnica' ? 'Visita Técnica' : 
                     viewVisit.type === 'comercial' ? 'Visita Comercial' : 
                     viewVisit.type === 'instalacao' ? 'Instalação' : 'Visita'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Data e Hora</Typography>
                  <Typography variant="body1">
                    {new Date(viewVisit.scheduled_date).toLocaleDateString('pt-BR')} às {formatTime(viewVisit.scheduled_time)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                  <Chip
                    label={viewVisit.status}
                    color={getStatusColor(viewVisit.status)}
                    size="small"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Cliente e Local</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Cliente</Typography>
                  <Typography variant="body1">
                    {viewVisit.client?.company_name || viewVisit.lead?.company_name || 'Cliente não definido'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Endereço</Typography>
                  <Typography variant="body1">{viewVisit.address || 'Endereço não informado'}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Responsável</Typography>
                  <Typography variant="body1">
                    {viewVisit.responsible?.name || 'Não atribuído'}
                  </Typography>
                </Box>
              </Grid>
              {viewVisit.notes && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Observações</Typography>
                  <Typography variant="body1">{viewVisit.notes}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewVisit(null)}>Fechar</Button>
          <Button 
            onClick={() => {
              setViewVisit(null);
              // Aqui você pode adicionar navegação para editar a visita
            }} 
            variant="contained"
          >
            Editar
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

export default VisitsCalendarPage;
