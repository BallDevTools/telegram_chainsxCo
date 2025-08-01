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
                Markup.button.callback(`⬆️ Upgrade Now (${formatNumber(upgradeCost)} USDT)`, `upgrade_${nextPlanId}`),
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