const redis = require('redis');
const logger = require('./logger');

/**
 * Redis Cache Manager
 * Provides caching functionality for frequently accessed data
 */

class CacheManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = parseInt(process.env.CACHE_DEFAULT_TTL) || 3600; // 1 hour
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis reconnection failed after 10 attempts');
              return new Error('Redis connection failed');
            }
            return retries * 100; // Exponential backoff
          }
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis cache connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis cache disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      logger.error('Failed to connect to Redis cache:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.isConnected) return null;

    try {
      const value = await this.client.get(key);
      if (value) {
        logger.debug(`Cache hit: ${key}`);
        return JSON.parse(value);
      }
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = null) {
    if (!this.isConnected) return false;

    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;

      await this.client.setEx(key, expiry, serialized);
      logger.debug(`Cache set: ${key} (TTL: ${expiry}s)`);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    if (!this.isConnected) return false;

    try {
      await this.client.del(key);
      logger.debug(`Cache deleted: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern) {
    if (!this.isConnected) return false;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.debug(`Cache deleted ${keys.length} keys matching: ${pattern}`);
      }
      return true;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error.message);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async flushAll() {
    if (!this.isConnected) return false;

    try {
      await this.client.flushAll();
      logger.info('Cache flushed');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isConnected) return null;

    try {
      const info = await this.client.info('stats');
      return {
        connected: this.isConnected,
        info: info
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error.message);
      return null;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      logger.info('Redis cache disconnected');
    }
  }
}

module.exports = new CacheManager();
