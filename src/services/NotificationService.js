// src/services/NotificationService.js
const { Telegraf } = require('telegraf');
const UserService = require('./UserService');
const { getDatabase } = require('../config/database');
const { formatNumber, formatDate } = require('../utils/formatting');

class NotificationService {
    constructor() {
        this.bot = null;
        this.userService = new UserService();
        this.adminUserId = process.env.ADMIN_USER_ID;
        
        // Notification queues
        this.pendingNotifications = new Map();
        this.rateLimitMap = new Map();
        
        // Rate limiting: max 30 messages per minute per user
        this.rateLimit = {
            maxMessages: 30,
            timeWindow: 60 * 1000, // 1 minute
            cleanupInterval: 5 * 60 * 1000 // 5 minutes
        };
        
        this.startRateLimitCleanup();
    }

    initialize(botInstance) {
        this.bot = botInstance;
        console.log('📢 Notification service initialized');
    }

    // Send notification to specific user
    async sendToUser(telegramId, message, options = {}) {
        try {
            if (!this.bot) {
                console.error('❌ Bot not initialized for notifications');
                return false;
            }

            // Check rate limiting
            if (!this.checkRateLimit(telegramId)) {
                console.warn(`⚠️ Rate limit exceeded for user ${telegramId}`);
                return false;
            }

            const sendOptions = {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                ...options
            };

            await this.bot.telegram.sendMessage(telegramId, message, sendOptions);
            this.updateRateLimit(telegramId);
            
            // Log notification
            await this.logNotification(telegramId, message, true);
            
            return true;

        } catch (error) {
            console.error(`❌ Failed to send notification to ${telegramId}:`, error);
            await this.logNotification(telegramId, message, false, error.message);
            return false;
        }
    }

    // Send notification to admin
    async sendToAdmin(message, options = {}) {
        if (!this.adminUserId) {
            console.warn('⚠️ Admin user ID not configured');
            return false;
        }

        return await this.sendToUser(this.adminUserId, message, options);
    }

    // Broadcast to all users
    async broadcast(message, options = {}) {
        try {
            const db = getDatabase();
            const users = await db.all(
                'SELECT telegram_id FROM users WHERE status = "active" ORDER BY created_at'
            );

            let sent = 0;
            let failed = 0;
            const delay = 1000; // 1 second delay between messages

            console.log(`📢 Broadcasting to ${users.length} users...`);

            for (const user of users) {
                try {
                    const success = await this.sendToUser(user.telegram_id, message, options);
                    if (success) {
                        sent++;
                    } else {
                        failed++;
                    }

                    // Delay to avoid hitting rate limits
                    await new Promise(resolve => setTimeout(resolve, delay));

                } catch (error) {
                    console.error(`❌ Broadcast failed for user ${user.telegram_id}:`, error);
                    failed++;
                }
            }

            // Notify admin of broadcast results
            await this.sendToAdmin(`📢 **Broadcast Complete**\n\n✅ Sent: ${sent}\n❌ Failed: ${failed}`);

            return { sent, failed, total: users.length };

        } catch (error) {
            console.error('❌ Broadcast error:', error);
            return { sent: 0, failed: 0, total: 0 };
        }
    }

    // Transaction notifications
    async notifyTransactionConfirmed(telegramId, txData) {
        const message = `✅ **Transaction Confirmed!**

🎉 Your transaction has been confirmed on the blockchain!

**📋 Details:**
• **Type:** ${txData.type}
• **Amount:** ${formatNumber(parseFloat(txData.amount))} USDT
• **Hash:** \`${txData.txHash}\`
• **Block:** ${txData.blockNumber}

${txData.type === 'register' ? 
    '🎫 Your NFT membership has been minted!\n🚀 You can now start earning from referrals!' :
    '⬆️ Your plan upgrade is complete!\n💰 Enjoy your higher commission rate!'
}

Congratulations! 🎊`;

        return await this.sendToUser(telegramId, message);
    }

