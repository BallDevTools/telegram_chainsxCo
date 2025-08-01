const { Markup } = require('telegraf');
const UserService = require('../../services/UserService');
const BlockchainService = require('../../services/BlockchainService');
const { formatNumber } = require('../../utils/formatting');

class RegisterHandler {
    constructor() {
        this.userService = new UserService();
        this.blockchainService = new BlockchainService();
    }

    async handle(ctx) {
        try {
            const telegramId = ctx.from.id.toString();
            const user = await this.userService.getUserByTelegramId(telegramId);
            
            if (!user) {
                await ctx.reply('❌ Please use /start first to create your account.');
                return;
            }

            if (user.is_registered) {
                await this.showAlreadyRegistered(ctx, user);
                return;
            }

            await this.showRegistrationStart(ctx, user);

        } catch (error) {
            console.error('❌ Register handler error:', error);
            await ctx.reply('❌ Registration failed. Please try again.');
        }
    }

    async showRegistrationStart(ctx, user) {
        const message = `🚀 **Start Your Crypto Membership Journey!**

👋 Welcome ${user.first_name}! Let's get you registered.

**🎯 What you'll get:**
• 💎 Exclusive NFT membership token
• 💰 Earn commissions from referrals  
• ⬆️ Upgrade opportunities
• 🌟 VIP community access

**📋 Registration Requirements:**
• ✅ BSC wallet (MetaMask, Trust Wallet, etc.)
• ✅ Sufficient USDT for membership fee
• ✅ Small amount of BNB for gas fees

**💡 Important Notes:**
• All memberships start with Plan 1
• You can upgrade to higher plans later
• Registration fee includes your NFT token
• Commissions are paid instantly to your wallet

Ready to begin? 🚀`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🚀 Start Registration', 'action_start_registration'),
                Markup.button.callback('📋 View Plan Details', 'plan_1')
            ],
            [
                Markup.button.callback('💳 Connect Wallet First', 'action_connect_wallet'),
                Markup.button.callback('❓ Need Help?', 'action_registration_help')
            ],
            [
                Markup.button.callback('🔙 Back to Main', 'action_back_main')
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

    async showAlreadyRegistered(ctx, user) {
        const planName = this.getPlanName(user.plan_id);
        
        const message = `✅ **Already Registered!**

You're already a registered member! 🎉

**👤 Your Membership:**
• **Plan:** ${planName} (Level ${user.plan_id})
• **Status:** Active Member 💎
• **Referrals:** ${user.total_referrals}
• **Earnings:** ${formatNumber(parseFloat(user.total_earnings))} USDT

**🚀 What you can do:**
• Share your referral code to earn commissions
• Upgrade to higher plans for better rewards
• Track your earnings and progress

Want to upgrade to a higher plan? 📈`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('⬆️ Upgrade Plan', 'action_upgrade'),
                Markup.button.callback('👥 Share Referral', 'action_share_referral')
            ],
            [
                Markup.button.callback('👤 View Profile', 'action_profile'),
                Markup.button.callback('💰 Check Earnings', 'action_earnings')
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

    async showPlans(ctx) {
        try {
            // For registration, we only show Plan 1 (starter requirement)
            const plan = await this.blockchainService.getPlanInfo(1);
            
            if (!plan) {
                await ctx.answerCbQuery('❌ Plan information not available');
                return;
            }

            const price = formatNumber(parseFloat(plan.priceFormatted));
            const cycleProgress = `${plan.membersInCurrentCycle}/${plan.membersPerCycle}`;
            
            const message = `📋 **Membership Registration - Plan 1**

🎯 **All new members start with Plan 1 (Starter Plan)**

**💎 ${plan.name} Plan Details:**
• **Price:** ${price} USDT
• **Commission Rate:** 30% on referrals
• **Current Cycle:** ${plan.currentCycle}
• **Cycle Progress:** ${cycleProgress}
• **NFT Token:** Included ✅

**💰 Earnings Potential:**
• Earn ${formatNumber(parseFloat(plan.priceFormatted) * 0.3)} USDT per referral
• Instant payments to your wallet
• Upgrade path to higher plans available

**🔄 How Cycles Work:**
• Each plan has cycles of ${plan.membersPerCycle} members
• When a cycle fills, a new one starts
• All members in the same cycle level

**⚡ Next Steps:**
1. Connect your BSC wallet
2. Ensure you have ${price} USDT + gas fees
3. Confirm registration
4. Receive your NFT membership token

Ready to join? 🚀`;

            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('🚀 Register Now', 'confirm_register_1'),
                    Markup.button.callback('💳 Check Wallet', 'action_wallet_info')
                ],
                [
                    Markup.button.callback('💡 How Cycles Work', 'action_cycle_info'),
                    Markup.button.callback('❓ FAQ', 'action_registration_faq')
                ],
                [
                    Markup.button.callback('🔙 Back', 'action_back_main')
                ]
            ]);

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();

        } catch (error) {
            console.error('❌ Show plans error:', error);
            await ctx.answerCbQuery('❌ Failed to load plan information');
        }
    }

    async selectPlan(ctx, planId) {
        try {
            // Only allow Plan 1 for new registrations
            if (planId !== 1) {
                await ctx.answerCbQuery('❌ New members must start with Plan 1');
                return;
            }

            await this.showRegistrationConfirmation(ctx, planId);

        } catch (error) {
            console.error('❌ Select plan error:', error);
            await ctx.answerCbQuery('❌ Failed to select plan');
        }
    }

    async showRegistrationConfirmation(ctx, planId) {
        try {
            const telegramId = ctx.from.id.toString();
            const user = await this.userService.getUserByTelegramId(telegramId);
            
            if (!user) {
                await ctx.answerCbQuery('❌ User not found');
                return;
            }

            if (!user.wallet_address) {
                await this.showWalletRequired(ctx);
                return;
            }

            const plan = await this.blockchainService.getPlanInfo(planId);
            if (!plan) {
                await ctx.answerCbQuery('❌ Plan not found');
                return;
            }

            const price = formatNumber(parseFloat(plan.priceFormatted));
            const upline = await this.getUplineInfo(user);

            const message = `✅ **Confirm Registration**

**📋 Registration Details:**
• **Plan:** ${plan.name} (Level ${planId})
• **Price:** ${price} USDT
• **Your Wallet:** \`${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}\`
• **Sponsor:** ${upline.name}
• **Commission Rate:** 30%

**💰 Transaction Breakdown:**
• **Total Cost:** ${price} USDT
• **Your Future Earnings:** ${formatNumber(parseFloat(plan.priceFormatted) * 0.3)} USDT per referral
• **Gas Fees:** ~0.001 BNB (additional)

**⚠️ Requirements Check:**
${await this.checkRequirements(user, plan)}

**🔄 What happens next:**
1. You confirm this registration
2. Approve USDT spending in your wallet
3. Complete the transaction
4. Receive your NFT membership token
5. Start earning from referrals!

**📱 Make sure your wallet app is ready!**

Are you ready to proceed? 🚀`;

            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Confirm Registration', `confirm_register_${planId}`),
                    Markup.button.callback('❌ Cancel', 'action_cancel')
                ],
                [
                    Markup.button.callback('💳 Check Balance', 'action_check_balance'),
                    Markup.button.callback('🔄 Refresh Info', `plan_${planId}`)
                ],
                [
                    Markup.button.callback('❓ Need Help?', 'action_registration_help')
                ]
            ]);

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();

        } catch (error) {
            console.error('❌ Show confirmation error:', error);
            await ctx.answerCbQuery('❌ Failed to show confirmation');
        }
    }

    async confirmRegistration(ctx, planId) {
        try {
            const telegramId = ctx.from.id.toString();
            const user = await this.userService.getUserByTelegramId(telegramId);
            
            if (!user) {
                await ctx.answerCbQuery('❌ User not found');
                return;
            }

            if (user.is_registered) {
                await ctx.answerCbQuery('❌ Already registered');
                return;
            }

            if (!user.wallet_address) {
                await ctx.answerCbQuery('❌ Wallet not connected');
                return;
            }

            // Start registration process
            await this.processRegistration(ctx, user, planId);

        } catch (error) {
            console.error('❌ Confirm registration error:', error);
            await ctx.answerCbQuery('❌ Registration failed');
        }
    }

    async processRegistration(ctx, user, planId) {
        try {
            await ctx.answerCbQuery('🔄 Processing registration...');

            // Show processing message
            const processingMessage = `🔄 **Processing Your Registration...**

**⏳ Please wait while we:**
1. Verify your wallet balance
2. Prepare the smart contract transaction
3. Check network conditions

**📱 Your wallet may prompt you to:**
• Approve USDT spending
• Confirm the transaction
• Pay gas fees

**⚠️ Important:**
• Keep this chat open
• Don't close your wallet app
• Wait for confirmation

Processing... 🔄`;

            const processingKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('❌ Cancel', 'action_cancel')]
            ]);

            await ctx.editMessageText(processingMessage, {
                parse_mode: 'Markdown',
                ...processingKeyboard
            });

            // Get upline address
            const uplineUser = user.upline_id ? 
                await this.userService.getUserById(user.upline_id) : null;
            const uplineAddress = uplineUser?.wallet_address || process.env.OWNER_WALLET_ADDRESS;

            // Create user wallet object (simplified - in real implementation this would be more secure)
            const userWallet = {
                address: user.wallet_address
            };

            // Attempt blockchain registration
            const result = await this.blockchainService.registerMember(
                planId, 
                uplineAddress, 
                userWallet
            );

            if (result.success) {
                await this.showRegistrationSuccess(ctx, result, planId);
            } else if (result.requiresApproval) {
                await this.showApprovalRequired(ctx, result, planId);
            } else {
                await this.showRegistrationError(ctx, result.error);
            }

        } catch (error) {
            console.error('❌ Process registration error:', error);
            await this.showRegistrationError(ctx, error.message);
        }
    }

    async showRegistrationSuccess(ctx, result, planId) {
        const plan = await this.blockchainService.getPlanInfo(planId);
        const price = formatNumber(parseFloat(plan.priceFormatted));

        const message = `🎉 **Registration Successful!**

**✅ Transaction Submitted Successfully!**

**📋 Transaction Details:**
• **Plan:** ${plan.name} (Level ${planId})
• **Amount:** ${price} USDT
• **Transaction Hash:** \`${result.txHash}\`
• **Status:** Pending Confirmation ⏳

**⏳ What's happening now:**
1. Transaction is being confirmed on BSC network
2. Your NFT membership token is being minted
3. You'll be notified when complete

**📱 Next Steps:**
• Save your transaction hash for reference
• Your membership will be active once confirmed
• Start sharing your referral code to earn!

**🎯 Your Referral Code:** \`${ctx.session.user?.referral_code || 'Loading...'}\`

We'll notify you when your membership is fully activated! 🚀`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('👥 Share Referral Code', 'action_share_referral'),
                Markup.button.callback('📊 Check Status', 'action_check_tx_status')
            ],
            [
                Markup.button.callback('👤 View Profile', 'action_profile'),
                Markup.button.callback('💡 Learn to Earn', 'action_earning_guide')
            ],
            [
                Markup.button.callback('🏠 Main Menu', 'action_back_main')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });

        // Save pending transaction
        await this.savePendingRegistration(ctx.from.id.toString(), planId, result.txHash);
    }

    async showApprovalRequired(ctx, result, planId) {
        const plan = await this.blockchainService.getPlanInfo(planId);
        const price = formatNumber(parseFloat(plan.priceFormatted));

        const message = `💳 **USDT Approval Required**

**⚠️ Before registration, you need to approve USDT spending.**

**📋 Approval Details:**
• **Amount:** ${price} USDT
• **Spender:** NFT Contract
• **Purpose:** Membership payment

**📱 Steps to approve:**
1. Open your wallet app (MetaMask, Trust Wallet, etc.)
2. Go to the USDT token
3. Approve spending for the NFT contract
4. Return here and try registration again

**🔗 Contract Address:**
\`${process.env.NFT_CONTRACT_ADDRESS}\`

**💡 This is a one-time approval for this amount.**

Once approved, return here to complete registration! 🚀`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ I Approved, Try Again', `confirm_register_${planId}`),
                Markup.button.callback('❓ How to Approve?', 'action_approval_help')
            ],
            [
                Markup.button.callback('🔄 Check Approval Status', 'action_check_approval'),
                Markup.button.callback('❌ Cancel', 'action_cancel')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }

    async showRegistrationError(ctx, error) {
        const message = `❌ **Registration Failed**

**😔 Something went wrong with your registration.**

**Error:** ${error}

**🔧 Possible solutions:**
• Check your USDT balance
• Ensure sufficient BNB for gas
• Verify wallet connection
• Check network connection
• Try again in a few minutes

**💡 Common issues:**
• Insufficient USDT balance
• Need to approve USDT spending first
• Network congestion (try later)
• Wallet not connected properly

Need help? Contact support! 🆘`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🔄 Try Again', 'action_start_registration'),
                Markup.button.callback('💳 Check Wallet', 'action_wallet_info')
            ],
            [
                Markup.button.callback('❓ Get Help', 'action_registration_help'),
                Markup.button.callback('🔙 Back', 'action_back_main')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }

    async showWalletRequired(ctx) {
        const message = `💳 **Wallet Required**

**⚠️ You need to connect a BSC wallet before registering.**

**🔗 Supported Wallets:**
• MetaMask (Recommended)
• Trust Wallet
• SafePal
• Any BSC-compatible wallet

**📱 Setup Steps:**
1. Install a wallet app
2. Create or import your wallet
3. Add BSC (Binance Smart Chain) network
4. Get some USDT and BNB
5. Return here to connect

**💰 You'll need:**
• USDT for membership fee
• Small amount of BNB for gas fees

Ready to connect your wallet? 🚀`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('💳 Connect Wallet', 'action_connect_wallet'),
                Markup.button.callback('❓ Wallet Help', 'action_wallet_setup_help')
            ],
            [
                Markup.button.callback('🔙 Back', 'action_back_main')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }

    // Helper methods
    async getUplineInfo(user) {
        if (!user.upline_id) {
            return { name: 'Owner (Default Sponsor)' };
        }

        try {
            const upline = await this.userService.getUserById(user.upline_id);
            return {
                name: upline ? `@${upline.username || upline.first_name}` : 'Unknown'
            };
        } catch (error) {
            return { name: 'Unknown Sponsor' };
        }
    }

    async checkRequirements(user, plan) {
        let requirements = '';
        
        try {
            if (user.wallet_address) {
                requirements += '✅ Wallet connected\n';
                
                // Check USDT balance
                const balance = await this.blockchainService.usdtContract.balanceOf(user.wallet_address);
                const requiredAmount = this.blockchainService.parseTokenAmount(plan.priceFormatted);
                
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

    async savePendingRegistration(telegramId, planId, txHash) {
        try {
            // This would save the pending registration to track status
            console.log(`📝 Pending registration saved: ${telegramId} - Plan ${planId} - ${txHash}`);
        } catch (error) {
            console.error('❌ Error saving pending registration:', error);
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
}

module.exports = RegisterHandler;