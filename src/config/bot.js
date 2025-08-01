// src/config/bot.js
class BotConfig {
    constructor() {
        this.token = process.env.BOT_TOKEN;
        this.username = process.env.BOT_USERNAME;
        this.adminUserIds = process.env.ADMIN_USER_ID ? 
            process.env.ADMIN_USER_ID.split(',').map(id => id.trim()) : [];
        
        // Bot settings
        this.settings = {
            // Rate limiting
            rateLimit: {
                window: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000, // 1 minute
                maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30
            },
            
            // Session configuration
            session: {
                ttl: 24 * 60 * 60 * 1000, // 24 hours
                cleanupInterval: 60 * 60 * 1000 // 1 hour
            },
            
            // Message settings
            messages: {
                maxLength: 4000,
                parseMode: 'Markdown',
                disableWebPagePreview: true
            },
            
            // Command settings
            commands: {
                timeout: 30000, // 30 seconds
                maxRetries: 3
            },
            
            // Webhook settings
            webhook: {
                url: process.env.WEBHOOK_URL,
                port: parseInt(process.env.PORT) || 3000,
                path: `/webhook/${this.token}`
            },
            
            // Logging
            logging: {
                level: process.env.LOG_LEVEL || 'info',
                file: process.env.LOG_FILE || './logs/bot.log',
                maxSize: '100MB',
                maxFiles: 10
            },
            
            // Performance monitoring
            monitoring: {
                enabled: process.env.ENABLE_METRICS === 'true',
                port: parseInt(process.env.METRICS_PORT) || 3001,
                interval: 30000 // 30 seconds
            }
        };
        
        // Features configuration
        this.features = {
            registration: true,
            upgrade: true,
            referrals: true,
            wallet: true,
            admin: true,
            notifications: true,
            analytics: true,
            help: true
        };
        
        // Command list for BotFather
        this.commands = [
            { command: 'start', description: 'Start your membership journey' },
            { command: 'profile', description: 'View your profile and stats' },
            { command: 'plans', description: 'Browse membership plans' },
            { command: 'register', description: 'Register for membership' },
            { command: 'upgrade', description: 'Upgrade your plan' },
            { command: 'referral', description: 'View referral information' },
            { command: 'wallet', description: 'Manage your wallet' },
            { command: 'help', description: 'Get help and support' }
        ];
        
        // Admin commands
        this.adminCommands = [
            { command: 'admin', description: 'Admin panel' },
            { command: 'stats', description: 'Platform statistics' },
            { command: 'users', description: 'User management' },
            { command: 'broadcast', description: 'Send broadcast message' }
        ];
        
        // Error messages
        this.errorMessages = {
            generic: '❌ Something went wrong. Please try again.',
            timeout: '⏱️ Request timed out. Please try again.',
            rateLimit: '⚠️ Too many requests. Please wait a moment.',
            maintenance: '🔧 Bot is under maintenance. Please try again later.',
            userNotFound: '❌ User not found. Please use /start to register.',
            accessDenied: '🔒 Access denied. You don\'t have permission.',
            invalidInput: '❌ Invalid input. Please check your data.',
            networkError: '🌐 Network error. Please check your connection.',
            walletRequired: '💳 Wallet connection required for this action.',
            registrationRequired: '📋 Membership registration required.',
            insufficientBalance: '💰 Insufficient balance for this transaction.',
            transactionFailed: '❌ Transaction failed. Please try again.'
        };
        
        // Success messages
        this.successMessages = {
            registered: '✅ Registration successful! Welcome to the community!',
            upgraded: '🚀 Plan upgrade successful! Enjoy your new benefits!',
            walletConnected: '💳 Wallet connected successfully!',
            transactionConfirmed: '✅ Transaction confirmed on blockchain!',
            referralShared: '👥 Referral code shared successfully!',
            profileUpdated: '📝 Profile updated successfully!'
        };
        
        // Validation rules
        this.validation = {
            username: {
                minLength: 3,
                maxLength: 32,
                pattern: /^[a-zA-Z0-9_]+$/
            },
            walletAddress: {
                pattern: /^0x[a-fA-F0-9]{40}$/
            },
            referralCode: {
                minLength: 6,
                maxLength: 12,
                pattern: /^[A-Z0-9]+$/
            },
            amount: {
                min: 0.01,
                max: 1000000
            }
        };
    }

