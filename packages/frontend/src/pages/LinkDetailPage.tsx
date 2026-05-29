import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Clock,
  Edit,
  Save,
  QrCode,
  BarChart3,
  Trash2,
} from 'lucide-react';
import { useLink, useLinkAnalytics, useUpdateLink, useDeleteLink } from '@/hooks/useLinks';
import { useAuth } from '@/hooks/useAuth';
import ClicksChart from '@/components/analytics/ClicksChart';
import DeviceChart from '@/components/analytics/DeviceChart';
import BrowserChart from '@/components/analytics/BrowserChart';
import GeoMap from '@/components/analytics/GeoMap';
import ReferrersTable from '@/components/analytics/ReferrersTable';
import StatCard from '@/components/ui/StatCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import { formatNumber, formatDate, statusBadge } from '@/utils/format';
import toast from 'react-hot-toast';

export default function LinkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: link, isLoading: linkLoading } = useLink(id!);
  const { data: analytics, isLoading: analyticsLoading } = useLinkAnalytics(id!);
  const updateLink = useUpdateLink();
  const deleteLink = useDeleteLink();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState('');
  const [copied, setCopied] = useState(false);

  if (linkLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </div>
        <div className="skeleton h-80 rounded-xl" />
      </div>
    );
  }

  if (!link) {
    return (
      <div className="text-center py-20">
        <p className="text-secondary-400">Link not found</p>
        <Button variant="ghost" onClick={() => navigate('/links')} className="mt-4">
          <ArrowLeft className="w-4 h-4" /> Back to Links
        </Button>
      </div>
    );
  }

  const { label, color } = statusBadge(link.isActive);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditTitle(link.title || '');
      setEditTags((link.tags || []).join(', '));
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    await updateLink.mutateAsync({
      id: link.id,
      data: {
        title: editTitle,
        tags: editTags.split(',').map((t) => t.trim()).filter(Boolean),
      },
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Permanently delete this link and all its analytics?')) {
      await deleteLink.mutateAsync(link.id);
      navigate('/links');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/links')} className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-secondary-400" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                {link.title || 'Untitled Link'}
              </h2>
              <Badge variant={link.isActive ? 'success' : 'default'} size="sm" dot>
                {label}
              </Badge>
            </div>
            <p className="text-secondary-500 text-sm mt-0.5">Link details and analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/analytics/${link.id}`)} icon={<BarChart3 className="w-4 h-4" />}>
            Full Analytics
          </Button>
          <Button variant="ghost" onClick={handleDelete} icon={<Trash2 className="w-4 h-4 text-danger-500" />} />
        </div>
      </div>

      <div className="card p-5">
        {isEditing ? (
          <div className="space-y-4">
            <Input label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="My Campaign" />
            <Input label="Tags (comma separated)" value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="marketing, social" />
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} loading={updateLink.isLoading} icon={<Save className="w-4 h-4" />}>Save</Button>
              <Button variant="ghost" onClick={handleEditToggle}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-secondary-400 uppercase tracking-wider">Original URL</span>
              </div>
              <a href={link.originalUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 dark:text-primary-400 hover:underline break-all">
                {link.originalUrl}
              </a>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-sm text-secondary-500">Short URL:</span>
                <a href={link.shortUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  {link.shortUrl}
                </a>
                <button onClick={handleCopy} className="p-1 rounded text-secondary-400 hover:text-primary-500 transition-colors">
                  {copied ? <Check className="w-4 h-4 text-success-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {link.tags && link.tags.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  {link.tags.map((tag) => (
                    <Badge key={tag} variant="info" size="sm">{tag}</Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-secondary-400">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Created {formatDate(link.createdAt)}</span>
                {link.expiresAt && (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Expires {formatDate(link.expiresAt)}</span>
                )}
              </div>
            </div>
            <Button variant="ghost" onClick={handleEditToggle} icon={<Edit className="w-4 h-4" />}>Edit</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Total Clicks" value={formatNumber(analytics?.summary.totalClicks || 0)} variant="primary" />
        <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Unique Clicks" value={formatNumber(analytics?.summary.uniqueClicks || 0)} variant="success" />
        <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Unique Visitors" value={formatNumber(analytics?.summary.uniqueVisitors || 0)} variant="warning" />
        <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Bounce Rate" value={`${(analytics?.summary.bounceRate || 0).toFixed(1)}%`} variant="default" />
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Clicks Timeline</h3>
        <ClicksChart data={analytics?.timeline || []} />
      </div>

      {analytics && analytics.geo && analytics.geo.length > 0 && (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {analytics?.referrers && analytics.referrers.length > 0 && (
          <div>
            <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-3">Top Referrers</h3>
            <ReferrersTable data={analytics.referrers} />
          </div>
        )}
        <div className="card p-5">
          <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-4">QR Code</h3>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-40 h-40 bg-secondary-100 dark:bg-secondary-700 rounded-xl flex items-center justify-center">
              <QrCode className="w-16 h-16 text-secondary-400" />
            </div>
            <p className="text-xs text-secondary-400 mt-3">Scan to visit {link.shortUrl}</p>
            <Button variant="outline" size="sm" className="mt-3">Download QR</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
