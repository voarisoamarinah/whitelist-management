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
    { id: 'imports', label: 'Import History', icon: History },
    { id: 'whitelist', label: 'Whitelisted Numbers', icon: ShieldCheck }
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
                <Icon className="nav-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">
              <User className="avatar-icon" />
            </div>
            <div className="user-info">
              <p className="user-name">Marina</p>
              <p className="user-role">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="main-wrapper">
        <header className="main-header">
          <div className="header-title">
            <h1>{activeTab === 'imports' ? 'CSV Import History' : 'Whitelist'}</h1>
            <p className="header-subtitle">
              {activeTab === 'imports' 
                ? 'Tracking and logging of bulk number imports' 
                : 'View and manage authorized phone numbers'}
            </p>
          </div>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}