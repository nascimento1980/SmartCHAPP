import React, { useEffect, useState } from 'react'
import { Box, Grid, Paper, Typography, FormGroup, FormControlLabel, Checkbox, Button, Divider, MenuItem, TextField, Stack } from '@mui/material'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useSnackbar } from 'notistack'

// Mapa hierárquico para exibição amigável (não usar nomes de BD)
const PERMISSION_GROUPS = [
  {
    groupKey: 'menus',
    label: 'Acesso a Menus',
    items: [
      { key: 'menu.crm', label: 'Menu CRM', className: 'perm perm-menu perm-menu-crm' },
      { key: 'menu.crm.leads', label: 'Aba CRM • Leads', className: 'perm perm-tab perm-crm perm-crm-leads' },
      { key: 'menu.crm.clients', label: 'Aba CRM • Clientes', className: 'perm perm-tab perm-crm perm-crm-clients' },
      { key: 'menu.pipeline', label: 'Menu Pipeline', className: 'perm perm-menu perm-menu-pipeline' },
      { key: 'menu.visits', label: 'Menu Visitas', className: 'perm perm-menu perm-menu-visits' },
      { key: 'menu.forms', label: 'Menu Formulários', className: 'perm perm-menu perm-menu-forms' },
      { key: 'menu.products', label: 'Menu Produtos', className: 'perm perm-menu perm-menu-products' },
      { key: 'menu.proposals', label: 'Menu Propostas', className: 'perm perm-menu perm-menu-proposals' },
      { key: 'menu.analytics', label: 'Menu Analytics', className: 'perm perm-menu perm-menu-analytics' },
      { key: 'menu.people', label: 'Menu Gestão de Pessoas', className: 'perm perm-menu perm-menu-people' },
      { key: 'menu.people.teams', label: 'Aba Pessoas • Equipes', className: 'perm perm-tab perm-people perm-people-teams' },
      { key: 'menu.people.employees', label: 'Aba Pessoas • Colaboradores', className: 'perm perm-tab perm-people perm-people-employees' },
      { key: 'menu.settings', label: 'Menu Configurações', className: 'perm perm-menu perm-menu-settings' },
      { key: 'menu.settings.users', label: 'Aba Configurações • Usuários', className: 'perm perm-tab perm-settings perm-settings-users' },
      { key: 'menu.settings.integrations', label: 'Aba Configurações • Integrações', className: 'perm perm-tab perm-settings perm-settings-integrations' },
      { key: 'menu.settings.permissions', label: 'Aba Configurações • Permissões', className: 'perm perm-tab perm-settings perm-settings-permissions' }
    ]
  },
  {
    groupKey: 'leads',
    label: 'Leads (Ações)',
    items: [
      { key: 'leads.view', label: 'Leads • Visualizar', className: 'perm perm-action perm-leads perm-leads-view' },
      { key: 'leads.create', label: 'Leads • Criar', className: 'perm perm-action perm-leads perm-leads-create' },
      { key: 'leads.edit', label: 'Leads • Editar', className: 'perm perm-action perm-leads perm-leads-edit' },
      { key: 'leads.delete', label: 'Leads • Excluir', className: 'perm perm-action perm-leads perm-leads-delete' }
    ]
  },
  {
    groupKey: 'clients',
    label: 'Clientes (Ações)',
    items: [
      { key: 'clients.view', label: 'Clientes • Visualizar', className: 'perm perm-action perm-clients perm-clients-view' },
      { key: 'clients.create', label: 'Clientes • Criar', className: 'perm perm-action perm-clients perm-clients-create' },
      { key: 'clients.edit', label: 'Clientes • Editar', className: 'perm perm-action perm-clients perm-clients-edit' },
      { key: 'clients.delete', label: 'Clientes • Excluir', className: 'perm perm-action perm-clients perm-clients-delete' }
    ]
  },
  {
    groupKey: 'forms',
    label: 'Formulários (Ações)',
    items: [
      { key: 'forms.view', label: 'Formulários • Visualizar', className: 'perm perm-action perm-forms perm-forms-view' },
      { key: 'forms.submit', label: 'Formulários • Enviar/Registrar', className: 'perm perm-action perm-forms perm-forms-submit' }
    ]
  },
  {
    groupKey: 'settings',
    label: 'Configurações (Ações)',
    items: [
      { key: 'settings.update', label: 'Configurações • Atualizar dados da empresa', className: 'perm perm-action perm-settings perm-settings-update' },
      { key: 'integrations.update', label: 'Configurações • Atualizar integrações', className: 'perm perm-action perm-settings perm-settings-integrations-update' },
      { key: 'permissions.update', label: 'Configurações • Atualizar permissões', className: 'perm perm-action perm-settings perm-settings-permissions-update' }
    ]
  }
]

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gestor' },
  { value: 'sales', label: 'Vendas' },
  { value: 'technician', label: 'Técnico' }
]

const PermissionsPanel = () => {
  const { enqueueSnackbar } = useSnackbar()
  const { refreshPermissions } = useAuth()
  const [role, setRole] = useState('manager')
  const [assign, setAssign] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async (r) => {
    const { data } = await api.get('/permissions')
    const p = (data?.data || []).find((x) => x.role === r)
    setAssign(p?.permissions || [])
  }

  useEffect(() => { load(role) }, [role])

  const toggle = (p) => {
    setAssign((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p])
  }

  const save = async () => {
    try {
      setLoading(true)
      await api.put('/permissions', { role, permissions: assign })
      await refreshPermissions()
      enqueueSnackbar('Permissões salvas', { variant: 'success' })
    } catch (e) {
      enqueueSnackbar('Falha ao salvar permissões', { variant: 'error' })
    } finally { setLoading(false) }
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle1">Perfil</Typography>
        <TextField select size="small" value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
        </TextField>
        <Button variant="contained" onClick={save} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
      </Stack>
      <Divider sx={{ mb: 2 }} />
      {PERMISSION_GROUPS.map((group) => (
        <Box key={group.groupKey} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{group.label}</Typography>
          <Grid container spacing={2}>
            {group.items.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.key}>
                <FormGroup>
                  <FormControlLabel
                    className={item.className}
                    control={
                      <Checkbox
                        checked={assign.includes(item.key)}
                        onChange={() => toggle(item.key)}
                      />
                    }
                    label={item.label}
                  />
                </FormGroup>
              </Grid>
            ))}
          </Grid>
          <Divider sx={{ mt: 2 }} />
        </Box>
      ))}
    </Paper>
  )
}

export default PermissionsPanel


