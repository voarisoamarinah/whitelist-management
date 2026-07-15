import React from 'react';
import { ShieldCheck, History, Database, FileSpreadsheet, User } from 'lucide-react';
import '../../styles/variables.css';
import './Layout.css';

/**
 * Global layout component with a sidebar navigation bar
 * and a header.
 */
export default function Layout({ children, activeTab, setActiveTab }) {
  const navItems = [
    { id: 'imports', label: 'Upload', icon: History },
    { id: 'whitelist', label: 'Delete Number', icon: ShieldCheck }
  ];

  return (
    <div className="layout-container">
      {/* Navigation sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Database className="logo-icon" />
          <span>Whitelist Manager</span>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-button ${activeTab === item.id ? 'active' : ''}`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="main-wrapper">
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}