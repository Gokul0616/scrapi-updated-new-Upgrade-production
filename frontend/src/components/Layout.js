import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, ShoppingBag, Play, Save, Layers, Database,
  Calendar, Code, MessageCircle, Globe, Settings,
  ChevronDown, Sun, Moon, Search, Bell, Flame, ArrowLeft,
  ChevronLeft, ChevronRight, LogOut, CheckCheck, Trash2, X
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  
  const menuItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Code, label: 'Actors', path: '/actors' },
    { icon: Play, label: 'Runs', path: '/runs' },
    { icon: Save, label: 'Saved tasks', path: '/saved' },
    { icon: Database, label: 'Scraped Data', path: '/scraped-data' },
    { icon: Layers, label: 'Integrations', path: '/integrations' },
    { icon: Calendar, label: 'Schedules', path: '/schedules' },
    { icon: Globe, label: 'Proxy', path: '/proxy' },
  ];
  
  const devMenuItems = [
    { icon: Code, label: 'My Actors', path: '/my-actors' },
    { icon: ShoppingBag, label: 'Insights', path: '/insights' },
    { icon: MessageCircle, label: 'Messaging', path: '/messaging' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get user initials
  const getUserInitials = () => {
    if (user?.fullName) {
      return user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    return user?.username?.[0]?.toUpperCase() || 'U';
  };

  // Menu Item Component with Tooltip
  const MenuItem = ({ item, isActive }) => {
    const content = (
      <div className={`flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent rounded-md cursor-pointer ${
        isActive ? 'bg-accent' : ''
      }`}>
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </div>
    );

    if (collapsed) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to={item.path}>{content}</Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return <Link to={item.path}>{content}</Link>;
  };
  
  return (
    <div className={`h-screen border-r bg-background flex flex-col transition-all duration-300 ${
      collapsed ? 'w-[60px]' : 'w-[180px]'
    }`}>
      {/* User Profile */}
      {!collapsed ? (
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded-lg p-2">
                <Avatar className="h-8 w-8">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
                  ) : (
                    <AvatarFallback className="bg-purple-600 text-white text-sm">
                      {getUserInitials()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{user?.username || 'User'}</div>
                  <div className="text-xs text-muted-foreground capitalize">{user?.plan || 'Free'}</div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="p-2 flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-purple-600 text-white text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                )}
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      
      {/* Search */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              className="pl-8 pr-8 h-9 text-sm"
            />
            <kbd className="absolute right-2 top-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </div>
      )}
      
      {/* Get Started Progress */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-sm">
            <ShoppingBag className="h-4 w-4" />
            <span className="font-medium">Get started</span>
            <span className="text-muted-foreground ml-auto">1/4 steps</span>
          </div>
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-1/4 bg-primary"></div>
          </div>
        </div>
      )}
      
      <Separator />
      
      {/* Main Menu */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          <MenuItem item={{ icon: ShoppingBag, label: 'Scrapi Store', path: '/store' }} isActive={location.pathname === '/store'} />
          
          {menuItems.map((item) => (
            <MenuItem key={item.path} item={item} isActive={location.pathname === item.path} />
          ))}
        </nav>
        
        <Separator className="my-4" />
        
        {/* Development Section */}
        {!collapsed && (
          <div className="px-4 mb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium cursor-pointer hover:text-foreground">
              <span>Development</span>
              <ChevronDown className="h-3 w-3 ml-auto" />
            </div>
          </div>
        )}
        
        <nav className="space-y-1 px-2">
          {devMenuItems.map((item) => (
            <MenuItem key={item.path} item={item} isActive={location.pathname === item.path} />
          ))}
        </nav>
      </div>
      
      {/* Bottom Menu */}
      <div className="border-t">
        {/* Usage Stats */}
        {!collapsed && user && (
          <div className="px-4 py-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">RAM</span>
              <span>{user.usage?.ramUsedMB || 0} MB / {(user.usage?.ramLimitMB / 1024).toFixed(0) || 8} GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Usage</span>
              <span>${user.usage?.creditsUsed?.toFixed(2) || '0.00'} / ${user.usage?.creditsLimit?.toFixed(2) || '5.00'}</span>
            </div>
          </div>
        )}
        
        {!collapsed && (
          <div className="px-4 pb-4">
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate('/settings')}>
              Upgrade to Starter
              <span className="ml-auto">→</span>
            </Button>
          </div>
        )}
        
        {/* Logo and Collapse Button */}
        <div className="px-4 pb-4 flex items-center gap-2">
          {!collapsed && (
            <img 
              src="/logo.png" 
              alt="Scrapi Logo" 
              className="h-6 w-auto dark:invert"
            />
          )}
          <div className="ml-auto flex gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setCollapsed(!collapsed)}
                  >
                    {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={collapsed ? "right" : "top"}>
                  <p>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Header({ title, actions, icon }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
  } = useNotifications();
  
  // Auto mark as read when notifications dropdown opens
  useEffect(() => {
    const autoMarkAsRead = localStorage.getItem('autoMarkAsRead') === 'true';
    
    if (notificationsOpen && autoMarkAsRead && unreadCount > 0) {
      // Get unread notification IDs
      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Mark each unread notification as read (async operation)
      const markNotificationsAsRead = async () => {
        for (const notification of unreadNotifications) {
          try {
            await markAsRead(notification._id);
          } catch (error) {
            console.error('Failed to auto-mark notification as read:', error);
          }
        }
      };
      
      markNotificationsAsRead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsOpen]);
  
  // Define menu icons mapping
  const menuIcons = {
    'Home': Home,
    'Scrapi Console': Home,
    'Actors': Code,
    'Runs': Play,
    'Saved Tasks': Save,
    'Saved tasks': Save,
    'Integrations': Layers,
    'Schedules': Calendar,
    'My Actors': Code,
    'Insights': ShoppingBag,
    'Messaging': MessageCircle,
    'Proxy': Globe,
    'Scrapi Store': ShoppingBag,
  };
  
  // Get the icon for this page
  const IconComponent = icon || menuIcons[title];
  const showBackButton = !IconComponent;
  
  return (
    <div className="border-b bg-background sticky top-0 z-10">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {showBackButton ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : IconComponent ? (
              <IconComponent className="h-5 w-5 text-orange-500" />
            ) : (
              <Flame className="h-5 w-5 text-orange-500" />
            )}
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 relative"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-base">Notifications</h3>
                {notifications.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="h-7 text-xs"
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Mark all read
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await deleteAllNotifications();
                        } catch (error) {
                          console.error('Failed to delete all notifications:', error);
                        }
                      }}
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete all
                    </Button>
                  </div>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You're all caught up!
                  </p>
                </div>
              ) : (
                <div className="max-h-[280px] overflow-y-auto">
                  {notifications.filter((notification) => {
                    // Filter notifications based on user preferences
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
                    
                    const preferenceKey = typeToKey[notificationType];
                    
                    // If we have a preference key, check if it's enabled (default true)
                    if (preferenceKey) {
                      return localStorage.getItem(preferenceKey) !== 'false';
                    }
                    
                    // Show notification if type is unknown
                    return true;
                  }).map((notification) => {
                    const handleClick = async () => {
                      // Check auto mark as read preference
                      const autoMarkAsRead = localStorage.getItem('autoMarkAsRead') === 'true';
                      
                      // Mark as read if unread AND auto mark is enabled
                      if (!notification.read && autoMarkAsRead) {
                        try {
                          await markAsRead(notification._id);
                        } catch (error) {
                          console.error('Failed to mark notification as read:', error);
                          // Error toast is already shown in markAsRead function
                          return; // Don't navigate if marking as read failed
                        }
                      }
                      
                      // Navigate if actionUrl exists
                      if (notification.actionUrl) {
                        setNotificationsOpen(false);
                        navigate(notification.actionUrl);
                      }
                    };

                    const getNotificationIcon = (type) => {
                      switch (type) {
                        case 'RUN_COMPLETED':
                          return <CheckCheck className="h-4 w-4 text-green-500" />;
                        case 'RUN_FAILED':
                          return <X className="h-4 w-4 text-red-500" />;
                        case 'RUN_STARTED':
                          return <Play className="h-4 w-4 text-blue-500" />;
                        case 'LOW_BALANCE':
                        case 'USAGE_WARNING':
                        case 'QUOTA_EXCEEDED':
                        case 'BILLING_ISSUE':
                        case 'PAYMENT_FAILED':
                          return <Bell className="h-4 w-4 text-orange-500" />;
                        default:
                          return <Bell className="h-4 w-4 text-muted-foreground" />;
                      }
                    };

                    // Check if priority badges should be shown
                    const showPriorityBadges = localStorage.getItem('showPriorityBadges') !== 'false';
                    
                    const getPriorityColor = (priority) => {
                      // Only show priority color if setting is enabled
                      if (!showPriorityBadges) return 'border-l-gray-300';
                      
                      switch (priority) {
                        case 'urgent':
                          return 'border-l-red-500';
                        case 'high':
                          return 'border-l-orange-500';
                        case 'medium':
                          return 'border-l-blue-500';
                        default:
                          return 'border-l-gray-300';
                      }
                    };

                    const formatTime = (date) => {
                      const now = new Date();
                      const notifDate = new Date(date);
                      const diffMs = now - notifDate;
                      const diffMins = Math.floor(diffMs / 60000);
                      const diffHours = Math.floor(diffMs / 3600000);
                      const diffDays = Math.floor(diffMs / 86400000);

                      if (diffMins < 1) return 'Just now';
                      if (diffMins < 60) return `${diffMins}m ago`;
                      if (diffHours < 24) return `${diffHours}h ago`;
                      if (diffDays < 7) return `${diffDays}d ago`;
                      return notifDate.toLocaleDateString();
                    };

                    return (
                      <div
                        key={notification._id}
                        className={`relative px-4 py-3 hover:bg-accent cursor-pointer border-b border-l-2 last:border-b-0 ${
                          !notification.read ? 'bg-accent/50' : ''
                        } ${getPriorityColor(notification.priority)}`}
                        onClick={handleClick}
                      >
                        <div className="flex gap-3">
                          <div className="shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="h-2 w-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatTime(notification.createdAt)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await deleteNotification(notification._id);
                                  } catch (error) {
                                    console.error('Failed to delete notification:', error);
                                    // Error toast is already shown in deleteNotification function
                                  }
                                }}
                                className="h-6 w-6 p-0 hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {notifications.length > 0 && (
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate('/settings?tab=notifications');
                    }}
                    className="w-full text-xs"
                  >
                    Notification settings
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>
          {actions}
        </div>
      </div>
    </div>
  );
}
