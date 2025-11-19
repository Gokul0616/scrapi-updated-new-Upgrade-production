/**
 * Error Monitoring Service (Sentry Integration)
 * Phase 3: Infrastructure - Error Tracking
 */

const logger = require('./logger');

class ErrorMonitoring {
  constructor() {
    this.sentryEnabled = false;
    this.environment = process.env.NODE_ENV || 'development';
    this.capturedErrors = [];
    this.maxStoredErrors = 100;
  }

  /**
   * Initialize Sentry (if SENTRY_DSN is provided)
   */
  async init() {
    const sentryDSN = process.env.SENTRY_DSN;
    
    if (!sentryDSN) {
      logger.info('Error monitoring: Sentry DSN not configured (running without Sentry)');
      return;
    }

    try {
      // Dynamic import of Sentry
      const Sentry = require('@sentry/node');
      
      Sentry.init({
        dsn: sentryDSN,
        environment: this.environment,
        tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: require('express')() }),
        ],
        beforeSend(event, hint) {
          // Filter out sensitive data
          if (event.request) {
            delete event.request.cookies;
            if (event.request.headers) {
              delete event.request.headers.authorization;
              delete event.request.headers.cookie;
            }
          }
          return event;
        },
      });

      this.Sentry = Sentry;
      this.sentryEnabled = true;
      logger.info('Error monitoring: Sentry initialized successfully');
    } catch (error) {
      logger.warn('Error monitoring: Failed to initialize Sentry:', error.message);
    }
  }

  /**
   * Capture exception
   */
  captureException(error, context = {}) {
    // Store locally for analytics
    this.capturedErrors.push({
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context,
      timestamp: new Date(),
      environment: this.environment,
    });

    // Trim stored errors if exceeding limit
    if (this.capturedErrors.length > this.maxStoredErrors) {
      this.capturedErrors = this.capturedErrors.slice(-this.maxStoredErrors);
    }

    // Log to Winston
    logger.error('Exception captured:', {
      error: error.message,
      stack: error.stack,
      context,
    });

    // Send to Sentry if enabled
    if (this.sentryEnabled && this.Sentry) {
      this.Sentry.captureException(error, {
        tags: context.tags,
        extra: context.extra,
        user: context.user,
      });
    }
  }

  /**
   * Capture message
   */
  captureMessage(message, level = 'info', context = {}) {
    logger[level](message, context);

    if (this.sentryEnabled && this.Sentry) {
      this.Sentry.captureMessage(message, {
        level,
        tags: context.tags,
        extra: context.extra,
      });
    }
  }

  /**
   * Set user context
   */
  setUser(user) {
    if (this.sentryEnabled && this.Sentry) {
      this.Sentry.setUser({
        id: user.id,
        username: user.username,
        email: user.email,
      });
    }
  }

  /**
   * Clear user context
   */
  clearUser() {
    if (this.sentryEnabled && this.Sentry) {
      this.Sentry.setUser(null);
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.capturedErrors.length,
      byType: {},
      recentErrors: this.capturedErrors.slice(-10),
    };

    this.capturedErrors.forEach((item) => {
      const errorName = item.error.name || 'Unknown';
      stats.byType[errorName] = (stats.byType[errorName] || 0) + 1;
    });

    return stats;
  }

  /**
   * Express middleware for error tracking
   */
  expressMiddleware() {
    return (err, req, res, next) => {
      this.captureException(err, {
        tags: {
          url: req.url,
          method: req.method,
        },
        extra: {
          body: req.body,
          query: req.query,
          params: req.params,
        },
        user: req.user ? {
          id: req.user.userId,
          username: req.user.username,
        } : undefined,
      });

      next(err);
    };
  }
}

// Create singleton instance
const errorMonitoring = new ErrorMonitoring();

module.exports = errorMonitoring;
