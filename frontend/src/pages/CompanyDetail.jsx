import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { StageSelector } from '../components/StageSelector';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { Modal } from '../components/Modal';

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ first_name: '', last_name: '', email: '', job_title: '' });
  const [creatingLead, setCreatingLead] = useState(false);

  async function fetchData() {
    try {
      const [companyRes, activityRes] = await Promise.all([
        api.get(`/companies/${id}/leads`),
        api.get(`/activity/company/${id}`)
      ]);
      setCompany(companyRes.data.data);
      setActivity(activityRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load company');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) return <div className="loading">Loading company details...</div>;
  if (error) return <div className="error-msg">{error}</div>;
  if (!company) return <div className="error-msg">Company not found.</div>;

  function startEditing() {
    setEditing(true);
    setFormData({ ...company });
  }

  function cancelEditing() {
    setEditing(false);
    setFormData({});
  }

  async function saveEdits() {
    try {
      await api.put(`/companies/${id}`, formData);
      setEditing(false);
      setFormData({});
      fetchData();
    } catch (err) {
      console.error('Failed to save:', err);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this company? Leads will be kept but unlinked.')) return;
    try {
      await api.delete(`/companies/${id}`);
      navigate('/');
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }

  async function handleStageChange() {
    fetchData();
  }

  async function handleAddLead(e) {
    e.preventDefault();
    if (!newLead.first_name || !newLead.last_name || !newLead.email) return;

    setCreatingLead(true);
    try {
      const leadData = {
        ...newLead,
        company: company.name,
        company_size: company.size,
        industry: company.industry,
        company_website: company.website
      };
      const res = await api.post('/leads', leadData);
      await api.post(`/companies/${id}/leads/${res.data.data.id}`);
      setShowAddLead(false);
      setNewLead({ first_name: '', last_name: '', email: '', job_title: '' });
      fetchData();
    } catch (err) {
      console.error('Failed to add lead:', err);
    } finally {
      setCreatingLead(false);
    }
  }

  const fields = [
    { key: 'name', label: 'Company Name' },
    { key: 'domain', label: 'Domain' },
    { key: 'industry', label: 'Industry' },
    { key: 'size', label: 'Size' },
    { key: 'website', label: 'Website' },
    { key: 'linkedin_url', label: 'LinkedIn' },
    { key: 'description', label: 'Description', full: true },
    { key: 'recent_news', label: 'Recent News', full: true }
  ];

  function FieldRow({ field }) {
    const value = editing ? formData[field.key] : company[field.key];

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
    <div style={{ maxWidth: '900px' }}>
      <div className="page-header">
        <div>
          <button className="btn-secondary btn-sm" onClick={() => navigate('/')} style={{ marginBottom: '8px' }}>
            ← Back to Pipeline
          </button>
          <h1>{company.name}</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '2px' }}>
            {company.industry && <span>{company.industry}</span>}
            {company.industry && company.domain && <span> · </span>}
            {company.domain && <span>{company.domain}</span>}
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
          <StageSelector
            currentStageId={company.stage_id}
            entityId={id}
            entityType="company"
            onStageChange={handleStageChange}
          />
        </div>
      </div>

      <div className="detail-section">
        <h3>Company Info</h3>
        <div className="field-grid">
          {fields.map(f => <FieldRow key={f.key} field={f} />)}
        </div>
      </div>

      <div className="detail-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
            Leads ({company.leads?.length || 0})
          </h3>
          <button className="btn-primary btn-sm" onClick={() => setShowAddLead(true)}>
            + Add Lead
          </button>
        </div>

        {company.leads && company.leads.length > 0 ? (
          <div className="leads-list">
            {company.leads.map(lead => (
              <div
                key={lead.id}
                className="lead-list-item"
                onClick={() => navigate(`/leads/${lead.id}`)}
              >
                <div className="lead-list-info">
                  <span className="lead-list-name">{lead.first_name} {lead.last_name}</span>
                  <span className="lead-list-title">{lead.job_title || 'No title'}</span>
                </div>
                <div className="lead-list-meta">
                  <span className="lead-list-email">{lead.email}</span>
                  <span className="lead-list-stage">{lead.stage_name}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            No leads yet. Add your first lead to start outreach.
          </p>
        )}
      </div>

      <div className="detail-section">
        <h3>Activity</h3>
        <ActivityTimeline activity={activity} />
      </div>

      {showAddLead && (
        <Modal onClose={() => setShowAddLead(false)}>
          <div className="modal-header">
            <h2>Add Lead to {company.name}</h2>
            <button className="modal-close" onClick={() => setShowAddLead(false)}>&times;</button>
          </div>
          <form onSubmit={handleAddLead}>
            <div className="field-grid" style={{ marginBottom: '16px' }}>
              <div className="field-group">
                <label className="field-label">First Name *</label>
                <input
                  type="text"
                  value={newLead.first_name}
                  onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="field-group">
                <label className="field-label">Last Name *</label>
                <input
                  type="text"
                  value={newLead.last_name}
                  onChange={(e) => setNewLead({ ...newLead, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="field-group" style={{ marginBottom: '16px' }}>
              <label className="field-label">Email *</label>
              <input
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
              />
            </div>
            <div className="field-group" style={{ marginBottom: '16px' }}>
              <label className="field-label">Job Title</label>
              <input
                type="text"
                value={newLead.job_title}
                onChange={(e) => setNewLead({ ...newLead, job_title: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowAddLead(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={creatingLead || !newLead.first_name || !newLead.last_name || !newLead.email}
              >
                {creatingLead ? 'Adding...' : 'Add Lead'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
