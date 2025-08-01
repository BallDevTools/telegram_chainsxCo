#!/usr/bin/env node

const { execSync } = require('child_process');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Import project components for testing
const { initializeDatabase, getDatabase } = require('../src/config/database');
const UserService = require('../src/services/UserService');
const CacheService = require('../src/services/CacheService');

class BenchmarkSuite {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            system: this.getSystemInfo(),
            tests: {}
        };
        
        this.testUsers = [];
        this.testData = {
            wallets: [],
            referralCodes: [],
            transactions: []
        };
    }

    getSystemInfo() {
        return {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            memory: {
                total: Math.round(require('os').totalmem() / 1024 / 1024) + ' MB',
                free: Math.round(require('os').freemem() / 1024 / 1024) + ' MB'
            },
            cpu: require('os').cpus()[0].model,
            cpuCount: require('os').cpus().length
        };
    }

    async run() {
        console.log('🚀 Starting Performance Benchmark Suite...\n');
        
        try {
            await this.setupTestEnvironment();
            
            console.log('📊 Running benchmarks...\n');
            
            // Database benchmarks
            await this.benchmarkDatabase();
            
            // Cache benchmarks
            await this.benchmarkCache();
            
            // User service benchmarks
            await this.benchmarkUserService();
            
            // Memory benchmarks
            await this.benchmarkMemoryUsage();
            
            // Concurrent operations benchmark
            await this.benchmarkConcurrency();
            
            // Generate report
            await this.generateReport();
            
        } catch (error) {
            console.error('❌ Benchmark failed:', error);
        } finally {
            await this.cleanup();
        }
    }

    async setupTestEnvironment() {
        console.log('🔧 Setting up test environment...');
        
        // Initialize database
        await initializeDatabase();
        
        // Generate test data
        this.generateTestData();
        
        console.log('✅ Test environment ready\n');
    }

    generateTestData() {
        // Generate test wallets
        for (let i = 0; i < 1000; i++) {
            this.testData.wallets.push(this.generateRandomWallet());
        }
        
        // Generate test referral codes
        for (let i = 0; i < 1000; i++) {
            this.testData.referralCodes.push(this.generateRandomReferralCode());
        }
        
        console.log(`📋 Generated test data: ${this.testData.wallets.length} wallets, ${this.testData.referralCodes.length} referral codes`);
    }

    generateRandomWallet() {
        const chars = '0123456789abcdef';
        let wallet = '0x';
        for (let i = 0; i < 40; i++) {
            wallet += chars[Math.floor(Math.random() * chars.length)];
        }
        return wallet;
    }

    generateRandomReferralCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    async benchmarkDatabase() {
        console.log('🗄️ Benchmarking Database Operations...');
        
        const db = getDatabase();
        const tests = {};
        
        // Test 1: Simple SELECT query
        const selectStart = performance.now();
        for (let i = 0; i < 100; i++) {
            await db.get('SELECT 1');
        }
        const selectEnd = performance.now();
        tests.simpleSelect = {
            operations: 100,
            totalTime: Math.round(selectEnd - selectStart),
            avgTime: Math.round((selectEnd - selectStart) / 100),
            opsPerSecond: Math.round(100000 / (selectEnd - selectStart))
        };
        
        // Test 2: User creation
        const userService = new UserService();
        await userService.initialize();
        
        const createStart = performance.now();
        for (let i = 0; i < 50; i++) {
            try {
                const user = await userService.createUser({
                    telegramId: `test_${i}_${Date.now()}`,
                    firstName: `TestUser${i}`,
                    username: `testuser${i}`,
                    referralCode: this.testData.referralCodes[i]
                });
                this.testUsers.push(user);
            } catch (error) {
                // Some might fail due to unique constraints, that's ok
            }
        }
        const createEnd = performance.now();
        
        tests.userCreation = {
            operations: 50,
            totalTime: Math.round(createEnd - createStart),
            avgTime: Math.round((createEnd - createStart) / 50),
            opsPerSecond: Math.round(50000 / (createEnd - createStart))
        };
        
        // Test 3: Complex queries
        const complexStart = performance.now();
        for (let i = 0; i < 20; i++) {
            await db.all(`
                SELECT u.*, COUNT(r.id) as referral_count
                FROM users u
                LEFT JOIN referrals r ON u.id = r.referrer_id
                GROUP BY u.id
                LIMIT 10
            `);
        }
        const complexEnd = performance.now();
        
        tests.complexQuery = {
            operations: 20,
            totalTime: Math.round(complexEnd - complexStart),
            avgTime: Math.round((complexEnd - complexStart) / 20),
            opsPerSecond: Math.round(20000 / (complexEnd - complexStart))
        };
        
        this.results.tests.database = tests;
        console.log(`   Simple SELECT: ${tests.simpleSelect.avgTime}ms avg, ${tests.simpleSelect.opsPerSecond} ops/sec`);
        console.log(`   User Creation: ${tests.userCreation.avgTime}ms avg, ${tests.userCreation.opsPerSecond} ops/sec`);
        console.log(`   Complex Query: ${tests.complexQuery.avgTime}ms avg, ${tests.complexQuery.opsPerSecond} ops/sec\n`);
    }

    async benchmarkCache() {
        console.log('🗄️ Benchmarking Cache Operations...');
        
        const tests = {};
        
        // Test 1: Cache writes
        const writeStart = performance.now();
        for (let i = 0; i < 1000; i++) {
            CacheService.set(`test_key_${i}`, { data: `test_value_${i}`, timestamp: Date.now() });
        }
        const writeEnd = performance.now();
        
        tests.cacheWrite = {
            operations: 1000,
            totalTime: Math.round(writeEnd - writeStart),
            avgTime: Math.round((writeEnd - writeStart) / 1000),
            opsPerSecond: Math.round(1000000 / (writeEnd - writeStart))
        };
        
        // Test 2: Cache reads
        const readStart = performance.now();
        let hits = 0;
        for (let i = 0; i < 1000; i++) {
            const result = CacheService.get(`test_key_${i}`);
            if (result) hits++;
        }
        const readEnd = performance.now();
        
        tests.cacheRead = {
            operations: 1000,
            totalTime: Math.round(readEnd - readStart),
            avgTime: Math.round((readEnd - readStart) / 1000),
            opsPerSecond: Math.round(1000000 / (readEnd - readStart)),
            hitRate: Math.round((hits / 1000) * 100)
        };
        
        // Test 3: Cache misses
        const missStart = performance.now();
        for (let i = 0; i < 100; i++) {
            CacheService.get(`nonexistent_key_${i}`);
        }
        const missEnd = performance.now();
        
        tests.cacheMiss = {
            operations: 100,
            totalTime: Math.round(missEnd - missStart),
            avgTime: Math.round((missEnd - missStart) / 100),
            opsPerSecond: Math.round(100000 / (missEnd - missStart))
        };
        
        this.results.tests.cache = tests;
        console.log(`   Cache Write: ${tests.cacheWrite.avgTime}ms avg, ${tests.cacheWrite.opsPerSecond} ops/sec`);
        console.log(`   Cache Read: ${tests.cacheRead.avgTime}ms avg, ${tests.cacheRead.opsPerSecond} ops/sec (${tests.cacheRead.hitRate}% hit rate)`);
        console.log(`   Cache Miss: ${tests.cacheMiss.avgTime}ms avg, ${tests.cacheMiss.opsPerSecond} ops/sec\n`);
    }

    async benchmarkUserService() {
        console.log('👤 Benchmarking User Service...');
        
        const userService = new UserService();
        const tests = {};
        
        if (this.testUsers.length === 0) {
            console.log('   ⚠️ No test users available, skipping user service benchmark\n');
            return;
        }
        
        // Test 1: Get user by telegram ID
        const getByTelegramStart = performance.now();
        for (let i = 0; i < Math.min(100, this.testUsers.length); i++) {
            await userService.getUserByTelegramId(this.testUsers[i].telegram_id);
        }
        const getByTelegramEnd = performance.now();
        
        tests.getUserByTelegram = {
            operations: Math.min(100, this.testUsers.length),
            totalTime: Math.round(getByTelegramEnd - getByTelegramStart),
            avgTime: Math.round((getByTelegramEnd - getByTelegramStart) / Math.min(100, this.testUsers.length)),
            opsPerSecond: Math.round(Math.min(100, this.testUsers.length) * 1000 / (getByTelegramEnd - getByTelegramStart))
        };
        
        // Test 2: Get user statistics
        const getStatsStart = performance.now();
        for (let i = 0; i < Math.min(20, this.testUsers.length); i++) {
            await userService.getUserStats(this.testUsers[i].telegram_id);
        }
        const getStatsEnd = performance.now();
        
        tests.getUserStats = {
            operations: Math.min(20, this.testUsers.length),
            totalTime: Math.round(getStatsEnd - getStatsStart),
            avgTime: Math.round((getStatsEnd - getStatsStart) / Math.min(20, this.testUsers.length)),
            opsPerSecond: Math.round(Math.min(20, this.testUsers.length) * 1000 / (getStatsEnd - getStatsStart))
        };
        
        this.results.tests.userService = tests;
        console.log(`   Get User by Telegram: ${tests.getUserByTelegram.avgTime}ms avg, ${tests.getUserByTelegram.opsPerSecond} ops/sec`);
        console.log(`   Get User Stats: ${tests.getUserStats.avgTime}ms avg, ${tests.getUserStats.opsPerSecond} ops/sec\n`);
    }

    async benchmarkMemoryUsage() {
        console.log('💾 Benchmarking Memory Usage...');
        
        const tests = {};
        
        // Initial memory
        const initialMemory = process.memoryUsage();
        
        // Create memory pressure
        const largeArrays = [];
        const createStart = performance.now();
        
        for (let i = 0; i < 100; i++) {
            largeArrays.push(new Array(10000).fill({ data: Math.random(), timestamp: Date.now() }));
        }
        
        const createEnd = performance.now();
        const afterCreationMemory = process.memoryUsage();
        
        // Cleanup
        largeArrays.length = 0;
        if (global.gc) {
            global.gc();
        }
        
        const afterCleanupMemory = process.memoryUsage();
        
        tests.memoryUsage = {
            initial: {
                rss: Math.round(initialMemory.rss / 1024 / 1024),
                heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024),
                heapTotal: Math.round(initialMemory.heapTotal / 1024 / 1024)
            },
            afterCreation: {
                rss: Math.round(afterCreationMemory.rss / 1024 / 1024),
                heapUsed: Math.round(afterCreationMemory.heapUsed / 1024 / 1024),
                heapTotal: Math.round(afterCreationMemory.heapTotal / 1024 / 1024)
            },
            afterCleanup: {
                rss: Math.round(afterCleanupMemory.rss / 1024 / 1024),
                heapUsed: Math.round(afterCleanupMemory.heapUsed / 1024 / 1024),
                heapTotal: Math.round(afterCleanupMemory.heapTotal / 1024 / 1024)
            },
            creationTime: Math.round(createEnd - createStart)
        };
        
        this.results.tests.memory = tests;
        console.log(`   Initial Memory: ${tests.memoryUsage.initial.rss}MB RSS, ${tests.memoryUsage.initial.heapUsed}MB Heap`);
        console.log(`   After Creation: ${tests.memoryUsage.afterCreation.rss}MB RSS, ${tests.memoryUsage.afterCreation.heapUsed}MB Heap`);
        console.log(`   After Cleanup: ${tests.memoryUsage.afterCleanup.rss}MB RSS, ${tests.memoryUsage.afterCleanup.heapUsed}MB Heap\n`);
    }

    async benchmarkConcurrency() {
        console.log('⚡ Benchmarking Concurrent Operations...');
        
        const tests = {};
        const userService = new UserService();
        
        // Test concurrent cache operations
        const cacheStart = performance.now();
        const cachePromises = [];
        
        for (let i = 0; i < 50; i++) {
            cachePromises.push(Promise.all([
                CacheService.set(`concurrent_${i}`, { value: i }),
                CacheService.get(`test_key_${i % 100}`),
                CacheService.has(`test_key_${i % 50}`)
            ]));
        }
        
        await Promise.all(cachePromises);
        const cacheEnd = performance.now();
        
        tests.concurrentCache = {
            operations: 150, // 50 * 3 operations
            totalTime: Math.round(cacheEnd - cacheStart),
            avgTime: Math.round((cacheEnd - cacheStart) / 150),
            opsPerSecond: Math.round(150000 / (cacheEnd - cacheStart))
        };
        
        // Test concurrent database queries
        const dbStart = performance.now();
        const dbPromises = [];
        const db = getDatabase();
        
        for (let i = 0; i < 20; i++) {
            dbPromises.push(db.get('SELECT COUNT(*) as count FROM users'));
        }
        
        await Promise.all(dbPromises);
        const dbEnd = performance.now();
        
        tests.concurrentDatabase = {
            operations: 20,
            totalTime: Math.round(dbEnd - dbStart),
            avgTime: Math.round((dbEnd - dbStart) / 20),
            opsPerSecond: Math.round(20000 / (dbEnd - dbStart))
        };
        
        this.results.tests.concurrency = tests;
        console.log(`   Concurrent Cache: ${tests.concurrentCache.avgTime}ms avg, ${tests.concurrentCache.opsPerSecond} ops/sec`);
        console.log(`   Concurrent Database: ${tests.concurrentDatabase.avgTime}ms avg, ${tests.concurrentDatabase.opsPerSecond} ops/sec\n`);
    }

    async generateReport() {
        console.log('📊 Generating Performance Report...');
        
        // Calculate overall scores
        this.results.summary = this.calculateOverallScores();
        
        // Save detailed results
        const reportPath = path.join(__dirname, '..', 'benchmark-results.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        
        // Generate markdown report
        const markdownReport = this.generateMarkdownReport();
        const markdownPath = path.join(__dirname, '..', 'benchmark-report.md');
        fs.writeFileSync(markdownPath, markdownReport);
        
        // Display summary
        this.displaySummary();
        
        console.log(`📄 Detailed results saved to: ${reportPath}`);
        console.log(`📄 Markdown report saved to: ${markdownPath}\n`);
    }

    calculateOverallScores() {
        const scores = {};
        
        // Database performance score (based on ops/sec)
        if (this.results.tests.database) {
            const dbTests = this.results.tests.database;
            const avgOpsPerSec = (dbTests.simpleSelect.opsPerSecond + dbTests.userCreation.opsPerSecond + dbTests.complexQuery.opsPerSecond) / 3;
            scores.database = Math.min(100, Math.round(avgOpsPerSec / 10));
        }
        
        // Cache performance score
        if (this.results.tests.cache) {
            const cacheTests = this.results.tests.cache;
            const avgOpsPerSec = (cacheTests.cacheWrite.opsPerSecond + cacheTests.cacheRead.opsPerSecond) / 2;
            scores.cache = Math.min(100, Math.round(avgOpsPerSec / 1000));
        }
        
        // Memory efficiency score
        if (this.results.tests.memory) {
            const memTests = this.results.tests.memory;
            const memoryEfficiency = Math.max(0, 100 - (memTests.memoryUsage.afterCreation.rss - memTests.memoryUsage.initial.rss));
            scores.memory = Math.max(0, Math.min(100, memoryEfficiency));
        }
        
        // Overall score
        const allScores = Object.values(scores);
        scores.overall = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
        
        return scores;
    }

    generateMarkdownReport() {
        const { summary, tests, system } = this.results;
        
        return `# Performance Benchmark Report

Generated: ${this.results.timestamp}

## System Information
- **Platform:** ${system.platform} ${system.arch}
- **Node.js:** ${system.nodeVersion}
- **CPU:** ${system.cpu} (${system.cpuCount} cores)
- **Memory:** ${system.memory.total} total, ${system.memory.free} free

## Performance Scores
- **Overall Score:** ${summary.overall}/100
- **Database Performance:** ${summary.database || 'N/A'}/100
- **Cache Performance:** ${summary.cache || 'N/A'}/100
- **Memory Efficiency:** ${summary.memory || 'N/A'}/100

## Detailed Results

### Database Operations
${tests.database ? `
| Operation | Avg Time (ms) | Ops/sec |
|-----------|---------------|---------|
| Simple SELECT | ${tests.database.simpleSelect.avgTime} | ${tests.database.simpleSelect.opsPerSecond} |
| User Creation | ${tests.database.userCreation.avgTime} | ${tests.database.userCreation.opsPerSecond} |
| Complex Query | ${tests.database.complexQuery.avgTime} | ${tests.database.complexQuery.opsPerSecond} |
` : 'Not tested'}

### Cache Operations
${tests.cache ? `
| Operation | Avg Time (ms) | Ops/sec | Hit Rate |
|-----------|---------------|---------|----------|
| Cache Write | ${tests.cache.cacheWrite.avgTime} | ${tests.cache.cacheWrite.opsPerSecond} | - |
| Cache Read | ${tests.cache.cacheRead.avgTime} | ${tests.cache.cacheRead.opsPerSecond} | ${tests.cache.cacheRead.hitRate}% |
| Cache Miss | ${tests.cache.cacheMiss.avgTime} | ${tests.cache.cacheMiss.opsPerSecond} | - |
` : 'Not tested'}

### Memory Usage
${tests.memory ? `
| Stage | RSS (MB) | Heap Used (MB) | Heap Total (MB) |
|-------|----------|----------------|-----------------|
| Initial | ${tests.memory.memoryUsage.initial.rss} | ${tests.memory.memoryUsage.initial.heapUsed} | ${tests.memory.memoryUsage.initial.heapTotal} |
| After Creation | ${tests.memory.memoryUsage.afterCreation.rss} | ${tests.memory.memoryUsage.afterCreation.heapUsed} | ${tests.memory.memoryUsage.afterCreation.heapTotal} |
| After Cleanup | ${tests.memory.memoryUsage.afterCleanup.rss} | ${tests.memory.memoryUsage.afterCleanup.heapUsed} | ${tests.memory.memoryUsage.afterCleanup.heapTotal} |
` : 'Not tested'}

### Concurrent Operations
${tests.concurrency ? `
| Operation | Avg Time (ms) | Ops/sec |
|-----------|---------------|---------|
| Concurrent Cache | ${tests.concurrency.concurrentCache.avgTime} | ${tests.concurrency.concurrentCache.opsPerSecond} |
| Concurrent Database | ${tests.concurrency.concurrentDatabase.avgTime} | ${tests.concurrency.concurrentDatabase.opsPerSecond} |
` : 'Not tested'}

## Recommendations
${this.generateRecommendations()}
`;
    }

    generateRecommendations() {
        const { summary, tests } = this.results;
        const recommendations = [];
        
        if (summary.overall < 70) {
            recommendations.push('- Overall performance is below optimal. Consider system optimization.');
        }
        
        if (summary.database && summary.database < 60) {
            recommendations.push('- Database performance is low. Consider adding more indexes or optimizing queries.');
        }
        
        if (summary.cache && summary.cache < 70) {
            recommendations.push('- Cache performance could be improved. Consider increasing cache size or optimizing cache keys.');
        }
        
        if (summary.memory && summary.memory < 60) {
            recommendations.push('- Memory usage is high. Consider implementing better memory management or increasing available RAM.');
        }
        
        if (tests.memory && tests.memory.memoryUsage.afterCreation.rss > 1500) {
            recommendations.push('- Memory usage exceeds 1.5GB. Monitor for memory leaks and consider garbage collection optimization.');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('- System performance is optimal. Continue monitoring.');
        }
        
        return recommendations.join('\n');
    }

    displaySummary() {
        console.log('📊 BENCHMARK SUMMARY');
        console.log('==========================================');
        console.log(`Overall Score: ${this.results.summary.overall}/100`);
        
        if (this.results.summary.database) {
            console.log(`Database Performance: ${this.results.summary.database}/100`);
        }
        if (this.results.summary.cache) {
            console.log(`Cache Performance: ${this.results.summary.cache}/100`);
        }
        if (this.results.summary.memory) {
            console.log(`Memory Efficiency: ${this.results.summary.memory}/100`);
        }
        
        console.log('==========================================');
        
        // Performance rating
        const overall = this.results.summary.overall;
        let rating = '';
        if (overall >= 90) rating = 'Excellent 🚀';
        else if (overall >= 80) rating = 'Very Good ✅';
        else if (overall >= 70) rating = 'Good 👍';
        else if (overall >= 60) rating = 'Fair ⚠️';
        else rating = 'Needs Improvement ❌';
        
        console.log(`Performance Rating: ${rating}`);
        console.log('==========================================\n');
    }

    async cleanup() {
        console.log('🧹 Cleaning up test environment...');
        
        try {
            // Clear test cache entries
            for (let i = 0; i < 1000; i++) {
                CacheService.delete(`test_key_${i}`);
                CacheService.delete(`concurrent_${i}`);
            }
            
            // Clean up test users from database
            const db = getDatabase();
            await db.run('DELETE FROM users WHERE telegram_id LIKE "test_%"');
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            console.log('✅ Cleanup completed\n');
            
        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'run':
        case undefined:
            const benchmark = new BenchmarkSuite();
            benchmark.run().then(() => {
                console.log('🎉 Benchmark completed successfully!');
                process.exit(0);
            }).catch(error => {
                console.error('💥 Benchmark failed:', error);
                process.exit(1);
            });
            break;
            
        case 'quick':
            console.log('🏃 Running quick benchmark (basic tests only)...');
            // TODO: Implement quick benchmark
            break;
            
        case 'help':
            console.log(`
🚀 Benchmark Tool Usage:

Commands:
  npm run benchmark [command]
  
  run (default)  - Run full benchmark suite
  quick         - Run quick benchmark (basic tests only)
  help          - Show this help message

Examples:
  npm run benchmark
  npm run benchmark run
  npm run benchmark quick
            `);
            break;
            
        default:
            console.error(`Unknown command: ${command}`);
            console.log('Use "npm run benchmark help" for usage information');
            process.exit(1);
    }
}

module.exports = BenchmarkSuite;