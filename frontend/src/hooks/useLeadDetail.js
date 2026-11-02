import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export function useLeadDetail(leadId) {
  const [lead, setLead] = useState(null);
  const [emails, setEmails] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      const [leadRes, emailsRes, activityRes] = await Promise.all([
        api.get(`/leads/${leadId}`),
        api.get(`/outreach/lead/${leadId}`),
        api.get(`/activity/lead/${leadId}`)
      ]);
      setLead(leadRes.data.data);
      setEmails(emailsRes.data.data);
      setActivity(activityRes.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load lead details');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { lead, emails, activity, loading, error, refetch: fetchAll };
}
