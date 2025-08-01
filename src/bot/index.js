const { Telegraf, session } = require('telegraf');
const { message } = require('telegraf/filters');

// Import middleware
const authMiddleware = require('./middleware/auth');
const rateLimitMiddleware = require('./middleware/rateLimit');
const loggerMiddleware = require('./middleware/logger');
const errorMiddleware = require('./middleware/error');
const validationMiddleware = require('./middleware/validation');

// Import handlers
const StartHandler = require('./handlers/start');
const ProfileHandler = require('./handlers/profile');
const PlansHandler = require('./handlers/plans');
const RegisterHandler = require('./handlers/register');
const UpgradeHandler = require('./handlers/upgrade');
const ReferralHandler = require('./handlers/referral');
const WalletHandler = require('./handlers/wallet');
const HelpHandler = require('./handlers/help');
const AdminHandler = require('./handlers/admin');

// Import keyboards
const MainKeyboard = require('./keyboards/main');
const PlansKeyboard = require('./keyboards/plans');
const ConfirmKeyboard = require('./keyboards/confirm');

// Import services
const UserService = require('../services/UserService');
const NotificationService = require('../services/NotificationService');

class TelegramBot {
    constructor() {
        this.bot = null;
        this.handlers = new Map();
        this.userService = new UserService();
        this.notificationService = new NotificationService();
        
        // Initialize handlers
        this.initializeHandlers();
    }

    async initialize() {
        try {
            // Create bot instance
            this.bot = new Telegraf(process.env.BOT_TOKEN);
            
            // Setup middleware stack
            this.setupMiddleware();
            
            // Setup command handlers
            this.setupCommands();
            
            // Setup callback query handlers
            this.setupCallbackQueries();
            
            // Setup message handlers
            this.setupMessageHandlers();
            
            // Setup error handling
            this.setupErrorHandling();
            
            console.log('🤖 Telegram bot initialized successfully');
            return this.bot;
            
        } catch (error) {
            console.error('❌ Failed to initialize bot:', error);
            throw error;
        }
    }

    initializeHandlers() {
        this.handlers.set('start', new StartHandler());
        this.handlers.set('profile', new ProfileHandler());
        this.handlers.set('plans', new PlansHandler());
        this.handlers.set('register', new RegisterHandler());
        this.handlers.set('upgrade', new UpgradeHandler());
        this.handlers.set('referral', new ReferralHandler());
        this.handlers.set('wallet', new WalletHandler());
        this.handlers.set('help', new HelpHandler());
        this.handlers.set('admin', new AdminHandler());
    }

    setupMiddleware() {
        // Session middleware
        this.bot.use(session({
            defaultSession: () => ({
                user: null,
                step: null,
                data: {},
                lastActivity: Date.now()
            })
        }));

        // Logger middleware (first)
        this.bot.use(loggerMiddleware);

        // Rate limiting middleware
        this.bot.use(rateLimitMiddleware);

        // Validation middleware
        this.bot.use(validationMiddleware);

        // Authentication middleware
        this.bot.use(authMiddleware);

        // User activity tracking
        this.bot.use(async (ctx, next) => {
            if (ctx.from) {
                ctx.session.lastActivity = Date.now();
                await this.userService.updateLastActivity(ctx.from.id.toString());
            }
            await next();
        });
    }

    setupCommands() {
        // Basic commands
        this.bot.command('start', async (ctx) => {
            await this.handlers.get('start').handle(ctx);
        });

        this.bot.command('profile', async (ctx) => {
            await this.handlers.get('profile').handle(ctx);
        });

        this.bot.command('plans', async (ctx) => {
            await this.handlers.get('plans').handle(ctx);
        });

        this.bot.command('register', async (ctx) => {
            await this.handlers.get('register').handle(ctx);
        });

        this.bot.command('upgrade', async (ctx) => {
            await this.handlers.get('upgrade').handle(ctx);
        });

        this.bot.command('referral', async (ctx) => {
            await this.handlers.get('referral').handle(ctx);
        });

        this.bot.command('wallet', async (ctx) => {
            await this.handlers.get('wallet').handle(ctx);
        });

        this.bot.command('help', async (ctx) => {
            await this.handlers.get('help').handle(ctx);
        });

        // Admin commands
        this.bot.command('admin', async (ctx) => {
            await this.handlers.get('admin').handle(ctx);
        });

        this.bot.command('stats', async (ctx) => {
            await this.handlers.get('admin').handleStats(ctx);
        });

        this.bot.command('broadcast', async (ctx) => {
            await this.handlers.get('admin').handleBroadcast(ctx);
        });

        this.bot.command('users', async (ctx) => {
            await this.handlers.get('admin').handleUsers(ctx);
        });

        // Development commands
        if (process.env.NODE_ENV === 'development') {
            this.bot.command('test', async (ctx) => {
                await ctx.reply('🧪 Test command works!');
            });

            this.bot.command('clear', async (ctx) => {
                ctx.session = {
                    user: null,
                    step: null,
                    data: {},
                    lastActivity: Date.now()
                };
                await ctx.reply('🧹 Session cleared!');
            });
        }
    }

