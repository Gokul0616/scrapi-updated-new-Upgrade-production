/**
 * Performance Optimization Configuration
 * Compression, caching, and optimization strategies
 */

const compression = require('compression');

class PerformanceService {
  /**
   * Get compression middleware
   */
  getCompressionMiddleware() {
    return compression({
      level: 6,
      threshold: 1024, // Only compress responses > 1KB
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
    });
  }

  /**
   * Get response time middleware
   */
  getResponseTimeMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      
      const originalEnd = res.end;
      res.end = function(...args) {
        const duration = Date.now() - start;
        
        // Set header before ending response
        if (!res.headersSent) {
          res.setHeader('X-Response-Time', `${duration}ms`);
        }
        
        // Log slow requests
        if (duration > 1000) {
          console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
        }
        
        originalEnd.apply(res, args);
      };
      
      next();
    };
  }

  /**
   * Get static asset optimization headers
   */
  getStaticAssetHeaders() {
    return (req, res, next) => {
      // Set cache headers for static assets
      if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Vary', 'Accept-Encoding');
      }
      next();
    };
  }

  /**
   * Database query optimization tips
   */
  getDatabaseOptimizationTips() {
    return [
      {
        category: 'Indexing',
        tips: [
          'Create indexes on frequently queried fields',
          'Use compound indexes for queries with multiple conditions',
          'Monitor index usage with MongoDB explain()',
          'Remove unused indexes to improve write performance',
        ],
      },
      {
        category: 'Query Optimization',
        tips: [
          'Use projection to return only required fields',
          'Limit result sets with .limit()',
          'Use lean() for read-only queries',
          'Implement pagination for large result sets',
        ],
      },
      {
        category: 'Caching',
        tips: [
          'Cache frequently accessed data in Redis',
          'Set appropriate TTL for cached data',
          'Invalidate cache on data updates',
          'Use cache-aside pattern for optimal performance',
        ],
      },
      {
        category: 'Connection Pooling',
        tips: [
          'Configure appropriate pool size (default: 5)',
          'Monitor connection usage',
          'Set proper timeout values',
          'Implement connection retry logic',
        ],
      },
    ];
  }

  /**
   * Frontend optimization recommendations
   */
  getFrontendOptimizationTips() {
    return [
      {
        category: 'Code Splitting',
        tips: [
          'Implement lazy loading for routes',
          'Split vendor bundles',
          'Use dynamic imports for large components',
          'Analyze bundle size with webpack-bundle-analyzer',
        ],
      },
      {
        category: 'Image Optimization',
        tips: [
          'Use WebP format with fallbacks',
          'Implement lazy loading for images',
          'Use appropriate image sizes',
          'Enable CDN for image delivery',
        ],
      },
      {
        category: 'Caching Strategy',
        tips: [
          'Implement service worker for offline support',
          'Use Cache-Control headers effectively',
          'Version static assets',
          'Leverage browser caching',
        ],
      },
      {
        category: 'Performance Monitoring',
        tips: [
          'Use Lighthouse for performance audits',
          'Monitor Core Web Vitals',
          'Implement Real User Monitoring (RUM)',
          'Set performance budgets',
        ],
      },
    ];
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      memory: {
        used: process.memoryUsage().heapUsed / 1024 / 1024,
        total: process.memoryUsage().heapTotal / 1024 / 1024,
        external: process.memoryUsage().external / 1024 / 1024,
        rss: process.memoryUsage().rss / 1024 / 1024,
      },
      uptime: process.uptime(),
      cpu: process.cpuUsage(),
      eventLoop: {
        // Would need perf_hooks for accurate measurements
        lag: 'Use perf_hooks.monitorEventLoopDelay() for accurate measurement',
      },
    };
  }
}

module.exports = new PerformanceService();
