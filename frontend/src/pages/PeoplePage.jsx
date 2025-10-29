import React, { useEffect, useMemo, useState } from 'react'
import { Box, Tabs, Tab } from '@mui/material'
import EmployeesPage from './EmployeesPage'
import UserManagementPanel from '../components/UserManagementPanel'
import EmployeeUserIntegration from '../components/EmployeeUserIntegration'
import { useAuth } from '../contexts/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'

const PeoplePage = () => {
  const { permissions } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const allowedTabs = useMemo(() => [
    permissions.includes('menu.people.employees') && { key: 'employees', label: 'Colaboradores', component: <EmployeesPage /> },
    permissions.includes('users.view') && { key: 'users', label: 'Usuários', component: <UserManagementPanel /> },
    permissions.includes('users.view') && { key: 'integration', label: 'Integração', component: <EmployeeUserIntegration /> }
  ].filter(Boolean), [permissions])

  const getTabFromQuery = () => new URLSearchParams(location.search).get('tab') || (allowedTabs[0]?.key || 'employees')
  const [tab, setTab] = useState(getTabFromQuery())

  useEffect(() => { setTab(getTabFromQuery()) }, [location.search, allowedTabs.length])

  const handleChange = (e, newVal) => {
    setTab(newVal)
    const params = new URLSearchParams(location.search)
    params.set('tab', newVal)
    navigate(`/people?${params.toString()}`)
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

export default PeoplePage


