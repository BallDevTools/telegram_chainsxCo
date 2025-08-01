#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
require('dotenv').config();

class MigrationRunner {
    constructor() {
        this.dbPath = process.env.DATABASE_PATH || './database/bot.db';
        this.migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
        this.db = null;
    }

    async run() {
        console.log('🔄 Running database migrations...\n');
        
        try {
            await this.initializeDb();
            await this.createMigrationsTable();
            await this.runPendingMigrations();
            await this.optimizeDatabase();
            
            console.log('\n✅ All migrations completed successfully!');
            
        } catch (error) {
            console.error('\n❌ Migration failed:', error);
            process.exit(1);
        } finally {
            if (this.db) {
                await this.db.close();
            }
        }
    }

    async initializeDb() {
        console.log('📁 Connecting to database...');
        
        // Ensure database directory exists
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        this.db = await open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });
        
        // Enable WAL mode and other optimizations
        await this.db.exec('PRAGMA journal_mode = WAL');
        await this.db.exec('PRAGMA synchronous = NORMAL');
        await this.db.exec('PRAGMA cache_size = 10000');
        await this.db.exec('PRAGMA temp_store = MEMORY');
        
        console.log(`✅ Connected to database: ${this.dbPath}`);
    }

    async createMigrationsTable() {
        console.log('📋 Setting up migrations table...');
        
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT UNIQUE NOT NULL,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                success BOOLEAN DEFAULT 1,
                error_message TEXT
            )
        `);
        
        console.log('✅ Migrations table ready');
    }

    async runPendingMigrations() {
        console.log('🔍 Checking for pending migrations...');
        
        // Create migrations directory if it doesn't exist
        if (!fs.existsSync(this.migrationsDir)) {
            fs.mkdirSync(this.migrationsDir, { recursive: true });
            console.log('📁 Created migrations directory');
        }
        
        // Get all migration files
        const migrationFiles = fs.readdirSync(this.migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Execute in alphabetical order
        
        if (migrationFiles.length === 0) {
            console.log('ℹ️ No migration files found');
            return;
        }
        
        // Get already executed migrations
        const executedMigrations = await this.db.all(
            'SELECT filename FROM migrations WHERE success = 1'
        );
        const executedSet = new Set(executedMigrations.map(m => m.filename));
        
        // Find pending migrations
        const pendingMigrations = migrationFiles.filter(file => !executedSet.has(file));
        
        if (pendingMigrations.length === 0) {
            console.log('✅ All migrations are up to date');
            return;
        }
        
        console.log(`📄 Found ${pendingMigrations.length} pending migrations:`);
        pendingMigrations.forEach(file => console.log(`  - ${file}`));
        
        // Execute each pending migration
        for (const migrationFile of pendingMigrations) {
            await this.executeMigration(migrationFile);
        }
    }

    async executeMigration(filename) {
        console.log(`\n🔄 Executing migration: ${filename}`);
        
        const filePath = path.join(this.migrationsDir, filename);
        const migrationSql = fs.readFileSync(filePath, 'utf8');
        
        try {
            // Start transaction
            await this.db.exec('BEGIN TRANSACTION');
            
            // Execute migration SQL
            await this.db.exec(migrationSql);
            
            // Record successful migration
            await this.db.run(
                'INSERT INTO migrations (filename, success) VALUES (?, 1)',
                [filename]
            );
            
            // Commit transaction
            await this.db.exec('COMMIT');
            
            console.log(`✅ Migration completed: ${filename}`);
            
        } catch (error) {
            // Rollback transaction
            await this.db.exec('ROLLBACK');
            
            // Record failed migration
            await this.db.run(
                'INSERT INTO migrations (filename, success, error_message) VALUES (?, 0, ?)',
                [filename, error.message]
            );
            
            console.error(`❌ Migration failed: ${filename}`);
            console.error(`   Error: ${error.message}`);
            
            throw error;
        }
    }

    async optimizeDatabase() {
        console.log('\n🔧 Optimizing database...');
        
        try {
            // Analyze tables for query optimization
            await this.db.exec('ANALYZE');
            console.log('✅ Database analysis completed');
            
            // Vacuum to reclaim space
            await this.db.exec('VACUUM');
            console.log('✅ Database vacuum completed');
            
            // Get database info
            const result = await this.db.get('PRAGMA page_count');
            const pageSize = await this.db.get('PRAGMA page_size');
            const dbSize = (result.page_count * pageSize.page_size / 1024 / 1024).toFixed(2);
            
            console.log(`📊 Database size: ${dbSize} MB`);
            
        } catch (error) {
            console.warn('⚠️ Database optimization warning:', error.message);
        }
    }

    // Rollback last migration (for development)
    async rollbackLast() {
        console.log('↩️ Rolling back last migration...');
        
        try {
            await this.initializeDb();
            
            const lastMigration = await this.db.get(
                'SELECT * FROM migrations WHERE success = 1 ORDER BY executed_at DESC LIMIT 1'
            );
            
            if (!lastMigration) {
                console.log('ℹ️ No migrations to rollback');
                return;
            }
            
            // Check if rollback file exists
            const rollbackFile = lastMigration.filename.replace('.sql', '.rollback.sql');
            const rollbackPath = path.join(this.migrationsDir, rollbackFile);
            
            if (!fs.existsSync(rollbackPath)) {
                throw new Error(`Rollback file not found: ${rollbackFile}`);
            }
            
            console.log(`🔄 Rolling back: ${lastMigration.filename}`);
            
            const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');
            
            await this.db.exec('BEGIN TRANSACTION');
            await this.db.exec(rollbackSql);
            await this.db.run(
                'DELETE FROM migrations WHERE filename = ?',
                [lastMigration.filename]
            );
            await this.db.exec('COMMIT');
            
            console.log(`✅ Rollback completed: ${lastMigration.filename}`);
            
        } catch (error) {
            if (this.db) {
                await this.db.exec('ROLLBACK');
            }
            console.error('❌ Rollback failed:', error);
            throw error;
        } finally {
            if (this.db) {
                await this.db.close();
            }
        }
    }

    // Create new migration file
    async createMigration(name) {
        if (!name) {
            throw new Error('Migration name is required');
        }
        
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const filename = `${timestamp}_${name}.sql`;
        const rollbackFilename = `${timestamp}_${name}.rollback.sql`;
        
        // Create migrations directory if it doesn't exist
        if (!fs.existsSync(this.migrationsDir)) {
            fs.mkdirSync(this.migrationsDir, { recursive: true });
        }
        
        const migrationPath = path.join(this.migrationsDir, filename);
        const rollbackPath = path.join(this.migrationsDir, rollbackFilename);
        
        const migrationTemplate = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example (
--     id INTEGER PRIMARY KEY,
--     name TEXT NOT NULL
-- );

-- CREATE INDEX idx_example_name ON example (name);
`;

        const rollbackTemplate = `-- Rollback: ${name}
-- Created: ${new Date().toISOString()}

-- Add your rollback SQL here
-- Example:
-- DROP INDEX IF EXISTS idx_example_name;
-- DROP TABLE IF EXISTS example;
`;
        
        fs.writeFileSync(migrationPath, migrationTemplate);
        fs.writeFileSync(rollbackPath, rollbackTemplate);
        
        console.log(`✅ Created migration files:`);
        console.log(`   ${filename}`);
        console.log(`   ${rollbackFilename}`);
        
        return { migrationPath, rollbackPath };
    }

    // Show migration status
    async status() {
        console.log('📊 Migration Status\n');
        
        try {
            await this.initializeDb();
            
            // Get all migrations from database
            const dbMigrations = await this.db.all(
                'SELECT filename, executed_at, success FROM migrations ORDER BY executed_at'
            );
            
            // Get all migration files
            const migrationFiles = fs.existsSync(this.migrationsDir) 
                ? fs.readdirSync(this.migrationsDir)
                    .filter(file => file.endsWith('.sql') && !file.includes('.rollback.'))
                    .sort()
                : [];
            
            const executedSet = new Set(dbMigrations.map(m => m.filename));
            
            console.log('Executed Migrations:');
            if (dbMigrations.length === 0) {
                console.log('  (none)');
            } else {
                dbMigrations.forEach(migration => {
                    const status = migration.success ? '✅' : '❌';
                    console.log(`  ${status} ${migration.filename} (${migration.executed_at})`);
                });
            }
            
            const pendingMigrations = migrationFiles.filter(file => !executedSet.has(file));
            
            console.log('\nPending Migrations:');
            if (pendingMigrations.length === 0) {
                console.log('  (none)');
            } else {
                pendingMigrations.forEach(file => {
                    console.log(`  ⏳ ${file}`);
                });
            }
            
            console.log(`\nSummary: ${dbMigrations.length} executed, ${pendingMigrations.length} pending`);
            
        } catch (error) {
            console.error('❌ Failed to get migration status:', error);
        } finally {
            if (this.db) {
                await this.db.close();
            }
        }
    }
}

// CLI interface
if (require.main === module) {
    const command = process.argv[2];
    const arg = process.argv[3];
    
    const migrationRunner = new MigrationRunner();
    
    switch (command) {
        case 'up':
        case 'migrate':
            migrationRunner.run();
            break;
            
        case 'rollback':
            migrationRunner.rollbackLast();
            break;
            
        case 'create':
            if (!arg) {
                console.error('❌ Migration name required: npm run migrate create <name>');
                process.exit(1);
            }
            migrationRunner.createMigration(arg);
            break;
            
        case 'status':
            migrationRunner.status();
            break;
            
        default:
            console.log('🔄 Database Migration Tool\n');
            console.log('Usage:');
            console.log('  npm run migrate           - Run pending migrations');
            console.log('  npm run migrate status    - Show migration status');
            console.log('  npm run migrate create <name> - Create new migration');
            console.log('  npm run migrate rollback  - Rollback last migration');
            break;
    }
}

module.exports = MigrationRunner;