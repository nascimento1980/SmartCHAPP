import React, { useEffect, useMemo, useState } from 'react'
import { Box, Tabs, Tab } from '@mui/material'
import LeadsPage from './LeadsPage'
import ClientsPage from './ClientsPage'
import { useAuth } from '../contexts/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'

const CRMPage = () => {
  const { permissions } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const allowedTabs = useMemo(() => [
    permissions.includes('menu.crm.leads') && { key: 'leads', label: 'Leads', component: <LeadsPage /> },
    permissions.includes('menu.crm.clients') && { key: 'clients', label: 'Clientes', component: <ClientsPage /> }
  ].filter(Boolean), [permissions])

  const getTabFromQuery = () => new URLSearchParams(location.search).get('tab') || (allowedTabs[0]?.key || 'leads')
  const [tab, setTab] = useState(getTabFromQuery())

  useEffect(() => { setTab(getTabFromQuery()) }, [location.search, allowedTabs.length])

  const handleChange = (e, newVal) => {
    setTab(newVal)
    const params = new URLSearchParams(location.search)
    params.set('tab', newVal)
    navigate(`/crm?${params.toString()}`)
  }

  const current = allowedTabs.find(t => t.key === tab) || allowedTabs[0]

  return (
    <Box>
      <Tabs value={tab} onChange={handleChange} sx={{ mb: 2 }}>
        {allowedTabs.map(t => <Tab key={t.key} value={t.key} label={t.label} />)}
      </Tabs>
      <Box>
        {current?.component || null}
      </Box>
    </Box>
  )
}

export default CRMPage








