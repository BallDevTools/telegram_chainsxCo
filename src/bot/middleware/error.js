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