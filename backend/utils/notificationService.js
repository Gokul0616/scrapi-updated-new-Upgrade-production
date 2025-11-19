/**
 * Notification Service - Creates and manages notifications
 * Integrates with WebSocket for real-time delivery
 */

const Notification = require('../models/Notification');
const { getIO } = require('./websocket');

/**
 * Notification type configurations
 */
const NOTIFICATION_CONFIGS = {
  RUN_COMPLETED: {
    priority: 'medium',
    getTitle: (data) => `Run completed: ${data.actorName || 'Actor'}`,
    getMessage: (data) => `Your run finished successfully with ${data.resultCount || 0} results.`,
    getActionUrl: (data) => `/runs/${data.runId}`
  },
  RUN_FAILED: {
    priority: 'high',
    getTitle: (data) => `Run failed: ${data.actorName || 'Actor'}`,
    getMessage: (data) => `Your run failed with error: ${data.error || 'Unknown error'}`,
    getActionUrl: (data) => `/runs/${data.runId}`
  },
  RUN_STARTED: {
    priority: 'low',
    getTitle: (data) => `Run started: ${data.actorName || 'Actor'}`,
    getMessage: (data) => `Your run has started and is now running.`,
    getActionUrl: (data) => `/runs/${data.runId}`
  },
  LOW_BALANCE: {
    priority: 'urgent',
    getTitle: () => 'Low balance warning',
    getMessage: (data) => `Your account balance is low ($${data.balance}). Add funds to continue using the platform.`,
    getActionUrl: () => '/settings?tab=billing'
  },
  USAGE_WARNING: {
    priority: 'high',
    getTitle: () => 'Usage limit warning',
    getMessage: (data) => `You've used ${data.percentage}% of your monthly quota. Consider upgrading your plan.`,
    getActionUrl: () => '/settings?tab=billing'
  },
  QUOTA_EXCEEDED: {
    priority: 'urgent',
    getTitle: () => 'Quota exceeded',
    getMessage: (data) => `You've exceeded your ${data.resource || 'usage'} quota. Upgrade to continue.`,
    getActionUrl: () => '/settings?tab=billing'
  },
  BILLING_ISSUE: {
    priority: 'urgent',
    getTitle: () => 'Billing issue',
    getMessage: (data) => data.message || 'There was an issue with your billing. Please update your payment method.',
    getActionUrl: () => '/settings?tab=billing'
  },
  PAYMENT_FAILED: {
    priority: 'urgent',
    getTitle: () => 'Payment failed',
    getMessage: (data) => `Your payment of $${data.amount} failed. Please update your payment method.`,
    getActionUrl: () => '/settings?tab=billing'
  },
  SYSTEM_ANNOUNCEMENT: {
    priority: 'medium',
    getTitle: (data) => data.title || 'System announcement',
    getMessage: (data) => data.message,
    getActionUrl: (data) => data.actionUrl || null
  },
  NEW_FEATURE: {
    priority: 'low',
    getTitle: (data) => data.title || 'New feature available',
    getMessage: (data) => data.message,
    getActionUrl: (data) => data.actionUrl || null
  },
  MAINTENANCE: {
    priority: 'high',
    getTitle: (data) => 'Scheduled maintenance',
    getMessage: (data) => data.message,
    getActionUrl: (data) => data.actionUrl || null
  },
  WELCOME: {
    priority: 'medium',
    getTitle: (data) => data.title || 'Welcome to Scrapi! 🎉',
    getMessage: (data) => data.message || 'Thank you for joining us! Get started by exploring our actors.',
    getActionUrl: (data) => data.actionUrl || '/store'
  }
};

/**
 * Create a notification
 */
async function createNotification(userId, type, data = {}) {
  try {
    const config = NOTIFICATION_CONFIGS[type];
    if (!config) {
      throw new Error(`Unknown notification type: ${type}`);
    }

    const notification = new Notification({
      userId,
      type,
      title: config.getTitle(data),
      message: config.getMessage(data),
      actionUrl: config.getActionUrl(data),
      metadata: data,
      priority: config.priority
    });

    await notification.save();

    // Emit real-time notification via WebSocket
    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('notification:new', {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        priority: notification.priority,
        read: notification.read,
        createdAt: notification.createdAt
      });
      console.log(`📬 Notification sent to user:${userId} - ${type}`);
    } catch (wsError) {
      console.error('WebSocket notification error:', wsError.message);
      // Don't fail notification creation if WebSocket fails
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create run-related notifications
 */
async function notifyRunCompleted(userId, runData) {
  return createNotification(userId, 'RUN_COMPLETED', {
    runId: runData._id || runData.runId,
    actorName: runData.actorName || runData.actorId,
    resultCount: runData.output?.length || runData.resultCount || 0
  });
}

async function notifyRunFailed(userId, runData) {
  return createNotification(userId, 'RUN_FAILED', {
    runId: runData._id || runData.runId,
    actorName: runData.actorName || runData.actorId,
    error: runData.error || 'Unknown error'
  });
}

async function notifyRunStarted(userId, runData) {
  return createNotification(userId, 'RUN_STARTED', {
    runId: runData._id || runData.runId,
    actorName: runData.actorName || runData.actorId
  });
}

/**
 * Create usage/billing notifications
 */
async function notifyLowBalance(userId, balance) {
  return createNotification(userId, 'LOW_BALANCE', { balance });
}

async function notifyUsageWarning(userId, percentage, resource) {
  return createNotification(userId, 'USAGE_WARNING', { percentage, resource });
}

async function notifyQuotaExceeded(userId, resource) {
  return createNotification(userId, 'QUOTA_EXCEEDED', { resource });
}

async function notifyPaymentFailed(userId, amount) {
  return createNotification(userId, 'PAYMENT_FAILED', { amount });
}

/**
 * Batch mark notifications as read
 */
async function markAllAsRead(userId) {
  try {
    const result = await Notification.updateMany(
      { userId, read: false },
      { read: true, readAt: new Date() }
    );
    
    // Emit WebSocket event
    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('notifications:marked-read', {
        count: result.modifiedCount
      });
    } catch (wsError) {
      console.error('WebSocket error:', wsError.message);
    }
    
    return result;
  } catch (error) {
    console.error('Error marking all as read:', error);
    throw error;
  }
}

/**
 * Get unread count for user
 */
async function getUnreadCount(userId) {
  try {
    return await Notification.countDocuments({ userId, read: false });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

module.exports = {
  createNotification,
  notifyRunCompleted,
  notifyRunFailed,
  notifyRunStarted,
  notifyLowBalance,
  notifyUsageWarning,
  notifyQuotaExceeded,
  notifyPaymentFailed,
  markAllAsRead,
  getUnreadCount
};