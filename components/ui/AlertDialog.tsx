
import React from 'react';
import { Button } from './Button';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  cancelText?: string;
  confirmText?: string;
  variant?: 'default' | 'destructive';
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  cancelText = "Hủy",
  confirmText = "Tiếp tục",
  variant = 'default'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
        onClick={onClose}
      />
      
      {/* Dialog Content */}
      <div className="relative z-[110] w-full max-w-md scale-100 transform gap-4 rounded-lg border border-slate-200 bg-white p-6 text-left shadow-lg transition-all animate-in fade-in zoom-in-95 slide-in-from-bottom-10 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200 sm:rounded-lg md:w-full">
        <div className="flex flex-col space-y-2 text-center sm:text-left">
          <h3 className="text-lg font-semibold leading-none tracking-tight text-slate-900">
            {title}
          </h3>
          <p className="text-sm text-slate-500">
            {description}
          </p>
        </div>
        
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="mt-2 sm:mt-0 h-10"
          >
            {cancelText}
          </Button>
          <Button 
            variant="primary" 
            className={`h-10 ${variant === 'destructive' ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm' : ''}`}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
