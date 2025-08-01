// src/bot/handlers/referral.js
const { Markup } = require('telegraf');
const UserService = require('../../services/UserService');
const { formatNumber, formatDate } = require('../../utils/formatting');

class ReferralHandler {
    constructor() {
        this.userService = new UserService();
    }

    async handle(ctx) {
        try {
            const telegramId = ctx.from.id.toString();
            const user = await this.userService.getUserByTelegramId(telegramId);
            
            if (!user) {
                await ctx.reply('❌ User not found. Please use /start to register.');
                return;
            }

            const referralMessage = await this.buildReferralMessage(user);
            const keyboard = this.getReferralKeyboard(user);

            if (ctx.callbackQuery) {
                await ctx.editMessageText(referralMessage, {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
                await ctx.answerCbQuery();
            } else {
                await ctx.reply(referralMessage, {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
            }

        } catch (error) {
            console.error('❌ Referral handler error:', error);
            await ctx.reply('❌ Failed to load referral information.');
        }
    }

    async buildReferralMessage(user) {
        const stats = await this.userService.getUserStats(user.telegram_id);
        const totalEarnings = parseFloat(user.total_earnings) || 0;

        return `👥 **Your Referral Program**

🎯 **Your Referral Code:** \`${user.referral_code}\`

**📊 Your Referral Stats:**
• **Total Referrals:** ${user.total_referrals}
• **Active Referrals:** ${stats?.referrals?.active || 0}
• **Total Earnings:** ${formatNumber(totalEarnings)} USDT

**💰 Commission Structure:**
• **Plan 1-4:** 30% commission
• **Plan 5-8:** 33% commission  
• **Plan 9-12:** 35% commission
• **Plan 13-16:** 36% commission

**🚀 How to Earn:**
1. Share your referral code with friends
2. They register using your code
3. You earn instant commissions
4. Build your network and increase earnings!

**🔗 Your Referral Link:**
https://t.me/${process.env.BOT_USERNAME}?start=${user.referral_code}

Share this link to start earning! 💪`;
    }

    getReferralKeyboard(user) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('📋 Copy Referral Code', 'action_copy_referral'),
                Markup.button.callback('🔗 Share Link', 'action_share_link')
            ],
            [
                Markup.button.callback('👥 My Referrals', 'action_my_referrals'),
                Markup.button.callback('💰 Earnings History', 'action_referral_earnings')
            ],
            [
                Markup.button.callback('📊 Detailed Stats', 'action_referral_stats'),
                Markup.button.callback('💡 Referral Tips', 'action_referral_tips')
            ],
            [
                Markup.button.callback('🏠 Main Menu', 'action_back_main')
            ]
        ]);
    }

