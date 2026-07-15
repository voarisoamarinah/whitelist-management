const PHONE_REGEX = /^\+[0-9]{1,4}\s[0-9]{4}\s[0-9]{4}$/;

/**
 * Valide le format d'un numéro de téléphone.
 * Le format attendu est par exemple : +230 5123 4567
 *
 * @param {string} phoneNumber - Le numéro de téléphone brut.
 * @returns {object} Un objet { isValid, cleanedPhone, message }
 */
function validatePhone(phoneNumber) {
    if (!phoneNumber) {
        return {
            isValid: false,
            message: "Le numéro de téléphone est obligatoire."
        };
    }

    const cleanedPhone = phoneNumber.trim();

    if (!PHONE_REGEX.test(cleanedPhone)) {
        return {
            isValid: false,
            message: "Format de numéro invalide. Le format attendu est : +230 5123 4567"
        };
    }

    return {
        isValid: true,
        cleanedPhone
    };
}

module.exports = {
    validatePhone,
    PHONE_REGEX
};
