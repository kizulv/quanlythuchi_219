
import React, { useState, useEffect, useMemo } from 'react';
import { X, Calculator, Calendar, DollarSign, Wallet, CheckCircle, CalendarCheck, Lock, PieChart, Users, UserCheck } from 'lucide-react';
import { Transaction, TransactionStatus, PaymentCycle, Bus } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { db } from '../services/database';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[]; 
  cycles: PaymentCycle[];
  onConfirm: (selectedIds: string[], month: number, year: number, totalAmount: number, note: string) => void;
  editingCycle?: PaymentCycle; // If provided, modal is in Edit Mode
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  transactions,
  cycles,
  onConfirm,
  editingCycle
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  
  // New: Bus data for share calculation
  const [buses, setBuses] = useState<Bus[]>([]);

  // Determine which transactions to show
  const visibleTransactions = transactions.filter(t => {
    if (editingCycle) {
      // In Edit Mode, include unpaid items OR items belonging to this cycle
      return t.status !== TransactionStatus.PAID || t.paymentMonth === editingCycle.id;
    }
    // In Create Mode, only unpaid items
    return t.status !== TransactionStatus.PAID;
  });

  useEffect(() => {
    if (isOpen) {
      // Load Bus Data for calculations
      const loadBuses = async () => {
        const busData = await db.getBuses();
        setBuses(busData);
      };
      loadBuses();

      if (editingCycle) {
        // EDIT MODE SETUP
        const [yearStr, monthStr] = editingCycle.id.split('.');
        setSelectedMonth(parseInt(monthStr));
        setSelectedYear(parseInt(yearStr));
        setNote(editingCycle.note || '');
        
        // Pre-select items that are currently in the cycle
        const currentIds = new Set(editingCycle.transactionIds);
        setSelectedIds(currentIds);
      } else {
        // CREATE MODE SETUP
        // Auto-select all visible (open) transactions
        const autoSelect = new Set<string>();
        visibleTransactions.forEach(t => autoSelect.add(t.id));
        setSelectedIds(autoSelect);

        // Auto-increment month logic
        const today = new Date();
        let m = today.getMonth() + 1;
        let y = today.getFullYear();

        const checkExists = (checkM: number, checkY: number) => {
           const id = `${checkY}.${checkM.toString().padStart(2, '0')}`;
           return cycles.some(c => c.id === id);
        }

        let safetyCounter = 0;
        while (checkExists(m, y) && safetyCounter < 12) {
          m++;
          if (m > 12) {
            m = 1;
            y++;
          }
          safetyCounter++;
        }

        setSelectedMonth(m);
        setSelectedYear(y);
        setNote(`Thanh toán kỳ ${m}/${y}`);
      }
    }
  }, [isOpen, editingCycle]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(Math.round(val));

  const selectedTransactions = visibleTransactions.filter(t => selectedIds.has(t.id));
  
  const totalRemaining = selectedTransactions.reduce((sum, t) => sum + t.remainingBalance, 0);
  
  // --- NEW CALCULATION LOGIC: SHARES ---
  const shareStats = useMemo(() => {
      let ownerTotal = 0;
      const shareholderTotals: Record<string, number> = {};
      let totalCalculated = 0;

      selectedTransactions.forEach(t => {
          // Identify Bus
          const busId = t.breakdown?.busId; // Usually license plate
          const bus = buses.find(b => b.licensePlate === busId);
          const balance = t.remainingBalance;

          if (bus && bus.isShareholding) {
              // Calculate Owner Share
              const ownerAmount = (balance * bus.sharePercentage) / 100;
              ownerTotal += ownerAmount;

              // Calculate Shareholders
              bus.shareholders?.forEach(sh => {
                  const shAmount = (balance * sh.percentage) / 100;
                  shareholderTotals[sh.name] = (shareholderTotals[sh.name] || 0) + shAmount;
                  totalCalculated += shAmount;
              });
              totalCalculated += ownerAmount;
          } else {
              // If not shareholding or bus not found, assume 100% goes to Owner/Operator
              // or reflect previous "Remaining Balance" directly
              ownerTotal += balance;
              totalCalculated += balance;
          }
      });

      return {
          ownerTotal,
          shareholderTotals,
          totalCalculated
      };
  }, [selectedTransactions, buses]);

  // Helper to calculate row shares for display in table
  const getRowShares = (t: Transaction) => {
    const busId = t.breakdown?.busId;
    const bus = buses.find(b => b.licensePlate === busId);
    const balance = t.remainingBalance;
    
    if (bus && bus.isShareholding) {
        const ownerShare = (balance * bus.sharePercentage) / 100;
        let heldShare = 0;
        bus.shareholders?.forEach(sh => {
            heldShare += (balance * sh.percentage) / 100;
        });
        return { ownerShare, heldShare, isShareholding: true };
    }
    return { ownerShare: balance, heldShare: 0, isShareholding: false };
  };

  // Use the calculated total based on shares as the payment amount
  // (Assuming the cycle clears the entire balance distributed among stakeholders)
  const paymentAmount = shareStats.totalCalculated;
  const count = selectedTransactions.length;

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds), selectedMonth, selectedYear, paymentAmount, note);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === visibleTransactions.length && visibleTransactions.length > 0) {
      setSelectedIds(new Set());
    } else {
      const allIds = visibleTransactions.map(t => t.id);
      setSelectedIds(new Set(allIds));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative z-[70] w-full max-w-5xl bg-white md:rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200 h-[100dvh] md:h-auto md:max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 text-slate-900 rounded-lg shadow-sm">
              <Calculator size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-900">
                {editingCycle ? 'Cập nhật thanh toán' : 'Tạo thanh toán'}
              </h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium hidden md:block">
                {editingCycle ? 'Thêm hoặc bớt các bản ghi cho kỳ này' : 'Chọn các bản ghi để chốt sổ'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
           
           {/* Right Panel: Summary */}
           <div className="w-full md:w-[360px] bg-slate-50 p-2 md:p-5 flex flex-col gap-1 md:gap-3 shadow-[-5px_0_15px_-3px_rgba(0,0,0,0.05)] z-20 shrink-0 order-first md:order-last border-b md:border-b-0 border-slate-200 overflow-y-auto custom-scrollbar">
              
              {/* Payment Cycle Info */}
              <div className="relative overflow-hidden rounded-lg md:rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-2.5 md:p-4 text-white shadow-lg shrink-0 flex items-center justify-between md:block">
                <div className="absolute right-[-10px] top-[-10px] opacity-10 pointer-events-none">
                   <CalendarCheck size={80} className="md:w-[100px] md:h-[100px]" />
                </div>
                
                <div className="relative z-10 flex items-center gap-2 md:mb-1 opacity-90 md:opacity-100">
                    <Calendar size={14} className="text-slate-300 md:text-white md:w-4 md:h-4" />
                    <span className="text-[13px] font-bold uppercase tracking-wider">Tháng {selectedMonth}/{selectedYear}</span>
                    {editingCycle && <Lock size={12} className="text-orange-300 ml-1" />}
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="flex flex-col gap-2 shrink-0">
                 {/* UPDATED: Compact Shareholding Breakdown */}
                 <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* 1. Total Payment on Top (Blue Background) */}
                    <div className="bg-blue-600 px-4 py-2 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded">
                                <PieChart size={16} className="text-white" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wide opacity-90">Tổng thanh toán</span>
                        </div>
                        <span className="text-xl font-bold">{formatCurrency(paymentAmount)}</span>
                    </div>

                    <div className="p-3 space-y-3">
                        {/* 2. Group Info: Owner */}
                        <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                             <div className="flex items-center gap-2">
                                <div className="p-1 bg-white rounded-full border border-slate-200 shadow-sm text-blue-600">
                                   <UserCheck size={14} />
                                </div>
                                <span className="text-sm font-semibold text-slate-700">Chia cổ phần</span>
                             </div>
                             <span className="font-bold text-slate-900">{formatCurrency(shareStats.ownerTotal)}</span>
                        </div>

                        {/* 3. Group Info: Shareholders */}
                        {Object.keys(shareStats.shareholderTotals).length > 0 && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                                <div className="px-3 py-2 bg-slate-100/50 border-b border-slate-200 flex items-center gap-2">
                                     <Users size={12} className="text-slate-500"/>
                                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phần giữ hộ</span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {Object.entries(shareStats.shareholderTotals).map(([name, amount]) => (
                                        <div key={name} className="flex justify-between items-center px-3 py-2 text-xs hover:bg-slate-100/50 transition-colors">
                                            <span className="text-slate-600 font-medium">{name}</span>
                                            <span className="font-bold text-slate-800">{formatCurrency(amount as number)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                 </div>
              </div>

              {/* Note Input */}
              <div className="flex flex-col gap-1.5 md:mt-2">
                 <label className="text-xs font-semibold text-slate-600">Ghi chú kỳ thanh toán</label>
                 <textarea
                    className="flex min-h-[60px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300 resize-none shadow-sm transition-all"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="VD: Thanh toán đợt 1..."
                 />
              </div>
              
              <div className="hidden md:flex gap-3 pt-2 mt-auto">
                 <Button 
                   variant="outline" 
                   onClick={onClose} 
                   className="h-12 border-slate-300 font-medium flex-1"
                 >
                   Hủy
                 </Button>
                 <Button 
                  variant="primary" 
                  className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 shadow-xl font-bold"
                  onClick={handleConfirm}
                  disabled={count === 0}
                 >
                   <CheckCircle size={18} className="mr-2" />
                   {editingCycle ? "Lưu thay đổi" : "Xác nhận"}
                 </Button>
              </div>

           </div>

           {/* Left Panel: Table */}
           <div className="flex-1 flex flex-col border-r border-slate-100 bg-white min-h-0 order-last md:order-first">
              <div className="p-3 md:p-4 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={visibleTransactions.length > 0 && selectedIds.size === visibleTransactions.length}
                        onChange={toggleSelectAll}
                        id="select-all-modal"
                      />
                      <label htmlFor="select-all-modal" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                        Tất cả ({visibleTransactions.length})
                      </label>
                  </div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      Đã chọn: {selectedIds.size}
                  </span>
              </div>

              {/* Added max-h-[500px] as requested */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-0 pb-20 md:pb-0 max-h-[500px]">
                <table className="w-full text-sm text-left table-fixed">
                  <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="h-10 px-2 text-center w-[40px]">#</th>
                      <th className="h-10 px-2 text-center">Ngày</th>
                      <th className="h-10 px-2 text-right w-[90px]">Tổng dư</th>
                      <th className="h-10 px-2 text-right w-[90px]">Cổ tức</th>
                      <th className="h-10 px-2 text-right w-[90px]">Giữ hộ</th>
                      <th className="h-10 px-2 text-center hidden md:table-cell w-[140px]">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleTransactions.length === 0 ? (
                       <tr><td colSpan={6} className="p-8 text-center text-slate-400">Không có bản ghi nào để chọn</td></tr>
                    ) : visibleTransactions.map(t => {
                      const isChecked = selectedIds.has(t.id);
                      // Highlight if item is currently part of the cycle being edited
                      const isInCurrentCycle = editingCycle?.transactionIds.includes(t.id);
                      
                      // Calculate row shares
                      const { ownerShare, heldShare, isShareholding } = getRowShares(t);

                      return (
                        <tr 
                          key={t.id} 
                          className={`
                             transition-colors cursor-pointer
                             ${isChecked ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'}
                             ${isInCurrentCycle ? 'bg-green-50/30' : ''}
                          `}
                          onClick={() => toggleSelection(t.id)}
                        >
                          <td className="px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                             <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                checked={isChecked}
                                onChange={() => toggleSelection(t.id)}
                             />
                          </td>
                          <td className="px-2 py-3 text-center font-medium text-slate-700 truncate">{t.date}</td>
                          <td className="px-2 py-3 text-right font-bold text-slate-900">{formatCurrency(t.remainingBalance)}</td>
                          
                          {/* Shareholder Dividend Columns */}
                          <td className="px-2 py-3 text-right text-blue-600 font-medium">
                            {isShareholding ? formatCurrency(ownerShare) : '-'}
                          </td>
                          <td className="px-2 py-3 text-right text-orange-600 font-medium">
                            {/* CHANGED: Allow negative values (e.g., loss sharing) */}
                            {isShareholding && heldShare !== 0 ? formatCurrency(heldShare) : '-'}
                          </td>

                          <td className="px-2 py-3 text-center hidden md:table-cell">
                             <Badge status={t.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
           </div>

           {/* Mobile Floating Buttons */}
           <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 z-[100] flex gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="h-11 border-slate-300 font-medium flex-1 text-sm"
              >
                Hủy
              </Button>
              <Button 
                variant="primary" 
                className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 shadow-lg font-bold text-sm"
                onClick={handleConfirm}
                disabled={count === 0}
              >
                <CheckCircle size={16} className="mr-2" />
                {editingCycle ? "Lưu" : "Xác nhận"}
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
};
