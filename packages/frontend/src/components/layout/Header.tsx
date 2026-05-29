import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Key,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import clsx from 'clsx';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/links': 'Links',
  '/settings': 'Settings',
  '/admin': 'Admin Panel',
};

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  const currentPath = '/' + location.pathname.split('/')[1];
  const pageTitle = pageTitles[currentPath] || 'Page';

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-xl border-b border-secondary-200 dark:border-secondary-800">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">{pageTitle}</h1>
            <p className="text-xs text-secondary-400 hidden sm:block">
              {location.pathname}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-secondary-400 bg-secondary-100 dark:bg-secondary-800 rounded-lg hover:text-secondary-600 dark:hover:text-secondary-200 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Search...</span>
            <kbd className="hidden lg:inline-flex text-[10px] px-1.5 py-0.5 rounded bg-secondary-200 dark:bg-secondary-700 text-secondary-400">⌘K</kbd>
          </button>

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="relative">
            <button
              onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}
              className="relative p-2 rounded-lg text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 shadow-xl z-20 animate-slide-up">
                  <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
                    <h3 className="font-semibold text-secondary-900 dark:text-secondary-100">Notifications</h3>
                  </div>
                  <div className="p-6 text-center text-sm text-secondary-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No new notifications
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 text-sm font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <ChevronDown className="w-4 h-4 text-secondary-400 hidden sm:block" />
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 shadow-xl z-20 animate-slide-up">
                  <div className="p-3 border-b border-secondary-200 dark:border-secondary-700">
                    <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">{user?.name}</p>
                    <p className="text-xs text-secondary-400">{user?.email}</p>
                  </div>
                  <div className="p-1">
                    <a href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg">
                      <User className="w-4 h-4" />
                      Profile
                    </a>
                    <a href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg">
                      <Key className="w-4 h-4" />
                      API Keys
                    </a>
                    <a href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg">
                      <Settings className="w-4 h-4" />
                      Settings
                    </a>
                  </div>
                  <div className="border-t border-secondary-200 dark:border-secondary-700 p-1">
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950 rounded-lg"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
