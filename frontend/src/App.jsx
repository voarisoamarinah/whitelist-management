import React, { useState, useEffect } from 'react';
import { History, FileSpreadsheet, AlertCircle, CheckCircle, RefreshCw, Database, ShieldCheck } from 'lucide-react';
import whitelistApi from './api/whitelistApi';
import Layout from './components/Layout/Layout';
import StatsCard from './components/UI/StatsCard';
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

  // Fonction principale de chargement de toutes les données du dashboard
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const importsResult = await whitelistApi.getImportHistory();
      setImports(importsResult.data || []);

      const whitelistResult = await whitelistApi.getWhitelist();
      setWhitelist(whitelistResult.data || []);
    } catch (err) {
      setError(err.message || "Impossible de récupérer les données du serveur. Veuillez vérifier que le serveur backend est démarré.");
    } finally {
      setLoading(false);
    }
  };

  // Rafraîchir sans relancer l'effet shimmer de chargement global
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const importsResult = await whitelistApi.getImportHistory();
      setImports(importsResult.data || []);

      const whitelistResult = await whitelistApi.getWhitelist();
      setWhitelist(whitelistResult.data || []);
    } catch (err) {
      console.error("Erreur de rafraîchissement :", err);
    } finally {
      setRefreshing(false);
    }
  };

  const loadData = async () => {
    try {
      const data = await WhitelistApi.getWhitelist();
      setWhitelist(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Calculs statistiques pour les KPI
  const totalImports = imports.length;
  const successImports = imports.filter(i => i.status === 'completed').length;
  const failedImports = imports.filter(i => i.status === 'failed').length;
  const successRate = totalImports > 0 ? Math.round((successImports / totalImports) * 100) : 100;
  
  // Somme totale de numéros valides insérés
  const totalImportedNumbers = imports
    .filter(i => i.status === 'completed')
    .reduce((sum, item) => sum + (item.records_count || 0), 0);

  const totalWhitelisted = whitelist.length;
  const latestAddedPhone = whitelist.length > 0 ? whitelist[0].phone_number : 'Aucun';

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {loading ? (
        /* Squelette de chargement premium (Shimmer) */
        <div className="dashboard-loading">
          <div className="shimmer-grid">
            <div className="shimmer-card"></div>
            <div className="shimmer-card"></div>
            <div className="shimmer-card"></div>
          </div>
          <div className="shimmer-table"></div>
        </div>
      ) : error ? (
        /* Alerte d'erreur stylisée */
        <div className="dashboard-error">
          <div className="error-card">
            <AlertCircle className="error-icon" />
            <h3>Erreur de Connexion</h3>
            <p>{error}</p>
            <button className="retry-button" onClick={fetchDashboardData}>
              <RefreshCw className="btn-icon" />
              Réessayer
            </button>
          </div>
        </div>
      ) : (
        /* Contenu du Dashboard chargé */
        <div className="dashboard-view animate-fade-in">
          {/* Section Historique des Imports */}
          {activeTab === 'imports' && (
            <div className="tab-pane">
              {/* Titre de section et bouton de rafraîchissement */}
              <div className="section-header">
                <h2>Rapports d'Importations</h2>
                <button 
                  className={`refresh-button ${refreshing ? 'refreshing' : ''}`} 
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`refresh-icon ${refreshing ? 'spin' : ''}`} />
                  <span>{refreshing ? 'Actualisation...' : 'Actualiser'}</span>
                </button>
              </div>

              {/* Tableau principal d'historique */}
              <ImportTable imports={imports} />
            </div>
          )}

          {/* Section Liste de la Whitelist */}
          {activeTab === 'whitelist' && (
            <div className="tab-pane">
              {/* Titre de section et bouton de rafraîchissement */}
              <div className="section-header">
                <h2>Numéros Autorisés</h2>
                <button 
                  className={`refresh-button ${refreshing ? 'refreshing' : ''}`} 
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`refresh-icon ${refreshing ? 'spin' : ''}`} />
                  <span>{refreshing ? 'Actualisation...' : 'Actualiser'}</span>
                </button>
              </div>

              {/* Tableau principal des numéros */}
              <WhitelistTable list={whitelist} onRefresh={loadData} />
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
