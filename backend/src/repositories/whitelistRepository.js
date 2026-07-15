const { sql, poolPromise } = require('../config/db');

class WhitelistRepository {
    /**
     * Recherche un numéro de téléphone dans la table Whitelist.
     * 
     * @param {string} phoneNumber - Le numéro de téléphone nettoyé.
     * @param {object} [transaction] - Transaction SQL active (facultatif).
     * @returns {Promise<object|null>} L'enregistrement s'il existe, sinon null.
     */
    async findByPhone(phoneNumber, transaction = null) {
        const pool = await poolPromise;
        const request = new sql.Request(transaction || pool);
        request.input('phone', sql.NVarChar(20), phoneNumber);
        const result = await request.query(
            'SELECT TOP 1 id, phone_number, status, created_at FROM Whitelist WHERE phone_number = @phone'
        );
        return result.recordset[0] || null;
    }

    /**
     * Ajoute un numéro de téléphone dans la table Whitelist.
     * 
     * @param {string} phoneNumber - Le numéro de téléphone nettoyé.
     * @param {object} [transaction] - Transaction SQL active (facultatif).
     */
    async add(phoneNumber, transaction = null) {
        const pool = await poolPromise;
        const request = new sql.Request(transaction || pool);
        request.input('phone', sql.NVarChar(20), phoneNumber);
        await request.query(
            "INSERT INTO Whitelist (phone_number, status) VALUES (@phone, 'whitelisted')"
        );
    }

    /**
     * Supprime un numéro de téléphone de la table Whitelist.
     * 
     * @param {string} phoneNumber - Le numéro de téléphone nettoyé.
     * @param {object} [transaction] - Transaction SQL active (facultatif).
     */
    async remove(phoneNumber, transaction = null) {
        const pool = await poolPromise;
        const request = new sql.Request(transaction || pool);
        request.input('phone', sql.NVarChar(20), phoneNumber);
        await request.query(
            'DELETE FROM Whitelist WHERE phone_number = @phone'
        );
    }

    /**
     * Récupère la liste de tous les numéros de téléphone whitelistés.
     * Utile pour la détection optimisée de doublons lors d'un import massif.
     * 
     * @param {object} [transaction] - Transaction SQL active (facultatif).
     * @returns {Promise<string[]>} Un tableau contenant tous les numéros de téléphone nettoyés.
     */
    async getAllPhones(transaction = null) {
        const pool = await poolPromise;
        const request = new sql.Request(transaction || pool);
        const result = await request.query('SELECT phone_number FROM Whitelist');
        return result.recordset.map(row => row.phone_number.trim());
    }

    /**
     * Récupère tous les enregistrements de la table Whitelist, triés par date de création (du plus récent au plus ancien).
     * 
     * @returns {Promise<object[]>} Liste complète des enregistrements de la whitelist.
     */
    async findAll() {
        const pool = await poolPromise;
        const request = new sql.Request(pool);
        const result = await request.query(
            'SELECT id, phone_number, status, created_at FROM Whitelist ORDER BY created_at DESC'
        );
        return result.recordset;
    }
}

module.exports = new WhitelistRepository();
