
import React, { useState, useEffect } from 'react';
import { X, Calculator, ChevronDown, Check, Calendar, ListChecks } from 'lucide-react';
import { Transaction, TransactionStatus } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[]; // Full list passed from dashboard
  onConfirm: (selectedIds: string[], month: number, year: number) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  transactions,
  onConfirm
}) => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  
  // Internal selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Generate list of recent months for selection
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [2024, 2025, 2026];

  // Filter out PAID transactions immediately
  const visibleTransactions = transactions.filter(t => t.status !== TransactionStatus.PAID);

  useEffect(() => {
    if (isOpen) {
      // Auto-select all visible (unpaid) items
      const autoSelect = new Set<string>();
      visibleTransactions.forEach(t => {
        autoSelect.add(t.id);
      });
      setSelectedIds(autoSelect);
    }
  }, [isOpen, transactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  // Calculate stats based on LOCAL SELECTION from Visible items only
  const selectedTransactions = visibleTransactions.filter(t => selectedIds.has(t.id));
  const totalRemaining = selectedTransactions.reduce((sum, t) => sum + t.remainingBalance, 0);
  const splitByFour = totalRemaining / 4;
  const count = selectedTransactions.length;

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds), selectedMonth, selectedYear);
  };

  // Selection Handlers
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Content - WIDER now (max-w-4xl) */}
      <div className="relative z-[70] w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shadow-sm">
              <Calculator size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Tạo phiếu thanh toán</h2>
              <p className="text-sm text-slate-500 font-medium">Chọn các bản ghi để chốt sổ và thanh toán</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
           
           {/* Left Panel: List Checkbox Table */}
           <div className="flex-1 flex flex-col border-r border-slate-100 bg-white min-h-0">
              <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={visibleTransactions.length > 0 && selectedIds.size === visibleTransactions.length}
                        onChange={toggleSelectAll}
                        id="select-all-modal"
                      />
                      <label htmlFor="select-all-modal" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                        Chọn tất cả ({visibleTransactions.length})
                      </label>
                  </div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      Đã chọn: {selectedIds.size}
                  </span>
              </div>

              <div className="overflow-y-auto flex-1 custom-scrollbar p-0">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="h-10 px-4 w-[40px]"></th>
                      <th className="h-10 px-2">Ngày</th>
                      <th className="h-10 px-2 text-right">Dư còn lại</th>
                      <th className="h-10 px-4">Ghi chú</th>
                      <th className="h-10 px-2 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleTransactions.length === 0 ? (
                       <tr><td colSpan={5} className="p-8 text-center text-slate-400">Không có bản ghi nào chưa thanh toán</td></tr>
                    ) : visibleTransactions.map(t => {
                      const isChecked = selectedIds.has(t.id);
                      return (
                        <tr 
                          key={t.id} 
                          className={`
                             transition-colors cursor-pointer
                             ${isChecked ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'}
                          `}
                          onClick={() => toggleSelection(t.id)}
                        >
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                             <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                checked={isChecked}
                                onChange={() => toggleSelection(t.id)}
                             />
                          </td>
                          <td className="px-2 py-3 font-medium text-slate-700">{t.date}</td>
                          <td className="px-2 py-3 text-right font-bold text-slate-900">{formatCurrency(t.remainingBalance)}</td>
                          <td className="px-4 py-3 text-slate-500 truncate max-w-[150px]" title={t.note}>{t.note}</td>
                          <td className="px-2 py-3 text-right">
                             <Badge status={t.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
           </div>

           {/* Right Panel: Summary & Actions */}
           <div className="w-full md:w-80 bg-slate-50 p-6 flex flex-col gap-6 shrink-0 overflow-y-auto">
              
              {/* Month Selection */}
              <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400"/> 
                  Kỳ thanh toán
                </h3>
                <div className="space-y-2">
                   <div className="relative">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="w-full h-9 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {months.map(m => (
                          <option key={m} value={m}>Tháng {m}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                   </div>
                   <div className="relative">
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full h-9 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {years.map(y => (
                          <option key={y} value={y}>Năm {y}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                   </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="space-y-3">
                 <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tổng số lượng</p>
                    <p className="text-xl font-bold text-slate-900">{count} <span className="text-sm font-normal text-slate-500">bản ghi</span></p>
                 </div>

                 <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tổng dư chọn</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(totalRemaining)}</p>
                 </div>

                 <div className="bg-blue-600 p-5 rounded-lg shadow-lg text-white relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white opacity-10 rounded-full"></div>
                    <p className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">Dư còn lại / 4</p>
                    <p className="text-2xl font-bold tracking-tight">{formatCurrency(splitByFour)}</p>
                    <p className="text-[10px] text-blue-200 mt-1 font-medium">Thực nhận mỗi phần</p>
                 </div>
              </div>
              
              {/* Spacer to push buttons down if needed */}
              <div className="flex-1"></div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
                 <Button 
                  variant="primary" 
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 shadow-md"
                  onClick={handleConfirm}
                  disabled={count === 0}
                 >
                   Xác nhận thanh toán
                 </Button>
                 <Button variant="outline" onClick={onClose} className="w-full h-10 border-slate-300">
                   Hủy bỏ
                 </Button>
              </div>

           </div>
        </div>
      </div>
    </div>
  );
};
