import React from "react";
import { TransactionStatus } from "../../types";
import { Check, Sparkles, Wallet } from "lucide-react";

interface BadgeProps {
  status: TransactionStatus;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  // Base classes for common shape and size
  // Adjusted padding for mobile icon-only view
  const baseClasses =
    "inline-flex items-center justify-center rounded-full border px-1.5 md:px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors h-6 md:h-auto";

  switch (status) {
    case TransactionStatus.VERIFIED:
      return (
        <span
          className={`${baseClasses} border-green-200 bg-white text-green-600`}
          title="Đã đối soát"
        >
          <div className="rounded-full bg-green-600 p-[1px]">
            <Check className="h-2 w-2 text-white" strokeWidth={4} />
          </div>
          <span className="hidden md:inline ml-1.5">Đã đối soát</span>
        </span>
      );
    case TransactionStatus.AI_GENERATED:
      return (
        <span
          className={`${baseClasses} border-purple-200 bg-white text-purple-600`}
          title="Tạo bởi AI"
        >
          <Sparkles className="h-3 w-3" />
          <span className="hidden md:inline ml-1.5">Tạo bởi AI</span>
        </span>
      );
    case TransactionStatus.PAID:
      return (
        <span
          className={`${baseClasses} border-slate-200 bg-white text-slate-600`}
          title="Đã thanh toán"
        >
          <Wallet className="h-3 w-3" />
          <span className="hidden md:inline ml-1.5">Đã thanh toán</span>
        </span>
      );
    default:
      return null;
  }
};
