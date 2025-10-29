import React, { useEffect, useRef } from 'react';
import { useSnackbar, closeSnackbar } from 'notistack';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const SessionNotifications = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const lastSessionCountRef = useRef(0);
  const isFirstCheckRef = useRef(true);
  
  useEffect(() => {
    if (!user) return;

    const checkForNewSessions = async () => {
      try {
        const response = await api.get('/sessions/my/stats');
        const currentActiveSessionsCount = response.data.active_sessions || 0;
        
        // Se não é a primeira verificação e o número de sessões aumentou
        if (!isFirstCheckRef.current && currentActiveSessionsCount > lastSessionCountRef.current) {
          const newSessionsCount = currentActiveSessionsCount - lastSessionCountRef.current;
          
          if (newSessionsCount > 0) {
            // Buscar detalhes das sessões mais recentes
            try {
              const sessionsResponse = await api.get('/sessions/my');
              const sessions = sessionsResponse.data.sessions || [];
              
              // Filtrar sessões criadas nos últimos 2 minutos
              const recentSessions = sessions.filter(session => {
                if (session.is_current) return false; // Ignorar sessão atual
                
                const createdAt = new Date(session.created_at);
                const now = new Date();
                const diffMinutes = (now - createdAt) / (1000 * 60);
                
                return diffMinutes <= 2;
              });
              
              // Notificar sobre novas sessões
              recentSessions.forEach(session => {
                const deviceInfo = session.device_info;
                const deviceName = deviceInfo 
                  ? `${deviceInfo.browser?.name || 'Navegador'} em ${deviceInfo.os?.name || 'Sistema'}`
                  : 'Dispositivo desconhecido';
                
                const time = format(new Date(session.created_at), 'HH:mm', { locale: ptBR });
                
                enqueueSnackbar(
                  `🔐 Nova sessão detectada: ${deviceName} às ${time}`,
                  { 
                    variant: 'info',
                    autoHideDuration: 8000,
                    action: (snackbarId) => (
                      <button
                        onClick={() => {
                          window.open('/sessions', '_blank');
                          closeSnackbar(snackbarId);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0,
                          margin: 0
                        }}
                      >
                        Ver Detalhes
                      </button>
                    )
                  }
                );
              });
              
            } catch (error) {
              console.warn('Erro ao buscar detalhes das sessões:', error);
            }
          }
        }
        
        lastSessionCountRef.current = currentActiveSessionsCount;
        
        // Após a primeira verificação, definir como false
        if (isFirstCheckRef.current) {
          isFirstCheckRef.current = false;
        }
        
      } catch (error) {
        console.warn('Erro ao verificar novas sessões:', error);
      }
    };

    // Verificar imediatamente
    checkForNewSessions();
    
    // Verificar a cada 30 segundos
    const interval = setInterval(checkForNewSessions, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, [user, enqueueSnackbar]);

  // Este componente não renderiza nada visível
  return null;
};

export default SessionNotifications;
