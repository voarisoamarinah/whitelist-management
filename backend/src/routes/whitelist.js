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

// Route DELETE : Retirer un numéro de la whitelist et enregistrer l'action
router.delete('/remove', async (req, res) => {
    const { phoneNumber, performedBy, details } = req.body;

    // 1. Validation de base
    if (!phoneNumber) {
        return res.status(400).json({
            success: false,
            message: "Le numéro de téléphone est obligatoire."
        });
    }

    const cleanedPhone = phoneNumber.trim();
    const user = performedBy || 'system';
    const logDetails = details || 'Suppression unitaire manuelle';

    let transaction;
    try {
        // Récupération du pool de connexion existant
        const pool = await poolPromise;

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Étape A : Vérifier si le numéro existe bien dans la Whitelist
        const checkRequest = new sql.Request(transaction);
        checkRequest.input('phone', sql.NVarChar(20), cleanedPhone);

        const checkResult = await checkRequest.query(
            'SELECT TOP 1 id FROM Whitelist WHERE phone_number = @phone'
        );

        if (checkResult.recordset.length === 0) {
            // Le numéro n'existe pas, inutile d'aller plus loin
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: `Le numéro ${cleanedPhone} n'existe pas dans la whitelist.`
            });
        }

        // Étape B : Supprimer le numéro de la Whitelist
        const deleteRequest = new sql.Request(transaction);
        deleteRequest.input('phone', sql.NVarChar(20), cleanedPhone);
        await deleteRequest.query(
            'DELETE FROM Whitelist WHERE phone_number = @phone'
        );

        // Étape C : Enregistrer la suppression dans l'Audit
        const auditRequest = new sql.Request(transaction);
        auditRequest.input('action', sql.NVarChar(50), 'DELETE');
        auditRequest.input('phone', sql.NVarChar(20), cleanedPhone);
        auditRequest.input('user', sql.NVarChar(100), user);
        auditRequest.input('details', sql.NVarChar(sql.MAX), logDetails);

        await auditRequest.query(
            `INSERT INTO AuditLogs (action_type, phone_number, performed_by, details) 
             VALUES (@action, @phone, @user, @details)`
        );

        // Validation de la transaction
        await transaction.commit();

        return res.status(200).json({
            success: true,
            message: `Le numéro ${cleanedPhone} a été retiré de la whitelist et l'action a été loggée.`
        });

    } catch (error) {
        // En cas d'erreur de base de données, annulation complète
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error("Erreur lors du rollback :", rollbackError);
            }
        }

        console.error("Erreur lors de la suppression du numéro :", error);
        return res.status(500).json({
            success: false,
            message: "Une erreur interne est survenue lors de la suppression."
        });
    }
});

module.exports = router;