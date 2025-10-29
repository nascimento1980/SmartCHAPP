import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Button,
  Tooltip,
  Paper,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Snackbar
} from '@mui/material';
import {
  NavigateBefore,
  NavigateNext,
  Today,
  Schedule,
  DirectionsCar,
  Engineering,
  Assignment,
  Build,
  Visibility,
  Add,
  Search,
  Business,
  LocationOn,
  Delete,
  Route
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useVisitSync } from '../contexts/VisitSyncContext';
import api from '../services/api';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { ptBR } from 'date-fns/locale';
import UserSelector from './UserSelector';
import { formatDate, formatTime, isDateInRange } from '../utils/dateUtils';

const VisitsCalendar = () => {
  const { user } = useAuth();
  const { notifyVisitDeleted, syncKey } = useVisitSync();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return now;
  });
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  // Estados para criação de compromissos
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newCommitment, setNewCommitment] = useState({
    planned_date: null,
    planned_time: '09:00', // 09:00 como padrão em formato string
    client_id: '',
    client_name: '',
    client_address: '',
    visit_type: 'comercial',
    priority: 'media',
    notes: ''
  });
  
  // Estados para busca de clientes
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [clientFilterCity, setClientFilterCity] = useState('');
  
  // Estados para modal de justificativa de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState(null);
  const [deletionReason, setDeletionReason] = useState('');
  
  // Estado para seleção de usuários para convite
  const [selectedUsersForInvite, setSelectedUsersForInvite] = useState([]);

  console.log('📅 VisitsCalendar renderizado, user:', user);

  const typeIcons = {
    comercial: <DirectionsCar />,
    tecnica: <Assignment />,
    implantacao: <Build />,
    instalacao: <Build />,
    manutencao: <Engineering />,
    suporte: <Visibility />,
    treinamento: <Schedule />
  };

  const typeColors = {
    comercial: 'primary',      // Azul - para visitas comerciais
    tecnica: 'warning',        // Laranja - para visitas técnicas
    implantacao: 'success',    // Verde - para implantação
    instalacao: 'info',        // Azul claro - para instalação
    manutencao: 'error',       // Vermelho - para manutenção
    suporte: 'secondary',      // Roxo - para suporte
    treinamento: 'default'     // Cinza - para treinamento
  };

  const statusColors = {
    agendada: 'info',
    em_andamento: 'warning',
    concluida: 'success',
    cancelada: 'error',
    reagendada: 'default'
  };

  // Funções utilitárias para planejamento semanal
  const getWeekDates = (startDate) => {
    console.log('🔍 getWeekDates chamado com:', startDate);
    
    // Usar a data diretamente sem ajustes de timezone problemáticos
    const date = new Date(startDate);
    const dayOfWeek = date.getDay(); // 0 = domingo, 6 = sábado
    
    console.log('🔍 Análise da data:', { 
      original: startDate,
      dateObject: date.toISOString(),
      dayOfWeek, 
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      dayName: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][dayOfWeek]
    });
    
    // Para sábados e domingos, criar planejamento individual (apenas para esse dia)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const start = new Date(date);
      const end = new Date(date);
      
      console.log('🔍 Planejamento de fim de semana:', { 
        start: start.toISOString(), 
        end: end.toISOString(),
        startFormatted: start.toLocaleDateString('pt-BR'),
        endFormatted: end.toLocaleDateString('pt-BR')
      });
      
      return { start, end, isWeekend: true };
    }
    
    // Para dias úteis (segunda a sexta), calcular a semana completa
    const start = new Date(date);
    const end = new Date(date);
    
    // Ajustar para segunda-feira (1 = segunda)
    const daysToMonday = dayOfWeek - 1; // Segunda = 1, então dayOfWeek - 1
    
    start.setDate(start.getDate() - daysToMonday);
    end.setDate(start.getDate() + 4); // Segunda a sexta (5 dias)
    
    console.log('🔍 Planejamento semanal:', { 
      daysToMonday,
      start: start.toISOString(), 
      end: end.toISOString(),
      startFormatted: start.toLocaleDateString('pt-BR'),
      endFormatted: end.toLocaleDateString('pt-BR')
    });
    
    return { start, end, isWeekend: false };
  };

  const isDateValid = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const createPlanningFromDate = async (date, type) => {
    try {
      console.log('🔍 createPlanningFromDate chamado com:', { date, type, userId: user?.id });
      
      const { start, end, isWeekend } = getWeekDates(date);
      console.log('🔍 Período calculado:', { 
        start: start.toISOString(), 
        end: end.toISOString(),
        isWeekend 
      });
      
      // Tentar criar o planejamento
      const planningData = {
        week_start_date: start,
        week_end_date: end,
        responsible_id: user?.id || '',
        planning_type: 'misto',
        status: 'em_planejamento',
        notes: isWeekend 
          ? `Planejamento individual para ${start.toLocaleDateString('pt-BR')}`
          : `Planejamento criado automaticamente para semana de ${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`
      };
      
      console.log('🔍 Tentando criar/buscar planejamento...', planningData);
      
      try {
        const response = await api.post('/visit-planning', planningData);
        console.log('✅ Planejamento criado com sucesso:', response.data);
        return response.data.planning;
      } catch (createError) {
        // Se o erro for porque já existe um planejamento, usar o existente
        if (createError.response?.status === 400 && createError.response?.data?.existingPlanning) {
          const existingPlanning = createError.response.data.existingPlanning;
          console.log('✅ Usando planejamento existente:', existingPlanning);
          
          // Buscar o planejamento completo com todos os detalhes
          const planningDetails = await api.get(`/visit-planning/${existingPlanning.id}`);
          return planningDetails.data?.planning || existingPlanning;
        }
        throw createError;
      }
    } catch (error) {
      console.error('❌ Erro ao criar/buscar planejamento:', error);
      console.error('❌ Detalhes do erro:', error.response?.data);
      throw error;
    }
  };

  // Buscar clientes e leads (filtra por cidade primeiro, depois por nome; ou apenas nome)
  const searchClients = async (searchTerm) => {
    try {
      const hasCity = clientFilterCity && clientFilterCity.trim().length > 0;
      const hasTerm = searchTerm && searchTerm.length > 0;

      // Se nenhum filtro, carregar alguns para sugestão
      if (!hasCity && !hasTerm) {
        const response = await api.get('/customer-contacts', { params: { limit: 50 } });
        const allContacts = (response.data.data || []).map(contact => ({
          id: contact.id,
          name: contact.company_name || contact.name || 'Nome não informado',
          company_name: contact.company_name || contact.name || 'Nome não informado',
          address: contact.address || `${contact.city || ''} ${contact.state || ''}`.trim() || 'Endereço não informado',
          city: contact.city || '',
          state: contact.state || '',
        // incluir coordenadas quando disponíveis (suporta diferentes chaves)
        lat: contact.lat ?? contact.latitude ?? null,
        lon: contact.lon ?? contact.longitude ?? null,
          type: contact.type || 'lead',
          contact: contact.contact_name || 'Contato não informado',
          email: contact.email || 'Email não informado',
          phone: contact.phone || contact.mobile || 'Telefone não informado'
        }));
        setClientSearchResults(allContacts);
        // NÃO mostra automaticamente - deixa o onFocus controlar
        return;
      }

      if (!hasCity && hasTerm && searchTerm.length < 2) {
        setClientSearchResults([]);
        return;
      }

      // Montar parâmetros com prioridade para cidade
      const params = { limit: 20 };
      if (hasCity) params.city = clientFilterCity;
      if (hasTerm) params.search = searchTerm;

      const response = await api.get('/customer-contacts', { params });

      const filteredContacts = (response.data.data || []).map(contact => ({
        id: contact.id,
        name: contact.company_name || contact.name || 'Nome não informado',
        company_name: contact.company_name || contact.name || 'Nome não informado',
        address: contact.address || `${contact.city || ''} ${contact.state || ''}`.trim() || 'Endereço não informado',
        city: contact.city || '',
        state: contact.state || '',
        lat: contact.lat ?? contact.latitude ?? null,
        lon: contact.lon ?? contact.longitude ?? null,
        type: contact.type || 'lead',
        contact: contact.contact_name || 'Contato não informado',
        email: contact.email || 'Email não informado',
        phone: contact.phone || contact.mobile || 'Telefone não informado'
      }));

      setClientSearchResults(filteredContacts);
      setShowClientSearch(true);
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      setClientSearchResults([]);
      setShowClientSearch(false);
    }
  };

  // Selecionar cliente
  const selectClient = async (client) => {
    // Validar se o cliente tem os dados necessários
    if (!client || !client.id) {
      console.error('Cliente inválido recebido:', client);
      return;
    }
    
    const clientData = {
      client_id: client.id,
      client_name: client.company_name || client.name || 'Nome não informado',
      client_address: client.address || `${client.city || ''} ${client.state || ''}`.trim() || 'Endereço não informado'
    };
    
    setNewCommitment(prev => ({
      ...prev,
      ...clientData
    }));
    
    // Calcular distância automaticamente
    try {
      console.log('📍 Calculando distância para:', client);
      // Garantir destino válido: usar lat/lon se existirem; caso contrário, enviar endereço/cidade/estado direto ao backend
      const cleanAddress = (client.address || '').trim();
      const hasAddr = cleanAddress && cleanAddress.toLowerCase() !== 'endereço não informado';
      const destinationPayload = (client.lat && client.lon)
        ? { lat: client.lat, lon: client.lon }
        : (hasAddr ? { address: cleanAddress, city: client.city, state: client.state } : null);

      if (!destinationPayload) {
        console.warn('⚠️ Sem dados suficientes para calcular distância (destino ausente).');
        return;
      }

      let response = await api.post('/geolocation/calculate-distance', {
        destination: destinationPayload
      });
      if (!response.data?.success && response.status === 404) {
        // Fallback para alias v1
        response = await api.post('/v1/geolocation/calculate-distance', {
          destination: destinationPayload
        });
      }
      
      if (response.data.success) {
        console.log('✅ Distância calculada:', response.data);
        setNewCommitment(prev => ({
          ...prev,
          planned_distance: response.data.distance,
          planned_fuel: response.data.fuelConsumption,
          planned_cost: response.data.travelCost,
          estimated_duration: response.data.travelTime
        }));
      }
    } catch (error) {
      const details = error.response?.data?.details || error.response?.data?.error || error.message;
      console.warn('⚠️ Não foi possível calcular distância:', details);
      if (String(details).includes('Endereço da sede não configurado')) {
        setSnackbar({ open: true, message: 'Configure o endereço da empresa em Configurações > Empresa para calcular distâncias.', severity: 'warning' });
      }
      // Não bloqueia o processo se o cálculo falhar
    }
    
    // Atualizar o termo de busca
    const searchTerm = client.company_name || client.name || '';
    setClientSearchTerm(searchTerm);
    
    // Fechar a lista de busca
    setShowClientSearch(false);
    setClientSearchResults([]);
  };

  // Verificar conflito de horário
  const checkTimeConflict = (date, time) => {
    if (!date || !time) return null;
    
    const targetDate = new Date(date);
    const targetDateString = targetDate.toISOString().split('T')[0];
    
    return visits.find(visit => {
      const visitDate = new Date(visit.scheduled_date);
      const visitDateString = visitDate.toISOString().split('T')[0];
      
      return visitDateString === targetDateString && 
             visit.scheduled_time === time &&
             ['agendada', 'em_andamento', 'planejada'].includes(visit.status);
    });
  };

  // Função para enviar convites aos usuários selecionados para planejamento
  const sendInvitesToUsersForPlanning = async (planningId, planningItem) => {
    try {
      const invitePromises = selectedUsersForInvite.map(userId => 
        api.post('/planning-collaboration/invite', {
          planning_id: planningId,
          invited_user_id: userId,
          message: `Você foi convidado para o compromisso: ${planningItem.client_name} em ${new Date(planningItem.planned_date).toLocaleDateString('pt-BR')} às ${planningItem.planned_time}`
        })
      );
      
      await Promise.all(invitePromises);
      console.log(`✅ Convites enviados para ${selectedUsersForInvite.length} usuários para o planejamento ${planningId}`);
      
    } catch (error) {
      console.error('Erro ao enviar convites para planejamento:', error);
      // Não mostra erro para o usuário pois o compromisso foi criado com sucesso
    }
  };

  // Criar compromisso
  const createCommitment = async () => {
    try {
      console.log('🔍 createCommitment iniciado com dados:', newCommitment);
      
      if (!newCommitment.planned_date || !newCommitment.planned_time || !newCommitment.client_id || !newCommitment.client_name) {
        console.log('❌ Validação falhou - campos obrigatórios não preenchidos');
        setError('Preencha todos os campos obrigatórios (data, horário e cliente)');
        return;
      }

      // Verificar se a data é válida (não retroativa)
      if (!isDateValid(newCommitment.planned_date)) {
        console.log('❌ Data inválida (retroativa)');
        setError('Não é possível agendar compromissos para datas passadas');
        return;
      }

      // Verificar conflito de horário
      const conflictingVisit = checkTimeConflict(newCommitment.planned_date, newCommitment.planned_time);
      if (conflictingVisit) {
        const conflictDate = new Date(conflictingVisit.scheduled_date).toLocaleDateString('pt-BR');
        console.log('❌ Conflito de horário detectado:', conflictingVisit);
        setError(`Já existe um compromisso agendado para ${conflictDate} às ${conflictingVisit.scheduled_time}. Escolha outro horário.`);
        return;
      }

      console.log('✅ Validação passou, criando/usando planejamento...');
      
      // Criar ou usar planejamento existente
      const planning = await createPlanningFromDate(newCommitment.planned_date, newCommitment.visit_type);
      console.log('✅ Planejamento obtido:', planning);

      // Adicionar item ao planejamento
      const itemData = {
        planning_id: planning.id,
        planned_date: newCommitment.planned_date,
        planned_time: newCommitment.planned_time, // Já está em formato HH:MM
        client_id: newCommitment.client_id,
        client_name: newCommitment.client_name,
        client_address: newCommitment.client_address,
        visit_type: newCommitment.visit_type,
        priority: newCommitment.priority,
        notes: newCommitment.notes,
        status: 'agendada'
      };
      
      console.log('📅 Dados do compromisso a ser criado:', {
        ...itemData,
        planned_date_type: typeof itemData.planned_date,
        planned_date_value: itemData.planned_date,
        planned_date_iso: itemData.planned_date ? itemData.planned_date.toISOString() : null
      });
      
      console.log('🔍 Dados do item a ser criado:', itemData);

      // Adicionar item via API
      console.log('🔍 Chamando API para adicionar item...');
      const itemResponse = await api.post(`/visit-planning/${planning.id}/items`, itemData);
      console.log('✅ Item adicionado com sucesso:', itemResponse.data);
      
      // Atualizar lista de visitas
      console.log('🔍 Atualizando lista de visitas...');
      fetchVisits();
      
      // Fechar diálogo e resetar formulário
      setShowCreateDialog(false);
      setNewCommitment({
        planned_date: null,
        planned_time: '09:00',
        client_id: '',
        client_name: '',
        client_address: '',
        visit_type: 'comercial',
        priority: 'media',
        notes: ''
      });
      setClientSearchTerm('');
      setClientSearchResults([]);
      setSelectedUsersForInvite([]);
      
      // Enviar convites para usuários selecionados
      if (selectedUsersForInvite.length > 0 && planning.id) {
        await sendInvitesToUsersForPlanning(planning.id, itemResponse.data);
      }
      
      // Mostrar mensagem de sucesso via snackbar
      setError('');
      setSnackbar({
        open: true,
        message: 'Compromisso criado com sucesso!',
        severity: 'success'
      });
      console.log('✅ Compromisso criado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao criar compromisso:', error);
      console.error('❌ Detalhes do erro:', error.response?.data);
      
      let errorMessage = 'Erro ao criar compromisso: ';
      
      if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else if (error.response?.data?.details) {
        errorMessage += error.response.data.details;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Erro desconhecido';
      }
      
      setError(errorMessage);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  const fetchVisits = async () => {
    try {
      console.log('📅 VisitsCalendar fetchVisits iniciado, user:', user);
      
      // VERIFICAÇÃO DE SEGURANÇA: Verificar se user existe
      if (!user || !user.id) {
        console.log('⚠️ Usuário não disponível, pulando fetchVisits');
        setVisits([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      params.append('responsible_id', user.id);
      
      console.log('📅 Parâmetros da requisição calendar:', params.toString());
      
      // Buscar visitas em aberto para o calendário
      const response = await api.get(`/visit-planning/calendar?${params.toString()}`);
      console.log('📅 Resposta da API calendar:', response.data);
      console.log('📅 Visitas em aberto encontradas:', response.data.visits?.length || 0);
      
      if (response.data.visits && response.data.visits.length > 0) {
        console.log('✅ Visitas detalhadas:', response.data.visits.map(v => ({
          id: v.id,
          title: v.title,
          date: v.scheduled_date,
          time: v.scheduled_time,
          type: v.type,
          status: v.status
        })));
      } else {
        console.log('⚠️ Nenhuma visita encontrada no calendário');
      }
      
      setVisits(response.data.visits || []);
    } catch (error) {
      console.error('❌ Erro ao buscar visitas em aberto:', error);
      console.error('❌ Detalhes do erro:', error.response?.data);
      setError('Erro ao carregar visitas em aberto: ' + error.message);
      setVisits([]); // Garantir que visits seja um array vazio em caso de erro
    } finally {
      setLoading(false);
    }
  };

  // Função para excluir visita do calendário
  const handleDeleteVisit = (visit, event) => {
    event.stopPropagation(); // Evitar que o clique propague para o dia
    setVisitToDelete(visit);
    setDeletionReason('');
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletionReason.trim()) {
      setError('É obrigatório fornecer uma justificativa');
      return;
    }

    if (deletionReason.trim().length < 10) {
      setError('A justificativa deve ter pelo menos 10 caracteres');
      return;
    }

    try {
      await api.delete(`/visits/${visitToDelete.id}`, {
        data: { deletion_reason: deletionReason.trim() }
      });
      
      // Notificar o contexto de sincronização
      notifyVisitDeleted(visitToDelete.id);
      
      // Atualizar lista local
      setVisits(prevVisits => prevVisits.filter(v => v.id !== visitToDelete.id));
      
      setDeleteDialogOpen(false);
      setVisitToDelete(null);
      setDeletionReason('');
      setError('');
      
      console.log('✅ Visita excluída com sucesso:', visitToDelete.id);
    } catch (error) {
      console.error('❌ Erro ao excluir visita:', error);
      setError(error.response?.data?.message || 'Erro ao excluir visita');
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setVisitToDelete(null);
    setDeletionReason('');
  };

  useEffect(() => {
    console.log('📅 useEffect executado, currentDate:', currentDate, 'user:', user);
    if (user && user.id) {
      console.log('📅 Usuário disponível, chamando fetchVisits');
      fetchVisits();
    } else {
      console.log('📅 Usuário não disponível ainda');
    }
  }, [currentDate, user]); // Removido syncKey para evitar loops infinitos

  // Detectar tamanho da tela
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 600);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getDaysInMonth = (date) => {
    try {
      console.log('📅 getDaysInMonth chamado com date:', date);
      
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        console.error('📅 Data inválida fornecida para getDaysInMonth:', date);
        return [];
      }
      
      const year = date.getFullYear();
      const month = date.getMonth();
      
      // Usar datas locais e normalizar semana iniciando na segunda-feira
      const firstDay = new Date(year, month, 1);
      firstDay.setHours(0, 0, 0, 0);
      const lastDay = new Date(year, month + 1, 0);
      lastDay.setHours(0, 0, 0, 0);
      const daysInMonth = lastDay.getDate();
      // 0=Domingo..6=Sábado -> queremos 0=Segunda..6=Domingo
      const startingDay = (firstDay.getDay() + 6) % 7;
      
      console.log('📅 Parâmetros calculados:', { 
        year, 
        month, 
        daysInMonth, 
        startingDay,
        firstDay: firstDay.toLocaleDateString('pt-BR'),
        firstDayDay: firstDay.getDay(),
        firstDayName: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][firstDay.getDay()]
      });
      
      const days = [];
      
      // Dias do mês anterior para preencher a primeira semana (segunda a domingo)
      for (let i = 0; i < startingDay; i++) {
        const prevDate = new Date(year, month, 1 - (startingDay - i));
        prevDate.setHours(0, 0, 0, 0);
        days.push({ date: prevDate, isCurrentMonth: false, visits: [] });
      }
      
      // Dias do mês atual
      for (let i = 1; i <= daysInMonth; i++) {
        const currentDate = new Date(year, month, i);
        currentDate.setHours(0, 0, 0, 0);
        
        const dayVisits = (visits || []).filter(visit => {
          try {
            if (!visit || !visit.scheduled_date) return false;
            const visitDate = new Date(visit.scheduled_date);
            visitDate.setHours(0, 0, 0, 0);
            return visitDate.getTime() === currentDate.getTime();
          } catch (error) {
            console.error('Erro ao processar data da visita:', visit, error);
            return false;
          }
        });
        
        days.push({ 
          date: currentDate, 
          isCurrentMonth: true, 
          visits: dayVisits 
        });
        
        // Log para verificar a correção
        if (year === 2025 && month === 7 && (i === 1 || i === 25)) {
          console.log('✅ VERIFICAÇÃO CORREÇÃO:', {
            dia: i,
            data: currentDate.toLocaleDateString('pt-BR'),
            diaSemana: currentDate.getDay(),
            nomeDia: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][currentDate.getDay()]
          });
        }
      }
      
      // Dias do próximo mês para completar 6 semanas (42 células)
      const remainingDays = 42 - days.length;
      console.log('📅 Dias restantes para completar 6 semanas:', remainingDays);
      for (let i = 1; i <= remainingDays; i++) {
        const nextDate = new Date(year, month + 1, i);
        nextDate.setHours(0, 0, 0, 0);
        days.push({ date: nextDate, isCurrentMonth: false, visits: [] });
      }
      
      // Garantir que sempre temos 42 dias (6 semanas)
      if (days.length !== 42) {
        console.warn('📅 Aviso: Calendário não tem 42 dias. Dias atuais:', days.length);
        // Completar até 42 dias se necessário
        while (days.length < 42) {
          const lastDate = days[days.length - 1].date;
          const nextDate = new Date(lastDate);
          nextDate.setDate(lastDate.getDate() + 1);
          days.push({ date: nextDate, isCurrentMonth: false, visits: [] });
        }
      }
      
      console.log('📅 Dias gerados com sucesso:', days.length);
      return days;
    } catch (error) {
      console.error('📅 Erro ao gerar dias do mês:', error);
      return [];
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    try {
      // Se for um objeto Date, extrair HH:MM
      if (timeString instanceof Date) {
        return timeString.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Se for string no formato HH:MM
      if (typeof timeString === 'string' && /^\d{2}:\d{2}$/.test(timeString)) {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return date.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Se for string no formato ISO ou outro formato de data
      if (typeof timeString === 'string') {
        const date = new Date(timeString);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
      
      return timeString;
    } catch (error) {
      console.warn('Erro ao formatar horário:', timeString, error);
      return timeString || '';
    }
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Função para abrir diálogo de criação
  const openCreateDialog = (date) => {
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    setSelectedDate(localDate);
    setNewCommitment(prev => ({
      ...prev,
      planned_date: localDate,
      planned_time: prev.planned_time || '09:00'
    }));
    
    // Carregar clientes automaticamente apenas se não houver resultados
    if (clientSearchResults.length === 0) {
      searchClients('');
    }
    
    setShowCreateDialog(true);
  };

  if (loading) {
    return (
      <Box>
        <LinearProgress sx={{ width: '100%', mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Carregando calendário...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  // Debug: verificar se há dados (mas NÃO retornar, apenas logar)
  // VERIFICAÇÃO DE SEGURANÇA: Garantir que visits seja sempre um array
  const safeVisits = visits || [];
  
  if (safeVisits.length === 0) {
    console.log('📅 Nenhuma visita encontrada, mas continuando para mostrar calendário vazio');
  }

  const days = getDaysInMonth(currentDate);
  
  console.log('📅 Componente renderizando:', { 
    loading, 
    error, 
    visitsCount: visits.length, 
    daysCount: days.length,
    currentDate: currentDate.toISOString(),
    days: days.slice(0, 3) // Mostrar apenas os primeiros 3 dias para debug
  });

  // Debug: verificar se há problemas na estrutura
  if (!days || days.length === 0) {
    console.error('📅 ERRO: days está vazio ou undefined');
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          📅 Erro no Calendário
        </Typography>
        <Typography variant="body2" color="error">
          Erro ao gerar dias do calendário. Verifique o console para mais detalhes.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Debug: currentDate = {currentDate?.toString()}, visits = {visits?.length || 0}
        </Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          📅 Calendário de Visitas em Aberto
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          form: VisitsCalendar
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Visualize suas visitas em aberto e pendentes no calendário mensal
        </Typography>
        
        {/* Mensagem informativa quando não há visitas */}
        {(!visits || visits.length === 0) && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>💡 Dica:</strong> Não há visitas agendadas ainda. 
              Clique em qualquer data futura (com ícone verde +) para criar um novo compromisso!
            </Typography>
          </Alert>
        )}
        
        {/* Controles de Navegação */}
        <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: { xs: 2, sm: 0 }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  textAlign: { xs: 'center', sm: 'left' },
                  fontSize: { xs: '1.25rem', sm: '1.5rem' }
                }}
              >
                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </Typography>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <IconButton 
                onClick={() => setCurrentDate(prev => {
                  const newDate = new Date(prev);
                  newDate.setMonth(prev.getMonth() - 1);
                  return newDate;
                })}
                size="small"
              >
                <NavigateBefore />
              </IconButton>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setCurrentDate(new Date())}
                startIcon={<Today />}
                sx={{ 
                  minWidth: { xs: 'auto', sm: '80px' },
                  px: { xs: 1, sm: 2 }
                }}
              >
                Hoje
              </Button>
              <IconButton 
                onClick={() => setCurrentDate(prev => {
                  const newDate = new Date(prev);
                  newDate.setMonth(prev.getMonth() + 1);
                  return newDate;
                })}
                size="small"
              >
                <NavigateNext />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>

        {/* Calendário Minimalista */}
        <Box sx={{ 
          width: '100%',
          maxWidth: '100%',
          bgcolor: 'white',
          borderRadius: 0,
          boxShadow: 'none',
          border: 'none'
        }}>
          {/* Cabeçalho do mês */}
          <Box sx={{ 
            mb: 2, 
            textAlign: 'left',
            pl: 1
          }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontSize: '1.5rem',
                fontWeight: 'normal',
                color: 'text.primary',
                mb: 1
              }}
            >
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </Typography>
          </Box>
          
          {/* Calendário Grid */}
          <Box sx={{ 
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 0,
            border: '1px solid',
            borderColor: 'grey.300',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            {/* Cabeçalho dos dias da semana */}
            {['Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado', 'Domingo'].map((day, index) => (
              <Box key={day} sx={{ 
                p: 1.5,
                textAlign: 'center',
                fontWeight: 'normal',
                color: 'text.primary',
                fontSize: '0.75rem',
                bgcolor: 'grey.50',
                borderRight: index < 6 ? '1px solid' : 'none',
                borderRightColor: 'grey.300',
                borderBottom: '1px solid',
                borderBottomColor: 'grey.300',
                minHeight: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {day}
              </Box>
            ))}
            
            {/* Dias do calendário */}
            {days.map((day, index) => (
              <Box key={index} sx={{ 
                p: 1.5,
                minHeight: '60px',
                borderRight: (index + 1) % 7 !== 0 ? '1px solid' : 'none',
                borderRightColor: 'grey.300',
                borderBottom: Math.floor(index / 7) < Math.floor(days.length / 7) - 1 ? '1px solid' : 'none',
                borderBottomColor: 'grey.300',
                bgcolor: day.isCurrentMonth ? 'white' : 'grey.50',
                cursor: day.isCurrentMonth ? 'pointer' : 'default',
                position: 'relative',
                '&:hover': day.isCurrentMonth ? {
                  bgcolor: 'grey.100'
                } : {},
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'flex-start'
              }}
              onClick={() => {
                if (day.isCurrentMonth && isDateValid(day.date)) {
                  openCreateDialog(day.date);
                }
              }}
            >
                  {/* Número do dia - Estilo minimalista */}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 'normal',
                      color: day.isCurrentMonth ? 'text.primary' : 'text.disabled',
                      fontSize: '0.875rem',
                      mb: 0.5
                    }}
                  >
                    {day.date.getDate()}
                  </Typography>

                  {/* Indicador simples de visitas - apenas número */}
                  {day.visits.length > 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'grey.400',
                        color: 'white',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 'normal'
                      }}
                    >
                      {day.visits.length}
                    </Box>
                  )}

                  {/* Indicador de vaga disponível - apenas para datas futuras */}
                  {day.isCurrentMonth && isDateValid(day.date) && day.visits.length === 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        backgroundColor: 'grey.300',
                        color: 'grey.600',
                        borderRadius: '50%',
                        width: 16,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.625rem'
                      }}
                      title="Clique para adicionar compromisso"
                    >
                      +
                    </Box>
                  )}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Legenda */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Legenda
          </Typography>
          <Grid container spacing={{ xs: 1, sm: 2 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                Tipos de Visita:
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                gap: { xs: 0.5, sm: 1 }, 
                flexWrap: 'wrap',
                justifyContent: { xs: 'center', md: 'flex-start' }
              }}>
                <Chip 
                  icon={<DirectionsCar />} 
                  label="Comercial" 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  sx={{ fontSize: { xs: '0.625rem', sm: '0.75rem' } }}
                />
                <Chip 
                  icon={<Assignment />} 
                  label="Técnica" 
                  size="small" 
                  color="warning" 
                  variant="outlined"
                  sx={{ fontSize: { xs: '0.625rem', sm: '0.75rem' } }}
                />
                <Chip 
                  icon={<Build />} 
                  label="Instalação" 
                  size="small" 
                  color="success" 
                  variant="outlined"
                  sx={{ fontSize: { xs: '0.625rem', sm: '0.75rem' } }}
                />
                <Chip 
                  icon={<Engineering />} 
                  label="Manutenção" 
                  size="small" 
                  color="error" 
                  variant="outlined"
                  sx={{ fontSize: { xs: '0.625rem', sm: '0.75rem' } }}
                />
                <Chip 
                  icon={<Assignment />} 
                  label="Suporte" 
                  size="small" 
                  color="info" 
                  variant="outlined"
                  sx={{ fontSize: { xs: '0.625rem', sm: '0.75rem' } }}
                />
                <Chip 
                  icon={<Assignment />} 
                  label="Treinamento" 
                  size="small" 
                  color="default" 
                  variant="outlined"
                  sx={{ fontSize: { xs: '0.625rem', sm: '0.75rem' } }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                Informações:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                • Passe o mouse sobre as visitas para ver detalhes
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                • O número no canto superior direito indica o total de visitas em aberto do dia
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                • Apenas visitas pendentes e em andamento são exibidas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                • Use as setas para navegar entre os meses
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                • Clique em datas futuras para criar compromissos
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                • Ícone verde (+) indica vagas disponíveis
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
        </Card>

        {/* Dialog de Criação de Compromisso */}
        <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Add />
              Novo Compromisso
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              form: VisitsCalendar / NovoCompromisso
            </Typography>
          </DialogTitle>
          <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Data e Horário na mesma linha */}
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Data"
                value={newCommitment.planned_date}
                onChange={(date) => setNewCommitment({ ...newCommitment, planned_date: date })}
                shouldDisableDate={(date) => !isDateValid(date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText: "Data selecionada automaticamente",
                    disabled: true
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Horário"
                type="time"
                value={newCommitment.planned_time || '09:00'}
                onChange={(e) => setNewCommitment({ ...newCommitment, planned_time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            {/* Tipo de Visita e Prioridade na mesma linha */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Visita</InputLabel>
                <Select
                  value={newCommitment.visit_type}
                  onChange={(e) => setNewCommitment({ ...newCommitment, visit_type: e.target.value })}
                  label="Tipo de Visita"
                >
                  <MenuItem value="comercial">Comercial</MenuItem>
                  <MenuItem value="tecnica">Técnica</MenuItem>
                  <MenuItem value="implantacao">Implantação</MenuItem>
                  <MenuItem value="instalacao">Instalação</MenuItem>
                  <MenuItem value="manutencao">Manutenção</MenuItem>
                  <MenuItem value="suporte">Suporte</MenuItem>
                  <MenuItem value="treinamento">Treinamento</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  value={newCommitment.priority}
                  onChange={(e) => setNewCommitment({ ...newCommitment, priority: e.target.value })}
                  label="Prioridade"
                >
                  <MenuItem value="baixa">Baixa</MenuItem>
                  <MenuItem value="media">Média</MenuItem>
                  <MenuItem value="alta">Alta</MenuItem>
                  <MenuItem value="critica">Crítica</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Campo Buscar Cliente/Lead em largura total */}
            {/* Filtro por Cidade (opcional) */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cidade (opcional)"
                placeholder="Ex: Fortaleza"
                value={clientFilterCity}
                onChange={(e) => setClientFilterCity(e.target.value)}
              />
            </Grid>

            {/* Campo Buscar Cliente/Lead em largura total */}
            <Grid item xs={12} md={12}>
              <TextField
                fullWidth
                label="Buscar Cliente/Lead"
                value={clientSearchTerm}
                onChange={(e) => {
                  setClientSearchTerm(e.target.value);
                  // Apenas atualiza o termo, NÃO mostra a lista
                  setShowClientSearch(false);
                }}
                onClick={() => {
                  // Mostra a lista ao clicar no campo
                  setShowClientSearch(true);
                  if (!clientSearchTerm || clientSearchTerm.length === 0) {
                    searchClients('');
                  } else {
                    searchClients(clientSearchTerm);
                  }
                }}
                onBlur={() => {
                  // Esconde a lista ao perder foco (após um pequeno delay para permitir cliques)
                  setTimeout(() => setShowClientSearch(false), 200);
                }}
                onKeyDown={(e) => {
                  // Busca ao pressionar Enter
                  if (e.key === 'Enter') {
                    searchClients(clientSearchTerm);
                    setShowClientSearch(true);
                  }
                  // Esconde ao pressionar Escape
                  if (e.key === 'Escape') {
                    setShowClientSearch(false);
                  }
                }}
                placeholder="Filtre pela Cidade e/ou digite o Nome. Pressione Enter para buscar."
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => {
                      searchClients(clientSearchTerm);
                      setShowClientSearch(true);
                    }}>
                      <Search />
                    </IconButton>
                  )
                }}
              />
              {showClientSearch && clientSearchResults.length > 0 && (
                <Paper 
                  onMouseDown={(e) => e.preventDefault()} 
                  sx={{ 
                    mt: 1, 
                    maxHeight: 200, 
                    overflow: 'auto', 
                  position: 'relative', 
                  width: '100%',
                  boxShadow: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'background.paper'
                }}>
                  <List dense>
                    {clientSearchResults.map((client) => (
                      <ListItem 
                        key={`${client.type}-${client.id}`} 
                        button 
                        onClick={() => {
                          selectClient(client);
                          setShowClientSearch(false);
                        }}
                        sx={{ cursor: 'pointer' }}
                      >
                        <ListItemIcon>
                          <Chip 
                            icon={client.type === 'client' ? <Business /> : <Business />}
                            label={client.type === 'client' ? 'Cliente' : 'Lead'}
                            size="small"
                            color={client.type === 'client' ? 'primary' : 'secondary'}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={client.name}
                          secondary={`${client.address} | ${client.contact} | ${client.email}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Grid>
            
            {/* Nome do Cliente/Lead com largura total (mesmo tamanho do Buscar) */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome do Cliente/Lead"
                value={newCommitment.client_name}
                disabled
                helperText="Preenchido automaticamente ao selecionar"
              />
            </Grid>
            
            {/* Endereço em largura total */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Endereço"
                value={newCommitment.client_address}
                disabled
                helperText="Preenchido automaticamente ao selecionar"
              />
            </Grid>
            
            {/* Informações de Distância (calculadas automaticamente) */}
            {newCommitment.planned_distance && (
              <>
                <Grid item xs={12}>
                  <Alert severity="info" icon={<Route />}>
                    <strong>Distância calculada da sede:</strong> {newCommitment.planned_distance} km
                    {newCommitment.estimated_duration && ` • Tempo estimado: ${newCommitment.estimated_duration} min`}
                    {newCommitment.planned_fuel && ` • Combustível: ${newCommitment.planned_fuel} L`}
                    {newCommitment.planned_cost && ` • Custo: R$ ${newCommitment.planned_cost.toFixed(2)}`}
                  </Alert>
                </Grid>
              </>
            )}
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                value={newCommitment.notes}
                onChange={(e) => setNewCommitment({ ...newCommitment, notes: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
            {/* Seleção de usuários para convite */}
            <Grid item xs={12}>
              <UserSelector
                selectedUsers={selectedUsersForInvite}
                onSelectionChange={setSelectedUsersForInvite}
                label="Convidar usuários para este compromisso"
                helperText="Usuários selecionados receberão convites automáticos na data do compromisso"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="body2" color="info.contrastText">
                  <strong>💡 Como funciona:</strong> Ao criar um compromisso, o sistema automaticamente:
                  <br />• Cria um planejamento semanal (segunda a sexta) para a semana da data selecionada
                  <br />• Ou usa um planejamento existente se já houver um para a mesma semana
                  <br />• O compromisso é adicionado ao planejamento correto
                  <br />• Usuários selecionados recebem convites automáticos
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
          <Button
            onClick={createCommitment}
            variant="contained"
            disabled={!newCommitment.planned_date || !newCommitment.planned_time || !newCommitment.client_id || !newCommitment.client_name}
          >
            Criar Compromisso
          </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Justificativa para Exclusão */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={cancelDelete}
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Delete color="error" />
              Confirmar Exclusão
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Esta ação não pode ser desfeita. A visita será excluída permanentemente.
            </Alert>
            
            {visitToDelete && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="textSecondary">Visita a ser excluída:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {visitToDelete.title}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {new Date(visitToDelete.scheduled_date).toLocaleDateString('pt-BR')} às {visitToDelete.scheduled_time}
                </Typography>
              </Box>
            )}
            
            <TextField
              label="Justificativa para exclusão *"
              placeholder="Ex: Reagendamento solicitado pelo cliente, cancelamento por motivos técnicos, etc."
              multiline
              rows={4}
              fullWidth
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              helperText={`${deletionReason.length}/200 caracteres (mínimo 10)`}
              inputProps={{ maxLength: 200 }}
              error={deletionReason.length > 0 && deletionReason.length < 10}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDelete}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmDelete}
              color="error"
              variant="contained"
              disabled={!deletionReason.trim() || deletionReason.trim().length < 10}
              startIcon={<Delete />}
            >
              Confirmar Exclusão
            </Button>
          </DialogActions>
        </Dialog>
        {/* Snackbar para mensagens de sucesso */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default VisitsCalendar;
