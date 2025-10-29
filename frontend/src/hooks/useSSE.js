import { useEffect, useRef } from 'react';
import { useQueryClient } from 'react-query';

export default function useSSE(token) {
  const queryClient = useQueryClient();
  const evtRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    // Usar a mesma origem do window (com proxy do Vite) ao invés de trocar porta
    const url = new URL('/api/events', window.location.origin);
    url.searchParams.set('token', token);
    const evt = new EventSource(url.toString(), { withCredentials: false });
    evtRef.current = evt;

    evt.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (!msg || !msg.type) return;
        switch (msg.type) {
          case 'settings.updated':
            queryClient.setQueryData(['settings'], msg.payload);
            break;
          case 'contacts.imported':
            queryClient.invalidateQueries('leadsList');
            queryClient.invalidateQueries('customerContactsList');
            queryClient.invalidateQueries('analyticsOverview');
            break;
          case 'visit.created':
          case 'visit.updated':
          case 'visit.deleted':
            queryClient.invalidateQueries('visits');
            queryClient.invalidateQueries('visitsByPlanning');
            queryClient.invalidateQueries('calendarCounts');
            queryClient.invalidateQueries('planningList');
            break;
          case 'planning.updated':
            queryClient.invalidateQueries('planningList');
            break;
          default:
            break;
        }
      } catch (_) {}
    };

    evt.onerror = () => {
      evt.close();
      evtRef.current = null;
    };

    return () => {
      try { evt.close(); } catch (_) {}
      evtRef.current = null;
    };
  }, [token, queryClient]);
}



