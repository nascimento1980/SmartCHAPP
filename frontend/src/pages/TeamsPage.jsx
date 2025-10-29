import React, { useEffect, useState } from 'react'
import { Box, Grid, Paper, TextField, Button, Typography, Divider, MenuItem, Chip } from '@mui/material'
import api from '../services/api'

const TeamsPage = () => {
  const [teams, setTeams] = useState([])
  const [newTeam, setNewTeam] = useState({ name: '', description: '', segment: '', color: '#1976D2' })
  const [catalogSegments, setCatalogSegments] = useState([])

  useEffect(() => {
    const loadSegments = async () => {
      try {
        const { data } = await api.get('/settings/catalogs/segments')
        setCatalogSegments(data.data || [])
      } catch {}
    }
    loadSegments()
  }, [])
  const [members, setMembers] = useState([]) // opcional: preencher de /api/users

  const handleAddTeam = () => {
    if (!newTeam.name) return
    setTeams((prev) => [...prev, { id: Date.now().toString(), ...newTeam, members: [] }])
    setNewTeam({ name: '', description: '', segment: 'geral', color: '#1976D2' })
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Equipes</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Nova equipe</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Nome da equipe" value={newTeam.name} onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth select label="Segmento" value={newTeam.segment} onChange={(e) => setNewTeam({ ...newTeam, segment: e.target.value })}>
              {catalogSegments.map((s) => (
                <MenuItem key={s.id} value={s.code || s.name}>{s.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField fullWidth type="color" label="Cor" value={newTeam.color} onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })} />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button variant="contained" onClick={handleAddTeam} sx={{ height: '100%' }}>Adicionar</Button>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={2} label="Descrição" value={newTeam.description} onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })} />
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2}>
        {teams.map((t) => (
          <Grid item xs={12} md={6} key={t.id}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span style={{ display: 'inline-block', width: 12, height: 12, background: t.color, borderRadius: 2 }} />
                {t.name} — <Typography component="span" variant="caption" color="text.secondary">{t.segment}</Typography>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t.description}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption">Membros</Typography>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {t.members.length === 0 && (
                  <Typography variant="body2" color="text.secondary">Sem membros</Typography>
                )}
                {t.members.map((m) => (
                  <Chip key={m.id} label={m.name} size="small" />
                ))}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default TeamsPage


