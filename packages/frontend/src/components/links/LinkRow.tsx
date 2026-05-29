import { useState } from 'react';
import { Copy, ExternalLink, Trash2, Edit, Check, X, BarChart3 } from 'lucide-react';
import { Link as LinkType } from '@/services/api';
import { formatRelativeTime, formatNumber, statusBadge } from '@/utils/format';
import { useDeleteLink } from '@/hooks/useLinks';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';

interface LinkRowProps {
  link: LinkType;
  onEdit: (link: LinkType) => void;
}

export default function LinkRow({ link, onEdit }: LinkRowProps) {
  const navigate = useNavigate();
  const deleteLink = useDeleteLink();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this link?')) {
      deleteLink.mutate(link.id);
    }
  };

  const { label, color } = statusBadge(link.isActive);

  return (
    <tr className="hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/links/${link.id}`)}>
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate max-w-[250px]">
            {link.title || 'Untitled'}
          </span>
          <span className="text-xs text-secondary-400 truncate max-w-[250px]">{link.originalUrl}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <a
            href={link.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
          >
            /{link.shortCode}
          </a>
          <button
            onClick={handleCopy}
            className="p-1 rounded text-secondary-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors"
            title="Copy short URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <a
            href={link.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-secondary-900 dark:text-secondary-100">
        {formatNumber(link.clicks)}
      </td>
      <td className="px-4 py-3 text-sm text-secondary-500">
        {formatRelativeTime(link.createdAt)}
      </td>
      <td className="px-4 py-3">
        <Badge variant={link.isActive ? 'success' : 'default'} size="sm" dot>
          {label}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/analytics/${link.id}`); }}
            className="p-1.5 rounded-lg text-secondary-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors"
            title="View analytics"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(link); }}
            className="p-1.5 rounded-lg text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
            title="Edit link"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-secondary-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-950 transition-colors"
            title="Delete link"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