    async notifyTransactionFailed(telegramId, txData) {
        const message = `❌ **Transaction Failed**

😔 Your transaction could not be completed.

**📋 Details:**
• **Type:** ${txData.type}
• **Amount:** ${formatNumber(parseFloat(txData.amount))} USDT
• **Error:** ${txData.error || 'Unknown error'}

**🔧 What to do:**
• Check your wallet balance
• Ensure sufficient gas fees
• Try the transaction again
• Contact support if issue persists

Don't worry, your funds are safe! 💪`;

        return await this.sendToUser(telegramId, message);
    }

    // Referral notifications
    async notifyNewReferral(uplineTelegramId, refereeData) {
        const message = `🎉 **New Referral!**

👤 **${refereeData.firstName}** just joined using your referral code!

**👥 Your Referral Stats:**
• **Username:** @${refereeData.username || 'no_username'}
• **Joined:** ${formatDate(new Date())}
• **Status:** New member (not registered yet)

💰 You'll earn commission when they register for a membership plan!

🎯 Keep sharing: \`${refereeData.uplineReferralCode}\`

Great job building your network! 🚀`;

        return await this.sendToUser(uplineTelegramId, message);
    }

    async notifyReferralEarning(uplineTelegramId, earningData) {
        const message = `💰 **Commission Earned!**

🎊 You just earned a referral commission!

**💵 Commission Details:**
• **Amount:** ${formatNumber(parseFloat(earningData.amount))} USDT
• **From:** @${earningData.refereeUsername || 'member'}
• **Plan:** ${earningData.planName}
• **Transaction:** \`${earningData.txHash}\`

**📊 Your Stats:**
• **Total Referrals:** ${earningData.totalReferrals}
• **Total Earnings:** ${formatNumber(parseFloat(earningData.totalEarnings))} USDT

The commission has been sent directly to your wallet! 💳

Keep up the great work! 🌟`;

        return await this.sendToUser(uplineTelegramId, message);
    }

    // System notifications
    async sendDailyStats() {
        try {
            const stats = await this.userService.getPlatformStats();
            if (!stats) return;

            const message = `📊 **Daily Platform Report**

**👥 User Statistics:**
• **Total Users:** ${stats.users.total_users}
• **Active Members:** ${stats.users.registered_users}
• **New Today:** ${stats.users.new_users_24h}
• **New This Week:** ${stats.users.new_users_7d}

**💰 Transaction Activity:**
• **Total Transactions:** ${stats.transactions.total_transactions}
• **Confirmed:** ${stats.transactions.confirmed_transactions}
• **Today:** ${stats.transactions.transactions_24h}
• **Success Rate:** ${Math.round((stats.transactions.confirmed_transactions / Math.max(stats.transactions.total_transactions, 1)) * 100)}%

**👥 Referral Performance:**
• **Total Referrals:** ${stats.referrals.total_referrals}
• **Commission Paid:** ${formatNumber(parseFloat(stats.referrals.total_commission_paid))} USDT

**🏆 Top Plans:**
${stats.plans.slice(0, 3).map(plan => 
    `• Plan ${plan.plan_id}: ${plan.user_count} members`
).join('\n')}

📅 Report Date: ${formatDate(new Date())}`;

            return await this.sendToAdmin(message);

        } catch (error) {
            console.error('❌ Daily stats notification error:', error);
            return false;
        }
    }

    async checkPendingTransactions() {
        try {
            const db = getDatabase();
            const pendingTxs = await db.all(`
                SELECT t.*, u.telegram_id, u.first_name 
                FROM transactions t 
                JOIN users u ON t.user_id = u.id 
                WHERE t.status = 'pending' 
                AND t.created_at < datetime('now', '-10 minutes')
                LIMIT 10
            `);

            for (const tx of pendingTxs) {
                // This would check blockchain status in a real implementation
                // For now, we'll simulate the check
                console.log(`🔍 Checking transaction ${tx.tx_hash}...`);
            }

        } catch (error) {
            console.error('❌ Check pending transactions error:', error);
        }
    }

