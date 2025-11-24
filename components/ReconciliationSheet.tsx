import React, { useState, useEffect, useMemo } from 'react';
import { Sheet } from './ui/Sheet';
import { Save, Trash2, Plus, Archive, Wallet, Landmark, Banknote, X, PieChart, Users, Clock } from 'lucide-react';
import { Button } from './ui/Button';
import { SmartInput } from './ui/SmartInput';
import { toast } from 'sonner';
import { db } from '../services/database';
import { ReconItem, ReconciliationReport, Bus } from '../types';

interface ReconciliationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number; // The theoretical TOTAL surplus from the system
  monthLabel: string;
  month: number;
  year: number;
  variant?: 'modal' | 'sidebar'; // New prop
}

export const ReconciliationSheet: React.FC<ReconciliationSheetProps> = ({
  isOpen,
  onClose,
  currentBalance,
  monthLabel,
  month,
  year,
  variant = 'modal'
}) => {
  // 1. Assets State
  const [cashStorage, setCashStorage] = useState(0); // Kho
  const [cashWallet, setCashWallet] = useState(0);   // Ví
  const [bankAccount, setBankAccount] = useState(0); // Tài khoản
  
  // 2. Adjustments State
  const [paidItems, setPaidItems] = useState<ReconItem[]>([]); // Các khoản đã chi
  const [debtItems, setDebtItems] = useState<ReconItem[]>([]); // Các khoản nợ

  // 3. Deductions State
  const [existingMoney, setExistingMoney] = useState(0); // Tiền hiện có (Đã cất/Đã chốt)

  // 4. Bus Data for Split Calculation
  const [mainBus, setMainBus] = useState<Bus | undefined>(undefined);
  
  // Loading State
  const [isLoading, setIsLoading] = useState(false);

  // Fetch data on open or when variant/month changes
  useEffect(() => {
    if (isOpen || variant === 'sidebar') {
      loadData();
    }
  }, [isOpen, month, year, variant]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await db.getReconciliation(month, year);
      const buses = await db.getBuses();
      // Find the main shareholding bus
      const foundBus = buses.find(b => b.isShareholding);
      setMainBus(foundBus);

      if (data) {
        setCashStorage(data.cashStorage);
        setCashWallet(data.cashWallet);
        setBankAccount(data.bankAccount);
        setExistingMoney(data.existingMoney);
        setPaidItems(data.paidItems || []);
        setDebtItems(data.debtItems || []);
      } else {
        // Reset if no data found for this month
        setCashStorage(0);
        setCashWallet(0);
        setBankAccount(0);
        setExistingMoney(0);
        setPaidItems([]);
        setDebtItems([]);
      }
    } catch (e) {
      console.error("Error loading reconciliation data", e);
      toast.error("Không thể tải dữ liệu đối soát");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Calculations for Target Surplus ---
  const breakdown = useMemo(() => {
    if (!mainBus) {
       // Fallback logic if no bus config found: simple 50% split
       const half = currentBalance / 2;
       return {
          totalTarget: half,
          ownerShare: half,
          shareholders: []
       };
    }

    // Calculate based on bus percentages
    const ownerAmount = (currentBalance * mainBus.sharePercentage) / 100;
    const shareholders = (mainBus.shareholders || []).map(sh => ({
        name: sh.name,
        amount: (currentBalance * sh.percentage) / 100
    }));
    
    const totalHeld = shareholders.reduce((acc, curr) => acc + curr.amount, 0);
    const totalTarget = ownerAmount + totalHeld;

    return {
        totalTarget,
        ownerShare: ownerAmount,
        shareholders
    };
  }, [currentBalance, mainBus]);

  const busSurplusTarget = breakdown.totalTarget;

  // Dynamic List Handlers
  const addItem = (list: ReconItem[], setList: React.Dispatch<React.SetStateAction<ReconItem[]>>) => {
    setList([...list, { id: Date.now().toString(), description: '', amount: 0 }]);
  };

  const updateItem = (
    list: ReconItem[], 
    setList: React.Dispatch<React.SetStateAction<ReconItem[]>>, 
    id: string, 
    field: keyof ReconItem, 
    val: any
  ) => {
    setList(list.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  const removeItem = (list: ReconItem[], setList: React.Dispatch<React.SetStateAction<ReconItem[]>>, id: string) => {
    setList(list.filter(item => item.id !== id));
  };

  // Totals
  const totalPaid = paidItems.reduce((sum, item) => sum + item.amount, 0);
  const totalDebt = debtItems.reduce((sum, item) => sum + item.amount, 0);
  
  const totalCash = cashStorage + cashWallet;
  const totalRealAssets = totalCash + bankAccount;

  // Formula
  const totalAdjustedAssets = totalRealAssets + totalPaid - totalDebt;
  const discrepancy = totalAdjustedAssets - busSurplusTarget - existingMoney;
  
  const formatNumber = (val: number) => new Intl.NumberFormat('vi-VN').format(Math.round(val));

  const handleSaveReport = async () => {
    try {
      const report: ReconciliationReport = {
        id: `recon_${month}_${year}`,
        month,
        year,
        cashStorage,
        cashWallet,
        bankAccount,
        existingMoney,
        paidItems,
        debtItems,
        lastUpdated: new Date().toISOString()
      };

      await db.saveReconciliation(report);
      toast.success("Đã lưu phiếu đối soát thành công!");
      if (variant === 'modal') onClose();
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi lưu dữ liệu");
    }
  };

  // Styles
  const sectionClass = "space-y-2 pt-2";
  const labelClass = "text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block";
  const inputClass = "w-full pl-9 pr-2 py-1.5 bg-white border border-slate-200 rounded text-right font-bold text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary/10 outline-none transition-all text-sm h-10";
  const readOnlyClass = "w-full h-10 flex items-center justify-end bg-slate-50 px-2 rounded border border-slate-200 text-slate-500 cursor-not-allowed font-bold text-sm";
  const dynamicItemClass = "grid grid-cols-[24px_1fr_100px] gap-2 items-center mb-2 animate-in fade-in slide-in-from-top-1 duration-200";

  // Result Styles Calculation
  let resultBg = 'bg-slate-50';
  let resultBorder = 'border-slate-200';
  let resultText = 'text-slate-900';
  let statusLabel = 'Chưa nhập liệu';

  if (discrepancy === 0) {
      resultBg = 'bg-green-50';
      resultBorder = 'border-green-200';
      resultText = 'text-green-700';
      statusLabel = 'Cân bằng';
  } else if (discrepancy > 0) {
      resultBg = 'bg-blue-50';
      resultBorder = 'border-blue-200';
      resultText = 'text-blue-700';
      statusLabel = 'Thừa tiền';
  } else {
      resultBg = 'bg-red-50';
      resultBorder = 'border-red-200';
      resultText = 'text-red-700';
      statusLabel = 'Thiếu tiền';
  }

  // Content Renderer
  const renderContent = () => (
    <div className="space-y-5 pb-4">
        {/* Header Info */}
        <div className="flex items-center justify-between -mt-2 mb-2">
           <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
             Đơn vị: Nghìn đồng
           </span>
           {isLoading && <span className="text-xs text-slate-400 animate-pulse">Đang tải...</span>}
        </div>
        
        {/* 1. TÀI SẢN THỰC TẾ (Tiền mặt + Ngân hàng) */}
        <div className="space-y-3">
          {/* Hàng 1: Kho - Ví - Tổng */}
          <div className="grid grid-cols-3 gap-3 items-end">
            <div className="relative group">
               <label className={labelClass}>Tại Kho</label>
               <div className="relative">
                 <Archive size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                 <SmartInput value={cashStorage} onCommit={setCashStorage} className={inputClass} />
               </div>
            </div>
            <div className="relative group">
               <label className={labelClass}>Trong Ví</label>
               <div className="relative">
                 <Wallet size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                 <SmartInput value={cashWallet} onCommit={setCashWallet} className={inputClass} />
               </div>
            </div>
            <div>
               <label className={labelClass}>Tổng tiền mặt</label>
               <div className={readOnlyClass}>
                  {formatNumber(totalCash)}
               </div>
            </div>
          </div>

          {/* Hàng 2: Ngân hàng */}
          <div className="relative group">
             <label className={labelClass}>Tài khoản (Ngân hàng)</label>
             <div className="relative">
               <Landmark size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
               <SmartInput value={bankAccount} onCommit={setBankAccount} className={inputClass} />
             </div>
          </div>
        </div>

        {/* 2. DỮ LIỆU ĐỐI CHIẾU (Hệ thống & Đã cất) */}
        <div className="space-y-3">
           <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Archive size={14} className="text-slate-400"/>
              Dữ liệu đối chiếu
           </h3>
           
           {/* Thẻ Tổng Thanh Toán - Re-styled as per request */}
           <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
              {/* Header */}
              <div className="bg-slate-900 px-4 py-1 flex justify-between items-center text-white">
                <div className="flex items-center gap-2.5">
                   <div className="p-1.5 bg-white/10 rounded-lg border border-white/10">
                      <Clock size={16} className="text-slate-200" />
                   </div>
                   <span className="text-xs font-bold uppercase tracking-wider text-slate-100">TỔNG THANH TOÁN</span>
                </div>
                <span className="text-xl font-bold tracking-tight">{formatNumber(breakdown.totalTarget)}</span>
              </div>
              
              {/* Body */}
              <div className="p-3 bg-white space-y-2">
                 {/* Row 1: Chia cổ phần */}
                 <div className="flex justify-between items-center px-3 py-1 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                          <PieChart size={14} />
                       </div>
                       <span className="text-sm font-bold text-slate-700">Chia cổ phần</span>
                    </div>
                    <span className="font-bold text-base text-slate-900">{formatNumber(breakdown.ownerShare)}</span>
                 </div>

                 {/* Row 2+: Shareholders */}
                 {breakdown.shareholders.map((sh, idx) => (
                    <div key={idx} className="flex justify-between items-center px-3 py-1 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200">
                              <Users size={14} />
                           </div>
                           <span className="text-sm font-bold text-slate-700">{sh.name}</span>
                        </div>
                        <span className="font-bold text-base text-slate-900">{formatNumber(sh.amount)}</span>
                    </div>
                 ))}
              </div>
           </div>

           {/* Tiền hiện có */}
           <div className="bg-slate-50 rounded-lg border border-slate-200 p-2">
              <div className="flex justify-between items-center">
                 <span className="text-sm font-medium text-slate-600 pl-2">Tiền hiện có</span>
                 <div className="w-[120px] relative group">
                    <Banknote size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                    <SmartInput value={existingMoney} onCommit={setExistingMoney} className={`${inputClass} bg-white border-slate-300`} />
                 </div>
              </div>
           </div>
        </div>

        {/* 3. CÁC KHOẢN ĐÃ CHI */}
        <div className={sectionClass}>
           <div className="flex justify-between items-center">
              <label className={labelClass}>Các khoản đã chi (Chưa trừ sổ)</label>
              <span className="text-xs font-bold text-green-600">+{formatNumber(totalPaid)}</span>
           </div>
           
           <div className="bg-white rounded-lg border border-slate-200 p-2 shadow-sm">
              {paidItems.length === 0 && (
                <div className="text-center py-2 text-xs text-slate-400 italic">Chưa có khoản chi nào</div>
              )}
              {paidItems.map(item => (
                 <div key={item.id} className={dynamicItemClass}>
                    <button onClick={() => removeItem(paidItems, setPaidItems, item.id)} className="text-slate-400 hover:text-red-500 flex justify-center">
                       <Trash2 size={14} />
                    </button>
                    <input 
                      type="text" 
                      placeholder="Tên khoản chi..."
                      className="bg-transparent text-sm focus:outline-none placeholder:text-slate-400 w-full border-b border-transparent focus:border-slate-200 px-1 transition-colors"
                      value={item.description}
                      onChange={(e) => updateItem(paidItems, setPaidItems, item.id, 'description', e.target.value)}
                    />
                    <SmartInput 
                       value={item.amount} 
                       onCommit={(val) => updateItem(paidItems, setPaidItems, item.id, 'amount', val)}
                       className="h-7 w-full text-right text-sm bg-slate-50 border border-slate-200 rounded px-1 focus:border-green-500 focus:ring-1 focus:ring-green-200 outline-none font-medium"
                    />
                 </div>
              ))}
              <button 
                 onClick={() => addItem(paidItems, setPaidItems)}
                 className="w-full flex items-center justify-center gap-1 text-xs font-medium text-slate-500 hover:text-green-600 hover:bg-green-50 py-1.5 rounded border border-dashed border-slate-200 hover:border-green-200 transition-all mt-1"
              >
                 <Plus size={14} /> Thêm khoản đã chi
              </button>
           </div>
        </div>

        {/* 4. CÁC KHOẢN NỢ */}
        <div className={sectionClass}>
           <div className="flex justify-between items-center">
              <label className={labelClass}>Các khoản nợ (Vay / Cầm hộ)</label>
              <span className="text-xs font-bold text-red-600">-{formatNumber(totalDebt)}</span>
           </div>
           
           <div className="bg-white rounded-lg border border-slate-200 p-2 shadow-sm">
              {debtItems.length === 0 && (
                <div className="text-center py-2 text-xs text-slate-400 italic">Chưa có khoản nợ nào</div>
              )}
              {debtItems.map(item => (
                 <div key={item.id} className={dynamicItemClass}>
                    <button onClick={() => removeItem(debtItems, setDebtItems, item.id)} className="text-slate-400 hover:text-red-500 flex justify-center">
                       <Trash2 size={14} />
                    </button>
                    <input 
                      type="text" 
                      placeholder="Tên khoản nợ..."
                      className="bg-transparent text-sm focus:outline-none placeholder:text-slate-400 w-full border-b border-transparent focus:border-slate-200 px-1 transition-colors"
                      value={item.description}
                      onChange={(e) => updateItem(debtItems, setDebtItems, item.id, 'description', e.target.value)}
                    />
                    <SmartInput 
                       value={item.amount} 
                       onCommit={(val) => updateItem(debtItems, setDebtItems, item.id, 'amount', val)}
                       className="h-7 w-full text-right text-sm bg-slate-50 border border-slate-200 rounded px-1 focus:border-red-500 focus:ring-1 focus:ring-red-200 outline-none font-medium"
                    />
                 </div>
              ))}
              <button 
                 onClick={() => addItem(debtItems, setDebtItems)}
                 className="w-full flex items-center justify-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 py-1.5 rounded border border-dashed border-slate-200 hover:border-red-200 transition-all mt-1"
              >
                 <Plus size={14} /> Thêm khoản nợ
              </button>
           </div>
        </div>
    </div>
  );

  const renderFooter = () => (
    <div className="space-y-3">
      {/* Result Float Section */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-lg border shadow-sm transition-all duration-300 ${resultBg} ${resultBorder}`}>
          <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Kết quả chênh lệch</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${resultText}`}>{statusLabel}</span>
              </div>
          </div>
          <span className={`text-2xl font-bold tracking-tight ${resultText}`}>
            {discrepancy > 0 ? '+' : ''}{formatNumber(discrepancy)}
          </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {variant === 'modal' && (
           <Button variant="outline" onClick={onClose} className="h-11 flex-1">Đóng</Button>
        )}
        <Button variant="primary" onClick={handleSaveReport} className="h-11 flex-1 font-bold shadow-md">
          <Save size={16} className="mr-2" />
          Lưu kết quả
        </Button>
      </div>
    </div>
  );

  // Render logic based on variant
  if (variant === 'sidebar') {
     return (
        // Changed: Removed shadow-xl and border-l, made full width and clean background
        <div className="flex flex-col h-full bg-white w-full">
           {/* Sidebar Header */}
           <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
               <div>
                  <h2 className="text-lg font-bold text-slate-900">Đối soát tiền mặt</h2>
                  <p className="text-xs text-slate-500">{monthLabel}</p>
               </div>
               <button 
                  onClick={onClose} // Acts as toggle hide
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
           </div>
           
           {/* Sidebar Content */}
           <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
               {renderContent()}
           </div>

           {/* Sidebar Footer */}
           <div className="p-4 border-t border-slate-100 bg-white shrink-0 z-10">
               {renderFooter()}
           </div>
        </div>
     );
  }

  // Default: Modal (Sheet)
  return (
    <Sheet 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Đối soát tiền mặt - ${monthLabel}`}
      width="w-full md:max-w-lg"
      footer={renderFooter()}
    >
      {renderContent()}
    </Sheet>
  );
};