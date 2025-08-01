// src/bot/middleware/auth.js
const UserService = require('../../services/UserService');

class AuthMiddleware {
    constructor() {
        this.userService = new UserService();
        this.blockedUsers = new Set();
    }

    middleware() {
        return async (ctx, next) => {
            try {
                // Skip for webhook health checks
                if (ctx.updateType === 'webhook') {
                    return next();
                }

                const telegramId = ctx.from?.id?.toString();
                if (!telegramId) {
                    return; // Skip if no user info
                }

                // Check if user is blocked
                if (this.blockedUsers.has(telegramId)) {
                    await ctx.reply('❌ Your account has been restricted. Contact support for assistance.');
                    return;
                }

                // Get or create user
                let user = await this.userService.getUserByTelegramId(telegramId);
                
                // Store user in session for quick access
                ctx.session.user = user;
                
                // Log user activity
                if (ctx.message?.text) {
                    console.log(`👤 ${user?.first_name || 'Unknown'} (${telegramId}): ${ctx.message.text}`);
                }

                await next();

            } catch (error) {
                console.error('❌ Auth middleware error:', error);
                await ctx.reply('❌ Authentication error. Please try again.');
            }
        };
    }

    // Block user function
    blockUser(telegramId, reason = 'Terms violation') {
        this.blockedUsers.add(telegramId);
        console.log(`🚫 User ${telegramId} blocked: ${reason}`);
    }

    // Unblock user function
    unblockUser(telegramId) {
        this.blockedUsers.delete(telegramId);
        console.log(`✅ User ${telegramId} unblocked`);
    }

    // Check if user is blocked
    isBlocked(telegramId) {
        return this.blockedUsers.has(telegramId);
    }
}

module.exports = new AuthMiddleware().middleware();

// src/bot/middleware/rateLimit.js
class RateLimitMiddleware {
    constructor() {
        this.userLimits = new Map();
        this.globalLimits = new Map();
        
        // Rate limit settings
        this.limits = {
            user: { maxRequests: 20, windowMs: 60000 }, // 20 requests per minute per user
            global: { maxRequests: 1000, windowMs: 60000 }, // 1000 requests per minute globally
            admin: { maxRequests: 100, windowMs: 60000 } // Higher limit for admins
        };

        // Admin user IDs
        this.adminIds = process.env.ADMIN_USER_ID ? 
            process.env.ADMIN_USER_ID.split(',').map(id => id.trim()) : [];

        // Cleanup old entries every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    middleware() {
        return async (ctx, next) => {
            try {
                const telegramId = ctx.from?.id?.toString();
                const isAdmin = this.adminIds.includes(telegramId);
                
                // Check user rate limit
                if (!this.checkUserLimit(telegramId, isAdmin)) {
                    await ctx.reply('⚠️ Too many requests. Please wait a moment before trying again.');
                    return;
                }

                // Check global rate limit
                if (!this.checkGlobalLimit()) {
                    await ctx.reply('⚠️ High server load. Please try again in a few moments.');
                    return;
                }

                // Update counters
                this.updateLimits(telegramId);

                await next();

            } catch (error) {
                console.error('❌ Rate limit middleware error:', error);
                await next(); // Continue on error
            }
        };
    }

    checkUserLimit(telegramId, isAdmin = false) {
        if (!telegramId) return true;

        const now = Date.now();
        const limit = isAdmin ? this.limits.admin : this.limits.user;
        
        if (!this.userLimits.has(telegramId)) {
            this.userLimits.set(telegramId, { requests: [], windowStart: now });
            return true;
        }

        const userLimit = this.userLimits.get(telegramId);
        
        // Clean old requests outside the window
        userLimit.requests = userLimit.requests.filter(
            timestamp => now - timestamp < limit.windowMs
        );

        // Check if limit exceeded
        return userLimit.requests.length < limit.maxRequests;
    }

    checkGlobalLimit() {
        const now = Date.now();
        const limit = this.limits.global;
        
        if (!this.globalLimits.has('requests')) {
            this.globalLimits.set('requests', { requests: [], windowStart: now });
            return true;
        }

        const globalLimit = this.globalLimits.get('requests');
        
        // Clean old requests
        globalLimit.requests = globalLimit.requests.filter(
            timestamp => now - timestamp < limit.windowMs
        );

        return globalLimit.requests.length < limit.maxRequests;
    }

    updateLimits(telegramId) {
        const now = Date.now();

        // Update user limit
        if (telegramId) {
            const userLimit = this.userLimits.get(telegramId);
            if (userLimit) {
                userLimit.requests.push(now);
            }
        }

        // Update global limit
        const globalLimit = this.globalLimits.get('requests');
        if (globalLimit) {
            globalLimit.requests.push(now);
        }
    }

