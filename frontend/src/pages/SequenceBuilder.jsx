import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Modal } from '../components/Modal';

const CHANNELS = [
  { id: 'email', name: 'Email', icon: '✉️', description: 'Cold or follow-up email' },
  { id: 'voice_drop', name: 'Voice Drop', icon: '📞', description: 'Pre-recorded voicemail' },
  { id: 'cold_call', name: 'Cold Call', icon: '☎️', description: 'Direct phone call with script' },
  { id: 'linkedin_connect', name: 'LinkedIn Connect', icon: '🔗', description: 'Connection request' },
  { id: 'linkedin_message', name: 'LinkedIn Message', icon: '💬', description: 'Direct message or InMail' },
  { id: 'linkedin_engage', name: 'LinkedIn Engage', icon: '👍', description: 'Like, comment, or share' },
  { id: 'social_post', name: 'Social Post', icon: '📱', description: 'Twitter/X or other social content' }
];

export default function SequenceBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sequence, setSequence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [stepForm, setStepForm] = useState({
    channel: '',
    delay_days: 0,
    delay_hours: 0,
    content_template: '',
    subject_template: ''
  });

  async function fetchSequence() {
    try {
      const res = await api.get(`/sequences/${id}`);
      setSequence(res.data.data);
    } catch (err) {
      console.error('Failed to load sequence:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSequence();
  }, [id]);

  async function handleUpdateSequence(field, value) {
    try {
      await api.put(`/sequences/${id}`, { [field]: value });
      setSequence(prev => ({ ...prev, [field]: value }));
    } catch (err) {
      console.error('Failed to update sequence:', err);
    }
  }

  async function handleAddStep(e) {
    e.preventDefault();
    if (!stepForm.channel) return;

    setSaving(true);
    try {
      await api.post(`/sequences/${id}/steps`, stepForm);
      setShowAddStep(false);
      setStepForm({ channel: '', delay_days: 0, delay_hours: 0, content_template: '', subject_template: '' });
      fetchSequence();
    } catch (err) {
      console.error('Failed to add step:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStep(e) {
    e.preventDefault();
    if (!editingStep) return;

    setSaving(true);
    try {
      await api.put(`/sequences/${id}/steps/${editingStep.id}`, stepForm);
      setEditingStep(null);
      setStepForm({ channel: '', delay_days: 0, delay_hours: 0, content_template: '', subject_template: '' });
      fetchSequence();
    } catch (err) {
      console.error('Failed to update step:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteStep(stepId) {
    if (!confirm('Delete this step?')) return;
    try {
      await api.delete(`/sequences/${id}/steps/${stepId}`);
      fetchSequence();
    } catch (err) {
      console.error('Failed to delete step:', err);
    }
  }

  function openEditStep(step) {
    setEditingStep(step);
    setStepForm({
      channel: step.channel,
      delay_days: step.delay_days,
      delay_hours: step.delay_hours,
      content_template: step.content_template || '',
      subject_template: step.subject_template || ''
    });
  }

  function getChannelInfo(channelId) {
    return CHANNELS.find(c => c.id === channelId) || { name: channelId, icon: '📋' };
  }

  function formatDelay(days, hours) {
    if (days === 0 && hours === 0) return 'Immediately';
    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    return `Wait ${parts.join(' ')}`;
  }

  if (loading) return <div className="loading">Loading sequence...</div>;
  if (!sequence) return <div className="error-msg">Sequence not found.</div>;

  return (
    <div style={{ maxWidth: '900px' }}>
      <div className="page-header">
        <div>
          <button className="btn-secondary btn-sm" onClick={() => navigate('/sequences')} style={{ marginBottom: '8px' }}>
            ← Back to Sequences
          </button>
          <input
            type="text"
            className="sequence-name-input"
            value={sequence.name}
            onChange={(e) => setSequence(prev => ({ ...prev, name: e.target.value }))}
            onBlur={(e) => handleUpdateSequence('name', e.target.value)}
            placeholder="Sequence name"
          />
          <textarea
            className="sequence-desc-input"
            value={sequence.description || ''}
            onChange={(e) => setSequence(prev => ({ ...prev, description: e.target.value }))}
            onBlur={(e) => handleUpdateSequence('description', e.target.value)}
            placeholder="Add a description..."
            rows={2}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <button
            className={`btn-sm ${sequence.is_active ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => handleUpdateSequence('is_active', !sequence.is_active)}
          >
            {sequence.is_active ? 'Active' : 'Paused'}
          </button>
        </div>
      </div>

      <div className="sequence-timeline">
        {sequence.steps && sequence.steps.length > 0 ? (
          sequence.steps.map((step, idx) => {
            const channelInfo = getChannelInfo(step.channel);
            return (
              <div key={step.id} className="sequence-step">
                <div className="sequence-step-number">{idx + 1}</div>
                <div className="sequence-step-connector"></div>
                <div className="sequence-step-content">
                  <div className="sequence-step-header">
                    <span className="sequence-step-icon">{channelInfo.icon}</span>
                    <span className="sequence-step-channel">{channelInfo.name}</span>
                    <span className="sequence-step-delay">{formatDelay(step.delay_days, step.delay_hours)}</span>
                    <div className="sequence-step-actions">
                      <button className="btn-sm btn-secondary" onClick={() => openEditStep(step)}>Edit</button>
                      <button className="btn-sm btn-danger" onClick={() => handleDeleteStep(step.id)}>Delete</button>
                    </div>
                  </div>
                  {step.subject_template && (
                    <div className="sequence-step-subject">
                      <strong>Subject:</strong> {step.subject_template}
                    </div>
                  )}
                  {step.content_template && (
                    <div className="sequence-step-template">
                      {step.content_template}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <p>No steps yet. Add your first step to build the sequence.</p>
          </div>
        )}

        <button className="add-step-btn" onClick={() => { setShowAddStep(true); setStepForm({ channel: '', delay_days: 0, delay_hours: 0, content_template: '', subject_template: '' }); }}>
          + Add Step
        </button>
      </div>

      {(showAddStep || editingStep) && (
        <Modal onClose={() => { setShowAddStep(false); setEditingStep(null); }}>
          <div className="modal-header">
            <h2>{editingStep ? 'Edit Step' : 'Add Step'}</h2>
            <button className="modal-close" onClick={() => { setShowAddStep(false); setEditingStep(null); }}>&times;</button>
          </div>
          <form onSubmit={editingStep ? handleUpdateStep : handleAddStep}>
            <div className="field-group" style={{ marginBottom: '16px' }}>
              <label className="field-label">Channel *</label>
              <div className="channel-selector">
                {CHANNELS.map(ch => (
                  <button
                    key={ch.id}
                    type="button"
                    className={`channel-option ${stepForm.channel === ch.id ? 'selected' : ''}`}
                    onClick={() => setStepForm(prev => ({ ...prev, channel: ch.id }))}
                  >
                    <span className="channel-icon">{ch.icon}</span>
                    <span className="channel-name">{ch.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="field-grid" style={{ marginBottom: '16px' }}>
              <div className="field-group">
                <label className="field-label">Delay (Days)</label>
                <input
                  type="number"
                  min="0"
                  value={stepForm.delay_days}
                  onChange={(e) => setStepForm(prev => ({ ...prev, delay_days: Number(e.target.value) }))}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Delay (Hours)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={stepForm.delay_hours}
                  onChange={(e) => setStepForm(prev => ({ ...prev, delay_hours: Number(e.target.value) }))}
                />
              </div>
            </div>

            {stepForm.channel === 'email' && (
              <div className="field-group" style={{ marginBottom: '16px' }}>
                <label className="field-label">Subject Template</label>
                <input
                  type="text"
                  value={stepForm.subject_template}
                  onChange={(e) => setStepForm(prev => ({ ...prev, subject_template: e.target.value }))}
                  placeholder="Use {{company}}, {{first_name}}, etc."
                />
              </div>
            )}

            <div className="field-group" style={{ marginBottom: '16px' }}>
              <label className="field-label">Content Template / Instructions for AI</label>
              <textarea
                value={stepForm.content_template}
                onChange={(e) => setStepForm(prev => ({ ...prev, content_template: e.target.value }))}
                placeholder="Describe what the AI should write, or provide a template..."
                rows={4}
              />
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Variables: {'{{first_name}}, {{last_name}}, {{company}}, {{job_title}}, {{industry}}'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => { setShowAddStep(false); setEditingStep(null); }}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving || !stepForm.channel}>
                {saving ? 'Saving...' : (editingStep ? 'Update Step' : 'Add Step')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
