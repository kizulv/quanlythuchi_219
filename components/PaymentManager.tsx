
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  Search, 
  Trash2, 
  Edit, 
  Calendar,
  CheckCircle,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Menu,
  Plus,
  PieChart,
  Wallet
} from 'lucide-react';
import { PaymentCycle, Transaction, Bus } from '../types';
import { db } from '../services/database';
import { Button } from './ui/Button';
import { StatsCard } from './StatsCard';
import { PaymentModal } from './PaymentModal';
import { AlertDialog } from './ui/AlertDialog';
import { toast } from 'sonner';

interface PaymentManagerProps {
  onNavigateToLedger: (cycleId: string) => void;
  onToggleSidebar: () => void;
  onOpenCreateModal: () => void;
}

export const PaymentManager: React.FC<PaymentManagerProps> = ({ 
  onNavigateToLedger, 
  onToggleSidebar,
  onOpenCreateModal
}) => {
  const [cycles, setCycles] = useState<PaymentCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<PaymentCycle | undefined>(undefined);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const loadedCycles = await db.getPaymentCycles();
      setCycles(loadedCycles);
      
      // Pre-fetch all transactions and buses for calculations
      const all = await db.getAll();
      setAllTransactions(all);
      
      const busList = await db.getBuses();
      setBuses(busList);

    } catch (error) {
      console.error(error);
      toast.error("Không thể tải dữ liệu thanh toán");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper function to calculate Dividend (Cổ tức) vs Held (Giữ hộ) for a cycle
  const calculateCycleSplit = (cycle: PaymentCycle) => {
    let dividend = 0; // Owner share
    let held = 0;     // Shareholders share

    cycle.transactionIds.forEach(tid => {
        const t = allTransactions.find(tr => tr.id === tid);
        if (!t) return;

        const busId = t.breakdown?.busId;
        const bus = buses.find(b => b.licensePlate === busId);
        const balance = t.remainingBalance;

        if (bus && bus.isShareholding) {
            // Calculate Owner Share
            dividend += (balance * bus.sharePercentage) / 100;
            // Calculate Shareholders
            bus.shareholders?.forEach(sh => {
                held += (balance * sh.percentage) / 100;
            });
        } else {
            // Non-shareholding or unknown bus -> assume 100% to owner (Dividend)
            dividend += balance;
        }
    });

    return { dividend, held };
  };

  // Stats Logic
  const stats = useMemo(() => {
    const totalAmount = cycles.reduce((sum, c) => sum + c.totalAmount, 0);
    const totalCycles = cycles.length;
    const avgAmount = totalCycles > 0 ? totalAmount / totalCycles : 0;
    
    // Calculate Total Dividend accross all cycles
    let totalDividend = 0;
    cycles.forEach(c => {
       const { dividend } = calculateCycleSplit(c);
       totalDividend += dividend;
    });

    return { totalAmount, totalCycles, avgAmount, totalDividend };
  }, [cycles, allTransactions, buses]);

  // Filter Logic
  const filteredCycles = cycles.filter(c => 
    c.id.includes(searchTerm) || 
    (c.note && c.note.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handlers
  const handleEdit = (cycle: PaymentCycle, index: number) => {
    // Only allow editing the most recent cycle (index 0)
    if (index !== 0) {
      toast.error("Chỉ được phép sửa kỳ thanh toán gần nhất.");
      return;
    }
    setEditingCycle(cycle);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (id: string, index: number) => {
     if (index !== 0) {
      toast.error("Chỉ được phép xóa kỳ thanh toán gần nhất.");
      return;
    }
    setDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await db.deletePaymentCycle(deleteId);
      toast.success("Đã xóa kỳ thanh toán thành công!");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi xảy ra khi xóa.");
    } finally {
      setDeleteId(null);
    }
  };

  const handleConfirmEdit = async (selectedIds: string[], month: number, year: number, totalAmount: number, note: string) => {
    if (!editingCycle) return;
    try {
      await db.updatePaymentCycle(editingCycle.id, selectedIds, totalAmount, note);
      toast.success(`Đã cập nhật kỳ ${month}/${year}!`);
      fetchData();
      setIsEditModalOpen(false);
      setEditingCycle(undefined);
    } catch (error) {
       console.error(error);
       toast.error("Lỗi khi cập nhật");
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(Math.round(val));

  return (
    <div className="w-full">
       {/* Header - Aligned with Dashboard.tsx */}
       <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
          <div className="flex items-center space-x-3">
              <button 
                onClick={onToggleSidebar}
                className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-slate-100 shadow-sm"
              >
                <Menu size={20} />
              </button>
            <div className="flex flex-col">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">Quản lý thanh toán</h1>
              <div className="text-sm text-slate-500 font-normal">
                  Lịch sử và trạng thái các kỳ đã chốt
              </div>
            </div>
          </div>
          
          <div className="flex w-full md:w-auto gap-3 items-center md:self-auto">
             <Button 
                variant="primary" 
                size="md" 
                icon={<CreditCard size={16}/>}
                onClick={onOpenCreateModal}
                className="rounded-full bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-200 text-white border-none text-sm flex-1 md:flex-none justify-center px-6"
              >
                  Tạo thanh toán
              </Button>
          </div>
       </div>

       {/* Stats Cards - Compact Mode (No diff) */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <StatsCard 
             title="Tổng đã thanh toán" 
             value={stats.totalAmount}
             showDiff={false} 
             icon={CheckCircle}
             variant="emerald"
          />
          <StatsCard 
             title="Tổng cổ tức" 
             value={stats.totalDividend} 
             showDiff={false}
             icon={PieChart}
             variant="blue"
          />
          <StatsCard 
             title="Số kỳ đã chốt" 
             value={stats.totalCycles} 
             showDiff={false}
             icon={Calendar}
             variant="indigo"
          />
          <StatsCard 
             title="TB mỗi kỳ" 
             value={stats.avgAmount} 
             showDiff={false}
             icon={TrendingUp}
             variant="slate"
          />
       </div>

       {/* Toolbar */}
       <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center mb-6 gap-4">
          <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Tìm kỳ thanh toán, ghi chú..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm pl-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-blue-400 transition-all placeholder:text-slate-400"
              />
          </div>
       </div>

       {/* Table List */}
       <div className="rounded-lg border bg-white overflow-hidden shadow-sm flex flex-col min-h-[400px]">
          <div className="overflow-x-auto flex-1 w-full custom-scrollbar">
             <table className="w-full text-sm text-left whitespace-nowrap table-fixed min-w-[1100px]">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                   <tr>
                      <th className="h-12 px-4 align-middle text-center w-[200px]">Kỳ thanh toán</th>
                      <th className="h-12 px-4 align-middle text-center w-[130px]">Ngày tạo</th>
                      <th className="h-12 px-4 align-middle text-center w-[80px]">Phiếu</th>
                      <th className="h-12 px-4 align-middle text-right w-[100px]">Cổ tức</th>
                      <th className="h-12 px-4 align-middle text-right w-[100px]">Giữ hộ</th>
                      <th className="h-12 px-4 align-middle text-right w-[100px]">Tổng</th>
                      <th className="h-12 px-4 align-middle">Ghi chú</th>
                      <th className="h-12 px-4 align-middle text-right w-[120px]">Thao tác</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {isLoading ? (
                      <tr><td colSpan={8} className="p-8 text-center text-slate-500">Đang tải...</td></tr>
                   ) : filteredCycles.length === 0 ? (
                      <tr><td colSpan={8} className="p-8 text-center text-slate-500 italic">Chưa có lịch sử thanh toán nào.</td></tr>
                   ) : filteredCycles.map((cycle, index) => {
                      const isLatest = index === 0; // Cycles are sorted desc
                      const split = calculateCycleSplit(cycle);

                      return (
                        <tr key={cycle.id} className="hover:bg-slate-50/80 transition-colors group">
                           <td className="px-9 py-4 align-middle">
                              <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                                    {cycle.id.split('.')[1]}
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 text-sm">T{cycle.id.split('.')[1]}/{cycle.id.split('.')[0]}</span>
                                    <span className="text-[10px] text-green-600 font-bold uppercase">
                                       Đã thanh toán
                                    </span>
                                 </div>
                              </div>
                           </td>
                           <td className="px-4 py-4 align-middle">
                              <div className="flex items-center gap-1.5 text-slate-600">
                                 <Clock size={14} className="text-slate-400"/>
                                 {cycle.createdDate}
                              </div>
                           </td>
                           <td className="px-4 py-4 align-middle text-center">
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-bold border border-slate-200">
                                 {cycle.transactionIds.length}
                              </span>
                           </td>
                           {/* Cổ tức */}
                           <td className="px-4 py-4 align-middle text-right">
                              <span className="font-semibold text-blue-600">{formatCurrency(split.dividend)}</span>
                           </td>
                           {/* Giữ hộ */}
                           <td className="px-4 py-4 align-middle text-right">
                              <span className="font-semibold text-orange-600">
                                {split.held > 0 ? formatCurrency(split.held) : '-'}
                              </span>
                           </td>
                           {/* Tổng */}
                           <td className="px-4 py-4 align-middle text-right">
                              <span className="font-bold text-slate-900 text-sm">{formatCurrency(cycle.totalAmount)}</span>
                           </td>
                           <td className="px-4 py-4 align-middle">
                              <p className="truncate text-slate-500 text-xs w-full max-w-[200px]" title={cycle.note}>
                                 {cycle.note || '---'}
                              </p>
                           </td>
                           <td className="px-4 py-4 align-middle text-right">
                              <div className="flex justify-end gap-2">
                                 {/* Edit Button */}
                                 <button 
                                    onClick={() => handleEdit(cycle, index)}
                                    disabled={!isLatest}
                                    className={`
                                       h-8 w-8 flex items-center justify-center rounded border transition-all shadow-sm
                                       ${isLatest 
                                          ? 'border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200' 
                                          : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                                       }
                                    `}
                                    title={isLatest ? "Chỉnh sửa" : "Chỉ sửa được kỳ gần nhất"}
                                 >
                                    <Edit size={14} />
                                 </button>

                                 {/* View Ledger Button */}
                                 <button 
                                    onClick={() => onNavigateToLedger(cycle.id)}
                                    className="h-8 w-8 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
                                    title="Xem sổ thu chi"
                                 >
                                    <ArrowUpRight size={14} />
                                 </button>

                                 {/* Delete Button */}
                                 <button 
                                    onClick={() => handleDeleteClick(cycle.id, index)}
                                    disabled={!isLatest}
                                    className={`
                                       h-8 w-8 flex items-center justify-center rounded border transition-all shadow-sm
                                       ${isLatest 
                                          ? 'border-slate-200 bg-white text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200' 
                                          : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                                       }
                                    `}
                                    title={isLatest ? "Xóa kỳ này" : "Chỉ xóa được kỳ gần nhất"}
                                 >
                                    <Trash2 size={14} />
                                 </button>
                              </div>
                           </td>
                        </tr>
                      );
                   })}
                </tbody>
             </table>
          </div>
       </div>

       {/* Edit Modal (Reusing PaymentModal) */}
       {isEditModalOpen && editingCycle && (
          <PaymentModal 
             isOpen={isEditModalOpen}
             onClose={() => { setIsEditModalOpen(false); setEditingCycle(undefined); }}
             transactions={allTransactions} // Pass full list, modal handles filtering
             cycles={cycles}
             onConfirm={handleConfirmEdit}
             editingCycle={editingCycle}
          />
       )}

       <AlertDialog 
         isOpen={!!deleteId}
         onClose={() => setDeleteId(null)}
         onConfirm={handleConfirmDelete}
         title="Xóa kỳ thanh toán?"
         description="Hành động này sẽ hoàn tác trạng thái 'Đã thanh toán' của tất cả các phiếu trong kỳ này về trạng thái 'Chưa thanh toán'. Dữ liệu phiếu không bị xóa."
         confirmText="Xóa bỏ"
         variant="destructive"
       />
    </div>
  );
};
