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