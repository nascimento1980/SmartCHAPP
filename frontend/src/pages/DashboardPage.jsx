import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab
} from '@mui/material'
import {
  PersonAdd,
  People,
  TrendingUp,
  CalendarToday,
  Speed
} from '@mui/icons-material'
import FlywheelDashboard from '../components/FlywheelDashboard'
import api from '../services/api'
import LeadForm from '../components/LeadForm'


const StatCard = ({ title, value, icon, color = 'primary' }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: `${color}.main` }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Box sx={{ color: `${color}.main` }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
)

const DashboardPage = () => {
  const [tabValue, setTabValue] = useState(0)
  const [overview, setOverview] = useState({
    total_leads: 0,
    total_clients: 0,
    sales_month: 0,
    total_visits: 0,
  })
  const [loading, setLoading] = useState(true)
  const [leadFormOpen, setLeadFormOpen] = useState(false)
  const navigate = useNavigate()

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  const handleNovoLead = () => {
    setLeadFormOpen(true)
  }

  const handleLeadFormSuccess = () => {
    setLeadFormOpen(false)
    // Aqui poderia atualizar algum estado se necessário
  }

  const handleAgendarVisita = () => {
    navigate('/visits')
  }

  const handleCriarProposta = () => {
    navigate('/proposals')
  }

  useEffect(() => {
    let mounted = true
    const fetchOverview = async () => {
      try {
        setLoading(true)
        const { data } = await api.get('/analytics/overview')
        if (mounted && data?.overview) setOverview(data.overview)
      } catch (e) {
        console.error('Erro ao carregar overview do dashboard:', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchOverview()
    return () => { mounted = false }
  }, [])

  return (
    <Box>
      
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Bem-vindo ao CH_SMART - Clean & Health CRM
      </Typography>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Visão Geral" />
        <Tab 
          label="Flywheel" 
          icon={<Speed />} 
          iconPosition="start"
        />
      </Tabs>

      {tabValue === 0 && (
        <Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Leads Ativos"
            value={loading ? '...' : (overview.total_leads || 0).toLocaleString()}
            icon={<PersonAdd sx={{ fontSize: 40 }} />}
            color="warning"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Clientes"
            value={loading ? '...' : (overview.total_clients || 0).toLocaleString()}
            icon={<People sx={{ fontSize: 40 }} />}
            color="primary"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Vendas do Mês"
            value={loading ? '...' : `R$ ${(overview.sales_month || 0).toLocaleString()}`}
            icon={<TrendingUp sx={{ fontSize: 40 }} />}
            color="success"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Visitas Agendadas"
            value={loading ? '...' : (overview.total_visits || 0).toLocaleString()}
            icon={<CalendarToday sx={{ fontSize: 40 }} />}
            color="info"
          />
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Atividades Recentes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Em desenvolvimento...
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ações Rápidas
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button 
                  variant="contained" 
                  fullWidth 
                  onClick={handleNovoLead}
                  startIcon={<PersonAdd />}
                >
                  Novo Lead
                </Button>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  onClick={handleAgendarVisita}
                  startIcon={<CalendarToday />}
                >
                  Agendar Visita
                </Button>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  onClick={handleCriarProposta}
                  startIcon={<TrendingUp />}
                >
                  Criar Proposta
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
        </Box>
      )}

      {tabValue === 1 && (
        <FlywheelDashboard />
      )}

      {/* Modal de Criação de Lead */}
      <LeadForm
        open={leadFormOpen}
        onClose={() => setLeadFormOpen(false)}
        lead={null}
        onSuccess={handleLeadFormSuccess}
      />
    </Box>
  )
}

export default DashboardPage;
