const { sql, poolPromise } = require('../config/db');

class AuditLogRepository {
    /**
     * Enregistre une action d'audit dans la base de données.
     * 
     * @param {string} actionType - Le type d'action (INSERT, DELETE, IMPORT, etc.).
     * @param {string} phoneNumber - Le numéro concerné ou identifiant du lot.
     * @param {string} performedBy - L'utilisateur qui effectue l'action.
     * @param {string} details - Informations détaillées sur l'action.
     * @param {object} [transaction] - Transaction SQL active (facultatif).
     */
    async create(actionType, phoneNumber, performedBy, details, transaction = null) {
        const pool = await poolPromise;
        const request = new sql.Request(transaction || pool);
        request.input('action', sql.NVarChar(50), actionType);
        request.input('phone', sql.NVarChar(20), phoneNumber);
        request.input('user', sql.NVarChar(100), performedBy);
        request.input('details', sql.NVarChar(sql.MAX), details);

        await request.query(`
            INSERT INTO AuditLogs (action_type, phone_number, performed_by, details) 
            VALUES (@action, @phone, @user, @details)
        `);
    }
}

module.exports = new AuditLogRepository();
