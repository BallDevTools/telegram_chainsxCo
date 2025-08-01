const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

class DatabaseConfig {
    constructor() {
        this.dbPath = process.env.DATABASE_PATH || './database/bot.db';
        this.schemaPath = path.join(__dirname, '../../database/schema.sql');
        this.db = null;
    }

    async initialize() {
        try {
            // Ensure database directory exists
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Open database connection
            this.db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });

            // Enable foreign keys and performance optimizations
            await this.db.exec('PRAGMA foreign_keys = ON');
            await this.db.exec('PRAGMA journal_mode = WAL');
            await this.db.exec('PRAGMA synchronous = NORMAL');
            await this.db.exec('PRAGMA cache_size = 10000');
            await this.db.exec('PRAGMA temp_store = MEMORY');

            // Initialize schema
            await this.initializeSchema();

            console.log('✅ Database initialized successfully');
            return this.db;

        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    async initializeSchema() {
        try {
            // Create basic tables if they don't exist
            await this.createBasicTables();
            
            console.log('✅ Database schema initialized');
        } catch (error) {
            console.error('❌ Schema initialization failed:', error);
            throw error;
        }
    }

    async createBasicTables() {
        // Users table
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id TEXT UNIQUE NOT NULL,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                language_code TEXT DEFAULT 'en',
                
                -- Wallet & Blockchain Data
                wallet_address TEXT UNIQUE,
                referral_code TEXT UNIQUE NOT NULL,
                upline_id INTEGER,
                
                -- Membership Data
                is_registered BOOLEAN DEFAULT 0,
                plan_id INTEGER DEFAULT 0,
                cycle_number INTEGER DEFAULT 0,
                token_id TEXT,
                nft_token_id INTEGER,
                
                -- Stats
                total_referrals INTEGER DEFAULT 0,
                total_earnings TEXT DEFAULT '0',
                total_paid TEXT DEFAULT '0',
                
                -- Status & Timestamps
                status TEXT DEFAULT 'active',
                registered_at DATETIME,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (upline_id) REFERENCES users (id)
            )
        `);

        // Indexes for users table
        await this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_telegram ON users (telegram_id)');
        await this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_wallet ON users (wallet_address)');
        await this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_referral ON users (referral_code)');
        await this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_upline ON users (upline_id)');

        // Transactions table
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                tx_hash TEXT UNIQUE,
                type TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                amount TEXT NOT NULL,
                plan_id INTEGER,
                from_plan_id INTEGER,
                to_plan_id INTEGER,
                gas_used TEXT,
                gas_price TEXT,
                block_number INTEGER,
                confirmations INTEGER DEFAULT 0,
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                confirmed_at DATETIME,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Indexes for transactions table
        await this.db.exec('CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions (user_id)');
        await this.db.exec('CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions (status)');
        await this.db.exec('CREATE INDEX IF NOT EXISTS idx_tx_hash ON transactions (tx_hash)');

        // Referrals table
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                referrer_id INTEGER NOT NULL,
                referee_id INTEGER NOT NULL,
                commission TEXT DEFAULT '0',
                plan_level INTEGER NOT NULL,
                tx_hash TEXT,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                paid_at DATETIME,
                
                FOREIGN KEY (referrer_id) REFERENCES users (id),
                FOREIGN KEY (referee_id) REFERENCES users (id),
                UNIQUE(referrer_id, referee_id, plan_level)
            )
        `);

        // Bot sessions table
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS bot_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id TEXT NOT NULL,
                session_data TEXT,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Plans cache table
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS plans_cache (
                plan_id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                price TEXT NOT NULL,
                members_per_cycle INTEGER NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                image_uri TEXT,
                current_cycle INTEGER DEFAULT 1,
                members_in_current_cycle INTEGER DEFAULT 0,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert default plans data
        await this.insertDefaultPlans();

        // Blockchain events table
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS blockchain_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                contract_address TEXT NOT NULL,
                tx_hash TEXT NOT NULL,
                block_number INTEGER NOT NULL,
                user_address TEXT,
                telegram_id TEXT,
                event_data TEXT,
                processed BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                processed_at DATETIME
            )
        `);

        // Metrics table
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_name TEXT NOT NULL,
                metric_value TEXT NOT NULL,
                tags TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Admin actions log
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS admin_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_telegram_id TEXT NOT NULL,
                action TEXT NOT NULL,
                target_user_id INTEGER,
                details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (target_user_id) REFERENCES users (id)
            )
        `);

        // Notification log
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS notification_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id TEXT NOT NULL,
                message TEXT NOT NULL,
                success BOOLEAN NOT NULL,
                error TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create triggers for auto-updating timestamps
        await this.db.exec(`
            CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
                AFTER UPDATE ON users
            BEGIN
                UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        `);

        await this.db.exec(`
            CREATE TRIGGER IF NOT EXISTS update_transactions_timestamp 
                AFTER UPDATE ON transactions
            BEGIN
                UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        `);
    }

    async insertDefaultPlans() {
        // Check if plans already exist
        const existingPlans = await this.db.get('SELECT COUNT(*) as count FROM plans_cache');
        if (existingPlans.count > 0) {
            return; // Plans already inserted
        }

        const plans = [
            { plan_id: 1, name: 'Starter', price: '1000000', members_per_cycle: 4 },
            { plan_id: 2, name: 'Basic', price: '2000000', members_per_cycle: 4 },
            { plan_id: 3, name: 'Bronze', price: '3000000', members_per_cycle: 4 },
            { plan_id: 4, name: 'Silver', price: '4000000', members_per_cycle: 4 },
            { plan_id: 5, name: 'Gold', price: '5000000', members_per_cycle: 4 },
            { plan_id: 6, name: 'Platinum', price: '6000000', members_per_cycle: 4 },
            { plan_id: 7, name: 'Diamond', price: '7000000', members_per_cycle: 4 },
            { plan_id: 8, name: 'Elite', price: '8000000', members_per_cycle: 4 },
            { plan_id: 9, name: 'Master', price: '9000000', members_per_cycle: 4 },
            { plan_id: 10, name: 'Grand Master', price: '10000000', members_per_cycle: 4 },
            { plan_id: 11, name: 'Champion', price: '11000000', members_per_cycle: 4 },
            { plan_id: 12, name: 'Legend', price: '12000000', members_per_cycle: 4 },
            { plan_id: 13, name: 'Supreme', price: '13000000', members_per_cycle: 5 },
            { plan_id: 14, name: 'Ultimate', price: '14000000', members_per_cycle: 5 },
            { plan_id: 15, name: 'Apex', price: '15000000', members_per_cycle: 5 },
            { plan_id: 16, name: 'Infinity', price: '16000000', members_per_cycle: 5 }
        ];

        for (const plan of plans) {
            await this.db.run(`
                INSERT OR IGNORE INTO plans_cache 
                (plan_id, name, price, members_per_cycle) 
                VALUES (?, ?, ?, ?)
            `, [plan.plan_id, plan.name, plan.price, plan.members_per_cycle]);
        }

        console.log('✅ Default plans inserted');
    }

    getDatabase() {
        if (!this.db) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }

    async close() {
        if (this.db) {
            await this.db.close();
            console.log('✅ Database connection closed');
        }
    }

    // Health check
    async healthCheck() {
        try {
            await this.db.get('SELECT 1');
            return { status: 'healthy', timestamp: new Date().toISOString() };
        } catch (error) {
            return { 
                status: 'unhealthy', 
                error: error.message, 
                timestamp: new Date().toISOString() 
            };
        }
    }

    // Get database stats
    async getStats() {
        try {
            const stats = await this.db.all(`
                SELECT 
                    'users' as table_name,
                    COUNT(*) as count
                FROM users
                UNION ALL
                SELECT 
                    'transactions' as table_name,
                    COUNT(*) as count
                FROM transactions
                UNION ALL
                SELECT 
                    'referrals' as table_name,
                    COUNT(*) as count
                FROM referrals
            `);

            return stats.reduce((acc, stat) => {
                acc[stat.table_name] = stat.count;
                return acc;
            }, {});

        } catch (error) {
            console.error('❌ Error getting database stats:', error);
            return {};
        }
    }

    // Optimize database
    async optimize() {
        try {
            await this.db.exec('VACUUM');
            await this.db.exec('ANALYZE');
            console.log('✅ Database optimized');
        } catch (error) {
            console.error('❌ Database optimization failed:', error);
        }
    }
}

// Create singleton instance
let databaseInstance = null;

async function initializeDatabase() {
    if (!databaseInstance) {
        databaseInstance = new DatabaseConfig();
        await databaseInstance.initialize();
    }
    return databaseInstance.getDatabase();
}

function getDatabase() {
    if (!databaseInstance) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return databaseInstance.getDatabase();
}

async function closeDatabase() {
    if (databaseInstance) {
        await databaseInstance.close();
        databaseInstance = null;
    }
}

module.exports = {
    DatabaseConfig,
    initializeDatabase,
    getDatabase,
    closeDatabase
};