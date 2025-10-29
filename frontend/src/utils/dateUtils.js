// Utilitários de formatação e manipulação de datas

/**
 * Formata uma data para o formato brasileiro (DD/MM/YYYY)
 * @param {Date|string} dateValue - Data a ser formatada
 * @param {Object} options - Opções de formatação
 * @returns {string} - Data formatada
 */
export const formatDate = (dateValue, options = {}) => {
  if (!dateValue) return '';
  
  try {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      console.warn('Data inválida:', dateValue);
      return '';
    }
    
    // Opções padrão
    const defaultOptions = { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    };
    
    // Mesclar opções padrão com opções personalizadas
    const formatOptions = { ...defaultOptions, ...options };
    
    return date.toLocaleDateString('pt-BR', formatOptions);
  } catch (error) {
    console.warn('Erro ao formatar data:', error);
    return '';
  }
};

/**
 * Formata um horário para o formato brasileiro (HH:MM)
 * @param {Date|string} timeValue - Horário a ser formatado
 * @returns {string} - Horário formatado
 */
export const formatTime = (timeValue) => {
  if (!timeValue) return '';
  
  try {
    // Se for um objeto Date
    if (timeValue instanceof Date) {
      return timeValue.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Se for string no formato HH:MM
    if (typeof timeValue === 'string' && /^\d{2}:\d{2}$/.test(timeValue)) {
      const [hours, minutes] = timeValue.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Se for string no formato ISO ou outro formato de data
    if (typeof timeValue === 'string') {
      // Se for apenas horário (HH:MM:SS)
      if (timeValue.includes(':') && !timeValue.includes('-') && !timeValue.includes('/')) {
        const date = new Date(`2000-01-01T${timeValue}`);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
      
      // Se for data completa
      const date = new Date(timeValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
    
    return timeValue;
  } catch (error) {
    console.warn('Erro ao formatar horário:', error);
    return '';
  }
};

/**
 * Verifica se uma data está dentro de um intervalo de datas
 * @param {Date|string} checkDate - Data a ser verificada
 * @param {Date|string} startDate - Data inicial do intervalo
 * @param {Date|string} endDate - Data final do intervalo
 * @returns {boolean} - True se a data estiver no intervalo
 */
export const isDateInRange = (checkDate, startDate, endDate) => {
  try {
    // Converter para objetos Date
    const dateToCheck = checkDate instanceof Date ? new Date(checkDate) : new Date(checkDate);
    const start = startDate instanceof Date ? new Date(startDate) : new Date(startDate);
    const end = endDate instanceof Date ? new Date(endDate) : new Date(endDate);
    
    // Normalizar todas as datas para meia-noite no fuso local
    dateToCheck.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    return dateToCheck >= start && dateToCheck <= end;
  } catch (error) {
    console.warn('Erro ao verificar intervalo de datas:', error);
    return false;
  }
};

/**
 * Calcula a diferença em dias entre duas datas
 * @param {Date|string} date1 - Primeira data
 * @param {Date|string} date2 - Segunda data
 * @returns {number} - Diferença em dias
 */
export const getDaysDifference = (date1, date2) => {
  try {
    const firstDate = date1 instanceof Date ? date1 : new Date(date1);
    const secondDate = date2 instanceof Date ? date2 : new Date(date2);
    
    // Normalizar datas para meia-noite
    firstDate.setHours(0, 0, 0, 0);
    secondDate.setHours(0, 0, 0, 0);
    
    const diffTime = secondDate - firstDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.warn('Erro ao calcular diferença de dias:', error);
    return 0;
  }
};

/**
 * Cria uma data segura usando UTC para evitar problemas de fuso horário
 * @param {number} year - Ano
 * @param {number} month - Mês (1-12)
 * @param {number} day - Dia
 * @returns {Date} - Data criada
 */
export const createSafeDate = (year, month, day) => {
  try {
    // Criar data usando UTC para evitar problemas de fuso horário
    const date = new Date(Date.UTC(year, month - 1, day));
    
    // Converter para fuso local
    const localOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + localOffset);
  } catch (error) {
    console.warn('Erro ao criar data segura:', error);
    return new Date();
  }
};

/**
 * Obtém a prioridade de uma visita com base na data agendada
 * @param {Object} visit - Objeto da visita com scheduled_date
 * @returns {string} - Prioridade (error, warning, info, default)
 */
export const getVisitPriority = (visit) => {
  try {
    const today = new Date();
    const visitDate = new Date(visit.scheduled_date);
    const diffDays = getDaysDifference(today, visitDate);
    
    if (diffDays < 0) return 'error'; // Atrasada
    if (diffDays === 0) return 'warning'; // Hoje
    if (diffDays <= 3) return 'info'; // Esta semana
    return 'default';
  } catch (error) {
    console.warn('Erro ao calcular prioridade da visita:', error);
    return 'default';
  }
};