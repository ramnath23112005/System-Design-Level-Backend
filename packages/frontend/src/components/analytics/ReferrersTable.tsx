import { Globe, ExternalLink } from 'lucide-react';
import { formatNumber } from '@/utils/format';

interface Referrer {
  source: string;
  clicks: number;
  percentage: number;
}

interface ReferrersTableProps {
  data: Referrer[];
}

export default function ReferrersTable({ data }: ReferrersTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Globe className="w-8 h-8 mx-auto mb-2 text-secondary-300" />
        <p className="text-secondary-400 text-sm">No referrer data available</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-secondary-200 dark:border-secondary-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Source</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">Clicks</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">Percentage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
            {data.map((ref, idx) => (
              <tr key={idx} className="hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-secondary-400 shrink-0" />
                    <span className="text-sm text-secondary-700 dark:text-secondary-300">{ref.source || 'Direct'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-secondary-900 dark:text-secondary-100 text-right">
                  {formatNumber(ref.clicks)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-20 bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(ref.percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-secondary-500 w-12 text-right">{ref.percentage.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
