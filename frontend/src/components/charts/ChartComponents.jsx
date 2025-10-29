import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'
import { Box, Typography, Card, CardContent } from '@mui/material'

// Cores para os gráficos
const COLORS = [
  '#2196f3', // Azul
  '#4caf50', // Verde
  '#ff9800', // Laranja
  '#f44336', // Vermelho
  '#9c27b0', // Roxo
  '#607d8b', // Cinza azulado
  '#795548', // Marrom
  '#ff5722', // Vermelho escuro
  '#00bcd4', // Ciano
  '#8bc34a'  // Verde claro
]

// Helper para configurar rótulos do eixo X sempre visíveis e legíveis
const getXAxisTickProps = (dataLength) => {
  const manyCategories = typeof dataLength === 'number' && dataLength > 6
  return {
    interval: 0,
    tick: {
      fontSize: 12,
      fill: '#333',
    },
    angle: manyCategories ? -25 : 0,
    textAnchor: manyCategories ? 'end' : 'middle',
    tickMargin: 12,
  }
}

// Componente de Gráfico de Barras
export const BarChartComponent = ({ data, title, xKey, yKey, color = '#2196f3' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ height: 400, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} {...getXAxisTickProps(data?.length)} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ width: '100%' }} />
            <Bar dataKey={yKey} fill={color} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
)

// Componente de Gráfico de Pizza
export const PieChartComponent = ({ data, title, dataKey, nameKey }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ height: 400, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius="70%"
              fill="#8884d8"
              dataKey={dataKey}
              nameKey={nameKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [value, name]} />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ width: '100%' }} />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
)

// Componente de Gráfico de Linha
export const LineChartComponent = ({ data, title, xKey, yKey, color = '#2196f3' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ height: 400, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} {...getXAxisTickProps(data?.length)} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ width: '100%' }} />
            <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
)

// Componente de Gráfico de Área
export const AreaChartComponent = ({ data, title, xKey, yKey, color = '#2196f3' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ height: 400, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} {...getXAxisTickProps(data?.length)} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ width: '100%' }} />
            <Area type="monotone" dataKey={yKey} stroke={color} fill={color} fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
)

// Componente de Gráfico de Radar
export const RadarChartComponent = ({ data, title }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ height: 400, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#333' }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar name="Performance" dataKey="A" stroke="#2196f3" fill="#2196f3" fillOpacity={0.3} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
)

// Componente de Gráfico de Barras Múltiplas
export const MultiBarChartComponent = ({ data, title, xKey, bars }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ height: 400, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} {...getXAxisTickProps(data?.length)} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ width: '100%' }} />
            {bars.map((bar, index) => (
              <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
)

// Componente de Gráfico de Linha Múltipla
export const MultiLineChartComponent = ({ data, title, xKey, lines }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ height: 400, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} {...getXAxisTickProps(data?.length)} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ width: '100%' }} />
            {lines.map((line, index) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                name={line.name}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
)

// Componente de Gráfico de Dados Vazios
export const EmptyChartComponent = ({ title, message = 'Nenhum dado disponível' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </Box>
    </CardContent>
  </Card>
) 