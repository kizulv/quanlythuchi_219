
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
  Plus
} from 'lucide-react';
import { PaymentCycle, Transaction } from '../types';
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

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const loadedCycles = await db.getPaymentCycles();
      setCycles(loadedCycles);
      // Pre-fetch all transactions for edit modal needs (to show open items too)
      const all = await db.getAll();
      setAllTransactions(all);
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

  // Stats Logic
  const stats = useMemo(() => {
    const totalAmount = cycles.reduce((sum, c) => sum + c.totalAmount, 0);
    const totalCycles = cycles.length;
    const avgAmount = totalCycles > 0 ? totalAmount / totalCycles : 0;
    
    // Growth vs last cycle
    let growth = 0;
    if (cycles.length >= 2) {
       const latest = cycles[0].totalAmount;
       const prev = cycles[1].totalAmount;
       growth = latest - prev;
    }

    return { totalAmount, totalCycles, avgAmount, growth };
  }, [cycles]);

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

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

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

       {/* Stats Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <StatsCard 
             title="Tổng đã thanh toán" 
             value={stats.totalAmount} 
             diff={stats.growth} 
             icon={CheckCircle}
             variant="emerald"
          />
          <StatsCard 
             title="Số kỳ đã chốt" 
             value={stats.totalCycles} 
             diff={0} 
             icon={Calendar}
             variant="blue"
          />
          <StatsCard 
             title="Trung bình mỗi kỳ" 
             value={stats.avgAmount} 
             diff={0} 
             icon={TrendingUp}
             variant="indigo"
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
             <table className="w-full text-sm text-left whitespace-nowrap table-fixed min-w-[1000px]">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                   <tr>
                      <th className="h-12 px-6 align-middle">Kỳ thanh toán</th>
                      <th className="h-12 px-6 align-middle">Ngày tạo</th>
                      <th className="h-12 px-6 align-middle text-center">Số lượng phiếu</th>
                      <th className="h-12 px-6 align-middle text-right">Tổng tiền (VNĐ)</th>
                      <th className="h-12 px-6 align-middle">Ghi chú</th>
                      <th className="h-12 px-6 align-middle text-right">Thao tác</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {isLoading ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500">Đang tải...</td></tr>
                   ) : filteredCycles.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500 italic">Chưa có lịch sử thanh toán nào.</td></tr>
                   ) : filteredCycles.map((cycle, index) => {
                      const isLatest = index === 0; // Cycles are sorted desc
                      return (
                        <tr key={cycle.id} className="hover:bg-slate-50/80 transition-colors group">
                           <td className="px-6 py-4 align-middle">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                                    {cycle.id.split('.')[1]}
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 text-base">Tháng {cycle.id.split('.')[1]}/{cycle.id.split('.')[0]}</span>
                                    <span className="text-xs text-green-600 flex items-center gap-1 font-medium bg-green-50 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                       <CheckCircle size={10} /> Đã thanh toán
                                    </span>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4 align-middle">
                              <div className="flex items-center gap-2 text-slate-600">
                                 <Clock size={14} className="text-slate-400"/>
                                 {cycle.createdDate}
                              </div>
                           </td>
                           <td className="px-6 py-4 align-middle text-center">
                              <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold border border-slate-200">
                                 {cycle.transactionIds.length}
                              </span>
                           </td>
                           <td className="px-6 py-4 align-middle text-right">
                              <span className="font-bold text-slate-900 text-base">{formatCurrency(cycle.totalAmount)}</span>
                           </td>
                           <td className="px-6 py-4 align-middle max-w-[250px]">
                              <p className="truncate text-slate-500 text-xs md:text-sm" title={cycle.note}>
                                 {cycle.note || '---'}
                              </p>
                           </td>
                           <td className="px-6 py-4 align-middle text-right">
                              <div className="flex justify-end gap-3">
                                 {/* Edit Button */}
                                 <button 
                                    onClick={() => handleEdit(cycle, index)}
                                    disabled={!isLatest}
                                    className={`
                                       h-10 w-10 flex items-center justify-center rounded-lg border transition-all shadow-sm
                                       ${isLatest 
                                          ? 'border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200' 
                                          : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                                       }
                                    `}
                                    title={isLatest ? "Chỉnh sửa" : "Chỉ sửa được kỳ gần nhất"}
                                 >
                                    <Edit size={18} />
                                 </button>

                                 {/* View Ledger Button */}
                                 <button 
                                    onClick={() => onNavigateToLedger(cycle.id)}
                                    className="h-10 w-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
                                    title="Xem sổ thu chi"
                                 >
                                    <ArrowUpRight size={18} />
                                 </button>

                                 {/* Delete Button */}
                                 <button 
                                    onClick={() => handleDeleteClick(cycle.id, index)}
                                    disabled={!isLatest}
                                    className={`
                                       h-10 w-10 flex items-center justify-center rounded-lg border transition-all shadow-sm
                                       ${isLatest 
                                          ? 'border-slate-200 bg-white text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200' 
                                          : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                                       }
                                    `}
                                    title={isLatest ? "Xóa kỳ này" : "Chỉ xóa được kỳ gần nhất"}
                                 >
                                    <Trash2 size={18} />
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
