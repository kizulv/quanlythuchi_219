
import React, { useState, useEffect } from 'react';
import { X, Bus as BusIcon, Save, Plus, Trash2, Users, PieChart } from 'lucide-react';
import { Bus, Shareholder } from '../types';
import { Button } from './ui/Button';
import { SmartInput } from './ui/SmartInput';

interface BusModalProps {
  isOpen: boolean;
  onClose: () => void;
  bus?: Bus;
  onSave: (bus: Bus) => void;
}

const emptyBus: Bus = {
  id: '',
  licensePlate: '',
  isPartner: false,
  isShareholding: false,
  status: 'ACTIVE',
  note: '',
  sharePercentage: 100,
  shareholders: []
};

export const BusModal: React.FC<BusModalProps> = ({ isOpen, onClose, bus, onSave }) => {
  const [formData, setFormData] = useState<Bus>(emptyBus);

  useEffect(() => {
    if (isOpen) {
      setFormData(bus ? { 
          ...bus, 
          shareholders: bus.shareholders || [], 
          sharePercentage: bus.sharePercentage !== undefined ? bus.sharePercentage : 100,
          isShareholding: bus.isShareholding !== undefined ? bus.isShareholding : (bus.sharePercentage < 100 || (bus.shareholders && bus.shareholders.length > 0))
      } : emptyBus);
    }
  }, [isOpen, bus]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.licensePlate) {
      alert("Vui lòng nhập biển số xe");
      return;
    }
    // Logic: If not shareholding, clear share data to avoid confusion
    const cleanData = { ...formData };
    if (!formData.isShareholding) {
        cleanData.sharePercentage = 100;
        cleanData.shareholders = [];
    }
    onSave(cleanData);
    onClose();
  };

  // Shareholder Management
  const addShareholder = () => {
    setFormData({
      ...formData,
      shareholders: [
        ...formData.shareholders,
        { id: Date.now().toString(), name: '', percentage: 0 }
      ]
    });
  };

  const removeShareholder = (id: string) => {
    setFormData({
      ...formData,
      shareholders: formData.shareholders.filter(s => s.id !== id)
    });
  };

  const updateShareholder = (id: string, field: keyof Shareholder, value: any) => {
    setFormData({
      ...formData,
      shareholders: formData.shareholders.map(s => s.id === id ? { ...s, [field]: value } : s)
    });
  };

  const dynamicGridClass = "grid grid-cols-[24px_1fr_90px] gap-2 items-center animate-in fade-in slide-in-from-top-2 duration-200";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      
      <div className="relative z-[70] w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <BusIcon size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {bus?.id ? 'Cập nhật thông tin xe' : 'Thêm xe mới'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
            <form id="busForm" onSubmit={handleSubmit} className="space-y-5">
            {/* Biển số & Trạng thái */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Biển kiểm soát <span className="text-red-500">*</span></label>
                    <input 
                    type="text" 
                    className="w-full h-10 px-3 rounded-md border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none uppercase font-semibold placeholder:normal-case bg-white text-slate-900"
                    placeholder="VD: 25F-002.19"
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({...formData, licensePlate: e.target.value.toUpperCase()})}
                    autoFocus
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Trạng thái</label>
                    <select 
                    className="w-full h-10 px-3 rounded-md border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white text-slate-900"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="MAINTENANCE">Bảo dưỡng</option>
                    <option value="INACTIVE">Ngừng hoạt động</option>
                    </select>
                </div>
            </div>

            {/* Loại xe */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Loại xe</label>
                    <select 
                        className="w-full h-10 px-3 rounded-md border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white font-medium text-slate-900"
                        value={formData.isShareholding ? 'share' : 'standard'}
                        onChange={(e) => setFormData({...formData, isShareholding: e.target.value === 'share'})}
                    >
                        <option value="share">Xe Cổ Phần</option>
                        <option value="standard">Xe Không Cổ Phần</option>
                    </select>
                </div>
                
                {/* Xe Đối Tác - Giữ lại để đảm bảo logic 2 Xe hoạt động đúng */}
                <div className="flex items-center h-10 mt-6">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900"
                            checked={formData.isPartner}
                            onChange={(e) => setFormData({...formData, isPartner: e.target.checked})}
                        />
                        <span className="text-sm font-medium text-slate-700">Là xe đối tác</span>
                    </label>
                </div>
            </div>

            {/* Cổ phần - Chỉ hiện khi chọn Xe Cổ Phần */}
            {formData.isShareholding && (
                <div className="space-y-4 pt-4 border-t border-slate-100 bg-slate-50/50 -mx-6 px-6 pb-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                        <PieChart size={18} className="text-blue-600"/>
                        <span>Thông tin cổ phần</span>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Tỉ lệ cổ phần của xe (%)</label>
                        <SmartInput 
                            value={formData.sharePercentage}
                            onCommit={(val) => setFormData({...formData, sharePercentage: val})}
                            className="w-full h-10 px-3 rounded-md border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none text-right font-semibold bg-white text-slate-900"
                        />
                    </div>

                    {/* Danh sách cầm hộ */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Users size={16} className="text-slate-400"/>
                                Cầm hộ cổ phần
                            </label>
                        </div>

                        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2 shadow-sm">
                            {formData.shareholders.length === 0 && (
                                <div className="text-center py-2 text-xs text-slate-400 italic">Chưa có người cầm hộ cổ phần</div>
                            )}
                            
                            {formData.shareholders.map((sh) => (
                                <div key={sh.id} className={dynamicGridClass}>
                                    <button 
                                        type="button"
                                        onClick={() => removeShareholder(sh.id)}
                                        className="text-slate-400 hover:text-red-500 flex justify-center hover:bg-red-50 p-1 rounded transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    
                                    <input
                                        type="text"
                                        placeholder="Tên người cầm hộ..."
                                        className="w-full h-8 rounded border border-slate-200 bg-white px-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all text-slate-900"
                                        value={sh.name}
                                        onChange={(e) => updateShareholder(sh.id, 'name', e.target.value)}
                                    />
                                    
                                    <div className="relative">
                                        <SmartInput 
                                            value={sh.percentage}
                                            onCommit={(val) => updateShareholder(sh.id, 'percentage', val)}
                                            className="w-full h-8 text-right rounded border border-slate-200 bg-white px-2 text-sm font-medium focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none pr-6 text-slate-900"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                                    </div>
                                </div>
                            ))}

                            <button 
                                type="button"
                                onClick={addShareholder}
                                className="w-full flex items-center justify-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 py-2 rounded border border-dashed border-slate-300 hover:border-blue-300 transition-all mt-2"
                            >
                                <Plus size={14} /> Thêm người cầm hộ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Ghi chú</label>
                <textarea 
                className="w-full h-20 px-3 py-2 rounded-md border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none resize-none text-sm bg-white text-slate-900"
                placeholder="Ghi chú thêm..."
                value={formData.note || ''}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                />
            </div>
            </form>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
            <Button variant="outline" onClick={onClose} className="flex-1 h-11 bg-white" type="button">Hủy</Button>
            <Button variant="primary" className="flex-1 h-11 bg-slate-900 hover:bg-slate-800" type="submit" form="busForm">
              <Save size={18} className="mr-2" /> Lưu thông tin
            </Button>
        </div>
      </div>
    </div>
  );
};
