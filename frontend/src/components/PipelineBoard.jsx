import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  Snackbar
} from '@mui/material'
import {
  MoreVert,
  Add,
  TrendingUp,
  Person,
  AttachMoney,
  DragIndicator,
  ContentCopy,
  WhatsApp
} from '@mui/icons-material'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import {
  useSortable
} from '@dnd-kit/sortable'
import {
  useDroppable
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import api from '../services/api'
import UserSelector from './UserSelector'
import SmartCallScript from './SmartCallScript'
// Removido: abertura de formulários diretamente no pipeline (há menu por lead)

const SortableDealCard = ({ deal, onMove, onEdit, onApproach, onOpenSmartScript }) => {
  const [anchorEl, setAnchorEl] = useState(null)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getPriorityColor = (probability) => {
    if (probability >= 80) return 'success'
    if (probability >= 60) return 'warning'
    if (probability >= 40) return 'info'
    return 'default'
  }

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{ 
        mb: 2, 
        cursor: 'grab',
        transition: 'all 0.2s',
        border: '1px solid transparent',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
          border: '1px solid #2196f3'
        },
        '&:active': {
          cursor: 'grabbing'
        }
      }}
      onClick={(e) => {
        // Não abrir edição se estiver arrastando
        if (!isDragging) {
          onEdit(deal)
        }
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <DragIndicator 
              fontSize="small" 
              sx={{ 
                mr: 1, 
                color: 'text.secondary',
                cursor: 'grab'
              }} 
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', flex: 1 }}>
              {deal.contact?.company_name || deal.title}
            </Typography>
          </Box>
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation()
              handleMenuOpen(e)
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Person fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {deal.lead?.contact_name || 'Contato não definido'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <AttachMoney fontSize="small" sx={{ mr: 0.5, color: 'success.main' }} />
          <Typography variant="body2" fontWeight="medium">
            {formatCurrency(deal.value)}
          </Typography>
        </Box>

        {deal.lead?.segment && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Chip 
              label={deal.lead.segment} 
              size="small" 
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Chip 
            label={`${deal.probability}%`}
            size="small"
            color={getPriorityColor(deal.probability)}
            variant="outlined"
          />
          
          {deal.responsible && (
            <Avatar 
              sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
              src={deal.responsible.avatar}
            >
              {deal.responsible.name?.charAt(0)}
            </Avatar>
          )}
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem onClick={() => { onMove(deal, 'next'); handleMenuClose() }}>
            Mover para próximo estágio
          </MenuItem>
          <MenuItem onClick={() => { onEdit(deal); handleMenuClose() }}>
            Editar negócio
          </MenuItem>
          <MenuItem onClick={() => { onApproach(deal); handleMenuClose() }}>
            Abordagem sugerida
          </MenuItem>
          <MenuItem onClick={() => { onOpenSmartScript?.(deal); handleMenuClose() }}>
            Script SMART (ligação)
          </MenuItem>
          
          <MenuItem onClick={() => { onMove(deal, 'won'); handleMenuClose() }}>
            Marcar como ganho
          </MenuItem>
          <MenuItem onClick={() => { onMove(deal, 'lost'); handleMenuClose() }}>
            Marcar como perdido
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  )
}

const StageColumn = ({ stage, deals, onAddDeal, onMoveDeal, onEditDeal, onApproachDeal, onOpenSmartScript, totalPipelineValue, allDeals, pipeline }) => {
  const totalValue = deals.reduce((sum, deal) => {
    const value = parseFloat(deal.value || 0)
    return value > 0 ? sum + value : sum
  }, 0)
  
  // Calcular percentual do pipeline baseado na distribuição real de leads
  const calculatePipelinePercentage = () => {
    // Se não há leads no estágio, retorna 0
    if (deals.length === 0) return 0
    
    // Calcular total de leads em todo o pipeline
    const totalLeadsInPipeline = allDeals.length
    
    // Se não há leads no pipeline, retorna 0
    if (totalLeadsInPipeline === 0) return 0
    
    // Calcular percentual baseado na quantidade de leads neste status
    const percentage = (deals.length / totalLeadsInPipeline) * 100
    return percentage.toFixed(1)
  }
  
  // Calcular percentual de probabilidade média do estágio
  const calculateAverageProbability = () => {
    if (deals.length === 0) return stage.probability
    const totalProbability = deals.reduce((sum, deal) => sum + (deal.probability || 0), 0)
    return (totalProbability / deals.length).toFixed(0)
  }
  
  const pipelinePercentage = calculatePipelinePercentage()
  const averageProbability = calculateAverageProbability()
  
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })
  
  return (
    <Box 
      ref={setNodeRef}
      sx={{ 
        height: {
          xs: 500,    // Mobile
          sm: 550,    // Tablet
          md: 600,    // Desktop
          lg: 650,    // Desktop grande
          xl: 700     // Tela grande
        },
        backgroundColor: isOver ? '#e3f2fd' : '#f8f9fa', 
        borderRadius: {
          xs: 1,
          sm: 1.5,
          md: 2,
          lg: 2.5,
          xl: 3
        }, 
        p: {
          xs: 1.5,
          sm: 1.75,
          md: 2,
          lg: 2.25,
          xl: 2.5
        },
        border: isOver ? '2px dashed #2196f3' : 'none',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {stage.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {deals.length === 0 ? 'Nenhum negócio' : `${deals.length} ${deals.length === 1 ? 'negócio' : 'negócios'}`} • R$ {totalValue.toLocaleString()}
          </Typography>
          {deals.length > 0 && (
            <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5 }}>
              {pipelinePercentage}% dos leads • {deals.length} {deals.length === 1 ? 'lead' : 'leads'}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Chip 
            label={`${pipelinePercentage}%`} 
            size="small" 
            sx={{ 
              backgroundColor: stage.color + '20',
              color: stage.color,
              mr: 1
            }}
          />
          <IconButton 
            size="small" 
            onClick={() => onAddDeal(stage.id)}
            sx={{ 
              backgroundColor: 'background.paper',
              '&:hover': { backgroundColor: 'primary.light', color: 'white' }
            }}
          >
            <Add fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <SortableContext items={deals.map(deal => deal.id)} strategy={verticalListSortingStrategy}>
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          overflowY: 'auto'
        }}>
          {deals.map((deal) => (
            <SortableDealCard
              key={deal.id}
              deal={deal}
              onMove={onMoveDeal}
              onEdit={onEditDeal}
              onApproach={onApproachDeal}
              onOpenSmartScript={onOpenSmartScript}
            />
          ))}
          
          {deals.length === 0 && (
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: 4, 
                color: isOver ? 'primary.main' : 'text.secondary',
                border: isOver ? '2px dashed #2196f3' : '2px dashed #e0e0e0',
                borderRadius: 2,
                backgroundColor: isOver ? '#e3f2fd' : 'transparent',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Typography variant="body2">
                {isOver ? 'Solte aqui para mover o lead' : 'Nenhum negócio neste estágio'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Arraste leads para esta coluna
              </Typography>
              <Button 
                startIcon={<Add />} 
                size="small" 
                sx={{ mt: 1 }}
                onClick={() => onAddDeal(stage.id)}
              >
                Adicionar negócio
              </Button>
            </Box>
          )}
        </Box>
      </SortableContext>
    </Box>
  )
}

const PipelineBoard = () => {
  // Pipeline padrão baseado nos status dos leads e clientes
  const defaultPipeline = {
    id: '1',
    name: 'Pipeline de Vendas - Clean & Health',
    stages: [
      // Estágios de leads
      { id: 'novo', name: 'Novo Lead', probability: 5, color: '#f44336' },
      { id: 'contatado', name: 'Contatado', probability: 15, color: '#ff9800' },
      { id: 'qualificado', name: 'Qualificado', probability: 30, color: '#2196f3' },
      { id: 'agendado', name: 'Visita Agendada', probability: 50, color: '#9c27b0' },
      { id: 'visitado', name: 'Visita Realizada', probability: 70, color: '#607d8b' },
      { id: 'proposta_enviada', name: 'Proposta Enviada', probability: 85, color: '#4caf50' },
      { id: 'negociacao', name: 'Em Negociação', probability: 90, color: '#4caf50' },
      { id: 'convertido', name: 'Convertido', probability: 100, color: '#4caf50' },
      
      // Estágios de clientes
      { id: 'ativo', name: 'Cliente Ativo', probability: 95, color: '#8bc34a' },
      { id: 'cliente_recorrente', name: 'Cliente Recorrente', probability: 95, color: '#8bc34a' },
      { id: 'cliente_vip', name: 'Cliente VIP', probability: 100, color: '#4caf50' },
      { id: 'prospecto', name: 'Prospecto', probability: 40, color: '#2196f3' },
      
      // Estágios finais
      { id: 'perdido', name: 'Perdido', probability: 0, color: '#9e9e9e' },
      { id: 'inativo', name: 'Inativo', probability: 0, color: '#9e9e9e' },
      { id: 'inadimplente', name: 'Inadimplente', probability: 10, color: '#ff9800' }
    ]
  }

  const [deals, setDeals] = useState([])
  const [pipeline, setPipeline] = useState(defaultPipeline)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [selectedStageId, setSelectedStageId] = useState(null)
  const [approachDialogOpen, setApproachDialogOpen] = useState(false)
  const [approachDeal, setApproachDeal] = useState(null)
  const [approachTab, setApproachTab] = useState(0) // 0: Email, 1: WhatsApp, 2: Ligação
  const [approachChannel, setApproachChannel] = useState('email')
  const [approachSubject, setApproachSubject] = useState('')
  const [approachContent, setApproachContent] = useState('')
  const [approachOutcome, setApproachOutcome] = useState('')
  const [approachNextContactAt, setApproachNextContactAt] = useState('')
  const [approachSubmitting, setApproachSubmitting] = useState(false)
  const [approachError, setApproachError] = useState('')
  const [callObjective, setCallObjective] = useState('')
  const [smartScriptDeal, setSmartScriptDeal] = useState(null)
  const [smartScriptOpen, setSmartScriptOpen] = useState(false)
  
  // Estados para o formulário de visitas
  const [visitDialogOpen, setVisitDialogOpen] = useState(false)
  const [visitFormData, setVisitFormData] = useState({
    title: '',
    type: 'comercial',
    lead_id: null,
    client_id: null,
    scheduled_date: '',
    scheduled_time: '',
    address: '',
    responsible_id: null,
    notes: '',
    status: 'agendada'
  })
  const [visitLead, setVisitLead] = useState(null)
  const [selectedUsersForVisit, setSelectedUsersForVisit] = useState([])
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [callDecisionMaker, setCallDecisionMaker] = useState('')
  const [callNeedConfirmed, setCallNeedConfirmed] = useState(false)
  const [callBudgetRange, setCallBudgetRange] = useState('')
  const [callTimeline, setCallTimeline] = useState('')
  const [callObjections, setCallObjections] = useState('')
  const [callNextStep, setCallNextStep] = useState('')
  const [callDuration, setCallDuration] = useState('')
  // Removido: estados de abertura de formulários/scripts no pipeline
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Buscar leads e clientes da API unificada
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Buscar todos os contatos (leads e clientes)
        const response = await api.get('/customer-contacts')
        const allContacts = response.data.data || []
        
        // Filtrar apenas leads e clientes com status de vendas
        const salesContacts = allContacts.filter(contact => {
          // Incluir leads com status de vendas
          if (contact.type === 'lead' && contact.status !== 'convertido' && contact.status !== 'perdido') {
            return true
          }
          // Incluir clientes com status de recorrência
          if (contact.type === 'client' && contact.status === 'cliente_recorrente') {
            return true
          }
          return false
        })
        
        // Converter para formato de deals
        const dealsFromContacts = salesContacts.map(contact => ({
          id: contact.id,
          title: `${contact.company_name} - ${contact.segment}`,
          value: contact.estimated_revenue || contact.monthly_revenue || 0,
          probability: getProbabilityByStatus(contact.status),
          stage_id: contact.status,
          client_name: contact.company_name,
          lead_name: contact.contact_name,
          responsible: contact.responsible,
          contact: contact, // Manter dados originais do contato
          type: contact.type // Tipo: 'lead' ou 'client'
        }))
        
        setDeals(dealsFromContacts)
        console.log(`✅ Pipeline carregado com ${dealsFromContacts.length} contatos de vendas`)
      } catch (error) {
        console.error('Erro ao buscar dados do pipeline:', error)
        setError('Erro ao carregar pipeline de vendas')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getProbabilityByStatus = (status) => {
    // Mapear status da tabela unificada para probabilidades
    const statusProbabilityMap = {
      // Status de leads
      'novo': 5,
      'contatado': 15,
      'qualificado': 30,
      'agendado': 50,
      'visitado': 70,
      'proposta_enviada': 85,
      'negociacao': 90,
      'convertido': 100,
      'perdido': 0,
      'inativo': 0,
      
      // Status de clientes
      'ativo': 95,
      'cliente_recorrente': 95,
      'cliente_vip': 100,
      'prospecto': 40,
      'inadimplente': 10
    }
    
    return statusProbabilityMap[status] || 5
  }

  // Função otimizada para lidar com o fim do arrasto
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    // Verifica se há um destino válido e se é diferente da origem
    if (!over || active.id === over.id) {
      return;
    }
  
    // Encontra o deal que está sendo arrastado
    const draggedDeal = deals.find(deal => deal.id === active.id);
    if (!draggedDeal) {
      return;
    }
  
    // Verifica se o destino é um estágio válido
    const isValidStage = pipeline.stages.some(stage => stage.id === over.id);
    if (!isValidStage) {
      return;
    }
  
    // Atualiza o estado local imediatamente para feedback visual rápido
    setDeals(prevDeals => {
      return prevDeals.map(deal => {
        if (deal.id === draggedDeal.id) {
          return { ...deal, stage_id: over.id };
        }
        return deal;
      });
    });
  
    // Envia a atualização para o servidor
    updateDealStage(draggedDeal.id, over.id);
  };

const handleAddDeal = (stageId) => {
  setSelectedStageId(stageId)
  setSelectedDeal(null)
  setDialogOpen(true)
}

const handleEditDeal = (deal) => {
  setSelectedDeal(deal)
  setSelectedStageId(deal.stage_id)
  setDialogOpen(true)
}

const handleApproachDeal = (deal) => {
  setSelectedDeal(deal)
  setApproachDialogOpen(true)
}

const openSmartScript = (deal) => {
  setSmartScriptDeal(deal)
  setSmartScriptOpen(true)
}

const handleMoveDeal = async (deal, action) => {
  try {
    if (action === 'next') {
      const currentStageIndex = pipeline.stages.findIndex(s => s.id === deal.stage_id)
      if (currentStageIndex < pipeline.stages.length - 1) {
        const nextStage = pipeline.stages[currentStageIndex + 1]
        
        // Atualizar status do lead na API
        await api.patch(`/leads/${deal.id}/status`, {
          status: nextStage.id
        })
        
        // Atualizar estado local
        const updated = deals.map(d => 
          d.id === deal.id 
            ? { ...d, stage_id: nextStage.id, probability: nextStage.probability }
            : d
        )
        setDeals(updated)
      }
    } else if (action === 'won') {
      // Marcar como ganho
      await api.patch(`/leads/${deal.id}/status`, {
        status: 'ganho'
      })
      
      // Atualizar estado local (não remover, apenas mudar status)
      const updated = deals.map(d => 
        d.id === deal.id 
          ? { ...d, stage_id: 'ganho', probability: 100 }
          : d
      )
      setDeals(updated)
    } else if (action === 'lost') {
      // Marcar como perdido
      await api.patch(`/leads/${deal.id}/status`, {
        status: 'perdido'
      })
      
      // Atualizar estado local (não remover, apenas mudar status)
      const updated = deals.map(d => 
        d.id === deal.id 
          ? { ...d, stage_id: 'perdido', probability: 0 }
          : d
      )
      setDeals(updated)
    }
  } catch (error) {
    console.error('Erro ao mover deal:', error)
    setError('Erro ao atualizar status do lead')
  }
}

const renderDealCards = useCallback((deals) => {
  return deals.map(deal => (
    <SortableDealCard
      key={deal.id}
      deal={deal}
      onMove={handleMoveDeal}
      onEdit={handleEditDeal}
      onApproach={handleApproachDeal}
      onOpenSmartScript={openSmartScript}
    />
  ))
}, [handleMoveDeal, handleEditDeal, handleApproachDeal, openSmartScript])

  // Funções duplicadas removidas

  // Adicionar a função handleDealAction que estava faltando
  const handleDealAction = (deal, action) => {
    switch (action) {
      case 'edit':
        handleEditDeal(deal)
        break
      case 'approach':
        handleApproachDeal(deal)
        break
      case 'move':
        handleMoveDeal(deal, 'next')
        break
      case 'won':
        handleMoveDeal(deal, 'won')
        break
      case 'lost':
        handleMoveDeal(deal, 'lost')
        break
      default:
        console.warn('Ação não reconhecida:', action)
    }
  }

  const getDealsByStage = (stageId) => {
    return deals.filter(deal => deal.stage_id === stageId)
  }

  // Funções para o formulário de visitas
  const openVisitForm = (deal) => {
    const contact = deal.contact || deal
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    setVisitFormData({
      title: `Visita Comercial - ${contact.company_name}`,
      type: 'comercial',
      lead_id: contact.type === 'lead' ? contact.id : null,
      client_id: contact.type === 'client' ? contact.id : null,
      scheduled_date: tomorrow.toISOString().split('T')[0],
      scheduled_time: '14:00',
      address: contact.address || `${contact.city || ''}, ${contact.state || ''}`.trim(),
      responsible_id: contact.responsible_id || null,
      notes: `Visita agendada para ${contact.type === 'lead' ? 'o lead' : 'o cliente'}: ${contact.company_name}\nContato: ${contact.contact_name}\nTelefone: ${contact.phone || 'N/A'}\nEmail: ${contact.email || 'N/A'}`,
      status: 'agendada'
    })
    setVisitLead(deal)
    setVisitDialogOpen(true)
  }

  const handleVisitDialogClose = () => {
    setVisitDialogOpen(false)
    setVisitLead(null)
    setSelectedUsersForVisit([])
    setVisitFormData({
      title: '',
      type: 'comercial',
      lead_id: null,
      client_id: null,
      scheduled_date: '',
      scheduled_time: '',
      address: '',
      responsible_id: null,
      notes: '',
      status: 'agendada'
    })
  }

  const handleVisitSubmit = async () => {
    try {
      const visitResponse = await api.post('/visits', visitFormData)
      
      // Enviar convites para usuários selecionados
      if (selectedUsersForVisit.length > 0 && visitResponse.data) {
        await sendVisitInvitesToUsers(visitResponse.data)
      }
      
      setSnackbar({
        open: true,
        message: 'Visita agendada com sucesso!',
        severity: 'success'
      })
      handleVisitDialogClose()
    } catch (error) {
      console.error('Erro ao agendar visita:', error)
      setSnackbar({
        open: true,
        message: 'Erro ao agendar visita',
        severity: 'error'
      })
    }
  }

  // Função para enviar convites de visita aos usuários selecionados
  const sendVisitInvitesToUsers = async (visit) => {
    try {
      const invitePromises = selectedUsersForVisit.map(userId => 
        api.post('/planning-collaboration/invite', {
          visit_id: visit.id,
          invited_user_id: userId,
          message: `Você foi convidado para a visita: ${visit.title} em ${new Date(visit.scheduled_date).toLocaleDateString('pt-BR')}`
        })
      )
      
      await Promise.all(invitePromises)
      console.log(`✅ Convites de visita enviados para ${selectedUsersForVisit.length} usuários`)
      
    } catch (error) {
      console.error('Erro ao enviar convites de visita:', error)
      // Não mostra erro para o usuário pois a visita foi criada com sucesso
    }
  }

  // Helpers para geração dos scripts de abordagem
  const formatTimeOption = (daysToAdd) => {
    const date = new Date()
    date.setDate(date.getDate() + daysToAdd)
    const hours = date.getHours()
    const hourOption = hours < 17 ? '15:00' : '09:00'
    return `${date.toLocaleDateString('pt-BR')} às ${hourOption}`
  }

  const buildTemplates = (deal) => {
            const nome = deal?.contact?.contact_name || 'Cliente'
            const empresa = deal?.contact?.company_name || 'sua empresa'
            const segmento = deal?.contact?.segment || 'seu segmento'
    const produto = 'produtos/soluções'
    const janela1 = formatTimeOption(1)
    const janela2 = formatTimeOption(2)

    const stage = (deal?.stage_id || '').toLowerCase()

    const seg = (segmento || '').toLowerCase()

    // Ajustes por segmento (mensagens curtas por setor)
    const segHook =
      seg.includes('cond') ? 'padronizar higienização de áreas comuns e reduzir custo por m²' :
      seg.includes('hotel') ? 'elevar padrão sanitário em UH, A&B e áreas comuns com redução de consumo' :
      seg.includes('rest') ? 'garantir segurança alimentar na cozinha e salão, reduzindo desperdício' :
      seg.includes('ind') ? 'atender requisitos de PPE/Boas Práticas e otimizar consumo em linhas' :
      seg.includes('educ') ? 'assegurar ambientes saudáveis em salas e áreas comuns com custo previsível' :
      seg.includes('saúd') || seg.includes('saude') ? 'atender protocolos com laudos e alta efetividade' :
      'otimizar consumo e elevar padrão sanitário'

    if (stage === 'novo') {
      return {
        email: `Assunto: ${empresa} × Clean & Health — soluções para ${segmento}\n\nOlá, ${nome}! Tudo bem?\n\nRecebemos seu interesse em ${produto}. Ajudamos empresas de ${segmento} a ${segHook}, com produtos certificados e plano de uso.\n\nPara indicar a melhor solução, posso entender:\n- Área de aplicação principal?\n- Volume médio e frequência de uso?\n- Requisitos (fragrância, neutro, hospitalar, biodegradável)?\n\nProponho uma conversa de 15 min: ${janela1} ou ${janela2}. Pode ser?\n\nAbraço,\nClean & Health`,
        whatsapp: `Olá, ${nome}! Aqui é da Clean & Health. Vi seu interesse em ${produto} para ${segmento}. Posso te mandar 2 opções com ficha técnica e modo de uso? Temos cases de ${segHook}. Prefere falar ${janela1} ou ${janela2}?`,
        call: `Abertura: Recebemos seu pedido sobre ${produto}. Alinhamos objetivo e restrições para indicar solução pronta?\nDiagnóstico: segmento/área, volume/frequência, exigências, orçamento faixa, decisor, prazo.\nPróximo passo: envio 2 kits (econômico/premium) + ROI estimado e validamos em ${janela1}.`
      }
    }

    if (stage === 'contatado') {
      return {
        email: `Assunto: Materiais de ${produto} — conseguiu ver?\n\n${nome}, conforme alinhado, segue o material de ${produto} e modo de uso para ${segmento}. Posso te mostrar como clientes similares ${segHook}? Agenda rápida: ${janela1} ou ${janela2}.`,
        whatsapp: `${nome}, para não insistir errado: ainda faz sentido falarmos de ${produto} para ${segmento}? Se preferir, envio o comparativo técnico/consumo e você avalia.`,
        call: `Revisar interesse e objeções. Propor next step objetivo: demonstração, amostra ou visita técnica em ${janela1}.`
      }
    }

    if (stage === 'qualificado') {
      return {
        email: `Assunto: Proposta ${empresa} — solução com ROI e plano de uso\n\n${nome}, conforme requisitos e premissas, segue proposta com:\n- Kit recomendado + alternativa (custos/diluição/consumo)\n- Cronograma de implantação e treinamento\n- ROI estimado e garantia técnica\n\nPara ${segmento}, nossa proposta foca em ${segHook}. Liberamos amostra/visita técnica em ${janela1} ou ${janela2}. Confirma horário?`,
        whatsapp: `${nome}, enviei a proposta com o kit recomendado + cronograma. Para ${segmento}, focamos em ${segHook}. Precisa envolver mais alguém na aprovação? Se ok, seguimos hoje.`,
        call: `Relembrar critérios (técnico, TCO, prazo). Tratar objeções (consumo, compatibilidade, laudos). Para ${segmento}, reforçar ${segHook}. Próximo passo: aprovação e agenda em ${janela1}.`
      }
    }

    // Genérico para outros estágios
    return {
      email: `Assunto: Próximo passo — ${empresa}\n\n${nome}, podemos alinhar o próximo passo para avançarmos? Tenho ${janela1} ou ${janela2}.`,
      whatsapp: `${nome}, conseguimos alinhar o próximo passo? Posso em ${janela1} ou ${janela2}.`,
      call: `Confirmar status atual e definir próximo passo objetivo com data (${janela1}).`
    }
  }

  const getApproachContent = (deal, tabIndex) => {
    const t = buildTemplates(deal)
    if (tabIndex === 0) return t.email
    if (tabIndex === 1) return t.whatsapp
    return t.call
  }

  const copyApproach = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      // Opcional: feedback visual poderia ser adicionado
    } catch (e) {
      console.error('Falha ao copiar texto')
    }
  }

  const openWhatsApp = (text) => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const submitApproach = async () => {
    if (!approachDeal) return
    try {
      setApproachSubmitting(true)
      setApproachError('')
      await api.post(`/leads/${approachDeal.id}/activities`, {
        channel: approachChannel,
        subject: approachSubject,
        content: approachContent,
        outcome: approachOutcome,
        next_contact_at: approachNextContactAt,
        stage: approachDeal.stage_id,
        call_details: approachChannel === 'call' ? {
          objective: callObjective,
          decision_maker: callDecisionMaker,
          need_confirmed: callNeedConfirmed,
          budget_range: callBudgetRange,
          timeline: callTimeline,
          objections: callObjections,
          next_step: callNextStep,
          duration_seconds: callDuration ? parseInt(callDuration) : null
        } : undefined
      })
      setApproachDialogOpen(false)
    } catch (e) {
      setApproachError('Erro ao registrar atividade')
    } finally {
      setApproachSubmitting(false)
    }
  }

  // Calcular valor total do pipeline com melhor precisão
  const calculateTotalPipelineValue = () => {
    const total = deals.reduce((sum, deal) => {
      const value = parseFloat(deal.value || 0)
      // Só incluir se o valor for maior que 0
      return value > 0 ? sum + value : sum
    }, 0)
    return total
  }

  const totalPipelineValue = calculateTotalPipelineValue()

  // Calcular estatísticas do pipeline com distribuição detalhada
  const calculatePipelineStats = () => {
    const stagesWithDeals = pipeline?.stages?.filter(stage => 
      getDealsByStage(stage.id).length > 0
    )?.length || 0
    
    const averageValue = deals.length > 0 ? totalPipelineValue / deals.length : 0
    
    // Calcular valor potencial do pipeline (considerando probabilidades)
    const potentialValue = deals.reduce((sum, deal) => {
      const value = parseFloat(deal.value || 0)
      const probability = parseFloat(deal.probability || 0) / 100
      return sum + (value * probability)
    }, 0)
    
    // Calcular distribuição de leads por status
    const leadDistribution = pipeline?.stages?.map(stage => {
      const stageDeals = getDealsByStage(stage.id)
      const percentage = deals.length > 0 ? (stageDeals.length / deals.length * 100) : 0
      return {
        stage: stage.name,
        leads: stageDeals.length,
        percentage: percentage.toFixed(1)
      }
    }) || []
    
    const stats = {
      totalDeals: deals.length,
      totalValue: totalPipelineValue,
      averageValue: averageValue,
      potentialValue: potentialValue,
      stagesWithDeals: stagesWithDeals,
      conversionRate: totalPipelineValue > 0 ? (potentialValue / totalPipelineValue * 100) : 0,
      leadDistribution: leadDistribution
    }
    return stats
  }

  const pipelineStats = calculatePipelineStats()

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    )
  }

  if (!pipeline) {
    return <Typography>Carregando pipeline...</Typography>
  }

  // Verificar se há leads no pipeline
  if (deals.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Pipeline de Vendas Vazio
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Não há leads no pipeline de vendas. Adicione leads para começar a visualizar as estatísticas.
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => handleAddDeal(pipeline.stages[0].id)}
        >
          Adicionar Primeiro Lead
        </Button>
      </Box>
    )
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={(event) => {
          console.log('Drag start:', event)
        }}
        onDragOver={(event) => {
          console.log('Drag over:', event)
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                {pipeline.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {pipelineStats.totalDeals} leads ativos • R$ {totalPipelineValue.toLocaleString()} • Média: R$ {pipelineStats.averageValue.toLocaleString()} • {pipelineStats.stagesWithDeals} estágios com leads
              </Typography>
              <Typography variant="caption" color="primary" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <DragIndicator fontSize="small" sx={{ mr: 0.5 }} />
                Arraste os leads entre colunas ou reordene dentro da mesma coluna • Use a barra de rolagem azul para navegar
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {pipeline.stages.length} estágios • Scroll horizontal disponível
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<Add />}
                onClick={() => handleAddDeal(pipeline.stages[0].id)}
              >
                Novo Negócio
              </Button>
            </Box>
          </Box>

          <Box sx={{ 
            display: 'flex',
            flexWrap: 'nowrap', // Força uma única linha
            gap: {
              xs: 1,      // 8px - mobile
              sm: 1.5,    // 12px - tablet
              md: 2,      // 16px - desktop
              lg: 2.5,    // 20px - desktop grande
              xl: 3       // 24px - tela grande
            },
            pb: {
              xs: 3,    // Mobile
              sm: 3.5,  // Tablet
              md: 4,    // Desktop
              lg: 4.5,  // Desktop grande
              xl: 5     // Tela grande
            },
            minHeight: {
              xs: 500,    // Mobile
              sm: 550,    // Tablet
              md: 600,    // Desktop
              lg: 650,    // Desktop grande
              xl: 700     // Tela grande
            },
            width: '100%',
            overflowX: 'auto',
            // Scroll suave
            scrollBehavior: 'smooth',
            // Barra de rolagem sempre visível
            '&::-webkit-scrollbar': {
              height: {
                xs: 8,    // Mobile
                sm: 10,   // Tablet
                md: 12,   // Desktop
                lg: 14,   // Desktop grande
                xl: 16    // Tela grande
              },
              width: {
                xs: 8,    // Mobile
                sm: 10,   // Tablet
                md: 12,   // Desktop
                lg: 14,   // Desktop grande
                xl: 16    // Tela grande
              }
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#f5f5f5',
              borderRadius: 8,
              border: '1px solid #e0e0e0'
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#2196f3',
              borderRadius: 8,
              border: '1px solid #1976d2',
              '&:hover': {
                backgroundColor: '#1976d2'
              }
            },
            '&::-webkit-scrollbar-corner': {
              backgroundColor: '#f5f5f5'
            },
            // Indicador de scroll no hover
            '&:hover': {
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#1976d2'
              }
            }
          }}>
            {pipeline?.stages?.map((stage) => (
              <Box 
                key={stage.id}
                sx={{ 
                  minWidth: {
                    xs: 210,   // Mobile: 210px (280 * 0.75)
                    sm: 225,   // Tablet: 225px (300 * 0.75)
                    md: 240,   // Desktop: 240px (320 * 0.75)
                    lg: 255,   // Desktop grande: 255px (340 * 0.75)
                    xl: 270    // Telas grandes: 270px (360 * 0.75)
                  },
                  flex: {
                    xs: '0 0 210px',
                    sm: '0 0 225px',
                    md: '0 0 240px',
                    lg: '0 0 255px',
                    xl: '0 0 270px'
                  }
                }}
              >
                <StageColumn
                  stage={stage}
                  deals={getDealsByStage(stage.id)}
                  onAddDeal={handleAddDeal}
                  onMoveDeal={handleMoveDeal}
                  onEditDeal={handleEditDeal}
                  onApproachDeal={handleApproachDeal}
                  onOpenSmartScript={(d) => {
                    setSelectedDeal({ ...d, __openSmart: true })
                  }}
                  totalPipelineValue={totalPipelineValue}
                  allDeals={deals}
                  pipeline={pipeline}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </DndContext>

      {/* Dialog para adicionar/editar negócio */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedDeal ? 'Editar Negócio' : 'Novo Negócio'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Título do Negócio"
            fullWidth
            variant="outlined"
            defaultValue={selectedDeal?.title || ''}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Valor (R$)"
            type="number"
            fullWidth
            variant="outlined"
            defaultValue={selectedDeal?.value || ''}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Cliente/Lead"
            fullWidth
            variant="outlined"
            defaultValue={selectedDeal?.client_name || ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={() => setDialogOpen(false)}>
            {selectedDeal ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Abordagem Sugerida */}
      <Dialog
        open={approachDialogOpen}
        onClose={() => setApproachDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Abordagem sugerida — {approachDeal?.contact?.company_name || 'Lead'} ({approachDeal?.stage_id})
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={approachTab} onChange={(e, v) => { setApproachTab(v); setApproachChannel(v === 0 ? 'email' : v === 1 ? 'whatsapp' : 'call'); setApproachContent(getApproachContent(approachDeal, v)) }}>
              <Tab label="E-mail" />
              <Tab label="WhatsApp" />
              <Tab label="Ligação" />
            </Tabs>
          </Box>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Canal</InputLabel>
                <Select
                  label="Canal"
                  value={approachChannel}
                  onChange={(e) => setApproachChannel(e.target.value)}
                >
                  <MenuItem value="email">E-mail</MenuItem>
                  <MenuItem value="whatsapp">WhatsApp</MenuItem>
                  <MenuItem value="call">Ligação</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                label="Assunto (opcional)"
                fullWidth
                value={approachSubject}
                onChange={(e) => setApproachSubject(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                label="Resultado (opcional)"
                fullWidth
                value={approachOutcome}
                onChange={(e) => setApproachOutcome(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Próximo contato (opcional)"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={approachNextContactAt}
                onChange={(e) => setApproachNextContactAt(e.target.value)}
              />
            </Grid>
          </Grid>
          <TextField
            multiline
            minRows={10}
            fullWidth
            value={approachContent}
            onChange={(e) => setApproachContent(e.target.value)}
          />
          {approachChannel === 'call' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>Formulário de Telemarketing</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField label="Objetivo da ligação" fullWidth value={callObjective} onChange={(e) => setCallObjective(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Decisor" fullWidth value={callDecisionMaker} onChange={(e) => setCallDecisionMaker(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={12}>
                  <TextField label="Objeções identificadas" fullWidth value={callObjections} onChange={(e) => setCallObjections(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="Faixa de orçamento" fullWidth value={callBudgetRange} onChange={(e) => setCallBudgetRange(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="Prazo/Timeline" fullWidth value={callTimeline} onChange={(e) => setCallTimeline(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="Duração (segundos)" type="number" fullWidth value={callDuration} onChange={(e) => setCallDuration(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={12}>
                  <TextField label="Próximo passo" fullWidth value={callNextStep} onChange={(e) => setCallNextStep(e.target.value)} />
                </Grid>
              </Grid>
            </Box>
          )}
          {approachError && (
            <Alert severity="error" sx={{ mt: 2 }}>{approachError}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproachDialogOpen(false)}>Fechar</Button>
          <Button
            startIcon={<ContentCopy />}
            onClick={() => copyApproach(approachContent)}
          >
            Copiar texto
          </Button>
          {approachTab === 1 && (
            <Button
              variant="contained"
              color="success"
              startIcon={<WhatsApp />}
              onClick={() => openWhatsApp(approachContent)}
            >
              Abrir WhatsApp
            </Button>
          )}
          <Button variant="contained" disabled={approachSubmitting} onClick={submitApproach}>
            {approachSubmitting ? 'Registrando...' : 'Registrar atividade'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Script SMART (menu do lead) */}
      <SmartCallScript
        open={smartScriptOpen}
        onClose={() => setSmartScriptOpen(false)}
        context={smartScriptDeal ? {
          leadId: smartScriptDeal.id,
          leadName: smartScriptDeal.contact?.contact_name,
          companyName: smartScriptDeal.contact?.company_name,
          segment: smartScriptDeal.contact?.segment,
          stage: smartScriptDeal.stage_id
        } : null}
        onSuccess={() => {}}
      />

      {/* Dialog de Agendamento de Visitas */}
      <Dialog open={visitDialogOpen} onClose={handleVisitDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Agendar Visita - {visitLead?.contact?.company_name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Título da Visita"
                value={visitFormData.title}
                onChange={(e) => setVisitFormData({ ...visitFormData, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Visita</InputLabel>
                <Select
                  value={visitFormData.type}
                  onChange={(e) => setVisitFormData({ ...visitFormData, type: e.target.value })}
                  label="Tipo de Visita"
                >
                  <MenuItem value="comercial">Comercial</MenuItem>
                  <MenuItem value="tecnica">Técnica</MenuItem>
                  <MenuItem value="instalacao">Instalação</MenuItem>
                  <MenuItem value="manutencao">Manutenção</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data da Visita"
                type="date"
                value={visitFormData.scheduled_date}
                onChange={(e) => setVisitFormData({ ...visitFormData, scheduled_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Horário"
                type="time"
                value={visitFormData.scheduled_time}
                onChange={(e) => setVisitFormData({ ...visitFormData, scheduled_time: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Endereço"
                value={visitFormData.address}
                onChange={(e) => setVisitFormData({ ...visitFormData, address: e.target.value })}
                required
              />
            </Grid>
            {/* Seleção de usuários para convite */}
            <Grid item xs={12}>
              <UserSelector
                selectedUsers={selectedUsersForVisit}
                onSelectionChange={setSelectedUsersForVisit}
                label="Convidar usuários para esta visita"
                helperText="Usuários selecionados receberão convites automáticos na data da visita"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={4}
                value={visitFormData.notes}
                onChange={(e) => setVisitFormData({ ...visitFormData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleVisitDialogClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleVisitSubmit}>
            Agendar Visita
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para mensagens */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default PipelineBoard




















