import React, { useState, useEffect } from 'react';
import { History, FileSpreadsheet, AlertCircle, CheckCircle, RefreshCw, Database, ShieldCheck } from 'lucide-react';
import whitelistApi from './api/whitelistApi';
import Layout from './components/Layout/Layout';
import ImportTable from './components/Import/ImportTable';
import WhitelistTable from './components/Whitelist/WhitelistTable';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('imports');
  const [imports, setImports] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Main function to load all dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const importsResult = await whitelistApi.getImportHistory();
      setImports(importsResult.data || []);

      const whitelistResult = await whitelistApi.getWhitelist();
      setWhitelist(whitelistResult.data || []);
    } catch (err) {
      setError(err.message || "Unable to fetch data from the server. Please check that the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  // Refresh without triggering the global loading shimmer effect
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const importsResult = await whitelistApi.getImportHistory();
      setImports(importsResult.data || []);

      const whitelistResult = await whitelistApi.getWhitelist();
      setWhitelist(whitelistResult.data || []);
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const loadData = async () => {
    try {
      const data = await whitelistApi.getWhitelist();
      setWhitelist(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // KPI statistics calculations
  const totalImports = imports.length;
  const successImports = imports.filter(i => i.status === 'completed').length;
  const failedImports = imports.filter(i => i.status === 'failed').length;
  const successRate = totalImports > 0 ? Math.round((successImports / totalImports) * 100) : 100;

  // Total sum of valid numbers inserted
  const totalImportedNumbers = imports
    .filter(i => i.status === 'completed')
    .reduce((sum, item) => sum + (item.records_count || 0), 0);

  const totalWhitelisted = whitelist.length;
  const latestAddedPhone = whitelist.length > 0 ? whitelist[0].phone_number : 'None';

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {loading ? (
        /* Premium loading skeleton (Shimmer) */
        <div className="dashboard-loading">
          <div className="shimmer-grid">
            <div className="shimmer-card"></div>
            <div className="shimmer-card"></div>
            <div className="shimmer-card"></div>
          </div>
          <div className="shimmer-table"></div>
        </div>
      ) : error ? (
        /* Styled error alert */
        <div className="dashboard-error">
          <div className="error-card">
            <AlertCircle className="error-icon" />
            <h3>Connection Error</h3>
            <p>{error}</p>
            <button className="retry-button" onClick={fetchDashboardData}>
              <RefreshCw className="btn-icon" />
              Retry
            </button>
          </div>
        </div>
      ) : (
        /* Loaded dashboard content */
        <div className="dashboard-view animate-fade-in">
          {/* Import History Section */}
          {activeTab === 'imports' && (
            <div className="tab-pane">
              {/* Section title and refresh button */}
              <div className="section-header">
                <h2>Import Reports</h2>
                <button
                  className={`refresh-button ${refreshing ? 'refreshing' : ''}`}
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`refresh-icon ${refreshing ? 'spin' : ''}`} />
                  <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>

              {/* Main history table */}
              <ImportTable imports={imports} />
            </div>
          )}

          {/* Whitelist Section */}
          {activeTab === 'whitelist' && (
            <div className="tab-pane">
              {/* Section title and refresh button */}
              <div className="section-header">
                <h2>Search & Delete Number</h2>
                <button
                  className={`refresh-button ${refreshing ? 'refreshing' : ''}`}
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`refresh-icon ${refreshing ? 'spin' : ''}`} />
                  <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>

              {/* Main numbers table */}
              <WhitelistTable list={whitelist} onRefresh={loadData} />
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}