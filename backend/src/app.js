const express = require('express');
const cors = require('cors');
const app = express();

// Configure CORS pour autoriser uniquement ton frontend
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware pour parser le JSON du body des requêtes
app.use(express.json());

// Import de tes fichiers de routes
const whitelistRoutes = require('./routes/whitelist');

// Liaison des routes
app.use('/api/whitelist', whitelistRoutes);

// Ton ancienne route ping
app.get('/ping', (req, res) => {
    res.send('pong');
});

// Port et démarrage
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});