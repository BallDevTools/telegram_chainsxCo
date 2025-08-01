// src/utils/alerts.js
const NotificationService = require('../services/NotificationService');

class AlertSystem {
    constructor() {
        this.notificationService = new NotificationService();
        this.thresholds = {
            memory: {
                warning: 1200, // MB (60% of 2GB)
                critical: 1500  // MB (75% of 2GB)
            },
            cpu: {
                warning: 70,   // %
                critical: 85   // %
            },
            responseTime: {
                warning: 3000, // ms
                critical: 5000 // ms
            },
            errorRate: {
                warning: 3,    // %
                critical: 5    // %
            },
            diskSpace: {
                warning: 80,   // %
                critical: 90   // %
            },
            activeUsers: {
                spike: 1000    // Sudden increase
            }
        };
        
        this.alertHistory = new Map();
        this.alertCooldown = 5 * 60 * 1000; // 5 minutes
        this.checkInterval = null;
        
        // Alert severity levels
        this.severity = {
            INFO: 'info',
            WARNING: 'warning',
            CRITICAL: 'critical',
            EMERGENCY: 'emergency'
        };
        
        this.startMonitoring();
    }

    startMonitoring() {
        // Check system health every 30 seconds
        this.checkInterval = setInterval(() => {
            this.performHealthCheck();
        }, 30000);
        
        console.log('🚨 Alert system started');
    }

    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        console.log('🛑 Alert system stopped');
    }

    async performHealthCheck() {
        try {
            const systemStatus = this.getSystemStatus();
            
            // Check memory usage
            await this.checkMemoryUsage(systemStatus.memory);
            
            // Check response time
            await this.checkResponseTime(systemStatus.performance);
            
            // Check error rate
            await this.checkErrorRate(systemStatus.performance);
            
            // Check disk space
            await this.checkDiskSpace();
            
            // Check database health
            await this.checkDatabaseHealth();
            
            // Check blockchain connectivity
            await this.checkBlockchainHealth();
            
        } catch (error) {
            console.error('❌ Health check error:', error);
            await this.sendAlert(
                'Health Check Failed',
                `System health check encountered an error: ${error.message}`,
                this.severity.WARNING
            );
        }
    }

    getSystemStatus() {
        const memory = process.memoryUsage();
        const uptime = process.uptime();
        
        return {
            memory: {
                used: Math.round(memory.rss / 1024 / 1024), // MB
                heap: Math.round(memory.heapUsed / 1024 / 1024), // MB
                percentage: Math.round((memory.rss / (2 * 1024 * 1024 * 1024)) * 100) // % of 2GB
            },
            uptime: Math.round(uptime / 60), // minutes
            performance: {
                // These would be populated by PerformanceDashboard
                avgResponseTime: 0,
                errorRate: 0
            }
        };
    }

    async checkMemoryUsage(memoryInfo) {
        const usedMemory = memoryInfo.used;
        const alertKey = 'memory_usage';
        
        if (usedMemory >= this.thresholds.memory.critical) {
            await this.sendAlert(
                'Critical Memory Usage',
                `Memory usage is critically high: ${usedMemory}MB (${memoryInfo.percentage}% of total). System may become unstable.`,
                this.severity.CRITICAL,
                alertKey
            );
            
            // Trigger garbage collection if available
            if (global.gc) {
                global.gc();
                console.log('♻️ Forced garbage collection due to high memory usage');
            }
            
        } else if (usedMemory >= this.thresholds.memory.warning) {
            await this.sendAlert(
                'High Memory Usage',
                `Memory usage is high: ${usedMemory}MB (${memoryInfo.percentage}% of total). Consider monitoring closely.`,
                this.severity.WARNING,
                alertKey
            );
        }
    }

    async checkResponseTime(performanceInfo) {
        const avgResponseTime = performanceInfo.avgResponseTime;
        const alertKey = 'response_time';
        
        if (avgResponseTime >= this.thresholds.responseTime.critical) {
            await this.sendAlert(
                'Critical Response Time',
                `Average response time is critically slow: ${avgResponseTime}ms. Users may experience timeouts.`,
                this.severity.CRITICAL,
                alertKey
            );
        } else if (avgResponseTime >= this.thresholds.responseTime.warning) {
            await this.sendAlert(
                'Slow Response Time',
                `Average response time is slow: ${avgResponseTime}ms. Performance optimization recommended.`,
                this.severity.WARNING,
                alertKey
            );
        }
    }

    async checkErrorRate(performanceInfo) {
        const errorRate = parseFloat(performanceInfo.errorRate) || 0;
        const alertKey = 'error_rate';
        
        if (errorRate >= this.thresholds.errorRate.critical) {
            await this.sendAlert(
                'Critical Error Rate',
                `Error rate is critically high: ${errorRate}%. System stability is compromised.`,
                this.severity.CRITICAL,
                alertKey
            );
        } else if (errorRate >= this.thresholds.errorRate.warning) {
            await this.sendAlert(
                'High Error Rate',
                `Error rate is elevated: ${errorRate}%. Investigation recommended.`,
                this.severity.WARNING,
                alertKey
            );
        }
    }

    async checkDiskSpace() {
        try {
            const fs = require('fs');
            const stats = fs.statSync('./');
            // This is a simplified check - in production, you'd use a proper disk space check
            const alertKey = 'disk_space';
            
            // Placeholder - actual disk space checking would require additional libraries
            // For now, we'll skip this check
            
        } catch (error) {
            console.error('❌ Disk space check error:', error);
        }
    }

    async checkDatabaseHealth() {
        try {
            const { getDatabase } = require('../config/database');
            const db = getDatabase();
            
            // Simple query to check database connectivity
            const startTime = Date.now();
            await db.get('SELECT 1');
            const queryTime = Date.now() - startTime;
            
            const alertKey = 'database_health';
            
            if (queryTime > 5000) { // 5 seconds
                await this.sendAlert(
                    'Database Performance Issue',
                    `Database query took ${queryTime}ms to complete. Database may be overloaded.`,
                    this.severity.WARNING,
                    alertKey
                );
            }
            
        } catch (error) {
            await this.sendAlert(
                'Database Connection Failed',
                `Unable to connect to database: ${error.message}`,
                this.severity.CRITICAL,
                'database_connection'
            );
        }
    }

    async checkBlockchainHealth() {
        try {
            const BlockchainService = require('../services/BlockchainService');
            const blockchainService = new BlockchainService();
            
            if (!blockchainService.isInitialized) {
                await this.sendAlert(
                    'Blockchain Service Not Initialized',
                    'Blockchain service is not properly initialized. Smart contract interactions may fail.',
                    this.severity.CRITICAL,
                    'blockchain_init'
                );
                return;
            }
            
            // Check if we can connect to the provider
            const startTime = Date.now();
            const blockNumber = await blockchainService.provider.getBlockNumber();
            const responseTime = Date.now() - startTime;
            
            const alertKey = 'blockchain_health';
            
            if (responseTime > 10000) { // 10 seconds
                await this.sendAlert(
                    'Blockchain RPC Slow',
                    `Blockchain RPC response took ${responseTime}ms. Network connectivity issues detected.`,
                    this.severity.WARNING,
                    alertKey
                );
            }
            
            // Check if block number is recent (within last 5 minutes)
            const fiveMinutesAgo = Math.floor(Date.now() / 1000) - (5 * 60);
            const block = await blockchainService.provider.getBlock(blockNumber);
            
            if (block.timestamp < fiveMinutesAgo) {
                await this.sendAlert(
                    'Blockchain Sync Issue',
                    `Latest block is from ${new Date(block.timestamp * 1000).toISOString()}. Network may be experiencing issues.`,
                    this.severity.WARNING,
                    'blockchain_sync'
                );
            }
            
        } catch (error) {
            await this.sendAlert(
                'Blockchain Connection Failed',
                `Unable to connect to blockchain: ${error.message}`,
                this.severity.CRITICAL,
                'blockchain_connection'
            );
        }
    }

    async sendAlert(title, message, severity = this.severity.INFO, alertKey = null) {
        try {
            // Check cooldown if alertKey is provided
            if (alertKey && this.isInCooldown(alertKey)) {
                return; // Skip sending duplicate alerts too frequently
            }
            
            const timestamp = new Date().toISOString();
            const severityEmoji = this.getSeverityEmoji(severity);
            
            const alertMessage = `${severityEmoji} **${title}**

📋 **Details:** ${message}
⏰ **Time:** ${timestamp}
🔧 **Severity:** ${severity.toUpperCase()}

${severity === this.severity.CRITICAL || severity === this.severity.EMERGENCY ? 
    '**🚨 IMMEDIATE ACTION REQUIRED! 🚨**' : 
    'Please investigate at your earliest convenience.'}`;

            // Send to admin
            await this.notificationService.sendToAdmin(alertMessage);
            
            // Log the alert
            console.log(`🚨 ALERT [${severity.toUpperCase()}]: ${title} - ${message}`);
            
            // Record alert history
            if (alertKey) {
                this.alertHistory.set(alertKey, {
                    timestamp: Date.now(),
                    title,
                    message,
                    severity
                });
            }
            
        } catch (error) {
            console.error('❌ Failed to send alert:', error);
        }
    }

    isInCooldown(alertKey) {
        const lastAlert = this.alertHistory.get(alertKey);
        if (!lastAlert) return false;
        
        return (Date.now() - lastAlert.timestamp) < this.alertCooldown;
    }

    getSeverityEmoji(severity) {
        const emojis = {
            [this.severity.INFO]: 'ℹ️',
            [this.severity.WARNING]: '⚠️',
            [this.severity.CRITICAL]: '🔴',
            [this.severity.EMERGENCY]: '🚨'
        };
        return emojis[severity] || 'ℹ️';
    }

    // Manual alert methods
    async alertUserAction(userId, action, details = '') {
        await this.sendAlert(
            'User Action Alert',
            `User ${userId} performed action: ${action}. ${details}`,
            this.severity.INFO,
            `user_action_${userId}`
        );
    }

    async alertSecurityEvent(event, details) {
        await this.sendAlert(
            'Security Event Detected',
            `Security event: ${event}. Details: ${details}`,
            this.severity.CRITICAL,
            'security_event'
        );
    }

    async alertSystemRestart(reason = 'Unknown') {
        await this.sendAlert(
            'System Restart Required',
            `System restart is required. Reason: ${reason}`,
            this.severity.WARNING,
            'system_restart'
        );
    }

    async alertHighTraffic(userCount, timeframe) {
        await this.sendAlert(
            'High Traffic Detected',
            `Unusual traffic spike detected: ${userCount} active users in the last ${timeframe} minutes.`,
            this.severity.INFO,
            'high_traffic'
        );
    }

    async alertTransactionFailure(txHash, error) {
        await this.sendAlert(
            'Transaction Failure',
            `Transaction ${txHash} failed with error: ${error}`,
            this.severity.WARNING,
            'transaction_failure'
        );
    }

    async alertContractError(contractName, functionName, error) {
        await this.sendAlert(
            'Smart Contract Error',
            `Error in ${contractName}.${functionName}: ${error}`,
            this.severity.CRITICAL,
            'contract_error'
        );
    }

    // Configuration methods
    updateThreshold(metric, level, value) {
        if (this.thresholds[metric] && this.thresholds[metric][level] !== undefined) {
            this.thresholds[metric][level] = value;
            console.log(`📊 Updated ${metric} ${level} threshold to ${value}`);
        }
    }

    setCooldownPeriod(milliseconds) {
        this.alertCooldown = milliseconds;
        console.log(`⏰ Alert cooldown set to ${milliseconds}ms`);
    }

    // Status and reporting
    getAlertHistory() {
        const history = [];
        for (const [key, alert] of this.alertHistory.entries()) {
            history.push({
                key,
                ...alert,
                timeAgo: Date.now() - alert.timestamp
            });
        }
        return history.sort((a, b) => b.timestamp - a.timestamp);
    }

    getAlertStats() {
        const history = this.getAlertHistory();
        const last24h = history.filter(alert => 
            Date.now() - alert.timestamp < 24 * 60 * 60 * 1000
        );
        
        const severityCounts = {
            [this.severity.INFO]: 0,
            [this.severity.WARNING]: 0,
            [this.severity.CRITICAL]: 0,
            [this.severity.EMERGENCY]: 0
        };
        
        last24h.forEach(alert => {
            severityCounts[alert.severity]++;
        });
        
        return {
            total: history.length,
            last24h: last24h.length,
            severityCounts,
            mostRecentAlert: history[0] || null,
            isHealthy: last24h.length === 0 || 
                      (severityCounts[this.severity.CRITICAL] === 0 && 
                       severityCounts[this.severity.EMERGENCY] === 0)
        };
    }

    getSystemHealth() {
        const stats = this.getAlertStats();
        const systemStatus = this.getSystemStatus();
        
        return {
            status: stats.isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            alerts: stats,
            system: systemStatus,
            recommendations: this.generateRecommendations(stats, systemStatus)
        };
    }

    generateRecommendations(alertStats, systemStatus) {
        const recommendations = [];
        
        // Memory recommendations
        if (systemStatus.memory.percentage > 75) {
            recommendations.push({
                type: 'memory',
                priority: 'high',
                message: 'Consider restarting the application to free memory',
                action: 'restart_application'
            });
        } else if (systemStatus.memory.percentage > 60) {
            recommendations.push({
                type: 'memory',
                priority: 'medium',
                message: 'Monitor memory usage closely',
                action: 'monitor_memory'
            });
        }
        
        // Alert-based recommendations
        if (alertStats.severityCounts[this.severity.CRITICAL] > 0) {
            recommendations.push({
                type: 'critical_alerts',
                priority: 'high',
                message: 'Critical alerts detected - immediate attention required',
                action: 'investigate_critical'
            });
        }
        
        // Performance recommendations
        if (alertStats.last24h > 10) {
            recommendations.push({
                type: 'alert_frequency',
                priority: 'medium',
                message: 'High alert frequency indicates system instability',
                action: 'system_optimization'
            });
        }
        
        if (recommendations.length === 0) {
            recommendations.push({
                type: 'system_health',
                priority: 'low',
                message: 'System is operating normally',
                action: 'continue_monitoring'
            });
        }
        
        return recommendations;
    }

    // Cleanup and maintenance
    cleanupOldAlerts(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
        const cutoff = Date.now() - maxAge;
        let cleaned = 0;
        
        for (const [key, alert] of this.alertHistory.entries()) {
            if (alert.timestamp < cutoff) {
                this.alertHistory.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 Cleaned up ${cleaned} old alerts`);
        }
        
        return cleaned;
    }

    // Test methods for development
    async testAlert(severity = this.severity.INFO) {
        await this.sendAlert(
            'Test Alert',
            `This is a test alert with severity: ${severity}`,
            severity,
            'test_alert'
        );
    }

    async testAllAlerts() {
        const severities = Object.values(this.severity);
        for (const severity of severities) {
            await this.testAlert(severity);
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
    }

    // Emergency methods
    async emergencyAlert(message) {
        await this.sendAlert(
            'EMERGENCY ALERT',
            message,
            this.severity.EMERGENCY,
            'emergency'
        );
    }

    async systemShutdownAlert(reason) {
        await this.sendAlert(
            'System Shutdown Initiated',
            `System shutdown initiated. Reason: ${reason}`,
            this.severity.EMERGENCY,
            'system_shutdown'
        );
    }

    // Configuration getters
    getThresholds() {
        return { ...this.thresholds };
    }

    getCooldownPeriod() {
        return this.alertCooldown;
    }

    getMonitoringStatus() {
        return {
            active: !!this.checkInterval,
            cooldownPeriod: this.alertCooldown,
            thresholds: this.thresholds,
            alertHistory: this.alertHistory.size
        };
    }

    // Shutdown cleanup
    shutdown() {
        this.stopMonitoring();
        this.alertHistory.clear();
        console.log('🚨 Alert system shutdown complete');
    }
}

module.exports = AlertSystem;