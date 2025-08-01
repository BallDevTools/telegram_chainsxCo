const { Telegraf } = require('telegraf');
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

// Import configurations
const { initializeDatabase } = require('./config/database');
const { initializeBot } = require('./bot/index');
const BlockchainService = require('./services/BlockchainService');
const PerformanceDashboard = require('./utils/performance');
const AlertSystem = require('./utils/alerts');

class CryptoBotApplication {
    constructor() {
        this.bot = null;
        this.webServer = null;
        this.blockchain = null;
        this.dashboard = new PerformanceDashboard();
        this.alerts = new AlertSystem();
        this.isShuttingDown = false;
        
        // Bind shutdown handlers
        this.setupGracefulShutdown();
        
        // Enable garbage collection if available
        if (global.gc) {
            console.log('♻️ Garbage collection enabled');
        }
    }

    async initialize() {
        try {
            console.log('🚀 Starting Crypto Membership Bot...');
            console.log(`📊 Node.js: ${process.version}, Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
            
            // 1. Initialize Database
            console.log('📁 Initializing database...');
            await initializeDatabase();
            
            // 2. Initialize Blockchain Service
            console.log('⛓️ Connecting to blockchain...');
            this.blockchain = new BlockchainService();
            await this.blockchain.initialize();
            
            // 3. Initialize Bot
            console.log('🤖 Initializing Telegram bot...');
            this.bot = await initializeBot();
            
            // 4. Setup Web Server (Health checks & Metrics)
            console.log('🌐 Starting web server...');
            await this.setupWebServer();
            
            // 5. Start Performance Monitoring
            console.log('📊 Starting performance monitoring...');
            this.startMonitoring();
            
            // 6. Start Bot
            console.log('✅ Bot initialization complete!');
            await this.bot.launch();
            
            console.log(`🎉 Crypto Membership Bot is running!`);
            console.log(`📱 Bot: @${process.env.BOT_USERNAME}`);
            console.log(`🌐 Health: http://localhost:${process.env.PORT || 3000}/health`);
            console.log(`📊 Metrics: http://localhost:${process.env.METRICS_PORT || 3001}/metrics`);
            
        } catch (error) {
            console.error('❌ Failed to initialize bot:', error);
            await this.shutdown(1);
        }
    }

    async setupWebServer() {
        const app = express();
        const port = process.env.PORT || 3000;
        
        // Security middleware
        app.use(helmet());
        app.use(compression());
        app.use(cors());
        app.use(express.json({ limit: '1mb' }));
        
        // Rate limiting middleware
        const rateLimit = require('./bot/middleware/rateLimit');
        app.use(rateLimit);
        
        // Health check endpoint
        app.get('/health', (req, res) => {
            const status = this.dashboard.getSystemStatus();
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: status.uptime,
                memory: status.memory,
                performance: status.performance,
                blockchain: this.blockchain.getStatus(),
                database: 'connected'
            };
            
            res.json(health);
        });
        
        // Metrics endpoint
        app.get('/metrics', (req, res) => {
            const metrics = this.dashboard.getDetailedMetrics();
            res.json(metrics);
        });
        
        // Webhook endpoint (optional)
        if (process.env.WEBHOOK_URL) {
            const webhookPath = `/webhook/${process.env.BOT_TOKEN}`;
            app.use(webhookPath, (req, res) => {
                this.bot.handleUpdate(req.body, res);
            });
            
            // Set webhook
            await this.bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}${webhookPath}`);
            console.log('🔗 Webhook configured');
        }
        
        // 404 handler
        app.use('*', (req, res) => {
            res.status(404).json({ error: 'Not found' });
        });
        
        // Global error handler
        app.use((err, req, res, next) => {
            console.error('Web server error:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
        
        // Start server
        this.webServer = app.listen(port, process.env.HOST || '0.0.0.0', () => {
            console.log(`🌐 Web server running on port ${port}`);
        });
        
        // Setup metrics server if different port
        const metricsPort = process.env.METRICS_PORT;
        if (metricsPort && metricsPort !== port) {
            const metricsApp = express();
            metricsApp.get('/metrics', (req, res) => {
                const metrics = this.dashboard.getDetailedMetrics();
                res.json(metrics);
            });
            
            metricsApp.listen(metricsPort, () => {
                console.log(`📊 Metrics server running on port ${metricsPort}`);
            });
        }
    }

    startMonitoring() {
        // Performance monitoring every 30 seconds
        setInterval(() => {
            this.dashboard.recordMetrics();
            this.alerts.checkAlerts(this.dashboard.getSystemStatus());
        }, 30000);
        
        // Garbage collection every 5 minutes
        setInterval(() => {
            if (global.gc) {
                const memoryBefore = process.memoryUsage().rss;
                global.gc();
                const memoryAfter = process.memoryUsage().rss;
                const freed = memoryBefore - memoryAfter;
                
                if (freed > 50 * 1024 * 1024) { // More than 50MB freed
                    console.log(`♻️ GC freed ${Math.round(freed / 1024 / 1024)}MB`);
                }
            }
        }, 5 * 60 * 1000);
        
        // Blockchain event monitoring
        setInterval(async () => {
            try {
                await this.blockchain.processNewEvents();
            } catch (error) {
                console.error('❌ Blockchain monitoring error:', error);
            }
        }, 10000); // Every 10 seconds
        
        // Database optimization every hour
        setInterval(async () => {
            try {
                const db = require('./config/database').getDatabase();
                await db.exec('PRAGMA optimize');
                console.log('🗄️ Database optimized');
            } catch (error) {
                console.error('❌ Database optimization error:', error);
            }
        }, 60 * 60 * 1000);
    }

    setupGracefulShutdown() {
        const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
        
        signals.forEach(signal => {
            process.on(signal, async () => {
                console.log(`\n📴 Received ${signal}, starting graceful shutdown...`);
                await this.shutdown(0);
            });
        });
        
        process.on('uncaughtException', async (error) => {
            console.error('💥 Uncaught Exception:', error);
            await this.shutdown(1);
        });
        
        process.on('unhandledRejection', async (reason, promise) => {
            console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            await this.shutdown(1);
        });
    }

    async shutdown(exitCode = 0) {
        if (this.isShuttingDown) {
            console.log('⏳ Shutdown already in progress...');
            return;
        }
        
        this.isShuttingDown = true;
        console.log('🛑 Shutting down gracefully...');
        
        try {
            // Stop accepting new requests
            if (this.webServer) {
                this.webServer.close();
                console.log('🌐 Web server stopped');
            }
            
            // Stop bot
            if (this.bot) {
                this.bot.stop('SIGTERM');
                console.log('🤖 Bot stopped');
            }
            
            // Close blockchain connections
            if (this.blockchain) {
                await this.blockchain.cleanup();
                console.log('⛓️ Blockchain connections closed');
            }
            
            // Close database
            const db = require('./config/database').getDatabase();
            if (db) {
                await db.close();
                console.log('🗄️ Database closed');
            }
            
            console.log('✅ Graceful shutdown complete');
            
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
        } finally {
            process.exit(exitCode);
        }
    }
}

// Create and start the application
const app = new CryptoBotApplication();

// Handle startup
app.initialize().catch(async (error) => {
    console.error('💥 Failed to start application:', error);
    await app.shutdown(1);
});

module.exports = app;