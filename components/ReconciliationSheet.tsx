
import React, { useState, useEffect } from 'react';
import { Sheet } from './ui/Sheet';
import { Save, Trash2, Plus, Archive, Wallet, Landmark, Banknote } from 'lucide-react';
import { Button } from './ui/Button';
import { SmartInput } from './ui/SmartInput';
import { toast } from 'sonner';
import { db } from '../services/database';
import { ReconItem, ReconciliationReport } from '../types';

interface ReconciliationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number; // The theoretical TOTAL surplus from the system
  monthLabel: string;
  month: number;
  year: number;
}

export const ReconciliationSheet: React.FC<ReconciliationSheetProps> = ({
  isOpen,
  onClose,
  currentBalance,
  monthLabel,
  month,
  year
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
  
  // Loading State
  const [isLoading, setIsLoading] = useState(false);

  // Constants & Calculations
  const busSurplusTarget = currentBalance / 2; // Dư xe phải có

  // Fetch data on open
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, month, year]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await db.getReconciliation(month, year);
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
  
  const formatNumber = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

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
      onClose();
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

  return (
    <Sheet 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Đối soát tiền mặt - ${monthLabel}`}
      width="max-w-lg"
      footer={
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
            <Button variant="outline" onClick={onClose} className="h-11 flex-1">Đóng</Button>
            <Button variant="primary" onClick={handleSaveReport} className="h-11 flex-1 font-bold shadow-md">
              <Save size={16} className="mr-2" />
              Lưu kết quả
            </Button>
          </div>
        </div>
      }
    >
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
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
           <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Archive size={14} className="text-slate-400"/>
              Dữ liệu đối chiếu
           </h3>
           
           {/* Dư xe */}
           <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Tiền dư xe (Theo sổ sách / 2)</span>
              <span className="font-bold text-slate-900">{formatNumber(busSurplusTarget)}</span>
           </div>

           {/* Tiền hiện có */}
           <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Tiền hiện có (Đã cất / Đã chốt)</span>
              <div className="w-[120px] relative group">
                 <Banknote size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                 <SmartInput value={existingMoney} onCommit={setExistingMoney} className={`${inputClass} bg-white border-slate-300`} />
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
    </Sheet>
  );
};