    cleanup() {
        const now = Date.now();
        
        // Cleanup user limits
        for (const [telegramId, userLimit] of this.userLimits.entries()) {
            userLimit.requests = userLimit.requests.filter(
                timestamp => now - timestamp < this.limits.user.windowMs
            );
            
            if (userLimit.requests.length === 0) {
                this.userLimits.delete(telegramId);
            }
        }

        // Cleanup global limits
        for (const [key, globalLimit] of this.globalLimits.entries()) {
            globalLimit.requests = globalLimit.requests.filter(
                timestamp => now - timestamp < this.limits.global.windowMs
            );
        }

        console.log(`🧹 Rate limit cleanup: ${this.userLimits.size} active users`);
    }

    getStats() {
        return {
            activeUsers: this.userLimits.size,
            totalRequests: Array.from(this.userLimits.values())
                .reduce((sum, user) => sum + user.requests.length, 0),
            globalRequests: this.globalLimits.get('requests')?.requests.length || 0
        };
    }
}

module.exports = new RateLimitMiddleware().middleware();

// src/bot/middleware/logger.js
const fs = require('fs');
const path = require('path');

class LoggerMiddleware {
    constructor() {
        this.logDir = path.join(__dirname, '../../..', 'logs');
        this.ensureLogDir();
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    middleware() {
        return async (ctx, next) => {
            const startTime = Date.now();
            
            try {
                // Log incoming request
                this.logRequest(ctx);
                
                await next();
                
                // Log successful response
                const duration = Date.now() - startTime;
                this.logResponse(ctx, 'success', duration);

            } catch (error) {
                // Log error
                const duration = Date.now() - startTime;
                this.logResponse(ctx, 'error', duration, error);
                throw error; // Re-throw for error middleware
            }
        };
    }

    logRequest(ctx) {
        const logData = {
            timestamp: new Date().toISOString(),
            type: 'request',
            updateType: ctx.updateType,
            userId: ctx.from?.id,
            username: ctx.from?.username,
            firstName: ctx.from?.first_name,
            chatId: ctx.chat?.id,
            chatType: ctx.chat?.type,
            message: ctx.message?.text || ctx.callbackQuery?.data || 'non-text',
            messageId: ctx.message?.message_id || ctx.callbackQuery?.message?.message_id
        };

        this.writeLog('requests', logData);
        
        // Console log for development
        if (process.env.NODE_ENV === 'development') {
            console.log(`📥 ${logData.firstName} (${logData.userId}): ${logData.message}`);
        }
    }

    logResponse(ctx, status, duration, error = null) {
        const logData = {
            timestamp: new Date().toISOString(),
            type: 'response',
            status,
            duration,
            userId: ctx.from?.id,
            username: ctx.from?.username,
            error: error ? {
                message: error.message,
                stack: error.stack
            } : null
        };

        this.writeLog('responses', logData);

        // Console log for development
        if (process.env.NODE_ENV === 'development') {
            const emoji = status === 'success' ? '✅' : '❌';
            console.log(`${emoji} Response (${duration}ms): ${ctx.from?.first_name} (${ctx.from?.id})`);
        }
    }

    writeLog(type, data) {
        try {
            const filename = `${type}-${new Date().toISOString().split('T')[0]}.log`;
            const filepath = path.join(this.logDir, filename);
            const logLine = JSON.stringify(data) + '\n';
            
            fs.appendFileSync(filepath, logLine);

        } catch (error) {
            console.error('❌ Failed to write log:', error);
        }
    }

    // Get log statistics
    getStats(days = 1) {
        try {
            const stats = {
                requests: 0,
                errors: 0,
                averageResponseTime: 0,
                uniqueUsers: new Set()
            };

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            for (let i = 0; i < days; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                
                const requestsFile = path.join(this.logDir, `requests-${dateStr}.log`);
                const responsesFile = path.join(this.logDir, `responses-${dateStr}.log`);

                // Count requests
                if (fs.existsSync(requestsFile)) {
                    const requestData = fs.readFileSync(requestsFile, 'utf8');
                    const lines = requestData.trim().split('\n').filter(line => line);
                    stats.requests += lines.length;

                    // Count unique users
                    lines.forEach(line => {
                        try {
                            const log = JSON.parse(line);
                            if (log.userId) {
                                stats.uniqueUsers.add(log.userId);
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    });
                }

                // Count errors and response times
                if (fs.existsSync(responsesFile)) {
                    const responseData = fs.readFileSync(responsesFile, 'utf8');
                    const lines = responseData.trim().split('\n').filter(line => line);
                    
                    let totalDuration = 0;
                    let validResponses = 0;

                    lines.forEach(line => {
                        try {
                            const log = JSON.parse(line);
                            if (log.status === 'error') {
                                stats.errors++;
                            }
                            if (log.duration) {
                                totalDuration += log.duration;
                                validResponses++;
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    });

                    if (validResponses > 0) {
                        stats.averageResponseTime = Math.round(totalDuration / validResponses);
                    }
                }
            }

            stats.uniqueUsers = stats.uniqueUsers.size;
            return stats;

        } catch (error) {
            console.error('❌ Failed to get log stats:', error);
            return null;
        }
    }
}

module.exports = new LoggerMiddleware().middleware();

// src/bot/middleware/error.js
const NotificationService = require('../../services/NotificationService');

class ErrorMiddleware {
    constructor() {
        this.errorCount = 0;
        this.lastErrors = [];
        this.maxLastErrors = 10;
        this.notificationService = new NotificationService();
    }

    middleware() {
        return async (ctx, next) => {
            try {
                await next();
            } catch (error) {
                await this.handleError(ctx, error);
            }
        };
    }

    async handleError(ctx, error) {
        this.errorCount++;
        
        // Store error info
        const errorInfo = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            userId: ctx.from?.id,
            username: ctx.from?.username,
            message: ctx.message?.text || ctx.callbackQuery?.data,
            updateType: ctx.updateType
        };

        this.lastErrors.unshift(errorInfo);
        if (this.lastErrors.length > this.maxLastErrors) {
            this.lastErrors.pop();
        }

        // Log error
        console.error('🚨 Bot error:', errorInfo);

        // Send user-friendly error message
        try {
            const errorMessage = this.getUserErrorMessage(error);
            
            if (ctx.callbackQuery) {
                await ctx.answerCbQuery('❌ Something went wrong');
                await ctx.reply(errorMessage);
            } else {
                await ctx.reply(errorMessage);
            }

        } catch (replyError) {
            console.error('❌ Failed to send error message:', replyError);
        }

        // Notify admin for critical errors
        if (this.isCriticalError(error)) {
            await this.notifyAdminOfError(errorInfo);
        }

        // Auto-restart on memory errors
        if (error.message.includes('out of memory') || error.code === 'ENOMEM') {
            console.error('💥 Memory error detected - requesting restart');
            process.exit(1);
        }
    }

    getUserErrorMessage(error) {
        // Map technical errors to user-friendly messages
        const errorMappings = {
            'timeout': '⏱️ Request timed out. Please try again.',
            'network': '🌐 Network error. Please check your connection.',
            'database': '🗄️ Database error. Please try again in a moment.',
            'blockchain': '⛓️ Blockchain connection error. Please try again.',
            'validation': '❌ Invalid input. Please check your data.',
            'permission': '🔒 Permission denied. You don\'t have access to this feature.',
            'rate_limit': '⚠️ Too many requests. Please wait before trying again.'
        };

        const errorType = this.categorizeError(error);
        return errorMappings[errorType] || '❌ Something went wrong. Please try again or contact support.';
    }

    categorizeError(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('timeout') || message.includes('etimedout')) {
            return 'timeout';
        }
        if (message.includes('network') || message.includes('enotfound') || message.includes('econnrefused')) {
            return 'network';
        }
        if (message.includes('database') || message.includes('sqlite') || message.includes('sql')) {
            return 'database';
        }
        if (message.includes('blockchain') || message.includes('web3') || message.includes('rpc')) {
            return 'blockchain';
        }
        if (message.includes('validation') || message.includes('invalid')) {
            return 'validation';
        }
        if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
            return 'permission';
        }
        if (message.includes('rate') || message.includes('limit') || message.includes('too many')) {
            return 'rate_limit';
        }
        
        return 'unknown';
    }

    isCriticalError(error) {
        const criticalKeywords = [
            'out of memory',
            'enomem',
            'stack overflow',
            'segmentation fault',
            'database corruption',
            'fatal error'
        ];

        return criticalKeywords.some(keyword => 
            error.message.toLowerCase().includes(keyword)
        );
    }

    async notifyAdminOfError(errorInfo) {
        try {
            const message = `🚨 **Critical Bot Error**

**Error:** ${errorInfo.error}
**User:** ${errorInfo.username || 'Unknown'} (${errorInfo.userId})
**Command:** ${errorInfo.message || 'Unknown'}
**Time:** ${errorInfo.timestamp}

**Stack:** \`${errorInfo.stack?.split('\n')[0] || 'No stack trace'}\`

Please investigate immediately! 🔧`;

            await this.notificationService.sendToAdmin(message);

        } catch (notificationError) {
            console.error('❌ Failed to notify admin of error:', notificationError);
        }
    }

    getErrorStats() {
        return {
            totalErrors: this.errorCount,
            recentErrors: this.lastErrors.length,
            lastError: this.lastErrors[0] || null,
            errorRate: this.calculateErrorRate()
        };
    }

    calculateErrorRate() {
        if (this.lastErrors.length === 0) return 0;
        
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        
        const recentErrors = this.lastErrors.filter(error => 
            new Date(error.timestamp).getTime() > oneHourAgo
        );
        
        return recentErrors.length; // Errors per hour
    }

    // Clear error history (maintenance function)
    clearErrorHistory() {
        this.lastErrors = [];
        this.errorCount = 0;
        console.log('🧹 Error history cleared');
    }
}

module.exports = new ErrorMiddleware().middleware();

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