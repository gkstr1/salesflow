import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import CompaniesDashboard from './pages/CompaniesDashboard';
import CompanyDetail from './pages/CompanyDetail';
import Dashboard from './pages/Dashboard';
import LeadsList from './pages/LeadsList';
import LeadDetail from './pages/LeadDetail';
import SequencesList from './pages/SequencesList';
import SequenceBuilder from './pages/SequenceBuilder';
import { AIChatPanel } from './components/AIChatPanel';

function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">SalesFlow AI</div>
      <div className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} end>Companies</NavLink>
        <NavLink to="/sequences" className={({ isActive }) => isActive ? 'active' : ''}>Sequences</NavLink>
        <NavLink to="/pipeline" className={({ isActive }) => isActive ? 'active' : ''}>Lead Pipeline</NavLink>
        <NavLink to="/leads" className={({ isActive }) => isActive ? 'active' : ''}>All Leads</NavLink>
      </div>
    </nav>
  );
}

export default function App() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className={`app-layout ${chatOpen ? 'chat-open' : ''}`}>
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<CompaniesDashboard />} />
            <Route path="/companies/:id" element={<CompanyDetail />} />
            <Route path="/sequences" element={<SequencesList />} />
            <Route path="/sequences/:id" element={<SequenceBuilder />} />
            <Route path="/pipeline" element={<Dashboard />} />
            <Route path="/leads" element={<LeadsList />} />
            <Route path="/leads/:id" element={<LeadDetail />} />
          </Routes>
        </main>
        <AIChatPanel isOpen={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
      </div>
    </BrowserRouter>
  );
}
