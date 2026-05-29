import { useState, FormEvent } from 'react';
import {
  User,
  Mail,
  Lock,
  Key,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Bell,
  Shield,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { userApi, authApi } from '@/services/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

interface ApiKeyItem {
  key: string;
  name: string;
  createdAt: string;
  lastUsed?: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'api' | 'notifications'>('profile');
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [showKey, setShowKey] = useState<string | null>(null);

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifBrowser, setNotifBrowser] = useState(true);
  const [notifDaily, setNotifDaily] = useState(false);

  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const { data } = await userApi.updateProfile({ name, email });
      updateUser(data);
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setPasswordLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const loadApiKeys = async () => {
    setApiKeyLoading(true);
    try {
      const { data } = await userApi.getApiKeys();
      setApiKeys(data);
    } catch {
      toast.error('Failed to load API keys');
    } finally {
      setApiKeyLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const { data } = await userApi.createApiKey(newKeyName);
      setApiKeys([data, ...apiKeys]);
      setNewKeyName('');
      toast.success('API key created');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create API key');
    }
  };

  const revokeApiKey = async (keyId: string) => {
    if (!window.confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await userApi.revokeApiKey(keyId);
      setApiKeys(apiKeys.filter((k) => k.key !== keyId));
      toast.success('API key revoked');
    } catch {
      toast.error('Failed to revoke API key');
    }
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      toast.success('API key copied');
      setTimeout(() => setCopiedKey(''), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">Settings</h2>
        <p className="text-secondary-500 mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 bg-secondary-100 dark:bg-secondary-800 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-secondary-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card p-6">
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileUpdate} className="max-w-lg space-y-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">Profile Information</h3>
            <Input label="Full Name" icon={<User className="w-4 h-4" />} value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email Address" type="email" icon={<Mail className="w-4 h-4" />} value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" loading={profileLoading}>Save Changes</Button>
          </form>
        )}

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} className="max-w-lg space-y-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">Change Password</h3>
            <Input label="Current Password" type="password" icon={<Lock className="w-4 h-4" />} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            <Input label="New Password" type="password" icon={<Lock className="w-4 h-4" />} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required helperText="Min. 8 characters" />
            <Input label="Confirm New Password" type="password" icon={<Lock className="w-4 h-4" />} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            <Button type="submit" loading={passwordLoading}>Update Password</Button>
          </form>
        )}

        {activeTab === 'api' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">API Keys</h3>
              <p className="text-sm text-secondary-400 mt-1">Manage API keys for programmatic access</p>
            </div>

            <div className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Production, Development"
                className="input-field flex-1"
              />
              <Button onClick={createApiKey} disabled={!newKeyName.trim()}>
                <Key className="w-4 h-4" /> Create
              </Button>
            </div>

            <div className="space-y-3">
              {apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="w-8 h-8 mx-auto text-secondary-300 mb-2" />
                  <p className="text-secondary-400 text-sm">No API keys created yet</p>
                  <Button variant="ghost" size="sm" onClick={loadApiKeys} className="mt-2" loading={apiKeyLoading}>
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </Button>
                </div>
              ) : (
                apiKeys.map((apiKey) => (
                  <div key={apiKey.key} className="flex items-center justify-between p-4 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg border border-secondary-200 dark:border-secondary-700">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">{apiKey.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-secondary-400 font-mono">
                          {showKey === apiKey.key ? apiKey.key : `${apiKey.key.slice(0, 12)}...${apiKey.key.slice(-4)}`}
                        </code>
                        <button onClick={() => setShowKey(showKey === apiKey.key ? null : apiKey.key)} className="text-secondary-400 hover:text-secondary-600">
                          {showKey === apiKey.key ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleCopyKey(apiKey.key)} className="p-2 text-secondary-400 hover:text-primary-500 transition-colors" title="Copy key">
                        {copiedKey === apiKey.key ? <Check className="w-4 h-4 text-success-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button onClick={() => revokeApiKey(apiKey.key)} className="p-2 text-secondary-400 hover:text-danger-500 transition-colors" title="Revoke key">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="max-w-lg space-y-6">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">Notification Preferences</h3>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg cursor-pointer">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-secondary-400" />
                  <div>
                    <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">Email Notifications</p>
                    <p className="text-xs text-secondary-400">Receive weekly reports via email</p>
                  </div>
                </div>
                <input type="checkbox" checked={notifEmail} onChange={() => setNotifEmail(!notifEmail)} className="toggle" />
              </label>

              <label className="flex items-center justify-between p-4 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg cursor-pointer">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-secondary-400" />
                  <div>
                    <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">Browser Notifications</p>
                    <p className="text-xs text-secondary-400">Real-time click alerts</p>
                  </div>
                </div>
                <input type="checkbox" checked={notifBrowser} onChange={() => setNotifBrowser(!notifBrowser)} className="toggle" />
              </label>

              <label className="flex items-center justify-between p-4 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg cursor-pointer">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-secondary-400" />
                  <div>
                    <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">Daily Summary</p>
                    <p className="text-xs text-secondary-400">Daily digest of all link activity</p>
                  </div>
                </div>
                <input type="checkbox" checked={notifDaily} onChange={() => setNotifDaily(!notifDaily)} className="toggle" />
              </label>

              <div className="flex items-center justify-between p-4 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon className="w-5 h-5 text-secondary-400" /> : <Sun className="w-5 h-5 text-secondary-400" />}
                  <div>
                    <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">Dark Mode</p>
                    <p className="text-xs text-secondary-400">Toggle dark/light theme</p>
                  </div>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-primary-600' : 'bg-secondary-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
