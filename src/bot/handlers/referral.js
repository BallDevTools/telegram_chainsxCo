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

module.exports = ReferralHandler;

// src/bot/handlers/help.js
const { Markup } = require('telegraf');

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

    async showWalletSetup(ctx) {
        const message = `💳 **Wallet Setup Guide**

**🎯 What you need:**
• BSC-compatible wallet (MetaMask recommended)
• USDT tokens for membership fees
• Small amount of BNB for gas fees

**📱 MetaMask Setup:**
1. Download MetaMask app or extension
2. Create new wallet or import existing
3. Add BSC network to MetaMask
4. Transfer USDT and BNB to wallet

**🌐 BSC Network Settings:**
• **Network Name:** Smart Chain
• **RPC URL:** https://bsc-dataseed.binance.org/
• **Chain ID:** 56
• **Symbol:** BNB
• **Explorer:** https://bscscan.com

**💰 Getting Tokens:**
• Buy USDT on Binance, send to BSC network
• Get BNB for gas fees (~$2 worth)
• Keep both in same wallet

**🔒 Security Tips:**
• Never share your private keys
• Use hardware wallet for large amounts
• Always verify transaction details
• Keep seed phrase safe and offline

**✅ Connection:**
• Use /wallet command in bot
• Send your wallet address (0x...)
• Confirm connection
• Ready to register!

Need more help? Contact support! 🆘`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('💳 Connect Wallet', 'action_connect_wallet'),
                Markup.button.callback('💰 Get USDT Guide', 'help_get_usdt')
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

    async showFAQ(ctx) {
        const message = `❓ **Frequently Asked Questions**

**Q: Is this a scam or pyramid scheme?**
A: No! This is a legitimate membership program with real NFT tokens on BSC blockchain. All transactions are transparent and verifiable.

**Q: How much can I earn?**
A: Earnings depend on your referrals and plan level. Commission rates range from 30-36% of plan prices.

**Q: What if I don't have referrals?**
A: You can still participate! Focus on upgrading your plan level and building your network gradually.

**Q: Can I withdraw my membership fee?**
A: No, membership fees are non-refundable. However, you earn through referrals and can upgrade.

**Q: Is my wallet safe?**
A: Yes! We only store your wallet address, never private keys. You control your funds.

**Q: What blockchain is used?**
A: Binance Smart Chain (BSC) for low fees and fast transactions.

**Q: Can I change my wallet?**
A: Yes, but only before registering. Contact support if you need help.

**Q: How long do transactions take?**
A: Usually 1-3 minutes on BSC network, depending on network congestion.

**Q: What if my transaction fails?**
A: Check your USDT balance and gas fees. Contact support if issues persist.

Still have questions? Contact our support team! 🆘`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🆘 Contact Support', 'help_contact_support'),
                Markup.button.callback('🔒 Security Info', 'help_security')
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

    async showContactSupport(ctx) {
        const message = `🆘 **Contact Support**

Need help? Our support team is here to assist you!

**📧 Support Channels:**
• **Telegram:** @SupportUsername
• **Email:** support@example.com
• **Hours:** 9 AM - 6 PM UTC

**🚨 For urgent issues:**
• Stuck transactions
• Wallet connection problems
• Missing payments
• Technical errors

**💬 Before contacting support:**
• Check your wallet balance
• Verify network connection  
• Review transaction history
• Try refreshing the bot (/start)

**📋 Information to include:**
• Your Telegram username
• Description of the problem
• Transaction hash (if applicable)
• Screenshots (if helpful)

**⚠️ Security Reminder:**
• Never share private keys
• Support will never ask for passwords
• Always verify official support contacts

**💡 Common Solutions:**
• Restart the bot with /start
• Check BSC network status
• Ensure sufficient gas fees
• Wait for network confirmation

We're here to help! 💪`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('📧 Send Message', 'action_send_support_message'),
                Markup.button.callback('❓ FAQ', 'help_faq')
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
        
        // Set conversation state for support message
        ctx.session.step = 'waiting_support_message';
    }

    async handleSupportMessage(ctx, message) {
        try {
            const user = ctx.session.user;
            const supportMessage = `🆘 **New Support Request**

**From:** ${user.first_name} (@${user.username || 'no_username'})
**User ID:** ${user.telegram_id}
**Message:** ${message}
**Time:** ${new Date().toISOString()}

Please respond to this user promptly! 💬`;

            // Send to admin/support (if configured)
            if (process.env.ADMIN_USER_ID) {
                await ctx.telegram.sendMessage(process.env.ADMIN_USER_ID, supportMessage);
            }

            // Confirm to user
            const confirmMessage = `✅ **Support Message Sent!**

Your message has been forwarded to our support team.

**What happens next:**
• Support team will review your message
• You'll receive a response within 24 hours
• Check back here for updates

**Your Message:**
"${message}"

**Reference ID:** ${Date.now()}

Thank you for your patience! 🙏`;

            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('🔙 Back to Help', 'action_help'),
                    Markup.button.callback('🏠 Main Menu', 'action_back_main')
                ]
            ]);

            await ctx.reply(confirmMessage, {
                parse_mode: 'Markdown',
                ...keyboard
            });

            // Clear session step
            ctx.session.step = null;

        } catch (error) {
            console.error('❌ Handle support message error:', error);
            await ctx.reply('❌ Failed to send support message. Please try again.');
        }
    }

    initializeFAQ() {
        return {
            // FAQ data structure for future expansion
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

module.exports = HelpHandler;

// src/bot/handlers/upgrade.js
const { Markup } = require('telegraf');
const UserService = require('../../services/UserService');
const BlockchainService = require('../../services/BlockchainService');
const { formatNumber } = require('../../utils/formatting');

class UpgradeHandler {
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

            if (!user.is_registered) {
                await this.showNotRegistered(ctx);
                return;
            }

            if (user.plan_id >= 16) {
                await this.showMaxLevel(ctx, user);
                return;
            }

            await this.showUpgradeOptions(ctx, user);

        } catch (error) {
            console.error('❌ Upgrade handler error:', error);
            await ctx.reply('❌ Failed to load upgrade options.');
        }
    }

    async showNotRegistered(ctx) {
        const message = `⚠️ **Registration Required**

You need to register for a membership plan before you can upgrade.

**🚀 Get started:**
• Choose a membership plan
• Connect your BSC wallet
• Complete registration
• Then you can upgrade to higher levels!

Ready to begin? 💪`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🚀 Register Now', 'action_get_started'),
                Markup.button.callback('📋 View Plans', 'action_view_plans')
            ],
            [
                Markup.button.callback('🏠 Main Menu', 'action_back_main')
            ]
        ]);

        if (ctx.callbackQuery) {
            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();
        } else {
            await ctx.reply(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        }
    }

    async showMaxLevel(ctx, user) {
        const planName = this.getPlanName(user.plan_id);
        
        const message = `🏆 **Maximum Level Reached!**

Congratulations! You've reached the highest membership level!

**👑 Your Current Status:**
• **Plan:** ${planName} (Level ${user.plan_id})
• **Commission Rate:** 36%
• **Status:** Elite Member

**🎉 Elite Benefits:**
• Highest commission rate (36%)
• Maximum earning potential
• Exclusive elite community access
• Priority support
• Special recognition

**💪 Keep Growing:**
• Focus on building your referral network
• Help your referrals upgrade their levels
• Maximize your earning potential
• Enjoy your elite status!

You're at the top! Keep building your empire! 👑`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('👥 Build Network', 'action_referrals'),
                Markup.button.callback('💰 Check Earnings', 'action_earnings')
            ],
            [
                Markup.button.callback('👤 View Profile', 'action_profile'),
                Markup.button.callback('🏠 Main Menu', 'action_back_main')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
        await ctx.answerCbQuery();
    }

    async showUpgradeOptions(ctx, user) {
        try {
            const currentPlan = await this.blockchainService.getPlanInfo(user.plan_id);
            const nextPlan = await this.blockchainService.getPlanInfo(user.plan_id + 1);
            
            if (!currentPlan || !nextPlan) {
                await ctx.reply('❌ Unable to load plan information.');
                return;
            }

            const currentPrice = parseFloat(currentPlan.priceFormatted);
            const nextPrice = parseFloat(nextPlan.priceFormatted);
            const upgradeCost = nextPrice - currentPrice;
            
            const message = `⬆️ **Plan Upgrade Available**

**📊 Current Membership:**
• **Plan:** ${currentPlan.name} (Level ${user.plan_id})
• **Price Paid:** ${formatNumber(currentPrice)} USDT
• **Commission Rate:** ${this.getCommissionRate(user.plan_id)}%

**🚀 Upgrade to:**
• **Plan:** ${nextPlan.name} (Level ${user.plan_id + 1})
• **Total Price:** ${formatNumber(nextPrice)} USDT
• **Upgrade Cost:** ${formatNumber(upgradeCost)} USDT
• **New Commission Rate:** ${this.getCommissionRate(user.plan_id + 1)}%

**💰 Upgrade Benefits:**
• Higher commission rate on all referrals
• Increased earning potential
• Access to premium features
• Enhanced membership status

**📈 ROI Calculation:**
• Need ${Math.ceil(upgradeCost / (nextPrice * this.getCommissionRate(user.plan_id + 1) / 100))} referrals to break even
• Every additional referral = ${formatNumber(nextPrice * this.getCommissionRate(user.plan_id + 1) / 100)} USDT profit

Ready to upgrade? 🎯`;

            const keyboard = this.getUpgradeKeyboard(user.plan_id, upgradeCost);

            if (ctx.callbackQuery) {
                await ctx.editMessageText(message, {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
                await ctx.answerCbQuery();
            } else {
                await ctx.reply(message, {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
            }

        } catch (error) {
            console.error('❌ Show upgrade options error:', error);
            await ctx.reply('❌ Failed to load upgrade information.');
        }
    }

    getUpgradeKeyboard(currentPlanId, upgradeCost) {
        const nextPlanId = currentPlanId + 1;
        
        return Markup.inlineKeyboard([
            [
                Markup.button.callback(`⬆️ Upgrade Now (${formatNumber(upgradeCost)})`, `upgrade_${nextPlanId}`),
                Markup.button.callback('💳 Check Balance', 'action_wallet_info')
            ],
            [
                Markup.button.callback('📊 Compare Plans', 'action_plan_comparison'),
                Markup.button.callback('💡 Upgrade Benefits', 'action_upgrade_benefits')
            ],
            [
                Markup.button.callback('🔙 Back to Profile', 'action_profile'),
                Markup.button.callback('🏠 Main Menu', 'action_back_main')
            ]
        ]);
    }

    async selectPlan(ctx, planId) {
        try {
            const telegramId = ctx.from.id.toString();
            const user = await this.userService.getUserByTelegramId(telegramId);
            
            if (!user || !user.is_registered) {
                await ctx.answerCbQuery('❌ Must be registered to upgrade');
                return;
            }

            if (planId !== user.plan_id + 1) {
                await ctx.answerCbQuery('❌ Can only upgrade to next level');
                return;
            }

            await this.showUpgradeConfirmation(ctx, user, planId);

        } catch (error) {
            console.error('❌ Select upgrade plan error:', error);
            await ctx.answerCbQuery('❌ Failed to select plan');
        }
    }

    async showUpgradeConfirmation(ctx, user, newPlanId) {
        try {
            if (!user.wallet_address) {
                await this.showWalletRequired(ctx);
                return;
            }

            const currentPlan = await this.blockchainService.getPlanInfo(user.plan_id);
            const newPlan = await this.blockchainService.getPlanInfo(newPlanId);
            
            if (!currentPlan || !newPlan) {
                await ctx.answerCbQuery('❌ Plan information not available');
                return;
            }

            const currentPrice = parseFloat(currentPlan.priceFormatted);
            const newPrice = parseFloat(newPlan.priceFormatted);
            const upgradeCost = newPrice - currentPrice;

            const message = `✅ **Confirm Plan Upgrade**

**📋 Upgrade Details:**
• **From:** ${currentPlan.name} (Level ${user.plan_id})
• **To:** ${newPlan.name} (Level ${newPlanId})
• **Upgrade Cost:** ${formatNumber(upgradeCost)} USDT
• **Your Wallet:** \`${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}\`

**💰 Transaction Breakdown:**
• **Amount:** ${formatNumber(upgradeCost)} USDT
• **Gas Fee:** ~0.001 BNB (additional)
• **New Commission Rate:** ${this.getCommissionRate(newPlanId)}%

**⚠️ Requirements Check:**
${await this.checkUpgradeRequirements(user, upgradeCost)}

**🔄 What happens next:**
1. You confirm this upgrade
2. Approve USDT spending (if needed)
3. Complete the blockchain transaction
4. Your plan level increases immediately
5. Start earning higher commissions!

**📱 Make sure your wallet app is ready!**

Proceed with upgrade? 🚀`;

            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Confirm Upgrade', `confirm_upgrade_${newPlanId}`),
                    Markup.button.callback('❌ Cancel', 'action_upgrade')
                ],
                [
                    Markup.button.callback('💳 Check Balance', 'action_check_balance'),
                    Markup.button.callback('🔄 Refresh Info', `upgrade_${newPlanId}`)
                ],
                [
                    Markup.button.callback('❓ Need Help?', 'action_upgrade_help')
                ]
            ]);

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();

        } catch (error) {
            console.error('❌ Show upgrade confirmation error:', error);
            await ctx.answerCbQuery('❌ Failed to show confirmation');
        }
    }

    async confirmUpgrade(ctx, planId) {
        try {
            const telegramId = ctx.from.id.toString();
            const user = await this.userService.getUserByTelegramId(telegramId);
            
            if (!user || !user.is_registered) {
                await ctx.answerCbQuery('❌ Invalid user state');
                return;
            }

            if (planId !== user.plan_id + 1) {
                await ctx.answerCbQuery('❌ Invalid upgrade path');
                return;
            }

            if (!user.wallet_address) {
                await ctx.answerCbQuery('❌ Wallet not connected');
                return;
            }

            // Start upgrade process
            await this.processUpgrade(ctx, user, planId);

        } catch (error) {
            console.error('❌ Confirm upgrade error:', error);
            await ctx.answerCbQuery('❌ Upgrade failed');
        }
    }

    async processUpgrade(ctx, user, planId) {
        try {
            await ctx.answerCbQuery('🔄 Processing upgrade...');

            const processingMessage = `🔄 **Processing Your Upgrade...**

**⏳ Please wait while we:**
1. Verify your wallet balance
2. Calculate upgrade cost
3. Prepare the smart contract transaction
4. Check network conditions

**📱 Your wallet may prompt you to:**
• Approve additional USDT spending
• Confirm the upgrade transaction
• Pay gas fees

**⚠️ Important:**
• Keep this chat open
• Don't close your wallet app
• Wait for confirmation

Processing upgrade... 🔄`;

            await ctx.editMessageText(processingMessage, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '❌ Cancel', callback_data: 'action_cancel' }
                    ]]
                }
            });

            // Create user wallet object
            const userWallet = {
                address: user.wallet_address
            };

            // Attempt blockchain upgrade
            const result = await this.blockchainService.upgradePlan(planId, userWallet);

            if (result.success) {
                await this.showUpgradeSuccess(ctx, result, planId);
            } else if (result.requiresApproval) {
                await this.showApprovalRequired(ctx, result, planId);
            } else {
                await this.showUpgradeError(ctx, result.error);
            }

        } catch (error) {
            console.error('❌ Process upgrade error:', error);
            await this.showUpgradeError(ctx, error.message);
        }
    }

    async showUpgradeSuccess(ctx, result, planId) {
        const newPlan = await this.blockchainService.getPlanInfo(planId);
        const newCommissionRate = this.getCommissionRate(planId);

        const message = `🎉 **Upgrade Successful!**

**✅ Transaction Submitted Successfully!**

**📋 Upgrade Details:**
• **New Plan:** ${newPlan.name} (Level ${planId})
• **New Commission Rate:** ${newCommissionRate}%
• **Transaction Hash:** \`${result.txHash}\`
• **Status:** Pending Confirmation ⏳

**⏳ What's happening now:**
1. Transaction is being confirmed on BSC network
2. Your membership level will update automatically
3. New commission rate takes effect immediately
4. You'll be notified when complete

**🎯 Your Benefits:**
• Higher commissions on all future referrals
• Enhanced membership status
• Access to premium features

**💪 Start earning more with your upgraded plan!**

We'll notify you when your upgrade is fully confirmed! 🚀`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('👥 Share Referral Code', 'action_share_referral'),
                Markup.button.callback('📊 Check Status', 'action_check_tx_status')
            ],
            [
                Markup.button.callback('👤 View Profile', 'action_profile'),
                Markup.button.callback('💰 Earnings Potential', 'action_earnings_potential')
            ],
            [
                Markup.button.callback('🏠 Main Menu', 'action_back_main')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });

        // Save pending upgrade
        await this.savePendingUpgrade(ctx.from.id.toString(), planId, result.txHash);
    }

    async showApprovalRequired(ctx, result, planId) {
        const newPlan = await this.blockchainService.getPlanInfo(planId);
        const currentPlan = await this.blockchainService.getPlanInfo(planId - 1);
        const upgradeCost = parseFloat(newPlan.priceFormatted) - parseFloat(currentPlan.priceFormatted);

        const message = `💳 **USDT Approval Required**

**⚠️ Before upgrading, you need to approve additional USDT spending.**

**📋 Approval Details:**
• **Additional Amount:** ${formatNumber(upgradeCost)} USDT
• **Spender:** NFT Contract
• **Purpose:** Plan upgrade payment

**📱 Steps to approve:**
1. Open your wallet app
2. Go to the USDT token
3. Approve spending for the upgrade amount
4. Return here and try upgrade again

**🔗 Contract Address:**
\`${process.env.NFT_CONTRACT_ADDRESS}\`

**💡 This approves only the upgrade amount.**

Once approved, return here to complete your upgrade! 🚀`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ I Approved, Try Again', `confirm_upgrade_${planId}`),
                Markup.button.callback('❓ How to Approve?', 'action_approval_help')
            ],
            [
                Markup.button.callback('🔄 Check Approval Status', 'action_check_approval'),
                Markup.button.callback('❌ Cancel', 'action_upgrade')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }

    async showUpgradeError(ctx, error) {
        const message = `❌ **Upgrade Failed**

**😔 Something went wrong with your upgrade.**

**Error:** ${error}

**🔧 Possible solutions:**
• Check your USDT balance for upgrade cost
• Ensure sufficient BNB for gas fees
• Verify wallet connection is active
• Check network connection stability
• Try again in a few minutes

**💡 Common issues:**
• Insufficient USDT for upgrade
• Need to approve USDT spending first
• Network congestion (try later)
• Wallet disconnected during process

**🔄 Next steps:**
• Verify your balances
• Try the upgrade again
• Contact support if issues persist

Don't worry, no funds were lost! 💪`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🔄 Try Again', 'action_upgrade'),
                Markup.button.callback('💳 Check Wallet', 'action_wallet_info')
            ],
            [
                Markup.button.callback('❓ Get Help', 'action_upgrade_help'),
                Markup.button.callback('🔙 Back', 'action_back_main')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }

    async showWalletRequired(ctx) {
        const message = `💳 **Wallet Required for Upgrade**

**⚠️ You need a connected wallet to upgrade your plan.**

**🔗 To upgrade:**
1. Connect your BSC wallet using /wallet
2. Ensure sufficient USDT for upgrade cost
3. Have BNB for gas fees
4. Return here to upgrade

**💰 For upgrades you'll need:**
• USDT for the upgrade cost difference
• Small amount of BNB for transaction fees
• Same wallet used for registration

**Ready to connect your wallet?** 🚀`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('💳 Connect Wallet', 'action_connect_wallet'),
                Markup.button.callback('❓ Wallet Help', 'action_wallet_setup_help')
            ],
            [
                Markup.button.callback('🔙 Back', 'action_upgrade')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }

    // Helper methods
    async checkUpgradeRequirements(user, upgradeCost) {
        let requirements = '';
        
        try {
            if (user.wallet_address) {
                requirements += '✅ Wallet connected\n';
                
                // Check USDT balance
                const balance = await this.blockchainService.usdtContract.balanceOf(user.wallet_address);
                const requiredAmount = this.blockchainService.parseTokenAmount(upgradeCost.toString());
                
                if (balance >= requiredAmount) {
                    requirements += '✅ Sufficient USDT balance\n';
                } else {
                    const shortfall = this.blockchainService.formatTokenAmount((requiredAmount - balance).toString());
                    requirements += `❌ Need ${shortfall} more USDT\n`;
                }
                
                // Check BNB for gas
                const bnbBalance = await this.blockchainService.provider.getBalance(user.wallet_address);
                if (bnbBalance > BigInt('1000000000000000')) { // 0.001 BNB
                    requirements += '✅ Sufficient BNB for gas\n';
                } else {
                    requirements += '❌ Need BNB for gas fees\n';
                }
            } else {
                requirements += '❌ Wallet not connected\n';
            }
        } catch (error) {
            requirements = '⚠️ Unable to check requirements\n';
        }
        
        return requirements;
    }

    async savePendingUpgrade(telegramId, planId, txHash) {
        try {
            console.log(`📝 Pending upgrade saved: ${telegramId} - Plan ${planId} - ${txHash}`);
        } catch (error) {
            console.error('❌ Error saving pending upgrade:', error);
        }
    }

    getCommissionRate(planId) {
        if (planId <= 4) return 30;
        if (planId <= 8) return 33;
        if (planId <= 12) return 35;
        return 36;
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
}

module.exports = UpgradeHandler;