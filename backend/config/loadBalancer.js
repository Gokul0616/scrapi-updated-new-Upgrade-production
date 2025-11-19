/**
 * Load Balancer Configuration
 * Phase 3: Infrastructure - Load Balancing Setup
 */

const logger = require('../utils/logger');

/**
 * Health check endpoint for load balancer
 */
function healthCheck(req, res) {
  // Simple health check for load balancer
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

/**
 * Readiness check endpoint
 * Returns 200 when service is ready to accept traffic
 */
function readinessCheck(req, res) {
  // Check if all critical services are ready
  const mongoose = require('mongoose');
  const cache = require('../utils/cache');

  const isReady = 
    mongoose.connection.readyState === 1 && // MongoDB connected
    cache.isConnected; // Redis connected

  if (isReady) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      services: {
        mongodb: mongoose.connection.readyState === 1 ? 'ready' : 'not ready',
        redis: cache.isConnected ? 'ready' : 'not ready',
      },
    });
  }
}

/**
 * Liveness check endpoint
 * Returns 200 if service is alive (for Kubernetes)
 */
function livenessCheck(req, res) {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get load balancer configuration
 */
function getLoadBalancerConfig() {
  return {
    nginx: {
      upstream: `
upstream scrapi_backend {
  least_conn;
  server backend-1:8001 max_fails=3 fail_timeout=30s;
  server backend-2:8001 max_fails=3 fail_timeout=30s;
  server backend-3:8001 max_fails=3 fail_timeout=30s backup;
  keepalive 32;
}

server {
  listen 80;
  server_name your-domain.com;

  # Redirect HTTP to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name your-domain.com;

  # SSL Configuration
  ssl_certificate /etc/ssl/certs/your-domain.crt;
  ssl_certificate_key /etc/ssl/private/your-domain.key;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;

  # Health checks
  location /health {
    access_log off;
    proxy_pass http://scrapi_backend/api/health;
  }

  # WebSocket support
  location /api/socket.io/ {
    proxy_pass http://scrapi_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  # API endpoints
  location /api/ {
    proxy_pass http://scrapi_backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Frontend
  location / {
    proxy_pass http://frontend:3000;
    proxy_set_header Host $host;
  }
}
`,
    },
    
    kubernetes: {
      service: `
apiVersion: v1
kind: Service
metadata:
  name: scrapi-backend
  labels:
    app: scrapi-backend
spec:
  type: LoadBalancer
  selector:
    app: scrapi-backend
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 8001
    - name: https
      protocol: TCP
      port: 443
      targetPort: 8001
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
`,
      deployment: `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scrapi-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: scrapi-backend
  template:
    metadata:
      labels:
        app: scrapi-backend
    spec:
      containers:
      - name: backend
        image: scrapi-backend:latest
        ports:
        - containerPort: 8001
        env:
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /api/health/liveness
            port: 8001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health/readiness
            port: 8001
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
`,
    },
    
    aws: {
      targetGroup: {
        healthCheck: {
          enabled: true,
          path: '/api/health',
          protocol: 'HTTP',
          port: 8001,
          interval: 30,
          timeout: 5,
          healthyThreshold: 2,
          unhealthyThreshold: 3,
        },
        stickySession: {
          enabled: true,
          duration: 3600,
        },
      },
    },
  };
}

module.exports = {
  healthCheck,
  readinessCheck,
  livenessCheck,
  getLoadBalancerConfig,
};
