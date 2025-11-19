/**
 * Service Mesh Configuration
 * Istio, Linkerd, and other service mesh configurations
 */

class ServiceMeshService {
  /**
   * Get Istio configuration
   */
  getIstioConfig() {
    return {
      virtualService: {
        apiVersion: 'networking.istio.io/v1beta1',
        kind: 'VirtualService',
        metadata: {
          name: 'scrapi-backend',
          namespace: 'default',
        },
        spec: {
          hosts: ['scrapi-backend'],
          http: [
            {
              match: [{ uri: { prefix: '/api/' } }],
              route: [
                {
                  destination: {
                    host: 'scrapi-backend',
                    port: { number: 8001 },
                  },
                  weight: 100,
                },
              ],
              timeout: '30s',
              retries: {
                attempts: 3,
                perTryTimeout: '10s',
                retryOn: 'connect-failure,refused-stream,unavailable,cancelled,resource-exhausted',
              },
            },
          ],
        },
      },
      destinationRule: {
        apiVersion: 'networking.istio.io/v1beta1',
        kind: 'DestinationRule',
        metadata: {
          name: 'scrapi-backend',
          namespace: 'default',
        },
        spec: {
          host: 'scrapi-backend',
          trafficPolicy: {
            connectionPool: {
              tcp: {
                maxConnections: 100,
              },
              http: {
                http1MaxPendingRequests: 50,
                http2MaxRequests: 100,
                maxRequestsPerConnection: 2,
              },
            },
            loadBalancer: {
              simple: 'LEAST_REQUEST',
            },
            outlierDetection: {
              consecutiveErrors: 5,
              interval: '30s',
              baseEjectionTime: '30s',
              maxEjectionPercent: 50,
              minHealthPercent: 40,
            },
          },
        },
      },
      peerAuthentication: {
        apiVersion: 'security.istio.io/v1beta1',
        kind: 'PeerAuthentication',
        metadata: {
          name: 'scrapi-mtls',
          namespace: 'default',
        },
        spec: {
          mtls: {
            mode: 'STRICT',
          },
        },
      },
      authorizationPolicy: {
        apiVersion: 'security.istio.io/v1beta1',
        kind: 'AuthorizationPolicy',
        metadata: {
          name: 'scrapi-backend-authz',
          namespace: 'default',
        },
        spec: {
          selector: {
            matchLabels: {
              app: 'scrapi-backend',
            },
          },
          action: 'ALLOW',
          rules: [
            {
              from: [
                {
                  source: {
                    namespaces: ['default'],
                  },
                },
              ],
              to: [
                {
                  operation: {
                    methods: ['GET', 'POST', 'PUT', 'DELETE'],
                    paths: ['/api/*'],
                  },
                },
              ],
            },
          ],
        },
      },
    };
  }

  /**
   * Get circuit breaker configuration
   */
  getCircuitBreakerConfig() {
    return {
      enabled: true,
      threshold: 5, // Number of failures before opening circuit
      timeout: 60000, // Time in ms before attempting to close circuit
      resetTimeout: 30000, // Time in ms for half-open state
      volumeThreshold: 10, // Minimum number of requests before calculating error rate
      errorThresholdPercentage: 50, // Error percentage to trigger circuit breaker
    };
  }

  /**
   * Get retry policy configuration
   */
  getRetryPolicyConfig() {
    return {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryableStatusCodes: [502, 503, 504],
      retryableErrors: [
        'ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT',
        'ECONNRESET',
      ],
    };
  }

  /**
   * Get timeout configuration
   */
  getTimeoutConfig() {
    return {
      api: {
        '/api/auth': 5000,
        '/api/actors': 10000,
        '/api/runs': 30000,
        '/api/scraping': 300000, // 5 minutes for scraping
        default: 30000,
      },
    };
  }

  /**
   * Get rate limiting policy
   */
  getRateLimitingPolicy() {
    return {
      global: {
        requestsPerSecond: 100,
        burstSize: 200,
      },
      perUser: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
      },
      perEndpoint: {
        '/api/auth/login': {
          requestsPerMinute: 5,
        },
        '/api/scraping/start': {
          requestsPerMinute: 10,
        },
      },
    };
  }

  /**
   * Get service mesh status
   */
  getStatus() {
    return {
      enabled: process.env.SERVICE_MESH_ENABLED === 'true',
      provider: process.env.SERVICE_MESH_PROVIDER || 'istio',
      features: {
        mutualTLS: true,
        circuitBreaker: true,
        retryPolicy: true,
        rateLimiting: true,
        trafficManagement: true,
      },
    };
  }
}

module.exports = new ServiceMeshService();
