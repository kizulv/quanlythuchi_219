
import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { Transaction } from '../types';

interface DashboardChartsProps {
  transactions: Transaction[];
  prevTransactions: Transaction[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ transactions, prevTransactions }) => {
  
  // Process data for charts
  const chartData = useMemo(() => {
    return transactions.map((t) => {
      // Extract day from date (e.g. "02/11/2025" -> "02")
      const day = t.date.split('/')[0];
      
      // Find corresponding transaction in previous month with same day
      // Note: This simple matching assumes consistent dates (2, 4, 6...).
      // In a real app, you might need more complex logic for variable schedules.
      const prevTrans = prevTransactions.find(pt => pt.date.startsWith(day + '/'));
      
      const prevBalance = prevTrans ? prevTrans.totalBalance : 0;

      // Values are already in "thousands", so just use them directly
      return {
        name: t.date.substring(0, 5), // Show "DD/MM"
        fullDate: t.date,
        balance: t.totalBalance,
        prevBalance: prevBalance,
      };
    });
  }, [transactions, prevTransactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg text-xs">
          <p className="font-bold mb-1">{payload[0]?.payload.fullDate}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {new Intl.NumberFormat('vi-VN').format(entry.value)} (nghìn)
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      
      {/* Left Chart: Daily Balance Bar Chart */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Số dư theo ngày</h3>
          <p className="text-sm text-slate-500">Tổng dư (Thu - Chi) (Đơn vị: nghìn đồng)</p>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${new Intl.NumberFormat('vi-VN').format(value)}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar 
                dataKey="balance" 
                name="Số dư" 
                fill="#0f172a" 
                radius={[4, 4, 0, 0]} 
                barSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right Chart: Trend vs Last Month */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Xu hướng tăng trưởng</h3>
            <p className="text-sm text-slate-500">So sánh tương ứng với chuyến tháng trước</p>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
              Tháng này
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-slate-200 mr-2"></span>
              Tháng trước
            </div>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${new Intl.NumberFormat('vi-VN').format(value)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              
              <Area 
                type="monotone" 
                dataKey="prevBalance" 
                name="Tháng trước" 
                stroke="#cbd5e1" 
                fill="transparent" 
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                name="Tháng này" 
                stroke="#8b5cf6" 
                fillOpacity={1} 
                fill="url(#colorBalance)" 
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
