import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { CompanyKanbanBoard } from '../components/CompanyKanbanBoard';
import { Modal } from '../components/Modal';

export default function CompaniesDashboard() {
  const [stages, setStages] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', domain: '', industry: '', size: '' });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  async function fetchData() {
    try {
      const [stagesRes, companiesRes] = await Promise.all([
        api.get('/pipeline/stages'),
        api.get('/companies')
      ]);
      setStages(stagesRes.data.data);
      setCompanies(companiesRes.data.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleCreateCompany(e) {
    e.preventDefault();
    if (!newCompany.name.trim()) return;

    setCreating(true);
    try {
      const res = await api.post('/companies', newCompany);
      setShowCreateModal(false);
      setNewCompany({ name: '', domain: '', industry: '', size: '' });
      navigate(`/companies/${res.data.data.id}`);
    } catch (err) {
      console.error('Failed to create company:', err);
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="loading">Loading pipeline...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Companies</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            {companies.length} compan{companies.length !== 1 ? 'ies' : 'y'} total
          </span>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            + Add Company
          </button>
        </div>
      </div>

      <CompanyKanbanBoard
        stages={stages}
        companies={companies}
        onCompanyMoved={fetchData}
      />

      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <div className="modal-header">
            <h2>Add Company</h2>
            <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
          </div>
          <form onSubmit={handleCreateCompany}>
            <div className="field-group" style={{ marginBottom: '16px' }}>
              <label className="field-label">Company Name *</label>
              <input
                type="text"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                placeholder="Acme Corp"
                autoFocus
              />
            </div>
            <div className="field-group" style={{ marginBottom: '16px' }}>
              <label className="field-label">Domain</label>
              <input
                type="text"
                value={newCompany.domain}
                onChange={(e) => setNewCompany({ ...newCompany, domain: e.target.value })}
                placeholder="acme.com"
              />
            </div>
            <div className="field-grid" style={{ marginBottom: '16px' }}>
              <div className="field-group">
                <label className="field-label">Industry</label>
                <input
                  type="text"
                  value={newCompany.industry}
                  onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })}
                  placeholder="SaaS"
                />
              </div>
              <div className="field-group">
                <label className="field-label">Size</label>
                <select
                  value={newCompany.size}
                  onChange={(e) => setNewCompany({ ...newCompany, size: e.target.value })}
                >
                  <option value="">Select size</option>
                  <option value="1-10">1-10</option>
                  <option value="10-50">10-50</option>
                  <option value="50-200">50-200</option>
                  <option value="200-500">200-500</option>
                  <option value="500-1000">500-1000</option>
                  <option value="1000+">1000+</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={creating || !newCompany.name.trim()}>
                {creating ? 'Creating...' : 'Create Company'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
