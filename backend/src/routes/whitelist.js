const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');

// Route POST : Ajouter un numéro unitaire à la whitelist
router.post('/add', async (req, res) => {
    const { phoneNumber, performedBy, details } = req.body;

    // 1. Validation de base des entrées
    if (!phoneNumber) {
        return res.status(400).json({
            success: false,
            message: "Le numéro de téléphone est obligatoire."
        });
    }

    const phoneRegex = /^\+?[0-9\s\-]{8,15}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
        return res.status(400).json({
            success: false,
            message: "Format de numéro de téléphone invalide."
        });
    }

    const cleanedPhone = phoneNumber.trim();
    const user = performedBy || 'system';
    const logDetails = details || 'Ajout unitaire manuel';

    let transaction;
    try {
        // On récupère le pool de connexion déjà configuré et démarré au lancement du serveur
        const pool = await poolPromise;

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Étape A : Insérer dans la table Whitelist
        const whitelistRequest = new sql.Request(transaction);
        whitelistRequest.input('phone', sql.NVarChar(20), cleanedPhone);

        const checkResult = await whitelistRequest.query(
            'SELECT TOP 1 id FROM Whitelist WHERE phone_number = @phone'
        );

        if (checkResult.recordset.length > 0) {
            await transaction.rollback();
            return res.status(409).json({
                success: false,
                message: "Ce numéro de téléphone est déjà présent dans la whitelist."
            });
        }

        await whitelistRequest.query(
            'INSERT INTO Whitelist (phone_number, status) VALUES (@phone, \'whitelisted\')'
        );

        // Étape B : Insérer l'action dans les Logs d'Audit
        const auditRequest = new sql.Request(transaction);
        auditRequest.input('action', sql.NVarChar(50), 'INSERT');
        auditRequest.input('phone', sql.NVarChar(20), cleanedPhone);
        auditRequest.input('user', sql.NVarChar(100), user);
        auditRequest.input('details', sql.NVarChar(sql.MAX), logDetails);

        await auditRequest.query(
            `INSERT INTO AuditLogs (action_type, phone_number, performed_by, details) 
             VALUES (@action, @phone, @user, @details)`
        );

        await transaction.commit();

        return res.status(201).json({
            success: true,
            message: `Le numéro ${cleanedPhone} a été ajouté avec succès à la whitelist.`
        });

    } catch (error) {
        if (transaction) {
            try { await transaction.rollback(); } catch (e) { console.error(e); }
        }
        console.error("Erreur lors de l'ajout du numéro :", error);
        return res.status(500).json({
            success: false,
            message: "Une erreur interne est survenue lors de l'ajout."
        });
    }
});

module.exports = router;