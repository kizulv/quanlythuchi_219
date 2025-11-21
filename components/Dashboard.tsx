import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  CreditCard, 
  MoreVertical, 
  Calendar, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  LayoutDashboard, 
  FileText, 
  Settings
} from 'lucide-react';
import { Transaction } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { StatsCard } from './StatsCard';
import { TransactionDetailModal } from './TransactionDetailModal';
import { DashboardCharts } from './DashboardCharts';
import { getTransactionsByMonth } from '../data/mockData';
import { exportToExcel } from '../services/excelService';

export const Dashboard: React.FC = () => {
  // Initialize to November 2025 as requested
  const [currentDate, setCurrentDate] = useState(new Date(2025, 10, 1)); // Month is 0-indexed (10 = Nov)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([]); // Previous month data
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Month Picker State
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  
  // Modal State
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    // Simulate API call latency
    setTimeout(() => {
      const month = currentDate.getMonth() + 1; // 1-12
      const year = currentDate.getFullYear();
      
      // Calculate Previous Month
      let prevMonth = month - 1;
      let prevYear = year;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = year - 1;
      }

      // Fetch from our "Mock Database"
      const currentData = getTransactionsByMonth(month, year);
      const prevData = getTransactionsByMonth(prevMonth, prevYear);

      setTransactions(currentData);
      setPrevTransactions(prevData);
      setIsLoading(false);
    }, 300);
  }, [currentDate]);

  // Filter transactions based on search term (Only for Table display)
  const filteredTransactions = useMemo(() => {
    const lowerTerm = searchTerm.toLowerCase();
    return transactions.filter(t => 
      t.note.toLowerCase().includes(lowerTerm) || 
      t.date.includes(searchTerm)
    );
  }, [transactions, searchTerm]);

  // Calculate Statistics based on FULL data (Not filtered)
  // Requirement update: 
  // 1. "Tổng dư" = Sum of "Dư còn lại" (remainingBalance)
  // 2. "Dư sau chia" = "Tổng dư" / 4
  const stats = useMemo(() => {
    const totalRemaining = transactions.reduce((acc, t) => acc + t.remainingBalance, 0);
    return {
      totalRemaining,
      splitByFour: totalRemaining / 4
    };
  }, [transactions]);

  // Calculate Statistics for PREVIOUS month (Full) with same logic
  const prevStats = useMemo(() => {
    const totalRemaining = prevTransactions.reduce((acc, t) => acc + t.remainingBalance, 0);
    return {
      totalRemaining,
      splitByFour: totalRemaining / 4
    };
  }, [prevTransactions]);

  const diffTotal = stats.totalRemaining - prevStats.totalRemaining;
  const diffSplit = stats.splitByFour - prevStats.splitByFour;

  const formatCurrency = (val: number) => {
    // Value stored is already in 'thousands' unit (e.g. 13400 is 13.400.000)
    // We just need to format it with separators.
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  const handleOpenDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = (updatedTransaction: Transaction) => {
    setTransactions(transactions.map(t => 
      t.id === updatedTransaction.id ? updatedTransaction : t
    ));
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  const selectMonth = (date: Date) => {
    setCurrentDate(date);
    setIsMonthPickerOpen(false);
  };
  
  const handleExportExcel = () => {
    if (transactions.length === 0) {
      alert("Không có dữ liệu để xuất!");
      return;
    }
    const monthLabel = `${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
    // Export filtered transactions if search is active, otherwise all transactions
    const dataToExport = searchTerm ? filteredTransactions : transactions;
    exportToExcel(dataToExport, monthLabel);
  };

  // Generate last 12 months for dropdown, anchored at Nov 2025
  const last12Months = useMemo(() => {
    const months = [];
    // Anchor at Nov 2025
    const anchorDate = new Date(2025, 10, 1); 
    
    for (let i = 0; i < 12; i++) {
      const d = new Date(anchorDate);
      d.setMonth(anchorDate.getMonth() - i);
      months.push(d);
    }
    // Sort chronologically for the calendar view
    return months.sort((a, b) => a.getTime() - b.getTime());
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">
      {/* Sidebar (Simplified for visual context) */}
      <aside className="hidden md:flex w-16 flex-col items-center py-4 border-r bg-white space-y-4 fixed h-full z-10 left-0 top-0">
        <div className="p-2 bg-slate-900 rounded-lg text-white">
          <LayoutDashboard size={20} />
        </div>
        <div className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer">
          <FileText size={20} />
        </div>
        <div className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer">
          <Settings size={20} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-16 w-full">
        {/* Removed max-w-[1600px] for full width layout */}
        <div className="w-full p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
               <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                  <ChevronLeft size={16} />
               </Button>
               <h1 className="text-xl font-semibold">Báo cáo thu chi xe 25F-002.19</h1>
            </div>
            <div className="flex space-x-2 items-center">
               <Button 
                  variant="outline" 
                  size="md" 
                  icon={<Download size={14}/>}
                  onClick={handleExportExcel}
               >
                  Xuất Excel
               </Button>
               
               <div className="flex items-center bg-white border rounded-md shadow-sm relative">
                 <button 
                    onClick={() => changeMonth(-1)}
                    className="p-2.5 hover:bg-slate-100 border-r"
                    title="Tháng trước"
                 >
                   <ChevronLeft size={14} />
                 </button>
                 
                 <div className="relative">
                   <button 
                      onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                      className="px-4 py-2 text-sm font-medium min-w-[130px] text-center flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                   >
                      <Calendar size={14}/>
                      {`T${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`}
                      <ChevronDown size={14} className={`transition-transform ${isMonthPickerOpen ? 'rotate-180' : ''}`}/>
                   </button>
                   
                   {/* Calendar-like Month Picker */}
                   {isMonthPickerOpen && (
                     <>
                      <div 
                        className="fixed inset-0 z-20" 
                        onClick={() => setIsMonthPickerOpen(false)}
                      />
                      <div className="absolute top-full mt-1 right-0 w-[300px] bg-white rounded-lg shadow-xl border border-slate-200 p-4 z-30 animate-in fade-in zoom-in-95 duration-200">
                        <div className="text-sm font-semibold text-slate-500 mb-3 px-1">
                          Chọn tháng báo cáo
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {last12Months.map((date, idx) => {
                            const isSelected = date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
                            return (
                              <button
                                key={idx}
                                onClick={() => selectMonth(date)}
                                className={`
                                  flex flex-col items-center justify-center py-2 rounded-md text-xs transition-all
                                  ${isSelected 
                                    ? 'bg-slate-900 text-white shadow-md' 
                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                                  }
                                `}
                              >
                                <span className="font-bold text-sm">Tháng {date.getMonth() + 1}</span>
                                <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>{date.getFullYear()}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                     </>
                   )}
                 </div>

                 <button 
                    onClick={() => changeMonth(1)}
                    className="p-2.5 hover:bg-slate-100 border-l"
                    title="Tháng sau"
                 >
                   <ChevronRight size={14} />
                 </button>
               </div>
            </div>
          </div>

          {/* Stats Cards - Uses FULL stats regardless of search */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <StatsCard 
              title="Tổng dư" 
              value={stats.totalRemaining} 
              diff={diffTotal} 
            />
            <StatsCard 
              title="Dư sau chia" 
              value={stats.splitByFour} 
              diff={diffSplit} 
            />
          </div>

          {/* Action Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-5 gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm ghi chú hoặc ngày..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9"
              />
            </div>
            
            <div className="flex items-center space-x-3 w-full md:w-auto">
               <Button variant="outline" size="md" icon={<Plus size={16}/>}>
                  Thêm sổ thu chi
               </Button>
               <Button variant="primary" size="md" icon={<CreditCard size={16}/>}>
                  Tạo thanh toán
               </Button>
            </div>
          </div>

          {/* Table - Uses FILTERED transactions */}
          <div className="rounded-lg border bg-white overflow-hidden shadow-sm flex flex-col min-h-[400px]">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm text-left whitespace-nowrap table-fixed">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b">
                  <tr>
                    <th className="h-12 px-2 align-middle w-[70px] text-center" title="Tích chọn nếu đi 2 xe">
                       Đi 2 xe
                    </th>
                    <th className="h-12 px-2 align-middle w-[110px] text-center">Ngày</th>
                    <th className="h-12 px-2 align-middle text-right w-[100px]">Tổng thu</th>
                    <th className="h-12 px-2 align-middle text-right w-[100px]">Chi chung</th>
                    <th className="h-12 px-2 align-middle text-right font-bold w-[100px]">Tổng dư</th>
                    <th className="h-12 px-2 align-middle text-right font-bold w-[100px]">Dư chia</th>
                    <th className="h-12 px-2 align-middle text-right w-[100px]">Chi riêng</th>
                    <th className="h-12 px-2 align-middle text-right font-bold w-[100px]">Dư còn lại</th>
                    <th className="h-12 px-2 align-middle text-center w-[90px]"></th>
                    <th className="h-12 px-4 align-middle">Ghi chú</th>
                    <th className="h-12 px-2 align-middle text-right w-[140px]">Trạng thái</th>
                    <th className="h-12 px-2 align-middle w-[60px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={12} className="p-6 text-center text-muted-foreground">Đang tải dữ liệu...</td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                       <td colSpan={12} className="p-10 text-center text-muted-foreground">
                          Không tìm thấy dữ liệu phù hợp với "{searchTerm}" trong tháng {currentDate.getMonth() + 1}
                       </td>
                    </tr>
                  ) : filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-2 py-3 align-middle text-center">
                         <input 
                          type="checkbox" 
                          checked={t.isShared} 
                          disabled
                          className="w-4 h-4 rounded border-gray-300 text-slate-900 accent-slate-900 focus:ring-slate-900 cursor-not-allowed disabled:opacity-100" 
                          title={t.isShared ? "Đi 2 xe" : "Đi 1 xe (Dư chia / 2)"}
                        />
                      </td>
                      <td className="px-2 py-3 align-middle font-medium text-center text-slate-900">{t.date}</td>
                      <td className="px-2 py-3 align-middle text-right text-slate-600">{formatCurrency(t.revenue)}</td>
                      <td className="px-2 py-3 align-middle text-right text-slate-600">{formatCurrency(t.sharedExpense)}</td>
                      <td className="px-2 py-3 align-middle text-right font-bold text-slate-900">{formatCurrency(t.totalBalance)}</td>
                      <td className="px-2 py-3 align-middle text-right font-bold text-slate-900">{formatCurrency(t.splitBalance)}</td>
                      <td className="px-2 py-3 align-middle text-right text-slate-600">{formatCurrency(t.privateExpense)}</td>
                      <td className="px-2 py-3 align-middle text-right font-bold text-slate-900">{formatCurrency(t.remainingBalance)}</td>
                      <td className="px-2 py-3 align-middle text-center">
                        <button 
                          onClick={() => handleOpenDetail(t)}
                          className="text-xs font-semibold text-slate-900 hover:text-blue-600"
                        >
                          Chi tiết
                        </button>
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-600 truncate" title={t.note}>
                        {t.note}
                      </td>
                      <td className="px-2 py-3 align-middle text-right">
                        <Badge status={t.status} />
                      </td>
                      <td className="px-2 py-3 align-middle text-right">
                         <button className="text-slate-400 hover:text-slate-600 p-1">
                            <MoreVertical size={16} />
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="border-t p-4 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
               <span className="font-medium italic">
                 * Đơn vị tính: Nghìn đồng (Ví dụ: 13.400 = 13.400.000đ)
               </span>
               <span>
                 Hiển thị: {filteredTransactions.length} / {transactions.length} bản ghi
               </span>
            </div>
          </div>

          {/* Charts Section - Pass FULL transactions so charts remain static during search */}
          {!isLoading && transactions.length > 0 && (
            <DashboardCharts 
              transactions={transactions} 
              prevTransactions={prevTransactions}
            />
          )}
        </div>
      </main>
      
      {/* Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailModal 
          transaction={selectedTransaction}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTransaction}
        />
      )}
    </div>
  );
};