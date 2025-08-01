const { Markup } = require('telegraf');
const UserService = require('../../services/UserService');
const { generateReferralCode } = require('../../utils/referralCodes');

class StartHandler {
    constructor() {
        this.userService = new UserService();
    }

    async handle(ctx) {
        try {
            const telegramId = ctx.from.id.toString();
            const username = ctx.from.username;
            const firstName = ctx.from.first_name;
            const lastName = ctx.from.last_name;
            const languageCode = ctx.from.language_code || 'en';
            
            // Extract referral code from command
            const referralCode = this.extractReferralCode(ctx.message.text);
            
            // Check if user already exists
            let user = await this.userService.getUserByTelegramId(telegramId);
            
            if (user) {
                // Existing user
                await this.handleExistingUser(ctx, user);
            } else {
                // New user
                await this.handleNewUser(ctx, {
                    telegramId,
                    username,
                    firstName,
                    lastName,
                    languageCode,
                    referralCode
                });
            }
            
        } catch (error) {
            console.error('❌ Start handler error:', error);
            await ctx.reply('❌ Something went wrong. Please try again later.');
        }
    }

    extractReferralCode(messageText) {
        // Extract referral code from /start command
        // Format: /start REF_CODE or /start
        const parts = messageText.split(' ');
        return parts.length > 1 ? parts[1] : null;
    }

    async handleNewUser(ctx, userData) {
        try {
            // Generate unique referral code
            const referralCode = await this.generateUniqueReferralCode();
            
            // Find upline user if referral code provided
            let uplineUser = null;
            if (userData.referralCode) {
                uplineUser = await this.userService.getUserByReferralCode(userData.referralCode);
                if (!uplineUser) {
                    await ctx.reply('⚠️ Invalid referral code. Continuing without referral.');
                }
            }
            
            // Create new user
            const newUser = await this.userService.createUser({
                telegramId: userData.telegramId,
                username: userData.username,
                firstName: userData.firstName,
                lastName: userData.lastName,
                languageCode: userData.languageCode,
                referralCode: referralCode,
                uplineId: uplineUser ? uplineUser.id : null
            });
            
            // Welcome message for new user
            const welcomeMessage = this.getWelcomeMessage(newUser, uplineUser);
            const keyboard = this.getMainKeyboard(newUser);
            
            await ctx.reply(welcomeMessage, keyboard);
            
            // Send referral notification to upline
            if (uplineUser) {
                await this.notifyUplineOfNewReferral(ctx, uplineUser, newUser);
            }
            
        } catch (error) {
            console.error('❌ Error handling new user:', error);
            await ctx.reply('❌ Failed to create your account. Please try again.');
        }
    }

    async handleExistingUser(ctx, user) {
        try {
            // Update last activity
            await this.userService.updateLastActivity(user.telegram_id);
            
            // Welcome back message
            const welcomeMessage = this.getWelcomeBackMessage(user);
            const keyboard = this.getMainKeyboard(user);
            
            await ctx.reply(welcomeMessage, keyboard);
            
        } catch (error) {
            console.error('❌ Error handling existing user:', error);
            await ctx.reply('❌ Something went wrong. Please try again.');
        }
    }

    async generateUniqueReferralCode() {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const code = generateReferralCode();
            const existing = await this.userService.getUserByReferralCode(code);
            
            if (!existing) {
                return code;
            }
            
            attempts++;
        }
        
        throw new Error('Failed to generate unique referral code');
    }

    getWelcomeMessage(user, uplineUser) {
        const uplineInfo = uplineUser ? 
            `\n🔗 Referred by: @${uplineUser.username || uplineUser.first_name}` : '';
        
        return `
🎉 **Welcome to Crypto Membership NFT!**

👋 Hello ${user.first_name}! You've successfully joined our exclusive membership program.

✨ **What you can do:**
• 📋 View available membership plans
• 💎 Register for your first NFT membership
• 👥 Refer friends and earn commissions
• 📊 Track your earnings and progress

🎯 **Your Referral Code:** \`${user.referral_code}\`
Share this code with friends to earn rewards!${uplineInfo}

🚀 **Ready to get started?** Choose an option below:
        `.trim();
    }

    getWelcomeBackMessage(user) {
        const statusEmoji = user.is_registered ? '💎' : '⭐';
        const statusText = user.is_registered ? 
            `Plan ${user.plan_id} Member` : 'Not Registered';
        
        return `
${statusEmoji} **Welcome back, ${user.first_name}!**

📊 **Your Status:** ${statusText}
🎯 **Your Referral Code:** \`${user.referral_code}\`
👥 **Total Referrals:** ${user.total_referrals}
💰 **Total Earnings:** ${parseFloat(user.total_earnings).toFixed(2)} USDT

Choose what you'd like to do:
        `.trim();
    }

    getMainKeyboard(user) {
        const keyboard = [];
        
        if (!user.is_registered) {
            keyboard.push(
                [Markup.button.callback('🚀 Get Started', 'action_get_started')],
                [Markup.button.callback('📋 View Plans', 'action_view_plans')]
            );
        } else {
            keyboard.push(
                [Markup.button.callback('👤 My Profile', 'action_profile')],
                [Markup.button.callback('⬆️ Upgrade Plan', 'action_upgrade')]
            );
        }
        
        keyboard.push(
            [
                Markup.button.callback('👥 Referrals', 'action_referrals'),
                Markup.button.callback('💰 Earnings', 'action_earnings')
            ],
            [
                Markup.button.callback('📊 Statistics', 'action_stats'),
                Markup.button.callback('❓ Help', 'action_help')
            ]
        );
        
        return Markup.inlineKeyboard(keyboard);
    }

    async notifyUplineOfNewReferral(ctx, uplineUser, newUser) {
        try {
            const message = `
🎉 **New Referral!**

👤 **${newUser.first_name}** (@${newUser.username || 'no_username'}) just joined using your referral code!

💰 You'll earn commission when they register for a membership plan.

🎯 Keep sharing your referral code: \`${uplineUser.referral_code}\`
            `.trim();
            
            await ctx.telegram.sendMessage(uplineUser.telegram_id, message, {
                parse_mode: 'Markdown'
            });
            
        } catch (error) {
            // Don't throw error if we can't notify upline
            console.error('❌ Failed to notify upline:', error);
        }
    }
}

module.exports = StartHandler;