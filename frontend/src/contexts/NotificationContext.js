import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from './WebSocketContext';
import api from '../services/api';
import { toast } from 'sonner';

const NotificationContext = createContext();

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }) {
  const { user, token } = useAuth();
  const { socket, connected } = useWebSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch recent notifications
  const fetchRecentNotifications = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/notifications?limit=10');
      
      const fetchedNotifications = response.data.notifications || [];
      setNotifications(fetchedNotifications);
      
      // Calculate unread count
      const unread = fetchedNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError(error.response?.data?.error || 'Failed to load notifications');
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch all notifications with pagination
  const fetchAllNotifications = useCallback(async (page = 1, limit = 20) => {
    if (!token) return { notifications: [], pagination: {} };
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/notifications?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching all notifications:', error);
      setError(error.response?.data?.error || 'Failed to load notifications');
      toast.error('Failed to load notifications');
      return { notifications: [], pagination: {} };
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!token) return;
    
    try {
      const response = await api.patch(`/api/notifications/${notificationId}/read`);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, read: true, readAt: new Date().toISOString() }
            : notif
        )
      );
      
      // Decrease unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      const errorMessage = error.response?.data?.error || 'Failed to mark notification as read';
      toast.error(errorMessage);
      throw error;
    }
  }, [token]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    
    try {
      await api.post('/api/notifications/mark-all-read');
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          read: true, 
          readAt: new Date().toISOString() 
        }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
      throw error;
    }
  }, [token]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    if (!token) return;
    
    try {
      const response = await api.delete(`/api/notifications/${notificationId}`);
      
      // Update local state
      setNotifications(prev => {
        const deletedNotif = prev.find(n => n._id === notificationId);
        if (deletedNotif && !deletedNotif.read) {
          setUnreadCount(c => Math.max(0, c - 1));
        }
        return prev.filter(notif => notif._id !== notificationId);
      });
      
      toast.success('Notification deleted');
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete notification';
      toast.error(errorMessage);
      throw error;
    }
  }, [token]);

  // Delete all notifications
  const deleteAllNotifications = useCallback(async () => {
    if (!token) return;
    
    try {
      await api.delete('/api/notifications');
      
      setNotifications([]);
      setUnreadCount(0);
      
      toast.success('All notifications deleted');
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete all notifications';
      toast.error(errorMessage);
      throw error;
    }
  }, [token]);

  // Initial fetch
  useEffect(() => {
    if (user && token) {
      fetchRecentNotifications();
    }
  }, [user, token, fetchRecentNotifications]);

  // Listen for real-time notifications via WebSocket
  useEffect(() => {
    if (!socket || !connected) return;

    // Handle new notification
    const handleNewNotification = (notification) => {
      // Add to notifications list
      setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
      
      // Increment unread count
      setUnreadCount(prev => prev + 1);
      
      // Check user preferences before showing browser notification
      const browserNotificationsEnabled = localStorage.getItem('browserNotifications') === 'true';
      const notificationSoundEnabled = localStorage.getItem('notificationSound') === 'true';
      
      // Check if this notification type is enabled
      const notificationType = notification.type;
      
      // Map notification types to preference keys
      const typeToKey = {
        'RUN_COMPLETED': 'notify_runCompleted',
        'RUN_FAILED': 'notify_runFailed',
        'RUN_STARTED': 'notify_runStarted',
        'LOW_BALANCE': 'notify_lowBalance',
        'USAGE_WARNING': 'notify_usageWarning',
        'QUOTA_EXCEEDED': 'notify_quotaExceeded',
        'BILLING_ISSUE': 'notify_billingIssue',
        'PAYMENT_FAILED': 'notify_paymentFailed',
        'SYSTEM_ANNOUNCEMENT': 'notify_systemAnnouncement',
        'NEW_FEATURE': 'notify_newFeature',
        'MAINTENANCE': 'notify_maintenance'
      };
      
      const typeKey = typeToKey[notificationType];
      const typeEnabled = typeKey ? localStorage.getItem(typeKey) !== 'false' : true;
      
      // Show browser notification only if:
      // 1. Browser notifications are enabled in settings
      // 2. Browser supports notifications
      // 3. Permission is granted
      // 4. This notification type is enabled
      if (browserNotificationsEnabled && typeEnabled && 'Notification' in window && Notification.permission === 'granted') {
        const options = {
          body: notification.message,
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag: notification._id,
          silent: !notificationSoundEnabled // Respect sound preference
        };
        
        new Notification(notification.title, options);
      }
    };

    // Handle marked as read event
    const handleMarkedRead = (data) => {
      setUnreadCount(0);
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          read: true 
        }))
      );
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notifications:marked-read', handleMarkedRead);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notifications:marked-read', handleMarkedRead);
    };
  }, [socket, connected]);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchRecentNotifications,
    fetchAllNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    setNotifications,
    setUnreadCount
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
