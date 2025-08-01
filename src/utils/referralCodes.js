
const crypto = require('crypto');

class ReferralCodeGenerator {
    constructor() {
        this.codeLength = 8;
        this.chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        this.excludeChars = ['0', 'O', '1', 'I', 'L']; // Confusing characters
        this.allowedChars = this.chars.split('').filter(char => 
            !this.excludeChars.includes(char)
        );
    }

    // Generate a random referral code
    generate(length = this.codeLength) {
        let result = '';
        
        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, this.allowedChars.length);
            result += this.allowedChars[randomIndex];
        }
        
        return result;
    }

    // Validate referral code format
    validate(code) {
        if (!code || typeof code !== 'string') {
            return false;
        }
        
        // Check length
        if (code.length < 6 || code.length > 12) {
            return false;
        }
        
        // Check characters
        return code.split('').every(char => 
            this.allowedChars.includes(char.toUpperCase())
        );
    }

    // Generate safe code (avoiding offensive combinations)
    generateSafe() {
        let code;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            code = this.generate();
            attempts++;
        } while (this.isCommonWord(code) && attempts < maxAttempts);
        
        return code;
    }

    // Check if code looks like a common word (to avoid)
    isCommonWord(code) {
        const commonWords = [
            'FUCK', 'SHIT', 'DAMN', 'HELL', 'HATE', 'KILL', 'DEAD',
            'SCAM', 'FAKE', 'SPAM', 'HACK', 'EVIL', 'BAD'
        ];
        
        return commonWords.some(word => code.includes(word));
    }
}

// Create instance and export functions
const generator = new ReferralCodeGenerator();

const generateReferralCode = () => generator.generateSafe();
const validateReferralCode = (code) => generator.validate(code);

module.exports = {
    ReferralCodeGenerator,
    generateReferralCode,
    validateReferralCode
};
