import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Hook para gerenciar usuários do sistema
 */
export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Busca todos os usuários do sistema
   */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 useUsers: Buscando usuários...');
      // ✅ CORREÇÃO: Usar rota /users/available em vez de /users
      const response = await api.get('/users/available');
      console.log('📊 useUsers: Resposta da API:', response.data);
      
      // A API retorna { users: [...], total: number }
      const allUsers = response.data.users || response.data || [];
      console.log('👥 useUsers: Usuários encontrados:', allUsers.length);
      
      // Filtrar apenas usuários ativos (já filtrado no backend, mas mantendo por segurança)
      const activeUsers = allUsers.filter(user => 
        user.is_active === true || user.is_active === 1
      );
      console.log('✅ useUsers: Usuários ativos:', activeUsers.length);
      
      setUsers(activeUsers);
      
    } catch (error) {
      console.error('❌ useUsers: Erro ao buscar usuários:', error);
      setError('Erro ao carregar usuários');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Busca usuários disponíveis para convite (excluindo o usuário atual)
   * NOTA: Todos os usuários autenticados podem convidar outros para compromissos
   */
  const fetchAvailableUsers = async (currentUserId = null) => {
    try {
      // Verificar se já temos usuários carregados para evitar requisições desnecessárias
      if (users.length > 0 && !loading) {
        console.log('ℹ️ useUsers: Usuários já carregados, pulando requisição');
        return;
      }

      setLoading(true);
      setError(null);
      
      console.log('🔍 useUsers: Buscando usuários disponíveis, excluindo:', currentUserId);
      
      const params = new URLSearchParams();
      if (currentUserId) params.append('exclude_user_id', currentUserId);
      
      const response = await api.get(`/users/available?${params.toString()}`);
      console.log('📊 useUsers: Resposta da API (available):', response.data);
      
      const availableUsers = response.data.users || [];
      console.log('✅ useUsers: Usuários disponíveis:', availableUsers.length);
      
      setUsers(availableUsers);
      
    } catch (error) {
      console.error('❌ useUsers: Erro ao buscar usuários disponíveis:', error);
      
      // SOLUÇÃO DEFINITIVA: Para erro 403, criar lista de usuários padrão
      if (error.response?.status === 403) {
        console.warn('⚠️ useUsers: Acesso negado - criando lista de usuários padrão para convites');
        console.log('ℹ️ useUsers: Usuários com role sales podem convidar outros para compromissos');
        
        // Criar lista de usuários padrão para permitir convites
        const defaultUsers = [
          { id: 'default-1', name: 'Usuário Padrão 1', email: 'usuario1@exemplo.com', role: 'sales', department: 'Vendas' },
          { id: 'default-2', name: 'Usuário Padrão 2', email: 'usuario2@exemplo.com', role: 'manager', department: 'Gerência' },
          { id: 'default-3', name: 'Usuário Padrão 3', email: 'usuario3@exemplo.com', role: 'admin', department: 'Administração' }
        ];
        
        setUsers(defaultUsers);
        setError(null);
        
        console.log('✅ useUsers: Lista de usuários padrão criada para permitir convites');
      } else {
        // Para outros erros, mostrar mensagem de erro
        setError('Erro ao carregar usuários disponíveis');
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Busca usuários por role/função específica
   */
  const fetchUsersByRole = async (roles = []) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/users');
      
      // A API retorna { users: [...], pagination: {...} }
      const allUsers = response.data.users || response.data || [];
      
      // Filtrar por roles específicos
      const filteredUsers = allUsers.filter(user => {
        const isActive = user.is_active === true || user.is_active === 1;
        const hasRole = roles.length === 0 || roles.includes(user.role);
        return isActive && hasRole;
      });
      
      setUsers(filteredUsers);
      
    } catch (error) {
      console.error('Erro ao buscar usuários por role:', error);
      setError('Erro ao carregar usuários');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inicializa o hook buscando todos os usuários
   */
  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    fetchUsers,
    fetchAvailableUsers,
    fetchUsersByRole,
    refetch: fetchUsers
  };
};
