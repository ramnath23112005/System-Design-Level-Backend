import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Link as LinkIcon,
  MousePointerClick,
  Activity,
  TrendingUp,
  Globe,
  Smartphone,
  Monitor,
  Clock,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard, useRealTime } from '@/hooks/useAnalytics';
import StatCard from '@/components/ui/StatCard';
import ClicksChart from '@/components/analytics/ClicksChart';
import DeviceChart from '@/components/analytics/DeviceChart';
import BrowserChart from '@/components/analytics/BrowserChart';
import GeoMap from '@/components/analytics/GeoMap';
import { formatNumber, formatRelativeTime } from '@/utils/format';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: dashboard, isLoading } = useDashboard();
  const { data: realTime } = useRealTime();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-8 w-64 mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-80 rounded-xl" />
          <div className="skeleton h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </h2>
          <p className="text-secondary-500 mt-1">Here's what's happening with your links today.</p>
        </div>
        {realTime && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-xl">
            <Zap className="w-5 h-5 text-primary-500" />
            <div className="text-sm">
              <span className="text-primary-700 dark:text-primary-300 font-semibold">{realTime.activeVisitors}</span>
              <span className="text-primary-500 dark:text-primary-400 ml-1">active now</span>
            </div>
            <div className="w-px h-6 bg-primary-200 dark:bg-primary-700" />
            <div className="text-sm">
              <span className="text-primary-700 dark:text-primary-300 font-semibold">{formatNumber(realTime.clicksToday)}</span>
              <span className="text-primary-500 dark:text-primary-400 ml-1">today</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<LinkIcon className="w-5 h-5" />}
          label="Total Links"
          value={formatNumber(dashboard?.totalLinks || 0)}
          trend={{ value: 12, isUp: true }}
          variant="primary"
        />
        <StatCard
          icon={<MousePointerClick className="w-5 h-5" />}
          label="Total Clicks"
          value={formatNumber(dashboard?.totalClicks || 0)}
          trend={{ value: 8, isUp: true }}
          variant="success"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Active Links"
          value={formatNumber(dashboard?.activeLinks || 0)}
          variant="warning"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Click Rate"
          value={`${(dashboard?.clickRate || 0).toFixed(1)}%`}
          subtitle="Avg. clicks per link"
          variant="default"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-secondary-900 dark:text-secondary-100">Clicks Over Time</h3>
            <div className="flex items-center gap-2 text-xs text-secondary-400">
              <Clock className="w-3 h-3" />
              Last 30 days
            </div>
          </div>
          <ClicksChart data={dashboard?.clicksOverTime || []} />
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Devices</h3>
          <DeviceChart data={dashboard?.deviceData || []} height={250} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Geographic Distribution</h3>
          <GeoMap data={dashboard?.geoData || []} height={300} />
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Browsers</h3>
          <BrowserChart data={dashboard?.browserData || []} height={250} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-secondary-900 dark:text-secondary-100">Top Performing Links</h3>
            <button
              onClick={() => navigate('/links')}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {dashboard?.topLinks && dashboard.topLinks.length > 0 ? (
              dashboard.topLinks.slice(0, 5).map((link, idx) => (
                <div
                  key={link.id}
                  onClick={() => navigate(`/links/${link.id}`)}
                  className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg cursor-pointer hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-secondary-400 w-5">{idx + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate max-w-[200px]">
                        {link.title || link.originalUrl}
                      </p>
                      <p className="text-xs text-primary-500 truncate">/{link.shortCode}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-secondary-900 dark:text-secondary-100">{formatNumber(link.clicks)}</span>
                </div>
              ))
            ) : (
              <p className="text-center text-secondary-400 text-sm py-8">No links yet. Create your first link!</p>
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-secondary-900 dark:text-secondary-100">Recent Clicks</h3>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {dashboard?.recentClicks && dashboard.recentClicks.length > 0 ? (
              dashboard.recentClicks.map((click) => (
                <div key={click.id} className="flex items-center gap-3 p-2.5 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    {click.device?.toLowerCase().includes('mobile') ? (
                      <Smartphone className="w-4 h-4 text-primary-600" />
                    ) : (
                      <Monitor className="w-4 h-4 text-primary-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-secondary-700 dark:text-secondary-300">
                      {click.country || 'Unknown'} · {click.browser || 'Unknown'}
                    </p>
                    <p className="text-[11px] text-secondary-400">
                      {formatRelativeTime(click.timestamp)}
                    </p>
                  </div>
                  <Globe className="w-3 h-3 text-secondary-300 shrink-0" />
                </div>
              ))
            ) : (
              <p className="text-center text-secondary-400 text-sm py-8">No clicks yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
