const API_BASE_URL = 'http://localhost:5000/api/whitelist';

class WhitelistApi {
    /**
     * Récupère l'historique des importations de fichiers CSV.
     */
    async getImportHistory() {
        try {
            const response = await fetch(`${API_BASE_URL}/imports`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Erreur serveur (code: ${response.status})`);
            }
            return await response.json();
        } catch (error) {
            console.error("Erreur getImportHistory :", error);
            throw error;
        }
    }

    /**
     * Récupère la liste de tous les numéros whitelistés.
     */
    async getWhitelist() {
        try {
            const response = await fetch(`${API_BASE_URL}/list`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Erreur serveur (code: ${response.status})`);
            }
            return await response.json();
        } catch (error) {
            console.error("Erreur getWhitelist :", error);
            throw error;
        }
    }

    /**
     * Ajoute un numéro de téléphone unitaire à la whitelist.
     */
    async addPhoneNumber(phoneNumber, performedBy = 'system', details = '') {
        try {
            const response = await fetch(`${API_BASE_URL}/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, performedBy, details })
            });
            const data = await response.json();
            return {
                success: response.ok,
                status: response.status,
                message: data.message
            };
        } catch (error) {
            console.error("Erreur addPhoneNumber :", error);
            return {
                success: false,
                status: 500,
                message: "Impossible de contacter le serveur backend."
            };
        }
    }

    /**
     * Supprime un numéro de téléphone unitaire de la whitelist.
     */
    async removePhoneNumber(phoneNumber, performedBy = 'system', details = '') {
        try {
            const response = await fetch(`${API_BASE_URL}/remove`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, performedBy, details })
            });
            const data = await response.json();
            return {
                success: response.ok,
                status: response.status,
                message: data.message
            };
        } catch (error) {
            console.error("Erreur removePhoneNumber :", error);
            return {
                success: false,
                status: 500,
                message: "Impossible de contacter le serveur backend."
            };
        }
    }

    /**
     * Téléverse un fichier CSV pour import massif.
     * 
     * @param {FormData} formData - Objet FormData contenant la clé 'file', 'serviceNo', et 'performedBy'.
     */
    async importCsv(formData) {
        try {
            const response = await fetch(`${API_BASE_URL}/import`, {
                method: 'POST',
                body: formData // Note : Le navigateur configure automatiquement les en-têtes multipart/form-data
            });
            const data = await response.json();
            return {
                success: response.ok,
                status: response.status,
                message: data.message,
                errors: data.errors || null,
                importId: data.importId,
                insertedCount: data.insertedCount
            };
        } catch (error) {
            console.error("Erreur importCsv :", error);
            return {
                success: false,
                status: 500,
                message: "Impossible de contacter le serveur backend pour téléverser."
            };
        }
    }
}

export default new WhitelistApi();
