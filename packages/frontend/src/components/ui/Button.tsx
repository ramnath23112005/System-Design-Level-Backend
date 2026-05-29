import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants = {
  primary: 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-sm',
  secondary: 'bg-secondary-100 dark:bg-secondary-700 hover:bg-secondary-200 dark:hover:bg-secondary-600 text-secondary-700 dark:text-secondary-200',
  danger: 'bg-danger-600 hover:bg-danger-700 active:bg-danger-800 text-white shadow-sm',
  ghost: 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800',
  outline: 'border-2 border-primary-500 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-secondary-900 disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
