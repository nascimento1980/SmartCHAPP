import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAutoCacheCleanup } from '../hooks/useAutoCacheCleanup';

const VisitSyncContext = createContext();

export const useVisitSync = () => {
  const context = useContext(VisitSyncContext);
  
  if (!context) {
    throw new Error('useVisitSync deve ser usado dentro de VisitSyncProvider');
  }
  
  return context;
};

export const VisitSyncProvider = ({ children }) => {
  const [syncKey, setSyncKey] = useState(0);
  const [deletedVisits, setDeletedVisits] = useState(new Set());
  
  // Hook de limpeza automática de cache
  const { forceCleanup } = useAutoCacheCleanup(syncKey);

  // Função para notificar exclusão de visita
  const notifyVisitDeleted = useCallback((visitId) => {
    setDeletedVisits(prev => new Set([...prev, visitId]));
    setSyncKey(prev => prev + 1);
  }, []);

  // Função para notificar criação/atualização de visita
  const notifyVisitUpdated = useCallback(() => {
    setSyncKey(prev => prev + 1);
  }, []);

  // Função para limpar cache de visitas excluídas
  const clearDeletedVisitsCache = useCallback(() => {
    setDeletedVisits(new Set());
  }, []);

  // Função para verificar se uma visita foi excluída
  const isVisitDeleted = useCallback((visitId) => {
    return deletedVisits.has(visitId);
  }, [deletedVisits]);

  // Função para forçar sincronização completa
  const forceSync = useCallback(() => {
    setSyncKey(prev => prev + 1);
    clearDeletedVisitsCache();
    forceCleanup(); // Forçar limpeza de cache
  }, [clearDeletedVisitsCache, forceCleanup]);

  const value = {
    syncKey,
    deletedVisits,
    notifyVisitDeleted,
    notifyVisitUpdated,
    clearDeletedVisitsCache,
    isVisitDeleted,
    forceSync
  };

  return (
    <VisitSyncContext.Provider value={value}>
      {children}
    </VisitSyncContext.Provider>
  );
};
