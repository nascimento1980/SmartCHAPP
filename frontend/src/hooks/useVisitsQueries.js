import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';

export function useCompanySettingsQuery() {
  return useQuery(['settings'], async () => {
    const { data } = await api.get('/settings/company');
    return data?.company || {};
  }, { staleTime: 5 * 60 * 1000 });
}

export function usePlanningListQuery(params) {
  const finalParams = { ...(params || {}) };
  if (!finalParams.status) {
    finalParams.status = 'em_planejamento,em_execucao';
  }
  return useQuery(['planningList', finalParams], async () => {
    const { data } = await api.get('/visit-planning', { params: finalParams });
    return data || { planning: [] };
  }, { keepPreviousData: true });
}

export function usePlanningQuery(id) {
  return useQuery(['planning', id], async () => {
    if (!id) return null;
    const { data } = await api.get(`/visit-planning/${id}`);
    return data?.planning || null;
  }, { enabled: Boolean(id) });
}

export function useVisitsByPlanningQuery(planningId) {
  return useQuery(['visitsByPlanning', planningId], async () => {
    if (!planningId) return [];
    const { data } = await api.get(`/visits/planning/${planningId}`);
    return data?.visits || [];
  }, { enabled: Boolean(planningId) });
}

export function useDeleteVisitMutation() {
  const qc = useQueryClient();
  return useMutation(async ({ id, deletion_reason }) => api.delete(`/visits/${id}`, { data: { deletion_reason } }), {
    onSuccess: () => {
      qc.invalidateQueries('planningList');
      qc.invalidateQueries('visits');
      qc.invalidateQueries('visitsByPlanning');
      qc.invalidateQueries('calendarCounts');
    }
  });
}



