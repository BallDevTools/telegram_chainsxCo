// src/bot/middleware/logger.js
const fs = require('fs');
const path = require('path');

class LoggerMiddleware {
    constructor() {
        this.logDir = path.join(__dirname, '../../..', 'logs');
        this.ensureLogDir();
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    middleware() {
        return async (ctx, next) => {
            const startTime = Date.now();
            
            try {
                // Log incoming request
                this.logRequest(ctx);
                
                await next();
                
                // Log successful response
                const duration = Date.now() - startTime;
                this.logResponse(ctx, 'success', duration);

            } catch (error) {
                // Log error
                const duration = Date.now() - startTime;
                this.logResponse(ctx, 'error', duration, error);
                throw error; // Re-throw for error middleware
            }
        };
    }

    logRequest(ctx) {
        const logData = {
            timestamp: new Date().toISOString(),
            type: 'request',
            updateType: ctx.updateType,
            userId: ctx.from?.id,
            username: ctx.from?.username,
            firstName: ctx.from?.first_name,
            chatId: ctx.chat?.id,
            chatType: ctx.chat?.type,
            message: ctx.message?.text || ctx.callbackQuery?.data || 'non-text',
            messageId: ctx.message?.message_id || ctx.callbackQuery?.message?.message_id
        };

        this.writeLog('requests', logData);
        
        // Console log for development
        if (process.env.NODE_ENV === 'development') {
            console.log(`📥 ${logData.firstName} (${logData.userId}): ${logData.message}`);
        }
    }

    logResponse(ctx, status, duration, error = null) {
        const logData = {
            timestamp: new Date().toISOString(),
            type: 'response',
            status,
            duration,
            userId: ctx.from?.id,
            username: ctx.from?.username,
            error: error ? {
                message: error.message,
                stack: error.stack
            } : null
        };

        this.writeLog('responses', logData);

        // Console log for development
        if (process.env.NODE_ENV === 'development') {
            const emoji = status === 'success' ? '✅' : '❌';
            console.log(`${emoji} Response (${duration}ms): ${ctx.from?.first_name} (${ctx.from?.id})`);
        }
    }

    writeLog(type, data) {
        try {
            const filename = `${type}-${new Date().toISOString().split('T')[0]}.log`;
            const filepath = path.join(this.logDir, filename);
            const logLine = JSON.stringify(data) + '\n';
            
            fs.appendFileSync(filepath, logLine);

        } catch (error) {
            console.error('❌ Failed to write log:', error);
        }
    }

    // Get log statistics
    getStats(days = 1) {
        try {
            const stats = {
                requests: 0,
                errors: 0,
                averageResponseTime: 0,
                uniqueUsers: new Set()
            };

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            for (let i = 0; i < days; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                
                const requestsFile = path.join(this.logDir, `requests-${dateStr}.log`);
                const responsesFile = path.join(this.logDir, `responses-${dateStr}.log`);

                // Count requests
                if (fs.existsSync(requestsFile)) {
                    const requestData = fs.readFileSync(requestsFile, 'utf8');
                    const lines = requestData.trim().split('\n').filter(line => line);
                    stats.requests += lines.length;

                    // Count unique users
                    lines.forEach(line => {
                        try {
                            const log = JSON.parse(line);
                            if (log.userId) {
                                stats.uniqueUsers.add(log.userId);
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    });
                }

                // Count errors and response times
                if (fs.existsSync(responsesFile)) {
                    const responseData = fs.readFileSync(responsesFile, 'utf8');
                    const lines = responseData.trim().split('\n').filter(line => line);
                    
                    let totalDuration = 0;
                    let validResponses = 0;

                    lines.forEach(line => {
                        try {
                            const log = JSON.parse(line);
                            if (log.status === 'error') {
                                stats.errors++;
                            }
                            if (log.duration) {
                                totalDuration += log.duration;
                                validResponses++;
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    });

                    if (validResponses > 0) {
                        stats.averageResponseTime = Math.round(totalDuration / validResponses);
                    }
                }
            }

            stats.uniqueUsers = stats.uniqueUsers.size;
            return stats;

        } catch (error) {
            console.error('❌ Failed to get log stats:', error);
            return null;
        }
    }
}

module.exports = new LoggerMiddleware().middleware();