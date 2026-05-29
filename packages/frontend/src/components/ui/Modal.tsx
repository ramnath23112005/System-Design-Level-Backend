import { useEffect, useCallback, ReactNode } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: ReactNode;
  footer?: ReactNode;
  showCloseButton?: boolean;
  closeOnOverlay?: boolean;
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-2xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  showCloseButton = true,
  closeOnOverlay = true,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnOverlay ? onClose : undefined}
      />
      <div
        className={clsx(
          'relative w-full bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl border border-secondary-200 dark:border-secondary-700 animate-slide-up',
          sizes[size]
        )}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
            {title && <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">{title}</h2>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-secondary-200 dark:border-secondary-700 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