    setupCallbackQueries() {
        // Main navigation
        this.bot.action('action_get_started', async (ctx) => {
            await this.handlers.get('register').showPlans(ctx);
        });

        this.bot.action('action_view_plans', async (ctx) => {
            await this.handlers.get('plans').handle(ctx);
        });

        this.bot.action('action_profile', async (ctx) => {
            await this.handlers.get('profile').handle(ctx);
        });

        this.bot.action('action_upgrade', async (ctx) => {
            await this.handlers.get('upgrade').handle(ctx);
        });

        this.bot.action('action_referrals', async (ctx) => {
            await this.handlers.get('referral').handle(ctx);
        });

        this.bot.action('action_earnings', async (ctx) => {
            await this.handlers.get('profile').showEarnings(ctx);
        });

        this.bot.action('action_stats', async (ctx) => {
            await this.handlers.get('profile').showStats(ctx);
        });

        this.bot.action('action_help', async (ctx) => {
            await this.handlers.get('help').handle(ctx);
        });

        // Plan selection
        this.bot.action(/^plan_(\d+)$/, async (ctx) => {
            const planId = parseInt(ctx.match[1]);
            await this.handlers.get('register').selectPlan(ctx, planId);
        });

        // Upgrade plan selection
        this.bot.action(/^upgrade_(\d+)$/, async (ctx) => {
            const planId = parseInt(ctx.match[1]);
            await this.handlers.get('upgrade').selectPlan(ctx, planId);
        });

        // Confirmation actions
        this.bot.action(/^confirm_register_(\d+)$/, async (ctx) => {
            const planId = parseInt(ctx.match[1]);
            await this.handlers.get('register').confirmRegistration(ctx, planId);
        });

        this.bot.action(/^confirm_upgrade_(\d+)$/, async (ctx) => {
            const planId = parseInt(ctx.match[1]);
            await this.handlers.get('upgrade').confirmUpgrade(ctx, planId);
        });

        // Wallet actions
        this.bot.action('action_connect_wallet', async (ctx) => {
            await this.handlers.get('wallet').connect(ctx);
        });

        this.bot.action('action_disconnect_wallet', async (ctx) => {
            await this.handlers.get('wallet').disconnect(ctx);
        });

        this.bot.action('action_wallet_info', async (ctx) => {
            await this.handlers.get('wallet').showInfo(ctx);
        });

        // Referral actions
        this.bot.action('action_share_referral', async (ctx) => {
            await this.handlers.get('referral').shareCode(ctx);
        });

        this.bot.action('action_referral_stats', async (ctx) => {
            await this.handlers.get('referral').showStats(ctx);
        });

        this.bot.action('action_referral_history', async (ctx) => {
            await this.handlers.get('referral').showHistory(ctx);
        });

        // Navigation actions
        this.bot.action('action_back_main', async (ctx) => {
            await this.handlers.get('start').handle(ctx, true);
        });

        this.bot.action('action_back_plans', async (ctx) => {
            await this.handlers.get('plans').handle(ctx);
        });

        this.bot.action('action_refresh', async (ctx) => {
            await ctx.answerCbQuery('🔄 Refreshing...');
            // Re-render current view
            const handler = this.getCurrentHandler(ctx);
            if (handler) {
                await handler.handle(ctx);
            }
        });

        // Admin actions
        this.bot.action(/^admin_(.+)$/, async (ctx) => {
            const action = ctx.match[1];
            await this.handlers.get('admin').handleAction(ctx, action);
        });

        // Pagination actions
        this.bot.action(/^page_(\w+)_(\d+)$/, async (ctx) => {
            const type = ctx.match[1];
            const page = parseInt(ctx.match[2]);
            await this.handlePagination(ctx, type, page);
        });

        // Generic cancel action
        this.bot.action('action_cancel', async (ctx) => {
            await ctx.answerCbQuery('❌ Cancelled');
            await this.handlers.get('start').handle(ctx, true);
        });
    }

    setupMessageHandlers() {
        // Handle wallet address input
        this.bot.on(message('text'), async (ctx) => {
            const text = ctx.message.text;
            
            // Skip if it's a command
            if (text.startsWith('/')) {
                return;
            }

            // Handle different conversation steps
            if (ctx.session.step) {
                switch (ctx.session.step) {
                    case 'waiting_wallet_address':
                        await this.handlers.get('wallet').handleWalletInput(ctx, text);
                        break;
                        
                    case 'waiting_broadcast_message':
                        await this.handlers.get('admin').handleBroadcastInput(ctx, text);
                        break;
                        
                    case 'waiting_support_message':
                        await this.handlers.get('help').handleSupportMessage(ctx, text);
                        break;
                        
                    default:
                        await this.handleUnknownMessage(ctx, text);
                }
            } else {
                await this.handleUnknownMessage(ctx, text);
            }
        });

        // Handle photo uploads (for QR codes, etc.)
        this.bot.on(message('photo'), async (ctx) => {
            if (ctx.session.step === 'waiting_qr_code') {
                await this.handlers.get('wallet').handleQRCode(ctx);
            } else {
                await ctx.reply('📷 Photo received, but I\'m not sure what to do with it. Use /help for assistance.');
            }
        });

        // Handle contact sharing
        this.bot.on(message('contact'), async (ctx) => {
            await ctx.reply('📞 Contact received! However, I don\'t need your contact information.');
        });

        // Handle location sharing
        this.bot.on(message('location'), async (ctx) => {
            await ctx.reply('📍 Location received! However, I don\'t need your location.');
        });
    }

