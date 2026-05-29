import { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Link as LinkIcon,
  MousePointerClick,
  Activity,
  Database,
  Server,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { adminApi, AdminStats, SystemHealth, ActivityLog, ServerLog, User } from '@/services/api';
import StatCard from '@/components/ui/StatCard';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatNumber, formatRelativeTime, formatDate } from '@/utils/format';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [logs, setLogs] = useState<ServerLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [logLevel, setLogLevel] = useState<string>('all');
  const [userSearch, setUserSearch] = useState('');
  const [activeSection, setActiveSection] = useState<'overview' | 'users' | 'logs'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, healthRes, activityRes, logsRes, usersRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getHealth(),
        adminApi.getActivity({ limit: 10 }),
        adminApi.getLogs({ limit: 20 }),
        adminApi.getUsers({ limit: 10 }),
      ]);
      setStats(statsRes.data);
      setHealth(healthRes.data);
      setActivity(activityRes.data.data);
      setLogs(logsRes.data.data);
      setUsers(usersRes.data.data);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleManageUser = async (userId: string, action: 'activate' | 'deactivate' | 'delete') => {
    try {
      await adminApi.manageUser(userId, { action });
      toast.success(`User ${action}d successfully`);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to ${action} user`);
    }
  };

  const healthStatusIcon = (status: string) => {
    if (status === 'healthy') return <CheckCircle className="w-5 h-5 text-success-500" />;
    if (status === 'degraded') return <AlertTriangle className="w-5 h-5 text-warning-500" />;
    return <XCircle className="w-5 h-5 text-danger-500" />;
  };

  const logBadgeVariant = (level: string) => {
    switch (level) {
      case 'error': return 'danger' as const;
      case 'warn': return 'warning' as const;
      case 'info': return 'info' as const;
      default: return 'default' as const;
    }
  };

  const userColumns: Column<User>[] = [
    { key: 'name', header: 'Name', render: (u) => <span className="font-medium text-secondary-900 dark:text-secondary-100">{u.name}</span> },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (u) => <Badge variant={u.role === 'admin' ? 'purple' : 'default'} size="sm">{u.role}</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (u) => <span className="text-secondary-500">{u.createdAt ? formatRelativeTime(u.createdAt) : '-'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (u) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => handleManageUser(u.id, u.role === 'admin' ? 'deactivate' : 'activate')}>
            {u.role === 'admin' ? 'Deactivate' : 'Activate'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleManageUser(u.id, 'delete')}>
            <XCircle className="w-4 h-4 text-danger-500" />
          </Button>
        </div>
      ),
    },
  ];

  const logColumns: Column<ServerLog>[] = [
    {
      key: 'level',
      header: 'Level',
      render: (log) => <Badge variant={logBadgeVariant(log.level)} size="sm">{log.level.toUpperCase()}</Badge>,
    },
    { key: 'message', header: 'Message', render: (log) => <span className="font-mono text-xs">{log.message}</span> },
    { key: 'module', header: 'Module', render: (log) => <span className="text-secondary-500 text-xs">{log.module}</span> },
    {
      key: 'timestamp',
      header: 'Time',
      render: (log) => <span className="text-secondary-400 text-xs">{formatDate(log.timestamp, 'MMM d, HH:mm:ss')}</span>,
    },
  ];

  const filteredLogs = logLevel === 'all' ? logs : logs.filter((l) => l.level === logLevel);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-accent-500" />
            <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">Admin Panel</h2>
          </div>
          <p className="text-secondary-500 mt-1">System administration and monitoring</p>
        </div>
        <Button variant="secondary" onClick={loadData} loading={loading} icon={<RefreshCw className="w-4 h-4" />}>
          Refresh
        </Button>
      </div>

      <div className="flex gap-1 p-1 bg-secondary-100 dark:bg-secondary-800 rounded-xl w-fit">
        {(['overview', 'users', 'logs'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all ${
              activeSection === section
                ? 'bg-white dark:bg-secondary-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-secondary-500 hover:text-secondary-700'
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      {activeSection === 'overview' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Users className="w-5 h-5" />} label="Total Users" value={formatNumber(stats?.totalUsers || 0)} variant="primary" />
            <StatCard icon={<LinkIcon className="w-5 h-5" />} label="Total Links" value={formatNumber(stats?.totalLinks || 0)} variant="success" />
            <StatCard icon={<MousePointerClick className="w-5 h-5" />} label="Total Clicks" value={formatNumber(stats?.totalClicks || 0)} variant="warning" />
            <StatCard icon={<Activity className="w-5 h-5" />} label="Active Today" value={formatNumber(stats?.activeToday || 0)} variant="default" />
          </div>

          {health && (
            <div className="card p-5">
              <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-4">System Health</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg border border-secondary-200 dark:border-secondary-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-secondary-400" />
                      <span className="text-sm font-medium">Database</span>
                    </div>
                    {healthStatusIcon(health.database.status)}
                  </div>
                  <p className="text-xs text-secondary-400">{health.database.latency}ms latency</p>
                </div>
                <div className="p-4 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg border border-secondary-200 dark:border-secondary-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-secondary-400" />
                      <span className="text-sm font-medium">Redis</span>
                    </div>
                    {healthStatusIcon(health.redis.status)}
                  </div>
                  <p className="text-xs text-secondary-400">{health.redis.latency}ms latency</p>
                </div>
                <div className="p-4 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg border border-secondary-200 dark:border-secondary-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-secondary-400" />
                      <span className="text-sm font-medium">Queue</span>
                    </div>
                    {healthStatusIcon(health.queue.status)}
                  </div>
                  <p className="text-xs text-secondary-400">{health.queue.jobs} pending jobs</p>
                </div>
              </div>
            </div>
          )}

          <div className="card p-5">
            <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Recent Activity</h3>
            <div className="space-y-2">
              {activity.length === 0 ? (
                <p className="text-secondary-400 text-sm text-center py-4">No recent activity</p>
              ) : (
                activity.map((act) => (
                  <div key={act.id} className="flex items-center gap-3 p-3 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-accent-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-secondary-700 dark:text-secondary-300">
                        <span className="font-medium">{act.userName}</span> {act.action}
                      </p>
                      <p className="text-xs text-secondary-400">{act.details}</p>
                    </div>
                    <span className="text-xs text-secondary-400 shrink-0">{formatRelativeTime(act.timestamp)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {activeSection === 'users' && (
        <DataTable
          columns={userColumns}
          data={users}
          keyExtractor={(u) => u.id}
          searchable
          searchPlaceholder="Search users..."
          onSearch={setUserSearch}
        />
      )}

      {activeSection === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {['all', 'error', 'warn', 'info', 'debug'].map((level) => (
              <button
                key={level}
                onClick={() => setLogLevel(level)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize ${
                  logLevel === level
                    ? 'bg-primary-500 text-white'
                    : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-500 hover:text-secondary-700'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <DataTable
            columns={logColumns}
            data={filteredLogs}
            keyExtractor={(l, i) => `${l.timestamp}-${i}`}
            emptyMessage="No logs match the selected filter"
          />
        </div>
      )}
    </div>
  );
}
