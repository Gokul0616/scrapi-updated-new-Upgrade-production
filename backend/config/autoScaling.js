/**
 * Auto-scaling Configuration
 * Phase 3: Infrastructure - Auto-scaling Setup
 */

const logger = require('../utils/logger');

/**
 * Get auto-scaling metrics
 */
function getScalingMetrics() {
  return {
    cpu: process.cpuUsage(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    activeConnections: getActiveConnections(),
    requestsPerSecond: getRequestRate(),
  };
}

/**
 * Get active WebSocket connections
 */
function getActiveConnections() {
  // This would be populated by the Socket.IO server
  return 0; // Placeholder
}

/**
 * Get request rate
 */
function getRequestRate() {
  const metrics = require('../utils/metrics');
  return metrics.getRequestRate();
}

/**
 * Kubernetes Horizontal Pod Autoscaler configuration
 */
function getKubernetesHPA() {
  return `
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: scrapi-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: scrapi-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Max
`;
}

/**
 * AWS Auto Scaling configuration
 */
function getAWSAutoScaling() {
  return {
    minCapacity: 2,
    maxCapacity: 10,
    targetValue: 70, // CPU utilization percentage
    scaleInCooldown: 300, // 5 minutes
    scaleOutCooldown: 60, // 1 minute
    policies: [
      {
        name: 'scale-up-on-cpu',
        metricType: 'CPUUtilization',
        threshold: 70,
        evaluationPeriods: 2,
        scalingAdjustment: 2,
      },
      {
        name: 'scale-up-on-memory',
        metricType: 'MemoryUtilization',
        threshold: 80,
        evaluationPeriods: 2,
        scalingAdjustment: 2,
      },
      {
        name: 'scale-down-on-low-cpu',
        metricType: 'CPUUtilization',
        threshold: 30,
        evaluationPeriods: 5,
        scalingAdjustment: -1,
      },
    ],
  };
}

/**
 * Get scaling recommendations
 */
function getScalingRecommendations() {
  const metrics = getScalingMetrics();
  const recommendations = [];

  // CPU-based recommendations
  const cpuPercent = (metrics.cpu.user + metrics.cpu.system) / 1000000; // Convert to seconds
  if (cpuPercent > 70) {
    recommendations.push({
      type: 'scale-up',
      reason: 'High CPU usage',
      metric: 'cpu',
      value: cpuPercent,
      threshold: 70,
    });
  } else if (cpuPercent < 20) {
    recommendations.push({
      type: 'scale-down',
      reason: 'Low CPU usage',
      metric: 'cpu',
      value: cpuPercent,
      threshold: 20,
    });
  }

  // Memory-based recommendations
  const memPercent = (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100;
  if (memPercent > 80) {
    recommendations.push({
      type: 'scale-up',
      reason: 'High memory usage',
      metric: 'memory',
      value: memPercent,
      threshold: 80,
    });
  }

  return recommendations;
}

module.exports = {
  getScalingMetrics,
  getKubernetesHPA,
  getAWSAutoScaling,
  getScalingRecommendations,
};
