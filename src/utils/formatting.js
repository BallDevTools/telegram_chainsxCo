// src/utils/formatting.js
class FormattingUtils {
    // Format numbers with proper decimal places and commas
    static formatNumber(number, decimals = 2) {
        if (typeof number !== 'number') {
            number = parseFloat(number) || 0;
        }
        
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number);
    }

    // Format large numbers with K, M, B suffixes
    static formatLargeNumber(number) {
        if (typeof number !== 'number') {
            number = parseFloat(number) || 0;
        }

        if (number >= 1e9) {
            return (number / 1e9).toFixed(1) + 'B';
        }
        if (number >= 1e6) {
            return (number / 1e6).toFixed(1) + 'M';
        }
        if (number >= 1e3) {
            return (number / 1e3).toFixed(1) + 'K';
        }
        return number.toString();
    }

    // Format dates with various options
    static formatDate(dateInput, short = false) {
        let date;
        
        if (typeof dateInput === 'string') {
            date = new Date(dateInput);
        } else if (dateInput instanceof Date) {
            date = dateInput;
        } else {
            return 'Invalid Date';
        }

        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        const options = short ? 
            { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            } : 
            { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };

        return date.toLocaleDateString('en-US', options);
    }

    // Format duration in human readable format
    static formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days} day${days !== 1 ? 's' : ''}`;
        }
        if (hours > 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        }
        if (minutes > 0) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }

    // Format wallet address for display
    static formatWalletAddress(address, startChars = 6, endChars = 4) {
        if (!address || typeof address !== 'string') {
            return 'Invalid Address';
        }
        
        if (address.length <= startChars + endChars) {
            return address;
        }
        
        return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
    }

    // Format transaction hash for display
    static formatTxHash(txHash, chars = 10) {
        if (!txHash || typeof txHash !== 'string') {
            return 'Invalid Hash';
        }
        
        return `${txHash.slice(0, chars)}...`;
    }

    // Format percentage
    static formatPercentage(value, decimals = 1) {
        if (typeof value !== 'number') {
            value = parseFloat(value) || 0;
        }
        
        return `${value.toFixed(decimals)}%`;
    }

    // Format USDT amount with proper decimals
    static formatUSDT(amount, showSymbol = true) {
        const formatted = this.formatNumber(amount, 2);
        return showSymbol ? `${formatted} USDT` : formatted;
    }

    // Format BNB amount
    static formatBNB(amount, showSymbol = true) {
        const formatted = this.formatNumber(amount, 4);
        return showSymbol ? `${formatted} BNB` : formatted;
    }

    // Format time ago (e.g., "2 hours ago")
    static formatTimeAgo(dateInput) {
        let date;
        
        if (typeof dateInput === 'string') {
            date = new Date(dateInput);
        } else if (dateInput instanceof Date) {
            date = dateInput;
        } else {
            return 'Unknown time';
        }

        const now = new Date();
        const diffMs = now - date;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }
        if (diffHours > 0) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        }
        if (diffMinutes > 0) {
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        }
        if (diffSeconds > 0) {
            return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`;
        }
        return 'Just now';
    }

    // Format file size
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Capitalize first letter
    static capitalize(str) {
        if (!str || typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    // Truncate text with ellipsis
    static truncate(text, maxLength = 100) {
        if (!text || typeof text !== 'string') return '';
        
        if (text.length <= maxLength) {
            return text;
        }
        
        return text.slice(0, maxLength - 3) + '...';
    }

    // Format phone number
    static formatPhoneNumber(phone) {
        if (!phone) return '';
        
        // Remove all non-digit characters
        const cleaned = phone.replace(/\D/g, '');
        
        // Format as (XXX) XXX-XXXX for US numbers
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        
        return phone; // Return original if not standard format
    }

    // Format plan level with name
    static formatPlanLevel(planId) {
        const planNames = {
            1: 'Starter', 2: 'Basic', 3: 'Bronze', 4: 'Silver',
            5: 'Gold', 6: 'Platinum', 7: 'Diamond', 8: 'Elite',
            9: 'Master', 10: 'Grand Master', 11: 'Champion', 12: 'Legend',
            13: 'Supreme', 14: 'Ultimate', 15: 'Apex', 16: 'Infinity'
        };
        
        const planName = planNames[planId] || 'Unknown';
        return `${planName} (Level ${planId})`;
    }

    // Format status with emoji
    static formatStatus(status) {
        const statusMap = {
            'active': '✅ Active',
            'inactive': '❌ Inactive',
            'pending': '⏳ Pending',
            'confirmed': '✅ Confirmed',
            'failed': '❌ Failed',
            'cancelled': '🚫 Cancelled',
            'processing': '🔄 Processing'
        };
        
        return statusMap[status] || `❓ ${this.capitalize(status)}`;
    }

    // Format commission rate
    static formatCommissionRate(planId) {
        let rate;
        if (planId <= 4) rate = 30;
        else if (planId <= 8) rate = 33;
        else if (planId <= 12) rate = 35;
        else rate = 36;
        
        return `${rate}%`;
    }

    // Format network name
    static formatNetwork(networkId) {
        const networks = {
            56: 'BSC Mainnet',
            97: 'BSC Testnet',
            1: 'Ethereum Mainnet',
            3: 'Ropsten Testnet',
            4: 'Rinkeby Testnet',
            5: 'Goerli Testnet'
        };
        
        return networks[networkId] || `Network ${networkId}`;
    }

    // Format gas price in Gwei
    static formatGasPrice(gasPriceWei) {
        const gasGwei = parseFloat(gasPriceWei) / 1e9;
        return `${gasGwei.toFixed(2)} Gwei`;
    }

    // Format block number with commas
    static formatBlockNumber(blockNumber) {
        return this.formatNumber(blockNumber, 0);
    }

    // Generate progress bar
    static generateProgressBar(current, total, length = 10) {
        const percentage = Math.min(current / total, 1);
        const filled = Math.round(length * percentage);
        const empty = length - filled;
        
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    // Format referral code for display
    static formatReferralCode(code) {
        if (!code) return 'N/A';
        return code.toUpperCase();
    }
}

// Export individual functions for convenience
const formatNumber = FormattingUtils.formatNumber.bind(FormattingUtils);
const formatLargeNumber = FormattingUtils.formatLargeNumber.bind(FormattingUtils);
const formatDate = FormattingUtils.formatDate.bind(FormattingUtils);
const formatDuration = FormattingUtils.formatDuration.bind(FormattingUtils);
const formatWalletAddress = FormattingUtils.formatWalletAddress.bind(FormattingUtils);
const formatTxHash = FormattingUtils.formatTxHash.bind(FormattingUtils);
const formatPercentage = FormattingUtils.formatPercentage.bind(FormattingUtils);
const formatUSDT = FormattingUtils.formatUSDT.bind(FormattingUtils);
const formatBNB = FormattingUtils.formatBNB.bind(FormattingUtils);
const formatTimeAgo = FormattingUtils.formatTimeAgo.bind(FormattingUtils);
const formatFileSize = FormattingUtils.formatFileSize.bind(FormattingUtils);
const capitalize = FormattingUtils.capitalize.bind(FormattingUtils);
const truncate = FormattingUtils.truncate.bind(FormattingUtils);
const formatPlanLevel = FormattingUtils.formatPlanLevel.bind(FormattingUtils);
const formatStatus = FormattingUtils.formatStatus.bind(FormattingUtils);
const formatCommissionRate = FormattingUtils.formatCommissionRate.bind(FormattingUtils);

module.exports = {
    FormattingUtils,
    formatNumber,
    formatLargeNumber,
    formatDate,
    formatDuration,
    formatWalletAddress,
    formatTxHash,
    formatPercentage,
    formatUSDT,
    formatBNB,
    formatTimeAgo,
    formatFileSize,
    capitalize,
    truncate,
    formatPlanLevel,
    formatStatus,
    formatCommissionRate
};

// src/utils/referralCodes.js
const crypto = require('crypto');

class ReferralCodeGenerator {
    constructor() {
        this.codeLength = 8;
        this.chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        this.excludeChars = ['0', 'O', '1', 'I', 'L']; // Confusing characters
        this.allowedChars = this.chars.split('').filter(char => 
            !this.excludeChars.includes(char)
        );
    }

    // Generate a random referral code
    generate(length = this.codeLength) {
        let result = '';
        
        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, this.allowedChars.length);
            result += this.allowedChars[randomIndex];
        }
        
        return result;
    }

    // Generate code based on user info (deterministic but unique)
    generateFromUser(userId, timestamp = Date.now()) {
        const input = `${userId}_${timestamp}`;
        const hash = crypto.createHash('sha256').update(input).digest('hex');
        
        let code = '';
        for (let i = 0; i < this.codeLength; i++) {
            const hashIndex = parseInt(hash.substr(i * 2, 2), 16);
            const charIndex = hashIndex % this.allowedChars.length;
            code += this.allowedChars[charIndex];
        }
        
        return code;
    }

    // Validate referral code format
    validate(code) {
        if (!code || typeof code !== 'string') {
            return false;
        }
        
        // Check length
        if (code.length < 6 || code.length > 12) {
            return false;
        }
        
        // Check characters
        return code.split('').every(char => 
            this.allowedChars.includes(char.toUpperCase())
        );
    }

    // Generate multiple unique codes
    generateBatch(count = 10) {
        const codes = new Set();
        
        while (codes.size < count) {
            codes.add(this.generate());
        }
        
        return Array.from(codes);
    }

    // Generate memorable code (avoiding confusing sequences)
    generateMemorable() {
        const vowels = ['A', 'E', 'U'];
        const consonants = this.allowedChars.filter(char => 
            !vowels.includes(char) && isNaN(parseInt(char))
        );
        const numbers = this.allowedChars.filter(char => !isNaN(parseInt(char)));
        
        let code = '';
        
        // Pattern: CVNC-VCNV (C=Consonant, V=Vowel, N=Number)
        const patterns = [
            [consonants, vowels, numbers, consonants, vowels, consonants, numbers, vowels],
            [consonants, vowels, consonants, numbers, consonants, vowels, numbers, consonants],
            [vowels, consonants, numbers, vowels, consonants, numbers, consonants, vowels]
        ];
        
        const pattern = patterns[crypto.randomInt(0, patterns.length)];
        
        for (const charSet of pattern) {
            const randomIndex = crypto.randomInt(0, charSet.length);
            code += charSet[randomIndex];
        }
        
        return code;
    }

    // Check if code looks like a common word (to avoid)
    isCommonWord(code) {
        const commonWords = [
            'FUCK', 'SHIT', 'DAMN', 'HELL', 'HATE', 'KILL', 'DEAD',
            'SCAM', 'FAKE', 'SPAM', 'HACK', 'EVIL', 'BAD'
        ];
        
        return commonWords.some(word => code.includes(word));
    }

    // Generate safe code (avoiding offensive combinations)
    generateSafe() {
        let code;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            code = this.generate();
            attempts++;
        } while (this.isCommonWord(code) && attempts < maxAttempts);
        
        return code;
    }

    // Generate code with checksum
    generateWithChecksum() {
        const baseCode = this.generate(6);
        const checksum = this.calculateChecksum(baseCode);
        return baseCode + checksum;
    }

    // Calculate simple checksum
    calculateChecksum(code) {
        let sum = 0;
        for (let i = 0; i < code.length; i++) {
            sum += code.charCodeAt(i);
        }
        const checksumIndex = sum % this.allowedChars.length;
        return this.allowedChars[checksumIndex];
    }

    // Verify code with checksum
    verifyChecksum(codeWithChecksum) {
        if (codeWithChecksum.length < 2) return false;
        
        const code = codeWithChecksum.slice(0, -1);
        const checksum = codeWithChecksum.slice(-1);
        const expectedChecksum = this.calculateChecksum(code);
        
        return checksum === expectedChecksum;
    }
}

