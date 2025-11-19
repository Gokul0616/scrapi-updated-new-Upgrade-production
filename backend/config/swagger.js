/**
 * Swagger/OpenAPI Documentation Configuration
 */

const swaggerJsDoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Scrapi API Documentation',
      version: '1.0.0',
      description: 'Web Scraping Platform API - Similar to Apify',
      contact: {
        name: 'Scrapi Team',
        email: 'support@scrapi.io'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:8001',
        description: 'Development server'
      },
      {
        url: 'https://api.scrapi.io',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key for authentication'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            status: {
              type: 'integer',
              description: 'HTTP status code'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            createdAt: { type: 'string', format: 'date-time' },
            apiTokens: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  token: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        Actor: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            actorId: { type: 'string' },
            name: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            platform: { type: 'string' },
            userId: { type: 'string' },
            isPublic: { type: 'boolean' },
            version: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Run: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            runId: { type: 'string' },
            actorId: { type: 'string' },
            userId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['pending', 'running', 'completed', 'failed']
            },
            input: { type: 'object' },
            output: { type: 'object' },
            startedAt: { type: 'string', format: 'date-time' },
            finishedAt: { type: 'string', format: 'date-time' },
            duration: { type: 'number' },
            resultCount: { type: 'number' }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy']
            },
            timestamp: { type: 'string', format: 'date-time' },
            services: {
              type: 'object',
              properties: {
                mongodb: { type: 'string' },
                redis: { type: 'string' },
                websocket: { type: 'string' },
                api: { type: 'string' }
              }
            },
            uptime: { type: 'number' },
            environment: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js', './server.js'] // Path to API routes with JSDoc comments
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

module.exports = swaggerSpec;
