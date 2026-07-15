import React, { useState, useEffect } from 'react';
import { History, FileSpreadsheet, AlertCircle, CheckCircle, RefreshCw, Database, ShieldCheck } from 'lucide-react';
import whitelistApi from './api/whitelistApi'; // Vérifie bien si c'est './services/WhitelistApi' ou './api/whitelistApi' selon ton projet !
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

  // Fonction principale pour charger et sécuriser les données
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const importsResult = await whitelistApi.getImportHistory();
      // Sécurité : On accepte si l'API renvoie { data: [...] } OU directement le tableau [...]
      const importsData = Array.isArray(importsResult) ? importsResult : (importsResult?.data || []);
      setImports(importsData);

      const whitelistResult = await whitelistApi.getWhitelist();
      const whitelistData = Array.isArray(whitelistResult) ? whitelistResult : (whitelistResult?.data || []);
      setWhitelist(whitelistData);
    } catch (err) {
      setError(err.message || "Unable to fetch data from the server. Please check that the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  // Rafraîchissement en arrière-plan (sans l'effet Shimmer global)
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const importsResult = await whitelistApi.getImportHistory();
      const importsData = Array.isArray(importsResult) ? importsResult : (importsResult?.data || []);
      setImports(importsData);

      const whitelistResult = await whitelistApi.getWhitelist();
      const whitelistData = Array.isArray(whitelistResult) ? whitelistResult : (whitelistResult?.data || []);
      setWhitelist(whitelistData);
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Protection anti-crash pour les calculs (au cas où les variables ne seraient pas des tableaux)
  const safeImports = Array.isArray(imports) ? imports : [];
  const safeWhitelist = Array.isArray(whitelist) ? whitelist : [];

  // Statistiques KPI
  const totalImports = safeImports.length;
  const successImports = safeImports.filter(i => i && i.status === 'completed').length;
  const failedImports = safeImports.filter(i => i && i.status === 'failed').length;
  const successRate = totalImports > 0 ? Math.round((successImports / totalImports) * 100) : 100;

  const totalImportedNumbers = safeImports
    .filter(i => i && i.status === 'completed')
    .reduce((sum, item) => sum + (item.records_count || 0), 0);

  const totalWhitelisted = safeWhitelist.length;
  const latestAddedPhone = safeWhitelist.length > 0 ? safeWhitelist[0].phone_number : 'None';

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {loading ? (
        /* Shimmer Loading Effect */
        <div className="dashboard-loading">
          <div className="shimmer-grid">
            <div className="shimmer-card"></div>
            <div className="shimmer-card"></div>
            <div className="shimmer-card"></div>
          </div>
          <div className="shimmer-table"></div>
        </div>
      ) : error ? (
        /* Error view */
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
        /* Content view */
        <div className="dashboard-view animate-fade-in">

          {/* Section Historique des importations */}
          {activeTab === 'imports' && (
            <div className="tab-pane">
              <div className="section-header">
                <h2>Previous Uploads</h2>
                <button
                  className={`refresh-button ${refreshing ? 'refreshing' : ''}`}
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`refresh-icon ${refreshing ? 'spin' : ''}`} />
                  <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>

              {/* On passe handleRefresh en tant que onRefresh pour que les formulaires du bas actualisent la table */}
              <ImportTable imports={safeImports} onRefresh={handleRefresh} />
            </div>
          )}

          {/* Section Liste de numéros (Search & Delete) */}
          {activeTab === 'whitelist' && (
            <div className="tab-pane">
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

              {/* Utilisation de handleRefresh pour mettre automatiquement à jour après suppression */}
              <WhitelistTable list={safeWhitelist} onRefresh={handleRefresh} />
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}