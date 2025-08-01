const { Markup } = require('telegraf');
const BlockchainService = require('../../services/BlockchainService');
const { formatNumber } = require('../../utils/formatting');

class PlansHandler {
    constructor() {
        this.blockchainService = new BlockchainService();
        this.planCache = new Map();
        this.lastCacheUpdate = 0;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async handle(ctx) {
        try {
            const plansMessage = await this.buildPlansMessage();
            const keyboard = this.getPlansKeyboard();

            if (ctx.callbackQuery) {
                await ctx.editMessageText(plansMessage, {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
                await ctx.answerCbQuery();
            } else {
                await ctx.reply(plansMessage, {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
            }

        } catch (error) {
            console.error('❌ Plans handler error:', error);
            await ctx.reply('❌ Failed to load plans. Please try again.');
        }
    }

    async buildPlansMessage() {
        try {
            const plans = await this.getAllPlans();
            
            let message = `📋 **Membership Plans**

💎 Choose your membership level to start earning from referrals!

**🎯 Benefits:**
• 💰 Referral commissions
• 🎫 Exclusive NFT membership
• ⬆️ Plan upgrade rewards
• 🌟 VIP community access

**📊 Available Plans:**\n`;

            // Show first 8 plans in overview
            for (let i = 1; i <= Math.min(8, plans.length); i++) {
                const plan = plans[i - 1];
                if (plan) {
                    const price = formatNumber(parseFloat(plan.priceFormatted));
                    const cycleInfo = `${plan.membersInCurrentCycle}/${plan.membersPerCycle}`;
                    
                    message += `\n**${plan.name}** (Plan ${i})
💰 Price: ${price} USDT
👥 Current Cycle: ${cycleInfo} members`;
                }
            }

            message += `\n\n💡 **How it works:**
1️⃣ Choose a membership plan
2️⃣ Connect your wallet & pay
3️⃣ Receive your NFT membership
4️⃣ Start referring friends
5️⃣ Earn commissions & upgrade!

🔄 **Upgrade Path:** Start with any plan and upgrade level by level to earn more commissions!`;

            return message;

        } catch (error) {
            console.error('❌ Error building plans message:', error);
            return this.getBasicPlansMessage();
        }
    }

    getBasicPlansMessage() {
        return `📋 **Membership Plans**

💎 Join our exclusive membership program!

**Available Plans:**
• **Starter** - Perfect for beginners
• **Basic** - More earning potential  
• **Bronze** - Enhanced benefits
• **Silver** - Premium features
• And many more levels to unlock!

💰 **Earn Through:**
• Direct referral commissions
• Plan upgrade bonuses
• Exclusive member rewards

🚀 Use the buttons below to explore plans or get started!`;
    }

    getPlansKeyboard() {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🚀 Start with Plan 1', 'plan_1'),
                Markup.button.callback('📊 View All Plans', 'action_view_all_plans')
            ],
            [
                Markup.button.callback('💡 How it Works', 'action_how_it_works'),
                Markup.button.callback('💰 Commission Structure', 'action_commission_info')
            ],
            [
                Markup.button.callback('📈 Plan Comparison', 'action_plan_comparison'),
                Markup.button.callback('❓ FAQ', 'action_plans_faq')
            ],
            [
                Markup.button.callback('🏠 Main Menu', 'action_back_main')
            ]
        ]);
    }

    async showAllPlans(ctx) {
        try {
            const plans = await this.getAllPlans();
            const keyboard = this.getAllPlansKeyboard(plans);
            
            let message = `📊 **All Membership Plans**

Choose your starting level:\n`;

            // Group plans by categories
            const categories = this.groupPlansByCategory(plans);
            
            for (const [category, categoryPlans] of Object.entries(categories)) {
                message += `\n**${category} Tier:**\n`;
                
                categoryPlans.forEach(plan => {
                    const price = formatNumber(parseFloat(plan.priceFormatted));
                    const status = plan.isActive ? '✅' : '❌';
                    message += `${status} **${plan.name}** - ${price} USDT\n`;
                });
            }

            message += `\n💡 **Tips:**
• Start with Plan 1 if you're new
• Higher plans = Higher commissions
• You can upgrade anytime!`;

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();

        } catch (error) {
            console.error('❌ Show all plans error:', error);
            await ctx.answerCbQuery('❌ Failed to load plans');
        }
    }

    getAllPlansKeyboard(plans) {
        const keyboard = [];
        
        // Create rows of plan buttons (2 per row)
        for (let i = 0; i < Math.min(16, plans.length); i += 2) {
            const row = [];
            
            if (plans[i]) {
                const price = formatNumber(parseFloat(plans[i].priceFormatted));
                row.push(Markup.button.callback(
                    `${plans[i].name} ($${price})`, 
                    `plan_${i + 1}`
                ));
            }
            
            if (plans[i + 1]) {
                const price = formatNumber(parseFloat(plans[i + 1].priceFormatted));
                row.push(Markup.button.callback(
                    `${plans[i + 1].name} ($${price})`, 
                    `plan_${i + 2}`
                ));
            }
            
            keyboard.push(row);
        }

        keyboard.push([
            Markup.button.callback('🔙 Back to Plans', 'action_view_plans')
        ]);

        return Markup.inlineKeyboard(keyboard);
    }

    async showPlanDetails(ctx, planId) {
        try {
            const plan = await this.blockchainService.getPlanInfo(planId);
            
            if (!plan) {
                await ctx.answerCbQuery('❌ Plan not found');
                return;
            }

            const message = await this.buildPlanDetailsMessage(plan, planId);
            const keyboard = this.getPlanDetailsKeyboard(planId);

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery();

        } catch (error) {
            console.error('❌ Show plan details error:', error);
            await ctx.answerCbQuery('❌ Failed to load plan details');
        }
    }

    async buildPlanDetailsMessage(plan, planId) {
        const price = formatNumber(parseFloat(plan.priceFormatted));
        const cycleProgress = `${plan.membersInCurrentCycle}/${plan.membersPerCycle}`;
        const cycleCompletion = Math.round((plan.membersInCurrentCycle / plan.membersPerCycle) * 100);
        
        // Calculate commission structure
        const commissionInfo = this.getCommissionStructure(planId);
        
        let message = `💎 **${plan.name} Plan** (Level ${planId})

💰 **Price:** ${price} USDT
🔄 **Current Cycle:** ${plan.currentCycle}
👥 **Cycle Progress:** ${cycleProgress} (${cycleCompletion}%)
📊 **Status:** ${plan.isActive ? 'Active ✅' : 'Inactive ❌'}

**💼 Commission Structure:**
• **Direct Referral:** ${commissionInfo.direct}% of plan price
• **Upline Bonus:** ${commissionInfo.upline}% to your sponsor
• **Company Share:** ${commissionInfo.company}%

**🎯 Benefits:**
• Earn ${commissionInfo.direct}% on every direct referral
• Receive NFT membership token
• Access to exclusive community
• Upgrade path to higher levels

**⚡ Requirements:**
• Must have connected wallet
• Sufficient USDT balance
• Valid upline (or owner as sponsor)`;

        // Add upgrade information if not the highest plan
        if (planId < 16) {
            const nextPlan = await this.blockchainService.getPlanInfo(planId + 1);
            if (nextPlan) {
                const upgradeCost = formatNumber(
                    parseFloat(nextPlan.priceFormatted) - parseFloat(plan.priceFormatted)
                );
                message += `\n\n⬆️ **Next Level:** ${nextPlan.name} Plan
💰 **Upgrade Cost:** ${upgradeCost} USDT`;
            }
        }

        return message;
    }

    getPlanDetailsKeyboard(planId) {
        const keyboard = [];

        // Action buttons
        keyboard.push([
            Markup.button.callback('🚀 Select This Plan', `plan_${planId}`),
            Markup.button.callback('💡 How to Join', 'action_how_to_join')
        ]);

        // Navigation buttons
        const navRow = [];
        if (planId > 1) {
            navRow.push(Markup.button.callback('⬅️ Previous Plan', `plan_details_${planId - 1}`));
        }
        if (planId < 16) {
            navRow.push(Markup.button.callback('➡️ Next Plan', `plan_details_${planId + 1}`));
        }
        if (navRow.length > 0) {
            keyboard.push(navRow);
        }

        keyboard.push([
            Markup.button.callback('📊 All Plans', 'action_view_all_plans'),
            Markup.button.callback('🔙 Back', 'action_view_plans')
        ]);

        return Markup.inlineKeyboard(keyboard);
    }

    async showHowItWorks(ctx) {
        const message = `💡 **How the Membership System Works**

**🔄 4-Step Process:**

**1️⃣ Choose Your Plan**
• Select any membership level (1-16)
• Higher plans = Higher commissions
• Start with what you're comfortable with

**2️⃣ Complete Payment**
• Connect your BSC wallet
• Approve USDT spending
• Pay the membership fee

**3️⃣ Receive NFT Membership**
• Get your unique NFT token
• Proof of membership on blockchain
• Non-transferable membership certificate

**4️⃣ Start Earning**
• Share your referral code
• Earn commissions when friends join
• Upgrade to higher plans for more earnings

**💰 Commission System:**
• **Plans 1-4:** 50% to you, 50% to company
• **Plans 5-8:** 55% to you, 45% to company  
• **Plans 9-12:** 58% to you, 42% to company
• **Plans 13-16:** 60% to you, 40% to company

**🎯 Your Share Splits:**
• 60% to your wallet (direct commission)
• 40% to company fund

**⬆️ Upgrade Benefits:**
• Unlock higher commission rates
• Access premium features
• Bigger earning potential
• VIP community access

Ready to start? Choose a plan above! 🚀`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🚀 Choose Plan 1', 'plan_1'),
                Markup.button.callback('📊 View All Plans', 'action_view_all_plans')
            ],
            [
                Markup.button.callback('💰 Commission Details', 'action_commission_info'),
                Markup.button.callback('🔙 Back', 'action_view_plans')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
        await ctx.answerCbQuery();
    }

    async showCommissionInfo(ctx) {
        const message = `💰 **Commission Structure Details**

**📊 Commission Breakdown by Plan Level:**

**🥉 Bronze Tier (Plans 1-4):**
• User gets: 50% of plan price
• Company: 50% of plan price
• Your direct commission: 30% of plan price
• Fund allocation: 20% of plan price

**🥈 Silver Tier (Plans 5-8):**
• User gets: 55% of plan price  
• Company: 45% of plan price
• Your direct commission: 33% of plan price
• Fund allocation: 22% of plan price

**🥇 Gold Tier (Plans 9-12):**
• User gets: 58% of plan price
• Company: 42% of plan price
• Your direct commission: 35% of plan price
• Fund allocation: 23% of plan price

**💎 Diamond Tier (Plans 13-16):**
• User gets: 60% of plan price
• Company: 40% of plan price
• Your direct commission: 36% of plan price
• Fund allocation: 24% of plan price

**🎯 Example: Plan 5 (Gold) - $50 USDT**
• You earn: $33 USDT instantly
• Your sponsor earns: $22 USDT
• Company gets: $45 USDT total

**⚡ Instant Payments:**
• Commissions paid immediately
• Direct to your wallet
• No delays or manual processing
• Transparent blockchain transactions

**🔄 Upgrade Bonuses:**
• Earn on price difference when members upgrade
• Recurring earning opportunity
• Build passive income stream

Start earning today! 💪`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('📊 Plan Comparison', 'action_plan_comparison'),
                Markup.button.callback('🚀 Get Started', 'action_get_started')
            ],
            [
                Markup.button.callback('🔙 Back to Plans', 'action_view_plans')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
        await ctx.answerCbQuery();
    }

    async showPlanComparison(ctx) {
        const message = `📈 **Plan Comparison Chart**

**💡 Quick Comparison:**

**🟢 Starter Plans (1-4):**
• Entry level pricing ($10-$40)
• 30% direct commission rate
• Perfect for beginners
• Basic community access

**🟡 Growth Plans (5-8):**
• Mid-tier pricing ($50-$80)
• 33% direct commission rate  
• Enhanced earning potential
• Premium features unlocked

**🟠 Advanced Plans (9-12):**
• Higher pricing ($90-$120)
• 35% direct commission rate
• Serious earner level
• VIP community access

**🔴 Elite Plans (13-16):**
• Premium pricing ($130-$160)
• 36% direct commission rate
• Maximum earning potential
• Exclusive elite features

**🎯 Recommendation:**
• **New users:** Start with Plan 1-2
• **Experienced:** Consider Plan 5-8
• **Serious investors:** Plan 9-12
• **Elite members:** Plan 13-16

**⬆️ Upgrade Strategy:**
1. Start comfortable
2. Reinvest earnings  
3. Upgrade gradually
4. Maximize commissions

**💰 ROI Example:**
Plan 5 ($50) → Refer 2 friends → Earn $66 → 132% ROI!

Choose your starting point wisely! 🎯`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🚀 Plan 1 ($10)', 'plan_1'),
                Markup.button.callback('💪 Plan 5 ($50)', 'plan_5')
            ],
            [
                Markup.button.callback('📊 All Plans', 'action_view_all_plans'),
                Markup.button.callback('🔙 Back', 'action_view_plans')
            ]
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
        await ctx.answerCbQuery();
    }

    // Helper methods
    async getAllPlans() {
        const now = Date.now();
        
        // Check cache
        if (this.planCache.size > 0 && (now - this.lastCacheUpdate) < this.cacheTimeout) {
            return Array.from(this.planCache.values());
        }

        // Fetch fresh data
        const plans = [];
        try {
            for (let i = 1; i <= 16; i++) {
                const plan = await this.blockchainService.getPlanInfo(i);
                if (plan) {
                    plans.push(plan);
                    this.planCache.set(i, plan);
                }
            }
            this.lastCacheUpdate = now;
        } catch (error) {
            console.error('❌ Error fetching plans:', error);
            // Return cached data if available
            if (this.planCache.size > 0) {
                return Array.from(this.planCache.values());
            }
        }

        return plans;
    }

    groupPlansByCategory(plans) {
        return {
            'Starter': plans.slice(0, 4),
            'Growth': plans.slice(4, 8),
            'Advanced': plans.slice(8, 12),
            'Elite': plans.slice(12, 16)
        };
    }

    getCommissionStructure(planId) {
        if (planId <= 4) {
            return { direct: 30, upline: 20, company: 50 };
        } else if (planId <= 8) {
            return { direct: 33, upline: 22, company: 45 };
        } else if (planId <= 12) {
            return { direct: 35, upline: 23, company: 42 };
        } else {
            return { direct: 36, upline: 24, company: 40 };
        }
    }
}

module.exports = PlansHandler;