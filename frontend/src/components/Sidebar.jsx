import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Collapse
} from '@mui/material'
import {
  Dashboard,
  People,
  PersonAdd,
  Inventory,
  Description,
  CalendarToday,
  Analytics,
  Business,
  Assignment,
  Settings,
  Group,
  ManageAccounts,
  DirectionsCar,
  ExpandLess,
  ExpandMore,
  TrendingUp,
  Security
} from '@mui/icons-material'
import api from '../services/api'

const menuItems = [
  {
    text: 'Dashboard',
    icon: <Dashboard />,
    path: '/dashboard'
  },
  {
    text: 'CRM',
    icon: <Business />,
    path: '/crm',
    roles: ['admin','manager','sales','master']
  },
  {
    text: 'Gestão de Vendas',
    icon: <TrendingUp />,
    path: '/sales',
    roles: ['admin','manager','sales','master']
  },
  {
    text: 'Produtos',
    icon: <Inventory />,
    path: '/products'
  },
  {
    text: 'Propostas',
    icon: <Description />,
    path: '/proposals'
  },
  {
    text: 'Visitas',
    icon: <CalendarToday />,
    path: '/visits'
  },
  {
    text: 'Formulários',
    icon: <Assignment />,
    path: '/forms',
    badge: 'Novo'
  },
  {
    text: 'Analytics',
    icon: <Analytics />,
    path: '/analytics'
  },
  {
    text: 'Pipeline',
    icon: <Business />,
    path: '/pipeline',
    badge: 'Novo'
  },
  {
    text: 'Gestão de Pessoas',
    icon: <ManageAccounts />,
    path: '/people',
    roles: ['admin','manager','master']
  },
  {
    text: 'Gestão de Frota',
    icon: <DirectionsCar />,
    path: '/fleet'
  },
  {
    text: 'Sessões Ativas',
    icon: <Security />,
    path: '/sessions'
  },
  {
    text: 'Configurações',
    icon: <Settings />,
    path: '/settings',
    roles: ['admin','manager','master']
  }
]

import { useAuth } from '../contexts/AuthContext'

