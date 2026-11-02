import { useNavigate } from 'react-router-dom';
import '../styles/components.css';

export function CompanyCard({ company }) {
  const navigate = useNavigate();

  return (
    <div className="company-card" onClick={() => navigate(`/companies/${company.id}`)}>
      <div className="company-card-name">{company.name}</div>
      <div className="company-card-meta">
        {company.industry && <span>{company.industry}</span>}
        {company.industry && company.size && <span> · </span>}
        {company.size && <span>{company.size} employees</span>}
      </div>
      <div className="company-card-footer">
        <span className="lead-count">{company.lead_count || 0} lead{company.lead_count !== 1 ? 's' : ''}</span>
        {company.domain && <span className="domain">{company.domain}</span>}
      </div>
    </div>
  );
}
