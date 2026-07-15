const express = require('express');
const cors = require('cors');
const { poolPromise } = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares globaux
app.use(cors());
app.use(express.json()); // Permet à Express de lire le format JSON dans les requêtes

// Route de test minimale
app.get('/ping', async (req, res) => {
    try {
        const pool = await poolPromise;
        // Effectue une requête SQL simple pour valider la communication
        const result = await pool.request().query('SELECT GETDATE() as serverTime');
        res.json({
            status: 'Ok',
            message: 'Le serveur et la base de données communiquent parfaitement !',
            dbTime: result.recordset[0].serverTime
        });
    } catch (err) {
        res.status(500).json({ status: 'Error', error: err.message });
    }
});

// Lancement du serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});