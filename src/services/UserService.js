const { getDatabase } = require('../config/database');
const CacheService = require('./CacheService');
const { generateReferralCode } = require('../utils/referralCodes');

class UserService {
    constructor() {
        this.cache = CacheService;
        this.db = null;
    }

    async initialize() {
        this.db = getDatabase();
    }

    getDatabase() {
        if (!this.db) {
            this.db = getDatabase();
        }
        return this.db;
    }

    // Create new user
    async createUser(userData) {
        try {
            const db = this.getDatabase();
            
            // Generate referral code if not provided
            if (!userData.referralCode) {
                userData.referralCode = await this.generateUniqueReferralCode();
            }
            
            const result = await db.run(`
                INSERT INTO users (
                    telegram_id, username, first_name, last_name, language_code,
                    referral_code, upline_id, created_at, last_activity
                ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
                userData.telegramId,
                userData.username || null,
                userData.firstName || null,
                userData.lastName || null,
                userData.languageCode || 'en',
                userData.referralCode,
                userData.uplineId || null
            ]);
            
            // Get the created user
            const user = await db.get(
                'SELECT * FROM users WHERE id = ?',
                [result.lastID]
            );
            
            // Update upline referral count if applicable
            if (userData.uplineId) {
                await this.incrementReferralCount(userData.uplineId);
            }
            
            console.log(`✅ Created user: ${userData.telegramId} (${userData.firstName})`);
            return user;
            
        } catch (error) {
            console.error('❌ Error creating user:', error);
            throw error;
        }
    }

    // Get user by Telegram ID
    async getUserByTelegramId(telegramId) {
        try {
            const cacheKey = `user_telegram_${telegramId}`;
            let user = this.cache.get(cacheKey);
            
            if (!user) {
                const db = this.getDatabase();
                user = await db.get(
                    'SELECT * FROM users WHERE telegram_id = ?',
                    [telegramId]
                );
                
                if (user) {
                    // Cache for 5 minutes
                    this.cache.set(cacheKey, user, 300);
                }
            }
            
            return user;
            
        } catch (error) {
            console.error('❌ Error getting user by telegram ID:', error);
            return null;
        }
    }

    // Get user by referral code
    async getUserByReferralCode(referralCode) {
        try {
            const cacheKey = `user_referral_${referralCode}`;
            let user = this.cache.get(cacheKey);
            
            if (!user) {
                const db = this.getDatabase();
                user = await db.get(
                    'SELECT * FROM users WHERE referral_code = ?',
                    [referralCode]
                );
                
                if (user) {
                    // Cache for 10 minutes
                    this.cache.set(cacheKey, user, 600);
                }
            }
            
            return user;
            
        } catch (error) {
            console.error('❌ Error getting user by referral code:', error);
            return null;
        }
    }

    // Get user by wallet address
    async getUserByWalletAddress(walletAddress) {
        try {
            const cacheKey = `user_wallet_${walletAddress}`;
            let user = this.cache.get(cacheKey);
            
            if (!user) {
                const db = this.getDatabase();
                user = await db.get(
                    'SELECT * FROM users WHERE wallet_address = ?',
                    [walletAddress.toLowerCase()]
                );
                
                if (user) {
                    // Cache for 5 minutes
                    this.cache.set(cacheKey, user, 300);
                }
            }
            
            return user;
            
        } catch (error) {
            console.error('❌ Error getting user by wallet address:', error);
            return null;
        }
    }

    // Update user wallet address
    async updateWalletAddress(telegramId, walletAddress) {
        try {
            const db = this.getDatabase();
            
            // Check if wallet is already used
            const existingUser = await this.getUserByWalletAddress(walletAddress);
            if (existingUser && existingUser.telegram_id !== telegramId) {
                throw new Error('Wallet address is already linked to another account');
            }
            
            await db.run(
                'UPDATE users SET wallet_address = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?',
                [walletAddress.toLowerCase(), telegramId]
            );
            
            // Clear cache
            this.cache.delete(`user_telegram_${telegramId}`);
            this.cache.delete(`user_wallet_${walletAddress.toLowerCase()}`);
            
            console.log(`✅ Updated wallet for user ${telegramId}: ${walletAddress}`);
            return true;
            
        } catch (error) {
            console.error('❌ Error updating wallet address:', error);
            throw error;
        }
    }

    // Update user registration status
    async updateRegistrationStatus(telegramId, registrationData) {
        try {
            const db = this.getDatabase();
            
            await db.run(`
                UPDATE users SET 
                    is_registered = ?, 
                    plan_id = ?, 
                    cycle_number = ?,
                    nft_token_id = ?,
                    registered_at = ?,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE telegram_id = ?
            `, [
                1, // is_registered = true
                registrationData.planId,
                registrationData.cycleNumber,
                registrationData.tokenId || null,
                registrationData.registeredAt || new Date().toISOString(),
                telegramId
            ]);
            
            // Clear cache
            this.cache.delete(`user_telegram_${telegramId}`);
            
            console.log(`✅ Updated registration for user ${telegramId}: Plan ${registrationData.planId}`);
            return true;
            
        } catch (error) {
            console.error('❌ Error updating registration status:', error);
            throw error;
        }
    }

    // Update user earnings
    async updateEarnings(telegramId, amount, type = 'referral') {
        try {
            const db = this.getDatabase();
            
            // Get current earnings
            const user = await this.getUserByTelegramId(telegramId);
            if (!user) {
                throw new Error('User not found');
            }
            
            const currentEarnings = parseFloat(user.total_earnings) || 0;
            const newEarnings = currentEarnings + parseFloat(amount);
            
            await db.run(
                'UPDATE users SET total_earnings = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?',
                [newEarnings.toString(), telegramId]
            );
            
            // Clear cache
            this.cache.delete(`user_telegram_${telegramId}`);
            
            console.log(`✅ Updated earnings for user ${telegramId}: +${amount} USDT (Total: ${newEarnings})`);
            return newEarnings;
            
        } catch (error) {
            console.error('❌ Error updating earnings:', error);
            throw error;
        }
    }

    // Increment referral count
    async incrementReferralCount(userId) {
        try {
            const db = this.getDatabase();
            
            await db.run(
                'UPDATE users SET total_referrals = total_referrals + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [userId]
            );
            
            // Clear related cache
            const user = await db.get('SELECT telegram_id FROM users WHERE id = ?', [userId]);
            if (user) {
                this.cache.delete(`user_telegram_${user.telegram_id}`);
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Error incrementing referral count:', error);
            throw error;
        }
    }

    // Update last activity
    async updateLastActivity(telegramId) {
        try {
            const db = this.getDatabase();
            
            await db.run(
                'UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE telegram_id = ?',
                [telegramId]
            );
            
            // Don't clear cache for this lightweight update
            return true;
            
        } catch (error) {
            console.error('❌ Error updating last activity:', error);
            return false;
        }
    }

    // Get user referrals
    async getUserReferrals(telegramId, limit = 50, offset = 0) {
        try {
            const db = this.getDatabase();
            
            const user = await this.getUserByTelegramId(telegramId);
            if (!user) {
                return [];
            }
            
            const referrals = await db.all(`
                SELECT 
                    u.telegram_id,
                    u.username,
                    u.first_name,
                    u.is_registered,
                    u.plan_id,
                    u.created_at,
                    COALESCE(SUM(r.commission), '0') as total_commission
                FROM users u
                LEFT JOIN referrals r ON u.id = r.referee_id AND r.referrer_id = ?
                WHERE u.upline_id = ?
                GROUP BY u.id
                ORDER BY u.created_at DESC
                LIMIT ? OFFSET ?
            `, [user.id, user.id, limit, offset]);
            
            return referrals;
            
        } catch (error) {
            console.error('❌ Error getting user referrals:', error);
            return [];
        }
    }

    // Get user statistics
    async getUserStats(telegramId) {
        try {
            const cacheKey = `user_stats_${telegramId}`;
            let stats = this.cache.get(cacheKey);
            
            if (!stats) {
                const db = this.getDatabase();
                const user = await this.getUserByTelegramId(telegramId);
                
                if (!user) {
                    return null;
                }
                
                // Get referral statistics
                const referralStats = await db.get(`
                    SELECT 
                        COUNT(*) as total_referrals,
                        COUNT(CASE WHEN is_registered = 1 THEN 1 END) as registered_referrals,
                        COALESCE(SUM(CASE WHEN is_registered = 1 THEN 1 ELSE 0 END), 0) as active_referrals
                    FROM users 
                    WHERE upline_id = ?
                `, [user.id]);
                
                // Get commission statistics
                const commissionStats = await db.get(`
                    SELECT 
                        COALESCE(SUM(commission), '0') as total_commission,
                        COUNT(*) as total_payments,
                        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_payments
                    FROM referrals 
                    WHERE referrer_id = ?
                `, [user.id]);
                
                // Get transaction statistics
                const transactionStats = await db.get(`
                    SELECT 
                        COUNT(*) as total_transactions,
                        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_transactions,
                        COUNT(CASE WHEN type = 'register' THEN 1 END) as registrations,
                        COUNT(CASE WHEN type = 'upgrade' THEN 1 END) as upgrades
                    FROM transactions 
                    WHERE user_id = ?
                `, [user.id]);
                
                stats = {
                    user: {
                        telegram_id: user.telegram_id,
                        username: user.username,
                        first_name: user.first_name,
                        is_registered: user.is_registered,
                        plan_id: user.plan_id,
                        wallet_address: user.wallet_address,
                        total_earnings: user.total_earnings,
                        created_at: user.created_at,
                        registered_at: user.registered_at
                    },
                    referrals: {
                        total: referralStats.total_referrals || 0,
                        registered: referralStats.registered_referrals || 0,
                        active: referralStats.active_referrals || 0
                    },
                    commissions: {
                        total: parseFloat(commissionStats.total_commission) || 0,
                        payments: commissionStats.total_payments || 0,
                        paid_payments: commissionStats.paid_payments || 0
                    },
                    transactions: {
                        total: transactionStats.total_transactions || 0,
                        confirmed: transactionStats.confirmed_transactions || 0,
                        registrations: transactionStats.registrations || 0,
                        upgrades: transactionStats.upgrades || 0
                    }
                };
                
                // Cache for 2 minutes
                this.cache.set(cacheKey, stats, 120);
            }
            
            return stats;
            
        } catch (error) {
            console.error('❌ Error getting user stats:', error);
            return null;
        }
    }

    // Generate unique referral code
    async generateUniqueReferralCode() {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const code = generateReferralCode();
            const existing = await this.getUserByReferralCode(code);
            
            if (!existing) {
                return code;
            }
            
            attempts++;
        }
        
        throw new Error('Failed to generate unique referral code');
    }

    // Get all users (admin function)
    async getAllUsers(limit = 100, offset = 0, filters = {}) {
        try {
            const db = this.getDatabase();
            let query = 'SELECT * FROM users WHERE 1=1';
            const params = [];
            
            // Apply filters
            if (filters.isRegistered !== undefined) {
                query += ' AND is_registered = ?';
                params.push(filters.isRegistered ? 1 : 0);
            }
            
            if (filters.planId) {
                query += ' AND plan_id = ?';
                params.push(filters.planId);
            }
            
            if (filters.status) {
                query += ' AND status = ?';
                params.push(filters.status);
            }
            
            if (filters.hasWallet !== undefined) {
                if (filters.hasWallet) {
                    query += ' AND wallet_address IS NOT NULL';
                } else {
                    query += ' AND wallet_address IS NULL';
                }
            }
            
            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            
            const users = await db.all(query, params);
            
            // Get total count
            let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
            const countParams = [];
            
            if (filters.isRegistered !== undefined) {
                countQuery += ' AND is_registered = ?';
                countParams.push(filters.isRegistered ? 1 : 0);
            }
            
            if (filters.planId) {
                countQuery += ' AND plan_id = ?';
                countParams.push(filters.planId);
            }
            
            if (filters.status) {
                countQuery += ' AND status = ?';
                countParams.push(filters.status);
            }
            
            if (filters.hasWallet !== undefined) {
                if (filters.hasWallet) {
                    countQuery += ' AND wallet_address IS NOT NULL';
                } else {
                    countQuery += ' AND wallet_address IS NULL';
                }
            }
            
            const countResult = await db.get(countQuery, countParams);
            
            return {
                users,
                total: countResult.total,
                hasMore: (offset + users.length) < countResult.total
            };
            
        } catch (error) {
            console.error('❌ Error getting all users:', error);
            return { users: [], total: 0, hasMore: false };
        }
    }

    // Update user status (admin function)
    async updateUserStatus(telegramId, status) {
        try {
            const db = this.getDatabase();
            
            await db.run(
                'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?',
                [status, telegramId]
            );
            
            // Clear cache
            this.cache.delete(`user_telegram_${telegramId}`);
            
            console.log(`✅ Updated status for user ${telegramId}: ${status}`);
            return true;
            
        } catch (error) {
            console.error('❌ Error updating user status:', error);
            throw error;
        }
    }

    // Get platform statistics
    async getPlatformStats() {
        try {
            const cacheKey = 'platform_stats';
            let stats = this.cache.get(cacheKey);
            
            if (!stats) {
                const db = this.getDatabase();
                
                // User statistics
                const userStats = await db.get(`
                    SELECT 
                        COUNT(*) as total_users,
                        COUNT(CASE WHEN is_registered = 1 THEN 1 END) as registered_users,
                        COUNT(CASE WHEN wallet_address IS NOT NULL THEN 1 END) as users_with_wallet,
                        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
                        COUNT(CASE WHEN created_at >= datetime('now', '-24 hours') THEN 1 END) as new_users_24h,
                        COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as new_users_7d
                    FROM users
                `);
                
                // Plan distribution
                const planStats = await db.all(`
                    SELECT 
                        plan_id,
                        COUNT(*) as user_count
                    FROM users 
                    WHERE is_registered = 1 AND plan_id > 0
                    GROUP BY plan_id
                    ORDER BY plan_id
                `);
                
                // Transaction statistics
                const transactionStats = await db.get(`
                    SELECT 
                        COUNT(*) as total_transactions,
                        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_transactions,
                        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
                        COUNT(CASE WHEN type = 'register' THEN 1 END) as registrations,
                        COUNT(CASE WHEN type = 'upgrade' THEN 1 END) as upgrades,
                        COUNT(CASE WHEN created_at >= datetime('now', '-24 hours') THEN 1 END) as transactions_24h
                    FROM transactions
                `);
                
                // Referral statistics
                const referralStats = await db.get(`
                    SELECT 
                        COUNT(*) as total_referrals,
                        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_referrals,
                        COALESCE(SUM(commission), '0') as total_commission_paid
                    FROM referrals
                `);
                
                stats = {
                    users: userStats,
                    plans: planStats,
                    transactions: transactionStats,
                    referrals: referralStats,
                    updated_at: new Date().toISOString()
                };
                
                // Cache for 5 minutes
                this.cache.set(cacheKey, stats, 300);
            }
            
            return stats;
            
        } catch (error) {
            console.error('❌ Error getting platform stats:', error);
            return null;
        }
    }

    // Cleanup inactive users (maintenance function)
    async cleanupInactiveUsers(daysInactive = 90) {
        try {
            const db = this.getDatabase();
            
            const result = await db.run(`
                UPDATE users 
                SET status = 'inactive' 
                WHERE status = 'active' 
                AND last_activity < datetime('now', '-' || ? || ' days')
                AND is_registered = 0
            `, [daysInactive]);
            
            console.log(`✅ Marked ${result.changes} users as inactive`);
            return result.changes;
            
        } catch (error) {
            console.error('❌ Error cleaning up inactive users:', error);
            return 0;
        }
    }
}

module.exports = UserService;