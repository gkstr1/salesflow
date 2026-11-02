import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/components.css';

const STAGE_COLORS = {
  'New': { bg: 'rgba(99,102,241,0.12)', color: '#818cf8' },
  'Contacted': { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
  'Replied': { bg: 'rgba(16,185,129,0.12)', color: '#34d399' },
  'Closed Won': { bg: 'rgba(34,197,94,0.12)', color: '#4ade80' },
  'Closed Lost': { bg: 'rgba(239,68,68,0.12)', color: '#f87171' }
};

export function LeadTable({ leads, stages }) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const stageMap = {};
  stages.forEach(s => { stageMap[s.id] = s.name; });

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = [...leads].sort((a, b) => {
    let valA = key => a[key];
    let valB = key => b[key];
    if (sortKey === 'stage') {
      valA = () => stageMap[a.stage_id] || '';
      valB = () => stageMap[b.stage_id] || '';
    }
    const aVal = sortKey === 'stage' ? valA() : (a[sortKey] || '');
    const bVal = sortKey === 'stage' ? valB() : (b[sortKey] || '');
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function SortIcon({ col }) {
    if (sortKey !== col) return <span style={{ opacity: 0.3 }}> ↕</span>;
    return <span> {sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th onClick={() => handleSort('first_name')}>Name<SortIcon col="first_name" /></th>
          <th onClick={() => handleSort('email')}>Email<SortIcon col="email" /></th>
          <th onClick={() => handleSort('company')}>Company<SortIcon col="company" /></th>
          <th onClick={() => handleSort('job_title')}>Title<SortIcon col="job_title" /></th>
          <th onClick={() => handleSort('stage')}>Stage<SortIcon col="stage" /></th>
          <th onClick={() => handleSort('created_at')}>Added<SortIcon col="created_at" /></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(lead => {
          const stageName = stageMap[lead.stage_id] || 'Unknown';
          const stageStyle = STAGE_COLORS[stageName] || { bg: '#333', color: '#fff' };

          return (
            <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)}>
              <td><strong>{lead.first_name} {lead.last_name}</strong></td>
              <td>{lead.email}</td>
              <td>{lead.company || '—'}</td>
              <td>{lead.job_title || '—'}</td>
              <td>
                <span className="stage-badge" style={{ background: stageStyle.bg, color: stageStyle.color }}>
                  {stageName}
                </span>
              </td>
              <td style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                {new Date(lead.created_at).toLocaleDateString()}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
