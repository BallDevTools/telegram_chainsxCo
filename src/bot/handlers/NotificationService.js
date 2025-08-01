const { Telegraf } = require('telegraf');
const UserService = require('./UserService');
const BlockchainService = require('./BlockchainService');
const { getDatabase } = require('../config/database');
const { formatNumber, formatDate } = require('../utils/formatting');

class NotificationService {
    constructor() {
        this.bot = null;
        this.userService = new UserService();
        this.blockchainService = new BlockchainService();
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
            
            return true;

        } catch (error) {
            console.error(`❌ Failed to send notification to ${telegramId}:`, error);
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
                // Check transaction status on blockchain
                try {
                    const receipt = await this.blockchainService.provider.getTransactionReceipt(tx.tx_hash);
                    
                    if (receipt) {
                        if (receipt.status === 1) {
                            // Transaction successful
                            await db.run(
                                'UPDATE transactions SET status = ?, block_number = ?, confirmed_at = CURRENT_TIMESTAMP WHERE id = ?',
                                ['confirmed', receipt.blockNumber, tx.id]
                            );

                            await this.notifyTransactionConfirmed(tx.telegram_id, {
                                type: tx.type,
                                amount: tx.amount,
                                txHash: tx.tx_hash,
                                blockNumber: receipt.blockNumber
                            });

                        } else {
                            // Transaction failed
                            await db.run(
                                'UPDATE transactions SET status = ?, error_message = ? WHERE id = ?',
                                ['failed', 'Transaction reverted', tx.id]
                            );

                            await this.notifyTransactionFailed(tx.telegram_id, {
                                type: tx.type,
                                amount: tx.amount,
                                error: 'Transaction reverted'
                            });
                        }
                    }

                } catch (error) {
                    console.error(`❌ Error checking transaction ${tx.tx_hash}:`, error);
                    
                    // If transaction is very old, mark as failed
                    const txAge = Date.now() - new Date(tx.created_at).getTime();
                    if (txAge > 30 * 60 * 1000) { // 30 minutes
                        await db.run(
                            'UPDATE transactions SET status = ?, error_message = ? WHERE id = ?',
                            ['failed', 'Transaction timeout', tx.id]
                        );

                        await this.notifyTransactionFailed(tx.telegram_id, {
                            type: tx.type,
                            amount: tx.amount,
                            error: 'Transaction timeout'
                        });
                    }
                }
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

    async sendUpgradeReminder(telegramId, userData) {
        const message = `🚀 **Upgrade Opportunity!**

Hi ${userData.firstName}! You're doing great with your current plan!

**💡 Consider upgrading to earn more:**
• Higher commission rates
• Better earning potential
• Enhanced membership benefits
• Exclusive features access

**📈 Current Plan:** ${this.getPlanName(userData.planId)}
**💰 Total Earned:** ${formatNumber(parseFloat(userData.totalEarnings))} USDT

**⬆️ Ready to upgrade?** Use /upgrade to see your options!

Keep building your success! 🌟`;

        return await this.sendToUser(telegramId, message);
    }

    // Admin notifications
    async notifyNewRegistration(registrationData) {
        const message = `👤 **New Member Registration**

🎉 New member just registered!

**📋 Details:**
• **Name:** ${registrationData.firstName}
• **Username:** @${registrationData.username || 'no_username'}
• **Plan:** ${registrationData.planName}
• **Amount:** ${formatNumber(parseFloat(registrationData.amount))} USDT
• **Upline:** ${registrationData.uplineName || 'Owner'}

**📊 Platform Stats:**
• **Total Members:** ${registrationData.totalMembers}
• **Today's Registrations:** ${registrationData.todayRegistrations}

Great to see the platform growing! 📈`;

        return await this.sendToAdmin(message);
    }

    async notifySystemAlert(alertData) {
        const message = `🚨 **System Alert**

**⚠️ Alert Type:** ${alertData.type}
**📋 Details:** ${alertData.message}
**🕐 Time:** ${formatDate(new Date())}

${alertData.severity === 'high' ? '**🔴 HIGH PRIORITY**' : ''}

Please check the system immediately! 🔧`;

        return await this.sendToAdmin(message);
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

    // Scheduled notifications
    async scheduleNotification(telegramId, message, delayMs, options = {}) {
        setTimeout(async () => {
            await this.sendToUser(telegramId, message, options);
        }, delayMs);
    }

    // Batch notifications
    async sendBatch(notifications) {
        const results = [];
        const delay = 100; // 100ms delay between messages

        for (const notification of notifications) {
            try {
                const success = await this.sendToUser(
                    notification.telegramId,
                    notification.message,
                    notification.options || {}
                );

                results.push({
                    telegramId: notification.telegramId,
                    success,
                    error: null
                });

                // Delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, delay));

            } catch (error) {
                results.push({
                    telegramId: notification.telegramId,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    // Template-based notifications
    async sendTemplate(templateName, telegramId, data = {}) {
        const template = this.getTemplate(templateName);
        if (!template) {
            console.error(`❌ Template not found: ${templateName}`);
            return false;
        }

        const message = this.renderTemplate(template, data);
        return await this.sendToUser(telegramId, message);
    }

    getTemplate(templateName) {
        const templates = {
            'welcome': `🎉 **Welcome {{firstName}}!**\n\nYour referral code: \`{{referralCode}}\`\n\nStart earning today! 🚀`,
            
            'referral_joined': `👥 **New Referral!**\n\n{{firstName}} joined using your code!\n\n💰 Total referrals: {{totalReferrals}}`,
            
            'commission_earned': `💰 **Commission Earned!**\n\n+{{amount}} USDT from {{refereeUsername}}\n\nTotal earnings: {{totalEarnings}} USDT 🎊`,
            
            'registration_complete': `✅ **Registration Complete!**\n\nPlan: {{planName}}\nNFT Token: #{{tokenId}}\n\nStart referring friends! 🚀`,
            
            'upgrade_complete': `⬆️ **Upgrade Complete!**\n\nNew Plan: {{planName}}\nNew Commission Rate: {{commissionRate}}%\n\nCongratulations! 🎉`,
            
            'maintenance_notice': `🔧 **Maintenance Notice**\n\nScheduled maintenance: {{startTime}} - {{endTime}}\n\nServices may be temporarily unavailable.`,
            
            'security_alert': `🔒 **Security Alert**\n\nUnusual activity detected on your account.\n\nIf this wasn't you, contact support immediately!`,
            
            'payment_reminder': `💳 **Payment Reminder**\n\nPending transaction detected.\n\nPlease complete your payment to activate membership.`
        };

        return templates[templateName];
    }

    renderTemplate(template, data) {
        let rendered = template;
        
        for (const [key, value] of Object.entries(data)) {
            const placeholder = `{{${key}}}`;
            rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
        }

        return rendered;
    }

    // Notification preferences
    async getUserNotificationPreferences(telegramId) {
        try {
            const db = getDatabase();
            const prefs = await db.get(
                'SELECT notification_preferences FROM users WHERE telegram_id = ?',
                [telegramId]
            );

            if (prefs && prefs.notification_preferences) {
                return JSON.parse(prefs.notification_preferences);
            }

            // Default preferences
            return {
                referrals: true,
                commissions: true,
                system: true,
                marketing: false,
                reminders: true
            };

        } catch (error) {
            console.error('❌ Error getting notification preferences:', error);
            return null;
        }
    }

    async updateNotificationPreferences(telegramId, preferences) {
        try {
            const db = getDatabase();
            await db.run(
                'UPDATE users SET notification_preferences = ? WHERE telegram_id = ?',
                [JSON.stringify(preferences), telegramId]
            );

            return true;

        } catch (error) {
            console.error('❌ Error updating notification preferences:', error);
            return false;
        }
    }

    // Analytics and metrics
    async getNotificationStats() {
        try {
            const db = getDatabase();
            
            // Get notification counts for last 24 hours
            const stats = await db.get(`
                SELECT 
                    COUNT(*) as total_sent,
                    COUNT(CASE WHEN created_at >= datetime('now', '-1 hour') THEN 1 END) as last_hour,
                    COUNT(CASE WHEN created_at >= datetime('now', '-24 hours') THEN 1 END) as last_24h
                FROM notification_log 
                WHERE created_at >= datetime('now', '-24 hours')
            `);

            // Get rate limit stats
            const rateLimitStats = {
                active_users: this.rateLimitMap.size,
                total_messages_tracked: Array.from(this.rateLimitMap.values())
                    .reduce((sum, user) => sum + user.messages.length, 0)
            };

            return {
                ...stats,
                rate_limiting: rateLimitStats,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Error getting notification stats:', error);
            return null;
        }
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