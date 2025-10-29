import { useEffect, useRef } from 'react';

export const useAutoCacheCleanup = (syncKey, cleanupInterval = 300000) => { // 5 minutos por padrão
  const lastCleanupRef = useRef(Date.now());
  const intervalRef = useRef(null);

  useEffect(() => {
    // Limpar cache quando syncKey mudar (visita excluída)
    if (syncKey > 0) {
      // Limpar cache do localStorage
      const keysToClean = [
        'visits_cache',
        'planning_cache',
        'calendar_cache',
        'user_preferences_cache'
      ];
      
      keysToClean.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          // Silenciar erros em produção
        }
      });

      // Limpar cache do sessionStorage
      try {
        sessionStorage.clear();
      } catch (error) {
        // Silenciar erros em produção
      }

      // Limpar cache do React Query (se disponível)
      if (window.__REACT_QUERY_CACHE__) {
        try {
          window.__REACT_QUERY_CACHE__.clear();
        } catch (error) {
          // Silenciar erros em produção
        }
      }

      lastCleanupRef.current = Date.now();
    }
  }, [syncKey]);

  useEffect(() => {
    // Configurar limpeza automática periódica
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastCleanup = now - lastCleanupRef.current;
      
      if (timeSinceLastCleanup >= cleanupInterval) {
        // Limpar caches antigos
        try {
          // Limpar localStorage de itens antigos (mais de 1 hora)
          const oneHourAgo = now - (60 * 60 * 1000);
          Object.keys(localStorage).forEach(key => {
            try {
              const item = localStorage.getItem(key);
              if (item) {
                const parsed = JSON.parse(item);
                if (parsed.timestamp && parsed.timestamp < oneHourAgo) {
                  localStorage.removeItem(key);
                }
              }
            } catch (error) {
              // Se não conseguir fazer parse, remover (provavelmente não é JSON válido)
              localStorage.removeItem(key);
            }
          });
        } catch (error) {
          // Silenciar erros em produção
        }
        
        lastCleanupRef.current = now;
      }
    }, 60000); // Verificar a cada minuto

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [cleanupInterval]);

  // Função para forçar limpeza manual
  const forceCleanup = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      if (window.__REACT_QUERY_CACHE__) {
        window.__REACT_QUERY_CACHE__.clear();
      }
      
      lastCleanupRef.current = Date.now();
    } catch (error) {
      // Silenciar erros em produção
    }
  };

  return { forceCleanup };
};
