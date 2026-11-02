import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Modal } from '../components/Modal';

const CHANNEL_ICONS = {
  email: '✉️',
  voice_drop: '📞',
  cold_call: '☎️',
  linkedin_connect: '🔗',
  linkedin_message: '💬',
  linkedin_engage: '👍',
  social_post: '📱'
};

export default function SequencesList() {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSequence, setNewSequence] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  async function fetchSequences() {
    try {
      const res = await api.get('/sequences');
      setSequences(res.data.data);
    } catch (err) {
      console.error('Failed to load sequences:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSequences();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newSequence.name.trim()) return;

    setCreating(true);
    try {
      const res = await api.post('/sequences', newSequence);
      setShowCreateModal(false);
      setNewSequence({ name: '', description: '' });
      navigate(`/sequences/${res.data.data.id}`);
    } catch (err) {
      console.error('Failed to create sequence:', err);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this sequence?')) return;
    try {
      await api.delete(`/sequences/${id}`);
      fetchSequences();
    } catch (err) {
      console.error('Failed to delete sequence:', err);
    }
  }

  async function handleToggleActive(id, isActive, e) {
    e.stopPropagation();
    try {
      await api.put(`/sequences/${id}`, { is_active: !isActive });
      fetchSequences();
    } catch (err) {
      console.error('Failed to update sequence:', err);
    }
  }

  if (loading) return <div className="loading">Loading sequences...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Sequences</h1>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create Sequence
        </button>
      </div>

      {sequences.length === 0 ? (
        <div className="empty-state">
          <p>No sequences yet. Create your first multi-channel outreach sequence.</p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            Create Sequence
          </button>
        </div>
      ) : (
        <div className="sequences-grid">
          {sequences.map(seq => (
            <div
              key={seq.id}
              className={`sequence-card ${!seq.is_active ? 'inactive' : ''}`}
              onClick={() => navigate(`/sequences/${seq.id}`)}
            >
              <div className="sequence-card-header">
                <h3>{seq.name}</h3>
                <div className="sequence-card-actions">
                  <button
                    className={`btn-sm ${seq.is_active ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={(e) => handleToggleActive(seq.id, seq.is_active, e)}
                    title={seq.is_active ? 'Pause sequence' : 'Activate sequence'}
                  >
                    {seq.is_active ? 'Active' : 'Paused'}
                  </button>
                  <button
                    className="btn-sm btn-danger"
                    onClick={(e) => handleDelete(seq.id, e)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {seq.description && (
                <p className="sequence-card-desc">{seq.description}</p>
              )}
              <div className="sequence-card-meta">
                <span>{seq.step_count || 0} step{seq.step_count !== 1 ? 's' : ''}</span>
                <span className="sequence-card-date">
                  Created {new Date(seq.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <div className="modal-header">
            <h2>Create Sequence</h2>
            <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
          </div>
          <form onSubmit={handleCreate}>
            <div className="field-group" style={{ marginBottom: '16px' }}>
              <label className="field-label">Sequence Name *</label>
              <input
                type="text"
                value={newSequence.name}
                onChange={(e) => setNewSequence({ ...newSequence, name: e.target.value })}
                placeholder="e.g., Cold Outreach - SaaS"
                autoFocus
              />
            </div>
            <div className="field-group" style={{ marginBottom: '16px' }}>
              <label className="field-label">Description</label>
              <textarea
                value={newSequence.description}
                onChange={(e) => setNewSequence({ ...newSequence, description: e.target.value })}
                placeholder="Describe what this sequence is for..."
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={creating || !newSequence.name.trim()}>
                {creating ? 'Creating...' : 'Create & Edit'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
