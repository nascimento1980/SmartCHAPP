import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'

import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LeadsPage from './pages/LeadsPage'
import ClientsPage from './pages/ClientsPage'
import ProductsPage from './pages/ProductsPage'
import ProposalsPage from './pages/ProposalsPage'
import VisitsManagementPage from './pages/VisitsManagementPage'
import FleetPage from './pages/FleetPage'
import AnalyticsPage from './pages/AnalyticsPage'
import PipelinePage from './pages/PipelinePage'
import FormsPage from './pages/FormsPage'
import LoadingScreen from './components/LoadingScreen'
import SettingsPage from './pages/SettingsPage'
import TeamsPage from './pages/TeamsPage'
import EmployeesPage from './pages/EmployeesPage'
import FirstAccessPage from './pages/FirstAccessPage'
import RequireRole from './components/RequireRole'
import RequirePermission from './components/RequirePermission'
import CRMPage from './pages/CRMPage'
import PeoplePage from './pages/PeoplePage'

import SessionManagement from './components/SessionManagement'
import SessionNotifications from './components/SessionNotifications'
import useSSE from './hooks/useSSE'

function App() {
  const { isAuthenticated, isLoading } = useAuth()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  useSSE(isAuthenticated ? token : null)

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/first-access" element={<FirstAccessPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/leads" element={<RequirePermission anyOf={["menu.crm.leads"]}><LeadsPage /></RequirePermission>} />
        <Route path="/crm" element={<RequirePermission anyOf={["menu.crm"]}><CRMPage /></RequirePermission>} />
        <Route path="/products" element={<RequirePermission anyOf={["menu.products"]}><ProductsPage /></RequirePermission>} />
        <Route path="/proposals" element={<RequirePermission anyOf={["menu.proposals"]}><ProposalsPage /></RequirePermission>} />
        <Route path="/visits" element={<RequirePermission anyOf={["menu.visits"]}><VisitsManagementPage /></RequirePermission>} />
        <Route path="/fleet" element={<RequirePermission anyOf={["menu.fleet"]}><FleetPage /></RequirePermission>} />
        <Route path="/analytics" element={<RequirePermission anyOf={["menu.analytics"]}><AnalyticsPage /></RequirePermission>} />
        <Route path="/pipeline" element={<RequirePermission anyOf={["menu.pipeline"]}><PipelinePage /></RequirePermission>} />
        <Route path="/forms" element={<RequirePermission anyOf={["menu.forms"]}><FormsPage /></RequirePermission>} />
        <Route path="/settings" element={<RequireRole roles={["admin","manager","master"]}><SettingsPage /></RequireRole>} />
        <Route path="/people" element={<RequireRole roles={["admin","manager","master"]}><PeoplePage /></RequireRole>} />
        <Route path="/sessions" element={<SessionManagement />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      
      
      
      
      {/* Notificações de sessão */}
      <SessionNotifications />
    </Layout>
  )
}
export default App
