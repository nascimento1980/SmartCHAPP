import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  TrendingUp,
  People,
  AttachMoney,
  Assessment,
  Download,
  FilterList,
  Refresh,
  BarChart,
  PieChart,
  Timeline
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { ptBR } from 'date-fns/locale'
import api from '../services/api'
import {
  BarChartComponent,
  PieChartComponent,
  LineChartComponent,
  AreaChartComponent,
  RadarChartComponent,
  MultiBarChartComponent,
  MultiLineChartComponent,
  EmptyChartComponent
} from '../components/charts/ChartComponents'

// Componente de Card de Métrica
const MetricCard = ({ title, value, subtitle, icon, color = 'primary' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" component="div" color={`${color}.main`} fontWeight="bold">
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ color: `${color}.main` }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
)



// Componente de Tabela de Dados
const DataTable = ({ data, columns, title }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
        {data?.length > 0 ? (
          <Box>
            {data.map((item, index) => (
              <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #eee' }}>
                {columns.map((column) => (
                  <Typography key={column.key} variant="body2">
                    {item[column.key]}
                  </Typography>
                ))}
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            Nenhum dado disponível
          </Typography>
        )}
      </Box>
    </CardContent>
  </Card>
)

const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date()
  })
  const [period, setPeriod] = useState('month')
  const [analyticsData, setAnalyticsData] = useState({
    overview: null,
    performance: null,
    team: null,
    segments: null
  })

  const fetchAnalyticsData = async () => {
    setLoading(true)
    setError('')

    try {
      const params = {
        startDate: dateRange.startDate.toISOString().split('T')[0],
        endDate: dateRange.endDate.toISOString().split('T')[0],
        period
      }

      // Buscar dados de overview
      const overviewResponse = await api.get('/analytics/overview', { params })
      
      // Buscar dados de performance
      const performanceResponse = await api.get('/analytics/performance', { params })
      
      // Buscar dados da equipe
      const teamResponse = await api.get('/analytics/team', { params })
      
      // Buscar dados de segmentos
      const segmentsResponse = await api.get('/analytics/segments', { params })

      // Dados de exemplo para desenvolvimento
      const mockPerformanceData = {
        monthly_leads: [
          { month: 'Jan', count: 15 },
          { month: 'Fev', count: 22 },
          { month: 'Mar', count: 18 },
          { month: 'Abr', count: 25 },
          { month: 'Mai', count: 30 },
          { month: 'Jun', count: 28 }
        ],
        conversion_rate: [
          { month: 'Jan', rate: 12 },
          { month: 'Fev', rate: 15 },
          { month: 'Mar', rate: 18 },
          { month: 'Abr', rate: 20 },
          { month: 'Mai', rate: 22 },
          { month: 'Jun', rate: 25 }
        ],
        revenue_trend: [
          { month: 'Jan', estimated: 45000, actual: 42000 },
          { month: 'Fev', estimated: 52000, actual: 48000 },
          { month: 'Mar', estimated: 48000, actual: 51000 },
          { month: 'Abr', estimated: 55000, actual: 58000 },
          { month: 'Mai', estimated: 60000, actual: 62000 },
          { month: 'Jun', estimated: 58000, actual: 61000 }
        ]
      }

      const mockTeamData = {
        performance_by_user: [
          { user: 'João Silva', leads: 25 },
          { user: 'Maria Santos', leads: 32 },
          { user: 'Pedro Costa', leads: 18 },
          { user: 'Ana Oliveira', leads: 28 }
        ],
        conversion_by_user: [
          { user: 'João Silva', conversions: 8 },
          { user: 'Maria Santos', conversions: 12 },
          { user: 'Pedro Costa', conversions: 6 },
          { user: 'Ana Oliveira', conversions: 10 }
        ],
        activity_radar: [
          { subject: 'Leads', A: 85 },
          { subject: 'Visitas', A: 70 },
          { subject: 'Propostas', A: 60 },
          { subject: 'Conversões', A: 45 },
          { subject: 'Receita', A: 80 }
        ]
      }

      const mockSegmentsData = {
        revenue_by_segment: [
          { segment: 'Condomínios', revenue: 45000 },
          { segment: 'Hotelaria', revenue: 38000 },
          { segment: 'Restaurantes', revenue: 25000 },
          { segment: 'Indústria', revenue: 55000 },
          { segment: 'Educação', revenue: 32000 },
          { segment: 'Saúde', revenue: 42000 }
        ],
        conversion_by_segment: [
          { segment: 'Condomínios', conversion_rate: 25 },
          { segment: 'Hotelaria', conversion_rate: 30 },
          { segment: 'Restaurantes', conversion_rate: 20 },
          { segment: 'Indústria', conversion_rate: 35 },
          { segment: 'Educação', conversion_rate: 28 },
          { segment: 'Saúde', conversion_rate: 32 }
        ],
        trend_by_segment: [
          { month: 'Jan', condominios: 12, hotelaria: 8, restaurantes: 6, industria: 15 },
          { month: 'Fev', condominios: 15, hotelaria: 10, restaurantes: 8, industria: 18 },
          { month: 'Mar', condominios: 18, hotelaria: 12, restaurantes: 10, industria: 22 },
          { month: 'Abr', condominios: 20, hotelaria: 14, restaurantes: 12, industria: 25 }
        ]
      }

      setAnalyticsData({
        overview: overviewResponse.data,
        performance: mockPerformanceData,
        team: mockTeamData,
        segments: mockSegmentsData
      })
    } catch (err) {
      console.error('Erro ao buscar dados de analytics:', err)
      setError('Erro ao carregar dados de analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [dateRange, period])

  const handleExport = async (dataType) => {
    try {
      const params = {
        dataType,
        format: 'json',
        startDate: dateRange.startDate.toISOString().split('T')[0],
        endDate: dateRange.endDate.toISOString().split('T')[0]
      }

      const response = await api.get('/analytics/export', { params })
      
      // Criar arquivo para download
      const dataStr = JSON.stringify(response.data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${dataType}_${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erro ao exportar dados:', err)
      setError('Erro ao exportar dados')
    }
  }

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue)
  }

  const overview = analyticsData.overview?.overview
  const leadsByStatus = analyticsData.overview?.leads_by_status || []
  const leadsBySegment = analyticsData.overview?.leads_by_segment || []
  const proposalsByStatus = analyticsData.overview?.proposals_by_status || []

  // Formatar dados para os gráficos
  const formatLeadsByStatus = () => {
    return leadsByStatus.map(item => ({
      status: item.status,
      count: parseInt(item.count),
      name: item.status.charAt(0).toUpperCase() + item.status.slice(1)
    }))
  }

  const formatLeadsBySegment = () => {
    return leadsBySegment.map(item => ({
      segment: item.segment,
      count: parseInt(item.count),
      name: item.segment.charAt(0).toUpperCase() + item.segment.slice(1)
    }))
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Analytics e Relatórios
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Atualizar dados">
              <IconButton onClick={fetchAnalyticsData} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExport('leads')}
            >
              Exportar
            </Button>
          </Box>
        </Box>

        {/* Filtros */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Data Inicial"
                  value={dateRange.startDate}
                  onChange={(newValue) => setDateRange(prev => ({ ...prev, startDate: newValue }))}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Data Final"
                  value={dateRange.endDate}
                  onChange={(newValue) => setDateRange(prev => ({ ...prev, endDate: newValue }))}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Período</InputLabel>
                  <Select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    label="Período"
                  >
                    <MenuItem value="week">Semanal</MenuItem>
                    <MenuItem value="month">Mensal</MenuItem>
                    <MenuItem value="quarter">Trimestral</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  variant="contained"
                  startIcon={<FilterList />}
                  onClick={fetchAnalyticsData}
                  disabled={loading}
                  fullWidth
                >
                  Aplicar Filtros
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Alert de erro */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Conteúdo */}
        {!loading && (
          <>
            {/* Métricas Principais */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total de Leads"
                  value={overview?.total_leads || 0}
                  icon={<People sx={{ fontSize: 40 }} />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Clientes"
                  value={overview?.total_clients || 0}
                  icon={<People sx={{ fontSize: 40 }} />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Propostas"
                  value={overview?.total_proposals || 0}
                  icon={<AttachMoney sx={{ fontSize: 40 }} />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Taxa de Conversão"
                  value={`${overview?.conversion_rate || 0}%`}
                  subtitle={`${overview?.converted_leads || 0} convertidos`}
                  icon={<TrendingUp sx={{ fontSize: 40 }} />}
                  color="info"
                />
              </Grid>
            </Grid>

            {/* Tabs de Análise */}
            <Card>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={handleTabChange}>
                  <Tab label="Visão Geral" />
                  <Tab label="Performance" />
                  <Tab label="Equipe" />
                  <Tab label="Segmentos" />
                  <Tab label="Relatórios" />
                </Tabs>
              </Box>

              <Box sx={{ p: 3 }}>
                {/* Tab: Visão Geral */}
                {activeTab === 0 && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      {leadsByStatus && leadsByStatus.length > 0 ? (
                        <PieChartComponent
                          data={formatLeadsByStatus()}
                          title="Leads por Status"
                          dataKey="count"
                          nameKey="name"
                        />
                      ) : (
                        <EmptyChartComponent
                          title="Leads por Status"
                          message="Nenhum lead disponível"
                        />
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {leadsBySegment && leadsBySegment.length > 0 ? (
                        <MultiBarChartComponent
                          data={formatLeadsBySegment()}
                          title="Leads por Segmento"
                          xKey="segment"
                          bars={[
                            { key: 'count', name: 'Quantidade de Leads' }
                          ]}
                        />
                      ) : (
                        <EmptyChartComponent
                          title="Leads por Segmento"
                          message="Nenhum segmento disponível"
                        />
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      <DataTable
                        data={proposalsByStatus}
                        columns={[
                          { key: 'status', label: 'Status' },
                          { key: 'count', label: 'Quantidade' },
                          { key: 'total_value', label: 'Valor Total' }
                        ]}
                        title="Propostas por Status"
                      />
                    </Grid>
                  </Grid>
                )}

                {/* Tab: Performance */}
                {activeTab === 1 && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      {analyticsData.performance?.monthly_leads ? (
                        <LineChartComponent
                          data={analyticsData.performance.monthly_leads}
                          title="Leads por Mês"
                          xKey="month"
                          yKey="count"
                          color="#2196f3"
                        />
                      ) : (
                        <EmptyChartComponent
                          title="Leads por Mês"
                          message="Dados de performance em desenvolvimento"
                        />
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {analyticsData.performance?.conversion_rate ? (
                        <AreaChartComponent
                          data={analyticsData.performance.conversion_rate}
                          title="Taxa de Conversão"
                          xKey="month"
                          yKey="rate"
                          color="#4caf50"
                        />
                      ) : (
                        <EmptyChartComponent
                          title="Taxa de Conversão"
                          message="Dados de conversão em desenvolvimento"
                        />
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      {analyticsData.performance?.revenue_trend ? (
                        <MultiLineChartComponent
                          data={analyticsData.performance.revenue_trend}
                          title="Tendência de Receita"
                          xKey="month"
                          lines={[
                            { key: 'estimated', name: 'Estimado' },
                            { key: 'actual', name: 'Real' }
                          ]}
                        />
                      ) : (
                        <EmptyChartComponent
                          title="Tendência de Receita"
                          message="Dados de receita em desenvolvimento"
                        />
                      )}
                    </Grid>
                  </Grid>
                )}

                {/* Tab: Equipe */}
                {activeTab === 2 && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      {analyticsData.team?.performance_by_user ? (
                        <MultiBarChartComponent
                          data={analyticsData.team.performance_by_user}
                          title="Performance por Usuário"
                          xKey="user"
                          bars={[
                            { key: 'leads', name: 'Leads' }
                          ]}
                        />
                      ) : (
                        <EmptyChartComponent
                          title="Performance por Usuário"
                          message="Dados da equipe em desenvolvimento"
                        />
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {analyticsData.team?.conversion_by_user ? (
                        <PieChartComponent
                          data={analyticsData.team.conversion_by_user}
                          title="Conversões por Usuário"
                          dataKey="conversions"
                          nameKey="user"
                        />
                      ) : (
                        <EmptyChartComponent
                          title="Conversões por Usuário"
                          message="Dados de conversão da equipe em desenvolvimento"
                        />
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      {analyticsData.team?.activity_radar ? (
                        <RadarChartComponent
                          data={analyticsData.team.activity_radar}
                          title="Atividade da Equipe"
                        />
                      ) : (
                        <EmptyChartComponent
                          title="Atividade da Equipe"
                          message="Dados de atividade em desenvolvimento"
                        />
                      )}
                    </Grid>
                  </Grid>
                )}

                {/* Tab: Segmentos */}
                {activeTab === 3 && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      {analyticsData.segments?.revenue_by_segment ? (
                        <MultiBarChartComponent
                          data={analyticsData.segments.revenue_by_segment}
                          title="Receita por Segmento"
                          xKey="segment"
                          bars={[
                            { key: 'revenue', name: 'Receita' }
                          ]}
                        />
                      ) : (
                        <EmptyChartComponent
                          title="Receita por Segmento"
                          message="Dados de segmentos em desenvolvimento"
                        />
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {analyticsData.segments?.conversion_by_segment ? (
                        <PieChartComponent
                          data={analyticsData.segments.conversion_by_segment}
                          title="Conversão por Segmento"
                          dataKey="conversion_rate"
                          nameKey="segment"
                        />
                      ) : (
                        <EmptyChartComponent
                          title="Conversão por Segmento"
                          message="Dados de conversão por segmento em desenvolvimento"
                        />
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      {analyticsData.segments?.trend_by_segment ? (
                        <MultiBarChartComponent
                          data={analyticsData.segments.trend_by_segment}
                          title="Tendência por Segmento"
                          xKey="month"
                          bars={[
                            { key: 'condominios', name: 'Condomínios' },
                            { key: 'hotelaria', name: 'Hotelaria' },
                            { key: 'restaurantes', name: 'Restaurantes' },
                            { key: 'industria', name: 'Indústria' }
                          ]}
                        />
                      ) : (
                        <EmptyChartComponent
                          title="Tendência por Segmento"
                          message="Dados de tendência por segmento em desenvolvimento"
                        />
                      )}
                    </Grid>
                  </Grid>
                )}

                {/* Tab: Relatórios */}
                {activeTab === 4 && (
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        Relatórios Específicos
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                          variant="outlined"
                          onClick={() => handleExport('leads')}
                          startIcon={<Download />}
                        >
                          Exportar Leads
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => handleExport('proposals')}
                          startIcon={<Download />}
                        >
                          Exportar Propostas
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => handleExport('clients')}
                          startIcon={<Download />}
                        >
                          Exportar Clientes
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </Box>
            </Card>
          </>
        )}
      </Box>
    </LocalizationProvider>
  )
}

export default AnalyticsPage









