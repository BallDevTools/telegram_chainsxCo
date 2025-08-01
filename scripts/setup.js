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
            await this.setupLogRotation();
            await this.createSystemdService();
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
            missing.forEach(var => console.log(`  - ${var}`));
            
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
            warnings.forEach(var => console.log(`  - ${var}`));
        }
        
        console.log('✅ Environment variables configured');
    }

    async initializeDatabase() {
        console.log('🗄️ Initializing database...');
        
        try {
            const { initializeDatabase } = require('../src/config/database');
            await initializeDatabase();
            console.log('✅ Database initialized successfully');
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            throw error;
        }
    }

    async testBlockchainConnection() {
        console.log('⛓️ Testing blockchain connection...');
        
        try {
            const BlockchainService = require('../src/services/BlockchainService');
            const blockchain = new BlockchainService();
            
            await blockchain.initialize();
            
            // Test contract calls
            const planInfo = await blockchain.getPlanInfo(1);
            if (!planInfo) {
                throw new Error('Failed to retrieve plan information from contract');
            }
            
            console.log(`✅ Connected to BSC Testnet`);
            console.log(`✅ Contract accessible: ${process.env.NFT_CONTRACT_ADDRESS.slice(0, 6)}...`);
            console.log(`✅ Plan 1: ${planInfo.name} - ${planInfo.priceFormatted} USDT`);
            
            await blockchain.cleanup();
            
        } catch (error) {
            console.error('❌ Blockchain connection failed:', error.message);
            console.log('\n🔧 Troubleshooting:');
            console.log('1. Check your RPC_URL is accessible');
            console.log('2. Verify contract addresses are correct');
            console.log('3. Ensure private key has sufficient BNB for gas');
            throw error;
        }
    }

    async setupLogRotation() {
        console.log('📝 Setting up log rotation...');
        
        try {
            const logrotateConfig = `
/var/www/crypto-bot/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
`;
            
            const logrotateDir = '/etc/logrotate.d';
            if (fs.existsSync(logrotateDir)) {
                fs.writeFileSync(
                    path.join(logrotateDir, 'crypto-bot'),
                    logrotateConfig.trim()
                );
                console.log('✅ Log rotation configured');
            } else {
                console.log('⚠️ Logrotate not available, skipping');
            }
            
        } catch (error) {
            console.log('⚠️ Log rotation setup failed (non-critical):', error.message);
        }
    }

    async createSystemdService() {
        console.log('⚙️ Creating systemd service...');
        
        try {
            const serviceConfig = `
[Unit]
Description=Crypto Membership Bot
After=network.target
StartLimitBurst=5
StartLimitIntervalSec=10

[Service]
Type=forking
User=root
WorkingDirectory=/var/www/crypto-bot
ExecStart=/usr/bin/pm2 start ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 reload ecosystem.config.js --env production
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
PIDFile=/root/.pm2/pm2.pid
Restart=on-failure
RestartSec=10
KillMode=process

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/www/crypto-bot
ProtectHome=true

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
`;
            
            const systemdDir = '/etc/systemd/system';
            if (fs.existsSync(systemdDir)) {
                fs.writeFileSync(
                    path.join(systemdDir, 'crypto-bot.service'),
                    serviceConfig.trim()
                );
                
                // Reload systemd and enable service
                execSync('systemctl daemon-reload');
                execSync('systemctl enable crypto-bot');
                
                console.log('✅ Systemd service created and enabled');
                console.log('   Start: sudo systemctl start crypto-bot');
                console.log('   Status: sudo systemctl status crypto-bot');
                console.log('   Logs: sudo journalctl -u crypto-bot -f');
                
            } else {
                console.log('⚠️ Systemd not available, skipping service creation');
            }
            
        } catch (error) {
            console.log('⚠️ Systemd service creation failed (non-critical):', error.message);
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
        
        // Check database file permissions
        const dbPath = path.join(this.projectRoot, 'database', 'bot.db');
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            console.log(`✅ Database file: ${(stats.size / 1024).toFixed(1)} KB`);
        }
        
        // Check log directory permissions
        const logsPath = path.join(this.projectRoot, 'logs');
        try {
            fs.accessSync(logsPath, fs.constants.W_OK);
            console.log('✅ Logs directory writable');
        } catch (error) {
            console.log('⚠️ Logs directory not writable');
        }
        
        // Memory check
        const totalMemory = require('os').totalmem();
        const totalMemoryGB = (totalMemory / 1024 / 1024 / 1024).toFixed(1);
        console.log(`💾 System memory: ${totalMemoryGB} GB`);
        
        if (totalMemory < 1.8 * 1024 * 1024 * 1024) { // Less than 1.8GB
            console.log('⚠️ Low memory detected. Consider upgrading server for better performance.');
        }
        
        console.log('✅ All checks completed');
    }

    // Helper methods for interactive setup
    async promptUser(question) {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            rl.question(question, (answer) => {
                rl.close();
                resolve(answer);
            });
        });
    }

    generateSecureKey(length = 32) {
        const crypto = require('crypto');
        return crypto.randomBytes(length).toString('hex');
    }
}

// Run setup if called directly
if (require.main === module) {
    const setup = new SetupScript();
    setup.run().catch(console.error);
}

module.exports = SetupScript;