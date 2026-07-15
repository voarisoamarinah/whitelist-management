const multer = require('multer');

// Configuration de multer pour stocker temporairement les fichiers dans le dossier "uploads"
const upload = multer({ dest: 'uploads/' });

module.exports = upload;
