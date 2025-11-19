/**
 * Log Aggregation Configuration
 * Supports ELK Stack, CloudWatch, and other log aggregation services
 */

const winston = require('winston');
require('winston-daily-rotate-file');

class LogAggregationService {
  constructor() {
    this.logger = null;
    this.initialized = false;
  }

  /**
   * Initialize log aggregation service
   */
  init() {
    const transports = [];

    // Console transport for development
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
          })
        ),
      })
    );

    // Rotating file transport
    transports.push(
      new winston.transports.DailyRotateFile({
        filename: '/var/log/scrapi/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );

    // Error file transport
    transports.push(
      new winston.transports.DailyRotateFile({
        filename: '/var/log/scrapi/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );

    // Create logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'scrapi-backend',
        environment: process.env.NODE_ENV || 'development',
      },
      transports,
    });

    this.initialized = true;
    this.logger.info('Log aggregation service initialized');
  }

  /**
   * Get ELK Stack configuration
   */
  getElkConfig() {
    return {
      logstash: {
        input: {
          file: {
            path: '/var/log/scrapi/application-*.log',
            start_position: 'beginning',
            codec: 'json',
          },
        },
        filter: {
          json: {
            source: 'message',
          },
          date: {
            match: ['timestamp', 'ISO8601'],
          },
        },
        output: {
          elasticsearch: {
            hosts: [process.env.ELASTICSEARCH_URL || 'http://localhost:9200'],
            index: 'scrapi-logs-%{+YYYY.MM.dd}',
          },
        },
      },
      elasticsearch: {
        index_patterns: ['scrapi-logs-*'],
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
          'index.lifecycle.name': 'scrapi-logs-policy',
          'index.lifecycle.rollover_alias': 'scrapi-logs',
        },
        mappings: {
          properties: {
            timestamp: { type: 'date' },
            level: { type: 'keyword' },
            message: { type: 'text' },
            service: { type: 'keyword' },
            environment: { type: 'keyword' },
            userId: { type: 'keyword' },
            requestId: { type: 'keyword' },
          },
        },
      },
      kibana: {
        dashboards: [
          {
            title: 'Scrapi Application Logs',
            description: 'Overview of application logs',
            visualizations: [
              'Log Level Distribution',
              'Error Rate Over Time',
              'Top Error Messages',
              'Requests by User',
            ],
          },
        ],
      },
    };
  }

  /**
   * Get CloudWatch configuration
   */
  getCloudWatchConfig() {
    return {
      region: process.env.AWS_REGION || 'us-east-1',
      logGroupName: '/aws/scrapi/backend',
      logStreamName: `${process.env.NODE_ENV}-${new Date().toISOString().split('T')[0]}`,
      uploadRate: 2000,
      retentionInDays: 30,
      awsConfig: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    };
  }

  /**
   * Log with structured data
   */
  log(level, message, meta = {}) {
    if (!this.initialized) {
      console[level] || console.log(message, meta);
      return;
    }

    this.logger.log(level, message, meta);
  }

  info(message, meta) {
    this.log('info', message, meta);
  }

  warn(message, meta) {
    this.log('warn', message, meta);
  }

  error(message, meta) {
    this.log('error', message, meta);
  }

  debug(message, meta) {
    this.log('debug', message, meta);
  }

  /**
   * Get log statistics
   */
  async getLogStats() {
    // This would query Elasticsearch or CloudWatch for stats
    return {
      totalLogs: 'N/A (Connect to Elasticsearch)',
      errorRate: 'N/A',
      topErrors: [],
      logVolumeByLevel: {},
    };
  }
}

module.exports = new LogAggregationService();
