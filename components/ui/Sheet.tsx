
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  width?: string;
}

export const Sheet: React.FC<SheetProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  description,
  children, 
  footer,
  className = '',
  width = 'max-w-md'
}) => {
  // Prevent scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Sheet Panel */}
      <div className={`
        relative z-50 w-full ${width} h-full bg-white shadow-2xl 
        border-l border-slate-200 flex flex-col
        animate-in slide-in-from-right duration-300
        ${className}
      `}>
        {/* Header */}
        <div className="flex flex-col px-6 pt-4 pb-1 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button 
              onClick={onClose}
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          {description && (
            <p className="text-sm text-slate-500">{description}</p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>

        {/* Footer (Floating/Sticky) */}
        {footer && (
          <div className="p-4 border-t border-slate-100 bg-white shrink-0 z-10 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
