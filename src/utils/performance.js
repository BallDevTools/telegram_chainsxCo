// src/utils/performance.js
class PerformanceDashboard {
    constructor() {
        this.startTime = Date.now();
        this.metrics = {
            requests: 0,
            errors: 0,
            dbQueries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            slowQueries: [],
            responseTime: {
                total: 0,
                count: 0,
                min: Infinity,
                max: 0
            }
        };
        
        this.intervals = {
            hourly: [],
            daily: [],
            current: {
                requests: 0,
                errors: 0,
                startTime: Date.now()
            }
        };
        
        // Start performance tracking intervals
        this.startTracking();
    }

    startTracking() {
        // Record metrics every minute
        setInterval(() => {
            this.recordInterval();
        }, 60000);
        
        // Clean up old data every hour
        setInterval(() => {
            this.cleanup();
        }, 3600000);
    }

    recordInterval() {
        const now = Date.now();
        const interval = {
            timestamp: now,
            requests: this.intervals.current.requests,
            errors: this.intervals.current.errors,
            duration: now - this.intervals.current.startTime
        };
        
        this.intervals.hourly.push(interval);
        
        // Reset current interval
        this.intervals.current = {
            requests: 0,
            errors: 0,
            startTime: now
        };
    }

    cleanup() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        // Keep only last hour of minute intervals
        this.intervals.hourly = this.intervals.hourly.filter(
            interval => interval.timestamp > oneHourAgo
        );
        
        // Keep only last day of hourly intervals
        this.intervals.daily = this.intervals.daily.filter(
            interval => interval.timestamp > oneDayAgo
        );
        
        // Clean up slow queries (keep last 100)
        if (this.metrics.slowQueries.length > 100) {
            this.metrics.slowQueries = this.metrics.slowQueries.slice(-100);
        }
    }

    // Record request metrics
    recordRequest(responseTime) {
        this.metrics.requests++;
        this.intervals.current.requests++;
        
        if (responseTime) {
            this.recordResponseTime(responseTime);
        }
    }

    recordError() {
        this.metrics.errors++;
        this.intervals.current.errors++;
    }

    recordDbQuery(queryTime, query) {
        this.metrics.dbQueries++;
        
        // Record slow queries (>100ms)
        if (queryTime > 100) {
            this.metrics.slowQueries.push({
                query: query.substring(0, 100),
                time: queryTime,
                timestamp: Date.now()
            });
        }
    }

    recordCacheHit() {
        this.metrics.cacheHits++;
    }

    recordCacheMiss() {
        this.metrics.cacheMisses++;
    }

    recordResponseTime(responseTime) {
        const rt = this.metrics.responseTime;
        rt.total += responseTime;
        rt.count++;
        rt.min = Math.min(rt.min, responseTime);
        rt.max = Math.max(rt.max, responseTime);
    }

    // Get current system status
    getSystemStatus() {
        const uptime = Date.now() - this.startTime;
        const memory = process.memoryUsage();
        
        const cacheTotal = this.metrics.cacheHits + this.metrics.cacheMisses;
        const cacheHitRate = cacheTotal > 0 ? 
            ((this.metrics.cacheHits / cacheTotal) * 100).toFixed(2) : 0;
        
        const avgResponseTime = this.metrics.responseTime.count > 0 ?
            Math.round(this.metrics.responseTime.total / this.metrics.responseTime.count) : 0;
        
        return {
            uptime: Math.round(uptime / 1000 / 60), // minutes
            memory: {
                used: Math.round(memory.rss / 1024 / 1024), // MB
                heap: Math.round(memory.heapUsed / 1024 / 1024), // MB
                percentage: Math.round((memory.rss / (2 * 1024 * 1024 * 1024)) * 100) // % of 2GB
            },
            performance: {
                totalRequests: this.metrics.requests,
                requestsPerMinute: this.calculateRequestsPerMinute(),
                errorRate: this.calculateErrorRate(),
                cacheHitRate: `${cacheHitRate}%`,
                avgResponseTime: `${avgResponseTime}ms`
            }
        };
    }

    // Get detailed metrics
    getDetailedMetrics() {
        const status = this.getSystemStatus();
        
        return {
            ...status,
            detailed: {
                dbQueries: this.metrics.dbQueries,
                slowQueries: this.metrics.slowQueries.length,
                responseTime: {
                    min: this.metrics.responseTime.min === Infinity ? 0 : this.metrics.responseTime.min,
                    max: this.metrics.responseTime.max,
                    avg: Math.round(this.metrics.responseTime.total / Math.max(this.metrics.responseTime.count, 1))
                },
                intervals: {
                    hourly: this.intervals.hourly.slice(-60), // Last hour
                    current: this.intervals.current
                }
            }
        };
    }

    calculateRequestsPerMinute() {
        if (this.intervals.hourly.length === 0) return 0;
        
        const recentIntervals = this.intervals.hourly.slice(-10); // Last 10 minutes
        const totalRequests = recentIntervals.reduce((sum, interval) => sum + interval.requests, 0);
        
        return Math.round(totalRequests / Math.max(recentIntervals.length, 1));
    }

    calculateErrorRate() {
        if (this.metrics.requests === 0) return 0;
        return ((this.metrics.errors / this.metrics.requests) * 100).toFixed(2);
    }

    // Generate performance report
    generateReport() {
        const status = this.getSystemStatus();
        const detailed = this.getDetailedMetrics();
        
        return {
            timestamp: new Date().toISOString(),
            summary: {
                uptime: `${status.uptime} minutes`,
                totalRequests: status.performance.totalRequests,
                errorRate: `${status.performance.errorRate}%`,
                memoryUsage: `${status.memory.used}MB (${status.memory.percentage}%)`,
                avgResponseTime: status.performance.avgResponseTime
            },
            performance: {
                requestsPerMinute: status.performance.requestsPerMinute,
                cacheHitRate: status.performance.cacheHitRate,
                dbQueries: detailed.detailed.dbQueries,
                slowQueries: detailed.detailed.slowQueries
            },
            system: {
                memory: status.memory,
                uptime: status.uptime
            },
            recommendations: this.generateRecommendations(status)
        };
    }

    generateRecommendations(status) {
        const recommendations = [];
        
        if (status.memory.percentage > 80) {
            recommendations.push('High memory usage detected. Consider restarting the application.');
        }
        
        if (parseFloat(status.performance.errorRate) > 5) {
            recommendations.push('High error rate detected. Check application logs.');
        }
        
        const avgResponseTime = parseInt(status.performance.avgResponseTime);
        if (avgResponseTime > 1000) {
            recommendations.push('Slow response times detected. Consider performance optimization.');
        }
        
        const cacheHitRate = parseFloat(status.performance.cacheHitRate);
        if (cacheHitRate < 70) {
            recommendations.push('Low cache hit rate. Consider cache optimization.');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('System performance is optimal.');
        }
        
        return recommendations;
    }

    // Reset all metrics
    reset() {
        this.startTime = Date.now();
        this.metrics = {
            requests: 0,
            errors: 0,
            dbQueries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            slowQueries: [],
            responseTime: {
                total: 0,
                count: 0,
                min: Infinity,
                max: 0
            }
        };
        this.intervals.hourly = [];
        this.intervals.daily = [];
        this.intervals.current = {
            requests: 0,
            errors: 0,
            startTime: Date.now()
        };
    }
}

module.exports = PerformanceDashboard;