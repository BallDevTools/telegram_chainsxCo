const { Markup } = require('telegraf');
const UserService = require('../../services/UserService');
const BlockchainService = require('../../services/BlockchainService');
const { formatNumber, formatDate, formatDuration } = require('../../utils/formatting');

class ProfileHandler {
    constructor() {
        this.userService = new UserService();
        this.blockchainService = new BlockchainService();
    }

    async handle(ctx) {
        try {
            const telegramId = ctx.from.id.toString();
            const user = await this.userService.getUserByTelegramId(telegramId);
            
            if (!user) {
                await ctx.reply('❌ User not found. Please use /start to register.');
                return;
            }

            const profileMessage = await this.buildProfileMessage(user);
            const keyboard = this.getProfileKeyboard(user);
            
            if (ctx.callbackQuery) {
                await ctx.editMessageText(profileMessage, {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
                await ctx.answerCbQuery();
            } else {
                await ctx.reply(profileMessage, {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
            }
            
        } catch (error) {
            console.error('❌ Profile handler error:', error);
            await ctx.reply('❌ Failed to load profile. Please try again.');
        }
    }

    async buildProfileMessage(user) {
        try {
            // Get blockchain info if user has wallet
            let blockchainInfo = null;
            if (user.wallet_address) {
                blockchainInfo = await this.blockchainService.getMemberInfo(user.wallet_address);
            }

            // Get user statistics
            const stats = await this.userService.getUserStats(user.telegram_id);
            
            // Build profile sections
            const header = this.buildHeaderSection(user);
            const membershipSection = this.buildMembershipSection(user, blockchainInfo);
            const statsSection = this.buildStatsSection(stats);
            const walletSection = this.buildWalletSection(user, blockchainInfo);
            
            return `${header}\n\n${membershipSection}\n\n${statsSection}\n\n${walletSection}`;
            
        } catch (error) {
            console.error('❌ Error building profile message:', error);
            return this.buildBasicProfileMessage(user);
        }
    }

    buildHeaderSection(user) {
        const statusEmoji = user.is_registered ? '💎' : '⭐';
        const memberSince = formatDate(user.created_at);
        
        return `${statusEmoji} **${user.first_name}'s Profile**

👤 **Username:** @${user.username || 'not_set'}
📅 **Member Since:** ${memberSince}
🆔 **User ID:** \`${user.telegram_id}\``;
    }

    buildMembershipSection(user, blockchainInfo) {
        if (!user.is_registered) {
            return `📋 **Membership Status**
❌ Not registered yet
💡 Use /register to join a membership plan`;
        }

        const planName = this.getPlanName(user.plan_id);
        const registeredDate = formatDate(user.registered_at);
        
        let section = `💎 **Membership Status**
✅ Active Member
📊 **Plan:** ${planName} (Level ${user.plan_id})
📅 **Registered:** ${registeredDate}`;

        if (blockchainInfo) {
            section += `\n🔄 **Cycle:** ${blockchainInfo.cycleNumber}`;
            if (blockchainInfo.tokenId) {
                section += `\n🎫 **NFT Token:** #${blockchainInfo.tokenId}`;
            }
        }

        return section;
    }

    buildStatsSection(stats) {
        if (!stats) {
            return `📊 **Statistics**
📈 Loading statistics...`;
        }

        const totalEarnings = parseFloat(stats.user.total_earnings) || 0;
        const referralCount = stats.referrals.total || 0;
        const activeReferrals = stats.referrals.active || 0;
        const transactionCount = stats.transactions.total || 0;

        return `📊 **Statistics**
👥 **Referrals:** ${referralCount} total, ${activeReferrals} active
💰 **Total Earnings:** ${formatNumber(totalEarnings)} USDT
📝 **Transactions:** ${transactionCount}
🎯 **Success Rate:** ${this.calculateSuccessRate(stats)}%`;
    }

    buildWalletSection(user, blockchainInfo) {
        if (!user.wallet_address) {
            return `💳 **Wallet**
❌ No wallet connected
💡 Use /wallet to connect your wallet`;
        }

        const shortAddress = `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`;
        
        let section = `💳 **Wallet**
✅ Connected: \`${shortAddress}\``;

        if (blockchainInfo) {
            section += `\n📈 **On-chain Earnings:** ${this.blockchainService.formatTokenAmount(blockchainInfo.totalEarnings)} USDT`;
            section += `\n👥 **On-chain Referrals:** ${blockchainInfo.totalReferrals}`;
        }

        return section;
    }

    buildBasicProfileMessage(user) {
        const statusEmoji = user.is_registered ? '💎' : '⭐';
        const memberSince = formatDate(user.created_at);
        
        return `${statusEmoji} **${user.first_name}'s Profile**

👤 **Username:** @${user.username || 'not_set'}
📅 **Member Since:** ${memberSince}
📊 **Status:** ${user.is_registered ? 'Active Member' : 'Not Registered'}
👥 **Referrals:** ${user.total_referrals}
💰 **Earnings:** ${formatNumber(parseFloat(user.total_earnings))} USDT

💡 Use the buttons below to manage your profile.`;
    }

    getProfileKeyboard(user) {
        const keyboard = [];

        if (user.is_registered) {
            keyboard.push([
                Markup.button.callback('⬆️ Upgrade Plan', 'action_upgrade'),
                Markup.button.callback('💰 Earnings', 'action_earnings')
            ]);
        } else {
            keyboard.push([
                Markup.button.callback('🚀 Register Now', 'action_get_started')
            ]);
        }

        keyboard.push([
            Markup.button.callback('👥 Referrals', 'action_referrals'),
            Markup.button.callback('💳 Wallet', 'action_wallet_info')
        ]);

        keyboard.push([
            Markup.button.callback('📊 Full Stats', 'action_stats'),
            Markup.button.callback('🔄 Refresh', 'action_refresh')
        ]);

        keyboard.push([
            Markup.button.callback('🏠 Main Menu', 'action_back_main')
        ]);

        return Markup.inlineKeyboard(keyboard);
    }

    async showEarnings(ctx) {
        try {
            const telegramId = ctx.from.id.toString();
            const user = await this.userService.getUserByTelegramId(telegramId);
            
            if (!user) {
                await ctx.answerCbQuery('❌ User not found');
                return;
            }

            const stats = await this.userService.getUserStats(user.telegram_id);
            const earningsMessage = await this.buildEarningsMessage(user, stats);
            const keyboard = this.getEarningsKeyboard();

            await ctx.editMessageText(earningsMessage, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();

        } catch (error) {
            console.error('❌ Show earnings error:', error);
            await ctx.answerCbQuery('❌ Failed to load earnings');
        }
    }

    async buildEarningsMessage(user, stats) {
        const totalEarnings = parseFloat(user.total_earnings) || 0;
        const totalPaid = parseFloat(user.total_paid) || 0;
        const pending = totalEarnings - totalPaid;

        let message = `💰 **Earnings Overview**

**Total Earned:** ${formatNumber(totalEarnings)} USDT
**Total Paid:** ${formatNumber(totalPaid)} USDT
**Pending:** ${formatNumber(pending)} USDT`;

        if (stats && stats.commissions) {
            message += `\n\n📊 **Commission Details**
**Total Payments:** ${stats.commissions.payments}
**Paid Payments:** ${stats.commissions.paid_payments}
**Success Rate:** ${this.calculateCommissionSuccessRate(stats.commissions)}%`;
        }

        // Get recent transactions
        const recentTransactions = await this.getRecentEarnings(user.telegram_id);
        if (recentTransactions.length > 0) {
            message += `\n\n📝 **Recent Earnings**`;
            recentTransactions.forEach(tx => {
                const date = formatDate(tx.created_at, true);
                message += `\n• ${formatNumber(parseFloat(tx.amount))} USDT - ${date}`;
            });
        }

        return message;
    }

    async getRecentEarnings(telegramId, limit = 5) {
        try {
            // This would get recent earning transactions
            // For now, return empty array
            return [];
        } catch (error) {
            console.error('❌ Error getting recent earnings:', error);
            return [];
        }
    }

    getEarningsKeyboard() {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('📊 Full History', 'action_earnings_history'),
                Markup.button.callback('💳 Withdraw', 'action_withdraw')
            ],
            [
                Markup.button.callback('🔄 Refresh', 'action_earnings'),
                Markup.button.callback('🔙 Back', 'action_profile')
            ]
        ]);
    }

    async showStats(ctx) {
        try {
            const telegramId = ctx.from.id.toString();
            const user = await this.userService.getUserByTelegramId(telegramId);
            
            if (!user) {
                await ctx.answerCbQuery('❌ User not found');
                return;
            }

            const stats = await this.userService.getUserStats(user.telegram_id);
            const statsMessage = await this.buildFullStatsMessage(user, stats);
            const keyboard = this.getStatsKeyboard();

            await ctx.editMessageText(statsMessage, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();

        } catch (error) {
            console.error('❌ Show stats error:', error);
            await ctx.answerCbQuery('❌ Failed to load statistics');
        }
    }

    async buildFullStatsMessage(user, stats) {
        if (!stats) {
            return `📊 **Statistics**\n\n❌ Unable to load statistics at this time.`;
        }

        const accountAge = this.calculateAccountAge(user.created_at);
        const activityScore = this.calculateActivityScore(stats);

        let message = `📊 **Detailed Statistics**

👤 **Account Information**
📅 **Account Age:** ${accountAge}
⭐ **Activity Score:** ${activityScore}/100
🎯 **Last Active:** ${formatDate(user.last_activity)}`;

        // Membership stats
        if (user.is_registered) {
            const membershipDuration = this.calculateMembershipDuration(user.registered_at);
            message += `\n\n💎 **Membership**
📊 **Plan Level:** ${user.plan_id}
⏱️ **Member For:** ${membershipDuration}`;
        }

        // Referral stats
        message += `\n\n👥 **Referral Performance**
**Total Referrals:** ${stats.referrals.total}
**Active Referrals:** ${stats.referrals.active}
**Registration Rate:** ${this.calculateRegistrationRate(stats.referrals)}%`;

        // Transaction stats
        message += `\n\n📝 **Transaction History**
**Total Transactions:** ${stats.transactions.total}
**Confirmed:** ${stats.transactions.confirmed}
**Success Rate:** ${this.calculateTransactionSuccessRate(stats.transactions)}%`;

        // Earnings breakdown
        const totalEarnings = parseFloat(stats.user.total_earnings) || 0;
        const avgPerReferral = stats.referrals.active > 0 ? totalEarnings / stats.referrals.active : 0;
        
        message += `\n\n💰 **Earnings Breakdown**
**Total Earned:** ${formatNumber(totalEarnings)} USDT
**Average per Referral:** ${formatNumber(avgPerReferral)} USDT
**Commission Payments:** ${stats.commissions.payments}`;

        return message;
    }

    getStatsKeyboard() {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('👥 Referral Details', 'action_referral_stats'),
                Markup.button.callback('📝 Transaction History', 'action_transaction_history')
            ],
            [
                Markup.button.callback('🔄 Refresh', 'action_stats'),
                Markup.button.callback('🔙 Back', 'action_profile')
            ]
        ]);
    }

