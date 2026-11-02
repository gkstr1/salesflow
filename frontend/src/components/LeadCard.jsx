import { useNavigate } from 'react-router-dom';
import '../styles/components.css';

export function LeadCard({ lead }) {
  const navigate = useNavigate();

  return (
    <div className="lead-card" onClick={() => navigate(`/leads/${lead.id}`)}>
      <div className="lead-card-name">{lead.first_name} {lead.last_name}</div>
      <div className="lead-card-meta">
        {lead.job_title && <span>{lead.job_title}</span>}
        {lead.job_title && lead.company && <span> · </span>}
        {lead.company && <span>{lead.company}</span>}
      </div>
    </div>
  );
}
