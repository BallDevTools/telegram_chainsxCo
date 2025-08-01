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

        this.setupGracefulShutdown();

        if (global.gc) {
            console.log('♻️ Garbage collection enabled');
        }
    }

    async initialize() {
        try {
            console.log('🚀 Starting Crypto Membership Bot...');
            console.log(`📊 Node.js: ${process.version}, Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);

            // 1. DB
            console.log('📁 Initializing database...');
            await initializeDatabase();

            // 2. Blockchain
            console.log('⛓️ Connecting to blockchain...');
            this.blockchain = new BlockchainService();
            await this.blockchain.initialize();

            // 3. Bot
            console.log('🤖 Initializing Telegram bot...');
            this.bot = await initializeBot();

            // 4. Webhook URL
            const domain = process.env.WEBHOOK_DOMAIN;
            const path = `/telegram`;
            await this.bot.telegram.setWebhook(`${domain}${path}`);
            console.log(`🔗 Webhook set to ${domain}${path}`);

            // 5. Web Server
            console.log('🌐 Starting web server...');
            await this.setupWebServer(path);

            // 6. Monitor
            console.log('📊 Starting performance monitoring...');
            this.startMonitoring();

            console.log('✅ Bot initialized via Webhook!');
            console.log(`🌐 Health: ${domain}/health`);
            console.log(`📊 Metrics: ${domain}/metrics`);
        } catch (error) {
            console.error('❌ Failed to initialize bot:', error);
            await this.shutdown(1);
        }
    }

    async setupWebServer(webhookPath = '/telegram') {
        const app = express();
        const port = process.env.PORT || 3000;

        app.set('trust proxy', true);
        app.use(helmet());
        app.use(compression());
        app.use(cors());
        app.use(express.json({ limit: '1mb' }));

        const rateLimit = require('./bot/middleware/rateLimit');
        app.use(rateLimit);

        // ✅ Webhook
        app.use(webhookPath, this.bot.webhookCallback(webhookPath));

        app.get('/health', (req, res) => {
            const status = this.dashboard.getSystemStatus();
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: status.uptime,
                memory: status.memory,
                performance: status.performance,
                blockchain: this.blockchain.getStatus(),
                database: 'connected',
            });
        });

        app.get('/metrics', (req, res) => {
            const metrics = this.dashboard.getDetailedMetrics();
            res.json(metrics);
        });

        app.use('*', (req, res) => res.status(404).json({ error: 'Not found' }));
        app.use((err, req, res, next) => {
            console.error('Web server error:', err);
            res.status(500).json({ error: 'Internal server error' });
        });

        this.webServer = app.listen(port, process.env.HOST || '0.0.0.0', () => {
            console.log(`🌐 Web server running on port ${port}`);
        });

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
        setInterval(() => {
            this.dashboard.recordMetrics();
            this.alerts.checkAlerts(this.dashboard.getSystemStatus());
        }, 30000);

        setInterval(() => {
            if (global.gc) {
                const memBefore = process.memoryUsage().rss;
                global.gc();
                const memAfter = process.memoryUsage().rss;
                const freed = memBefore - memAfter;
                if (freed > 50 * 1024 * 1024) {
                    console.log(`♻️ GC freed ${Math.round(freed / 1024 / 1024)}MB`);
                }
            }
        }, 5 * 60 * 1000);

        setInterval(async () => {
            try {
                await this.blockchain.processNewEvents();
            } catch (error) {
                console.error('❌ Blockchain monitoring error:', error);
            }
        }, 10000);

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
        ['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach(signal => {
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
            if (this.webServer) {
                this.webServer.close();
                console.log('🌐 Web server stopped');
            }

            if (this.bot) {
                this.bot.stop('SIGTERM');
                console.log('🤖 Bot stopped');
            }

            if (this.blockchain) {
                await this.blockchain.cleanup();
                console.log('⛓️ Blockchain connections closed');
            }

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

const app = new CryptoBotApplication();
app.initialize().catch(async (error) => {
    console.error('💥 Failed to start application:', error);
    await app.shutdown(1);
});

module.exports = app;
