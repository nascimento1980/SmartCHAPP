import React, { useEffect, useState } from 'react'
import { Box, Grid, Paper, TextField, Button, Typography, MenuItem, Divider, Stack, IconButton } from '@mui/material'
import { Edit, Delete } from '@mui/icons-material'
import api from '../services/api'
import { useSnackbar } from 'notistack'

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState({ name: '', email: '', role: 'sales', department: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const { enqueueSnackbar } = useSnackbar()
  const [departments, setDepartments] = useState([])
  const [profiles, setProfiles] = useState([])

  const load = async () => {
    const { data } = await api.get('/employees')
    setEmployees(data.data || [])
  }

  useEffect(() => {
    load()
    const loadCatalogs = async () => {
      try {
        const [deps, profs] = await Promise.all([
          api.get('/settings/catalogs/departments'),
          api.get('/settings/catalogs/role-profiles')
        ])
        setDepartments(deps.data?.data || [])
        setProfiles(profs.data?.data || [])
      } catch {}
    }
    loadCatalogs()
  }, [])

  const handleAdd = async () => {
    if (!form.name || !form.email) return
    await api.post('/employees', {
      name: form.name,
      email: form.email,
      phone: form.phone,
      department: form.department,
      job_title: form.job,
      status: 'active'
    })
    enqueueSnackbar('Colaborador criado', { variant: 'success' })
    setForm({ name: '', email: '', role: 'sales', department: '', phone: '' })
    await load()
  }

  const handleInvite = async (email) => {
    try {
      await api.post('/auth/invite', { email })
      enqueueSnackbar('Convite enviado por e-mail (verifique SMTP)', { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || 'Falha ao enviar convite', { variant: 'error' })
    }
  }

  const handleGenerateTemp = async (email) => {
    try {
      const { data } = await api.post('/auth/generate-temp-password', { email })
      enqueueSnackbar(`Usuário: ${data.username} • Senha: ${data.temp_password}`, { variant: 'info', autoHideDuration: 10000 })
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || 'Falha ao gerar senha temporária', { variant: 'error' })
    }
  }

  const handleUpdate = async (emp) => {
    try {
      const payload = {
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        department: emp.department,
        job_title: emp.job_title,
        status: emp.status || 'active'
      }
      await api.put(`/employees/${emp.id}`, payload)
      enqueueSnackbar('Colaborador atualizado', { variant: 'success' })
      await load()
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || 'Falha ao atualizar colaborador', { variant: 'error' })
    }
  }

  const handleDelete = async (emp) => {
    try {
      await api.delete(`/employees/${emp.id}`)
      enqueueSnackbar('Colaborador excluído', { variant: 'info' })
      await load()
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || 'Falha ao excluir colaborador', { variant: 'error' })
    }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Colaboradores</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Novo colaborador</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth type="email" label="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField select fullWidth label="Perfil" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <MenuItem value="admin">Administrador</MenuItem>
              <MenuItem value="manager">Gestor</MenuItem>
              <MenuItem value="sales">Vendas</MenuItem>
              <MenuItem value="technician">Técnico</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField select fullWidth label="Departamento" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              {departments.map((d) => (
                <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField select fullWidth label="Perfil/Cargo" value={form.job || ''} onChange={(e) => setForm({ ...form, job: e.target.value })}>
              {profiles.map((p) => (
                <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField fullWidth label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button variant="contained" onClick={handleAdd} sx={{ height: '100%' }}>Adicionar</Button>
          </Grid>
        </Grid>
      </Paper>
      <Grid container spacing={2}>
        {employees.map((u) => (
          <Grid item xs={12} md={6} key={u.id}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2">{u.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{u.email} • {u.department} • {u.job_title} • {u.phone}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton size="small" color="primary" onClick={() => handleUpdate(u)} title="Editar">
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => handleDelete(u)} title="Excluir">
                  <Delete fontSize="small" />
                </IconButton>
                <Button size="small" variant="outlined" onClick={() => handleInvite(u.email)}>Enviar convite</Button>
                <Button size="small" variant="outlined" color="warning" onClick={() => handleGenerateTemp(u.email)}>Gerar senha temporária</Button>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default EmployeesPage