const Sidebar = ({ collapsed = false }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState({})
  const [brandLogoUrl, setBrandLogoUrl] = useState('')
  const { user, permissions } = useAuth()

  // Debug logs
  // Renderização do Sidebar com usuário, permissões e itens de menu

  const handleNavigation = (path) => {
    navigate(path)
  }

  const parentPaths = useMemo(() => (
    menuItems.filter((i) => i.children).map((i) => i.path)
  ), [])

  useEffect(() => {
    // Expandir automaticamente o grupo correspondente à rota atual
    const current = parentPaths.find((p) => location.pathname.startsWith(p))
    if (current && !expanded[current]) {
      setExpanded((prev) => ({ ...prev, [current]: true }))
    }
  }, [location.pathname])

  useEffect(() => {
    let revoked = ''
    let mounted = true
    
    const load = async () => {
      try {
        const res = await api.get('/settings/company/logo', { 
          responseType: 'arraybuffer',
          validateStatus: (status) => status === 200 // Só aceitar 200, outros serão erro
        })
        
        if (!mounted) return
        
        const mime = res.headers['content-type'] || 'image/png'
        const url = URL.createObjectURL(new Blob([res.data], { type: mime }))
        revoked = url
        setBrandLogoUrl(url)
      } catch (e) {
        // Logo não configurada - silenciosamente usa o ícone padrão
        // Não logar erro 404 pois é comportamento esperado quando não há logo
      }
    }
    
    load()
    
    return () => {
      mounted = false
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [])

  const toggleParent = (path) => {
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }))
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Box sx={{ p: collapsed ? 1.5 : 3, textAlign: 'center' }}>
        {brandLogoUrl ? (
          <Box sx={{ mb: collapsed ? 0.5 : 1 }}>
            <Box component="img" src={brandLogoUrl} alt="Logo" sx={{ width: collapsed ? 32 : 56, height: collapsed ? 32 : 56, objectFit: 'contain', borderRadius: 1, mx: 'auto', display: 'block' }} />
          </Box>
        ) : (
          <Business sx={{ fontSize: collapsed ? 28 : 40, color: 'primary.main', mb: 1 }} />
        )}
        {!collapsed && (
          <>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              SMART
            </Typography>
          </>
        )}
      </Box>

      <Divider />

      {/* Menu Items */}
      <List sx={{ pt: 2, flex: 1, overflowY: 'auto', pb: 8 }}>
        {/* Renderização com verificação de permissões */}
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path
          // Controle de acesso básico por perfil
          const permKey = (() => {
            if (item.path === '/crm') return 'menu.crm'
            if (item.path === '/products') return 'menu.products'
            if (item.path === '/proposals') return 'menu.proposals'
            if (item.path === '/visits') return 'menu.visits'
            if (item.path === '/forms') return 'menu.forms'
            if (item.path === '/analytics') return 'menu.analytics'
            if (item.path === '/pipeline') return 'menu.pipeline'
            if (item.path === '/people') return 'menu.people'
            if (item.path === '/fleet') return 'menu.fleet'
            if (item.path === '/settings') return 'menu.settings'
            if (item.path === '/sales') return 'menu.sales'
            return null
          })()
          const byRole = !item.roles || (user && item.roles.includes(user.role))
          const byPerm = !permKey || permissions.includes(permKey)
          const allowed = byRole && byPerm
          
          // Verificação de permissão para o item de menu
          
          if (!allowed) {
            console.log(`❌ Menu ${item.text} bloqueado:`, {
              byRole,
              byPerm,
              permKey,
              userRole: user?.role,
              hasPermission: permKey ? permissions.includes(permKey) : 'N/A'
            })
            return null
          }
          

          
          if (!item.children) {
            return (
              <ListItemButton key={item.path} selected={isSelected} onClick={() => handleNavigation(item.path)} sx={{ mx: 1, mb: 0.5, borderRadius: 1, '&.Mui-selected': { backgroundColor: 'rgba(46, 125, 210, 0.12)', '&:hover': { backgroundColor: 'rgba(46, 125, 210, 0.16)' } } }}>
                <ListItemIcon sx={{ minWidth: collapsed ? 40 : 56, color: isSelected ? 'primary.main' : 'inherit' }}>{item.icon}</ListItemIcon>
                {!collapsed && (
                  <ListItemText primary={item.text} sx={{ '& .MuiTypography-root': { fontWeight: isSelected ? 600 : 400, color: isSelected ? 'primary.main' : 'inherit' } }} />
                )}
              </ListItemButton>
            )
          }
          const isParentActive = location.pathname.startsWith(item.path) && item.children
          return (
            <Box key={item.path}>
              <ListItemButton selected={isParentActive} onClick={() => toggleParent(item.path)} sx={{ mx: 1, mb: 0.5, borderRadius: 1, '&.Mui-selected': { backgroundColor: 'rgba(46, 125, 210, 0.12)', '&:hover': { backgroundColor: 'rgba(46, 125, 210, 0.16)' } }, display: 'flex', alignItems: 'center' }}>
                <ListItemIcon sx={{ minWidth: collapsed ? 40 : 56, color: isParentActive ? 'primary.main' : 'inherit' }}>{item.icon}</ListItemIcon>
                {!collapsed && (
                  <>
                    <ListItemText primary={item.text} sx={{ '& .MuiTypography-root': { fontWeight: isParentActive ? 600 : 400, color: isParentActive ? 'primary.main' : 'inherit' } }} />
                    {expanded[item.path] ? <ExpandLess sx={{ ml: 'auto' }} /> : <ExpandMore sx={{ ml: 'auto' }} />}
                  </>
                )}
              </ListItemButton>
              {!collapsed && (
                <Collapse in={!!expanded[item.path]} timeout="auto" unmountOnExit>
                  {item.children?.map((child) => {
                    const childKey = (() => {
                      if (child.path === '/crm/leads') return 'menu.crm.leads'
                      if (child.path === '/crm/clients') return 'menu.crm.clients'
                      if (child.path === '/people/teams') return 'menu.people.teams'
                      if (child.path === '/people/employees') return 'menu.people.employees'
                      if (child.path === '/settings?tab=integrations') return 'menu.settings.integrations'
                      if (child.path === '/settings?tab=permissions') return 'menu.settings.permissions'
                      return null
                    })()
                    const childSelected = (() => {
                      if (child.path.startsWith('/settings')) {
                        const target = new URLSearchParams(child.path.split('?')[1] || '')
                        return location.pathname === '/settings' && new URLSearchParams(location.search).get('tab') === target.get('tab')
                      }
                      if (child.path.startsWith('/visits/')) {
                        return location.pathname === child.path
                      }
                      if (child.path === '/visits') {
                        return location.pathname === '/visits'
                      }
                      return location.pathname === child.path
                    })()
                    if (childKey && !permissions.includes(childKey)) return null
                    return (
                      <ListItemButton key={child.path} selected={childSelected} onClick={() => handleNavigation(child.path)} sx={{ mx: 2.5, mb: 0.5, borderRadius: 1, '&.Mui-selected': { backgroundColor: 'rgba(46, 125, 210, 0.12)', '&:hover': { backgroundColor: 'rgba(46, 125, 210, 0.16)' } } }}>
                        <ListItemIcon sx={{ minWidth: 36, color: childSelected ? 'primary.main' : 'inherit' }}>{item.icon}</ListItemIcon>
                        <ListItemText primary={child.text} sx={{ '& .MuiTypography-root': { fontWeight: childSelected ? 600 : 400, color: isSelected ? 'primary.main' : 'inherit' } }} />
                      </ListItemButton>
                    )
                  })}
                </Collapse>
              )}
            </Box>
          )
        })}
      </List>

      {/* Company Info fixo ao rodapé, sem sobrepor o menu */}
      <Box sx={{ mt: 'auto', px: collapsed ? 1.5 : 2, pb: 2 }}>
        <Divider sx={{ mb: 1 }} />
        {!collapsed && (
          <>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              Clean & Health Soluções
            </Typography>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              Produtos de Higiene e Limpeza
            </Typography>
          </>
        )}
      </Box>
    </Box>
  )
}

export default Sidebar
