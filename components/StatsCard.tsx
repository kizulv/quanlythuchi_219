
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  diff: number;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, diff }) => {
  const formattedValue = new Intl.NumberFormat('vi-VN').format(value);
  const formattedDiff = new Intl.NumberFormat('vi-VN').format(Math.abs(diff));
  const isPositive = diff >= 0;

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between">
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isPositive ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
          <span className="ml-1">
            {isPositive ? '+' : '-'}{formattedDiff}
          </span>
        </div>
      </div>
      <div className="text-3xl font-bold">{formattedValue}</div>
    </div>
  );
};
