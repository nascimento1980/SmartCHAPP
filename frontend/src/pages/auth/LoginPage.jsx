import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material'
import { Business } from '@mui/icons-material'
import { useAuth } from '../../contexts/AuthContext'

const LoginPage = () => {
  const { login } = useAuth()
  const [redirectToFirstAccess, setRedirectToFirstAccess] = useState(false)
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await login(formData.login, formData.password)
    
    if (!result.success) {
      setError(result.error)
      if (result.requirePasswordChange) {
        setRedirectToFirstAccess(true)
      }
    }
    
    setLoading(false)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2E7DD2 0%, #1B5AA3 100%)',
        p: 2
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Business sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              CH_SMART
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Clean & Health Soluções
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Sistema de CRM
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Usuário ou E-mail"
              name="login"
              value={formData.login}
              onChange={handleChange}
              margin="normal"
              required
              disabled={loading}
              autoComplete="username email"
            />
            
            <TextField
              fullWidth
              label="Senha"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              disabled={loading}
              autoComplete="current-password"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Entrar'}
            </Button>
          </form>
          {redirectToFirstAccess && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              É necessário redefinir sua senha. Acesse o link enviado por e-mail (Primeiro Acesso).
            </Alert>
          )}

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Usuário demo: admin@ch_smart
            </Typography>
            <br />
            <Typography variant="caption" color="text.secondary">
              Senha: password
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default LoginPage