    async shareCode(ctx) {
        try {
            const telegramId = ctx.from.id.toString();
            const user = await this.userService.getUserByTelegramId(telegramId);
            
            if (!user) {
                await ctx.answerCbQuery('❌ User not found');
                return;
            }

            const shareMessage = `🎉 **Join Crypto Membership NFT!**

💎 Get exclusive NFT membership and start earning!

**🚀 What you get:**
• Exclusive NFT membership token
• Earn from referrals instantly
• Upgrade through 16 membership levels
• Join our VIP community

**💰 Start earning today!**

👉 **Join here:** https://t.me/${process.env.BOT_USERNAME}?start=${user.referral_code}

*Sent by ${user.first_name}*`;

            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.url('📱 Share on Telegram', `https://t.me/share/url?url=https://t.me/${process.env.BOT_USERNAME}?start=${user.referral_code}&text=${encodeURIComponent(shareMessage)}`),
                ],
                [
                    Markup.button.callback('📋 Copy Message', 'action_copy_share_message'),
                    Markup.button.callback('🔙 Back', 'action_referrals')
                ]
            ]);

            await ctx.editMessageText(shareMessage + '\n\n💡 **Use the buttons below to share:**', {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();

        } catch (error) {
            console.error('❌ Share code error:', error);
            await ctx.answerCbQuery('❌ Failed to generate share message');
        }
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
            const message = await this.buildDetailedStatsMessage(user, stats);
            const keyboard = this.getStatsKeyboard();

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();

        } catch (error) {
            console.error('❌ Show referral stats error:', error);
            await ctx.answerCbQuery('❌ Failed to load statistics');
        }
    }

    async buildDetailedStatsMessage(user, stats) {
        if (!stats) {
            return '📊 **Referral Statistics**\n\n❌ Unable to load statistics at this time.';
        }

        const totalEarnings = parseFloat(user.total_earnings) || 0;
        const registrationRate = stats.referrals.total > 0 ? 
            Math.round((stats.referrals.registered / stats.referrals.total) * 100) : 0;

        return `📊 **Detailed Referral Statistics**

**👥 Referral Overview:**
• **Total Referred:** ${stats.referrals.total}
• **Successfully Registered:** ${stats.referrals.registered}
• **Currently Active:** ${stats.referrals.active}
• **Registration Rate:** ${registrationRate}%

**💰 Earnings Breakdown:**
• **Total Earned:** ${formatNumber(totalEarnings)} USDT
• **Average per Referral:** ${formatNumber(stats.referrals.active > 0 ? totalEarnings / stats.referrals.active : 0)} USDT
• **Commission Payments:** ${stats.commissions.payments}
• **Paid Payments:** ${stats.commissions.paid_payments}

**📈 Performance Metrics:**
• **Best Month:** Calculate based on data
• **Conversion Rate:** ${registrationRate}%
• **Active Referral Ratio:** ${Math.round((stats.referrals.active / Math.max(stats.referrals.total, 1)) * 100)}%

**🎯 Growth Potential:**
• **Current Level:** ${this.getReferralLevel(stats.referrals.total)}
• **Next Milestone:** ${this.getNextMilestone(stats.referrals.total)} referrals
• **Projected Monthly:** Based on current rate

Keep building your network! 🚀`;
    }

    getStatsKeyboard() {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('👥 View Referrals', 'action_my_referrals'),
                Markup.button.callback('💰 Earnings History', 'action_referral_earnings')
            ],
            [
                Markup.button.callback('🔄 Refresh Stats', 'action_referral_stats'),
                Markup.button.callback('📈 Growth Tips', 'action_referral_tips')
            ],
            [
                Markup.button.callback('🔙 Back', 'action_referrals')
            ]
        ]);
    }

    async showHistory(ctx, page = 1) {
        try {
            const telegramId = ctx.from.id.toString();
            const user = await this.userService.getUserByTelegramId(telegramId);
            
            if (!user) {
                await ctx.answerCbQuery('❌ User not found');
                return;
            }

            const limit = 10;
            const offset = (page - 1) * limit;
            const referrals = await this.userService.getUserReferrals(telegramId, limit, offset);

            let message = `👥 **Your Referrals** (Page ${page})\n\n`;

            if (referrals.length === 0) {
                message += '📭 No referrals yet.\n\nStart sharing your referral code to build your network!';
            } else {
                referrals.forEach((referral, index) => {
                    const status = referral.is_registered ? '💎' : '⭐';
                    const planInfo = referral.is_registered ? ` • Plan ${referral.plan_id}` : '';
                    const earnings = parseFloat(referral.total_commission) || 0;
                    const joinDate = formatDate(referral.created_at, true);
                    
                    message += `${status} **${referral.first_name}**\n`;
                    message += `   @${referral.username || 'no_username'}${planInfo}\n`;
                    message += `   Joined: ${joinDate} • Earned: ${formatNumber(earnings)} USDT\n\n`;
                });

                message += `**Total:** ${user.total_referrals} referrals`;
            }

            const keyboard = this.getHistoryKeyboard(page, referrals.length === limit);

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();

        } catch (error) {
            console.error('❌ Show referral history error:', error);
            await ctx.answerCbQuery('❌ Failed to load referral history');
        }
    }

    getHistoryKeyboard(page, hasMore) {
        const keyboard = [];
        
        // Pagination
        const navRow = [];
        if (page > 1) {
            navRow.push(Markup.button.callback('⬅️ Previous', `page_referrals_${page - 1}`));
        }
        if (hasMore) {
            navRow.push(Markup.button.callback('➡️ Next', `page_referrals_${page + 1}`));
        }
        if (navRow.length > 0) {
            keyboard.push(navRow);
        }

        keyboard.push([
            Markup.button.callback('📊 Referral Stats', 'action_referral_stats'),
            Markup.button.callback('🔗 Share Code', 'action_share_referral')
        ]);

        keyboard.push([
            Markup.button.callback('🔙 Back', 'action_referrals')
        ]);

        return Markup.inlineKeyboard(keyboard);
    }

    async showPage(ctx, page) {
        await this.showHistory(ctx, page);
    }

    // Helper methods
    getReferralLevel(totalReferrals) {
        if (totalReferrals < 5) return 'Starter';
        if (totalReferrals < 15) return 'Bronze';
        if (totalReferrals < 30) return 'Silver';
        if (totalReferrals < 50) return 'Gold';
        if (totalReferrals < 100) return 'Platinum';
        return 'Diamond';
    }

    getNextMilestone(totalReferrals) {
        const milestones = [5, 15, 30, 50, 100, 200];
        return milestones.find(milestone => milestone > totalReferrals) || totalReferrals + 100;
    }
}

