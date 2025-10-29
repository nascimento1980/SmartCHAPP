const { Visit } = require('../models');
const { Op } = require('sequelize');

/**
 * Configurações de horários de trabalho
 */
const WORK_SCHEDULE = {
  // Horário comercial padrão
  workDays: [1, 2, 3, 4, 5], // Segunda a sexta (0 = domingo, 6 = sábado)
  workHours: {
    start: '08:00',
    end: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00'
  },
  // Slots de tempo disponíveis (intervalos de 30 minutos)
  timeSlots: [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ],
  // Duração padrão de um compromisso (em minutos)
  defaultDuration: 60,
  // Intervalo mínimo entre compromissos (em minutos)
  minInterval: 15
};

/**
 * Verifica se uma data é um dia útil
 * @param {Date} date - Data a ser verificada
 * @returns {boolean} - True se for dia útil
 */
const isWorkDay = (date) => {
  const dayOfWeek = date.getDay();
  return WORK_SCHEDULE.workDays.includes(dayOfWeek);
};

/**
 * Verifica se um horário está no horário comercial
 * @param {string} time - Horário no formato 'HH:MM'
 * @returns {boolean} - True se estiver no horário comercial
 */
const isWorkHour = (time) => {
  const { workHours } = WORK_SCHEDULE;
  
  // Converter horários para minutos para comparação
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const timeMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(workHours.start);
  const endMinutes = timeToMinutes(workHours.end);
  const lunchStartMinutes = timeToMinutes(workHours.lunchStart);
  const lunchEndMinutes = timeToMinutes(workHours.lunchEnd);

  // Verificar se está no horário de trabalho, mas não no horário de almoço
  return (timeMinutes >= startMinutes && timeMinutes <= endMinutes) &&
         !(timeMinutes >= lunchStartMinutes && timeMinutes < lunchEndMinutes);
};

/**
 * Busca compromissos existentes para um usuário em uma data específica
 * @param {string} userId - ID do usuário
 * @param {Date} date - Data a ser verificada
 * @returns {Array} - Lista de compromissos existentes
 */
const getExistingAppointments = async (userId, date) => {
  try {
    // Criar range de data para comparação (dia todo)
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    const appointments = await Visit.findAll({
      where: {
        responsible_id: userId,
        scheduled_date: {
          [Op.between]: [startOfDay, endOfDay]
        },
        status: {
          [Op.in]: ['agendada', 'em_andamento', 'planejada']
        }
      },
      attributes: ['id', 'scheduled_time', 'estimated_duration', 'title'],
      order: [['scheduled_time', 'ASC']]
    });

    return appointments.map(apt => ({
      id: apt.id,
      time: apt.scheduled_time,
      duration: apt.estimated_duration || WORK_SCHEDULE.defaultDuration,
      title: apt.title
    }));
  } catch (error) {
    console.error('Erro ao buscar compromissos existentes:', error);
    return [];
  }
};

/**
 * Verifica se um horário está ocupado
 * @param {string} time - Horário a ser verificado
 * @param {number} duration - Duração do compromisso em minutos
 * @param {Array} existingAppointments - Lista de compromissos existentes
 * @returns {boolean} - True se o horário estiver ocupado
 */
const isTimeSlotOccupied = (time, duration, existingAppointments) => {
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const newStartMinutes = timeToMinutes(time);
  const newEndMinutes = newStartMinutes + duration;

  return existingAppointments.some(apt => {
    const existingStartMinutes = timeToMinutes(apt.time);
    const existingEndMinutes = existingStartMinutes + apt.duration + WORK_SCHEDULE.minInterval;

    // Verificar se há sobreposição
    return (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes);
  });
};

/**
 * Sugere horários disponíveis para um usuário em uma data específica
 * @param {string} userId - ID do usuário
 * @param {Date} date - Data para sugerir horários
 * @param {number} duration - Duração do compromisso em minutos (opcional)
 * @param {number} maxSuggestions - Número máximo de sugestões (opcional)
 * @returns {Object} - Objeto com horários disponíveis e informações
 */
