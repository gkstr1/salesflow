import { CompanyCard } from './CompanyCard';
import api from '../api/client';
import '../styles/components.css';

const STAGE_COLORS = {
  'New': 'var(--color-stage-new)',
  'Contacted': 'var(--color-stage-contacted)',
  'Replied': 'var(--color-stage-replied)',
  'Closed Won': 'var(--color-stage-won)',
  'Closed Lost': 'var(--color-stage-lost)'
};

export function CompanyKanbanBoard({ stages, companies, onCompanyMoved }) {
  async function handleDrop(e, stageId) {
    e.preventDefault();
    const companyId = e.dataTransfer.getData('companyId');
    if (!companyId) return;

    try {
      await api.put(`/companies/${companyId}/stage`, { stage_id: stageId });
      if (onCompanyMoved) onCompanyMoved();
    } catch (err) {
      console.error('Failed to move company:', err);
    }
  }

  function handleDragStart(e, companyId) {
    e.dataTransfer.setData('companyId', companyId);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  return (
    <div className="kanban-board">
      {stages.map(stage => {
        const stageCompanies = companies.filter(c => c.stage_id === stage.id);
        const color = STAGE_COLORS[stage.name] || stage.color_hex;

        return (
          <div
            className="kanban-column"
            key={stage.id}
            onDrop={(e) => handleDrop(e, stage.id)}
            onDragOver={handleDragOver}
          >
            <div className="kanban-column-header">
              <h3 style={{ color }}>{stage.name}</h3>
              <span className="count">{stageCompanies.length}</span>
            </div>
            <div className="kanban-cards">
              {stageCompanies.map(company => (
                <div
                  key={company.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, company.id)}
                >
                  <CompanyCard company={company} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
