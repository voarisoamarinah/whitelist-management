const express = require('express');
const app = express();

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