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