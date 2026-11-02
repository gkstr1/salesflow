import { LeadCard } from './LeadCard';
import '../styles/components.css';

const STAGE_COLORS = {
  'New': 'var(--color-stage-new)',
  'Contacted': 'var(--color-stage-contacted)',
  'Replied': 'var(--color-stage-replied)',
  'Closed Won': 'var(--color-stage-won)',
  'Closed Lost': 'var(--color-stage-lost)'
};

export function PipelineBoard({ stages, leads }) {
  return (
    <div className="kanban-board">
      {stages.map(stage => {
        const stageLeads = leads.filter(l => l.stage_id === stage.id);
        const color = STAGE_COLORS[stage.name] || stage.color_hex;

        return (
          <div className="kanban-column" key={stage.id}>
            <div className="kanban-column-header">
              <h3 style={{ color }}>{stage.name}</h3>
              <span className="count">{stageLeads.length}</span>
            </div>
            <div className="kanban-cards">
              {stageLeads.map(lead => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
