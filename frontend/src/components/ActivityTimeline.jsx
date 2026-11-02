import '../styles/components.css';

const ACTION_LABELS = {
  lead_created: 'Lead created',
  lead_updated: 'Lead updated',
  stage_change: (details) => `Moved from "${details.from}" to "${details.to}"`,
  email_generated: (details) => `${details.email_type === 'cold' ? 'Cold' : 'Follow-up'} email generated`,
  email_marked_sent: (details) => `${details.email_type === 'cold' ? 'Cold' : 'Follow-up'} email marked as sent`
};

function formatLabel(entry) {
  const labelOrFn = ACTION_LABELS[entry.action_type];
  if (typeof labelOrFn === 'function') return labelOrFn(entry.details || {});
  return labelOrFn || entry.action_type;
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleString();
}

export function ActivityTimeline({ activity }) {
  if (!activity || activity.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No activity yet.</p>;
  }

  return (
    <div className="timeline">
      {activity.map(entry => (
        <div className="timeline-item" key={entry.id}>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="timeline-dot" />
            <div className="timeline-line" />
          </div>
          <div className="timeline-content">
            <div className="timeline-text">{formatLabel(entry)}</div>
            <div className="timeline-time">{formatTime(entry.created_at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
