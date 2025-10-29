import React, { createContext, useContext, useState, useEffect } from 'react'
import { useSnackbar } from 'notistack'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [permissions, setPermissions] = useState([])
  const { enqueueSnackbar } = useSnackbar()

  const isAuthenticated = !!user

  // Verificar se há token armazenado ao carregar a aplicação
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token')
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          const response = await api.get('/auth/me')
          const baseUser = response.data.user
          try {
            const perms = await api.get('/permissions/me')
            const permList = perms.data?.permissions || []
            setPermissions(permList)
            setUser({ ...baseUser, permissions: permList })
          } catch (error) {
            // Silenciar erro de permissões se autenticação funcionou
            setUser(baseUser)
          }
        }
      } catch (error) {
        // Apenas log do erro se não for erro comum de token inválido/ausente
        if (error.response?.status !== 401) {
          console.error('Erro ao verificar autenticação:', error)
        }
        // Limpar dados de autenticação inválidos
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        delete api.defaults.headers.common['Authorization']
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (loginValue, password) => {
    try {
      setIsLoading(true)
      // Tentar login com email
      const response = await api.post('/auth/login', { 
        email: loginValue, 
        password 
      })
      
      if (response.data?.require_password_change) {
        return { success: false, error: 'Troca de senha obrigatória', requirePasswordChange: true }
      }
      
      const { user: userData, token } = response.data
      
      // Armazenar token
      localStorage.setItem('token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      try {
        const perms = await api.get('/permissions/me')
        const permList = perms.data?.permissions || []
        setPermissions(permList)
        setUser({ ...userData, permissions: permList })
      } catch (error) {
        // Silenciar erro de permissões se autenticação funcionou
        setUser(userData)
      }
      
      enqueueSnackbar(`Bem-vindo, ${userData.name}!`, { 
        variant: 'success' 
      })
      
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erro ao fazer login'
      enqueueSnackbar(errorMessage, { variant: 'error' })
      return { success: false, error: errorMessage, requirePasswordChange: error.response?.data?.require_password_change }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
    enqueueSnackbar('Logout realizado com sucesso', { variant: 'info' })
  }

  const updateUser = (userData) => {
    setUser(userData)
  }

  const refreshPermissions = async () => {
    try {
      console.log('🔄 Forçando refresh das permissões...')
      const perms = await api.get('/permissions/me')
      const permList = perms.data?.permissions || []
      console.log('🔑 Novas permissões carregadas no refresh:', {
        total: permList.length,
        permissoes: permList.slice(0, 10),
        userRole: user?.role
      })
      setPermissions(permList)
      if (user) {
        setUser({ ...user, permissions: permList })
      }
    } catch (error) {
      console.error('❌ Erro ao fazer refresh das permissões:', error)
    }
  }

  const value = {
    user,
    permissions,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateUser,
    refreshPermissions
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
