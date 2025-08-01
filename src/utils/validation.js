// src/utils/validation.js
class ValidationUtils {
    // Validate Ethereum/BSC wallet address
    static isValidWalletAddress(address) {
        if (typeof address !== 'string') return false;
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    // Validate transaction hash
    static isValidTxHash(hash) {
        if (typeof hash !== 'string') return false;
        return /^0x[a-fA-F0-9]{64}$/.test(hash);
    }

    // Validate Telegram user ID
    static isValidTelegramId(id) {
        const numId = parseInt(id);
        return !isNaN(numId) && numId > 0 && numId < 10000000000; // Reasonable range
    }

    // Validate referral code
    static isValidReferralCode(code) {
        if (typeof code !== 'string') return false;
        return /^[A-Z0-9]{6,12}$/.test(code);
    }

    // Validate email address
    static isValidEmail(email) {
        if (typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate URL
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    // Validate positive number
    static isPositiveNumber(value) {
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
    }

    // Validate integer in range
    static isValidInteger(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
        const num = parseInt(value);
        return !isNaN(num) && num >= min && num <= max;
    }

    // Validate plan ID
    static isValidPlanId(planId) {
        return this.isValidInteger(planId, 1, 16);
    }

    // Validate USDT amount
    static isValidUSDTAmount(amount) {
        const num = parseFloat(amount);
        return !isNaN(num) && num >= 0.01 && num <= 1000000; // Reasonable limits
    }

    // Sanitize user input
    static sanitizeInput(input, maxLength = 1000) {
        if (typeof input !== 'string') return '';
        
        return input
            .replace(/[<>\"'&]/g, '') // Remove potentially dangerous chars
            .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
            .trim()
            .slice(0, maxLength);
    }

    // Validate and sanitize text message
    static sanitizeMessage(message, maxLength = 4000) {
        if (typeof message !== 'string') return '';
        
        // Remove excessive whitespace
        const cleaned = message
            .replace(/\s+/g, ' ') // Multiple spaces to single
            .replace(/\n{3,}/g, '\n\n') // Multiple newlines to double
            .trim();
        
        return this.sanitizeInput(cleaned, maxLength);
    }

    // Check for suspicious patterns
    static containsSuspiciousContent(text) {
        if (typeof text !== 'string') return false;
        
        const suspiciousPatterns = [
            /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/, // Phone numbers
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email addresses
            /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/, // URLs
            /\b(?:credit|debit|bank|account|password|pin|ssn|social)\b/i, // Sensitive info
            /\b(?:bitcoin|btc|ethereum|eth|wallet|private.*key|seed.*phrase)\b/i // Crypto terms
        ];
        
        return suspiciousPatterns.some(pattern => pattern.test(text));
    }

    // Validate username format
    static isValidUsername(username) {
        if (typeof username !== 'string') return false;
        // Telegram username format: 5-32 chars, alphanumeric + underscore
        return /^[a-zA-Z0-9_]{5,32}$/.test(username);
    }

    // Validate plan upgrade path
    static isValidUpgradePath(currentPlan, targetPlan) {
        const current = parseInt(currentPlan);
        const target = parseInt(targetPlan);
        
        if (!this.isValidPlanId(current) || !this.isValidPlanId(target)) {
            return false;
        }
        
        // Can only upgrade to next level
        return target === current + 1;
    }

    // Validate date format
    static isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    }

    // Check if value is within reasonable bounds
    static isWithinBounds(value, min, max) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    }

    // Validate JSON string
    static isValidJSON(jsonString) {
        try {
            JSON.parse(jsonString);
            return true;
        } catch {
            return false;
        }
    }

    // Rate limiting validation
    static validateRateLimit(userRequests, maxRequests, timeWindow) {
        const now = Date.now();
        const recentRequests = userRequests.filter(
            timestamp => now - timestamp < timeWindow
        );
        return recentRequests.length < maxRequests;
    }

    // Validate file upload
    static validateFileUpload(file, allowedTypes = [], maxSize = 5 * 1024 * 1024) {
        if (!file) return { valid: false, error: 'No file provided' };
        
        // Check file size
        if (file.size > maxSize) {
            return { 
                valid: false, 
                error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB` 
            };
        }
        
        // Check file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
            return { 
                valid: false, 
                error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` 
            };
        }
        
        return { valid: true };
    }

    // Validate batch operations
    static validateBatch(items, validator, maxItems = 100) {
        if (!Array.isArray(items)) {
            return { valid: false, error: 'Items must be an array' };
        }
        
        if (items.length === 0) {
            return { valid: false, error: 'No items provided' };
        }
        
        if (items.length > maxItems) {
            return { valid: false, error: `Too many items. Maximum: ${maxItems}` };
        }
        
        const errors = [];
        for (let i = 0; i < items.length; i++) {
            if (!validator(items[i])) {
                errors.push(`Item ${i + 1} is invalid`);
            }
        }
        
        if (errors.length > 0) {
            return { valid: false, errors };
        }
        
        return { valid: true };
    }

    // Password strength validation
    static validatePasswordStrength(password) {
        if (typeof password !== 'string') {
            return { valid: false, error: 'Password must be a string' };
        }
        
        if (password.length < 8) {
            return { valid: false, error: 'Password must be at least 8 characters' };
        }
        
        if (!/[A-Z]/.test(password)) {
            return { valid: false, error: 'Password must contain uppercase letter' };
        }
        
        if (!/[a-z]/.test(password)) {
            return { valid: false, error: 'Password must contain lowercase letter' };
        }
        
        if (!/[0-9]/.test(password)) {
            return { valid: false, error: 'Password must contain number' };
        }
        
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            return { valid: false, error: 'Password must contain special character' };
        }
        
        return { valid: true };
    }

    // IP address validation
    static isValidIPAddress(ip) {
        const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }

    // Validate environment variables
    static validateEnvironment(requiredVars) {
        const missing = [];
        const invalid = [];
        
        for (const varName of requiredVars) {
            const value = process.env[varName];
            
            if (!value) {
                missing.push(varName);
                continue;
            }
            
            // Specific validation for known variable types
            if (varName.includes('TOKEN') && value.length < 10) {
                invalid.push(`${varName} appears to be too short`);
            }
            
            if (varName.includes('URL') && !this.isValidUrl(value)) {
                invalid.push(`${varName} is not a valid URL`);
            }
            
            if (varName.includes('ADDRESS') && !this.isValidWalletAddress(value)) {
                invalid.push(`${varName} is not a valid wallet address`);
            }
        }
        
        return {
            valid: missing.length === 0 && invalid.length === 0,
            missing,
            invalid
        };
    }

    // Comprehensive validation for user registration
    static validateUserRegistration(userData) {
        const errors = [];
        
        if (!userData.telegramId || !this.isValidTelegramId(userData.telegramId)) {
            errors.push('Invalid Telegram ID');
        }
        
        if (userData.username && !this.isValidUsername(userData.username)) {
            errors.push('Invalid username format');
        }
        
        if (!userData.firstName || userData.firstName.length < 1) {
            errors.push('First name is required');
        }
        
        if (userData.referralCode && !this.isValidReferralCode(userData.referralCode)) {
            errors.push('Invalid referral code format');
        }
        
        if (userData.walletAddress && !this.isValidWalletAddress(userData.walletAddress)) {
            errors.push('Invalid wallet address');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Validate transaction data
    static validateTransaction(txData) {
        const errors = [];
        
        if (!txData.txHash || !this.isValidTxHash(txData.txHash)) {
            errors.push('Invalid transaction hash');
        }
        
        if (!txData.type || !['register', 'upgrade', 'withdraw', 'referral'].includes(txData.type)) {
            errors.push('Invalid transaction type');
        }
        
        if (!txData.amount || !this.isValidUSDTAmount(txData.amount)) {
            errors.push('Invalid transaction amount');
        }
        
        if (txData.planId && !this.isValidPlanId(txData.planId)) {
            errors.push('Invalid plan ID');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Security validation for admin actions
    static validateAdminAction(action, userId, adminUserId) {
        const errors = [];
        
        if (!adminUserId || !this.isValidTelegramId(adminUserId)) {
            errors.push('Invalid admin user ID');
        }
        
        if (!action || typeof action !== 'string') {
            errors.push('Invalid action');
        }
        
        const allowedActions = [
            'ban_user', 'unban_user', 'reset_user', 'broadcast',
            'update_plan', 'withdraw_funds', 'view_stats'
        ];
        
        if (!allowedActions.includes(action)) {
            errors.push('Unauthorized action');
        }
        
        if (userId && !this.isValidTelegramId(userId)) {
            errors.push('Invalid target user ID');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

module.exports = ValidationUtils;