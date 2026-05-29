import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Link,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/links', label: 'Links', icon: Link },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/analytics') return location.pathname.startsWith('/analytics');
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 lg:hidden p-2 rounded-lg bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 shadow-sm"
      >
        <Menu className="w-5 h-5 text-secondary-600" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={clsx(
          'fixed top-0 left-0 h-full bg-white dark:bg-secondary-900 border-r border-secondary-200 dark:border-secondary-800 z-50 flex flex-col transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className={clsx('flex items-center h-16 px-4 border-b border-secondary-200 dark:border-secondary-800', collapsed && 'justify-center')}>
          {collapsed ? (
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <ExternalLink className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <ExternalLink className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-secondary-900 dark:text-secondary-100">ShortURL</h1>
                <p className="text-[10px] text-secondary-400 font-medium -mt-1">URL Shortener</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex ml-auto p-1.5 rounded-lg text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-800"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                isActive(item.path)
                  ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                  : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 hover:text-secondary-900 dark:hover:text-secondary-100',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={clsx('w-5 h-5 shrink-0', isActive(item.path) ? 'text-primary-600 dark:text-primary-400' : 'text-secondary-400')} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive('/admin')
                  ? 'bg-accent-50 dark:bg-accent-950 text-accent-700 dark:text-accent-300'
                  : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? 'Admin' : undefined}
            >
              <Shield className={clsx('w-5 h-5 shrink-0', isActive('/admin') ? 'text-accent-600' : 'text-secondary-400')} />
              {!collapsed && <span>Admin</span>}
            </NavLink>
          )}
        </nav>

        <div className={clsx('p-3 border-t border-secondary-200 dark:border-secondary-800', collapsed && 'flex flex-col items-center')}>
          {!collapsed && user && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 text-sm font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate">{user.name}</p>
                <p className="text-xs text-secondary-400 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className={clsx(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-secondary-600 dark:text-secondary-400 hover:bg-danger-50 dark:hover:bg-danger-950 hover:text-danger-600 dark:hover:text-danger-400 transition-colors',
              collapsed && 'justify-center px-2'
            )}
            title="Logout"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
