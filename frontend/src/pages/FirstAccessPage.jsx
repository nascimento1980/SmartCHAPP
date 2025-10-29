import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Box, Paper, Typography, TextField, Button, Stack, Alert } from '@mui/material'
import api from '../services/api'

const FirstAccessPage = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) setError('Token inválido. Verifique o link do e-mail.')
  }, [token])

  const handleSubmit = async () => {
    setError('')
    if (!token) return
    if (!password || password.length < 6) return setError('A senha deve ter ao menos 6 caracteres')
    if (password !== confirm) return setError('As senhas não conferem')
    try {
      setSubmitting(true)
      await api.post('/auth/first-access', { token, password })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1500)
    } catch (e) {
      setError(e.response?.data?.error || 'Falha ao definir senha')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', p: 2 }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: 420 }}>
        <Typography variant="h6" gutterBottom>Primeiro Acesso</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Defina sua senha para ativar sua conta.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>Senha criada com sucesso! Redirecionando...</Alert>}
        <Stack spacing={2}>
          <TextField type="password" label="Nova senha" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
          <TextField type="password" label="Confirmar senha" value={confirm} onChange={(e) => setConfirm(e.target.value)} fullWidth />
          <Button variant="contained" onClick={handleSubmit} disabled={submitting || !token}>
            {submitting ? 'Enviando...' : 'Definir senha'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}

export default FirstAccessPage








