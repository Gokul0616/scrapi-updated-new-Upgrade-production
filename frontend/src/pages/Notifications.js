import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  Bell, CheckCheck, Trash2, Filter, Search, X,
  Play, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export function Notifications() {
  const navigate = useNavigate();
  const { 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    unreadCount
  } = useNotifications();

  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  // Fetch notifications
  useEffect(() => {
    loadNotifications();
  }, [page, filterRead, filterType]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const options = {
        page,
        limit: 20
      };
      
      if (filterRead === 'unread') {
        options.unreadOnly = true;
      }
      
      if (filterType !== 'all') {
        options.type = filterType;
      }

      const result = await fetchNotifications(options);
      setNotifications(result.notifications);
      setFilteredNotifications(result.notifications);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search filter
  useEffect(() => {
    if (!searchQuery) {
      setFilteredNotifications(notifications);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = notifications.filter(
      (notif) =>
        notif.title.toLowerCase().includes(query) ||
        notif.message.toLowerCase().includes(query)
    );
    setFilteredNotifications(filtered);
  }, [searchQuery, notifications]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'RUN_COMPLETED':
        return <CheckCheck className="h-5 w-5 text-green-500" />;
      case 'RUN_FAILED':
        return <X className="h-5 w-5 text-red-500" />;
      case 'RUN_STARTED':
        return <Play className="h-5 w-5 text-blue-500" />;
      case 'LOW_BALANCE':
      case 'USAGE_WARNING':
      case 'QUOTA_EXCEEDED':
      case 'BILLING_ISSUE':
      case 'PAYMENT_FAILED':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      urgent: 'destructive',
      high: 'default',
      medium: 'secondary',
      low: 'outline'
    };
    return (
      <Badge variant={variants[priority]} className="text-xs">
        {priority}
      </Badge>
    );
  };

  const formatTime = (date) => {
    const notifDate = new Date(date);
    const now = new Date();
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return notifDate.toLocaleString();
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      try {
        await markAsRead(notification._id);
        // Reload notifications to get fresh data
        await loadNotifications();
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        // Error toast is already shown in markAsRead function
        return; // Don't navigate if marking as read failed
      }
    }

    // Navigate if actionUrl exists
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      // Reload notifications to get fresh data
      await loadNotifications();
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleDelete = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await deleteNotification(notificationId);
      // Reload notifications to get fresh data
      await loadNotifications();
      // Success toast is already shown in deleteNotification function
    } catch (error) {
      console.error('Failed to delete notification:', error);
      // Error toast is already shown in deleteNotification function
    }
  };

  return (
    <>
      <Header title="Notifications" icon={Bell} />
      
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 max-w-4xl">
          {/* Header Actions */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">All Notifications</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            </div>
            <Button onClick={handleMarkAllAsRead} variant="outline">
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="RUN_COMPLETED">Run completed</SelectItem>
                <SelectItem value="RUN_FAILED">Run failed</SelectItem>
                <SelectItem value="RUN_STARTED">Run started</SelectItem>
                <SelectItem value="LOW_BALANCE">Low balance</SelectItem>
                <SelectItem value="USAGE_WARNING">Usage warning</SelectItem>
                <SelectItem value="SYSTEM_ANNOUNCEMENT">System</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRead} onValueChange={setFilterRead}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Read status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12 bg-card border rounded-lg">
              <Bell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? 'No notifications match your search'
                  : "You're all caught up!"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`bg-card border rounded-lg p-4 cursor-pointer hover:shadow-md transition-all ${
                    !notification.read ? 'border-l-4 border-l-blue-500 bg-accent/30' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="h-2 w-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                        {getPriorityBadge(notification.priority)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(notification.createdAt)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(notification._id, e)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
