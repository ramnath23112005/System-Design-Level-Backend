import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  searchable?: boolean;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  isLoading,
  pagination,
  searchable,
  onSearch,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data found',
  onRowClick,
  sortKey,
  sortOrder,
  onSort,
}: DataTableProps<T>) {
  const [localSearch, setLocalSearch] = useState('');

  const handleSearch = (value: string) => {
    setLocalSearch(value);
    onSearch?.(value);
  };

  const SortIcon = ({ column }: { column: Column<T> }) => {
    if (!column.sortable) return null;
    if (sortKey === column.key) {
      return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
    }
    return <ChevronsUpDown className="w-4 h-4 text-secondary-300" />;
  };

  if (isLoading) {
    return (
      <div className="card overflow-hidden">
        {searchable && (
          <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
            <div className="skeleton h-10 w-72 rounded-lg" />
          </div>
        )}
        <div className="p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {columns.map((col) => (
                <div key={col.key} className="skeleton h-5 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {(searchable || pagination) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-secondary-200 dark:border-secondary-700">
          {searchable && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="input-field pl-10"
              />
            </div>
          )}
          {pagination && (
            <div className="flex items-center gap-2 text-sm text-secondary-500">
              <span>{pagination.total} total</span>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-secondary-200 dark:border-secondary-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-4 py-3 text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider',
                    col.sortable && 'cursor-pointer select-none hover:text-secondary-700 dark:hover:text-secondary-200',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center'
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && <SortIcon column={col} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <p className="text-secondary-400 text-sm">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className={clsx(
                    'transition-colors duration-150',
                    onRowClick ? 'cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-800/50' : 'hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30'
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        'px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center'
                      )}
                    >
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-secondary-200 dark:border-secondary-700">
          <button
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="btn-ghost text-sm disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, i) => {
              const pageNum = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4)) + i;
              if (pageNum > pagination.totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => pagination.onPageChange(pageNum)}
                  className={clsx(
                    'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                    pageNum === pagination.page
                      ? 'bg-primary-500 text-white'
                      : 'text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="btn-ghost text-sm disabled:opacity-30"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
}
