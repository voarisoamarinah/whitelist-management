const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const { sql, poolPromise } = require('../config/db');
const whitelistRepository = require('../repositories/whitelistRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const importHistoryRepository = require('../repositories/importHistoryRepository');
const { validatePhone } = require('../utils/phoneValidator');

class WhitelistService {
    /**
     * Ajoute un numéro unitaire à la whitelist.
     * 
     * @param {string} phoneNumber - Le numéro de téléphone brut.
     * @param {string} performedBy - L'utilisateur effectuant l'ajout.
     * @param {string} details - Détails sur l'opération.
     * @returns {Promise<object>} Le résultat de l'opération { success, status, message }.
     */
    async addPhoneNumber(phoneNumber, performedBy, details) {
        // 1. Validation de format
        const validation = validatePhone(phoneNumber);
        if (!validation.isValid) {
            return {
                success: false,
                status: 400,
                message: validation.message
            };
        }

        const cleanedPhone = validation.cleanedPhone;
        const user = performedBy || 'system';
        const logDetails = details || 'Ajout unitaire manuel';

        let transaction;
        try {
            const pool = await poolPromise;
            transaction = new sql.Transaction(pool);
            await transaction.begin();

            // Étape A : Vérifier si le numéro existe déjà
            const existing = await whitelistRepository.findByPhone(cleanedPhone, transaction);
            if (existing) {
                await transaction.rollback();
                return {
                    success: false,
                    status: 409,
                    message: "Ce numéro de téléphone est déjà présent dans la whitelist."
                };
            }

            // Étape B : Insérer dans la table Whitelist
            await whitelistRepository.add(cleanedPhone, transaction);

            // Étape C : Enregistrer dans les Logs d'Audit
            await auditLogRepository.create('INSERT', cleanedPhone, user, logDetails, transaction);

            await transaction.commit();

            return {
                success: true,
                status: 201,
                message: `Le numéro ${cleanedPhone} a été ajouté avec succès à la whitelist.`
            };

        } catch (error) {
            if (transaction) {
                try { await transaction.rollback(); } catch (e) { console.error("Erreur rollback :", e); }
            }
            throw error;
        }
    }

    /**
     * Retire un numéro unitaire de la whitelist.
     * 
     * @param {string} phoneNumber - Le numéro de téléphone brut.
     * @param {string} performedBy - L'utilisateur effectuant la suppression.
     * @param {string} details - Détails sur l'opération.
     * @returns {Promise<object>} Le résultat de l'opération { success, status, message }.
     */
    async removePhoneNumber(phoneNumber, performedBy, details) {
        if (!phoneNumber) {
            return {
                success: false,
                status: 400,
                message: "Le numéro de téléphone est obligatoire."
            };
        }

        const cleanedPhone = phoneNumber.trim();
        const user = performedBy || 'system';
        const logDetails = details || 'Suppression unitaire manuelle';

        let transaction;
        try {
            const pool = await poolPromise;
            transaction = new sql.Transaction(pool);
            await transaction.begin();

            // Étape A : Vérifier si le numéro existe
            const existing = await whitelistRepository.findByPhone(cleanedPhone, transaction);
            if (!existing) {
                await transaction.rollback();
                return {
                    success: false,
                    status: 404,
                    message: `Le numéro ${cleanedPhone} n'existe pas dans la whitelist.`
                };
            }

            // Étape B : Supprimer le numéro de la Whitelist
            await whitelistRepository.remove(cleanedPhone, transaction);

            // Étape C : Enregistrer la suppression dans l'Audit
            await auditLogRepository.create('DELETE', cleanedPhone, user, logDetails, transaction);

            await transaction.commit();

            return {
                success: true,
                status: 200,
                message: `Le numéro ${cleanedPhone} a été retiré de la whitelist et l'action a été loggée.`
            };

        } catch (error) {
            if (transaction) {
                try { await transaction.rollback(); } catch (e) { console.error("Erreur rollback :", e); }
            }
            throw error;
        }
    }

    /**
     * Importe un fichier CSV de numéros de manière atomique ("Tout ou Rien").
     * 
     * @param {object} file - Le fichier uploadé par multer.
     * @param {string|number} serviceNo - Le numéro de service.
     * @param {string} performedBy - L'utilisateur effectuant l'import.
     * @returns {Promise<object>} Le résultat de l'import { success, status, message, errors, importId, insertedCount }.
     */
    async importCsv(file, serviceNo, performedBy) {
        if (!file) {
            return {
                success: false,
                status: 400,
                message: "Aucun fichier n'a été fourni."
            };
        }

        if (path.extname(file.originalname).toLowerCase() !== '.csv') {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
            return {
                success: false,
                status: 400,
                message: "Seuls les fichiers .csv sont autorisés."
            };
        }

        const user = performedBy || 'system';
        const serviceNumber = parseInt(serviceNo, 10) || 0;

        let importId;
        let pool;

        try {
            pool = await poolPromise;

            // Étape A : Créer l'enregistrement initial dans ImportHistory (Statut : pending)
            importId = await importHistoryRepository.create(file.originalname, serviceNumber, user, 'pending', 0);

            // Étape B : Parser le fichier CSV en mémoire
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

            // Étape C : Phase de validation globale
            const errors = [];
            const validPhoneNumbers = [];
            const seenInCsv = new Set();

            // Interroger la DB pour avoir la liste des numéros déjà whitelistés
            const existingNumbersInDb = new Set(await whitelistRepository.getAllPhones());

            for (let i = 0; i < csvRows.length; i++) {
                const rowNumber = i + 2; // +2 car ligne 1 = en-tête
                const row = csvRows[i];
                const rawPhone = row.phone || row.phone_number || row.numero || Object.values(row)[0];

                if (!rawPhone) {
                    errors.push(`Ligne ${rowNumber} : Numéro manquant ou vide`);
                    continue;
                }

                const cleanedPhone = rawPhone.trim();

                // 1. Validation du format
                const validation = validatePhone(cleanedPhone);
                if (!validation.isValid) {
                    errors.push(`Ligne ${rowNumber} : Numéro invalide (${cleanedPhone}). Format attendu: +230 5123 4567`);
                    continue;
                }

                // 2. Détection de doublons dans le fichier CSV
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

            // Étape D : S'il y a des erreurs, on fait échouer l'importation directement
            if (errors.length > 0) {
                // 1. Mettre à jour ImportHistory à 'failed'
                await importHistoryRepository.updateStatusAndCount(importId, 'failed', 0);

                // 2. Enregistrer un log d'audit pour l'échec
                const failDetails = `Tentative d'importation échouée pour le fichier ${file.originalname}. Raison : Import invalide (${errors.length} erreurs détectées).`;
                await auditLogRepository.create('IMPORT_FAILED', `BATCH_${importId}`, user, failDetails);

                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }

                return {
                    success: false,
                    status: 422,
                    message: "L'importation a échoué car le fichier contient des erreurs. Aucun numéro n'a été enregistré.",
                    errors: errors
                };
            }

            // Étape E : Si aucune erreur n'est trouvée, insertion atomique
            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                // Insertion des numéros valides
                for (const phone of validPhoneNumbers) {
                    await whitelistRepository.add(phone, transaction);
                }

                // Mise à jour de l'historique
                await importHistoryRepository.updateStatusAndCount(importId, 'completed', validPhoneNumbers.length, transaction);

                // Log d'audit
                const successDetails = `Importation réussie de ${validPhoneNumbers.length} numéros via le fichier ${file.originalname}.`;
                await auditLogRepository.create('IMPORT', `BATCH_${importId}`, user, successDetails, transaction);

                await transaction.commit();

            } catch (txError) {
                try { await transaction.rollback(); } catch (e) { console.error("Erreur lors du rollback :", e); }
                throw txError;
            }

            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }

            return {
                success: true,
                status: 200,
                message: "Fichier validé et importé avec succès !",
                importId,
                insertedCount: validPhoneNumbers.length
            };

        } catch (error) {
            // Mise à jour en échec si un ID d'import existe
            if (importId) {
                await importHistoryRepository.updateStatus(importId, 'failed').catch(console.error);
            }

            if (file && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }

            throw error;
        }
    }
}

module.exports = new WhitelistService();
