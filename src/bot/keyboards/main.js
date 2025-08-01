// src/bot/keyboards/main.js
const { Markup } = require('telegraf');

class MainKeyboard {
    static getMainKeyboard(user = null) {
        const keyboard = [];
        
        if (!user || !user.is_registered) {
            // New user or unregistered user
            keyboard.push([
                Markup.button.callback('🚀 Get Started', 'action_get_started'),
                Markup.button.callback('📋 View Plans', 'action_view_plans')
            ]);
            
            keyboard.push([
                Markup.button.callback('💳 Connect Wallet', 'action_connect_wallet'),
                Markup.button.callback('👥 Referrals', 'action_referrals')
            ]);
        } else {
            // Registered user
            keyboard.push([
                Markup.button.callback('👤 My Profile', 'action_profile'),
                Markup.button.callback('⬆️ Upgrade Plan', 'action_upgrade')
            ]);
            
            keyboard.push([
                Markup.button.callback('👥 Referrals', 'action_referrals'),
                Markup.button.callback('💰 Earnings', 'action_earnings')
            ]);
        }
        
        // Common buttons for all users
        keyboard.push([
            Markup.button.callback('📊 Statistics', 'action_stats'),
            Markup.button.callback('💳 Wallet', 'action_wallet_info')
        ]);
        
        keyboard.push([
            Markup.button.callback('❓ Help', 'action_help')
        ]);
        
        return Markup.inlineKeyboard(keyboard);
    }
    
    static getWelcomeKeyboard(user = null) {
        const keyboard = [];
        
        if (!user || !user.is_registered) {
            keyboard.push([
                Markup.button.callback('🚀 Start Registration', 'action_get_started')
            ]);
            keyboard.push([
                Markup.button.callback('📋 View Plans', 'action_view_plans'),
                Markup.button.callback('💡 How it Works', 'action_how_it_works')
            ]);
        } else {
            keyboard.push([
                Markup.button.callback('👤 View Profile', 'action_profile')
            ]);
            keyboard.push([
                Markup.button.callback('⬆️ Upgrade Plan', 'action_upgrade'),
                Markup.button.callback('👥 My Referrals', 'action_referrals')
            ]);
        }
        
        keyboard.push([
            Markup.button.callback('❓ Help & Support', 'action_help')
        ]);
        
        return Markup.inlineKeyboard(keyboard);
    }
    
    static getQuickActionsKeyboard(user) {
        const keyboard = [];
        
        if (!user.is_registered) {
            if (!user.wallet_address) {
                keyboard.push([
                    Markup.button.callback('💳 Connect Wallet', 'action_connect_wallet')
                ]);
            } else {
                keyboard.push([
                    Markup.button.callback('🚀 Register Now', 'action_get_started')
                ]);
            }
        } else {
            if (user.plan_id < 16) {
                keyboard.push([
                    Markup.button.callback('⬆️ Upgrade Plan', 'action_upgrade')
                ]);
            }
            keyboard.push([
                Markup.button.callback('👥 Share Referral', 'action_share_referral')
            ]);
        }
        
        keyboard.push([
            Markup.button.callback('🔙 Main Menu', 'action_back_main')
        ]);
        
        return Markup.inlineKeyboard(keyboard);
    }
    
    static getNavigationKeyboard() {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🔙 Back', 'action_back'),
                Markup.button.callback('🏠 Main Menu', 'action_back_main')
            ]
        ]);
    }
    
    static getConfirmationKeyboard(confirmAction, cancelAction = 'action_cancel') {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Confirm', confirmAction),
                Markup.button.callback('❌ Cancel', cancelAction)
            ]
        ]);
    }
    
    static getYesNoKeyboard(yesAction, noAction = 'action_cancel') {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Yes', yesAction),
                Markup.button.callback('❌ No', noAction)
            ]
        ]);
    }
}

module.exports = MainKeyboard;