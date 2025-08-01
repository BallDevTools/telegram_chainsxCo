// src/bot/keyboards/confirm.js
const { Markup } = require('telegraf');

class ConfirmKeyboard {
    static getBasicConfirmation(confirmAction, cancelAction = 'action_cancel') {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Confirm', confirmAction),
                Markup.button.callback('❌ Cancel', cancelAction)
            ]
        ]);
    }
    
    static getRegistrationConfirmation(planId) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Confirm Registration', `confirm_register_${planId}`)
            ],
            [
                Markup.button.callback('💳 Check Wallet Balance', 'action_check_balance'),
                Markup.button.callback('🔄 Refresh Info', `plan_${planId}`)
            ],
            [
                Markup.button.callback('❌ Cancel Registration', 'action_view_plans'),
                Markup.button.callback('❓ Need Help?', 'action_registration_help')
            ]
        ]);
    }
    
    static getUpgradeConfirmation(planId, upgradeCost) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Confirm Upgrade', `confirm_upgrade_${planId}`)
            ],
            [
                Markup.button.callback('💳 Check Balance', 'action_check_balance'),
                Markup.button.callback('📊 Check Allowance', 'action_check_allowance')
            ],
            [
                Markup.button.callback('🔄 Refresh Info', `upgrade_${planId}`),
                Markup.button.callback('💡 Approval Help', 'action_approval_help')
            ],
            [
                Markup.button.callback('❌ Cancel Upgrade', 'action_upgrade'),
                Markup.button.callback('❓ Need Help?', 'action_upgrade_help')
            ]
        ]);
    }
    
    static getWalletConfirmation(walletAddress) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Connect This Wallet', `confirm_wallet_${walletAddress}`)
            ],
            [
                Markup.button.callback('🔍 Verify on BSCScan', `verify_wallet_${walletAddress}`),
                Markup.button.callback('💳 Check Balance', `check_wallet_${walletAddress}`)
            ],
            [
                Markup.button.callback('❌ Use Different Wallet', 'action_connect_wallet'),
                Markup.button.callback('❓ Wallet Help', 'action_wallet_help')
            ]
        ]);
    }
    
    static getDisconnectWalletConfirmation() {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Yes, Disconnect', 'confirm_disconnect_wallet'),
                Markup.button.callback('❌ Cancel', 'action_wallet_info')
            ],
            [
                Markup.button.callback('❓ What happens?', 'action_disconnect_help')
            ]
        ]);
    }
    
    static getBroadcastConfirmation(recipientCount) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Send Broadcast', 'admin_confirm_broadcast')
            ],
            [
                Markup.button.callback('📝 Edit Message', 'action_edit_broadcast'),
                Markup.button.callback('👥 Change Recipients', 'action_select_recipients')
            ],
            [
                Markup.button.callback('❌ Cancel Broadcast', 'admin_main'),
                Markup.button.callback('💡 Broadcast Tips', 'action_broadcast_help')
            ]
        ]);
    }
    
    static getEmergencyWithdrawConfirmation() {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🚨 CONFIRM EMERGENCY WITHDRAW', 'confirm_emergency_withdraw')
            ],
            [
                Markup.button.callback('❌ Cancel (Recommended)', 'admin_main'),
                Markup.button.callback('❓ What is this?', 'action_emergency_help')
            ]
        ]);
    }
    
    static getDeleteConfirmation(itemType, itemId) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback(`🗑️ Delete ${itemType}`, `confirm_delete_${itemType}_${itemId}`)
            ],
            [
                Markup.button.callback('❌ Cancel', 'action_cancel'),
                Markup.button.callback('⚠️ Consequences', `delete_info_${itemType}`)
            ]
        ]);
    }
    
    static getTransactionConfirmation(txType, amount, recipient = null) {
        const recipientText = recipient ? ` to ${recipient}` : '';
        
        return Markup.inlineKeyboard([
            [
                Markup.button.callback(`✅ Send ${amount} USDT${recipientText}`, `confirm_tx_${txType}`)
            ],
            [
                Markup.button.callback('💳 Check Balance', 'action_check_balance'),
                Markup.button.callback('⛽ Check Gas Fee', 'action_estimate_gas')
            ],
            [
                Markup.button.callback('❌ Cancel Transaction', 'action_cancel'),
                Markup.button.callback('❓ Transaction Help', 'action_tx_help')
            ]
        ]);
    }
    
    static getApprovalConfirmation(amount, spender) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ I Approved, Continue', 'action_approval_confirmed')
            ],
            [
                Markup.button.callback('❓ How to Approve?', 'action_approval_guide'),
                Markup.button.callback('🔄 Check Approval', 'action_check_approval')
            ],
            [
                Markup.button.callback('❌ Cancel', 'action_cancel')
            ]
        ]);
    }
    
    static getExitMembershipConfirmation() {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🚪 Exit Membership', 'confirm_exit_membership')
            ],
            [
                Markup.button.callback('💰 Refund Details', 'action_exit_details'),
                Markup.button.callback('⏰ Lock Period Info', 'action_lock_info')
            ],
            [
                Markup.button.callback('❌ Stay as Member', 'action_profile'),
                Markup.button.callback('❓ Exit Help', 'action_exit_help')
            ]
        ]);
    }
    
    static getPlanChangeConfirmation(fromPlan, toPlan, cost) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Confirm Plan Change', `confirm_plan_change_${toPlan}`)
            ],
            [
                Markup.button.callback('📊 Compare Benefits', `compare_plans_${fromPlan}_${toPlan}`),
                Markup.button.callback('💰 Cost Breakdown', `cost_breakdown_${toPlan}`)
            ],
            [
                Markup.button.callback('❌ Keep Current Plan', 'action_profile'),
                Markup.button.callback('❓ Change Help', 'action_plan_change_help')
            ]
        ]);
    }
    
    static getMultiStepConfirmation(step, totalSteps, nextAction, prevAction = null) {
        const keyboard = [];
        
        keyboard.push([
            Markup.button.callback('✅ Continue', nextAction)
        ]);
        
        const navRow = [];
        if (prevAction) {
            navRow.push(Markup.button.callback('⬅️ Previous', prevAction));
        }
        navRow.push(Markup.button.callback('❌ Cancel', 'action_cancel'));
        keyboard.push(navRow);
        
        keyboard.push([
            Markup.button.callback(`📊 Progress (${step}/${totalSteps})`, 'action_show_progress')
        ]);
        
        return Markup.inlineKeyboard(keyboard);
    }
    
    static getTimeBasedConfirmation(action, timeoutSeconds = 30) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback(`✅ Confirm (${timeoutSeconds}s)`, action)
            ],
            [
                Markup.button.callback('❌ Cancel', 'action_cancel'),
                Markup.button.callback('⏱️ Extend Time', 'action_extend_timeout')
            ]
        ]);
    }
    
    static getRiskConfirmation(riskLevel, action) {
        const riskEmojis = {
            'low': '🟢',
            'medium': '🟡', 
            'high': '🔴'
        };
        
        const emoji = riskEmojis[riskLevel] || '⚠️';
        
        return Markup.inlineKeyboard([
            [
                Markup.button.callback(`${emoji} I Accept the Risk`, action)
            ],
            [
                Markup.button.callback('📖 Risk Details', `risk_details_${riskLevel}`),
                Markup.button.callback('💡 Safer Alternatives', 'action_safe_alternatives')
            ],
            [
                Markup.button.callback('❌ Cancel (Recommended)', 'action_cancel')
            ]
        ]);
    }
}

module.exports = ConfirmKeyboard;