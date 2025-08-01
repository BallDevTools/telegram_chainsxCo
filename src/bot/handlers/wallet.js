const { Markup } = require('telegraf');
const UserService = require('../../services/UserService');
const BlockchainService = require('../../services/BlockchainService');
const { formatNumber } = require('../../utils/formatting');

class WalletHandler {
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

            if (user.wallet_address) {
                await this.showWalletInfo(ctx, user);
            } else {
                await this.showConnectWallet(ctx, user);
            }

        } catch (error) {
            console.error('❌ Wallet handler error:', error);
            await ctx.reply('❌ Wallet operation failed. Please try again.');
        }
    }

    async showConnectWallet(ctx, user) {
        const message = `💳 **Connect Your BSC Wallet**

🔗 **To participate in our membership program, you need a BSC wallet.**

**🎯 Supported Wallets:**
• **MetaMask** (Recommended)
• **Trust Wallet**
• **SafePal Wallet**
• **Binance Chain Wallet**
• Any BSC-compatible wallet

**📋 What you'll need:**
• USDT tokens for membership fees
• Small amount of BNB for gas fees
• BSC (Binance Smart Chain) network added

**🔒 Security Notice:**
• We only store your wallet address
• Never share your private keys
• Always verify transactions before signing

**📱 Ready to connect your wallet?**

Send your BSC wallet address (starts with 0x) or use the button below for help! 👇`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('💡 Wallet Setup Guide', 'action_wallet_setup_guide'),
                Markup.button.callback('🌐 Add BSC Network', 'action_bsc_network_help')
            ],
            [
                Markup.button.callback('📱 MetaMask Guide', 'action_metamask_guide'),
                Markup.button.callback('💼 Trust Wallet Guide', 'action_trust_wallet_guide')
            ],
            [
                Markup.button.callback('❓ FAQ', 'action_wallet_faq'),
                Markup.button.callback('🔙 Back', 'action_back_main')
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

        // Set conversation state to wait for wallet address
        ctx.session.step = 'waiting_wallet_address';
    }

    async showWalletInfo(ctx, user) {
        try {
            const walletAddress = user.wallet_address;
            const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
            
            // Get blockchain info
            const memberInfo = await this.blockchainService.getMemberInfo(walletAddress);
            
            // Get USDT balance
            let usdtBalance = '0';
            let bnbBalance = '0';
            
            try {
                const usdtBal = await this.blockchainService.usdtContract.balanceOf(walletAddress);
                usdtBalance = this.blockchainService.formatTokenAmount(usdtBal.toString());
                
                const bnbBal = await this.blockchainService.provider.getBalance(walletAddress);
                bnbBalance = this.blockchainService.formatTokenAmount(bnbBal.toString(), 18);
            } catch (error) {
                console.error('❌ Error getting wallet balances:', error);
            }

            const message = `💳 **Your Wallet Information**

**🔗 Connected Wallet:**
\`${walletAddress}\`

**💰 Wallet Balances:**
• **USDT:** ${formatNumber(parseFloat(usdtBalance))} USDT
• **BNB:** ${formatNumber(parseFloat(bnbBalance), 4)} BNB

**📊 Membership Status:**
${memberInfo && memberInfo.isRegistered ? 
    `✅ Registered Member (Plan ${memberInfo.planId})
📈 **On-chain Earnings:** ${this.blockchainService.formatTokenAmount(memberInfo.totalEarnings)} USDT
👥 **Direct Referrals:** ${memberInfo.totalReferrals}` :
    `❌ Not registered yet
💡 Use /register to join a membership plan`
}

**🔒 Security Status:**
✅ Wallet connected securely
✅ Ready for transactions
${parseFloat(bnbBalance) > 0.001 ? '✅ Sufficient BNB for gas' : '⚠️ Low BNB balance (need for gas fees)'}

**⚡ Quick Actions:**`;

            const keyboard = this.getWalletInfoKeyboard(user, parseFloat(usdtBalance), parseFloat(bnbBalance));

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
            console.error('❌ Show wallet info error:', error);
            await ctx.reply('❌ Failed to load wallet information.');
        }
    }

    getWalletInfoKeyboard(user, usdtBalance, bnbBalance) {
        const keyboard = [];

        // Action buttons based on user status and balances
        if (!user.is_registered) {
            if (usdtBalance >= 1 && bnbBalance >= 0.001) {
                keyboard.push([
                    Markup.button.callback('🚀 Register Now', 'action_get_started')
                ]);
            } else {
                keyboard.push([
                    Markup.button.callback('💰 Get USDT', 'action_get_usdt_help'),
                    Markup.button.callback('⛽ Get BNB', 'action_get_bnb_help')
                ]);
            }
        } else {
            keyboard.push([
                Markup.button.callback('⬆️ Upgrade Plan', 'action_upgrade'),
                Markup.button.callback('📊 Check Allowance', 'action_check_allowance')
            ]);
        }

        keyboard.push([
            Markup.button.callback('🔄 Refresh Balances', 'action_wallet_info'),
            Markup.button.callback('📋 Transaction History', 'action_tx_history')
        ]);

        keyboard.push([
            Markup.button.callback('🔗 View on BSCScan', 'action_view_bscscan'),
            Markup.button.callback('🔄 Change Wallet', 'action_change_wallet')
        ]);

        keyboard.push([
            Markup.button.callback('❓ Wallet Help', 'action_wallet_help'),
            Markup.button.callback('🔙 Back', 'action_back_main')
        ]);

        return Markup.inlineKeyboard(keyboard);
    }

    async handleWalletInput(ctx, walletAddress) {
        try {
            // Validate wallet address format
            if (!this.isValidWalletAddress(walletAddress)) {
                await ctx.reply(`❌ **Invalid wallet address format**

Please send a valid BSC wallet address that:
• Starts with "0x"
• Is exactly 42 characters long
• Contains only hexadecimal characters

**Example:** \`0x1234567890123456789012345678901234567890\`

Try again or use /wallet for help! 💡`);
                return;
            }

            // Check if wallet is already used
            const existingUser = await this.userService.getUserByWalletAddress(walletAddress);
            if (existingUser && existingUser.telegram_id !== ctx.from.id.toString()) {
                await ctx.reply(`❌ **Wallet Already Connected**

This wallet address is already linked to another account.

**Options:**
• Use a different wallet address
• Contact support if this is your wallet
• Check if you have another Telegram account

Please send a different wallet address! 💳`);
                return;
            }

            // Show confirmation
            await this.showWalletConfirmation(ctx, walletAddress);

        } catch (error) {
            console.error('❌ Handle wallet input error:', error);
            await ctx.reply('❌ Failed to process wallet address. Please try again.');
        }
    }

    async showWalletConfirmation(ctx, walletAddress) {
        const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
        
        // Try to get wallet info
        let walletInfo = '';
        try {
            const usdtBalance = await this.blockchainService.usdtContract.balanceOf(walletAddress);
            const bnbBalance = await this.blockchainService.provider.getBalance(walletAddress);
            
            const usdtFormatted = this.blockchainService.formatTokenAmount(usdtBalance.toString());
            const bnbFormatted = this.blockchainService.formatTokenAmount(bnbBalance.toString(), 18);
            
            walletInfo = `\n**💰 Wallet Balances:**
• USDT: ${formatNumber(parseFloat(usdtFormatted))} USDT
• BNB: ${formatNumber(parseFloat(bnbFormatted), 4)} BNB`;

        } catch (error) {
            walletInfo = '\n⚠️ Unable to fetch wallet balances';
        }

        const message = `🔗 **Confirm Wallet Connection**

**Wallet Address:**
\`${walletAddress}\`

**Short Address:** ${shortAddress}${walletInfo}

**✅ This wallet will be used for:**
• Membership registration payments
• Plan upgrade payments  
• Receiving referral commissions
• All blockchain transactions

**⚠️ Important:**
• Make sure you control this wallet
• Keep your private keys secure
• This can be changed later if needed

**Confirm connecting this wallet?**`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Connect Wallet', `confirm_wallet_${walletAddress}`),
                Markup.button.callback('❌ Cancel', 'action_connect_wallet')
            ],
            [
                Markup.button.callback('🔍 Verify on BSCScan', `verify_wallet_${walletAddress}`)
            ]
        ]);

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });

        // Clear session step
        ctx.session.step = null;
    }

    async connect(ctx) {
        await this.showConnectWallet(ctx, ctx.session.user);
    }

    async disconnect(ctx) {
        try {
            const telegramId = ctx.from.id.toString();
            const user = await this.userService.getUserByTelegramId(telegramId);
            
            if (!user || !user.wallet_address) {
                await ctx.answerCbQuery('❌ No wallet connected');
                return;
            }

            if (user.is_registered) {
                await ctx.answerCbQuery('❌ Cannot disconnect wallet of registered member');
                return;
            }

            const message = `🔓 **Disconnect Wallet**

**Current Wallet:** \`${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}\`

**⚠️ Warning:**
• You'll need to reconnect to register
• This action cannot be undone
• Make sure you have the wallet address saved

**Are you sure you want to disconnect?**`;

            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Yes, Disconnect', 'confirm_disconnect_wallet'),
                    Markup.button.callback('❌ Cancel', 'action_wallet_info')
                ]
            ]);

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();

        } catch (error) {
            console.error('❌ Disconnect wallet error:', error);
            await ctx.answerCbQuery('❌ Failed to disconnect wallet');
        }
    }

    async confirmConnect(ctx, walletAddress) {
        try {
            const telegramId = ctx.from.id.toString();
            
            // Update user wallet address
            await this.userService.updateWalletAddress(telegramId, walletAddress);
            
            const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
            
            const message = `✅ **Wallet Connected Successfully!**

**Connected Wallet:** \`${shortAddress}\`

🎉 Your BSC wallet is now connected to your account!

**🚀 What's Next:**
• Check your USDT balance for membership fees
• Ensure you have BNB for gas fees
• Ready to register for membership plans!

**⚡ Quick Actions:**`;

            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('🚀 Register Now', 'action_get_started'),
                    Markup.button.callback('💰 Check Balance', 'action_wallet_info')
                ],
                [
                    Markup.button.callback('📋 View Plans', 'action_view_plans'),
                    Markup.button.callback('💡 How to Get USDT', 'action_get_usdt_help')
                ],
                [
                    Markup.button.callback('🏠 Main Menu', 'action_back_main')
                ]
            ]);

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery('✅ Wallet connected successfully!');

        } catch (error) {
            console.error('❌ Confirm connect error:', error);
            await ctx.answerCbQuery('❌ Failed to connect wallet');
        }
    }

    async confirmDisconnect(ctx) {
        try {
            const telegramId = ctx.from.id.toString();
            
            // Clear wallet address
            await this.userService.updateWalletAddress(telegramId, null);
            
            const message = `🔓 **Wallet Disconnected**

Your wallet has been successfully disconnected from your account.

**To participate again:**
• Use /wallet to connect a new wallet
• Ensure you have USDT and BNB
• Complete membership registration

Need help? Use /help for assistance! 💡`;

            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('💳 Connect New Wallet', 'action_connect_wallet'),
                    Markup.button.callback('🏠 Main Menu', 'action_back_main')
                ]
            ]);

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery('✅ Wallet disconnected');

        } catch (error) {
            console.error('❌ Confirm disconnect error:', error);
            await ctx.answerCbQuery('❌ Failed to disconnect wallet');
        }
    }

    async showWalletHelp(ctx) {
        const message = `💡 **Wallet Help & Guides**

**🔗 Setting Up Your BSC Wallet:**

**📱 MetaMask Setup:**
1. Download MetaMask app/extension
2. Create new wallet or import existing
3. Add BSC network (details below)
4. Transfer USDT and BNB to wallet

**🌐 BSC Network Settings:**
• **Network Name:** Smart Chain
• **RPC URL:** https://bsc-dataseed.binance.org/
• **Chain ID:** 56 (Mainnet) / 97 (Testnet)
• **Symbol:** BNB
• **Explorer:** https://bscscan.com

**💰 Getting Tokens:**
• **USDT:** Buy on Binance, transfer to BSC
• **BNB:** Needed for gas fees (~$1-2 worth)

**🔒 Security Tips:**
• Never share private keys
• Use hardware wallet for large amounts
• Verify all transaction details
• Keep seed phrase secure

Need more help? Contact support! 🆘`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('📱 MetaMask Tutorial', 'action_metamask_tutorial'),
                Markup.button.callback('💼 Trust Wallet Guide', 'action_trust_tutorial')
            ],
            [
                Markup.button.callback('🌐 Add BSC Network', 'action_add_bsc_network'),
                Markup.button.callback('💰 Get USDT Guide', 'action_get_usdt_guide')
            ],
            [
                Markup.button.callback('🔙 Back to Wallet', 'action_wallet_info')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
        await ctx.answerCbQuery();
    }

    // Helper methods
    isValidWalletAddress(address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    async showTransactionHistory(ctx) {
        try {
            const telegramId = ctx.from.id.toString();
            const user = await this.userService.getUserByTelegramId(telegramId);
            
            if (!user || !user.wallet_address) {
                await ctx.answerCbQuery('❌ No wallet connected');
                return;
            }

            // Get recent transactions from database
            const db = require('../../config/database').getDatabase();
            const transactions = await db.all(`
                SELECT * FROM transactions 
                WHERE user_id = (SELECT id FROM users WHERE telegram_id = ?)
                ORDER BY created_at DESC 
                LIMIT 10
            `, [telegramId]);

            let message = `📋 **Transaction History**\n\n`;

            if (transactions.length === 0) {
                message += '📭 No transactions found.\n\nStart by registering for a membership plan!';
            } else {
                transactions.forEach((tx, index) => {
                    const status = this.getStatusEmoji(tx.status);
                    const type = tx.type.toUpperCase();
                    const amount = formatNumber(parseFloat(tx.amount));
                    const date = new Date(tx.created_at).toLocaleDateString();
                    
                    message += `${status} **${type}** - ${amount} USDT\n`;
                    message += `   ${date} • \`${tx.tx_hash?.slice(0, 10)}...\`\n\n`;
                });
                
                message += `**Total:** ${transactions.length} transactions shown`;
            }

            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('🔄 Refresh', 'action_tx_history'),
                    Markup.button.callback('🔍 View on BSCScan', 'action_view_bscscan')
                ],
                [
                    Markup.button.callback('🔙 Back to Wallet', 'action_wallet_info')
                ]
            ]);

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();

        } catch (error) {
            console.error('❌ Show transaction history error:', error);
            await ctx.answerCbQuery('❌ Failed to load transaction history');
        }
    }

    getStatusEmoji(status) {
        const emojis = {
            'pending': '⏳',
            'confirmed': '✅',
            'failed': '❌'
        };
        return emojis[status] || '❓';
    }
}

module.exports = WalletHandler;