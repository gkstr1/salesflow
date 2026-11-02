import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export function useLeads({ stageId, search } = {}) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (stageId) params.stage_id = stageId;
      if (search) params.search = search;
      const res = await api.get('/leads', { params });
      setLeads(res.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [stageId, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return { leads, loading, error, refetch: fetchLeads };
}
