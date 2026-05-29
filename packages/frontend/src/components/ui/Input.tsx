import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, helperText, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full px-4 py-2.5 bg-white dark:bg-secondary-900 border rounded-lg text-secondary-900 dark:text-secondary-100 placeholder-secondary-400 dark:placeholder-secondary-500 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:border-transparent',
              error
                ? 'border-danger-500 focus:ring-danger-500'
                : 'border-secondary-300 dark:border-secondary-600 focus:ring-primary-500',
              icon && 'pl-10',
              props.disabled && 'opacity-50 cursor-not-allowed bg-secondary-50 dark:bg-secondary-800',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-sm text-danger-500">{error}</p>}
        {helperText && !error && <p className="text-sm text-secondary-400">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
