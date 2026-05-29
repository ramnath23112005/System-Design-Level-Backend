import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart3,
  Download,
  Activity,
  Zap,
  Calendar,
  Globe,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { useLinkAnalytics } from '@/hooks/useLinks';
import { useRealTime } from '@/hooks/useAnalytics';
import { analyticsApi } from '@/services/api';
import StatCard from '@/components/ui/StatCard';
import ClicksChart from '@/components/analytics/ClicksChart';
import DeviceChart from '@/components/analytics/DeviceChart';
import BrowserChart from '@/components/analytics/BrowserChart';
import GeoMap from '@/components/analytics/GeoMap';
import ReferrersTable from '@/components/analytics/ReferrersTable';
import DateRangePicker from '@/components/ui/DateRangePicker';
import Button from '@/components/ui/Button';
import { formatNumber } from '@/utils/format';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
  const { id } = useParams<{ id?: string }>();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  });

  const { data: analytics, isLoading } = useLinkAnalytics(id || '', dateRange);
  const { data: realTime } = useRealTime();

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const response = await analyticsApi.exportData({ format, ...dateRange });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-8 w-48" />
        <div className="flex gap-3">
          <div className="skeleton h-10 w-60 rounded-lg" />
          <div className="skeleton h-10 w-24 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </div>
        <div className="skeleton h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">Analytics</h2>
          <p className="text-secondary-500 mt-1">Track and analyze your link performance</p>
        </div>
        <div className="flex items-center gap-2">
          {realTime && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg">
              <Zap className="w-4 h-4 text-primary-500" />
              <span className="text-sm text-primary-700 dark:text-primary-300 font-medium">{realTime.activeVisitors} active</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleExport('csv')} icon={<Download className="w-4 h-4" />}>
            CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport('json')} icon={<Download className="w-4 h-4" />}>
            JSON
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Total Clicks"
          value={formatNumber(analytics?.summary.totalClicks || 0)}
          variant="primary"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Unique Clicks"
          value={formatNumber(analytics?.summary.uniqueClicks || 0)}
          variant="success"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Unique Visitors"
          value={formatNumber(analytics?.summary.uniqueVisitors || 0)}
          variant="warning"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Avg. Time"
          value={analytics?.summary.averageTime ? `${Math.round(analytics.summary.averageTime)}s` : '0s'}
          variant="default"
        />
      </div>

      {analytics?.timeline && analytics.timeline.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-secondary-900 dark:text-secondary-100">Clicks Over Time</h3>
          </div>
          <ClicksChart data={analytics.timeline} />
        </div>
      )}

      {analytics?.geo && analytics.geo.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Geographic Distribution</h3>
          <GeoMap data={analytics.geo} height={350} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {analytics?.devices && analytics.devices.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Devices</h3>
            <DeviceChart data={analytics.devices} height={250} />
          </div>
        )}
        {analytics?.browsers && analytics.browsers.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Browsers</h3>
            <BrowserChart data={analytics.browsers} height={250} />
          </div>
        )}
        {analytics?.os && analytics.os.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Operating Systems</h3>
            <DeviceChart data={analytics.os} height={250} />
          </div>
        )}
      </div>

      {analytics?.referrers && analytics.referrers.length > 0 && (
        <div>
          <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-3">Top Referrers</h3>
          <ReferrersTable data={analytics.referrers} />
        </div>
      )}
    </div>
  );
}
