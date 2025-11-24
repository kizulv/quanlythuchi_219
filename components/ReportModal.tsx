
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, FileText, Download, Copy, Loader2, CalendarCheck, Calendar, Clock, PieChart, Users, Banknote } from 'lucide-react';
import { Transaction, PaymentCycle, Bus } from '../types';
import { Button } from './ui/Button';
import { toPng, toBlob } from 'html-to-image';
import { toast } from 'sonner';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[]; 
  cycle: PaymentCycle | undefined;
  buses: Bus[];
}

export const ReportModal: React.FC<ReportModalProps> = ({ 
  isOpen, 
  onClose, 
  transactions,
  cycle,
  buses
}) => {
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedYear, setSelectedYear] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && cycle) {
      const [yearStr, monthStr] = cycle.id.split('.');
      setSelectedMonth(parseInt(monthStr));
      setSelectedYear(parseInt(yearStr));
    }
  }, [isOpen, cycle]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(Math.round(val));

  // Filter transactions belonging to this cycle
  const cycleTransactions = useMemo(() => {
    if (!cycle) return [];
    return transactions.filter(t => cycle.transactionIds.includes(t.id));
  }, [transactions, cycle]);
  
  // Calculate Totals and Shares (Matching PaymentModal Logic)
  const shareStats = useMemo(() => {
      let ownerTotal = 0;
      const shareholderTotals: Record<string, number> = {};
      let totalCalculated = 0;

      cycleTransactions.forEach(t => {
          const busId = t.breakdown?.busId;
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
              ownerTotal += balance;
              totalCalculated += balance;
          }
      });

      return {
          ownerTotal,
          shareholderTotals,
          totalCalculated
      };
  }, [cycleTransactions, buses]);

  // Calculate Specific Amounts
  const totalBalanceSum = cycleTransactions.reduce((sum, t) => sum + t.remainingBalance, 0);
  const anhThaoAmount = shareStats.shareholderTotals['Anh Thảo'] || 0;
  // Round to nearest 50 (e.g., 1234 -> 1250, 1220 -> 1200) - Assuming rounding to nearest 50 units
  const anhThaoRounded = Math.round(anhThaoAmount / 50) * 50;

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

  const handleCapture = async (action: 'download' | 'copy') => {
    if (!reportRef.current) return;
    setIsCapturing(true);

    // Short delay to ensure rendering is stable
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const node = reportRef.current;
      const config = {
         quality: 1.0,
         pixelRatio: 3, // High resolution (Retina-like)
         backgroundColor: '#ffffff',
         cacheBust: true,
         skipFonts: true,
         style: {
             fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
         }
      };

      if (action === 'download') {
        const dataUrl = await toPng(node, config);
        const link = document.createElement('a');
        link.download = `Bao_Cao_T${selectedMonth}_${selectedYear}.png`;
        link.href = dataUrl;
        link.click();
        toast.success("Đã tải ảnh báo cáo xuống");
      } else {
        const blob = await toBlob(node, config);
        if (blob) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            toast.success("Đã copy ảnh vào bộ nhớ tạm");
        } else {
            throw new Error("Không thể tạo dữ liệu ảnh");
        }
      }
    } catch (error) {
      console.error("Capture failed:", error);
      toast.error("Có lỗi khi tạo ảnh. Vui lòng thử lại.");
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isOpen || !cycle) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Changed max-w-[95vw] to max-w-[1200px] */}
      <div className="relative z-[70] w-full max-w-[1200px] bg-white md:rounded-xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200 flex flex-col max-h-[98vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shadow-sm">
              <FileText size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Chi tiết bản ghi
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Kỳ thanh toán {selectedMonth}/{selectedYear}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                Tổng số: {cycleTransactions.length}
             </span>
             <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
             >
                <X size={24} />
             </button>
          </div>
        </div>

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-100/50 p-4 md:p-6">
           
           {/* CAPTURE ZONE */}
           <div ref={reportRef} className="bg-white p-6 md:p-8 rounded-none md:rounded-xl shadow-sm border border-slate-200 flex flex-row gap-6 min-w-[1100px] items-start font-sans">
              
              {/* Right Panel: Summary Cards (Moved to Right to match PaymentModal Layout) */}
              <div className="w-[340px] shrink-0 flex flex-col gap-4 order-last">
                  
                  {/* Payment Cycle Info (Matching PaymentModal) */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-lg">
                    <div className="absolute right-[-10px] top-[-10px] opacity-10 pointer-events-none">
                       <CalendarCheck size={100} />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1 opacity-90">
                           <Calendar size={14} className="text-slate-300" />
                           <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">KỲ THANH TOÁN</span>
                        </div>
                        <div className="text-[32px] font-bold tracking-tight leading-none mb-1">
                           Tháng {selectedMonth}/{selectedYear}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                           Ngày tạo: {cycle.createdDate}
                        </div>
                    </div>
                  </div>

                  {/* Totals Breakdown (Matching PaymentModal) */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                    {/* Header */}
                    <div className="bg-slate-900 px-4 py-3 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2.5">
                           <div className="">
                              <Clock size={16} className="text-slate-200" />
                           </div>
                           <span className="text-xs font-bold uppercase tracking-wider text-slate-100">TỔNG DƯ</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight">{formatCurrency(totalBalanceSum)}</span>
                    </div>

                    <div className="p-3 bg-white space-y-2">
                        {/* Row 1: Chia cổ phần */}
                        <div className="flex justify-between items-center px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                   <PieChart size={14} />
                                </div>
                                <span className="text-sm font-medium text-slate-700">Chia cổ phần</span>
                             </div>
                             <span className="font-bold text-base text-slate-900">{formatCurrency(shareStats.ownerTotal)}</span>
                        </div>

                        {/* Row 2+: Shareholders */}
                        {Object.entries(shareStats.shareholderTotals).map(([name, amount]) => (
                            <div key={name} className="flex justify-between items-center px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200">
                                      <Users size={14} />
                                   </div>
                                   <span className="text-sm font-medium text-slate-700">{name}</span>
                                </div>
                                <span className="font-bold text-base text-slate-900">{formatCurrency(amount as number)}</span>
                            </div>
                        ))}
                    </div>
                 </div>

                  {/* Chuyển tiền Anh Thảo (MOVED BELOW TOTAL) */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-900 to-emerald-800 p-4 text-white shadow-lg">
                    <div className="absolute right-[-10px] top-[-10px] opacity-10 pointer-events-none">
                       <Banknote size={100} />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1 opacity-90">
                           <Users size={14} className="text-emerald-300" />
                           <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">CHUYỂN TIỀN ANH THẢO</span>
                        </div>
                        <div className="text-[28px] font-bold tracking-tight leading-none mb-1">
                           {formatCurrency(anhThaoRounded * 1000)} VNĐ
                        </div>
                        <div className="text-xs text-emerald-400 font-medium">
                           Thực tế: {formatCurrency(anhThaoAmount * 1000)} VNĐ
                        </div>
                    </div>
                  </div>

                 {/* Note Section */}
                 <div className="mt-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">GHI CHÚ KỲ THANH TOÁN</label>
                      <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm text-slate-600 shadow-sm leading-relaxed min-h-[60px]">
                          {cycle.note || "Không có ghi chú"}
                      </div>
                  </div>
              </div>

              {/* Left Panel: Table List */}
              <div className="flex-1 min-w-0 border rounded-lg border-slate-200 overflow-hidden">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3 text-center w-[50px] border-r border-slate-100">#</th>
                        <th className="py-3 px-3 text-center w-[120px] border-r border-slate-100">Ngày</th>
                        <th className="py-3 px-3 text-right w-[120px] border-r border-slate-100">Tổng dư</th>
                        {/* REMOVED DIVIDEND COLUMN */}
                        <th className="py-3 px-3 text-right w-[120px] border-r border-slate-100 text-orange-600">Anh Thảo</th>
                        <th className="py-3 px-4 text-left">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cycleTransactions.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">Không có dữ liệu</td></tr>
                      ) : cycleTransactions.map((t, idx) => {
                        const { heldShare, isShareholding } = getRowShares(t);
                        
                        return (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 text-center text-slate-400 font-medium border-r border-slate-100">{idx + 1}</td>
                            <td className="py-3 px-3 text-center font-bold text-slate-700 border-r border-slate-100">{t.date}</td>
                            <td className="py-3 px-3 text-right font-black text-slate-900 border-r border-slate-100">{formatCurrency(t.remainingBalance)}</td>

                            {/* REMOVED DIVIDEND CELL */}
                            
                            <td className="py-3 px-3 text-right font-bold text-orange-600 border-r border-slate-100">
                               {isShareholding && heldShare !== 0 ? formatCurrency(heldShare) : '-'}
                            </td>

                            <td className="py-3 px-4 text-left text-slate-500 truncate max-w-[200px]">
                              {t.note}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {/* Table Footer */}
                  <div className="bg-slate-50 border-t border-slate-200 p-3 flex justify-between items-center text-xs text-slate-500">
                     <span>* Đơn vị tính: Nghìn VNĐ</span>
                     <span>Tổng số bản ghi: {cycleTransactions.length}</span>
                  </div>
              </div>

           </div>
           {/* End Capture Zone */}

        </div>

        {/* Footer with Actions */}
        <div className="p-4 border-t border-slate-100 bg-white flex gap-3 shrink-0 rounded-b-xl z-50 justify-end">
           <Button 
             variant="outline" 
             onClick={() => handleCapture('copy')}
             className="h-11 border-slate-200 font-medium min-w-[120px]"
             disabled={isCapturing}
           >
             {isCapturing ? <Loader2 className="animate-spin mr-2" size={16}/> : <Copy size={16} className="mr-2" />}
             Copy ảnh
           </Button>
           
           <Button 
             variant="primary" 
             onClick={() => handleCapture('download')}
             className="h-11 bg-slate-900 hover:bg-slate-800 font-bold min-w-[140px]"
             disabled={isCapturing}
           >
             {isCapturing ? <Loader2 className="animate-spin mr-2" size={16}/> : <Download size={16} className="mr-2" />}
             Lưu ảnh
           </Button>
        </div>

      </div>
    </div>
  );
};