// Create instance and export functions
const generator = new ReferralCodeGenerator();

const generateReferralCode = () => generator.generateSafe();
const validateReferralCode = (code) => generator.validate(code);
const generateReferralCodeFromUser = (userId, timestamp) => 
    generator.generateFromUser(userId, timestamp);
const generateMemorableCode = () => generator.generateMemorable();

module.exports = {
    ReferralCodeGenerator,
    generateReferralCode,
    validateReferralCode,
    generateReferralCodeFromUser,
    generateMemorableCode
};

// src/utils/validation.js
class ValidationUtils {
    // Validate Ethereum/BSC wallet address
    static isValidWalletAddress(address) {
        if (typeof address !== 'string') return false;
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    // Validate transaction hash
    static isValidTxHash(hash) {
        if (typeof hash !== 'string') return false;
        return /^0x[a-fA-F0-9]{64}$/.test(hash);
    }

    // Validate Telegram user ID
    static isValidTelegramId(id) {
        const numId = parseInt(id);
        return !isNaN(numId) && numId > 0 && numId < 10000000000; // Reasonable range
    }

    // Validate referral code
    static isValidReferralCode(code) {
        if (typeof code !== 'string') return false;
        return /^[A-Z0-9]{6,12}$/.test(code);
    }

    // Validate email address
    static isValidEmail(email) {
        if (typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate URL
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    // Validate positive number
    static isPositiveNumber(value) {
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
    }

    // Validate integer in range
    static isValidInteger(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
        const num = parseInt(value);
        return !isNaN(num) && num >= min && num <= max;
    }

    // Validate plan ID
    static isValidPlanId(planId) {
        return this.isValidInteger(planId, 1, 16);
    }

    // Validate USDT amount
    static isValidUSDTAmount(amount) {
        const num = parseFloat(amount);
        return !isNaN(num) && num >= 0.01 && num <= 1000000; // Reasonable limits
    }

    // Sanitize user input
    static sanitizeInput(input, maxLength = 1000) {
        if (typeof input !== 'string') return '';
        
        return input
            .replace(/[<>\"'&]/g, '') // Remove potentially dangerous chars
            .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
            .trim()
            .slice(0, maxLength);
    }

    // Validate and sanitize text message
    static sanitizeMessage(message, maxLength = 4000) {
        if (typeof message !== 'string') return '';
        
        // Remove excessive whitespace
        const cleaned = message
            .replace(/\s+/g, ' ') // Multiple spaces to single
            .replace(/\n{3,}/g, '\n\n') // Multiple newlines to double
            .trim();
        
        return this.sanitizeInput(cleaned, maxLength);
    }

    // Check for suspicious patterns
    static containsSuspiciousContent(text) {
        if (typeof text !== 'string') return false;
        
        const suspiciousPatterns = [
            /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/, // Phone numbers
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email addresses
            /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/, // URLs
            /\b(?:credit|debit|bank|account|password|pin|ssn|social)\b/i, // Sensitive info
            /\b(?:bitcoin|btc|ethereum|eth|wallet|private.*key|seed.*phrase)\b/i // Crypto terms
        ];
        
        return suspiciousPatterns.some(pattern => pattern.test(text));
    }

    // Validate username format
    static isValidUsername(username) {
        if (typeof username !== 'string') return false;
        // Telegram username format: 5-32 chars, alphanumeric + underscore
        return /^[a-zA-Z0-9_]{5,32}$/.test(username);
    }

    // Validate plan upgrade path
    static isValidUpgradePath(currentPlan, targetPlan) {
        const current = parseInt(currentPlan);
        const target = parseInt(targetPlan);
        
        if (!this.isValidPlanId(current) || !this.isValidPlanId(target)) {
            return false;
        }
        
        // Can only upgrade to next level
        return target === current + 1;
    }

    // Validate date format
    static isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    }

    // Check if value is within reasonable bounds
    static isWithinBounds(value, min, max) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    }

    // Validate JSON string
    static isValidJSON(jsonString) {
        try {
            JSON.parse(jsonString);
            return true;
        } catch {
            return false;
        }
    }

    // Rate limiting validation
    static validateRateLimit(userRequests, maxRequests, timeWindow) {
        const now = Date.now();
        const recentRequests = userRequests.filter(
            timestamp => now - timestamp < timeWindow
        );
        return recentRequests.length < maxRequests;
    }

    // Validate file upload
    static validateFileUpload(file, allowedTypes = [], maxSize = 5 * 1024 * 1024) {
        if (!file) return { valid: false, error: 'No file provided' };
        
        // Check file size
        if (file.size > maxSize) {
            return { 
                valid: false, 
                error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB` 
            };
        }
        
        // Check file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
            return { 
                valid: false, 
                error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` 
            };
        }
        
        return { valid: true };
    }
}

module.exports = ValidationUtils;

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