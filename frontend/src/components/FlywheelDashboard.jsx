import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert
} from '@mui/material'
import {
  TrendingUp,
  People,
  Handshake,
  Star,
  CheckCircle,
  Warning,
  Error as ErrorIcon
} from '@mui/icons-material'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const FlywheelCard = ({ title, score, metrics, color, icon }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ color: color, mr: 1 }}>
          {icon}
        </Box>
        <Typography variant="h6">{title}</Typography>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <CircularProgress
          variant="determinate"
          value={score}
          size={60}
          sx={{ color: color, mr: 2 }}
        />
        <Box>
          <Typography variant="h4" sx={{ color: color, fontWeight: 'bold' }}>
            {score}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Score
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ mt: 2 }}>
        {Object.entries(metrics).map(([key, value]) => (
          <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {typeof value === 'number' ? 
                (key.includes('Rate') || key.includes('Score') ? `${value.toFixed(1)}%` : 
                 key.includes('Revenue') || key.includes('Value') ? `R$ ${value.toLocaleString()}` :
                 value.toLocaleString()) 
                : value}
            </Typography>
          </Box>
        ))}
      </Box>
    </CardContent>
  </Card>
)

const RecommendationsList = ({ recommendations }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Recomendações para Acelerar o Flywheel
      </Typography>
      
      {recommendations.length === 0 ? (
        <Alert severity="success">
          Parabéns! Seu Flywheel está funcionando bem. Continue assim!
        </Alert>
      ) : (
        <List>
          {recommendations.map((rec, index) => (
            <ListItem key={index} sx={{ px: 0 }}>
              <ListItemIcon>
                {rec.priority === 'critical' ? (
                  <ErrorIcon color="error" />
                ) : rec.priority === 'high' ? (
                  <Warning color="warning" />
                ) : (
                  <CheckCircle color="info" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" component="span">{rec.title}</Typography>
                    <Chip 
                      label={rec.priority.toUpperCase()} 
                      size="small" 
                      color={
                        rec.priority === 'critical' ? 'error' :
                        rec.priority === 'high' ? 'warning' : 'info'
                      }
                    />
                  </Box>
                }
                secondary={
                  <React.Fragment>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block', mt: 1 }}>
                      {rec.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block', mt: 1 }}>
                      Ação sugerida:
                    </Typography>
                    <Typography variant="caption" component="span" sx={{ fontWeight: 'bold', display: 'block', mt: 0.5 }}>
                      {rec.action}
                    </Typography>
                  </React.Fragment>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </CardContent>
  </Card>
)

const FlywheelDashboard = () => {
  const { user } = useAuth()
  const [flywheelData, setFlywheelData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchFlywheelData = async () => {
      try {
        setLoading(true)
        const response = await api.get('/flywheel/metrics')
        setFlywheelData(response.data.data)
      } catch (err) {
        setError('Erro ao carregar métricas do Flywheel')
        console.error('Erro:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFlywheelData()
  }, [])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    )
  }

  if (!flywheelData) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Nenhum dado disponível
      </Alert>
    )
  }

  const { velocity, breakdown, recommendations } = flywheelData

  return (
    <Box>
      {/* Header do Flywheel */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          🎯 Flywheel Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Visualize o ciclo completo: Atrair → Engajar → Encantar → Promover
        </Typography>
        
        {/* Velocidade Geral */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6">Velocidade do Flywheel</Typography>
                <Typography variant="body2" color="text.secondary">
                  Quanto mais rápido, melhor sua performance de vendas
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress
                  variant="determinate"
                  value={velocity}
                  size={80}
                  thickness={6}
                  sx={{ 
                    color: velocity >= 70 ? 'success.main' : velocity >= 40 ? 'warning.main' : 'error.main',
                    mr: 2 
                  }}
                />
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {velocity}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Velocidade
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <LinearProgress
              variant="determinate"
              value={velocity}
              sx={{ 
                mt: 2, 
                height: 8, 
                borderRadius: 4,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: velocity >= 70 ? 'success.main' : velocity >= 40 ? 'warning.main' : 'error.main'
                }
              }}
            />
          </CardContent>
        </Card>
      </Box>

      {/* Cards das 3 Fases */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <FlywheelCard
            title="🎯 Atrair"
            score={breakdown.conversion_rate || 0}
            metrics={{
              'Total Leads': breakdown.total_leads || 0,
              'Convertidos': breakdown.converted_leads || 0,
              'Taxa Conversão': `${(breakdown.conversion_rate || 0).toFixed(1)}%`
            }}
            color="#2196f3"
            icon={<People />}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FlywheelCard
            title="🤝 Engajar"
            score={breakdown.proposal_rate || 0}
            metrics={{
              'Propostas Enviadas': breakdown.approved_proposals || 0,
              'Visitas Concluídas': breakdown.completed_visits || 0,
              'Taxa Propostas': `${(breakdown.proposal_rate || 0).toFixed(1)}%`
            }}
            color="#ff9800"
            icon={<Handshake />}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FlywheelCard
            title="⭐ Encantar"
            score={breakdown.visit_rate || 0}
            metrics={{
              'Clientes Ativos': breakdown.active_clients || 0,
              'Visitas Realizadas': breakdown.completed_visits || 0,
              'Taxa Visitas': `${(breakdown.visit_rate || 0).toFixed(1)}%`
            }}
            color="#4caf50"
            icon={<Star />}
          />
        </Grid>
      </Grid>

      {/* Recomendações */}
      <RecommendationsList recommendations={recommendations} />
    </Box>
  )
}

export default FlywheelDashboard