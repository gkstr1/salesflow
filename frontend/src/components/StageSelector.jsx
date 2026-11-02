import { useState, useEffect } from 'react';
import api from '../api/client';
import '../styles/components.css';

export function StageSelector({ currentStageId, leadId, entityId, entityType = 'lead', onStageChange }) {
  const [stages, setStages] = useState([]);

  useEffect(() => {
    api.get('/pipeline/stages').then(res => setStages(res.data.data));
  }, []);

  async function handleChange(e) {
    const stageId = Number(e.target.value);
    if (stageId === currentStageId) return;
    try {
      const id = entityId || leadId;
      const endpoint = entityType === 'company'
        ? `/companies/${id}/stage`
        : `/leads/${id}/stage`;
      await api.put(endpoint, { stage_id: stageId });
      if (onStageChange) onStageChange(stageId);
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  }

  return (
    <select value={currentStageId || ''} onChange={handleChange}>
      {stages.map(stage => (
        <option key={stage.id} value={stage.id}>{stage.name}</option>
      ))}
    </select>
  );
}
