import React from 'react';
import { TransactionStatus } from '../../types';
import { Check, Sparkles, Wallet } from 'lucide-react';

interface BadgeProps {
  status: TransactionStatus;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  // Base classes for common shape and size
  const baseClasses = "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors";

  switch (status) {
    case TransactionStatus.VERIFIED:
      return (
        <span className={`${baseClasses} border-green-200 bg-white text-green-600`}>
          <div className="mr-1 rounded-full bg-green-600 p-[1px]">
            <Check className="h-2 w-2 text-white" strokeWidth={4} />
          </div>
          Đã đối soát
        </span>
      );
    case TransactionStatus.AI_GENERATED:
      return (
        <span className={`${baseClasses} border-purple-200 bg-white text-purple-600`}>
          <Sparkles className="mr-1 h-3 w-3" />
          Tạo bởi AI
        </span>
      );
    case TransactionStatus.PAID:
      return (
        <span className={`${baseClasses} border-slate-200 bg-white text-slate-600`}>
          <Wallet className="mr-1 h-3 w-3" />
          Đã thanh toán
        </span>
      );
    default:
      return null;
  }
};