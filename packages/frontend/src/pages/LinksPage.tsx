import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ArrowUpDown } from 'lucide-react';
import { useLinks } from '@/hooks/useLinks';
import DataTable, { Column } from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import CreateLinkModal from '@/components/links/CreateLinkModal';
import { Link } from '@/services/api';
import { formatNumber, formatRelativeTime, statusBadge } from '@/utils/format';

export default function LinksPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data, isLoading } = useLinks({ page, limit: 10, search, sort, order });

  const handleSort = (key: string) => {
    if (sort === key) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(key);
      setOrder('desc');
    }
  };

  const columns: Column<Link>[] = [
    {
      key: 'title',
      header: 'Title / URL',
      sortable: true,
      width: '30%',
      render: (link) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate max-w-[300px]">
            {link.title || 'Untitled'}
          </span>
          <span className="text-xs text-secondary-400 truncate max-w-[300px]">{link.originalUrl}</span>
        </div>
      ),
    },
    {
      key: 'shortCode',
      header: 'Short Link',
      render: (link) => (
        <span className="text-sm text-primary-600 dark:text-primary-400 font-medium">/{link.shortCode}</span>
      ),
    },
    {
      key: 'clicks',
      header: 'Clicks',
      sortable: true,
      align: 'right',
      render: (link) => (
        <span className="text-sm font-semibold text-secondary-900 dark:text-secondary-100">{formatNumber(link.clicks)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (link) => (
        <span className="text-sm text-secondary-500">{formatRelativeTime(link.createdAt)}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (link) => {
        const { label, color } = statusBadge(link.isActive);
        return (
          <Badge variant={link.isActive ? 'success' : 'default'} size="sm" dot>
            {label}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">Links</h2>
          <p className="text-secondary-500 mt-1">Manage your shortened URLs</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Create Link
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        keyExtractor={(link) => link.id}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Search by URL or title..."
        onSearch={(q) => { setSearch(q); setPage(1); }}
        onRowClick={(link) => navigate(`/links/${link.id}`)}
        sortKey={sort}
        sortOrder={order}
        onSort={handleSort}
        pagination={{
          page: data?.page || 1,
          totalPages: data?.totalPages || 1,
          total: data?.total || 0,
          onPageChange: setPage,
        }}
        emptyMessage="No links yet. Create your first shortened URL!"
      />

      <CreateLinkModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </div>
  );
}
