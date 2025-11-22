
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
  Trash2,
  Wallet,
  Bus,
  CheckSquare
} from 'lucide-react';
import { Transaction, TransactionStatus } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { StatsCard } from './StatsCard';
import { TransactionDetailModal } from './TransactionDetailModal';
import { DashboardCharts } from './DashboardCharts';
import { exportToExcel } from '../services/excelService';
import { db } from '../services/database';
import { ReconciliationSheet } from './ReconciliationSheet';
import { PaymentModal } from './PaymentModal';
import { toast } from 'sonner';

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

  // Sheet State
  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Sort Helper: Sort by date ascending
      const sortFn = (a: Transaction, b: Transaction) => {
        const [da, ma, ya] = a.date.split('/').map(Number);
        const [db, mb, yb] = b.date.split('/').map(Number);
        return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
      };

      // Logic: If searching, search GLOBAL. If not, get BY PAYMENT CYCLE.
      if (searchTerm.trim()) {
        const searchResults = await db.search(searchTerm);
        setTransactions(searchResults.sort(sortFn));
        // No comparison for search
        setPrevTransactions([]);
      } else {
        const month = currentDate.getMonth() + 1; // 1-12
        const year = currentDate.getFullYear();
        
        // Calculate Previous Month
        let prevMonth = month - 1;
        let prevYear = year;
        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear = year - 1;
        }

        // Fetch from Database Service using getCycleData
        // false for strict param on current month allows it to fallback to "Open Items" if no paid items exist
        const currentData = await db.getCycleData(month, year, false); 
        
        // For comparison, we want strictly the previous cycle's data
        // However, if the previous cycle doesn't exist (e.g. too far back), it returns empty.
        const prevData = await db.getCycleData(prevMonth, prevYear, false);

        setTransactions(currentData.sort(sortFn));
        setPrevTransactions(prevData);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search to avoid too many requests while typing
    const timer = setTimeout(() => {
      fetchData();
    }, 400);

    return () => clearTimeout(timer);
  }, [currentDate, searchTerm]);


  const handleOpenPaymentModal = () => {
    if (transactions.length === 0) {
      toast.error("Không có dữ liệu để tạo thanh toán.");
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (selectedIds: string[], month: number, year: number) => {
    try {
      await db.markAsPaid(selectedIds, month, year);
      toast.success(`Đã tạo thanh toán cho ${selectedIds.length} bản ghi!`);
      setIsPaymentModalOpen(false);
      await fetchData(); // Reload to reflect changes
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi xảy ra khi tạo thanh toán.");
    }
  };

  // Stats Calculation: Based directly on the loaded transactions (which are already filtered by Cycle)
  const stats = useMemo(() => {
    const totalRemaining = transactions.reduce((acc, t) => acc + t.remainingBalance, 0);
    return {
      totalRemaining,
      splitByFour: totalRemaining / 4 // Or logic for split
    };
  }, [transactions]);

  const prevStats = useMemo(() => {
    const totalRemaining = prevTransactions.reduce((acc, t) => acc + t.remainingBalance, 0);
    return {
      totalRemaining,
      splitByFour: totalRemaining / 4
    };
  }, [prevTransactions]);

  // Only show difference if NOT searching
  const isSearching = searchTerm.trim().length > 0;
  const diffTotal = isSearching ? 0 : stats.totalRemaining - prevStats.totalRemaining;
  const diffSplit = isSearching ? 0 : stats.splitByFour - prevStats.splitByFour;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  const handleOpenDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleAddTransaction = () => {
    const today = new Date();
    const dayStr = today.getDate().toString().padStart(2, '0');
    const monthStr = (today.getMonth() + 1).toString().padStart(2, '0');
    const yearStr = today.getFullYear();
    
    const newTransaction: Transaction = {
      id: '',
      date: `${dayStr}/${monthStr}/${yearStr}`,
      paymentMonth: undefined, // New items are unpaid by default
      revenue: 0,
      sharedExpense: 0,
      totalBalance: 0,
      splitBalance: 0,
      privateExpense: 0,
      remainingBalance: 0,
      note: '',
      status: TransactionStatus.VERIFIED,
      details: '',
      isShared: false,
      breakdown: {
        revenueDown: 0,
        revenueUp: 0,
        revenueOther: 0,
        expenseFuel: 0,
        expenseFixed: 0,
        expensePolice: 0,
        expenseRepair: 0,
        expenseOther: 0,
        isShared: false,
        busId: "25F-002.19",
        partnerBusId: "25F-000.19"
      }
    };
    setSelectedTransaction(newTransaction);
    setIsModalOpen(true);
  };

  const handleCheckDateExists = (dateStr: string): Transaction | undefined => {
    let found = transactions.find(t => t.date === dateStr);
    if (!found) {
      found = prevTransactions.find(t => t.date === dateStr);
    }
    return found;
  };

  const handleSwitchToEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (updatedTransaction: Transaction) => {
    try {
      // Enforce rule: Only PAID transactions can have a paymentMonth
      // If status is VERIFIED or AI_GENERATED, paymentMonth must be undefined/null
      if (updatedTransaction.status !== TransactionStatus.PAID) {
        updatedTransaction.paymentMonth = undefined;
      }

      await db.save(updatedTransaction);
      await fetchData();
      setIsModalOpen(false);
      setSelectedTransaction(null);
    } catch (error) {
      alert("Có lỗi khi lưu dữ liệu.");
      console.error(error);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await db.delete(id);
      await fetchData();
      setIsModalOpen(false);
      setSelectedTransaction(null);
    } catch (error) {
      alert("Có lỗi khi xóa dữ liệu.");
      console.error(error);
    }
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
    if (searchTerm) setSearchTerm('');
  };

  const selectMonth = (date: Date) => {
    setCurrentDate(date);
    setIsMonthPickerOpen(false);
    if (searchTerm) setSearchTerm('');
  };
  
  const handleExportExcel = () => {
    if (transactions.length === 0) {
      alert("Không có dữ liệu để xuất!");
      return;
    }
    const monthLabel = isSearching ? 'Ket_qua_tim_kiem' : `Ky_Thanh_Toan_${currentDate.getMonth() + 1}-${currentDate.getFullYear()}`;
    exportToExcel(transactions, monthLabel);
  };

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

  // Determine label for current view
  const getCurrentViewLabel = () => {
    if (isSearching) return `Kết quả tìm kiếm: "${searchTerm}"`;
    
    // Check if data is historical (PAID) or open
    const hasPaidItems = transactions.some(t => t.status === TransactionStatus.PAID);
    const monthStr = `Tháng ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
    
    if (hasPaidItems) {
      return `Kỳ thanh toán ${monthStr} (Đã chốt)`;
    } else {
      // If empty or contains unpaid items, it's the current open cycle
      return `Kỳ hiện tại ${monthStr} (Chưa thanh toán)`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">
      {/* Sidebar */}
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
        <div className="w-full p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Bus size={24} />
                </div>
               <h1 className="text-xl font-semibold flex items-center gap-2">
                  {getCurrentViewLabel()}
               </h1>
            </div>
            <div className="flex space-x-2 items-center">
               {/* 1. Đối soát tiền mặt */}
               <Button 
                  variant="outline" 
                  size="md" 
                  icon={<Wallet size={14}/>} 
                  onClick={() => setIsReconciliationOpen(true)}
               >
                  Đối soát tiền mặt
               </Button>

               {/* 2. Tạo thanh toán */}
               <Button 
                variant="primary" 
                size="md" 
                icon={<CreditCard size={14}/>}
                onClick={handleOpenPaymentModal}
                className="bg-blue-600 hover:bg-blue-700"
               >
                  Tạo thanh toán
               </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <StatsCard 
              title={isSearching ? "Tổng dư (Kết quả tìm kiếm)" : "Tổng dư (Trong kỳ hiển thị)"} 
              value={stats.totalRemaining} 
              diff={diffTotal} 
            />
            <StatsCard 
              title={isSearching ? "Dư sau chia (Kết quả tìm kiếm)" : "Dư sau chia (Trong kỳ hiển thị)"}
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
                placeholder="Tìm kiếm toàn bộ dữ liệu..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9"
              />
            </div>
            
            <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
               {/* 1. Month Picker */}
               <div className="flex items-center bg-white border rounded-md shadow-sm relative">
                 <button 
                    onClick={() => changeMonth(-1)}
                    className="p-2.5 hover:bg-slate-100 border-r"
                    title="Kỳ trước"
                 >
                   <ChevronLeft size={14} />
                 </button>
                 
                 <div className="relative">
                   <button 
                      onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                      className="px-4 py-2 text-sm font-medium min-w-[150px] text-center flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                   >
                      <Calendar size={14}/>
                      {`Kỳ: T${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`}
                      <ChevronDown size={14} className={`transition-transform ${isMonthPickerOpen ? 'rotate-180' : ''}`}/>
                   </button>
                   
                   {isMonthPickerOpen && (
                     <>
                      <div 
                        className="fixed inset-0 z-20" 
                        onClick={() => setIsMonthPickerOpen(false)}
                      />
                      <div className="absolute top-full mt-1 right-0 w-[300px] bg-white rounded-lg shadow-xl border border-slate-200 p-4 z-30 animate-in fade-in zoom-in-95 duration-200">
                        <div className="text-sm font-semibold text-slate-500 mb-3 px-1">
                          Chọn kỳ thanh toán
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
                    title="Kỳ sau"
                 >
                   <ChevronRight size={14} />
                 </button>
               </div>

               {/* 2. Xuất Excel */}
               <Button 
                  variant="outline" 
                  size="md" 
                  icon={<Download size={14}/>}
                  onClick={handleExportExcel}
               >
                  Xuất Excel
               </Button>

               {/* 3. Thêm sổ thu chi */}
               <Button 
                  variant="outline" 
                  size="md" 
                  icon={<Plus size={16}/>} 
                  onClick={handleAddTransaction}
               >
                  Thêm sổ thu chi
               </Button>
            </div>
          </div>

          {/* Table */}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} className="p-6 text-center text-muted-foreground">Đang tải dữ liệu...</td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                       <td colSpan={11} className="p-10 text-center text-muted-foreground">
                          {isSearching 
                             ? `Không tìm thấy dữ liệu nào cho "${searchTerm}"` 
                             : `Không có dữ liệu backlog nào trong kỳ hiện tại.`}
                       </td>
                    </tr>
                  ) : transactions.map((t) => (
                    <tr 
                      key={t.id} 
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="border-t p-4 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
               <div className="flex items-center gap-4">
                 <span className="font-medium italic">
                   * Dữ liệu hiển thị theo Kỳ thanh toán (Có thể bao gồm ngày của tháng khác nếu thuộc cùng kỳ)
                 </span>
               </div>
               <span>
                 Hiển thị: {transactions.length} bản ghi {isSearching && '(Tìm kiếm toàn bộ)'}
               </span>
            </div>
          </div>

          {/* Charts */}
          {!isSearching && !isLoading && transactions.length > 0 && (
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
          onDelete={handleDeleteTransaction}
          onCheckExists={handleCheckDateExists}
          onSwitchToEdit={handleSwitchToEdit}
        />
      )}

      {/* Payment Cycle Modal */}
      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        transactions={transactions}
        onConfirm={handleConfirmPayment}
      />

      {/* Reconciliation Sheet */}
      <ReconciliationSheet 
        isOpen={isReconciliationOpen} 
        onClose={() => setIsReconciliationOpen(false)}
        currentBalance={stats.totalRemaining}
        monthLabel={`T${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`}
        month={currentDate.getMonth() + 1}
        year={currentDate.getFullYear()}
      />
    </div>
  );
};
