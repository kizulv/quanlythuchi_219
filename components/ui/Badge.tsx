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
        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          Đã đối soát
        </span>
      );
    case TransactionStatus.AI_GENERATED:
      return (
        <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-700">
          <Sparkles className="mr-1.5 h-4 w-4" />
          Tạo bởi AI
        </span>
      );
    case TransactionStatus.PAID:
      return (
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-semibold text-gray-600">
          <CircleDollarSign className="mr-1.5 h-4 w-4" />
          Đã thanh toán
        </span>
      );
    default:
      return null;
  }
};