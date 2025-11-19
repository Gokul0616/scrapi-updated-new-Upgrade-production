import React, { useState, useEffect } from 'react';
import { Header } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Switch } from '../components/ui/switch';
import { Settings as SettingsIcon, User, Lock, Key, Bell, CreditCard, Copy, Trash2, Plus, Volume2, VolumeX, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import api from '../services/api';

export function Settings() {
  const { user, updateUser, token } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update active tab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'api-keys', label: 'API Keys', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="Settings" icon={SettingsIcon} />
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex gap-6">
            {/* Sidebar Tabs */}
            <div className="w-48 shrink-0">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50 text-muted-foreground'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1">
              <div className="bg-card border rounded-lg p-6">
                {activeTab === 'profile' && <ProfileTab user={user} updateUser={updateUser} token={token} />}
                {activeTab === 'security' && <SecurityTab token={token} />}
                {activeTab === 'api-keys' && <ApiKeysTab token={token} />}
                {activeTab === 'notifications' && <NotificationsTab user={user} updateUser={updateUser} token={token} />}
                {activeTab === 'billing' && <BillingTab user={user} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Profile Tab Component
function ProfileTab({ user, updateUser, token }) {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    fullName: user?.fullName || '',
    email: user?.email || ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [avatars, setAvatars] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const { toast } = useToast();

  // Fetch available avatars
  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const response = await api.get('/api/auth/avatars');
        setAvatars(response.data.avatars);
      } catch (error) {
        console.error('Failed to fetch avatars:', error);
      }
    };
    fetchAvatars();
  }, []);

  // Update selectedAvatar when user changes
  useEffect(() => {
    if (user?.avatar) {
      setSelectedAvatar(user.avatar);
    }
  }, [user?.avatar]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await api.put('/api/auth/profile', {
        username: formData.username,
        fullName: formData.fullName
      });

      updateUser(response.data.user);
      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update profile';
      setMessage(errorMessage);
    }

    setLoading(false);
  };

  const handleAvatarChange = async (avatarUrl) => {
    setAvatarLoading(true);
    try {
      const response = await api.put('/api/auth/avatar', {
        avatar: avatarUrl
      });
      
      setSelectedAvatar(avatarUrl);
      updateUser(response.data.user);
      toast({
        title: 'Success',
        description: 'Avatar updated successfully'
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update avatar';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
    setAvatarLoading(false);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Profile Settings</h2>
      <p className="text-sm text-muted-foreground mb-6">Manage your account information</p>
      
      {message && (
        <Alert variant={message.includes('success') ? 'default' : 'destructive'} className="mb-4">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Avatar Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Profile Avatar</label>
        <div className="flex items-center gap-4 mb-3">
          <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-primary">
            <img src={selectedAvatar} alt="Current avatar" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-medium">Current Avatar</p>
            <p className="text-xs text-muted-foreground">Choose from the avatars below</p>
          </div>
        </div>
        
        <div className="grid grid-cols-5 gap-3">
          {avatars.map((avatarUrl, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleAvatarChange(avatarUrl)}
              disabled={avatarLoading}
              className={`relative h-16 w-16 rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${
                selectedAvatar === avatarUrl 
                  ? 'border-primary ring-2 ring-primary ring-offset-2' 
                  : 'border-border hover:border-primary'
              }`}
            >
              <img src={avatarUrl} alt={`Avatar ${index + 1}`} className="h-full w-full object-cover" />
              {selectedAvatar === avatarUrl && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {avatarLoading ? 'Updating avatar...' : 'Click on an avatar to select it'}
        </p>
      </div>

      <Separator className="my-6" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Username</label>
          <Input
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="username"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Full Name</label>
          <Input
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="John Doe"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <Input
            value={formData.email}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
        </div>

        <Separator className="my-4" />

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Security Tab Component
function SecurityTab({ token }) {
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }

    if (passwords.newPassword.length < 6) {
      setMessage('New password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await api.put('/api/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });

      toast({
        title: 'Success',
        description: 'Password changed successfully'
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to change password';
      setMessage(errorMessage);
    }

    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Security Settings</h2>
      <p className="text-sm text-muted-foreground mb-6">Change your password</p>
      
      {message && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-2">Current Password</label>
          <Input
            type="password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
            placeholder="••••••••"
            disabled={loading}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">New Password</label>
          <Input
            type="password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            placeholder="••••••••"
            disabled={loading}
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Confirm New Password</label>
          <Input
            type="password"
            value={passwords.confirmPassword}
            onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
            placeholder="••••••••"
            disabled={loading}
            required
            minLength={6}
          />
        </div>

        <Separator className="my-4" />

        <Button type="submit" disabled={loading}>
          {loading ? 'Changing...' : 'Change Password'}
        </Button>
      </form>
    </div>
  );
}

// API Keys Tab Component
function ApiKeysTab({ token }) {
  const [apiTokens, setApiTokens] = useState([]);
  const [tokenName, setTokenName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewToken, setShowNewToken] = useState('');
  const { toast } = useToast();

  React.useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await api.get('/api/auth/api-tokens');
      setApiTokens(response.data.tokens);
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
    }
  };

  const handleCreateToken = async (e) => {
    e.preventDefault();
    if (!tokenName.trim()) return;

    setLoading(true);
    try {
      const response = await api.post('/api/auth/api-tokens', { name: tokenName });
      
      setShowNewToken(response.data.token.token);
      setTokenName('');
      fetchTokens();
      toast({
        title: 'Success',
        description: 'API token created successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create API token',
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  const handleDeleteToken = async (tokenId) => {
    try {
      await api.delete(`/api/auth/api-tokens/${tokenId}`);
      
      fetchTokens();
      toast({
        title: 'Success',
        description: 'API token deleted successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete API token',
        variant: 'destructive'
      });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Token copied to clipboard'
    });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">API Keys</h2>
      <p className="text-sm text-muted-foreground mb-6">Manage your API tokens for integrations</p>

      {showNewToken && (
        <Alert className="mb-4">
          <AlertDescription>
            <p className="font-medium mb-2">Your new API token (save it now, it won't be shown again):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-2 rounded text-sm break-all">{showNewToken}</code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(showNewToken)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setShowNewToken('')}>
              Close
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleCreateToken} className="mb-6">
        <div className="flex gap-2">
          <Input
            placeholder="Token name (e.g., Production API)"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Create Token
          </Button>
        </div>
      </form>

      <Separator className="my-4" />

      <div className="space-y-3">
        {apiTokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API tokens yet</p>
        ) : (
          apiTokens.map((token) => (
            <div key={token.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-sm">{token.name}</p>
                <code className="text-xs text-muted-foreground">{token.token}</code>
                <p className="text-xs text-muted-foreground mt-1">
                  Created: {new Date(token.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteToken(token.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Notifications Tab Component
function NotificationsTab({ user, updateUser, token }) {
  const { fetchAllNotifications, markAllAsRead } = useNotifications();
  const [preferences, setPreferences] = useState({
    // Browser notifications - only true if explicitly enabled
    browserNotifications: localStorage.getItem('browserNotifications') === 'true',
    notificationSound: localStorage.getItem('notificationSound') === 'true',
    
    // Email notifications (for future)
    emailNotifications: user?.notifications?.email !== false,
    
    // Notification types - default to true if not set
    runStarted: localStorage.getItem('notify_runStarted') !== 'false',
    runCompleted: localStorage.getItem('notify_runCompleted') !== 'false',
    runFailed: localStorage.getItem('notify_runFailed') !== 'false',
    lowBalance: localStorage.getItem('notify_lowBalance') !== 'false',
    usageWarning: localStorage.getItem('notify_usageWarning') !== 'false',
    quotaExceeded: localStorage.getItem('notify_quotaExceeded') !== 'false',
    billingIssue: localStorage.getItem('notify_billingIssue') !== 'false',
    paymentFailed: localStorage.getItem('notify_paymentFailed') !== 'false',
    systemAnnouncement: localStorage.getItem('notify_systemAnnouncement') !== 'false',
    newFeature: localStorage.getItem('notify_newFeature') !== 'false',
    maintenance: localStorage.getItem('notify_maintenance') !== 'false',
    
    // Display preferences
    autoMarkAsRead: localStorage.getItem('autoMarkAsRead') === 'true',
    showPriorityBadges: localStorage.getItem('showPriorityBadges') !== 'false',
  });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, unread: 0, read: 0 });
  const { toast } = useToast();

  // Load all notifications for stats
  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check browser notification permission status
  useEffect(() => {
    if ('Notification' in window) {
      // If permission is denied, force disable
      if (Notification.permission === 'denied') {
        setPreferences(prev => ({ ...prev, browserNotifications: false }));
        localStorage.setItem('browserNotifications', 'false');
      } else if (Notification.permission === 'default') {
        // If permission not asked yet, make sure toggle is off
        setPreferences(prev => ({ ...prev, browserNotifications: false }));
        localStorage.setItem('browserNotifications', 'false');
      } else if (Notification.permission === 'granted') {
        // Only enable if user explicitly enabled it before
        const savedPref = localStorage.getItem('browserNotifications');
        if (savedPref === 'true') {
          setPreferences(prev => ({ ...prev, browserNotifications: true }));
        } else {
          setPreferences(prev => ({ ...prev, browserNotifications: false }));
          localStorage.setItem('browserNotifications', 'false');
        }
      }
    } else {
      // Browser doesn't support notifications
      setPreferences(prev => ({ ...prev, browserNotifications: false }));
      localStorage.setItem('browserNotifications', 'false');
    }
  }, []);

  const loadNotifications = async () => {
    const result = await fetchAllNotifications(1, 1000);
    
    const unread = result.notifications.filter(n => !n.read).length;
    setStats({
      total: result.notifications.length,
      unread: unread,
      read: result.notifications.length - unread
    });
  };

  const handleToggle = async (key) => {
    const newValue = !preferences[key];
    
    // Special handling for browser notifications
    if (key === 'browserNotifications' && newValue) {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        toast({
          title: 'Not Supported',
          description: 'Your browser does not support notifications',
          variant: 'destructive'
        });
        return;
      }

      // Check current permission
      if (Notification.permission === 'denied') {
        // Get browser-specific instructions
        const getBrowserInstructions = () => {
          const userAgent = navigator.userAgent.toLowerCase();
          if (userAgent.includes('chrome')) {
            return 'Click the lock icon in the address bar → Site settings → Notifications → Allow';
          } else if (userAgent.includes('firefox')) {
            return 'Click the lock icon in the address bar → Permissions → Notifications → Allow';
          } else if (userAgent.includes('safari')) {
            return 'Safari → Settings → Websites → Notifications → Allow for this site';
          } else if (userAgent.includes('edge')) {
            return 'Click the lock icon in the address bar → Permissions → Notifications → Allow';
          }
          return 'Check your browser settings to enable notifications for this site';
        };

        toast({
          title: '🔔 Notifications Blocked',
          description: getBrowserInstructions(),
          variant: 'destructive',
          duration: 10000 // Show for 10 seconds so user can read instructions
        });
        return;
      }

      // Request permission if not granted
      if (Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'denied') {
            toast({
              title: 'Permission Denied',
              description: 'You denied notification permission. To enable it later, click the lock icon in your browser address bar.',
              variant: 'destructive',
              duration: 8000
            });
            return;
          } else if (permission === 'granted') {
            // Permission granted, proceed
            setPreferences({ ...preferences, [key]: true });
            localStorage.setItem(key, 'true');
            toast({
              title: '✅ Notifications Enabled',
              description: 'You will now receive browser notifications',
              duration: 3000
            });
            return;
          }
        } catch (error) {
          console.error('Error requesting notification permission:', error);
          toast({
            title: 'Error',
            description: 'Failed to request notification permission. Please try again or check your browser settings.',
            variant: 'destructive',
            duration: 5000
          });
          return;
        }
      }
    }

    // For all other toggles and browser notifications when turning off
    setPreferences({ ...preferences, [key]: newValue });
    
    // Save to localStorage
    localStorage.setItem(key, newValue.toString());
    
    // No toast for regular toggles - user wants it removed
  };

  const handleClearAllRead = async () => {
    setLoading(true);
    try {
      await api.delete('/api/notifications');
      await loadNotifications();
      toast({
        title: 'Success',
        description: 'All read notifications cleared'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear notifications',
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await markAllAsRead();
      await loadNotifications();
      toast({
        title: 'Success',
        description: 'All notifications marked as read'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark as read',
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  const testNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from Scrapi',
        icon: '/logo192.png',
        badge: '/logo192.png'
      });
      toast({
        title: 'Test Sent',
        description: 'Check your browser for the test notification'
      });
    } else {
      toast({
        title: 'Permission Required',
        description: 'Please enable browser notifications first',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Notification Settings</h2>
        <p className="text-sm text-muted-foreground">
          Customize how and when you receive notifications
        </p>
      </div>

      {/* Notification Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-accent/50 rounded-lg p-4 border">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total Notifications</div>
        </div>
        <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
          <div className="text-sm text-muted-foreground">Unread</div>
        </div>
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="text-2xl font-bold text-green-600">{stats.read}</div>
          <div className="text-sm text-muted-foreground">Read</div>
        </div>
      </div>

      <Separator />

      {/* Browser Notifications */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Browser Notifications</h3>
        
        {/* Helper alert for browser notifications */}
        {('Notification' in window) && Notification.permission === 'denied' && (
          <Alert className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
            <AlertDescription className="text-sm">
              <strong>📌 How to enable browser notifications:</strong><br/>
              1. Click the <strong>lock icon (🔒)</strong> or <strong>info icon (ⓘ)</strong> in your browser's address bar<br/>
              2. Find "Notifications" in the permissions list<br/>
              3. Change it from "Block" to <strong>"Allow"</strong><br/>
              4. Refresh this page and try again
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <p className="font-medium">Enable Browser Notifications</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Receive desktop notifications when new notifications arrive
            </p>
            {!('Notification' in window) && (
              <p className="text-xs text-red-500 mt-1">
                ⚠️ Your browser does not support notifications
              </p>
            )}
            {('Notification' in window) && Notification.permission === 'denied' && (
              <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded">
                <p className="text-xs text-orange-700 dark:text-orange-400 font-semibold mb-1">
                  ⚠️ Notifications Blocked
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-500">
                  To enable: Click the <strong>lock icon</strong> in your browser's address bar → 
                  Permissions → Notifications → <strong>Allow</strong>
                </p>
              </div>
            )}
            {('Notification' in window) && Notification.permission === 'default' && !preferences.browserNotifications && (
              <p className="text-xs text-blue-500 mt-1">
                ℹ️ Click to enable and grant permission for notifications
              </p>
            )}
            {('Notification' in window) && Notification.permission === 'granted' && preferences.browserNotifications && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                ✅ Browser notifications are enabled and working
              </p>
            )}
          </div>
          <Switch
            checked={preferences.browserNotifications}
            onCheckedChange={() => handleToggle('browserNotifications')}
            disabled={loading || !('Notification' in window)}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {preferences.notificationSound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <p className="font-medium">Notification Sound</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Play sound when receiving notifications
            </p>
          </div>
          <Switch
            checked={preferences.notificationSound}
            onCheckedChange={() => handleToggle('notificationSound')}
            disabled={loading}
          />
        </div>

        {preferences.browserNotifications && (
          <Button variant="outline" onClick={testNotification} className="w-full">
            <Bell className="h-4 w-4 mr-2" />
            Test Notification
          </Button>
        )}
      </div>

      <Separator />

      {/* Notification Types */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Notification Types</h3>
        <p className="text-sm text-muted-foreground">
          Choose which types of notifications you want to receive
        </p>

        {/* Run Notifications */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Run Notifications</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <p className="text-sm font-medium">Run Completed</p>
              </div>
              <Switch
                checked={preferences.runCompleted}
                onCheckedChange={() => handleToggle('runCompleted')}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-red-500" />
                <p className="text-sm font-medium">Run Failed</p>
              </div>
              <Switch
                checked={preferences.runFailed}
                onCheckedChange={() => handleToggle('runFailed')}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-500" />
                <p className="text-sm font-medium">Run Started</p>
              </div>
              <Switch
                checked={preferences.runStarted}
                onCheckedChange={() => handleToggle('runStarted')}
              />
            </div>
          </div>
        </div>

        {/* Billing Notifications */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Billing & Usage</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-500" />
                <p className="text-sm font-medium">Low Balance</p>
              </div>
              <Switch
                checked={preferences.lowBalance}
                onCheckedChange={() => handleToggle('lowBalance')}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-500" />
                <p className="text-sm font-medium">Usage Warning</p>
              </div>
              <Switch
                checked={preferences.usageWarning}
                onCheckedChange={() => handleToggle('usageWarning')}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-red-500" />
                <p className="text-sm font-medium">Quota Exceeded</p>
              </div>
              <Switch
                checked={preferences.quotaExceeded}
                onCheckedChange={() => handleToggle('quotaExceeded')}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-red-500" />
                <p className="text-sm font-medium">Billing Issue</p>
              </div>
              <Switch
                checked={preferences.billingIssue}
                onCheckedChange={() => handleToggle('billingIssue')}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-red-500" />
                <p className="text-sm font-medium">Payment Failed</p>
              </div>
              <Switch
                checked={preferences.paymentFailed}
                onCheckedChange={() => handleToggle('paymentFailed')}
              />
            </div>
          </div>
        </div>

        {/* System Notifications */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">System & Updates</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-500" />
                <p className="text-sm font-medium">System Announcements</p>
              </div>
              <Switch
                checked={preferences.systemAnnouncement}
                onCheckedChange={() => handleToggle('systemAnnouncement')}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-green-500" />
                <p className="text-sm font-medium">New Features</p>
              </div>
              <Switch
                checked={preferences.newFeature}
                onCheckedChange={() => handleToggle('newFeature')}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-500" />
                <p className="text-sm font-medium">Maintenance Notices</p>
              </div>
              <Switch
                checked={preferences.maintenance}
                onCheckedChange={() => handleToggle('maintenance')}
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Display Preferences */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Display Preferences</h3>

        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <p className="font-medium">Auto Mark as Read</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically mark notifications as read when clicking them
            </p>
          </div>
          <Switch
            checked={preferences.autoMarkAsRead}
            onCheckedChange={() => handleToggle('autoMarkAsRead')}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <p className="font-medium">Show Priority Badges</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Display priority level badges on notifications
            </p>
          </div>
          <Switch
            checked={preferences.showPriorityBadges}
            onCheckedChange={() => handleToggle('showPriorityBadges')}
          />
        </div>
      </div>

      <Separator />

      {/* Management Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Manage Notifications</h3>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={loading || stats.unread === 0}
            className="flex-1"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark All as Read ({stats.unread})
          </Button>

          <Button
            variant="outline"
            onClick={handleClearAllRead}
            disabled={loading || stats.read === 0}
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Read ({stats.read})
          </Button>
        </div>

        <Alert>
          <AlertDescription className="text-sm">
            <strong>Note:</strong> Notifications are automatically deleted after 90 days. 
            This helps keep your notification center clean and organized.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

// Billing Tab Component
function BillingTab({ user }) {
  const planDetails = {
    free: { name: 'Free', price: '$0', credits: '$5', ram: '8 GB' },
    starter: { name: 'Starter', price: '$49', credits: '$49', ram: '16 GB' },
    scale: { name: 'Scale', price: '$499', credits: '$499', ram: '64 GB' },
    business: { name: 'Business', price: '$999', credits: '$999', ram: '128 GB' },
    enterprise: { name: 'Enterprise', price: 'Custom', credits: 'Custom', ram: 'Custom' }
  };

  const currentPlan = planDetails[user?.plan || 'free'];
  
  // Calculate usage percentages and display strings
  const ramPercentage = ((user?.usage?.ramUsedMB || 0) / (user?.usage?.ramLimitMB || 8192)) * 100;
  const creditsPercentage = ((user?.usage?.creditsUsed || 0) / (user?.usage?.creditsLimit || 5)) * 100;
  const creditsDisplay = '$' + (user?.usage?.creditsUsed?.toFixed(2) || '0.00') + ' / $' + (user?.usage?.creditsLimit?.toFixed(2) || '5.00');

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Billing & Usage</h2>
      <p className="text-sm text-muted-foreground mb-6">Manage your subscription and view usage</p>

      <div className="space-y-6">
        {/* Current Plan */}
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">Current Plan</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{currentPlan.name}</p>
              <p className="text-sm text-muted-foreground">{currentPlan.price}/month</p>
            </div>
            <Button>Upgrade Plan</Button>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="space-y-4">
          <h3 className="font-medium">Usage This Month</h3>
          
          <div className="p-4 border rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-sm">RAM Usage</span>
              <span className="text-sm font-medium">
                {user?.usage?.ramUsedMB || 0} MB / {user?.usage?.ramLimitMB || 8192} MB
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: ramPercentage + '%' }}
              />
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-sm">Credits Used</span>
              <span className="text-sm font-medium">
                {creditsDisplay}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: creditsPercentage + '%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
