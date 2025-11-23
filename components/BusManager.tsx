

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Trash2, 
  Edit, 
  Bus as BusIcon,
  Plus,
  Menu,
  Users,
  UserCheck,
  Wrench,
  PieChart
} from 'lucide-react';
import { Bus } from '../types';
import { db } from '../services/database';
import { Button } from './ui/Button';
import { StatsCard } from './StatsCard';
import { BusModal } from './BusModal';
import { AlertDialog } from './ui/AlertDialog';
import { toast } from 'sonner';

interface BusManagerProps {
  onToggleSidebar: () => void;
}

export const BusManager: React.FC<BusManagerProps> = ({ onToggleSidebar }) => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await db.getBuses();
      setBuses(data);
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải danh sách xe");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const total = buses.length;
    const partner = buses.filter(b => b.isPartner).length;
    const shareholding = buses.filter(b => b.isShareholding).length;
    const active = buses.filter(b => b.status === 'ACTIVE').length;
    return { total, partner, shareholding, active };
  }, [buses]);

  const filteredBuses = buses.filter(b => 
    b.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.note && b.note.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSave = async (bus: Bus) => {
    try {
      await db.saveBus(bus);
      toast.success(bus.id ? "Cập nhật thành công!" : "Thêm xe mới thành công!");
      fetchData();
    } catch (e) {
      toast.error("Lỗi khi lưu dữ liệu");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await db.deleteBus(deleteId);
      toast.success("Đã xóa xe thành công!");
      fetchData();
    } catch (e) {
      toast.error("Lỗi khi xóa dữ liệu");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="w-full">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
          <div className="flex items-center space-x-3">
              <button 
                onClick={onToggleSidebar}
                className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-slate-100 shadow-sm"
              >
                <Menu size={20} />
              </button>
            <div className="flex flex-col">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">Danh sách xe</h1>
              <div className="text-sm text-slate-500 font-normal">
                  Quản lý thông tin xe và đối tác
              </div>
            </div>
          </div>
          
          <div className="flex w-full md:w-auto gap-3 items-center md:self-auto">
             <Button 
                variant="primary" 
                size="md" 
                icon={<Plus size={16}/>}
                onClick={() => { setEditingBus(undefined); setIsModalOpen(true); }}
                className="rounded-full bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-200 text-white border-none text-sm flex-1 md:flex-none justify-center px-6"
              >
                  Thêm xe mới
              </Button>
          </div>
       </div>

       {/* Stats Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <StatsCard 
             title="Tổng số xe" 
             value={stats.total} 
             diff={0} 
             icon={BusIcon}
             variant="blue"
          />
          <StatsCard 
             title="Xe Cổ Phần" 
             value={stats.shareholding} 
             diff={0} 
             icon={PieChart}
             variant="emerald"
          />
          <StatsCard 
             title="Xe Đối Tác" 
             value={stats.partner} 
             diff={0} 
             icon={Users}
             variant="indigo"
          />
       </div>

       {/* Search Bar */}
       <div className="mb-6">
          <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Tìm biển số, ghi chú..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm pl-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-blue-400 transition-all placeholder:text-slate-400"
              />
          </div>
       </div>

       {/* List Table */}
       <div className="rounded-lg border bg-white overflow-hidden shadow-sm flex flex-col min-h-[400px]">
          <div className="overflow-x-auto flex-1 w-full custom-scrollbar">
             <table className="w-full text-sm text-left whitespace-nowrap table-fixed min-w-[600px]">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                   <tr>
                      <th className="h-12 px-6 align-middle w-[150px]">Biển kiểm soát</th>
                      <th className="h-12 px-6 align-middle w-[150px]">Trạng thái</th>
                      <th className="h-12 px-6 align-middle w-[150px]">Loại xe</th>
                      <th className="h-12 px-6 align-middle w-[150px]">Phân loại</th>
                      <th className="h-12 px-6 align-middle">Ghi chú</th>
                      <th className="h-12 px-6 align-middle text-right w-[150px]">Thao tác</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {isLoading ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500">Đang tải...</td></tr>
                   ) : filteredBuses.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500 italic">Chưa có dữ liệu xe.</td></tr>
                   ) : filteredBuses.map((bus) => (
                      <tr key={bus.id} className="hover:bg-slate-50/80 transition-colors group">
                         <td className="px-6 py-4 align-middle font-bold text-slate-900">
                            {bus.licensePlate}
                         </td>
                         <td className="px-6 py-4 align-middle">
                            {bus.status === 'ACTIVE' && (
                               <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded text-xs font-semibold flex items-center w-fit gap-1">
                                  <UserCheck size={12} /> Hoạt động
                               </span>
                            )}
                            {bus.status === 'MAINTENANCE' && (
                               <span className="text-orange-600 bg-orange-50 border border-orange-100 px-2 py-1 rounded text-xs font-semibold flex items-center w-fit gap-1">
                                  <Wrench size={12} /> Bảo dưỡng
                               </span>
                            )}
                            {bus.status === 'INACTIVE' && (
                               <span className="text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded text-xs font-semibold flex items-center w-fit gap-1">
                                  Ngừng chạy
                               </span>
                            )}
                         </td>
                         <td className="px-6 py-4 align-middle">
                            {bus.isShareholding ? (
                                <span className="text-blue-600 font-medium text-xs flex items-center gap-1">
                                    <PieChart size={14} /> Có cổ phần
                                </span>
                            ) : (
                                <span className="text-slate-500 text-xs">Không cổ phần</span>
                            )}
                         </td>
                         <td className="px-6 py-4 align-middle">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                bus.isPartner 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                               {bus.isPartner ? 'Xe đối tác' : 'Xe nhà'}
                            </span>
                         </td>
                         <td className="px-6 py-4 align-middle max-w-[200px] truncate text-slate-500 text-xs">
                            {bus.note || ''}
                         </td>
                         <td className="px-6 py-4 align-middle text-right">
                            <div className="flex justify-end gap-3">
                               <button 
                                  onClick={() => { setEditingBus(bus); setIsModalOpen(true); }}
                                  className="h-10 w-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm"
                                  title="Chỉnh sửa"
                               >
                                  <Edit size={18} />
                               </button>
                               <button 
                                  onClick={() => setDeleteId(bus.id)}
                                  className="h-10 w-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
                                  title="Xóa xe"
                               >
                                  <Trash2 size={18} />
                               </button>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>

       <BusModal 
          isOpen={isModalOpen} 
          onClose={() => { setIsModalOpen(false); setEditingBus(undefined); }} 
          bus={editingBus}
          onSave={handleSave}
       />

       <AlertDialog 
         isOpen={!!deleteId}
         onClose={() => setDeleteId(null)}
         onConfirm={handleConfirmDelete}
         title="Xóa xe?"
         description="Hành động này không thể hoàn tác. Dữ liệu lịch sử của xe này vẫn sẽ được giữ lại trong các giao dịch cũ."
         confirmText="Xóa bỏ"
         variant="destructive"
       />
    </div>
  );
};