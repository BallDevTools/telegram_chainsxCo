class CacheService {
    constructor(maxSize = 5000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0
        };
        
        // Cleanup interval every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
        
        console.log(`🗄️ Cache service initialized (max size: ${maxSize})`);
    }

    set(key, value, ttl = 3600) {
        try {
            // Auto cleanup when reaching max size
            if (this.cache.size >= this.maxSize) {
                this.evictOldest();
            }
            
            const expires = Date.now() + (ttl * 1000);
            this.cache.set(key, {
                value,
                expires,
                created: Date.now(),
                accessed: Date.now(),
                accessCount: 0
            });
            
            this.stats.sets++;
            return true;
            
        } catch (error) {
            console.error('❌ Cache set error:', error);
            return false;
        }
    }

    get(key) {
        try {
            const item = this.cache.get(key);
            
            if (!item) {
                this.stats.misses++;
                return null;
            }
            
            // Check if expired
            if (Date.now() > item.expires) {
                this.cache.delete(key);
                this.stats.misses++;
                return null;
            }
            
            // Update access info
            item.accessed = Date.now();
            item.accessCount++;
            
            this.stats.hits++;
            return item.value;
            
        } catch (error) {
            console.error('❌ Cache get error:', error);
            this.stats.misses++;
            return null;
        }
    }

    has(key) {
        const item = this.cache.get(key);
        if (!item) return false;
        
        // Check if expired
        if (Date.now() > item.expires) {
            this.cache.delete(key);
            return false;
        }
        
        return true;
    }

    delete(key) {
        try {
            const deleted = this.cache.delete(key);
            if (deleted) {
                this.stats.deletes++;
            }
            return deleted;
            
        } catch (error) {
            console.error('❌ Cache delete error:', error);
            return false;
        }
    }

    clear() {
        try {
            const size = this.cache.size;
            this.cache.clear();
            console.log(`🗑️ Cleared ${size} items from cache`);
            return true;
            
        } catch (error) {
            console.error('❌ Cache clear error:', error);
            return false;
        }
    }

    // Get cache statistics
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;
        
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: `${hitRate}%`,
            hits: this.stats.hits,
            misses: this.stats.misses,
            sets: this.stats.sets,
            deletes: this.stats.deletes,
            evictions: this.stats.evictions,
            memoryUsage: this.getMemoryUsage()
        };
    }

    // Get top accessed keys
    getTopKeys(limit = 10) {
        try {
            const items = Array.from(this.cache.entries())
                .map(([key, item]) => ({
                    key,
                    accessCount: item.accessCount,
                    created: item.created,
                    accessed: item.accessed,
                    expires: item.expires
                }))
                .sort((a, b) => b.accessCount - a.accessCount)
                .slice(0, limit);
            
            return items;
            
        } catch (error) {
            console.error('❌ Error getting top keys:', error);
            return [];
        }
    }

    // Cleanup expired items
    cleanup() {
        try {
            const now = Date.now();
            let expired = 0;
            
            for (const [key, item] of this.cache.entries()) {
                if (now > item.expires) {
                    this.cache.delete(key);
                    expired++;
                }
            }
            
            if (expired > 0) {
                console.log(`🧹 Cleaned up ${expired} expired cache items`);
            }
            
            return expired;
            
        } catch (error) {
            console.error('❌ Cache cleanup error:', error);
            return 0;
        }
    }

    // Evict oldest items when cache is full
    evictOldest(count = 1) {
        try {
            const items = Array.from(this.cache.entries())
                .sort((a, b) => a[1].accessed - b[1].accessed)
                .slice(0, count);
            
            for (const [key] of items) {
                this.cache.delete(key);
                this.stats.evictions++;
            }
            
            if (items.length > 0) {
                console.log(`🔄 Evicted ${items.length} oldest cache items`);
            }
            
            return items.length;
            
        } catch (error) {
            console.error('❌ Cache eviction error:', error);
            return 0;
        }
    }

    // Get memory usage estimation
    getMemoryUsage() {
        try {
            let totalSize = 0;
            
            for (const [key, item] of this.cache.entries()) {
                // Rough estimation of memory usage
                totalSize += key.length * 2; // String key
                totalSize += JSON.stringify(item.value).length * 2; // Value
                totalSize += 64; // Overhead for object structure
            }
            
            return {
                estimated: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
                bytesPerItem: totalSize / Math.max(this.cache.size, 1),
                items: this.cache.size
            };
            
        } catch (error) {
            console.error('❌ Error calculating memory usage:', error);
            return { estimated: 'Unknown', bytesPerItem: 0, items: 0 };
        }
    }

    // Advanced: Get items by pattern
    getByPattern(pattern) {
        try {
            const regex = new RegExp(pattern);
            const matches = [];
            
            for (const [key, item] of this.cache.entries()) {
                if (regex.test(key)) {
                    // Check if expired
                    if (Date.now() <= item.expires) {
                        matches.push({
                            key,
                            value: item.value,
                            expires: item.expires
                        });
                    } else {
                        // Remove expired item
                        this.cache.delete(key);
                    }
                }
            }
            
            return matches;
            
        } catch (error) {
            console.error('❌ Error getting items by pattern:', error);
            return [];
        }
    }

    // Advanced: Set multiple items at once
    setMultiple(items, ttl = 3600) {
        try {
            let successful = 0;
            
            for (const [key, value] of Object.entries(items)) {
                if (this.set(key, value, ttl)) {
                    successful++;
                }
            }
            
            return successful;
            
        } catch (error) {
            console.error('❌ Error setting multiple items:', error);
            return 0;
        }
    }

    // Advanced: Delete items by pattern
    deleteByPattern(pattern) {
        try {
            const regex = new RegExp(pattern);
            let deleted = 0;
            
            for (const key of this.cache.keys()) {
                if (regex.test(key)) {
                    if (this.cache.delete(key)) {
                        deleted++;
                        this.stats.deletes++;
                    }
                }
            }
            
            if (deleted > 0) {
                console.log(`🗑️ Deleted ${deleted} items matching pattern: ${pattern}`);
            }
            
            return deleted;
            
        } catch (error) {
            console.error('❌ Error deleting by pattern:', error);
            return 0;
        }
    }

    // Get items expiring soon
    getExpiringSoon(minutes = 5) {
        try {
            const threshold = Date.now() + (minutes * 60 * 1000);
            const expiring = [];
            
            for (const [key, item] of this.cache.entries()) {
                if (item.expires <= threshold && item.expires > Date.now()) {
                    expiring.push({
                        key,
                        expiresIn: Math.round((item.expires - Date.now()) / 1000)
                    });
                }
            }
            
            return expiring.sort((a, b) => a.expiresIn - b.expiresIn);
            
        } catch (error) {
            console.error('❌ Error getting expiring items:', error);
            return [];
        }
    }

    // Extend TTL for an item
    extend(key, additionalTtl) {
        try {
            const item = this.cache.get(key);
            if (!item) return false;
            
            // Check if expired
            if (Date.now() > item.expires) {
                this.cache.delete(key);
                return false;
            }
            
            item.expires += (additionalTtl * 1000);
            return true;
            
        } catch (error) {
            console.error('❌ Error extending TTL:', error);
            return false;
        }
    }

    // Get detailed info about a specific key
    getInfo(key) {
        try {
            const item = this.cache.get(key);
            if (!item) return null;
            
            const now = Date.now();
            
            return {
                key,
                exists: true,
                expired: now > item.expires,
                created: new Date(item.created).toISOString(),
                accessed: new Date(item.accessed).toISOString(),
                expires: new Date(item.expires).toISOString(),
                accessCount: item.accessCount,
                ttlRemaining: Math.max(0, Math.round((item.expires - now) / 1000)),
                size: JSON.stringify(item.value).length
            };
            
        } catch (error) {
            console.error('❌ Error getting key info:', error);
            return null;
        }
    }

    // Shutdown cleanup
    shutdown() {
        try {
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
            }
            
            const stats = this.getStats();
            console.log('🗄️ Cache service shutdown:', stats);
            
            this.clear();
            
        } catch (error) {
            console.error('❌ Error during cache shutdown:', error);
        }
    }
}

// Create singleton instance
const cacheService = new CacheService(
    parseInt(process.env.MAX_CACHE_SIZE) || 5000
);

module.exports = cacheService;