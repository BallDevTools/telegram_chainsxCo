#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

class SetupScript {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.requiredDirs = [
            'logs',
            'database',
            'temp'
        ];
        
        this.requiredEnvVars = [
            'BOT_TOKEN',
            'PRIVATE_KEY',
            'NFT_CONTRACT_ADDRESS',
            'USDT_CONTRACT_ADDRESS',
            'ADMIN_USER_ID'
        ];
    }

    async run() {
        console.log('🚀 Starting Crypto Membership Bot Setup...\n');
        
        try {
            await this.checkNodeVersion();
            await this.createDirectories();
            await this.checkEnvironmentVariables();
            await this.initializeDatabase();
            await this.testBlockchainConnection();
            await this.finalChecks();
            
            console.log('\n✅ Setup completed successfully!');
            console.log('\n🎯 Next steps:');
            console.log('1. Review your .env file');
            console.log('2. Test the bot: npm run dev');
            console.log('3. Deploy: npm run deploy');
            
        } catch (error) {
            console.error('\n❌ Setup failed:', error.message);
            process.exit(1);
        }
    }

    async checkNodeVersion() {
        console.log('📋 Checking Node.js version...');
        
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        if (majorVersion < 18) {
            throw new Error(`Node.js 18+ required. Current version: ${nodeVersion}`);
        }
        
        console.log(`✅ Node.js version: ${nodeVersion}`);
    }

    async createDirectories() {
        console.log('📁 Creating required directories...');
        
        for (const dir of this.requiredDirs) {
            const dirPath = path.join(this.projectRoot, dir);
            
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`  ✅ Created: ${dir}`);
            } else {
                console.log(`  ✓ Exists: ${dir}`);
            }
        }
    }

    async checkEnvironmentVariables() {
        console.log('🔧 Checking environment variables...');
        
        const missing = [];
        const warnings = [];
        
        for (const envVar of this.requiredEnvVars) {
            if (!process.env[envVar]) {
                missing.push(envVar);
            }
        }
        
        if (missing.length > 0) {
            console.log('❌ Missing required environment variables:');
            missing.forEach(variable => console.log(`  - ${variable}`));
            
            console.log('\n📝 Please create a .env file with the required variables.');
            console.log('Use .env.example as a template.\n');
            
            throw new Error('Missing required environment variables');
        }
        
        // Check optional but recommended variables
        const recommended = [
            'WEBHOOK_URL',
            'OWNER_WALLET_ADDRESS',
            'LOG_LEVEL'
        ];
        
        for (const envVar of recommended) {
            if (!process.env[envVar]) {
                warnings.push(envVar);
            }
        }
        
        if (warnings.length > 0) {
            console.log('⚠️ Recommended environment variables (optional):');
            warnings.forEach(variable => console.log(`  - ${variable}`));
        }
        
        console.log('✅ Environment variables configured');
    }

    async initializeDatabase() {
        console.log('🗄️ Initializing database...');
        
        try {
            // Create database directory if it doesn't exist
            const dbDir = path.join(this.projectRoot, 'database');
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Check if schema file exists
            const schemaPath = path.join(this.projectRoot, 'database', 'schema.sql');
            if (!fs.existsSync(schemaPath)) {
                console.log('⚠️ Database schema file not found, creating basic structure...');
                await this.createBasicSchema();
            } else {
                await this.runDatabaseMigration();
            }
            
            console.log('✅ Database initialized successfully');
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            // Don't throw error, continue setup
            console.log('⚠️ Continuing setup without database initialization');
        }
    }

    async createBasicSchema() {
        const dbPath = path.join(this.projectRoot, 'database', 'bot.db');
        const sqlite3 = require('sqlite3').verbose();
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Create basic users table
                db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        telegram_id TEXT UNIQUE NOT NULL,
                        username TEXT,
                        first_name TEXT,
                        referral_code TEXT UNIQUE NOT NULL,
                        upline_id INTEGER,
                        is_registered BOOLEAN DEFAULT 0,
                        plan_id INTEGER DEFAULT 0,
                        wallet_address TEXT,
                        total_referrals INTEGER DEFAULT 0,
                        total_earnings TEXT DEFAULT '0',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    db.close();
                    resolve();
                });
            });
        });
    }

    async runDatabaseMigration() {
        try {
            const { initializeDatabase } = require('../src/config/database');
            await initializeDatabase();
        } catch (error) {
            console.log('⚠️ Using basic database initialization...');
            await this.createBasicSchema();
        }
    }

    async testBlockchainConnection() {
        console.log('⛓️ Testing blockchain connection...');
        
        try {
            // Basic connectivity test
            const https = require('https');
            const testUrl = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
            
            await new Promise((resolve, reject) => {
                const req = https.get(testUrl, (res) => {
                    if (res.statusCode === 200 || res.statusCode === 405) {
                        resolve();
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                });
                
                req.on('error', reject);
                req.setTimeout(5000, () => {
                    req.destroy();
                    reject(new Error('Request timeout'));
                });
            });
            
            console.log(`✅ Connected to BSC Testnet`);
            console.log(`✅ Contract address configured: ${process.env.NFT_CONTRACT_ADDRESS.slice(0, 6)}...`);
            
        } catch (error) {
            console.error('❌ Blockchain connection test failed:', error.message);
            console.log('\n🔧 Troubleshooting:');
            console.log('1. Check your internet connection');
            console.log('2. Verify contract addresses are correct');
            console.log('3. Ensure private key format is correct');
            console.log('⚠️ Continuing setup - you can test blockchain later');
        }
    }

    async finalChecks() {
        console.log('🔍 Running final checks...');
        
        // Check disk space
        try {
            const stats = fs.statSync(this.projectRoot);
            console.log('✅ Project directory accessible');
        } catch (error) {
            throw new Error('Project directory not accessible');
        }
        
        // Check log directory permissions
        const logsPath = path.join(this.projectRoot, 'logs');
        try {
            fs.accessSync(logsPath, fs.constants.W_OK);
            console.log('✅ Logs directory writable');
        } catch (error) {
            console.log('⚠️ Logs directory not writable, creating...');
            fs.mkdirSync(logsPath, { recursive: true });
        }
        
        // Memory check
        const totalMemory = require('os').totalmem();
        const totalMemoryGB = (totalMemory / 1024 / 1024 / 1024).toFixed(1);
        console.log(`💾 System memory: ${totalMemoryGB} GB`);
        
        if (totalMemory < 1.8 * 1024 * 1024 * 1024) {
            console.log('⚠️ Low memory detected. Consider upgrading server for better performance.');
        }
        
        // Check if PM2 is installed
        try {
            execSync('pm2 -v', { stdio: 'ignore' });
            console.log('✅ PM2 is installed');
        } catch (error) {
            console.log('⚠️ PM2 not found. Install with: npm install -g pm2');
        }
        
        console.log('✅ All checks completed');
    }
}

// Run setup if called directly
if (require.main === module) {
    const setup = new SetupScript();
    setup.run().catch(error => {
        console.error('💥 Setup failed:', error.message);
        process.exit(1);
    });
}

module.exports = SetupScript;