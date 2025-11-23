
import React from 'react';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  diff?: number;
  icon: LucideIcon;
  variant?: 'blue' | 'indigo' | 'emerald' | 'rose' | 'slate' | 'gray';
  showDiff?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  diff = 0, 
  icon: Icon,
  variant = 'blue',
  showDiff = true
}) => {
  const formattedValue = new Intl.NumberFormat('vi-VN').format(value);
  const formattedDiff = new Intl.NumberFormat('vi-VN').format(Math.abs(diff));
  const isPositive = diff >= 0;

  const styles = {
    blue: {
      container: "bg-gradient-to-br from-slate-800 to-slate-900 border-white/5 text-white shadow-xl shadow-slate-200/50",
      iconBox: "bg-white/5 border-white/10",
      iconColor: "text-blue-400",
      textMuted: "text-slate-300",
      badge: "border-white/10 bg-black/20 text-slate-200",
      badgeIconPositive: "text-emerald-400",
      badgeIconNegative: "text-rose-400",
    },
    indigo: {
      container: "bg-gradient-to-br from-indigo-950 to-slate-900 border-white/5 text-white shadow-xl shadow-slate-200/50",
      iconBox: "bg-white/5 border-white/10",
      iconColor: "text-indigo-400",
      textMuted: "text-slate-300",
      badge: "border-white/10 bg-black/20 text-slate-200",
      badgeIconPositive: "text-emerald-400",
      badgeIconNegative: "text-rose-400",
    },
    emerald: {
      container: "bg-gradient-to-br from-emerald-900 to-emerald-800 border-white/5 text-white shadow-xl shadow-slate-200/50",
      iconBox: "bg-white/5 border-white/10",
      iconColor: "text-emerald-400",
      textMuted: "text-slate-300",
      badge: "border-white/10 bg-black/20 text-slate-200",
      badgeIconPositive: "text-emerald-300",
      badgeIconNegative: "text-rose-300",
    },
    rose: {
      container: "bg-gradient-to-br from-rose-900 to-rose-800 border-white/5 text-white shadow-xl shadow-slate-200/50",
      iconBox: "bg-white/5 border-white/10",
      iconColor: "text-rose-400",
      textMuted: "text-slate-300",
      badge: "border-white/10 bg-black/20 text-slate-200",
      badgeIconPositive: "text-emerald-300",
      badgeIconNegative: "text-rose-300",
    },
    slate: {
      container: "bg-gradient-to-br from-slate-900 to-slate-800 border-white/5 text-white shadow-xl shadow-slate-200/50",
      iconBox: "bg-white/5 border-white/10",
      iconColor: "text-slate-400",
      textMuted: "text-slate-300",
      badge: "border-white/10 bg-black/20 text-slate-200",
      badgeIconPositive: "text-emerald-400",
      badgeIconNegative: "text-rose-400",
    },
    gray: {
      container: "bg-white border-slate-200 text-slate-900 shadow-sm",
      iconBox: "bg-slate-50 border-slate-100",
      iconColor: "text-slate-500",
      textMuted: "text-slate-500",
      badge: "border-slate-100 bg-slate-50 text-slate-600",
      badgeIconPositive: "text-emerald-600",
      badgeIconNegative: "text-rose-600",
    }
  };

  const style = styles[variant];

  // Adjust layout for compact mode (when diff is hidden)
  const containerPadding = showDiff ? "p-6" : "p-4";
  const valueSize = showDiff ? "text-3xl" : "text-2xl";
  const iconBoxSize = showDiff ? "p-2.5" : "p-2";
  const iconSize = showDiff ? 24 : 20;

  return (
    <div className={`relative overflow-hidden rounded-2xl ${containerPadding} transition-transform hover:scale-[1.01] duration-300 border ${style.container}`}>
      {/* Decorative Background Icon */}
      <div className="absolute -right-6 -top-6 opacity-[0.03] rotate-12 pointer-events-none">
        <Icon size={140} className="text-current" />
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className={`text-sm font-medium ${style.textMuted}`}>{title}</span>
            <div className={`${valueSize} font-bold tracking-tight text-inherit`}>{formattedValue}</div>
          </div>
          <div className={`rounded-xl ${iconBoxSize} backdrop-blur-md border shadow-inner ${style.iconBox}`}>
             <Icon size={iconSize} className={style.iconColor} />
          </div>
        </div>

        {showDiff && (
          <div className="mt-6 flex items-center">
              <div className={`inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium border backdrop-blur-md shadow-sm ${style.badge}`}>
                {isPositive ? <TrendingUp className={`mr-1 h-3.5 w-3.5 ${style.badgeIconPositive}`} /> : <TrendingDown className={`mr-1 h-3.5 w-3.5 ${style.badgeIconNegative}`} />}
                <span className="ml-1 font-semibold">
                  {isPositive ? '+' : '-'}{formattedDiff}
                </span>
              </div>
              <span className={`ml-2 text-xs font-medium ${style.textMuted}`}>so với trước</span>
          </div>
        )}
      </div>
    </div>
  );
};
