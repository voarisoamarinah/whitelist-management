const sql = require('mssql');
require('dotenv').config();

// Configuration de la connexion à l'aide des variables d'environnement
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    options: {
        encrypt: true, // Recommandé pour les connexions cloud/Azure, à laisser à true par défaut
        trustServerCertificate: true, // Indispensable pour le développement en local (évite les erreurs de certificat SSL)
    },
    pool: {
        max: 10, // Nombre maximal de connexions simultanées dans le pool
        min: 0,
        idleTimeoutMillis: 30000 // Ferme les connexions inactives après 30 secondes
    }
};

// Initialisation du pool de connexions
const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ Connecté avec succès à la base de données MSSQL !');
        return pool;
    })
    .catch(err => {
        console.error('❌ Échec de la connexion à la base de données MSSQL : ', err);
        process.exit(1); // Arrête le serveur si la base de données est inaccessible au démarrage
    });

module.exports = {
    sql,
    poolPromise
};