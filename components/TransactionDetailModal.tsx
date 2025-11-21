
import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Calculator,
  Check,
  Image as ImageIcon,
  Upload,
  Loader2,
  Plus,
  Trash2,
  Lock,
} from "lucide-react";
import { Transaction, TransactionBreakdown, OtherRevenueItem, OtherExpenseItem, PrivateExpenseItem } from "../types";
import { Button } from "./ui/Button";
import {
  processAndUploadImage,
  getProcessedDataUrl,
} from "../services/imageService";

interface TransactionDetailModalProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTransaction: Transaction) => void;
}

const defaultBreakdown: TransactionBreakdown = {
  revenueDown: 0,
  revenueUp: 0,
  revenueOther: 0,
  otherRevenueItems: [],
  expenseFuel: 0,
  expenseFixed: 0,
  expensePolice: 0,
  expenseRepair: 0,
  expenseOther: 0,
  otherExpenseItems: [],
  privateExpenseItems: [],
  isShared: true,
  busId: "25F-002.19",
  partnerBusId: "25F-000.19",
};

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSave,
}) => {
  const [breakdown, setBreakdown] =
    useState<TransactionBreakdown>(defaultBreakdown);
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  
  // State for dynamic items
  const [otherRevenues, setOtherRevenues] = useState<OtherRevenueItem[]>([]);
  const [otherExpenses, setOtherExpenses] = useState<OtherExpenseItem[]>([]);
  const [privateExpenses, setPrivateExpenses] = useState<PrivateExpenseItem[]>([]);

  // State for manual balance entry (when revenue and expenses are 0)
  const [customTotalBalance, setCustomTotalBalance] = useState(0);
  
  // NEW: State for Total Expense Input (Since Fixed Expense is now calculated)
  const [totalExpenseInput, setTotalExpenseInput] = useState(0);

  // Track the auto-generated note part when the modal opens to avoid duplication on save
  const [initialAutoNote, setInitialAutoNote] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Format value for display
  const formatForDisplay = (val: number) =>
    new Intl.NumberFormat("vi-VN").format(val);

  // Helper: Parse input string to number
  const parseInput = (value: string) => 
    parseInt(value.replace(/,/g, "").replace(/\./g, ""), 10) || 0;

  useEffect(() => {
    if (transaction) {
      const currentBreakdown = transaction.breakdown || defaultBreakdown;
      setBreakdown(currentBreakdown);
      setNote(transaction.note);
      setImageUrl(transaction.imageUrl);

      // Initialize dynamic other revenue items
      let initRev: OtherRevenueItem[] = [];
      if (currentBreakdown.otherRevenueItems && currentBreakdown.otherRevenueItems.length > 0) {
        initRev = currentBreakdown.otherRevenueItems;
      } else if (currentBreakdown.revenueOther > 0) {
        initRev = [{ id: 'legacy-rev-1', description: 'Thu khác (cũ)', amount: currentBreakdown.revenueOther }];
      }
      setOtherRevenues(initRev);

      // Initialize dynamic other expense items
      let initExp: OtherExpenseItem[] = [];
      if (currentBreakdown.otherExpenseItems && currentBreakdown.otherExpenseItems.length > 0) {
        initExp = currentBreakdown.otherExpenseItems;
      } else if (currentBreakdown.expenseOther > 0) {
        initExp = [{ id: 'legacy-exp-1', description: 'Chi khác (cũ)', amount: currentBreakdown.expenseOther }];
      }
      setOtherExpenses(initExp);

      // Initialize dynamic private expense items
      let initPriv: PrivateExpenseItem[] = [];
      if (currentBreakdown.privateExpenseItems && currentBreakdown.privateExpenseItems.length > 0) {
        initPriv = currentBreakdown.privateExpenseItems;
      } else if (transaction.privateExpense > 0) {
        // Backward compatibility
        initPriv = [{ id: 'legacy-priv-1', description: 'Chi riêng (cũ)', amount: transaction.privateExpense }];
      }
      setPrivateExpenses(initPriv);

      // Determine initial values to detect manual mode
      const totalRevenueCalc = currentBreakdown.revenueDown + currentBreakdown.revenueUp + (initRev.reduce((s, i) => s + i.amount, 0));
      const totalExpenseCalc = currentBreakdown.expenseFuel + currentBreakdown.expenseFixed + currentBreakdown.expensePolice + currentBreakdown.expenseRepair + (initExp.reduce((s, i) => s + i.amount, 0));
      
      // Initialize Total Expense Input
      setTotalExpenseInput(totalExpenseCalc);

      // If calculated revenue and expense are 0, but totalBalance exists, treat as manual entry
      if (totalRevenueCalc === 0 && totalExpenseCalc === 0 && transaction.totalBalance !== 0) {
          setCustomTotalBalance(transaction.totalBalance);
      } else {
          setCustomTotalBalance(0);
      }

      // Calculate Initial Auto Note String based on loaded items
      const initialDetails: string[] = [];
      initRev.forEach(item => {
        if (item.description && item.amount !== 0) {
          initialDetails.push(`${item.description} (${formatForDisplay(item.amount)})`);
        }
      });
      initExp.forEach(item => {
         if (item.description && item.amount !== 0) {
          initialDetails.push(`${item.description} (-${formatForDisplay(item.amount)})`);
        }
      });
      initPriv.forEach(item => {
         if (item.description && item.amount !== 0) {
          initialDetails.push(`${item.description} (-${formatForDisplay(item.amount)})`);
        }
      });
      setInitialAutoNote(initialDetails.join('. '));
    }
  }, [transaction]);

  if (!isOpen) return null;

  // Calculate totals from dynamic lists
  const totalRevenueOther = otherRevenues.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenseOther = otherExpenses.reduce((sum, item) => sum + item.amount, 0);
  
  // Only include private expenses in calculation if NOT shared (Đi 1 xe)
  const totalPrivateExpense = !breakdown.isShared 
    ? privateExpenses.reduce((sum, item) => sum + item.amount, 0) 
    : 0;

  // REVENUE: Bottom-up (Sum of components)
  const totalRevenue =
    breakdown.revenueDown + breakdown.revenueUp + totalRevenueOther;
    
  // EXPENSE: Top-down Logic
  // Formula: Fixed Expense = Total Input - (Fuel + Police + Repair + Others)
  const totalExpense = totalExpenseInput;

  // Determine if we are in "Manual Balance Mode"
  const isManualBalanceMode = totalRevenue === 0 && totalExpense === 0;
    
  const totalBalance = isManualBalanceMode 
    ? customTotalBalance 
    : totalRevenue - totalExpense;

  // Rule: If going 1 car (!isShared) -> split = total / 2. If 2 cars (isShared) -> split = total.
  const splitBalance = !breakdown.isShared ? totalBalance / 2 : totalBalance;

  const remainingBalance = splitBalance - totalPrivateExpense;

  // --- CORE LOGIC FOR FIXED EXPENSE CALCULATION ---
  const updateBreakdownWithFixedCalc = (
    newTotal: number, 
    currentBd: TransactionBreakdown, 
    currentOtherExp: OtherExpenseItem[]
  ) => {
    const otherSum = currentOtherExp.reduce((sum, item) => sum + item.amount, 0);
    const subTotal = currentBd.expenseFuel + currentBd.expensePolice + currentBd.expenseRepair + otherSum;
    const newFixed = newTotal - subTotal;
    
    setBreakdown({
      ...currentBd,
      expenseFixed: newFixed
    });
  };

  // Handle Revenue inputs (Standard)
  const handleRevenueChange = (
    field: keyof TransactionBreakdown,
    value: string
  ) => {
    const rawInput = parseInput(value);
    setBreakdown((prev) => ({ ...prev, [field]: rawInput }));
  };

  // Handle Expense Component inputs (Recalculate Fixed Expense)
  const handleExpenseComponentChange = (
    field: keyof TransactionBreakdown,
    value: string
  ) => {
    const rawInput = parseInput(value);
    const nextBreakdown = { ...breakdown, [field]: rawInput };
    updateBreakdownWithFixedCalc(totalExpenseInput, nextBreakdown, otherExpenses);
  };

  // Handle Total Expense Input Change
  const handleTotalExpenseChange = (value: string) => {
    const rawInput = parseInput(value);
    setTotalExpenseInput(rawInput);
    updateBreakdownWithFixedCalc(rawInput, breakdown, otherExpenses);
  };

  // --- Dynamic Items Logic ---
  
  // Revenue
  const addOtherRevenueItem = () => {
    setOtherRevenues([...otherRevenues, { id: Date.now().toString(), description: '', amount: 0 }]);
  };
  const removeOtherRevenueItem = (id: string) => {
    setOtherRevenues(otherRevenues.filter(item => item.id !== id));
  };
  const updateOtherRevenueItem = (id: string, field: keyof OtherRevenueItem, value: any) => {
    setOtherRevenues(otherRevenues.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // Expense (Updates trigger Fixed Expense recalculation)
  const addOtherExpenseItem = () => {
    const newItems = [...otherExpenses, { id: Date.now().toString(), description: '', amount: 0 }];
    setOtherExpenses(newItems);
    updateBreakdownWithFixedCalc(totalExpenseInput, breakdown, newItems);
  };
  const removeOtherExpenseItem = (id: string) => {
    const newItems = otherExpenses.filter(item => item.id !== id);
    setOtherExpenses(newItems);
    updateBreakdownWithFixedCalc(totalExpenseInput, breakdown, newItems);
  };
  const updateOtherExpenseItem = (id: string, field: keyof OtherExpenseItem, value: any) => {
    const newItems = otherExpenses.map(item => item.id === id ? { ...item, [field]: value } : item);
    setOtherExpenses(newItems);
    if (field === 'amount') {
        updateBreakdownWithFixedCalc(totalExpenseInput, breakdown, newItems);
    }
  };

  // Private Expense
  const addPrivateExpenseItem = () => {
    setPrivateExpenses([...privateExpenses, { id: Date.now().toString(), description: '', amount: 0 }]);
  };
  const removePrivateExpenseItem = (id: string) => {
    setPrivateExpenses(privateExpenses.filter(item => item.id !== id));
  };
  const updatePrivateExpenseItem = (id: string, field: keyof PrivateExpenseItem, value: any) => {
    setPrivateExpenses(privateExpenses.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBreakdown((prev) => ({ ...prev, isShared: e.target.checked }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        const preview = await getProcessedDataUrl(file);
        setImageUrl(preview);
        const processedUrl = await processAndUploadImage(file, transaction.date);
        setImageUrl(processedUrl);
      } catch (error) {
        console.error("Upload failed:", error);
        alert("Có lỗi khi tải ảnh lên. Vui lòng thử lại.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSave = () => {
    // Generate auto content for note from dynamic items
    const autoDetails: string[] = [];
    
    otherRevenues.forEach(item => {
      if (item.description && item.amount !== 0) {
        autoDetails.push(`${item.description} (${formatForDisplay(item.amount)})`);
      }
    });

    otherExpenses.forEach(item => {
       if (item.description && item.amount !== 0) {
        autoDetails.push(`${item.description} (-${formatForDisplay(item.amount)})`);
      }
    });

    // Only add private expenses to note if not shared (visible)
    if (!breakdown.isShared) {
      privateExpenses.forEach(item => {
         if (item.description && item.amount !== 0) {
          autoDetails.push(`${item.description} (-${formatForDisplay(item.amount)})`);
        }
      });
    }

    const newAutoNoteString = autoDetails.join('. ');
    let finalNote = note;

    // Smart Clean
    if (initialAutoNote && finalNote.includes(initialAutoNote)) {
      finalNote = finalNote.replace(initialAutoNote, "");
    }
    finalNote = finalNote.trim();
    while (finalNote.endsWith('.') || finalNote.endsWith(' ')) {
        finalNote = finalNote.slice(0, -1);
    }
    if (newAutoNoteString) {
        if (finalNote.length > 0) {
             finalNote = `${finalNote}. ${newAutoNoteString}`;
        } else {
             finalNote = newAutoNoteString;
        }
    }
    finalNote = finalNote.replace(/\s+\./g, '.').replace(/\.\./g, '.').trim();

    const updated: Transaction = {
      ...transaction,
      note: finalNote,
      breakdown: {
        ...breakdown,
        revenueOther: totalRevenueOther,
        otherRevenueItems: otherRevenues,
        expenseOther: totalExpenseOther,
        otherExpenseItems: otherExpenses,
        privateExpenseItems: privateExpenses,
        isShared: breakdown.isShared,
      },
      isShared: breakdown.isShared,
      revenue: totalRevenue,
      sharedExpense: totalExpense, // Updated to use input total
      totalBalance: totalBalance,
      splitBalance: splitBalance,
      privateExpense: totalPrivateExpense,
      remainingBalance: remainingBalance,
      imageUrl: imageUrl,
    };
    onSave(updated);
  };

  // Common Grid column class to ensure alignment
  // 1fr for label, 160px for input
  const gridClass = "grid grid-cols-[1fr_160px] gap-4 items-center";
  const dynamicGridClass = "grid grid-cols-[32px_1fr_160px] gap-2 items-center";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6 font-sans">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Left Side: Image Viewer */}
        <div className="w-full md:w-1/2 bg-slate-900 relative flex flex-col group border-r border-slate-800">
          <div className="absolute top-4 left-4 text-white font-semibold z-10 bg-black/50 px-3 py-1 rounded-full backdrop-blur-md border border-white/10 text-sm">
            {transaction.date}
          </div>

          <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Sổ ghi chép"
                className="w-full h-full object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800">
                <ImageIcon size={64} className="mb-4 opacity-50" />
                <p className="text-sm font-medium">Chưa có hình ảnh sổ sách</p>
                <p className="text-xs mt-2 opacity-70">
                  Upload ảnh sổ viết tay để đối chiếu
                </p>
              </div>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-black/70 z-20 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                <Loader2 size={40} className="animate-spin mb-2" />
                <span className="text-sm font-medium">
                  Đang xử lý & nén ảnh...
                </span>
              </div>
            )}
          </div>

          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 z-10 px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
            />
            <Button
              variant="primary"
              className="shadow-xl bg-white text-slate-900 hover:bg-slate-100 border-0 font-medium"
              onClick={triggerUpload}
              disabled={isUploading}
            >
              <Upload size={18} className="mr-2" />
              {imageUrl ? "Thay ảnh khác" : "Tải ảnh lên"}
            </Button>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 bg-white flex flex-col h-full text-slate-900">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
              <h2 className="font-bold text-lg text-slate-900">Chi tiết đối soát</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                  {transaction.date}
                </span>
                <span>•</span>
                <span>Đơn vị: Nghìn đồng</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            
            {/* CONFIG SECTION */}
            <section className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
               <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-3 cursor-pointer group select-none">
                     <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          checked={breakdown.isShared} 
                          onChange={handleCheckboxChange}
                          className="peer h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 transition-all cursor-pointer"
                        />
                     </div>
                     <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                        Chế độ đi 2 xe (Ăn chia)
                     </span>
                  </label>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Xe chính</label>
                     <select 
                        className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
                        value={breakdown.busId}
                        onChange={(e) => setBreakdown({ ...breakdown, busId: e.target.value })}
                     >
                        <option value="25F-002.19">25F-002.19</option>
                        <option value="29B-123.45">29B-123.45</option>
                     </select>
                  </div>
                  
                  <div className={`space-y-1.5 transition-all duration-200 ${!breakdown.isShared ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100'}`}>
                     <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Xe đối tác</label>
                     <select 
                        className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
                        value={breakdown.partnerBusId}
                        onChange={(e) => setBreakdown({ ...breakdown, partnerBusId: e.target.value })}
                     >
                         <option value="25F-000.19">25F-000.19</option>
                         <option value="15B-999.99">15B-999.99</option>
                     </select>
                  </div>
               </div>
            </section>

            {/* REVENUE SECTION - Boxed */}
            <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
               {/* Header */}
               <div className={`${gridClass} pb-2 border-b border-slate-100`}>
                  <div className="flex items-center gap-2">
                     <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                     <h3 className="font-semibold text-slate-800">Tổng Nguồn thu</h3>
                  </div>
                  <div className="w-full h-10 rounded-md border border-green-200 bg-green-50/50 px-3 flex items-center justify-end">
                     <span className="text-lg font-bold text-green-600">{formatForDisplay(totalRevenue)}</span>
                  </div>
               </div>
               
               <div className="space-y-2">
                  <InputRow label="Chiều xuôi" value={breakdown.revenueDown} onChange={(v) => handleRevenueChange("revenueDown", v)} displayFormatter={formatForDisplay} />
                  <InputRow label="Chiều ngược" value={breakdown.revenueUp} onChange={(v) => handleRevenueChange("revenueUp", v)} displayFormatter={formatForDisplay} />
                  
                  {/* Dynamic Revenue Items */}
                  <div className="space-y-2">
                     {otherRevenues.map((item) => (
                        <div key={item.id} className={dynamicGridClass}>
                           <button 
                              onClick={() => removeOtherRevenueItem(item.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex items-center justify-center"
                              title="Xóa"
                           >
                              <Trash2 size={16} />
                           </button>
                           <input
                              type="text"
                              placeholder="Nhập tên khoản thu..."
                              className="w-full h-9 rounded-md border border-slate-200 bg-slate-50/50 px-3 text-sm focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all placeholder:text-slate-400 font-medium"
                              value={item.description}
                              onChange={(e) => updateOtherRevenueItem(item.id, 'description', e.target.value)}
                           />
                           <input
                              type="text"
                              placeholder="0"
                              className="w-full text-right h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
                              value={formatForDisplay(item.amount)}
                              onChange={(e) => updateOtherRevenueItem(item.id, 'amount', parseInput(e.target.value))}
                           />
                        </div>
                     ))}
                  </div>

                  <div className="pt-1">
                    <button 
                       onClick={addOtherRevenueItem}
                       className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors px-2 py-1.5 rounded-md hover:bg-slate-100 ml-[-8px]"
                    >
                       <Plus size={16} />
                       Thêm khoản thu khác
                    </button>
                  </div>
               </div>
            </section>

            {/* EXPENSE SECTION - Boxed */}
            <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
               {/* Header */}
               <div className={`${gridClass} pb-2 border-b border-slate-100`}>
                  <div className="flex items-center gap-2">
                     <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                     <h3 className="font-semibold text-slate-800">Tổng Chi phí</h3>
                  </div>
                  {/* Total Expense is now editable */}
                  <input
                     type="text"
                     className="w-full text-right h-10 rounded-md border border-red-200 bg-red-50/50 px-3 text-lg font-bold text-red-600 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                     value={formatForDisplay(totalExpenseInput)}
                     onChange={(e) => handleTotalExpenseChange(e.target.value)}
                  />
               </div>
               
               <div className="space-y-2">
                  <InputRow 
                     label="Dầu" 
                     value={breakdown.expenseFuel} 
                     onChange={(v) => handleExpenseComponentChange("expenseFuel", v)} 
                     displayFormatter={formatForDisplay} 
                  />
                  
                  {/* Fixed Expense is now Calculated / Read Only */}
                  <div className={`${gridClass} group py-1`}>
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Chi cố định</span>
                       <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded">Tự động</span>
                    </div>
                    <div className="relative w-full">
                       <input
                         type="text"
                         disabled
                         className="w-full text-right h-9 rounded-md border border-slate-100 bg-slate-100 px-3 text-sm font-medium text-slate-500 cursor-not-allowed"
                         value={formatForDisplay(breakdown.expenseFixed)}
                         readOnly
                       />
                       <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <InputRow 
                     label="Chi luật (CA)" 
                     value={breakdown.expensePolice} 
                     onChange={(v) => handleExpenseComponentChange("expensePolice", v)} 
                     displayFormatter={formatForDisplay} 
                  />
                  <InputRow 
                     label="Sửa chữa" 
                     value={breakdown.expenseRepair} 
                     onChange={(v) => handleExpenseComponentChange("expenseRepair", v)} 
                     displayFormatter={formatForDisplay} 
                  />
                  
                  {/* Dynamic Expense Items */}
                  <div className="space-y-2">
                     {otherExpenses.map((item) => (
                        <div key={item.id} className={dynamicGridClass}>
                           <button 
                              onClick={() => removeOtherExpenseItem(item.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex items-center justify-center"
                              title="Xóa"
                           >
                              <Trash2 size={16} />
                           </button>
                           <input
                              type="text"
                              placeholder="Nhập tên khoản chi..."
                              className="w-full h-9 rounded-md border border-slate-200 bg-slate-50/50 px-3 text-sm focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all placeholder:text-slate-400 font-medium"
                              value={item.description}
                              onChange={(e) => updateOtherExpenseItem(item.id, 'description', e.target.value)}
                           />
                           <input
                              type="text"
                              placeholder="0"
                              className="w-full text-right h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
                              value={formatForDisplay(item.amount)}
                              onChange={(e) => updateOtherExpenseItem(item.id, 'amount', parseInput(e.target.value))}
                           />
                        </div>
                     ))}
                  </div>

                  <div className="pt-1">
                    <button 
                       onClick={addOtherExpenseItem}
                       className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors px-2 py-1.5 rounded-md hover:bg-slate-100 ml-[-8px]"
                    >
                       <Plus size={16} />
                       Thêm khoản chi khác
                    </button>
                  </div>
               </div>
            </section>

            {/* SUMMARY SECTION */}
            <section className="bg-slate-50 rounded-xl border border-slate-200 p-5 shadow-sm">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Tổng kết tài chính</h3>
               <div className="space-y-4">
                  <div className={gridClass}>
                     <span className="text-sm font-medium text-slate-600">Tổng dư (Thu - Chi)</span>
                     {isManualBalanceMode ? (
                        <input
                           type="text"
                           placeholder="Nhập số dư..."
                           className="w-full text-right h-9 rounded-md border border-primary/50 bg-white px-3 text-base font-bold text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                           value={formatForDisplay(customTotalBalance)}
                           onChange={(e) => setCustomTotalBalance(parseInput(e.target.value))}
                        />
                     ) : (
                        <div className="w-full h-9 flex items-center justify-end px-3 border border-transparent">
                            <span className="font-bold text-base text-slate-800">{formatForDisplay(totalBalance)}</span>
                        </div>
                     )}
                  </div>

                  <div className={gridClass}>
                     <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        Dư sau chia
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 rounded text-slate-500 font-semibold">
                           {breakdown.isShared ? 'CHIA 2 XE' : 'CHIA 1 XE (50%)'}
                        </span>
                     </span>
                     <div className="w-full h-9 flex items-center justify-end px-3 border border-transparent">
                        <span className="font-bold text-base text-slate-800">{formatForDisplay(splitBalance)}</span>
                     </div>
                  </div>
                  
                  {!breakdown.isShared && <div className="h-px bg-slate-200 my-2 col-span-2"></div>}

                  {/* Dynamic Private Expenses Logic - Only show if NOT shared (Đi 1 xe) */}
                  {!breakdown.isShared && (
                    <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200 col-span-2">
                       <div className={gridClass}>
                          <span className="text-sm font-medium text-slate-600">Trừ chi riêng</span>
                          <div className="w-full h-9 flex items-center justify-end px-3 border border-transparent">
                            <span className="font-bold text-base text-slate-800">{formatForDisplay(totalPrivateExpense)}</span>
                          </div>
                       </div>
                       
                       <div className="space-y-2 pt-1 pl-[calc(100%-160px-200px)]">
                          {privateExpenses.map((item) => (
                             <div key={item.id} className={dynamicGridClass}>
                                <button 
                                   onClick={() => removePrivateExpenseItem(item.id)}
                                   className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex items-center justify-center"
                                   title="Xóa"
                                >
                                   <Trash2 size={16} />
                                </button>
                                <input
                                   type="text"
                                   placeholder="Nhập khoản chi riêng..."
                                   className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all placeholder:text-slate-400 font-medium"
                                   value={item.description}
                                   onChange={(e) => updatePrivateExpenseItem(item.id, 'description', e.target.value)}
                                />
                                <input
                                   type="text"
                                   placeholder="0"
                                   className="w-full text-right h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
                                   value={formatForDisplay(item.amount)}
                                   onChange={(e) => updatePrivateExpenseItem(item.id, 'amount', parseInput(e.target.value))}
                                />
                             </div>
                          ))}
                       </div>

                       <div className="pt-1">
                          <button 
                             onClick={addPrivateExpenseItem}
                             className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors px-2 py-1.5 rounded-md hover:bg-slate-100 ml-[-8px]"
                          >
                             <Plus size={16} />
                             Thêm khoản chi riêng
                          </button>
                       </div>
                    </div>
                  )}

                  <div className="h-px bg-slate-200 my-2 col-span-2"></div>

                  <div className={`${gridClass} pt-1`}>
                     <span className="text-base font-bold text-slate-900">Dư thực nhận</span>
                     <div className="w-full h-9 flex items-center justify-end px-3 border border-transparent">
                        <span className="text-2xl font-bold text-primary">{formatForDisplay(remainingBalance)}</span>
                     </div>
                  </div>
               </div>
            </section>

            {/* NOTES SECTION */}
            <div className="space-y-2">
               <label className="text-sm font-semibold text-slate-700">Ghi chú</label>
               <textarea
                  className="flex min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50 resize-none shadow-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nhập ghi chú thêm..."
               />
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-slate-100 bg-white flex gap-3 z-10">
            <Button
              variant="outline"
              className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 h-11"
              onClick={onClose}
            >
              Đóng
            </Button>
            <Button
              variant="primary"
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10 h-11"
              onClick={handleSave}
            >
              Lưu lại
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for input rows with new Grid styling
const InputRow = ({
  label,
  value,
  onChange,
  displayFormatter,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  displayFormatter: (v: number) => string;
}) => (
  <div className="grid grid-cols-[1fr_160px] gap-4 items-center group py-1">
    <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors truncate" title={label}>{label}</span>
    <input
      type="text"
      className="w-full text-right h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
      value={displayFormatter(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);
