import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const RequirePermission = ({ anyOf = [], allOf = [], children }) => {
  const { isAuthenticated, isLoading, permissions } = useAuth()
  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />

  const hasAny = anyOf.length === 0 || anyOf.some((p) => permissions.includes(p))
  const hasAll = allOf.length === 0 || allOf.every((p) => permissions.includes(p))
  if (hasAny && hasAll) return children
  return <Navigate to="/dashboard" replace />
}

export default RequirePermission








