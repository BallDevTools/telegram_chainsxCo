const { Markup } = require('telegraf');
const UserService = require('../../services/UserService');
const BlockchainService = require('../../services/BlockchainService');
const NotificationService = require('../../services/NotificationService');
const { formatNumber, formatDate } = require('../../utils/formatting');
const { getDatabase } = require('../../config/database');

class AdminHandler {
    constructor() {
        this.userService = new UserService();
        this.blockchainService = new BlockchainService();
        this.notificationService = new NotificationService();
        this.adminUserIds = process.env.ADMIN_USER_ID ? 
            process.env.ADMIN_USER_ID.split(',').map(id => id.trim()) : [];
    }

    async handle(ctx) {
        try {
            // Check admin permissions
            if (!this.isAdmin(ctx.from.id)) {
                await ctx.reply('❌ Access denied. Admin privileges required.');
                return;
            }

            const adminMessage = await this.buildAdminMessage();
            const keyboard = this.getAdminKeyboard();

            if (ctx.callbackQuery) {
                await ctx.editMessageText(adminMessage, {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
                await ctx.answerCbQuery();
            } else {
                await ctx.reply(adminMessage, {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
            }

        } catch (error) {
            console.error('❌ Admin handler error:', error);
            await ctx.reply('❌ Admin panel error. Please try again.');
        }
    }

    async buildAdminMessage() {
        try {
            const stats = await this.userService.getPlatformStats();
            const systemStats = await this.blockchainService.getSystemStats();
            
            return `🔧 **Admin Control Panel**

**📊 Platform Overview:**
• **Total Users:** ${stats?.users?.total_users || 0}
• **Active Members:** ${stats?.users?.registered_users || 0}
• **New Today:** ${stats?.users?.new_users_24h || 0}
• **Total Revenue:** ${systemStats ? formatNumber(parseFloat(systemStats.totalRevenue)) : '0'} USDT

**⚡ Quick Stats:**
• **Pending Transactions:** ${stats?.transactions?.pending_transactions || 0}
• **Success Rate:** ${this.calculateSuccessRate(stats?.transactions)}%
• **Commission Paid:** ${systemStats ? formatNumber(parseFloat(systemStats.totalCommission)) : '0'} USDT

**🔧 Admin Tools Available:**
Use the buttons below to manage the platform.

⚠️ **Admin Mode Active** - Handle with care!`;

        } catch (error) {
            console.error('❌ Error building admin message:', error);
            return `🔧 **Admin Control Panel**\n\n❌ Error loading statistics.\n\nBasic admin functions are still available.`;
        }
    }

    getAdminKeyboard() {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('👥 Users', 'admin_users'),
                Markup.button.callback('📊 Statistics', 'admin_stats')
            ],
            [
                Markup.button.callback('💰 Transactions', 'admin_transactions'),
                Markup.button.callback('⛓️ Blockchain', 'admin_blockchain')
            ],
            [
                Markup.button.callback('📢 Broadcast', 'admin_broadcast'),
                Markup.button.callback('🔧 Settings', 'admin_settings')
            ],
            [
                Markup.button.callback('📈 Analytics', 'admin_analytics'),
                Markup.button.callback('🛠️ Maintenance', 'admin_maintenance')
            ],
            [
                Markup.button.callback('🏠 Main Menu', 'action_back_main')
            ]
        ]);
    }

    async handleAction(ctx, action) {
        try {
            if (!this.isAdmin(ctx.from.id)) {
                await ctx.answerCbQuery('❌ Access denied');
                return;
            }

            switch (action) {
                case 'users':
                    await this.showUsers(ctx);
                    break;
                case 'stats':
                    await this.handleStats(ctx);
                    break;
                case 'transactions':
                    await this.showTransactions(ctx);
                    break;
                case 'blockchain':
                    await this.showBlockchainInfo(ctx);
                    break;
                case 'broadcast':
                    await this.showBroadcast(ctx);
                    break;
                case 'settings':
                    await this.showSettings(ctx);
                    break;
                case 'analytics':
                    await this.showAnalytics(ctx);
                    break;
                case 'maintenance':
                    await this.showMaintenance(ctx);
                    break;
                default:
                    await ctx.answerCbQuery('❌ Unknown action');
            }

        } catch (error) {
            console.error(`❌ Admin action error (${action}):`, error);
            await ctx.answerCbQuery('❌ Action failed');
        }
    }

    async showUsers(ctx, page = 1) {
        try {
            const limit = 10;
            const offset = (page - 1) * limit;
            
            const result = await this.userService.getAllUsers(limit, offset);
            const users = result.users;
            
            let message = `👥 **User Management** (Page ${page})\n\n`;
            
            if (users.length === 0) {
                message += '📭 No users found.';
            } else {
                users.forEach((user, index) => {
                    const status = user.is_registered ? '💎' : '⭐';
                    const joined = formatDate(user.created_at, true);
                    message += `${status} **${user.first_name}**\n`;
                    message += `   @${user.username || 'no_username'} • ${joined}\n`;
                    message += `   Plan: ${user.plan_id || 'None'} • Referrals: ${user.total_referrals}\n\n`;
                });
                
                message += `**Total:** ${result.total} users`;
            }

            const keyboard = this.getUsersKeyboard(page, result.hasMore);

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();

        } catch (error) {
            console.error('❌ Show users error:', error);
            await ctx.answerCbQuery('❌ Failed to load users');
        }
    }

    getUsersKeyboard(page, hasMore) {
        const keyboard = [];
        
        // Pagination
        const navRow = [];
        if (page > 1) {
            navRow.push(Markup.button.callback('⬅️ Previous', `page_users_${page - 1}`));
        }
        if (hasMore) {
            navRow.push(Markup.button.callback('➡️ Next', `page_users_${page + 1}`));
        }
        if (navRow.length > 0) {
            keyboard.push(navRow);
        }

        keyboard.push([
            Markup.button.callback('🔍 Search User', 'admin_search_user'),
            Markup.button.callback('📊 User Stats', 'admin_user_stats')
        ]);

        keyboard.push([
            Markup.button.callback('🔙 Back', 'admin_main')
        ]);

        return Markup.inlineKeyboard(keyboard);
    }

    async handleStats(ctx) {
        try {
            const platformStats = await this.userService.getPlatformStats();
            const blockchainStats = await this.blockchainService.getSystemStats();
            
            const message = await this.buildStatsMessage(platformStats, blockchainStats);
            const keyboard = this.getStatsKeyboard();

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();

        } catch (error) {
            console.error('❌ Stats error:', error);
            await ctx.answerCbQuery('❌ Failed to load statistics');
        }
    }

    async buildStatsMessage(platformStats, blockchainStats) {
        let message = `📊 **Platform Statistics**\n\n`;

        if (platformStats) {
            message += `**👥 User Analytics:**
• Total Users: ${platformStats.users.total_users}
• Active Members: ${platformStats.users.registered_users}
• Users with Wallets: ${platformStats.users.users_with_wallet}
• New (24h): ${platformStats.users.new_users_24h}
• New (7d): ${platformStats.users.new_users_7d}

**📝 Transaction Metrics:**
• Total Transactions: ${platformStats.transactions.total_transactions}
• Confirmed: ${platformStats.transactions.confirmed_transactions}
• Pending: ${platformStats.transactions.pending_transactions}
• Success Rate: ${this.calculateSuccessRate(platformStats.transactions)}%

**👥 Referral Performance:**
• Total Referrals: ${platformStats.referrals.total_referrals}
• Paid Referrals: ${platformStats.referrals.paid_referrals}
• Commission Paid: ${formatNumber(parseFloat(platformStats.referrals.total_commission_paid))} USDT`;

            if (platformStats.plans && platformStats.plans.length > 0) {
                message += `\n\n**🏆 Popular Plans:**`;
                platformStats.plans.slice(0, 5).forEach(plan => {
                    message += `\n• Plan ${plan.plan_id}: ${plan.user_count} members`;
                });
            }
        }

        if (blockchainStats) {
            message += `\n\n**⛓️ Blockchain Data:**
• Total Members: ${blockchainStats.totalMembers}
• Total Revenue: ${formatNumber(parseFloat(blockchainStats.totalRevenue))} USDT
• Total Commission: ${formatNumber(parseFloat(blockchainStats.totalCommission))} USDT
• Owner Funds: ${formatNumber(parseFloat(blockchainStats.ownerFunds))} USDT
• Fee Funds: ${formatNumber(parseFloat(blockchainStats.feeFunds))} USDT`;
        }

        message += `\n\n📅 **Generated:** ${formatDate(new Date())}`;

        return message;
    }

    getStatsKeyboard() {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('📈 Detailed Analytics', 'admin_analytics'),
                Markup.button.callback('💰 Financial Report', 'admin_financial')
            ],
            [
                Markup.button.callback('🔄 Refresh', 'admin_stats'),
                Markup.button.callback('📊 Export Data', 'admin_export')
            ],
            [
                Markup.button.callback('🔙 Back', 'admin_main')
            ]
        ]);
    }

    async showTransactions(ctx, page = 1) {
        try {
            const limit = 10;
            const offset = (page - 1) * limit;
            
            const db = getDatabase();
            const transactions = await db.all(`
                SELECT t.*, u.telegram_id, u.first_name, u.username
                FROM transactions t
                JOIN users u ON t.user_id = u.id
                ORDER BY t.created_at DESC
                LIMIT ? OFFSET ?
            `, [limit, offset]);

            const totalCount = await db.get('SELECT COUNT(*) as count FROM transactions');
            const hasMore = (offset + transactions.length) < totalCount.count;

            let message = `💰 **Transaction History** (Page ${page})\n\n`;

            if (transactions.length === 0) {
                message += '📭 No transactions found.';
            } else {
                transactions.forEach(tx => {
                    const status = this.getStatusEmoji(tx.status);
                    const amount = formatNumber(parseFloat(tx.amount));
                    const date = formatDate(tx.created_at, true);
                    
                    message += `${status} **${tx.type.toUpperCase()}**\n`;
                    message += `   ${tx.first_name} • ${amount} USDT\n`;
                    message += `   ${date} • Hash: \`${tx.tx_hash?.slice(0, 10)}...\`\n\n`;
                });

                message += `**Total:** ${totalCount.count} transactions`;
            }

            const keyboard = this.getTransactionsKeyboard(page, hasMore);

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();

        } catch (error) {
            console.error('❌ Show transactions error:', error);
            await ctx.answerCbQuery('❌ Failed to load transactions');
        }
    }

    getTransactionsKeyboard(page, hasMore) {
        const keyboard = [];
        
        // Pagination
        const navRow = [];
        if (page > 1) {
            navRow.push(Markup.button.callback('⬅️ Previous', `page_transactions_${page - 1}`));
        }
        if (hasMore) {
            navRow.push(Markup.button.callback('➡️ Next', `page_transactions_${page + 1}`));
        }
        if (navRow.length > 0) {
            keyboard.push(navRow);
        }

        keyboard.push([
            Markup.button.callback('🔍 Filter', 'admin_filter_tx'),
            Markup.button.callback('📊 TX Stats', 'admin_tx_stats')
        ]);

        keyboard.push([
            Markup.button.callback('🔙 Back', 'admin_main')
        ]);

        return Markup.inlineKeyboard(keyboard);
    }

    async showBlockchainInfo(ctx) {
        try {
            const blockchainStatus = this.blockchainService.getStatus();
            const systemStats = await this.blockchainService.getSystemStats();
            
            let message = `⛓️ **Blockchain Information**\n\n`;

            message += `**🔗 Connection Status:**
• Connected: ${blockchainStatus.connected ? '✅' : '❌'}
• Network: BSC Testnet
• Last Block: ${blockchainStatus.lastBlockNumber}

**📋 Contract Addresses:**
• NFT Contract: \`${blockchainStatus.contractAddresses.nft}\`
• USDT Contract: \`${blockchainStatus.contractAddresses.usdt}\``;

            if (systemStats) {
                message += `\n\n**💰 Contract Balances:**
• Owner Funds: ${formatNumber(parseFloat(systemStats.ownerFunds))} USDT
• Fee System: ${formatNumber(parseFloat(systemStats.feeFunds))} USDT
• Fund Balance: ${formatNumber(parseFloat(systemStats.fundFunds))} USDT

**📊 Contract Stats:**
• Total Members: ${systemStats.totalMembers}
• Total Revenue: ${formatNumber(parseFloat(systemStats.totalRevenue))} USDT
• Commission Paid: ${formatNumber(parseFloat(systemStats.totalCommission))} USDT`;
            }

            const keyboard = this.getBlockchainKeyboard();

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();

        } catch (error) {
            console.error('❌ Show blockchain info error:', error);
            await ctx.answerCbQuery('❌ Failed to load blockchain information');
        }
    }

    getBlockchainKeyboard() {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('💰 Withdraw Funds', 'admin_withdraw'),
                Markup.button.callback('🔄 Sync Events', 'admin_sync_events')
            ],
            [
                Markup.button.callback('⚙️ Contract Settings', 'admin_contract_settings'),
                Markup.button.callback('📊 Gas Tracker', 'admin_gas_tracker')
            ],
            [
                Markup.button.callback('🔙 Back', 'admin_main')
            ]
        ]);
    }

    async showBroadcast(ctx) {
        const message = `📢 **Broadcast Message**

Send a message to all active users.

**⚠️ Important:**
• Message will be sent to ALL active users
• Use this feature responsibly
• Include clear and valuable information
• Avoid spam or frequent messages

**📊 Current Recipients:**
• Active users who will receive the message
• Rate limiting: 1 message per second
• Delivery report will be provided

Type your broadcast message:`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('❌ Cancel', 'admin_main')]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
        await ctx.answerCbQuery();

        // Set conversation state
        ctx.session.step = 'waiting_broadcast_message';
    }

    async handleBroadcast(ctx) {
        try {
            if (!this.isAdmin(ctx.from.id)) {
                await ctx.reply('❌ Access denied');
                return;
            }

            const stats = await this.userService.getPlatformStats();
            const totalUsers = stats?.users?.total_users || 0;

            const message = `📢 **Confirm Broadcast**

**Message Preview:**
"${ctx.message.text.slice(0, 200)}${ctx.message.text.length > 200 ? '...' : ''}"

**📊 Delivery Details:**
• Recipients: ${totalUsers} active users
• Estimated time: ${Math.ceil(totalUsers / 60)} minutes
• Rate limit: 1 msg/second

⚠️ **This action cannot be undone!**

Proceed with broadcast?`;

            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Send Broadcast', 'admin_confirm_broadcast'),
                    Markup.button.callback('❌ Cancel', 'admin_main')
                ]
            ]);

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });

            // Store message for broadcast
            ctx.session.broadcastMessage = ctx.message.text;

        } catch (error) {
            console.error('❌ Handle broadcast error:', error);
            await ctx.reply('❌ Broadcast preparation failed');
        }
    }

    async handleBroadcastInput(ctx, text) {
        await this.handleBroadcast(ctx);
    }

    async confirmBroadcast(ctx) {
        try {
            if (!ctx.session.broadcastMessage) {
                await ctx.answerCbQuery('❌ No message to broadcast');
                return;
            }

            await ctx.answerCbQuery('📢 Starting broadcast...');

            const processingMessage = `📢 **Broadcasting...**

🔄 Sending your message to all users...

This may take several minutes. You'll receive a report when complete.`;

            await ctx.editMessageText(processingMessage, { parse_mode: 'Markdown' });

            // Start broadcast
            const result = await this.notificationService.broadcast(ctx.session.broadcastMessage);

            const resultMessage = `📢 **Broadcast Complete!**

**📊 Delivery Report:**
• ✅ Sent: ${result.sent}
• ❌ Failed: ${result.failed}
• 📱 Total: ${result.total}
• 📈 Success Rate: ${Math.round((result.sent / result.total) * 100)}%

Broadcast completed successfully! 🎉`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Back to Admin', 'admin_main')]
            ]);

            await ctx.editMessageText(resultMessage, {
                parse_mode: 'Markdown',
                ...keyboard
            });

            // Clear session
            delete ctx.session.broadcastMessage;
            ctx.session.step = null;

        } catch (error) {
            console.error('❌ Confirm broadcast error:', error);
            await ctx.editMessageText('❌ Broadcast failed. Please try again.');
        }
    }

    // Helper methods
    isAdmin(userId) {
        return this.adminUserIds.includes(userId.toString());
    }

    calculateSuccessRate(transactions) {
        if (!transactions || transactions.total_transactions === 0) return 0;
        return Math.round((transactions.confirmed_transactions / transactions.total_transactions) * 100);
    }

    getStatusEmoji(status) {
        const emojis = {
            'pending': '⏳',
            'confirmed': '✅',
            'failed': '❌'
        };
        return emojis[status] || '❓';
    }

    async showUsersPage(ctx, page) {
        await this.showUsers(ctx, page);
    }

    async showTransactionsPage(ctx, page) {
        await this.showTransactions(ctx, page);
    }
}

module.exports = AdminHandler;