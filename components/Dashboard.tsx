
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
  Settings,
  Bus,
  TrendingUp,
  Wallet,
  Users,
  Bell
} from 'lucide-react';
import { Transaction } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { StatsCard } from './StatsCard';
import { TransactionDetailModal } from './TransactionDetailModal';
import { DashboardCharts } from './DashboardCharts';
import { getTransactionsByMonth } from '../data/mockData'; // Ensure correct relative path
import { exportToExcel } from '../services/excelService';
import { analyzeFinancialData } from '../services/geminiService';

export const Dashboard: React.FC = () => {
  // Initialize to November 2025 as requested where mock data exists
  const [currentDate, setCurrentDate] = useState(new Date(2025, 10, 1)); // Month is 0-indexed (10 = Nov)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([]); // Previous month data
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Month Picker State
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  
  // Modal State
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    // Simulate API call latency to mimic NextJS SSR/Server Action feel
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

      // Fetch from our "Mock Database" or API
      const currentData = getTransactionsByMonth(month, year);
      const prevData = getTransactionsByMonth(prevMonth, prevYear);

      setTransactions(currentData);
      setPrevTransactions(prevData);
      setIsLoading(false);
      // Clear previous analysis when month changes
      setAiAnalysis('');
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

  // Calculate Statistics based on FULL data
  const stats = useMemo(() => {
    const totalRemaining = transactions.reduce((acc, t) => acc + t.remainingBalance, 0);
    const totalRevenue = transactions.reduce((acc, t) => acc + t.revenue, 0);
    return {
      totalRemaining,
      totalRevenue,
      splitByFour: totalRemaining / 4 // Assuming default split logic
    };
  }, [transactions]);

  // Calculate Statistics for PREVIOUS month
  const prevStats = useMemo(() => {
    const totalRemaining = prevTransactions.reduce((acc, t) => acc + t.remainingBalance, 0);
    return {
      totalRemaining,
      splitByFour: totalRemaining / 4
    };
  }, [prevTransactions]);

  const diffTotal = stats.totalRemaining - prevStats.totalRemaining;

  const formatCurrency = (val: number) => {
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
    const dataToExport = searchTerm ? filteredTransactions : transactions;
    exportToExcel(dataToExport, monthLabel);
  };
  
  const handleAiAnalyze = async () => {
    if (transactions.length === 0) return;
    setIsAnalyzing(true);
    const result = await analyzeFinancialData(transactions);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  // Generate last 12 months for dropdown, anchored at Nov 2025
  const last12Months = useMemo(() => {
    const months = [];
    const anchorDate = new Date(2025, 10, 1); 
    
    for (let i = 0; i < 12; i++) {
      const d = new Date(anchorDate);
      d.setMonth(anchorDate.getMonth() - i);
      months.push(d);
    }
    return months.sort((a, b) => a.getTime() - b.getTime());
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 fixed h-full z-20 left-0 top-0 shadow-sm">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="p-2 bg-slate-900 rounded-lg text-white shadow-md">
            <Bus size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">BusManager</h1>
            <p className="text-xs text-slate-500 font-medium">Pro Edition</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Menu chính</div>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-100 text-slate-900 font-medium transition-colors">
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <FileText size={18} />
            Báo cáo tài chính
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <Users size={18} />
            Quản lý nhân sự
          </button>
          
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-6 mb-3 px-2">Hệ thống</div>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <Settings size={18} />
            Cấu hình
          </button>
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
              AD
            </div>
            <div>
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-slate-500">admin@buspro.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 w-full bg-slate-50/50">
        {/* Top Navigation */}
        <header className="bg-white border-b border-slate-200 h-16 px-8 flex items-center justify-between sticky top-0 z-10">
           <div className="flex items-center gap-4">
              <span className="text-slate-400 md:hidden">
                <Bus size={24}/>
              </span>
              <h2 className="font-semibold text-slate-800">Tổng quan thu chi / Xe 25F-002.19</h2>
           </div>
           <div className="flex items-center gap-4">
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative">
                 <Bell size={20} />
                 <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
           </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Control Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div className="flex items-center bg-white border rounded-lg shadow-sm p-1">
                 <button 
                    onClick={() => changeMonth(-1)}
                    className="p-2 hover:bg-slate-50 rounded text-slate-500"
                 >
                   <ChevronLeft size={18} />
                 </button>
                 
                 <div className="relative">
                   <button 
                      onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                      className="px-4 py-1 text-sm font-semibold min-w-[140px] text-center flex items-center gap-2"
                   >
                      <Calendar size={16} className="text-slate-400"/>
                      {`Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}`}
                      <ChevronDown size={14} className="text-slate-400"/>
                   </button>
                   
                   {isMonthPickerOpen && (
                     <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsMonthPickerOpen(false)}/>
                      <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-[280px] bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-30">
                        <div className="grid grid-cols-3 gap-2">
                          {last12Months.map((date, idx) => {
                            const isSelected = date.getMonth() === currentDate.getMonth();
                            return (
                              <button
                                key={idx}
                                onClick={() => selectMonth(date)}
                                className={`py-2 rounded text-xs font-medium border ${isSelected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-transparent hover:bg-slate-50'}`}
                              >
                                Th {date.getMonth() + 1}/{date.getFullYear().toString().substr(2)}
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
                    className="p-2 hover:bg-slate-50 rounded text-slate-500"
                 >
                   <ChevronRight size={18} />
                 </button>
             </div>

             <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="bg-white"
                  onClick={handleAiAnalyze}
                  disabled={isAnalyzing}
                  icon={isAnalyzing ? <TrendingUp className="animate-pulse" size={16} /> : <TrendingUp size={16}/>}
                >
                  {isAnalyzing ? "Đang phân tích..." : "Phân tích AI"}
                </Button>
                <Button 
                  variant="outline" 
                  className="bg-white"
                  onClick={handleExportExcel}
                  icon={<Download size={16}/>}
                >
                  Xuất Excel
                </Button>
                <Button 
                   variant="primary" 
                   className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20"
                   icon={<CreditCard size={16}/>}
                >
                   Thêm giao dịch
                </Button>
             </div>
          </div>

          {/* AI Analysis Result */}
          {aiAnalysis && (
             <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 flex gap-4 animate-in fade-in slide-in-from-top-4">
                <div className="p-2.5 bg-white rounded-lg shadow-sm h-fit text-indigo-600">
                  <TrendingUp size={20} />
                </div>
                <div className="flex-1">
                   <h3 className="font-semibold text-indigo-900 mb-1">Góc nhìn chuyên gia (AI)</h3>
                   <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{aiAnalysis}</p>
                </div>
                <button onClick={() => setAiAnalysis('')} className="text-slate-400 hover:text-indigo-600 h-fit">
                   <ChevronDown size={18} className="rotate-180"/>
                </button>
             </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Wallet size={20}/>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">+12%</span>
               </div>
               <p className="text-slate-500 text-sm font-medium">Tổng doanh thu</p>
               <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(stats.totalRevenue)}</h3>
            </div>
            
            <StatsCard 
              title="Tổng dư (Lãi gộp)" 
              value={stats.totalRemaining} 
              diff={diffTotal} 
            />
            
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
               <div className="relative z-10">
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                      <CreditCard size={20}/>
                    </div>
                 </div>
                 <p className="text-slate-500 text-sm font-medium">Thực nhận về tay</p>
                 <h3 className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(stats.splitByFour)}</h3>
                 <p className="text-xs text-slate-400 mt-2">Sau khi chia & trừ chi phí riêng</p>
               </div>
            </div>
          </div>

          {/* Charts Area */}
          {!isLoading && transactions.length > 0 && (
            <div className="animate-in fade-in zoom-in-95">
              <DashboardCharts 
                transactions={transactions} 
                prevTransactions={prevTransactions}
              />
            </div>
          )}

          {/* Transactions Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
               <h3 className="font-bold text-slate-800">Chi tiết các chuyến xe</h3>
               <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm..." 
                    className="pl-9 pr-4 py-2 w-full text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-4 w-[60px] text-center">Loại</th>
                    <th className="py-4 px-4">Ngày</th>
                    <th className="py-4 px-4 text-right">Tổng thu</th>
                    <th className="py-4 px-4 text-right">Chi chung</th>
                    <th className="py-4 px-4 text-right font-bold text-slate-700">Tổng dư</th>
                    <th className="py-4 px-4 text-right">Chi riêng</th>
                    <th className="py-4 px-4 text-right font-bold text-emerald-600 bg-emerald-50/30">Thực nhận</th>
                    <th className="py-4 px-4">Ghi chú</th>
                    <th className="py-4 px-4 text-right">Trạng thái</th>
                    <th className="py-4 px-4 text-center w-[50px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="p-12 text-center">
                         <div className="flex justify-center items-center gap-2 text-slate-400">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                         </div>
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                       <td colSpan={10} className="p-12 text-center text-slate-400">
                          Không tìm thấy dữ liệu.
                       </td>
                    </tr>
                  ) : filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 py-3 align-middle text-center">
                         <div className={`w-6 h-6 rounded mx-auto flex items-center justify-center text-[10px] font-bold ${t.isShared ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'}`}>
                            {t.isShared ? '2X' : '1X'}
                         </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{t.date}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(t.revenue)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(t.sharedExpense)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">{formatCurrency(t.totalBalance)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(t.privateExpense)}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 bg-emerald-50/30">{formatCurrency(t.remainingBalance)}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={t.note}>
                        {t.note || <span className="text-slate-300 italic">--</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge status={t.status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                         <button 
                           onClick={() => handleOpenDetail(t)}
                           className="p-1.5 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-md text-slate-400 hover:text-slate-700 transition-all"
                         >
                            <MoreVertical size={16} />
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
               <span>Hiển thị {filteredTransactions.length} bản ghi</span>
               <span>Dữ liệu được cập nhật realtime</span>
            </div>
          </div>
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
