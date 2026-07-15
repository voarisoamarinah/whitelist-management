const { sql, poolPromise } = require('../config/db');

class ImportHistoryRepository {
    /**
     * Crée un enregistrement d'importation dans l'historique.
     * 
     * @param {string} filename - Le nom d'origine du fichier CSV.
     * @param {number} serviceNo - Le numéro de service.
     * @param {string} importedBy - L'utilisateur effectuant l'importation.
     * @param {string} [status='pending'] - Le statut initial (pending, completed, failed).
     * @param {number} [recordsCount=0] - Le nombre de lignes importées.
     * @param {object} [transaction] - Transaction SQL active (facultatif).
     * @returns {Promise<number>} L'ID de l'enregistrement d'import créé.
     */
    async create(filename, serviceNo, importedBy, status = 'pending', recordsCount = 0, transaction = null) {
        const pool = await poolPromise;
        const request = new sql.Request(transaction || pool);
        request.input('filename', sql.NVarChar(255), filename);
        request.input('serviceNo', sql.Int, serviceNo);
        request.input('user', sql.NVarChar(100), importedBy);
        request.input('status', sql.NVarChar(50), status);
        request.input('recordsCount', sql.Int, recordsCount);

        const result = await request.query(`
            INSERT INTO ImportHistory (filename, service_no, imported_by, status, records_count)
            OUTPUT INSERTED.id
            VALUES (@filename, @serviceNo, @user, @status, @recordsCount)
        `);
        return result.recordset[0].id;
    }

    /**
     * Met à jour le statut et le nombre d'enregistrements d'un import.
     * 
     * @param {number} id - L'ID de l'import historique.
     * @param {string} status - Le nouveau statut (completed, failed).
     * @param {number} recordsCount - Le nombre final de lignes valides importées.
     * @param {object} [transaction] - Transaction SQL active (facultatif).
     */
    async updateStatusAndCount(id, status, recordsCount, transaction = null) {
        const pool = await poolPromise;
        const request = new sql.Request(transaction || pool);
        request.input('id', sql.Int, id);
        request.input('status', sql.NVarChar(50), status);
        request.input('recordsCount', sql.Int, recordsCount);

        await request.query(`
            UPDATE ImportHistory 
            SET status = @status, records_count = @recordsCount 
            WHERE id = @id
        `);
    }

    /**
     * Met à jour uniquement le statut d'un import.
     * 
     * @param {number} id - L'ID de l'import historique.
     * @param {string} status - Le nouveau statut (completed, failed).
     * @param {object} [transaction] - Transaction SQL active (facultatif).
     */
    async updateStatus(id, status, transaction = null) {
        const pool = await poolPromise;
        const request = new sql.Request(transaction || pool);
        request.input('id', sql.Int, id);
        request.input('status', sql.NVarChar(50), status);

        await request.query(`
            UPDATE ImportHistory 
            SET status = @status 
            WHERE id = @id
        `);
    }

    /**
     * Récupère tout l'historique des importations, trié du plus récent au plus ancien.
     * 
     * @returns {Promise<object[]>} Liste des enregistrements d'importation.
     */
    async findAll() {
        const pool = await poolPromise;
        const request = new sql.Request(pool);
        const result = await request.query(`
            SELECT id, filename, service_no, imported_by, imported_at, status, records_count
            FROM ImportHistory
            ORDER BY imported_at DESC
        `);
        return result.recordset;
    }
}

module.exports = new ImportHistoryRepository();
