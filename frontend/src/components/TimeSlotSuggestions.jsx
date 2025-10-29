import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const TimeSlotSuggestions = ({ 
  selectedDate, 
  selectedTime, 
  duration = 60,
  userId = null,
  onTimeSelect,
  onDateChange,
  showNavigation = true,
  maxSuggestions = 8
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [error, setError] = useState('');
  const [customDuration, setCustomDuration] = useState(duration);

  // Use userId prop or current user
  const targetUserId = userId || user?.id;

  // Carregar sugestões quando a data muda
  useEffect(() => {
    if (selectedDate && targetUserId) {
      loadTimeSuggestions();
    }
  }, [selectedDate, targetUserId, customDuration]);

  const loadTimeSuggestions = async () => {
    setLoading(true);
    setError('');
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await api.get('/visits/suggest-times', {
        params: {
          date: dateStr,
          user_id: targetUserId,
          duration: customDuration
        }
      });

      setSuggestions(response.data);
    } catch (error) {
      console.error('Erro ao carregar sugestões:', error);
      setError('Erro ao carregar horários disponíveis: ' + error.message);
      setSuggestions(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSelect = (timeSlot) => {
    if (onTimeSelect) {
      onTimeSelect(timeSlot.time);
    }
  };

  const handleDateNavigation = (direction) => {
    if (!onDateChange) return;
    
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    onDateChange(newDate);
  };

  const handleDurationChange = (newDuration) => {
    setCustomDuration(newDuration);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    return time; // Já vem formatado como "HH:MM"
  };

  const getAvailabilityIcon = () => {
    if (!suggestions) return null;
    
    if (suggestions.available) {
      return <CheckIcon color="success" />;
    } else {
      return <WarningIcon color="warning" />;
    }
  };

  const getAvailabilityColor = () => {
    if (!suggestions) return 'default';
    return suggestions.available ? 'success' : 'warning';
  };

  if (!selectedDate) {
    return (
      <Alert severity="info">
        Selecione uma data para ver os horários disponíveis.
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Cabeçalho */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <TimeIcon />
            <Typography variant="h6">
              Horários Disponíveis
            </Typography>
            {getAvailabilityIcon()}
          </Box>
          
          <Tooltip title="Atualizar sugestões">
            <IconButton onClick={loadTimeSuggestions} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Navegação de data */}
        {showNavigation && (
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <IconButton 
              onClick={() => handleDateNavigation(-1)}
              disabled={loading}
            >
              <PrevIcon />
            </IconButton>
            
            <Typography variant="body1" textAlign="center" sx={{ flexGrow: 1 }}>
              {formatDate(selectedDate)}
            </Typography>
            
            <IconButton 
              onClick={() => handleDateNavigation(1)}
              disabled={loading}
            >
              <NextIcon />
            </IconButton>
          </Box>
        )}

        {/* Controle de duração */}
        <Box mb={3}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Duração</InputLabel>
            <Select
              value={customDuration}
              label="Duração"
              onChange={(e) => handleDurationChange(e.target.value)}
            >
              <MenuItem value={30}>30 minutos</MenuItem>
              <MenuItem value={60}>1 hora</MenuItem>
              <MenuItem value={90}>1h 30min</MenuItem>
              <MenuItem value={120}>2 horas</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Loading */}
        {loading && (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress />
          </Box>
        )}

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Resultados */}
        {!loading && suggestions && (
          <Box>
            {/* Status da disponibilidade */}
            <Alert 
              severity={suggestions.available ? 'success' : 'warning'} 
              sx={{ mb: 2 }}
            >
              <Typography variant="body2">
                {suggestions.message}
              </Typography>
              {suggestions.totalSlots && (
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  {suggestions.occupiedSlots} de {suggestions.totalSlots} horários ocupados
                </Typography>
              )}
            </Alert>

            {/* Horários disponíveis */}
            {suggestions.available && suggestions.suggestions.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Horários Disponíveis:
                </Typography>
                
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  {suggestions.suggestions.map((timeSlot, index) => (
                    <Grid item xs={6} sm={4} md={3} key={index}>
                      <Button
                        variant={selectedTime === timeSlot.time ? 'contained' : 'outlined'}
                        color={selectedTime === timeSlot.time ? 'primary' : 'inherit'}
                        fullWidth
                        onClick={() => handleTimeSelect(timeSlot)}
                        startIcon={<ScheduleIcon />}
                        size="small"
                      >
                        {formatTime(timeSlot.time)}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Próximo dia disponível */}
            {!suggestions.available && suggestions.nextAvailableDay && (
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Próximo dia disponível:
                </Typography>
                
                <Card variant="outlined">
                  <CardContent sx={{ py: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2">
                          {suggestions.nextAvailableDay.formatted}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {suggestions.nextAvailableDay.availableSlots} horário(s) disponível(is)
                        </Typography>
                      </Box>
                      
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const nextDate = new Date(suggestions.nextAvailableDay.date);
                          if (onDateChange) {
                            onDateChange(nextDate);
                          }
                        }}
                      >
                        Ver Horários
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Informações adicionais */}
            {suggestions.reason && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  Status: {suggestions.reason === 'available' ? 'Disponível' : 
                           suggestions.reason === 'fully_booked' ? 'Totalmente ocupado' :
                           suggestions.reason === 'not_work_day' ? 'Não é dia útil' :
                           suggestions.reason === 'past_date' ? 'Data passada' : 'Indisponível'}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Dicas de uso */}
        {!loading && (!suggestions || !suggestions.available) && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info">
              <Typography variant="body2" gutterBottom>
                💡 Dicas para encontrar horários:
              </Typography>
              <Typography variant="caption" component="div">
                • Horário comercial: 8h às 18h (exceto 12h-13h)
                <br />
                • Apenas dias úteis (segunda a sexta)
                <br />
                • Tente durações menores se não houver disponibilidade
              </Typography>
            </Alert>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TimeSlotSuggestions;


