import React from 'react';
import { TransactionStatus } from '../../types';
import { CheckCircle2, Sparkles, CircleDollarSign } from 'lucide-react';

interface BadgeProps {
  status: TransactionStatus;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  switch (status) {
    case TransactionStatus.VERIFIED:
      return (
        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 whitespace-nowrap">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Đã đối soát
        </span>
      );
    case TransactionStatus.AI_GENERATED:
      return (
        <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 whitespace-nowrap">
          <Sparkles className="mr-1 h-3 w-3" />
          Tạo bởi AI
        </span>
      );
    case TransactionStatus.PAID:
      return (
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 whitespace-nowrap">
          <CircleDollarSign className="mr-1 h-3 w-3" />
          Đã thanh toán
        </span>
      );
    default:
      return null;
  }
};