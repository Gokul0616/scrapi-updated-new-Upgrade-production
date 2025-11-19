const logger = require('./logger');

/**
 * Prometheus Metrics Collector
 * Collects and exposes application metrics
 */

class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        byEndpoint: {}
      },
      scraping: {
        total: 0,
        success: 0,
        failed: 0,
        inProgress: 0,
        byPlatform: {}
      },
      users: {
        total: 0,
        active: 0,
        registrations: 0
      },
      system: {
        uptime: 0,
        memory: {},
        cpu: {}
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      }
    };

    this.startTime = Date.now();
  }

  /**
   * Record HTTP request
   */
  recordRequest(endpoint, success = true) {
    this.metrics.requests.total++;
    
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.error++;
    }

    // Track by endpoint
    if (!this.metrics.requests.byEndpoint[endpoint]) {
      this.metrics.requests.byEndpoint[endpoint] = { total: 0, success: 0, error: 0 };
    }
    this.metrics.requests.byEndpoint[endpoint].total++;
    this.metrics.requests.byEndpoint[endpoint][success ? 'success' : 'error']++;
  }

  /**
   * Record scraping job
   */
  recordScraping(platform, status) {
    this.metrics.scraping.total++;

    if (status === 'success') {
      this.metrics.scraping.success++;
    } else if (status === 'failed') {
      this.metrics.scraping.failed++;
    } else if (status === 'inProgress') {
      this.metrics.scraping.inProgress++;
    }

    // Track by platform
    if (!this.metrics.scraping.byPlatform[platform]) {
      this.metrics.scraping.byPlatform[platform] = { total: 0, success: 0, failed: 0 };
    }
    this.metrics.scraping.byPlatform[platform].total++;
    if (status !== 'inProgress') {
      this.metrics.scraping.byPlatform[platform][status]++;
    }
  }

  /**
   * Update user metrics
   */
  updateUserMetrics(total, active) {
    this.metrics.users.total = total;
    this.metrics.users.active = active;
  }

  /**
   * Record user registration
   */
  recordRegistration() {
    this.metrics.users.registrations++;
  }

  /**
   * Record cache hit
   */
  recordCacheHit() {
    this.metrics.cache.hits++;
    this.updateCacheHitRate();
  }

  /**
   * Record cache miss
   */
  recordCacheMiss() {
    this.metrics.cache.misses++;
    this.updateCacheHitRate();
  }

  /**
   * Update cache hit rate
   */
  updateCacheHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total * 100).toFixed(2) : 0;
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics() {
    this.metrics.system.uptime = Math.floor((Date.now() - this.startTime) / 1000);
    this.metrics.system.memory = process.memoryUsage();
    this.metrics.system.cpu = process.cpuUsage();
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    this.updateSystemMetrics();
    return this.metrics;
  }

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusMetrics() {
    this.updateSystemMetrics();

    let output = '# HELP scrapi_requests_total Total number of HTTP requests\n';
    output += '# TYPE scrapi_requests_total counter\n';
    output += `scrapi_requests_total ${this.metrics.requests.total}\n\n`;

    output += '# HELP scrapi_requests_success Successful HTTP requests\n';
    output += '# TYPE scrapi_requests_success counter\n';
    output += `scrapi_requests_success ${this.metrics.requests.success}\n\n`;

    output += '# HELP scrapi_requests_error Failed HTTP requests\n';
    output += '# TYPE scrapi_requests_error counter\n';
    output += `scrapi_requests_error ${this.metrics.requests.error}\n\n`;

    output += '# HELP scrapi_scraping_total Total scraping jobs\n';
    output += '# TYPE scrapi_scraping_total counter\n';
    output += `scrapi_scraping_total ${this.metrics.scraping.total}\n\n`;

    output += '# HELP scrapi_scraping_success Successful scraping jobs\n';
    output += '# TYPE scrapi_scraping_success counter\n';
    output += `scrapi_scraping_success ${this.metrics.scraping.success}\n\n`;

    output += '# HELP scrapi_scraping_failed Failed scraping jobs\n';
    output += '# TYPE scrapi_scraping_failed counter\n';
    output += `scrapi_scraping_failed ${this.metrics.scraping.failed}\n\n`;

    output += '# HELP scrapi_users_total Total users\n';
    output += '# TYPE scrapi_users_total gauge\n';
    output += `scrapi_users_total ${this.metrics.users.total}\n\n`;

    output += '# HELP scrapi_cache_hit_rate Cache hit rate percentage\n';
    output += '# TYPE scrapi_cache_hit_rate gauge\n';
    output += `scrapi_cache_hit_rate ${this.metrics.cache.hitRate}\n\n`;

    output += '# HELP scrapi_uptime_seconds Application uptime in seconds\n';
    output += '# TYPE scrapi_uptime_seconds counter\n';
    output += `scrapi_uptime_seconds ${this.metrics.system.uptime}\n\n`;

    return output;
  }

  /**
   * Reset all metrics
   */
  reset() {
    logger.info('Resetting all metrics');
    this.metrics = {
      requests: { total: 0, success: 0, error: 0, byEndpoint: {} },
      scraping: { total: 0, success: 0, failed: 0, inProgress: 0, byPlatform: {} },
      users: { total: 0, active: 0, registrations: 0 },
      system: { uptime: 0, memory: {}, cpu: {} },
      cache: { hits: 0, misses: 0, hitRate: 0 }
    };
    this.startTime = Date.now();
  }

  /**
   * Get request rate (requests per second)
   * For auto-scaling metrics
   */
  getRequestRate() {
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    return uptimeSeconds > 0 ? this.metrics.requests.total / uptimeSeconds : 0;
  }
}

module.exports = new MetricsCollector();