// Help Handler Class
class HelpHandler {
    constructor() {
        this.faqData = this.initializeFAQ();
    }

    async handle(ctx) {
        try {
            const helpMessage = this.buildHelpMessage();
            const keyboard = this.getHelpKeyboard();

            if (ctx.callbackQuery) {
                await ctx.editMessageText(helpMessage, {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
                await ctx.answerCbQuery();
            } else {
                await ctx.reply(helpMessage, {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
            }

        } catch (error) {
            console.error('❌ Help handler error:', error);
            await ctx.reply('❌ Failed to load help information.');
        }
    }

    buildHelpMessage() {
        return `❓ **Help & Support**

Welcome to Crypto Membership NFT Bot! Here's how to get started:

**🚀 Quick Start:**
1. Use /start to create your account
2. Use /wallet to connect your BSC wallet
3. Use /register to join a membership plan
4. Share your referral code to earn!

**📋 Available Commands:**
• /start - Start your journey
• /profile - View your profile
• /plans - See membership plans
• /register - Register for membership
• /upgrade - Upgrade your plan
• /wallet - Manage your wallet
• /referral - View referral info
• /help - This help menu

**💡 Need specific help?**
Choose a topic below for detailed information:`;
    }

    getHelpKeyboard() {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🚀 Getting Started', 'help_getting_started'),
                Markup.button.callback('💳 Wallet Setup', 'help_wallet_setup')
            ],
            [
                Markup.button.callback('💎 Registration', 'help_registration'),
                Markup.button.callback('👥 Referral System', 'help_referrals')
            ],
            [
                Markup.button.callback('📋 Membership Plans', 'help_plans'),
                Markup.button.callback('⬆️ Plan Upgrades', 'help_upgrades')
            ],
            [
                Markup.button.callback('💰 Earnings & Payments', 'help_earnings'),
                Markup.button.callback('🔒 Security', 'help_security')
            ],
            [
                Markup.button.callback('❓ FAQ', 'help_faq'),
                Markup.button.callback('🆘 Contact Support', 'help_contact_support')
            ],
            [
                Markup.button.callback('🏠 Main Menu', 'action_back_main')
            ]
        ]);
    }

    async showGettingStarted(ctx) {
        const message = `🚀 **Getting Started Guide**

**Step 1: Create Account**
• Send /start to create your account
• You'll get a unique referral code
• No personal information required!

**Step 2: Connect Wallet**
• Use /wallet to connect your BSC wallet
• Supported: MetaMask, Trust Wallet, etc.
• You'll need USDT and BNB

**Step 3: Choose Plan**
• Use /plans to see all membership levels
• Start with Plan 1 ($10 USDT)
• Each plan has different commission rates

**Step 4: Register**
• Use /register to join your chosen plan
• Pay membership fee in USDT
• Receive your NFT membership token

**Step 5: Start Earning**
• Share your referral code with friends
• Earn instant commissions when they join
• Upgrade to higher plans for better rates!

**💡 Pro Tips:**
• Start with a plan you're comfortable with
• Build your network gradually
• Reinvest earnings to upgrade
• Stay active in the community

Ready to begin? Use /start! 🎉`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('💳 Wallet Help', 'help_wallet_setup'),
                Markup.button.callback('📋 View Plans', 'action_view_plans')
            ],
            [
                Markup.button.callback('🔙 Back to Help', 'action_help')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
        await ctx.answerCbQuery();
    }

    initializeFAQ() {
        return {
            categories: {
                'getting_started': {
                    title: 'Getting Started',
                    questions: [
                        {
                            q: 'How do I start?',
                            a: 'Use /start to create your account and get your referral code.'
                        }
                    ]
                }
            }
        };
    }
}

module.exports = ReferralHandler;