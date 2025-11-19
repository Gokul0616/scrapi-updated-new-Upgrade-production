const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');
const { markAllAsRead } = require('../utils/notificationService');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/notifications
 * Get all notifications for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      unreadOnly = 'false',
      type 
    } = req.query;
    
    const query = { userId: req.userId };
    
    // Filter by read status
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    // Filter by type
    if (type) {
      query.type = type;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(query)
    ]);
    
    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.userId,
      read: false
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

/**
 * GET /api/notifications/recent
 * Get recent notifications (last 10) for bell dropdown
 */
router.get('/recent', async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.userId
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    const unreadCount = await Notification.countDocuments({
      userId: req.userId,
      read: false
    });
    
    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Error fetching recent notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
router.patch('/:id/read', async (req, res) => {
  try {
    console.log('📖 PATCH mark as read request:', {
      notificationId: req.params.id,
      userId: req.userId
    });
    
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id,
        userId: req.userId // Ensure user owns this notification
      },
      { 
        read: true,
        readAt: new Date()
      },
      { new: true }
    );
    
    if (!notification) {
      console.log('❌ Notification not found for mark as read');
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    console.log('✅ Notification marked as read:', notification._id);
    res.json(notification);
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * PATCH /api/notifications/:id/unread
 * Mark a notification as unread
 */
router.patch('/:id/unread', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id,
        userId: req.userId
      },
      { 
        read: false,
        readAt: null
      },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as unread:', error);
    res.status(500).json({ error: 'Failed to mark notification as unread' });
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.post('/mark-all-read', async (req, res) => {
  try {
    const result = await markAllAsRead(req.userId);
    
    res.json({ 
      success: true,
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', async (req, res) => {
  try {
    console.log('🗑️ DELETE notification request:', {
      notificationId: req.params.id,
      userId: req.userId
    });
    
    // First check if notification exists at all
    const existingNotif = await Notification.findById(req.params.id);
    console.log('Notification exists:', existingNotif ? 'YES' : 'NO');
    if (existingNotif) {
      console.log('Notification owner:', existingNotif.userId);
      console.log('Requesting user:', req.userId);
      console.log('Owner match:', String(existingNotif.userId) === String(req.userId));
    }
    
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!notification) {
      console.log('❌ Notification not found or user mismatch');
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    console.log('✅ Notification deleted successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * DELETE /api/notifications
 * Delete all notifications (both read and unread)
 */
router.delete('/', async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      userId: req.userId
    });
    
    res.json({ 
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
});

/**
 * POST /api/notifications/test
 * Create a test notification for testing notification settings
 */
router.post('/test', async (req, res) => {
  try {
    const { type = 'RUN_COMPLETED' } = req.body;
    
    const testNotifications = {
      'RUN_COMPLETED': {
        title: 'Test: Run Completed',
        message: 'Your test scraper run has completed successfully',
        type: 'RUN_COMPLETED',
        priority: 'medium'
      },
      'RUN_FAILED': {
        title: 'Test: Run Failed',
        message: 'Your test scraper run has failed',
        type: 'RUN_FAILED',
        priority: 'high'
      },
      'LOW_BALANCE': {
        title: 'Test: Low Balance',
        message: 'Your account balance is running low',
        type: 'LOW_BALANCE',
        priority: 'medium'
      }
    };
    
    const notificationData = testNotifications[type] || testNotifications['RUN_COMPLETED'];
    
    const notification = new Notification({
      userId: req.userId,
      ...notificationData,
      read: false
    });
    
    await notification.save();
    
    // Emit via WebSocket if available
    const io = req.app.get('io');
    if (io) {
      io.to(String(req.userId)).emit('notification:new', {
        _id: notification._id,
        ...notificationData,
        read: false,
        createdAt: notification.createdAt
      });
    }
    
    res.json({ 
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({ error: 'Failed to create test notification' });
  }
});

module.exports = router;