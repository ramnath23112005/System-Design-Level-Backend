import clsx from 'clsx';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variants = {
  default: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300',
  success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
  danger: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
  info: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  purple: 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export default function Badge({ variant = 'default', size = 'sm', children, className, dot }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full font-medium', variants[variant], sizes[size], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
