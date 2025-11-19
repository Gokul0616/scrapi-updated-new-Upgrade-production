/**
 * Infrastructure Routes
 * Phase 3: Infrastructure management endpoints
 */

const express = require('express');
const router = express.Router();
// Note: Infrastructure endpoints are typically public for load balancers and monitoring
// Add authentication middleware if needed for sensitive endpoints
const logger = require('../utils/logger');
const errorMonitoring = require('../utils/errorMonitoring');
const { getConfig } = require('../config/environments');
const sslConfig = require('../config/ssl');
const {
  healthCheck,
  readinessCheck,
  livenessCheck,
  getLoadBalancerConfig,
} = require('../config/loadBalancer');
const {
  getScalingMetrics,
  getKubernetesHPA,
  getAWSAutoScaling,
  getScalingRecommendations,
} = require('../config/autoScaling');

/**
 * @swagger
 * /api/infrastructure/health/readiness:
 *   get:
 *     summary: Readiness check for load balancer
 *     tags: [Infrastructure]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
router.get('/health/readiness', readinessCheck);

/**
 * @swagger
 * /api/infrastructure/health/liveness:
 *   get:
 *     summary: Liveness check for Kubernetes
 *     tags: [Infrastructure]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/health/liveness', livenessCheck);

/**
 * @swagger
 * /api/infrastructure/environment:
 *   get:
 *     summary: Get current environment configuration
 *     tags: [Infrastructure]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Environment configuration
 */
router.get('/environment', (req, res) => {
  // Note: Consider adding authentication in production
  const config = getConfig();
  res.json({
    environment: config.name,
    logLevel: config.logLevel,
    cacheEnabled: config.cacheEnabled,
    swaggerEnabled: config.enableSwagger,
    sslEnabled: sslConfig.isEnabled(),
  });
});

/**
 * @swagger
 * /api/infrastructure/scaling/metrics:
 *   get:
 *     summary: Get auto-scaling metrics
 *     tags: [Infrastructure]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scaling metrics
 */
router.get('/scaling/metrics', (req, res) => {
  const metrics = getScalingMetrics();
  res.json(metrics);
});

/**
 * @swagger
 * /api/infrastructure/scaling/recommendations:
 *   get:
 *     summary: Get scaling recommendations
 *     tags: [Infrastructure]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scaling recommendations
 */
router.get('/scaling/recommendations', (req, res) => {
  const recommendations = getScalingRecommendations();
  res.json({
    timestamp: new Date().toISOString(),
    recommendations,
  });
});

/**
 * @swagger
 * /api/infrastructure/scaling/kubernetes-hpa:
 *   get:
 *     summary: Get Kubernetes HPA configuration
 *     tags: [Infrastructure]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kubernetes HPA YAML
 */
router.get('/scaling/kubernetes-hpa', (req, res) => {
  const hpa = getKubernetesHPA();
  res.type('text/plain').send(hpa);
});

/**
 * @swagger
 * /api/infrastructure/scaling/aws-config:
 *   get:
 *     summary: Get AWS auto-scaling configuration
 *     tags: [Infrastructure]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AWS auto-scaling config
 */
router.get('/scaling/aws-config', (req, res) => {
  const config = getAWSAutoScaling();
  res.json(config);
});

/**
 * @swagger
 * /api/infrastructure/load-balancer/config:
 *   get:
 *     summary: Get load balancer configuration
 *     tags: [Infrastructure]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Load balancer configurations
 */
router.get('/load-balancer/config', (req, res) => {
  const config = getLoadBalancerConfig();
  res.json(config);
});

/**
 * @swagger
 * /api/infrastructure/errors/stats:
 *   get:
 *     summary: Get error monitoring statistics
 *     tags: [Infrastructure]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Error statistics
 */
router.get('/errors/stats', (req, res) => {
  const stats = errorMonitoring.getErrorStats();
  res.json(stats);
});

/**
 * @swagger
 * /api/infrastructure/ssl/status:
 *   get:
 *     summary: Get SSL/TLS status
 *     tags: [Infrastructure]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SSL status
 */
router.get('/ssl/status', (req, res) => {
  res.json({
    enabled: sslConfig.isEnabled(),
    message: sslConfig.isEnabled()
      ? 'SSL/TLS is enabled'
      : 'SSL/TLS is not configured',
  });
});

module.exports = router;
