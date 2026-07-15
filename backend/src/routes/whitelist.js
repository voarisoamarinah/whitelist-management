const express = require('express');
const router = express.Router();
const whitelistController = require('../controllers/whitelistController');
const upload = require('../middleware/upload');

// Route POST : Ajouter un numéro unitaire à la whitelist
router.post('/add', whitelistController.add);

// Route DELETE : Retirer un numéro de la whitelist et enregistrer l'action
router.delete('/remove', whitelistController.remove);

// Route POST : Importer un fichier CSV de numéros (Validation stricte "Tout ou Rien")
router.post('/import', upload.single('file'), whitelistController.importCsv);

module.exports = router;