    // Welcome notifications for new users
    async sendWelcomeMessage(telegramId, userData) {
        const message = `🎉 **Welcome to Crypto Membership NFT!**

👋 Hi ${userData.firstName}! Welcome to our exclusive membership community!

**🎯 What you can do now:**
• 📋 Explore membership plans
• 💳 Connect your BSC wallet
• 🚀 Register for your first membership
• 👥 Start referring friends and earn!

**💡 Quick Start Guide:**
1. Use /plans to see available memberships
2. Use /wallet to connect your wallet
3. Use /register to join a plan
4. Share your referral code to earn!

**🎁 Your Referral Code:** \`${userData.referralCode}\`

Ready to start earning? Let's go! 🚀`;

        return await this.sendToUser(telegramId, message);
    }

    // Reminder notifications
    async sendRegistrationReminder(telegramId, userData) {
        const daysSinceJoin = Math.floor((Date.now() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24));

        const message = `⏰ **Friendly Reminder**

Hi ${userData.firstName}! You joined us ${daysSinceJoin} day${daysSinceJoin !== 1 ? 's' : ''} ago.

**🎯 Complete your membership registration to:**
• 💰 Start earning referral commissions
• 🎫 Get your exclusive NFT membership
• 🌟 Access VIP community features
• ⬆️ Unlock upgrade opportunities

**🚀 Ready to get started?**
Use /register to choose your membership plan!

**💡 Need help?** Use /help for assistance.

Don't miss out on earning opportunities! 💪`;

        return await this.sendToUser(telegramId, message);
    }

    // Rate limiting
    checkRateLimit(telegramId) {
        const userRate = this.rateLimitMap.get(telegramId);
        const now = Date.now();

        if (!userRate) {
            return true; // First message, allow
        }

        // Clean old entries
        userRate.messages = userRate.messages.filter(
            timestamp => now - timestamp < this.rateLimit.timeWindow
        );

        return userRate.messages.length < this.rateLimit.maxMessages;
    }

    updateRateLimit(telegramId) {
        const now = Date.now();
        
        if (!this.rateLimitMap.has(telegramId)) {
            this.rateLimitMap.set(telegramId, { messages: [] });
        }

        const userRate = this.rateLimitMap.get(telegramId);
        userRate.messages.push(now);
    }

    startRateLimitCleanup() {
        setInterval(() => {
            const now = Date.now();
            
            for (const [telegramId, userRate] of this.rateLimitMap.entries()) {
                // Remove old entries
                userRate.messages = userRate.messages.filter(
                    timestamp => now - timestamp < this.rateLimit.timeWindow
                );

                // Remove empty entries
                if (userRate.messages.length === 0) {
                    this.rateLimitMap.delete(telegramId);
                }
            }
        }, this.rateLimit.cleanupInterval);
    }

    // Utility methods
    async logNotification(telegramId, message, success, error = null) {
        try {
            const db = getDatabase();
            await db.run(`
                INSERT INTO notification_log (telegram_id, message, success, error, created_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [telegramId, message.slice(0, 500), success ? 1 : 0, error]);

        } catch (error) {
            console.error('❌ Error logging notification:', error);
        }
    }

    getPlanName(planId) {
        const planNames = {
            1: 'Starter', 2: 'Basic', 3: 'Bronze', 4: 'Silver',
            5: 'Gold', 6: 'Platinum', 7: 'Diamond', 8: 'Elite',
            9: 'Master', 10: 'Grand Master', 11: 'Champion', 12: 'Legend',
            13: 'Supreme', 14: 'Ultimate', 15: 'Apex', 16: 'Infinity'
        };
        return planNames[planId] || `Plan ${planId}`;
    }

    // Cleanup and maintenance
    async cleanup() {
        try {
            // Clear rate limiting data
            this.rateLimitMap.clear();
            
            // Clear pending notifications
            this.pendingNotifications.clear();
            
            console.log('🧹 Notification service cleanup completed');

        } catch (error) {
            console.error('❌ Notification service cleanup error:', error);
        }
    }

    // Health check
    isHealthy() {
        return {
            bot_connected: !!this.bot,
            rate_limit_active: this.rateLimitMap.size > 0,
            admin_configured: !!this.adminUserId,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = NotificationService;