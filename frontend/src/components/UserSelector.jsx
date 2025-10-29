import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Avatar,
  Typography,
  Checkbox,
  ListItemText,
  CircularProgress,
  Alert,
  AlertTitle,
  FormHelperText
} from '@mui/material';
import { PersonAdd, Group } from '@mui/icons-material';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../contexts/AuthContext';

/**
 * Componente para seleção de usuários para convites
 */
const UserSelector = ({
  selectedUsers = [],
  onSelectionChange,
  label = "Convidar usuários",
  helperText = "Selecione usuários para receber convites automáticos",
  multiple = true,
  excludeCurrentUser = true,
  disabled = false,
  size = "medium",
  fullWidth = true
}) => {
  const { user: currentUser } = useAuth();
  const { users, loading, error, fetchAvailableUsers } = useUsers();

  // Buscar usuários disponíveis (excluindo usuário atual se necessário)
  React.useEffect(() => {
    if (excludeCurrentUser && currentUser?.id) {
      fetchAvailableUsers(currentUser.id);
    } else {
      // Se não estiver excluindo usuário atual, buscar todos os usuários disponíveis
      fetchAvailableUsers();
    }
  }, [currentUser?.id, excludeCurrentUser, fetchAvailableUsers]);

  /**
   * Renderiza o valor selecionado (chips para múltipla seleção)
   */
  const renderValue = (selected) => {
    // Garantir que selected seja sempre um array
    const selectedArray = Array.isArray(selected) ? selected : [];
    
    if (!multiple) {
      const selectedUser = users.find(user => user.id === selected);
      return selectedUser ? selectedUser.name : '';
    }

    if (selectedArray.length === 0) {
      return <em style={{ color: '#666' }}>Nenhum usuário selecionado</em>;
    }

    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {selectedArray.map((userId) => {
          const user = users.find(u => u.id === userId);
          return user ? (
            <Chip
              key={userId}
              label={user.name}
              size="small"
              avatar={
                <Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
              }
              onDelete={() => {
                const newSelected = selectedArray.filter(id => id !== userId);
                onSelectionChange(newSelected);
              }}
              sx={{ maxWidth: 150 }}
            />
          ) : null;
        })}
      </Box>
    );
  };

  /**
   * Renderiza cada opção do menu
   */
  const renderMenuItem = (user) => (
    <MenuItem key={user.id} value={user.id}>
      {multiple && (
        <Checkbox checked={selectedUsers.indexOf(user.id) > -1} />
      )}
      <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.8rem' }}>
        {user.name.charAt(0).toUpperCase()}
      </Avatar>
      <ListItemText
        primary={user.name}
        secondary={`${user.email} • ${user.role || 'Usuário'}`}
        primaryTypographyProps={{ fontSize: '0.9rem' }}
        secondaryTypographyProps={{ fontSize: '0.75rem' }}
      />
    </MenuItem>
  );

  // Função para lidar com mudanças de seleção
  const handleSelectionChange = (event) => {
    const value = event.target.value;
    // Garantir que o valor seja sempre um array para seleção múltipla
    const newValue = multiple ? (Array.isArray(value) ? value : [value]) : value;
    onSelectionChange(newValue);
  };

  // Estados de loading e erro
  
  // Renderizar o componente sempre, mesmo com erros de permissão
  // NOTA: Usuários com role sales podem convidar outros para compromissos
  return (
    <FormControl fullWidth={fullWidth} size={size} disabled={disabled}>
      <InputLabel id="user-selector-label">{label}</InputLabel>
      <Select
        labelId="user-selector-label"
        multiple={multiple}
        value={selectedUsers}
        onChange={handleSelectionChange}
        label={label}
        renderValue={renderValue}
      >
        {loading ? (
          <MenuItem disabled>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            Carregando usuários...
          </MenuItem>
        ) : error ? (
          <MenuItem disabled>
            <Alert severity="warning" sx={{ width: '100%' }}>
              <AlertTitle>Funcionalidade Limitada</AlertTitle>
              <Typography variant="body2">
                Não foi possível carregar a lista completa de usuários.
                <br />
                <strong>Mas você ainda pode convidar usuários conhecidos!</strong>
              </Typography>
            </Alert>
          </MenuItem>
        ) : users.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              Nenhum usuário disponível para convite
            </Typography>
          </MenuItem>
        ) : (
          users.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Typography variant="body1">{user.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.email} • {user.role} • {user.department || 'Departamento não informado'}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Select>
      <FormHelperText>
        {error ? 
          'Funcionalidade de convite disponível para todos os usuários' : 
          helperText
        }
      </FormHelperText>
    </FormControl>
  );
};

export default UserSelector;
