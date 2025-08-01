// src/bot/keyboards/plans.js
const { Markup } = require('telegraf');

class PlansKeyboard {
    static getPlansOverviewKeyboard() {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🚀 Start with Plan 1', 'plan_1'),
                Markup.button.callback('📊 View All Plans', 'action_view_all_plans')
            ],
            [
                Markup.button.callback('💡 How it Works', 'action_how_it_works'),
                Markup.button.callback('💰 Commission Info', 'action_commission_info')
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
    
    static getAllPlansKeyboard(plans) {
        const keyboard = [];
        
        // Create rows of plan buttons (2 per row)
        for (let i = 0; i < Math.min(16, plans.length); i += 2) {
            const row = [];
            
            if (plans[i]) {
                const price = this.formatPrice(plans[i].priceFormatted);
                row.push(Markup.button.callback(
                    `${plans[i].name} ($${price})`, 
                    `plan_details_${i + 1}`
                ));
            }
            
            if (plans[i + 1]) {
                const price = this.formatPrice(plans[i + 1].priceFormatted);
                row.push(Markup.button.callback(
                    `${plans[i + 1].name} ($${price})`, 
                    `plan_details_${i + 2}`
                ));
            }
            
            keyboard.push(row);
        }

        keyboard.push([
            Markup.button.callback('🔙 Back to Plans', 'action_view_plans')
        ]);

        return Markup.inlineKeyboard(keyboard);
    }
    
    static getPlanDetailsKeyboard(planId, isRegistered = false) {
        const keyboard = [];

        if (!isRegistered && planId === 1) {
            // New users can only register for Plan 1
            keyboard.push([
                Markup.button.callback('🚀 Register for This Plan', `confirm_register_${planId}`)
            ]);
        } else if (isRegistered) {
            // Registered users can upgrade
            keyboard.push([
                Markup.button.callback('⬆️ Upgrade to This Plan', `upgrade_${planId}`)
            ]);
        } else {
            // Show selection but explain requirements
            keyboard.push([
                Markup.button.callback('ℹ️ Plan Requirements', `plan_requirements_${planId}`)
            ]);
        }

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
            Markup.button.callback('💡 How to Join', 'action_how_to_join')
        ]);

        keyboard.push([
            Markup.button.callback('🔙 Back', 'action_view_plans')
        ]);

        return Markup.inlineKeyboard(keyboard);
    }
    
    static getUpgradePathKeyboard(currentPlan, availableUpgrades) {
        const keyboard = [];
        
        // Show next plan upgrade
        if (currentPlan < 16) {
            keyboard.push([
                Markup.button.callback(`⬆️ Upgrade to Plan ${currentPlan + 1}`, `upgrade_${currentPlan + 1}`)
            ]);
        }
        
        // Show plan comparison
        keyboard.push([
            Markup.button.callback('📈 Compare Benefits', 'action_upgrade_comparison'),
            Markup.button.callback('💰 ROI Calculator', 'action_roi_calculator')
        ]);
        
        // Show upgrade history if available
        keyboard.push([
            Markup.button.callback('📊 Upgrade History', 'action_upgrade_history'),
            Markup.button.callback('🎯 Upgrade Strategy', 'action_upgrade_strategy')
        ]);
        
        keyboard.push([
            Markup.button.callback('🔙 Back to Profile', 'action_profile')
        ]);
        
        return Markup.inlineKeyboard(keyboard);
    }
    
    static getRegistrationKeyboard(planId) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Confirm Registration', `confirm_register_${planId}`),
                Markup.button.callback('❌ Cancel', 'action_view_plans')
            ],
            [
                Markup.button.callback('💳 Check Wallet', 'action_wallet_info'),
                Markup.button.callback('❓ Need Help?', 'action_registration_help')
            ]
        ]);
    }
    
    static getUpgradeConfirmKeyboard(planId) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Confirm Upgrade', `confirm_upgrade_${planId}`),
                Markup.button.callback('❌ Cancel', 'action_upgrade')
            ],
            [
                Markup.button.callback('💳 Check Balance', 'action_check_balance'),
                Markup.button.callback('🔄 Refresh Info', `upgrade_${planId}`)
            ],
            [
                Markup.button.callback('❓ Need Help?', 'action_upgrade_help')
            ]
        ]);
    }
    
    static getPlanCategoriesKeyboard() {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🟢 Starter (1-4)', 'category_starter'),
                Markup.button.callback('🟡 Growth (5-8)', 'category_growth')
            ],
            [
                Markup.button.callback('🟠 Advanced (9-12)', 'category_advanced'),
                Markup.button.callback('🔴 Elite (13-16)', 'category_elite')
            ],
            [
                Markup.button.callback('📊 View All Plans', 'action_view_all_plans'),
                Markup.button.callback('🔙 Back', 'action_view_plans')
            ]
        ]);
    }
    
    static getCategoryPlansKeyboard(category, planRange) {
        const keyboard = [];
        const [start, end] = planRange;
        
        // Add plan buttons for the category
        for (let i = start; i <= end; i += 2) {
            const row = [];
            row.push(Markup.button.callback(`Plan ${i}`, `plan_details_${i}`));
            if (i + 1 <= end) {
                row.push(Markup.button.callback(`Plan ${i + 1}`, `plan_details_${i + 1}`));
            }
            keyboard.push(row);
        }
        
        keyboard.push([
            Markup.button.callback('📊 All Categories', 'action_plan_categories'),
            Markup.button.callback('🔙 Back', 'action_view_plans')
        ]);
        
        return Markup.inlineKeyboard(keyboard);
    }
    
    // Helper method to format prices
    static formatPrice(price) {
        const num = parseFloat(price);
        if (num >= 1000) {
            return (num / 1000).toFixed(0) + 'K';
        }
        return num.toFixed(0);
    }
    
    // Helper method to get plan emoji
    static getPlanEmoji(planId) {
        if (planId <= 4) return '🟢';
        if (planId <= 8) return '🟡';
        if (planId <= 12) return '🟠';
        return '🔴';
    }
    
    // Helper method to get category info
    static getCategoryInfo(category) {
        const categories = {
            'starter': {
                name: 'Starter Plans (1-4)',
                description: 'Perfect for beginners',
                range: [1, 4],
                color: '🟢'
            },
            'growth': {
                name: 'Growth Plans (5-8)',
                description: 'Enhanced earning potential',
                range: [5, 8],
                color: '🟡'
            },
            'advanced': {
                name: 'Advanced Plans (9-12)',
                description: 'Serious earner level',
                range: [9, 12],
                color: '🟠'
            },
            'elite': {
                name: 'Elite Plans (13-16)',
                description: 'Maximum earning potential',
                range: [13, 16],
                color: '🔴'
            }
        };
        
        return categories[category] || null;
    }
}

module.exports = PlansKeyboard;