const suggestAvailableTimes = async (userId, date, duration = null, maxSuggestions = 8) => {
  try {
    // Validar se é dia útil
    if (!isWorkDay(date)) {
      return {
        available: false,
        reason: 'not_work_day',
        message: 'Não é possível agendar compromissos em fins de semana',
        suggestions: [],
        date: date.toISOString().split('T')[0]
      };
    }

    // Validar se não é data passada
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return {
        available: false,
        reason: 'past_date',
        message: 'Não é possível agendar compromissos para datas passadas',
        suggestions: [],
        date: date.toISOString().split('T')[0]
      };
    }

    const appointmentDuration = duration || WORK_SCHEDULE.defaultDuration;
    
    // Buscar compromissos existentes
    const existingAppointments = await getExistingAppointments(userId, date);

    // Filtrar horários disponíveis
    const availableSlots = WORK_SCHEDULE.timeSlots.filter(time => {
      // Verificar se está no horário comercial
      if (!isWorkHour(time)) {
        return false;
      }

      // Verificar se não está ocupado
      return !isTimeSlotOccupied(time, appointmentDuration, existingAppointments);
    });

    // Limitar número de sugestões
    const suggestions = availableSlots.slice(0, maxSuggestions).map(time => ({
      time,
      formatted: formatTimeDisplay(time),
      available: true
    }));

    // Adicionar informações sobre próximos horários disponíveis se necessário
    const nextAvailableDay = suggestions.length === 0 ? await findNextAvailableDay(userId, date, appointmentDuration) : null;

    return {
      available: suggestions.length > 0,
      reason: suggestions.length === 0 ? 'fully_booked' : 'available',
      message: suggestions.length === 0 
        ? 'Não há horários disponíveis nesta data' 
        : `${suggestions.length} horário(s) disponível(is)`,
      suggestions,
      totalSlots: WORK_SCHEDULE.timeSlots.length,
      occupiedSlots: existingAppointments.length,
      date: date.toISOString().split('T')[0],
      ...(nextAvailableDay && { nextAvailableDay })
    };

  } catch (error) {
    console.error('Erro ao sugerir horários disponíveis:', error);
    return {
      available: false,
      reason: 'error',
      message: 'Erro interno ao buscar horários disponíveis',
      suggestions: [],
      date: date.toISOString().split('T')[0]
    };
  }
};

/**
 * Encontra o próximo dia útil com horários disponíveis
 * @param {string} userId - ID do usuário
 * @param {Date} startDate - Data inicial para busca
 * @param {number} duration - Duração do compromisso
 * @param {number} maxDaysToCheck - Máximo de dias para verificar
 * @returns {Object|null} - Informações do próximo dia disponível
 */
const findNextAvailableDay = async (userId, startDate, duration, maxDaysToCheck = 14) => {
  const currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() + 1); // Começar do próximo dia

  for (let i = 0; i < maxDaysToCheck; i++) {
    if (isWorkDay(currentDate)) {
      const daySlots = await suggestAvailableTimes(userId, new Date(currentDate), duration, 1);
      if (daySlots.available && daySlots.suggestions.length > 0) {
        return {
          date: currentDate.toISOString().split('T')[0],
          formatted: currentDate.toLocaleDateString('pt-BR'),
          availableSlots: daySlots.suggestions.length,
          firstAvailableTime: daySlots.suggestions[0].time
        };
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return null;
};

/**
 * Formata horário para exibição
 * @param {string} time - Horário no formato 'HH:MM'
 * @returns {string} - Horário formatado para exibição
 */
const formatTimeDisplay = (time) => {
  const [hours, minutes] = time.split(':');
  return `${hours}:${minutes}`;
};

/**
 * Verifica conflito de horário e sugere alternativas
 * @param {string} userId - ID do usuário
 * @param {Date} date - Data do compromisso
 * @param {string} time - Horário desejado
 * @param {number} duration - Duração do compromisso
 * @returns {Object} - Resultado da verificação com sugestões
 */
const checkTimeConflictWithSuggestions = async (userId, date, time, duration = null) => {
  try {
    const appointmentDuration = duration || WORK_SCHEDULE.defaultDuration;
    
    // Buscar compromissos existentes
    const existingAppointments = await getExistingAppointments(userId, date);
    
    // Verificar se o horário está ocupado
    const hasConflict = isTimeSlotOccupied(time, appointmentDuration, existingAppointments);
    
    if (!hasConflict) {
      return {
        hasConflict: false,
        message: 'Horário disponível',
        requestedTime: time,
        date: date.toISOString().split('T')[0]
      };
    }

    // Se há conflito, buscar horários alternativos
    const suggestions = await suggestAvailableTimes(userId, date, appointmentDuration, 5);
    
    // Encontrar o compromisso conflitante
    const conflictingAppointment = existingAppointments.find(apt =>
      isTimeSlotOccupied(time, appointmentDuration, [apt])
    );

    return {
      hasConflict: true,
      message: `Já existe um compromisso agendado para ${time}`,
      requestedTime: time,
      date: date.toISOString().split('T')[0],
      conflictingAppointment: conflictingAppointment ? {
        id: conflictingAppointment.id,
        time: conflictingAppointment.time,
        title: conflictingAppointment.title
      } : null,
      alternativeTimes: suggestions.suggestions || [],
      nextAvailableDay: suggestions.nextAvailableDay || null
    };

  } catch (error) {
    console.error('Erro ao verificar conflito de horário:', error);
    return {
      hasConflict: true,
      message: 'Erro interno ao verificar horário',
      requestedTime: time,
      date: date.toISOString().split('T')[0]
    };
  }
};

module.exports = {
  suggestAvailableTimes,
  checkTimeConflictWithSuggestions,
  isWorkDay,
  isWorkHour,
  getExistingAppointments,
  findNextAvailableDay,
  WORK_SCHEDULE
};