    // Helper methods
    getPlanName(planId) {
        const planNames = {
            1: 'Starter', 2: 'Basic', 3: 'Bronze', 4: 'Silver',
            5: 'Gold', 6: 'Platinum', 7: 'Diamond', 8: 'Elite',
            9: 'Master', 10: 'Grand Master', 11: 'Champion', 12: 'Legend',
            13: 'Supreme', 14: 'Ultimate', 15: 'Apex', 16: 'Infinity'
        };
        return planNames[planId] || `Plan ${planId}`;
    }

    calculateSuccessRate(stats) {
        if (!stats || !stats.transactions) return 0;
        const total = stats.transactions.total;
        const confirmed = stats.transactions.confirmed;
        return total > 0 ? Math.round((confirmed / total) * 100) : 0;
    }

    calculateCommissionSuccessRate(commissions) {
        if (!commissions) return 0;
        const total = commissions.payments;
        const paid = commissions.paid_payments;
        return total > 0 ? Math.round((paid / total) * 100) : 0;
    }

    calculateRegistrationRate(referrals) {
        if (!referrals) return 0;
        const total = referrals.total;
        const registered = referrals.registered;
        return total > 0 ? Math.round((registered / total) * 100) : 0;
    }

    calculateTransactionSuccessRate(transactions) {
        if (!transactions) return 0;
        const total = transactions.total;
        const confirmed = transactions.confirmed;
        return total > 0 ? Math.round((confirmed / total) * 100) : 0;
    }

    calculateAccountAge(createdAt) {
        const created = new Date(createdAt);
        const now = new Date();
        const diffTime = Math.abs(now - created);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return '1 day';
        if (diffDays < 30) return `${diffDays} days`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
        return `${Math.floor(diffDays / 365)} years`;
    }

    calculateMembershipDuration(registeredAt) {
        if (!registeredAt) return 'Unknown';
        return this.calculateAccountAge(registeredAt);
    }

    calculateActivityScore(stats) {
        if (!stats) return 0;
        
        let score = 0;
        
        // Base score for being registered
        if (stats.user.is_registered) score += 20;
        
        // Score for referrals
        const referralScore = Math.min(stats.referrals.total * 5, 30);
        score += referralScore;
        
        // Score for successful transactions
        const transactionScore = Math.min(stats.transactions.confirmed * 3, 25);
        score += transactionScore;
        
        // Score for earnings
        const earnings = parseFloat(stats.user.total_earnings) || 0;
        const earningsScore = Math.min(Math.floor(earnings / 10), 25);
        score += earningsScore;
        
        return Math.min(score, 100);
    }
}

module.exports = ProfileHandler;