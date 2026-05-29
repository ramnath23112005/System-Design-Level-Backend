import { ReactNode } from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; isUp: boolean };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  subtitle?: string;
  onClick?: () => void;
}

const variantStyles = {
  default: 'bg-white dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700',
  primary: 'bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-800',
  success: 'bg-success-50 dark:bg-success-950 border-success-200 dark:border-success-800',
  warning: 'bg-warning-50 dark:bg-warning-950 border-warning-200 dark:border-warning-800',
  danger: 'bg-danger-50 dark:bg-danger-950 border-danger-200 dark:border-danger-800',
};

const iconVariantStyles = {
  default: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
  primary: 'bg-primary-200 dark:bg-primary-800 text-primary-700 dark:text-primary-300',
  success: 'bg-success-200 dark:bg-success-800 text-success-700 dark:text-success-300',
  warning: 'bg-warning-200 dark:bg-warning-800 text-warning-700 dark:text-warning-300',
  danger: 'bg-danger-200 dark:bg-danger-800 text-danger-700 dark:text-danger-300',
};

export default function StatCard({ icon, label, value, trend, variant = 'default', subtitle, onClick }: StatCardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border p-5 transition-all duration-200',
        variantStyles[variant],
        onClick && 'cursor-pointer hover:shadow-md'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className={clsx('p-2.5 rounded-lg', iconVariantStyles[variant])}>
          {icon}
        </div>
        {trend && (
          <div className={clsx(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            trend.isUp ? 'text-success-600 bg-success-50 dark:bg-success-900/20' : 'text-danger-600 bg-danger-50 dark:bg-danger-900/20'
          )}>
            {trend.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-secondary-500 dark:text-secondary-400">{label}</p>
        <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-secondary-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
