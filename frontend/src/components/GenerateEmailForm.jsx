import { useState } from 'react';
import api from '../api/client';
import '../styles/components.css';

export function GenerateEmailForm({ leadId, onEmailGenerated }) {
  const [emailType, setEmailType] = useState('cold');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/ai/generate-email', {
        lead_id: leadId,
        email_type: emailType,
        context: context || undefined
      });
      if (onEmailGenerated) onEmailGenerated(res.data.data);
      setContext('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div className="field-group" style={{ flex: '0 0 auto' }}>
          <label className="field-label">Email Type</label>
          <select value={emailType} onChange={e => setEmailType(e.target.value)}>
            <option value="cold">Cold Outreach</option>
            <option value="followup">Follow-up</option>
          </select>
        </div>
      </div>
      <div className="field-group">
        <label className="field-label">Additional Context (optional)</label>
        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          placeholder="e.g. They just announced a Series B, or mention a specific pain point..."
          rows={2}
        />
      </div>
      {error && <div className="error-msg">{error}</div>}
      <button type="submit" className="btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
        {loading ? 'Generating...' : 'Generate Email'}
      </button>
    </form>
  );
}
