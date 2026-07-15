const whitelistService = require('../services/whitelistService');

class WhitelistController {
    /**
     * Gère la requête POST pour ajouter un numéro unitaire à la whitelist.
     */
    async add(req, res) {
        try {
            const { phoneNumber, performedBy, details } = req.body;
            const result = await whitelistService.addPhoneNumber(phoneNumber, performedBy, details);

            return res.status(result.status).json({
                success: result.success,
                message: result.message
            });
        } catch (error) {
            console.error("Erreur lors de l'ajout du numéro :", error);
            return res.status(500).json({
                success: false,
                message: "Une erreur interne est survenue lors de l'ajout."
            });
        }
    }

    /**
     * Gère la requête DELETE pour retirer un numéro unitaire de la whitelist.
     */
    async remove(req, res) {
        try {
            const { phoneNumber, performedBy, details } = req.body;
            const result = await whitelistService.removePhoneNumber(phoneNumber, performedBy, details);

            return res.status(result.status).json({
                success: result.success,
                message: result.message
            });
        } catch (error) {
            console.error("Erreur lors de la suppression du numéro :", error);
            return res.status(500).json({
                success: false,
                message: "Une erreur interne est survenue lors de la suppression."
            });
        }
    }

    /**
     * Gère la requête POST pour importer un fichier CSV.
     */
    async importCsv(req, res) {
        try {
            const { serviceNo, performedBy } = req.body;
            const file = req.file;

            const result = await whitelistService.importCsv(file, serviceNo, performedBy);

            const response = {
                success: result.success,
                message: result.message
            };

            if (result.errors) {
                response.errors = result.errors;
            }

            if (result.importId !== undefined) {
                response.importId = result.importId;
                response.insertedCount = result.insertedCount;
            }

            return res.status(result.status).json(response);
        } catch (error) {
            console.error("Erreur serveur lors de l'importation :", error);
            return res.status(500).json({
                success: false,
                message: "Une erreur interne s'est produite lors du traitement de l'importation."
            });
        }
    }

    /**
     * Gère la requête GET pour récupérer l'historique des imports.
     */
    async getImportHistory(req, res) {
        try {
            const result = await whitelistService.getImportHistory();
            return res.status(result.status).json({
                success: result.success,
                data: result.data
            });
        } catch (error) {
            console.error("Erreur lors de la récupération de l'historique des imports :", error);
            return res.status(500).json({
                success: false,
                message: "Une erreur interne est survenue lors de la récupération de l'historique."
            });
        }
    }

    /**
     * Gère la requête GET pour récupérer tous les numéros de la whitelist.
     */
    async getWhitelist(req, res) {
        try {
            const result = await whitelistService.getWhitelist();
            return res.status(result.status).json({
                success: result.success,
                data: result.data
            });
        } catch (error) {
            console.error("Erreur lors de la récupération de la whitelist :", error);
            return res.status(500).json({
                success: false,
                message: "Une erreur interne est survenue lors de la récupération de la whitelist."
            });
        }
    }
}

// L'utilisation d'une seule instance du contrôleur simplifie son exportation/importation
module.exports = new WhitelistController();