    // Validation methods
    validateConfig() {
        const errors = [];

        if (!this.token) {
            errors.push('Bot token not configured');
        }

        if (!this.username) {
            errors.push('Bot username not configured');
        }

        if (this.adminUserIds.length === 0) {
            errors.push('No admin users configured');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    isAdmin(userId) {
        return this.adminUserIds.includes(userId.toString());
    }

    getCommand(commandName) {
        return this.commands.find(cmd => cmd.command === commandName);
    }

    getAdminCommand(commandName) {
        return this.adminCommands.find(cmd => cmd.command === commandName);
    }

    getAllCommands() {
        return [...this.commands, ...this.adminCommands];
    }

    // Feature toggles
    isFeatureEnabled(featureName) {
        return this.features[featureName] === true;
    }

    enableFeature(featureName) {
        this.features[featureName] = true;
    }

    disableFeature(featureName) {
        this.features[featureName] = false;
    }

    // Message helpers
    getErrorMessage(errorType) {
        return this.errorMessages[errorType] || this.errorMessages.generic;
    }

    getSuccessMessage(successType) {
        return this.successMessages[successType] || '✅ Operation completed successfully!';
    }

    // Validation helpers
    validateUsername(username) {
        const rules = this.validation.username;
        return username && 
               username.length >= rules.minLength && 
               username.length <= rules.maxLength && 
               rules.pattern.test(username);
    }

    validateWalletAddress(address) {
        return this.validation.walletAddress.pattern.test(address);
    }

    validateReferralCode(code) {
        const rules = this.validation.referralCode;
        return code && 
               code.length >= rules.minLength && 
               code.length <= rules.maxLength && 
               rules.pattern.test(code);
    }

    validateAmount(amount) {
        const rules = this.validation.amount;
        const num = parseFloat(amount);
        return !isNaN(num) && num >= rules.min && num <= rules.max;
    }

    // Environment helpers
    isDevelopment() {
        return process.env.NODE_ENV === 'development';
    }

    isProduction() {
        return process.env.NODE_ENV === 'production';
    }

    isWebhookMode() {
        return !!this.settings.webhook.url;
    }

    // Rate limiting configuration
    getRateLimitConfig() {
        return {
            windowMs: this.settings.rateLimit.window,
            max: this.settings.rateLimit.maxRequests,
            message: this.getErrorMessage('rateLimit'),
            standardHeaders: true,
            legacyHeaders: false
        };
    }

    // Session configuration
    getSessionConfig() {
        return {
            defaultSession: () => ({
                user: null,
                step: null,
                data: {},
                lastActivity: Date.now()
            }),
            ttl: this.settings.session.ttl
        };
    }

    // Webhook configuration
    getWebhookConfig() {
        if (!this.isWebhookMode()) {
            return null;
        }

        return {
            url: this.settings.webhook.url + this.settings.webhook.path,
            port: this.settings.webhook.port,
            path: this.settings.webhook.path
        };
    }

    // Logging configuration
    getLoggingConfig() {
        return {
            level: this.settings.logging.level,
            format: 'combined',
            transports: [
                {
                    type: 'console',
                    options: {
                        colorize: this.isDevelopment()
                    }
                },
                {
                    type: 'file',
                    options: {
                        filename: this.settings.logging.file,
                        maxsize: this.settings.logging.maxSize,
                        maxFiles: this.settings.logging.maxFiles
                    }
                }
            ]
        };
    }

    // Performance monitoring configuration
    getMonitoringConfig() {
        return {
            enabled: this.settings.monitoring.enabled,
            port: this.settings.monitoring.port,
            interval: this.settings.monitoring.interval,
            metrics: [
                'requests_total',
                'requests_duration',
                'memory_usage',
                'active_users',
                'error_rate'
            ]
        };
    }

    // Debug information
    getDebugInfo() {
        return {
            token: this.token ? `${this.token.slice(0, 10)}...` : 'Not set',
            username: this.username,
            adminCount: this.adminUserIds.length,
            features: this.features,
            environment: process.env.NODE_ENV,
            webhookMode: this.isWebhookMode(),
            settings: {
                rateLimit: this.settings.rateLimit,
                session: this.settings.session,
                monitoring: this.settings.monitoring
            }
        };
    }

    // Health check
    healthCheck() {
        const validation = this.validateConfig();
        
        return {
            status: validation.isValid ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            config: {
                token: !!this.token,
                username: !!this.username,
                admins: this.adminUserIds.length > 0,
                webhook: this.isWebhookMode()
            },
            errors: validation.errors
        };
    }
}

// Export singleton instance
const botConfig = new BotConfig();

module.exports = {
    BotConfig,
    botConfig,
    
    // Helper functions
    isAdmin: (userId) => botConfig.isAdmin(userId),
    isFeatureEnabled: (feature) => botConfig.isFeatureEnabled(feature),
    getErrorMessage: (type) => botConfig.getErrorMessage(type),
    getSuccessMessage: (type) => botConfig.getSuccessMessage(type),
    validateWalletAddress: (address) => botConfig.validateWalletAddress(address),
    validateReferralCode: (code) => botConfig.validateReferralCode(code)
};