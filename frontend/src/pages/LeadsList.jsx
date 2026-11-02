import { useState, useEffect } from 'react';
import api from '../api/client';
import { LeadTable } from '../components/LeadTable';
import { Modal } from '../components/Modal';
import { useLeads } from '../hooks/useLeads';

export default function LeadsList() {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [stages, setStages] = useState([]);
  const [importModal, setImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState(null);

  const { leads, loading, error, refetch } = useLeads({ stageId: stageFilter, search });

  useEffect(() => {
    api.get('/pipeline/stages').then(res => setStages(res.data.data));
  }, []);

  async function handleImport() {
    setImportError(null);
    try {
      const parsed = JSON.parse(importText);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      await api.post('/leads/bulk', { leads: arr });
      setImportModal(false);
      setImportText('');
      refetch();
    } catch (err) {
      if (err instanceof SyntaxError) {
        setImportError('Invalid JSON. Please paste a valid JSON array.');
      } else {
        setImportError(err.response?.data?.error || 'Import failed');
      }
    }
  }

  if (loading) return <div className="loading">Loading leads...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>All Leads</h1>
        <button className="btn-primary" onClick={() => setImportModal(true)}>+ Import Leads</button>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by name, email, or company..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
          <option value="">All Stages</option>
          {stages.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {leads.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No leads found.</p>
      ) : (
        <LeadTable leads={leads} stages={stages} />
      )}

      <Modal isOpen={importModal} onClose={() => { setImportModal(false); setImportError(null); }} title="Import Leads">
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '12px' }}>
          Paste a JSON array of lead objects. Each object needs at minimum: first_name, last_name, email.
        </p>
        <textarea
          value={importText}
          onChange={e => setImportText(e.target.value)}
          placeholder={`[\n  { "first_name": "Jane", "last_name": "Doe", "email": "jane@example.com", "company": "Acme" }\n]`}
          style={{ width: '100%', minHeight: '140px', resize: 'vertical', fontFamily: 'monospace', fontSize: '13px' }}
        />
        {importError && <div className="error-msg" style={{ marginTop: '8px' }}>{importError}</div>}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={() => { setImportModal(false); setImportError(null); }}>Cancel</button>
          <button className="btn-primary" onClick={handleImport} disabled={!importText.trim()}>Import</button>
        </div>
      </Modal>
    </div>
  );
}
