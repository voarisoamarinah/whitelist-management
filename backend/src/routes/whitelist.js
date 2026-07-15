const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
const multer = require('multer');
const csv = require('fast-csv');
const fs = require('fs');
const path = require('path');

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

    const phoneRegex = /^\+[0-9]{1,4}\s[0-9]{4}\s[0-9]{4}$/;
    if (!phoneRegex.test(cleanedPhone)) {
        return res.status(400).json({
            success: false,
            message: "Format de numéro invalide. Le format attendu est : +230 5123 4567"
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

// Configuration de multer pour stocker temporairement les fichiers dans un dossier "uploads"
const upload = multer({ dest: 'uploads/' });

// Route POST : Importer un fichier CSV de numéros (Validation stricte "Tout ou Rien")
router.post('/import', upload.single('file'), async (req, res) => {
    const { serviceNo, performedBy } = req.body;
    const file = req.file;

    // 1. Validation de base du fichier
    if (!file) {
        return res.status(400).json({ success: false, message: "Aucun fichier n'a été fourni." });
    }

    if (path.extname(file.originalname).toLowerCase() !== '.csv') {
        fs.unlinkSync(file.path);
        return res.status(400).json({ success: false, message: "Seuls les fichiers .csv sont autorisés." });
    }

    const user = performedBy || 'system';
    const serviceNumber = parseInt(serviceNo) || 0;
    const phoneRegex = /^\+[0-9]{1,4}\s[0-9]{4}\s[0-9]{4}$/;

    let importId;
    let pool;

    try {
        pool = await poolPromise;

        // Étape A : Créer l'enregistrement initial dans ImportHistory (Statut : pending)
        const initHistoryReq = pool.request();
        initHistoryReq.input('filename', sql.NVarChar(255), file.originalname);
        initHistoryReq.input('serviceNo', sql.Int, serviceNumber);
        initHistoryReq.input('user', sql.NVarChar(100), user);

        const historyResult = await initHistoryReq.query(`
            INSERT INTO ImportHistory (filename, service_no, imported_by, status, records_count)
            OUTPUT INSERTED.id
            VALUES (@filename, @serviceNo, @user, 'pending', 0)
        `);

        importId = historyResult.recordset[0].id;

        // Étape B : Parser et lire toutes les lignes du CSV en mémoire
        const csvRows = [];
        await new Promise((resolve, reject) => {
            fs.createReadStream(file.path)
                .pipe(csv.parse({ headers: true, ignoreEmpty: true, trim: true }))
                .on('data', (row) => {
                    csvRows.push(row);
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (csvRows.length === 0) {
            throw new Error("Le fichier CSV est vide.");
        }

        // Étape C : Phase de validation globale (Recherche d'erreurs)
        const errors = [];
        const validPhoneNumbers = [];
        const seenInCsv = new Set(); // Pour détecter les doublons au sein même du fichier CSV

        // On interroge la base de données pour avoir la liste des numéros déjà whitelistés (optimisation)
        const currentWhitelistResult = await pool.request().query('SELECT phone_number FROM Whitelist');
        const existingNumbersInDb = new Set(
            currentWhitelistResult.recordset.map(row => row.phone_number.trim())
        );

        // Analyse ligne par ligne (l'index de ligne commence à 2 car la ligne 1 contient les en-têtes)
        for (let i = 0; i < csvRows.length; i++) {
            const rowNumber = i + 2;
            const row = csvRows[i];
            const rawPhone = row.phone || row.phone_number || row.numero || Object.values(row)[0];

            if (!rawPhone) {
                errors.push(`Ligne ${rowNumber} : Numéro manquant ou vide`);
                continue;
            }

            const cleanedPhone = rawPhone.trim();

            // 1. Validation du format Regex
            if (!phoneRegex.test(cleanedPhone)) {
                errors.push(`Ligne ${rowNumber} : Numéro invalide (${cleanedPhone}). Format attendu: +230 5123 4567`);
                continue;
            }

            // 2. Détection de doublons à l'intérieur même du fichier CSV
            if (seenInCsv.has(cleanedPhone)) {
                errors.push(`Ligne ${rowNumber} : Numéro en double dans le fichier CSV (${cleanedPhone})`);
                continue;
            }
            seenInCsv.add(cleanedPhone);

            // 3. Détection de doublons par rapport à la base de données
            if (existingNumbersInDb.has(cleanedPhone)) {
                errors.push(`Ligne ${rowNumber} : Numéro déjà présent dans la whitelist (${cleanedPhone})`);
                continue;
            }

            validPhoneNumbers.push(cleanedPhone);
        }

        // Étape D : S'il y a la moindre erreur, on fait échouer l'importation directement
        if (errors.length > 0) {
            // 1. Mettre à jour ImportHistory à 'failed'
            const failHistoryReq = pool.request();
            failHistoryReq.input('id', sql.Int, importId);
            await failHistoryReq.query(`
                UPDATE ImportHistory 
                SET status = 'failed', records_count = 0 
                WHERE id = @id
            `);

            // 2. Enregistrer un log d'audit pour l'échec
            const auditFailReq = pool.request();
            auditFailReq.input('action', sql.NVarChar(50), 'IMPORT_FAILED');
            auditFailReq.input('phone', sql.NVarChar(20), `BATCH_${importId}`);
            auditFailReq.input('user', sql.NVarChar(100), user);
            auditFailReq.input('details', sql.NVarChar(sql.MAX), `Tentative d'importation échouée pour le fichier ${file.originalname}. Raison : Import invalide (${errors.length} erreurs détectées).`);

            await auditFailReq.query(`
                INSERT INTO AuditLogs (action_type, phone_number, performed_by, details)
                VALUES (@action, @phone, @user, @details)
            `);

            // Nettoyer le fichier temporaire
            fs.unlinkSync(file.path);

            // Retourner la réponse avec la liste complète des erreurs rencontrées
            return res.status(422).json({
                success: false,
                message: "L'importation a échoué car le fichier contient des erreurs. Aucun numéro n'a été enregistré.",
                errors: errors
            });
        }

        // Étape E : Si AUCUNE erreur n'est trouvée, on insère tout en base de données de manière atomique
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Insertion des numéros valides
            for (const phone of validPhoneNumbers) {
                const insertReq = new sql.Request(transaction);
                insertReq.input('phone', sql.NVarChar(20), phone);
                await insertReq.query("INSERT INTO Whitelist (phone_number, status) VALUES (@phone, 'whitelisted')");
            }

            // Mise à jour de l'historique de l'import (success)
            const updateHistoryReq = new sql.Request(transaction);
            updateHistoryReq.input('id', sql.Int, importId);
            updateHistoryReq.input('count', sql.Int, validPhoneNumbers.length);
            await updateHistoryReq.query(`
                UPDATE ImportHistory 
                SET status = 'completed', records_count = @count 
                WHERE id = @id
            `);

            // Log d'audit de succès
            const auditSuccessReq = new sql.Request(transaction);
            auditSuccessReq.input('action', sql.NVarChar(50), 'IMPORT');
            auditSuccessReq.input('phone', sql.NVarChar(20), `BATCH_${importId}`);
            auditSuccessReq.input('user', sql.NVarChar(100), user);
            auditSuccessReq.input('details', sql.NVarChar(sql.MAX), `Importation réussie de ${validPhoneNumbers.length} numéros via le fichier ${file.originalname}.`);

            await auditSuccessReq.query(`
                INSERT INTO AuditLogs (action_type, phone_number, performed_by, details)
                VALUES (@action, @phone, @user, @details)
            `);

            await transaction.commit();

        } catch (txError) {
            await transaction.rollback();
            throw txError; // Redirige vers le catch général
        }

        // Nettoyage final du fichier temporaire
        fs.unlinkSync(file.path);

        return res.status(200).json({
            success: true,
            message: "Fichier validé et importé avec succès !",
            importId,
            insertedCount: validPhoneNumbers.length
        });

    } catch (error) {
        // En cas d'erreur serveur imprévue (perte de connexion, etc.)
        if (importId && pool) {
            const failReq = pool.request();
            failReq.input('id', sql.Int, importId);
            await failReq.query("UPDATE ImportHistory SET status = 'failed' WHERE id = @id").catch(console.error);
        }

        if (file && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        console.error("Erreur serveur lors de l'importation :", error);
        return res.status(500).json({
            success: false,
            message: "Une erreur interne s'est produite lors du traitement de l'importation."
        });
    }
});

module.exports = router;