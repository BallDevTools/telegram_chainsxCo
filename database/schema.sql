-- Enable performance optimizations
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456; -- 256MB mmap
PRAGMA optimize;

-- Users table with optimized indexes
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    language_code TEXT DEFAULT 'en',
    
    -- Wallet & Blockchain Data
    wallet_address TEXT UNIQUE,
    private_key_encrypted TEXT, -- For user wallets (optional)
    referral_code TEXT UNIQUE NOT NULL,
    upline_id INTEGER,
    
    -- Membership Data (denormalized for performance)
    is_registered BOOLEAN DEFAULT 0,
    plan_id INTEGER DEFAULT 0,
    cycle_number INTEGER DEFAULT 0,
    token_id TEXT,
    nft_token_id INTEGER,
    
    -- Stats (denormalized for performance)
    total_referrals INTEGER DEFAULT 0,
    total_earnings TEXT DEFAULT '0', -- Store as string for precision
    total_paid TEXT DEFAULT '0',
    
    -- Status & Timestamps
    status TEXT DEFAULT 'active', -- active, inactive, banned
    registered_at DATETIME,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (upline_id) REFERENCES users (id)
);

-- Performance indexes for users
CREATE INDEX IF NOT EXISTS idx_users_telegram ON users (telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users (wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_referral ON users (referral_code);
CREATE INDEX IF NOT EXISTS idx_users_upline ON users (upline_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users (is_registered, plan_id);
CREATE INDEX IF NOT EXISTS idx_users_activity ON users (last_activity);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tx_hash TEXT UNIQUE,
    type TEXT NOT NULL, -- 'register', 'upgrade', 'withdraw', 'referral'
    status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'
    amount TEXT NOT NULL, -- Store as string for precision
    plan_id INTEGER,
    from_plan_id INTEGER, -- For upgrades
    to_plan_id INTEGER, -- For upgrades
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
);

-- Performance indexes for transactions
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions (status);
CREATE INDEX IF NOT EXISTS idx_tx_hash ON transactions (tx_hash);
CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions (created_at);
CREATE INDEX IF NOT EXISTS idx_tx_pending ON transactions (status, created_at) WHERE status = 'pending';

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referee_id INTEGER NOT NULL,
    commission TEXT DEFAULT '0',
    plan_level INTEGER NOT NULL,
    tx_hash TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME,
    
    FOREIGN KEY (referrer_id) REFERENCES users (id),
    FOREIGN KEY (referee_id) REFERENCES users (id),
    UNIQUE(referrer_id, referee_id, plan_level)
);

-- Performance indexes for referrals
CREATE INDEX IF NOT EXISTS idx_ref_referrer ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_ref_referee ON referrals (referee_id);
CREATE INDEX IF NOT EXISTS idx_ref_status ON referrals (status);

-- Bot sessions for conversation state
CREATE TABLE IF NOT EXISTS bot_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT NOT NULL,
    session_data TEXT, -- JSON data
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_telegram ON bot_sessions (telegram_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON bot_sessions (expires_at);

-- Plans cache table (for performance)
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
);

-- Blockchain events log
CREATE TABLE IF NOT EXISTS blockchain_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL, -- 'MemberRegistered', 'PlanUpgraded', etc.
    contract_address TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    block_number INTEGER NOT NULL,
    user_address TEXT,
    telegram_id TEXT,
    event_data TEXT, -- JSON data
    processed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_events_type ON blockchain_events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_processed ON blockchain_events (processed);
CREATE INDEX IF NOT EXISTS idx_events_tx ON blockchain_events (tx_hash);
CREATE INDEX IF NOT EXISTS idx_events_user ON blockchain_events (user_address);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    metric_value TEXT NOT NULL,
    tags TEXT, -- JSON tags
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics (metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics (timestamp);

-- Admin actions log
CREATE TABLE IF NOT EXISTS admin_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_telegram_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_user_id INTEGER,
    details TEXT, -- JSON details
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (target_user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions (admin_telegram_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions (created_at);

-- Triggers for auto-updating timestamps
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_transactions_timestamp 
    AFTER UPDATE ON transactions
BEGIN
    UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_sessions_timestamp 
    AFTER UPDATE ON bot_sessions
BEGIN
    UPDATE bot_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Views for common queries
CREATE VIEW IF NOT EXISTS active_members AS
SELECT 
    u.*,
    COUNT(r.id) as direct_referrals
FROM users u
LEFT JOIN referrals r ON u.id = r.referrer_id
WHERE u.is_registered = 1 AND u.status = 'active'
GROUP BY u.id;

CREATE VIEW IF NOT EXISTS pending_transactions AS
SELECT 
    t.*,
    u.telegram_id,
    u.wallet_address
FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE t.status = 'pending'
ORDER BY t.created_at ASC;

-- Initialize default data
INSERT OR IGNORE INTO plans_cache (plan_id, name, price, members_per_cycle) VALUES
(1, 'Starter', '1000000', 4),
(2, 'Basic', '2000000', 4),
(3, 'Bronze', '3000000', 4),
(4, 'Silver', '4000000', 4),
(5, 'Gold', '5000000', 4),
(6, 'Platinum', '6000000', 4),
(7, 'Diamond', '7000000', 4),
(8, 'Elite', '8000000', 4),
(9, 'Master', '9000000', 4),
(10, 'Grand Master', '10000000', 4),
(11, 'Champion', '11000000', 4),
(12, 'Legend', '12000000', 4),
(13, 'Supreme', '13000000', 5),
(14, 'Ultimate', '14000000', 5),
(15, 'Apex', '15000000', 5),
(16, 'Infinity', '16000000', 5);

-- Cleanup old sessions (run periodically)
CREATE TRIGGER IF NOT EXISTS cleanup_old_sessions
    AFTER INSERT ON bot_sessions
BEGIN
    DELETE FROM bot_sessions 
    WHERE expires_at < datetime('now', '-1 day');
END;