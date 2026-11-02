import { useState, useEffect } from 'react';
import api from '../api/client';
import { PipelineBoard } from '../components/PipelineBoard';

export default function Dashboard() {
  const [stages, setStages] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [stagesRes, leadsRes] = await Promise.all([
          api.get('/pipeline/stages'),
          api.get('/leads')
        ]);
        setStages(stagesRes.data.data);
        setLeads(leadsRes.data.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading pipeline...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Pipeline</h1>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
          {leads.length} lead{leads.length !== 1 ? 's' : ''} total
        </span>
      </div>
      <PipelineBoard stages={stages} leads={leads} />
    </div>
  );
}
