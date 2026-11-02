import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useLeadDetail } from '../hooks/useLeadDetail';
import { StageSelector } from '../components/StageSelector';
import { GenerateEmailForm } from '../components/GenerateEmailForm';
import { EmailDraftPanel } from '../components/EmailDraftPanel';
import { ActivityTimeline } from '../components/ActivityTimeline';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lead, emails, activity, loading, error, refetch } = useLeadDetail(id);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [emailList, setEmailList] = useState(null);

  if (loading) return <div className="loading">Loading lead details...</div>;
  if (error) return <div className="error-msg">{error}</div>;
  if (!lead) return <div className="error-msg">Lead not found.</div>;

  const displayEmails = emailList !== null ? emailList : emails;

  function startEditing() {
    setEditing(true);
    setFormData({ ...lead });
  }

  function cancelEditing() {
    setEditing(false);
    setFormData({});
  }

  async function saveEdits() {
    try {
      await api.put(`/leads/${id}`, formData);
      setEditing(false);
      setFormData({});
      refetch();
    } catch (err) {
      console.error('Failed to save:', err);
    }
  }

  function handleEmailGenerated(newEmail) {
    setEmailList([newEmail, ...displayEmails]);
    refetch();
  }

  function handleEmailUpdated(updatedEmail) {
    setEmailList(displayEmails.map(e => e.id === updatedEmail.id ? updatedEmail : e));
  }

  async function handleDelete() {
    if (!confirm('Delete this lead and all associated data?')) return;
    try {
      await api.delete(`/leads/${id}`);
      navigate('/leads');
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }

  const fields = [
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'company', label: 'Company' },
    { key: 'job_title', label: 'Job Title' },
    { key: 'phone', label: 'Phone' },
    { key: 'linkedin_url', label: 'LinkedIn URL' }
  ];

  const enrichFields = [
    { key: 'company_size', label: 'Company Size' },
    { key: 'industry', label: 'Industry' },
    { key: 'company_website', label: 'Website' },
    { key: 'linkedin_summary', label: 'LinkedIn Summary', full: true },
    { key: 'recent_news', label: 'Recent News', full: true }
  ];

  function FieldRow({ field }) {
    const value = editing ? formData[field.key] : lead[field.key];

    return (
      <div className={`field-group ${field.full ? 'full-width' : ''}`}>
        <label className="field-label">{field.label}</label>
        {editing ? (
          field.full ? (
            <textarea
              value={value || ''}
              onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
              rows={3}
            />
          ) : (
            <input
              type="text"
              value={value || ''}
              onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
            />
          )
        ) : (
          <span className={`field-value ${!value ? 'empty' : ''}`}>{value || 'Not set'}</span>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '760px' }}>
      <div className="page-header">
        <div>
          <button className="btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '8px' }}>← Back</button>
          <h1>{lead.first_name} {lead.last_name}</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '2px' }}>
            {lead.job_title && <span>{lead.job_title}</span>}
            {lead.job_title && lead.company && <span> · </span>}
            {lead.company && <span>{lead.company}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          {editing ? (
            <>
              <button className="btn-secondary btn-sm" onClick={cancelEditing}>Cancel</button>
              <button className="btn-primary btn-sm" onClick={saveEdits}>Save</button>
            </>
          ) : (
            <>
              <button className="btn-secondary btn-sm" onClick={startEditing}>Edit</button>
              <button className="btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            </>
          )}
        </div>
      </div>

      <div className="detail-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="field-label">Stage</span>
          <StageSelector currentStageId={lead.stage_id} leadId={id} onStageChange={() => refetch()} />
        </div>
      </div>

      <div className="detail-section">
        <h3>Contact Info</h3>
        <div className="field-grid">
          {fields.map(f => <FieldRow key={f.key} field={f} />)}
        </div>
      </div>

      <div className="detail-section">
        <h3>Enrichment</h3>
        <div className="field-grid">
          {enrichFields.map(f => <FieldRow key={f.key} field={f} />)}
        </div>
      </div>

      <div className="detail-section">
        <h3>Generate Outreach Email</h3>
        <GenerateEmailForm leadId={Number(id)} onEmailGenerated={handleEmailGenerated} />
      </div>

      <div className="detail-section">
        <h3>Email Drafts</h3>
        <EmailDraftPanel emails={displayEmails} onEmailUpdated={handleEmailUpdated} />
      </div>

      <div className="detail-section">
        <h3>Activity</h3>
        <ActivityTimeline activity={activity} />
      </div>
    </div>
  );
}
