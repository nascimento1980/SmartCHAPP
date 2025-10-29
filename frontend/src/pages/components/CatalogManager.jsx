import React, { useEffect, useState } from 'react'
import { Grid, TextField, Button, Paper, Stack, Typography, IconButton } from '@mui/material'
import { Edit, Delete, Save, Close } from '@mui/icons-material'
import api from '../../services/api'

const CatalogManager = ({ type, labels = { add: 'Adicionar', placeholder: 'Nome' } }) => {
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')

  const load = async () => {
    const { data } = await api.get(`/settings/catalogs/${type}?includeUsage=1`)
    setItems(data.data || [])
  }

  useEffect(() => { load() }, [type])

  const add = async () => {
    if (!name.trim()) return
    const payload = type === 'segments' ? { name, code: code || undefined } : { name }
    await api.post(`/settings/catalogs/${type}`, payload)
    setName('')
    setCode('')
    await load()
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditName(item.name)
    setEditCode(item.code || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditCode('')
  }

  const saveEdit = async () => {
    if (!editingId) return
    const payload = type === 'segments' ? { name: editName, code: editCode || null, update_references: true } : { name: editName, update_references: true }
    await api.put(`/settings/catalogs/${type}/${editingId}`, payload)
    cancelEdit()
    await load()
  }

  const remove = async (id) => {
    await api.delete(`/settings/catalogs/${type}/${id}`)
    await load()
  }

  // integração direta: sem importação manual

  return (
    <>
      <Grid item xs={12} md={6}>
        <Stack direction="row" spacing={1}>
          <TextField fullWidth placeholder={labels.placeholder} value={name} onChange={(e) => setName(e.target.value)} />
          {type === 'segments' && (
            <TextField placeholder="Código (opcional)" value={code} onChange={(e) => setCode(e.target.value)} sx={{ width: 200 }} />
          )}
          <Button variant="contained" onClick={add}>{labels.add}</Button>
        </Stack>
      </Grid>
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Nenhum registro</Typography>
          ) : items.map((i) => (
            <Stack key={i.id} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              {editingId === i.id ? (
                <>
                  <TextField size="small" value={editName} onChange={(e) => setEditName(e.target.value)} sx={{ width: 280 }} />
                  {type === 'segments' && (
                    <TextField size="small" placeholder="Código" value={editCode} onChange={(e) => setEditCode(e.target.value)} sx={{ width: 160 }} />
                  )}
                  <IconButton size="small" color="primary" onClick={saveEdit}><Save fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={cancelEdit}><Close fontSize="small" /></IconButton>
                </>
              ) : (
                <>
                  <Typography variant="body2" sx={{ flex: 1 }}>{i.name}{i.code ? ` — ${i.code}` : ''} {typeof i.usageCount === 'number' ? `(${i.usageCount} uso${i.usageCount === 1 ? '' : 's'})` : ''}</Typography>
                  <IconButton size="small" onClick={() => startEdit(i)}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(i.id)} disabled={(i.usageCount || 0) > 0}><Delete fontSize="small" /></IconButton>
                </>
              )}
            </Stack>
          ))}
        </Paper>
      </Grid>
    </>
  )
}

export default CatalogManager