    setupErrorHandling() {
        this.bot.use(errorMiddleware);
        
        // Global error handler
        this.bot.catch(async (err, ctx) => {
            console.error('❌ Bot error:', err);
            
            try {
                if (ctx && ctx.reply) {
                    await ctx.reply('❌ An error occurred. Please try again or contact support.');
                }
            } catch (replyError) {
                console.error('❌ Failed to send error message:', replyError);
            }
        });
    }

    async handleUnknownMessage(ctx, text) {
        // Check if it looks like a wallet address
        if (text.match(/^0x[a-fA-F0-9]{40}$/)) {
            await ctx.reply('💡 This looks like a wallet address! Use /wallet to connect your wallet.');
            return;
        }

        // Check if it looks like a referral code
        if (text.match(/^[A-Z0-9]{6,10}$/)) {
            await ctx.reply('💡 This looks like a referral code! Use /start to begin with a referral code.');
            return;
        }

        // Generic response for unknown messages
        const responses = [
            '🤔 I\'m not sure what you mean. Try using the menu buttons or type /help.',
            '💡 Use the buttons below or type /help to see what I can do!',
            '🎯 I understand commands better. Try /help to see available options.',
            '🔤 I work better with buttons and commands. Type /help for guidance!'
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        await ctx.reply(randomResponse, MainKeyboard.getMainKeyboard(ctx.session.user));
    }

    async handlePagination(ctx, type, page) {
        try {
            await ctx.answerCbQuery();
            
            switch (type) {
                case 'referrals':
                    await this.handlers.get('referral').showPage(ctx, page);
                    break;
                case 'users':
                    await this.handlers.get('admin').showUsersPage(ctx, page);
                    break;
                case 'transactions':
                    await this.handlers.get('admin').showTransactionsPage(ctx, page);
                    break;
                default:
                    await ctx.answerCbQuery('❌ Unknown pagination type');
            }
        } catch (error) {
            console.error('❌ Pagination error:', error);
            await ctx.answerCbQuery('❌ Error loading page');
        }
    }

    getCurrentHandler(ctx) {
        if (ctx.session && ctx.session.currentHandler) {
            return this.handlers.get(ctx.session.currentHandler);
        }
        return null;
    }

    // Start periodic tasks
    startPeriodicTasks() {
        // Send daily stats to admin
        setInterval(async () => {
            try {
                await this.notificationService.sendDailyStats();
            } catch (error) {
                console.error('❌ Daily stats notification error:', error);
            }
        }, 24 * 60 * 60 * 1000); // Every 24 hours

        // Clean up old sessions
        setInterval(async () => {
            try {
                await this.cleanupOldSessions();
            } catch (error) {
                console.error('❌ Session cleanup error:', error);
            }
        }, 60 * 60 * 1000); // Every hour

        // Check pending transactions
        setInterval(async () => {
            try {
                await this.notificationService.checkPendingTransactions();
            } catch (error) {
                console.error('❌ Pending transactions check error:', error);
            }
        }, 5 * 60 * 1000); // Every 5 minutes

        console.log('⏰ Periodic tasks started');
    }

    async cleanupOldSessions() {
        // This would be implemented with a proper session store
        // For now, it's a placeholder
        console.log('🧹 Session cleanup completed');
    }

    // Stop the bot gracefully
    async stop() {
        if (this.bot) {
            this.bot.stop('SIGTERM');
            console.log('🛑 Telegram bot stopped');
        }
    }

    // Get bot instance
    getBot() {
        return this.bot;
    }

    // Get bot info
    async getBotInfo() {
        if (!this.bot) {
            return null;
        }

        try {
            const botInfo = await this.bot.telegram.getMe();
            return {
                id: botInfo.id,
                username: botInfo.username,
                first_name: botInfo.first_name,
                is_bot: botInfo.is_bot
            };
        } catch (error) {
            console.error('❌ Error getting bot info:', error);
            return null;
        }
    }
}

// Initialize and export bot
async function initializeBot() {
    const telegramBot = new TelegramBot();
    const bot = await telegramBot.initialize();
    
    // Start periodic tasks
    telegramBot.startPeriodicTasks();
    
    return bot;
}

module.exports = {
    initializeBot,
    TelegramBot
};