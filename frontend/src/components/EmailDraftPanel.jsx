import { useState } from 'react';
import api from '../api/client';
import '../styles/components.css';

export function EmailDraftPanel({ emails, onEmailUpdated }) {
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');

  function startEdit(email) {
    setEditingId(email.id);
    setEditBody(email.body);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function markSent(email) {
    try {
      const res = await api.put(`/outreach/${email.id}/mark-sent`, { is_sent: !email.is_sent });
      if (onEmailUpdated) onEmailUpdated(res.data.data);
    } catch (err) {
      console.error('Failed to mark sent:', err);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }

  if (!emails || emails.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No emails generated yet.</p>;
  }

  return (
    <div>
      {emails.map(email => (
        <div className="email-draft" key={email.id}>
          <div className="email-draft-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="stage-badge" style={{
                background: email.email_type === 'cold' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)',
                color: email.email_type === 'cold' ? '#818cf8' : '#34d399'
              }}>
                {email.email_type === 'cold' ? 'Cold' : 'Follow-up'}
              </span>
              {email.is_sent && <span className="sent-badge">Sent</span>}
            </div>
            <div className="email-draft-actions">
              {editingId === email.id ? (
                <button className="btn-secondary btn-sm" onClick={cancelEdit}>Cancel</button>
              ) : (
                <button className="btn-secondary btn-sm" onClick={() => startEdit(email)}>Edit</button>
              )}
              <button
                className="btn-secondary btn-sm"
                onClick={() => copyToClipboard(email.is_sent ? email.body : (editingId === email.id ? editBody : email.body))}
              >
                Copy
              </button>
              <button
                className={email.is_sent ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}
                onClick={() => markSent(email)}
              >
                {email.is_sent ? 'Unsend' : 'Mark Sent'}
              </button>
            </div>
          </div>
          <div className="email-draft-subject">Subject: {email.subject}</div>
          {editingId === email.id ? (
            <textarea
              className="email-draft-textarea"
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
              style={{ width: '100%', minHeight: '100px', marginTop: '8px', resize: 'vertical' }}
            />
          ) : (
            <p style={{ marginTop: '8px', whiteSpace: 'pre-wrap', color: 'var(--color-text)', lineHeight: 1.6 }}>
              {email.body}
            </p>
          )}
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
            Generated {new Date(email.created_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
