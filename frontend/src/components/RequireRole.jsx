import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const RequireRole = ({ roles, children }) => {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!roles || roles.includes(user?.role)) return children
  return <Navigate to="/dashboard" replace />
}

export default RequireRole








