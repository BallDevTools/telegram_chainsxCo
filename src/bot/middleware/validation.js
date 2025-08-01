// src/bot/middleware/validation.js
class ValidationMiddleware {
    constructor() {
        this.bannedWords = [
            'spam', 'scam', 'hack', 'phishing', 
            'fraud', 'steal', 'fake', 'virus'
        ];
        
        this.suspiciousPatterns = [
            /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/, // Phone numbers
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email addresses
            /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/, // URLs
            /0x[a-fA-F0-9]{40}/ // Ethereum addresses (when not expected)
        ];
    }

    middleware() {
        return async (ctx, next) => {
            try {
                // Skip validation for certain update types
                if (ctx.updateType === 'callback_query' || !ctx.message) {
                    return next();
                }

                const text = ctx.message.text;
                if (!text) {
                    return next();
                }

                // Check for banned words
                if (this.containsBannedWords(text)) {
                    await ctx.reply('⚠️ Your message contains inappropriate content.');
                    return;
                }

                // Check for suspicious patterns (except in wallet context)
                if (ctx.session.step !== 'waiting_wallet_address' && 
                    this.containsSuspiciousPatterns(text)) {
                    await ctx.reply('⚠️ For security reasons, please avoid sharing personal information.');
                    return;
                }

                // Check message length
                if (text.length > 4000) {
                    await ctx.reply('⚠️ Message too long. Please keep messages under 4000 characters.');
                    return;
                }

                // Rate limiting for repeated messages
                if (this.isRepeatedMessage(ctx)) {
                    await ctx.reply('⚠️ Please avoid sending the same message repeatedly.');
                    return;
                }

                await next();

            } catch (error) {
                console.error('❌ Validation middleware error:', error);
                await next(); // Continue on validation error
            }
        };
    }

    containsBannedWords(text) {
        const lowerText = text.toLowerCase();
        return this.bannedWords.some(word => lowerText.includes(word));
    }

    containsSuspiciousPatterns(text) {
        return this.suspiciousPatterns.some(pattern => pattern.test(text));
    }

    isRepeatedMessage(ctx) {
        const userId = ctx.from.id;
        const text = ctx.message.text;
        
        if (!ctx.session.lastMessages) {
            ctx.session.lastMessages = {};
        }
        
        const userMessages = ctx.session.lastMessages[userId] || [];
        
        // Check if same message was sent recently
        const recentSame = userMessages.filter(msg => 
            msg.text === text && 
            Date.now() - msg.timestamp < 30000 // Within 30 seconds
        );
        
        if (recentSame.length >= 3) {
            return true;
        }
        
        // Add current message
        userMessages.push({
            text,
            timestamp: Date.now()
        });
        
        // Keep only last 10 messages
        ctx.session.lastMessages[userId] = userMessages.slice(-10);
        
        return false;
    }

    // Validate wallet address format
    static validateWalletAddress(address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    // Validate referral code format
    static validateReferralCode(code) {
        return /^[A-Z0-9]{6,10}$/.test(code);
    }

    // Validate telegram user ID
    static validateTelegramId(id) {
        return /^\d{5,15}$/.test(id.toString());
    }

    // Sanitize user input
    static sanitizeInput(input) {
        if (typeof input !== 'string') {
            return '';
        }
        
        // Remove potentially dangerous characters
        return input
            .replace(/[<>\"'&]/g, '') // Remove HTML/script chars
            .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
            .trim()
            .slice(0, 1000); // Limit length
    }
}

module.exports = new ValidationMiddleware().middleware();