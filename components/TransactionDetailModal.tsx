
import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Unlock,
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Save,
  Maximize2,
  Users,
  PieChart
} from "lucide-react";
import { Transaction, TransactionBreakdown, OtherRevenueItem, OtherExpenseItem, PrivateExpenseItem, TransactionStatus, Bus } from "../types";
import { Button } from "./ui/Button";
import { AlertDialog } from "./ui/AlertDialog";
import { SmartInput } from "./ui/SmartInput";
import {
  processAndUploadImage,
  getProcessedDataUrl,
} from "../services/imageService";
import { db } from "../services/database";
import { toast } from "sonner";

interface TransactionDetailModalProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTransaction: Transaction) => void;
  onDelete: (id: string) => void;
  onCheckExists?: (date: string) => Transaction | undefined;
  onSwitchToEdit?: (transaction: Transaction) => void;
  paymentDate?: string;
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
  busId: "",
  partnerBusId: "",
};

// --- Calendar Constants ---
const VN_MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];
const VN_WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];


export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onCheckExists,
  onSwitchToEdit,
  paymentDate
}) => {
  const [breakdown, setBreakdown] =
    useState<TransactionBreakdown>(defaultBreakdown);
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  
  // Bus Data State
  const [buses, setBuses] = useState<Bus[]>([]);
  
  // Date & Calendar State
  const [date, setDate] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  // State for dynamic items
  const [otherRevenues, setOtherRevenues] = useState<OtherRevenueItem[]>([]);
  const [otherExpenses, setOtherExpenses] = useState<OtherExpenseItem[]>([]);
  const [privateExpenses, setPrivateExpenses] = useState<PrivateExpenseItem[]>([]);

  // State for Top-Down Expense Calculation (User enters Total, Fixed is calculated)
  const [manualTotalExpense, setManualTotalExpense] = useState(0);

  // State for manual balance entry (when revenue and expenses are 0)
  const [customTotalBalance, setCustomTotalBalance] = useState(0);

  const [initialAutoNote, setInitialAutoNote] = useState("");
  
  // Alert Dialog State
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showExistAlert, setShowExistAlert] = useState(false);
  const [conflictTransaction, setConflictTransaction] = useState<Transaction | null>(null);
  const [showSimpleDuplicateAlert, setShowSimpleDuplicateAlert] = useState(false);
  const [showEmptySaveAlert, setShowEmptySaveAlert] = useState(false);
  const [isMobileImageViewerOpen, setIsMobileImageViewerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPaid = transaction.status === TransactionStatus.PAID;

  // Load Buses
  useEffect(() => {
    const loadBuses = async () => {
      const data = await db.getBuses();
      setBuses(data);
      
      if (!transaction.id && !breakdown.busId) {
        const defaultMainBus = data.find(b => b.isShareholding);
        const mainBusId = defaultMainBus ? defaultMainBus.licensePlate : (data[0]?.licensePlate || "");
        
        const defaultAccompanyingBus = data.find(b => b.licensePlate !== mainBusId);
        
        setBreakdown(prev => ({
            ...prev,
            busId: mainBusId,
            partnerBusId: defaultAccompanyingBus ? defaultAccompanyingBus.licensePlate : prev.partnerBusId
        }));
      }
    };
    if (isOpen) {
        loadBuses();
    }
  }, [isOpen]);

  // Identify Current Selected Bus Object
  const selectedBus = useMemo(() => {
    return buses.find(b => b.licensePlate === breakdown.busId);
  }, [buses, breakdown.busId]);

  const formatForDisplay = (val: number) =>
    new Intl.NumberFormat("vi-VN").format(Math.round(val));

  const generateAutoDetails = (
    revItems: OtherRevenueItem[], 
    expItems: OtherExpenseItem[], 
    privItems: PrivateExpenseItem[], 
    isSharedMode: boolean
  ) => {
      const details: string[] = [];
      revItems.forEach(item => {
        if (item.description && item.amount !== 0) details.push(`${item.description} (${formatForDisplay(item.amount)})`);
      });
      expItems.forEach(item => {
        if (item.description && item.amount !== 0) details.push(`${item.description} (-${formatForDisplay(item.amount)})`);
      });
      // Always include private expenses in auto details if they exist
      privItems.forEach(item => {
        if (item.description && item.amount !== 0) details.push(`${item.description} (-${formatForDisplay(item.amount)})`);
      });
      return details.join('. ');
  };

  const parseDateString = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('/');
    if (parts.length !== 3) return new Date();
    const [d, m, y] = parts.map(Number);
    return new Date(y, m - 1, d);
  };

  const getFormattedDateDisplay = (dateStr: string) => {
    if (!dateStr) return "Chọn ngày ghi sổ";
    try {
      const dateObj = parseDateString(dateStr);
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = days[dateObj.getDay()];
      return `${dayName}, ${dateStr}`;
    } catch (e) {
      return dateStr;
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDate = (d: number) => {
    const dayStr = d.toString().padStart(2, '0');
    const monthStr = (viewDate.getMonth() + 1).toString().padStart(2, '0');
    const yearStr = viewDate.getFullYear();
    const newDateStr = `${dayStr}/${monthStr}/${yearStr}`;
    
    if (!transaction.id && onCheckExists) {
      const existing = onCheckExists(newDateStr);
      if (existing) {
        setConflictTransaction(existing);
        setShowExistAlert(true);
        setIsCalendarOpen(false);
        return;
      }
    }
    
    setDate(newDateStr);
    setIsCalendarOpen(false);
  };

  const handleConfirmSwitchEdit = () => {
    if (conflictTransaction && onSwitchToEdit) {
      onSwitchToEdit(conflictTransaction);
      setShowExistAlert(false);
      setConflictTransaction(null);
    }
  };

  const handleCancelSwitchEdit = () => {
    setShowExistAlert(false);
    setConflictTransaction(null);
  };

  // --- INIT DATA ---
  useEffect(() => {
    if (transaction) {
      const currentBreakdown = transaction.breakdown || defaultBreakdown;
      setBreakdown(currentBreakdown);
      setNote(transaction.note);
      setImageUrl(transaction.imageUrl);
      setDate(transaction.date);
      setManualTotalExpense(transaction.sharedExpense); // Init total expense state
      
      if (transaction.date) {
        setViewDate(parseDateString(transaction.date));
      }

      let initRev: OtherRevenueItem[] = [];
      if (currentBreakdown.otherRevenueItems && currentBreakdown.otherRevenueItems.length > 0) {
        initRev = currentBreakdown.otherRevenueItems;
      } else if (currentBreakdown.revenueOther > 0) {
        initRev = [{ id: 'legacy-rev-1', description: 'Thu khác (cũ)', amount: currentBreakdown.revenueOther }];
      }
      setOtherRevenues(initRev);

      let initExp: OtherExpenseItem[] = [];
      if (currentBreakdown.otherExpenseItems && currentBreakdown.otherExpenseItems.length > 0) {
        initExp = currentBreakdown.otherExpenseItems;
      } else if (currentBreakdown.expenseOther > 0) {
        initExp = [{ id: 'legacy-exp-1', description: 'Chi khác (cũ)', amount: currentBreakdown.expenseOther }];
      }
      setOtherExpenses(initExp);

      let initPriv: PrivateExpenseItem[] = [];
      if (currentBreakdown.privateExpenseItems && currentBreakdown.privateExpenseItems.length > 0) {
        initPriv = currentBreakdown.privateExpenseItems;
      } else if (transaction.privateExpense > 0) {
        initPriv = [{ id: 'legacy-priv-1', description: 'Chi riêng (cũ)', amount: transaction.privateExpense }];
      }
      setPrivateExpenses(initPriv);

      // Detect Manual Mode
      const totalRevenueCalc = currentBreakdown.revenueDown + currentBreakdown.revenueUp + (initRev.reduce((s, i) => s + i.amount, 0));
      const totalExpenseCalc = currentBreakdown.expenseFuel + currentBreakdown.expenseFixed + currentBreakdown.expensePolice + currentBreakdown.expenseRepair + (initExp.reduce((s, i) => s + i.amount, 0));
      
      if (totalRevenueCalc === 0 && totalExpenseCalc === 0 && transaction.totalBalance !== 0) {
          setCustomTotalBalance(transaction.totalBalance);
      } else {
          setCustomTotalBalance(0);
      }

      const autoNote = generateAutoDetails(initRev, initExp, initPriv, transaction.isShared);
      setInitialAutoNote(autoNote);
    }
  }, [transaction]);

  if (!isOpen) return null;

  // --- CALCULATIONS ---
  const totalRevenueOther = otherRevenues.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenseOther = otherExpenses.reduce((sum, item) => sum + item.amount, 0);
  
  // Always calculate private expenses, regardless of shared mode
  const totalPrivateExpense = privateExpenses.reduce((sum, item) => sum + item.amount, 0);

  // REVENUE
  const totalRevenue = breakdown.revenueDown + breakdown.revenueUp + totalRevenueOther;
    
  // EXPENSE LOGIC: "Top-Down"
  // User enters 'manualTotalExpense'. Fixed is calculated as remainder.
  // Formula: Fixed = Total - (Fuel + Police + Repair + Others)
  const sumVariableExpenses = 
    breakdown.expenseFuel + 
    breakdown.expensePolice + 
    breakdown.expenseRepair + 
    totalExpenseOther;
  
  // Calculate fixed expense based on the manual total input
  const calculatedFixedExpense = manualTotalExpense - sumVariableExpenses;
  
  const totalExpense = manualTotalExpense; // This is the source of truth for "Chi Chung"

  // Balance
  const isManualBalanceMode = totalRevenue === 0 && totalExpense === 0;
  const totalBalance = isManualBalanceMode ? customTotalBalance : totalRevenue - totalExpense;
  const splitBalance = !breakdown.isShared ? totalBalance / 2 : totalBalance;
  
  // Remaining Balance always subtracts private expense
  const remainingBalance = splitBalance - totalPrivateExpense;

  // Handlers
  const handleRevenueChange = (field: keyof TransactionBreakdown, value: number) => {
    setBreakdown((prev) => ({ ...prev, [field]: value }));
  };

  // When a variable expense changes, Total stays same, Fixed decreases/increases
  const handleVariableExpenseChange = (field: keyof TransactionBreakdown, value: number) => {
    setBreakdown((prev) => ({ ...prev, [field]: value }));
  };

  // When Total Expense Input changes, Fixed recalculates automatically via render logic
  const handleTotalExpenseChange = (val: number) => {
    setManualTotalExpense(val);
  };

  // --- Dynamic Items Handlers (Standard) ---
  const addOtherRevenueItem = () => setOtherRevenues([...otherRevenues, { id: Date.now().toString(), description: '', amount: 0 }]);
  const removeOtherRevenueItem = (id: string) => setOtherRevenues(otherRevenues.filter(item => item.id !== id));
  const updateOtherRevenueItem = (id: string, field: keyof OtherRevenueItem, value: any) => setOtherRevenues(otherRevenues.map(item => item.id === id ? { ...item, [field]: value } : item));

  // For Other Expenses (Variable), changing them affects Fixed Expense (Fixed = Total - Variables)
  const addOtherExpenseItem = () => setOtherExpenses([...otherExpenses, { id: Date.now().toString(), description: '', amount: 0 }]);
  const removeOtherExpenseItem = (id: string) => setOtherExpenses(otherExpenses.filter(item => item.id !== id));
  const updateOtherExpenseItem = (id: string, field: keyof OtherExpenseItem, value: any) => setOtherExpenses(otherExpenses.map(item => item.id === id ? { ...item, [field]: value } : item));

  const addPrivateExpenseItem = () => setPrivateExpenses([...privateExpenses, { id: Date.now().toString(), description: '', amount: 0 }]);
  const removePrivateExpenseItem = (id: string) => setPrivateExpenses(privateExpenses.filter(item => item.id !== id));
  const updatePrivateExpenseItem = (id: string, field: keyof PrivateExpenseItem, value: any) => setPrivateExpenses(privateExpenses.map(item => item.id === id ? { ...item, [field]: value } : item));

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBreakdown((prev) => ({ ...prev, isShared: e.target.checked }));
  };

  const handleMainBusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMainBusId = e.target.value;
    let newPartnerBusId = breakdown.partnerBusId;
    if (newPartnerBusId === newMainBusId) {
       const otherBus = buses.find(b => b.licensePlate !== newMainBusId);
       newPartnerBusId = otherBus ? otherBus.licensePlate : '';
    }
    setBreakdown(prev => ({ ...prev, busId: newMainBusId, partnerBusId: newPartnerBusId }));
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

  const triggerUpload = () => fileInputRef.current?.click();
  const handleDeleteClick = () => setShowDeleteAlert(true);
  const handleConfirmDelete = () => { onDelete(transaction.id); setShowDeleteAlert(false); };

  const proceedWithSave = () => {
    if (onCheckExists) {
        const existing = onCheckExists(date);
        if (!transaction.id && existing) {
            setConflictTransaction(existing);
            setShowExistAlert(true);
            return;
        }
        if (transaction.id && existing && existing.id !== transaction.id) {
            setShowSimpleDuplicateAlert(true);
            return;
        }
    }

    const newAutoNoteString = generateAutoDetails(otherRevenues, otherExpenses, privateExpenses, breakdown.isShared);
    let finalNote = note;
    if (initialAutoNote && finalNote.includes(initialAutoNote)) {
      finalNote = finalNote.replace(initialAutoNote, "");
    }
    finalNote = finalNote.trim();
    while (finalNote.endsWith('.') || finalNote.endsWith(' ')) {
        finalNote = finalNote.slice(0, -1);
    }
    if (newAutoNoteString) {
        finalNote = finalNote.length > 0 ? `${finalNote}. ${newAutoNoteString}` : newAutoNoteString;
    }
    finalNote = finalNote.replace(/\s+\./g, '.').replace(/\.\./g, '.').trim();

    setInitialAutoNote(newAutoNoteString);
    setNote(finalNote);

    let newStatus = transaction.status;
    if (newStatus === TransactionStatus.AI_GENERATED) {
      newStatus = TransactionStatus.VERIFIED;
    }

    const updated: Transaction = {
      ...transaction,
      date: date,
      note: finalNote,
      status: newStatus,
      breakdown: {
        ...breakdown,
        expenseFixed: calculatedFixedExpense, // Save the calculated fixed expense
        revenueOther: totalRevenueOther,
        otherRevenueItems: otherRevenues,
        expenseOther: totalExpenseOther,
        otherExpenseItems: otherExpenses,
        privateExpenseItems: privateExpenses,
        isShared: breakdown.isShared,
      },
      isShared: breakdown.isShared,
      revenue: totalRevenue,
      sharedExpense: totalExpense,
      totalBalance: totalBalance,
      splitBalance: splitBalance,
      privateExpense: totalPrivateExpense,
      remainingBalance: remainingBalance,
      imageUrl: imageUrl,
    };
    onSave(updated);
    toast.success("Đã lưu sổ thu chi thành công!");
  };

  const handleSave = () => {
    if (totalRevenue === 0 && totalExpense === 0 && totalPrivateExpense === 0 && totalBalance === 0) {
      setShowEmptySaveAlert(true);
      return;
    }
    proceedWithSave();
  };

  // Calendar render logic omitted for brevity (same as before)
  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="h-9 w-9" />);
    const selectedDateObj = parseDateString(date);
    const isCurrentMonthSelected = selectedDateObj.getMonth() === month && selectedDateObj.getFullYear() === year;
    const today = new Date();
    const isCurrentMonthToday = today.getMonth() === month && today.getFullYear() === year;

    for (let d = 1; d <= daysInMonth; d++) {
      const isSelected = isCurrentMonthSelected && selectedDateObj.getDate() === d;
      const isToday = isCurrentMonthToday && today.getDate() === d;
      days.push(
        <button
          key={d}
          onClick={(e) => { e.stopPropagation(); handleSelectDate(d); }}
          className={`h-9 w-9 rounded-md flex items-center justify-center text-sm transition-all ${isSelected ? "bg-slate-900 text-white shadow-md font-medium" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"} ${!isSelected && isToday ? "text-blue-600 font-bold bg-blue-50" : ""}`}
        >
          {d}
        </button>
      );
    }
    return (
      <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-4 w-[300px] animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"><ChevronLeft size={16} /></button>
          <div className="font-semibold text-sm text-slate-900">{VN_MONTHS[month]} {year}</div>
          <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"><ChevronRight size={16} /></button>
        </div>
        <div className="grid grid-cols-7 mb-2">
          {VN_WEEKDAYS.map((day) => <div key={day} className="h-9 w-9 flex items-center justify-center text-[10px] font-medium text-slate-400">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 row-gap-1">{days}</div>
      </div>
    );
  };

  const gridClass = "grid grid-cols-[1fr_90px] md:grid-cols-[1fr_130px] gap-2 items-center";
  const dynamicGridClass = "grid grid-cols-[24px_1fr_90px] md:grid-cols-[28px_1fr_130px] gap-2 items-center";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 font-sans">
        <div className="bg-white rounded-none md:rounded-xl shadow-2xl w-full h-[100dvh] md:h-[95vh] md:max-w-6xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Left Side: Image Viewer (Same as before) */}
          <div className="w-full h-56 shrink-0 md:h-full md:w-6/12 bg-slate-900 relative flex-col group border-b md:border-b-0 md:border-r border-slate-800">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/60 backdrop-blur-md px-4 py-1.5 md:px-6 md:py-2.5 rounded-full text-white shadow-2xl border border-white/20 flex items-center gap-2 pointer-events-none">
               <CalendarIcon size={14} className="text-white/80" />
               <span className="font-bold text-xs md:text-sm tracking-wide">{date || "--/--/----"}</span>
            </div>
            {(isPaid && paymentDate) && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 select-none pointer-events-none transform border-[3px] md:border-[4px] border-red-600/50 rounded-md px-3 py-2 md:px-5 md:py-3 flex flex-col items-center justify-center bg-black/10 backdrop-blur-[1px]">
                  <span className="text-lg md:text-2xl font-black text-red-600/80 tracking-widest uppercase whitespace-nowrap">ĐÃ THANH TOÁN</span>
                  <span className="text-[10px] md:text-sm font-bold text-red-600/80 mt-0.5 uppercase tracking-wide">{paymentDate}</span>
              </div>
            )}
            <div className="flex-1 w-full h-full flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
              {imageUrl ? (
                <img src={imageUrl} alt="Sổ ghi chép" className="w-full h-full object-contain md:rounded-lg" />
              ) : (
                <div className="relative w-full h-full bg-slate-900 md:rounded-lg overflow-hidden flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800">
                  <ImageIcon size={32} className="mb-2 opacity-50 md:w-12 md:h-12" />
                  <p className="text-xs md:text-sm font-medium">Chưa có hình ảnh</p>
                </div>
              )}
              {imageUrl && (
                 <button onClick={() => setIsMobileImageViewerOpen(true)} className="absolute bottom-3 right-3 p-2 bg-black/50 text-white rounded-full md:hidden backdrop-blur-sm z-30"><Maximize2 size={16} /></button>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/70 z-20 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                  <Loader2 size={32} className="animate-spin mb-2" />
                  <span className="text-xs font-medium">Đang xử lý...</span>
                </div>
              )}
            </div>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 z-10 px-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg,image/png,image/jpg" className="hidden" disabled={isPaid} />
              <Button variant="primary" size="sm" className={`shadow-xl bg-white text-slate-900 hover:bg-slate-100 border-0 font-medium h-8 md:h-9 text-sm ${isPaid ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={triggerUpload} disabled={isUploading || isPaid}>
                <Upload size={14} className="mr-2" /> {imageUrl ? "Thay ảnh" : "Tải ảnh"}
              </Button>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="w-full md:w-6/12 bg-white flex flex-col flex-1 h-full text-slate-900 min-h-0">
            {/* Header */}
            <div className="px-3 md:px-4 pt-3 pb-0 bg-white sticky top-0 z-10 shrink-0">
               <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-3">
                     <h2 className="font-bold text-lg md:text-xl text-slate-900 leading-none">{transaction.id ? 'Chi tiết' : 'Thêm mới'}</h2>
                     {isPaid && <span className="text-[10px] font-bold text-white bg-slate-500 px-2 py-0.5 rounded flex items-center gap-1"><Check size={10} strokeWidth={4}/> ĐÃ TT</span>}
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors -mr-2"><X size={20} /></button>
               </div>
               <div className="h-px bg-slate-100 w-full mb-3 md:mb-4"></div>
               <div className="flex items-center justify-between pb-3 md:pb-4 border-b border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="relative">
                     <div className={`flex items-center gap-2 md:gap-3 border shadow-sm rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 transition-all duration-200 min-w-[180px] md:min-w-[220px] select-none ${isPaid ? 'bg-slate-50 border-slate-100 opacity-80 cursor-not-allowed' : 'bg-white border-slate-200 hover:border-slate-400 cursor-pointer group'}`} onClick={() => !isPaid && setIsCalendarOpen(!isCalendarOpen)}>
                        <div className={`p-1 rounded-lg transition-colors shadow-sm ${isPaid ? 'bg-slate-200 text-slate-400' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-900 group-hover:text-white'}`}>
                           <CalendarDays size={18} strokeWidth={2.5} className="md:w-[22px] md:h-[22px]" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] md:text-[11px] uppercase font-bold text-slate-400 tracking-wider leading-tight mb-0.5">Ngày ghi sổ</span>
                           <span className={`text-xs md:text-[13px] font-bold leading-tight ${date ? 'text-slate-800' : 'text-slate-400 italic'}`}>{getFormattedDateDisplay(date)}</span>
                        </div>
                     </div>
                     {isCalendarOpen && !isPaid && (<><div className="fixed inset-0 z-40" onClick={() => setIsCalendarOpen(false)} />{renderCalendar()}</>)}
                  </div>
                  <div className="flex flex-col items-end justify-center">
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 hidden md:block">Đơn vị tính</span>
                    <span className="text-xs italic lowercase text-slate-500">nghìn đồng</span>
                  </div>
               </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 custom-scrollbar">
              {/* Config Section */}
              <section className="bg-slate-50/80 rounded-lg border border-slate-200 p-2 md:p-3 space-y-2 shadow-sm">
                 <div className="flex items-center justify-between">
                    <label className={`flex items-center space-x-2 select-none ${isPaid ? 'cursor-not-allowed opacity-70' : 'cursor-pointer group'}`}>
                       <input type="checkbox" checked={breakdown.isShared} onChange={handleCheckboxChange} disabled={isPaid} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900 disabled:cursor-not-allowed"/>
                       <span className="text-xs md:text-sm font-semibold text-slate-700">Chế độ đi 2 xe (Ăn chia)</span>
                    </label>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                       <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Xe chính</label>
                       <select className="w-full h-8 rounded border border-slate-200 bg-white px-2 text-xs md:text-sm text-slate-700 focus:border-slate-400 focus:ring-1 focus:ring-slate-100 outline-none disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" value={breakdown.busId} onChange={handleMainBusChange} disabled={isPaid}>
                          {buses.filter(b => b.isShareholding).map(b => <option key={b.id} value={b.licensePlate}>{b.licensePlate}</option>)}
                       </select>
                    </div>
                    <div className={`space-y-1 transition-all duration-200`}>
                       <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đi cùng</label>
                       <select className="w-full h-8 rounded border border-slate-200 bg-white px-2 text-xs md:text-sm text-slate-700 focus:border-slate-400 focus:ring-1 focus:ring-slate-100 outline-none disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" value={breakdown.partnerBusId} onChange={(e) => setBreakdown({ ...breakdown, partnerBusId: e.target.value })} disabled={isPaid}>
                           {buses.filter(b => b.licensePlate !== breakdown.busId).map(b => <option key={b.id} value={b.licensePlate}>{b.licensePlate}</option>)}
                       </select>
                    </div>
                 </div>
              </section>

              {/* REVENUE SECTION */}
              <section className="space-y-1.5">
                 <div className={`${gridClass} pb-1 border-b border-slate-100`}>
                    <div className="flex items-center gap-1.5">
                       <div className="w-1 h-3 bg-green-500 rounded-full"></div>
                       <h3 className="font-semibold text-slate-800 text-xs md:text-sm">Tổng Thu</h3>
                    </div>
                    <div className="w-full h-8 rounded border border-green-200 bg-green-50/50 px-2 flex items-center justify-end">
                       <span className="text-xs md:text-sm font-bold text-green-600">{formatForDisplay(totalRevenue)}</span>
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <InputRow label="Chiều xuôi" value={breakdown.revenueDown} onChange={(v) => handleRevenueChange("revenueDown", v)} readOnly={isPaid} />
                    <InputRow label="Chiều ngược" value={breakdown.revenueUp} onChange={(v) => handleRevenueChange("revenueUp", v)} readOnly={isPaid} />
                    <div className="space-y-1.5">
                       {otherRevenues.map((item) => (
                          <div key={item.id} className={dynamicGridClass}>
                             <button onClick={isPaid ? undefined : () => removeOtherRevenueItem(item.id)} className={`p-1 md:p-1.5 rounded transition-colors flex items-center justify-center ${isPaid ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`} disabled={isPaid}><Trash2 size={14} className="w-3 h-3 md:w-3.5 md:h-3.5" /></button>
                             <input type="text" placeholder="Tên khoản thu..." className="w-full h-8 rounded border border-slate-200 bg-slate-50/50 px-2 text-xs md:text-sm focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-100 outline-none transition-all placeholder:text-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed" value={item.description} onChange={(e) => updateOtherRevenueItem(item.id, 'description', e.target.value)} disabled={isPaid} />
                             <SmartInput value={item.amount} onCommit={(val) => updateOtherRevenueItem(item.id, 'amount', val)} className="w-full text-right h-8 rounded border border-slate-200 bg-white px-2 text-xs md:text-sm font-medium text-slate-700 focus:border-slate-400 focus:ring-1 focus:ring-slate-100 outline-none transition-all" readOnly={isPaid} />
                          </div>
                       ))}
                    </div>
                    {!isPaid && (
                      <div className="pt-0.5"><button onClick={addOtherRevenueItem} className="inline-flex items-center gap-1 text-[10px] md:text-xs font-medium px-1.5 py-1 rounded ml-[-6px] transition-colors text-slate-500 hover:text-slate-800 hover:bg-slate-100"><Plus size={12} className="md:w-[14px] md:h-[14px]" /> Thêm khoản thu</button></div>
                    )}
                 </div>
              </section>

              {/* EXPENSE SECTION */}
              <section className="space-y-1.5 pt-1">
                 <div className={`${gridClass} pb-1 border-b border-slate-100`}>
                    <div className="flex items-center gap-1.5">
                       <div className="w-1 h-3 bg-red-500 rounded-full"></div>
                       <h3 className="font-semibold text-slate-800 text-xs md:text-sm">Tổng Chi</h3>
                    </div>
                    {/* CHANGED: Total Expense is now Editable */}
                    <SmartInput
                        value={manualTotalExpense}
                        onCommit={handleTotalExpenseChange}
                        className={`w-full text-right h-8 rounded border border-red-200 px-2 text-xs md:text-sm font-bold text-red-600 outline-none transition-all ${isPaid ? 'bg-slate-50 cursor-not-allowed' : 'bg-red-50/50 focus:border-red-400 focus:ring-1 focus:ring-red-100'}`}
                        readOnly={isPaid}
                    />
                 </div>
                 
                 <div className="space-y-1.5">
                    <InputRow label="Dầu" value={breakdown.expenseFuel} onChange={(v) => handleVariableExpenseChange("expenseFuel", v)} readOnly={isPaid} />
                    
                    {/* CHANGED: Fixed Expense is Read-Only, Calculated */}
                    <div className={`${gridClass} group`}>
                      <div className="flex items-center gap-2">
                         <span className="text-xs md:text-sm text-slate-600 group-hover:text-slate-900 truncate">Chi cố định</span>
                      </div>
                      <div className="w-full h-8 flex items-center justify-end px-2 bg-slate-50 rounded border border-slate-200">
                         <span className={`text-xs md:text-sm font-medium ${calculatedFixedExpense < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                            {formatForDisplay(calculatedFixedExpense)}
                         </span>
                      </div>
                    </div>

                    <InputRow label="Chi luật (CA)" value={breakdown.expensePolice} onChange={(v) => handleVariableExpenseChange("expensePolice", v)} readOnly={isPaid} />
                    <InputRow label="Sửa chữa" value={breakdown.expenseRepair} onChange={(v) => handleVariableExpenseChange("expenseRepair", v)} readOnly={isPaid} />
                    
                    <div className="space-y-1.5">
                       {otherExpenses.map((item) => (
                          <div key={item.id} className={dynamicGridClass}>
                             <button onClick={isPaid ? undefined : () => removeOtherExpenseItem(item.id)} className={`p-1 md:p-1.5 rounded transition-colors flex items-center justify-center ${isPaid ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`} disabled={isPaid}><Trash2 size={14} className="w-3 h-3 md:w-3.5 md:h-3.5" /></button>
                             <input type="text" placeholder="Tên khoản chi..." className="w-full h-8 rounded border border-slate-200 bg-slate-50/50 px-2 text-xs md:text-sm focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-100 outline-none transition-all placeholder:text-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed" value={item.description} onChange={(e) => updateOtherExpenseItem(item.id, 'description', e.target.value)} disabled={isPaid} />
                             <SmartInput value={item.amount} onCommit={(val) => updateOtherExpenseItem(item.id, 'amount', val)} className="w-full text-right h-8 rounded border border-slate-200 bg-white px-2 text-xs md:text-sm font-medium text-slate-700 focus:border-slate-400 focus:ring-1 focus:ring-slate-100 outline-none transition-all" readOnly={isPaid} />
                          </div>
                       ))}
                    </div>
                    {!isPaid && (
                      <div className="pt-0.5"><button onClick={addOtherExpenseItem} className="inline-flex items-center gap-1 text-[10px] md:text-xs font-medium px-1.5 py-1 rounded ml-[-6px] transition-colors text-slate-500 hover:text-slate-800 hover:bg-slate-100"><Plus size={12} className="md:w-[14px] md:h-[14px]" /> Thêm khoản chi</button></div>
                    )}
                 </div>
              </section>

              {/* SUMMARY */}
              <section className="bg-slate-50 rounded-lg border border-slate-200 p-2 md:p-3 shadow-sm">
                 <h3 className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tổng kết</h3>
                 <div className="space-y-2">
                    <div className={gridClass}>
                       <span className="text-xs md:text-sm font-medium text-slate-600">Tổng dư (Thu-Chi)</span>
                       {isManualBalanceMode ? (
                          <SmartInput value={customTotalBalance} onCommit={setCustomTotalBalance} placeholder="" className="w-full text-right h-8 rounded border border-primary/50 bg-white px-2 text-xs md:text-sm font-bold text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all" readOnly={isPaid} />
                       ) : (
                          <div className="w-full h-8 flex items-center justify-end px-2"><span className="font-bold text-xs md:text-sm text-slate-800">{formatForDisplay(totalBalance)}</span></div>
                       )}
                    </div>
                    <div className={gridClass}>
                       <span className="text-xs md:text-sm font-medium text-slate-600 flex items-center gap-2">Dư sau chia<span className="text-[8px] md:text-[9px] px-1 py-0.5 bg-slate-200 rounded text-slate-500 font-bold">{breakdown.isShared ? '100%' : '50%'}</span></span>
                       <div className="w-full h-8 flex items-center justify-end px-2"><span className="font-bold text-xs md:text-sm text-slate-800">{formatForDisplay(splitBalance)}</span></div>
                    </div>
                    
                    {/* ALWAYS SHOW PRIVATE EXPENSE */}
                    <div className="h-px bg-slate-200 my-1 col-span-2"></div>
                    <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                         <div className={gridClass}><span className="text-xs md:text-sm font-medium text-slate-600">Trừ chi riêng</span><div className="w-full h-8 flex items-center justify-end px-2"><span className="font-bold text-xs md:text-sm text-slate-800">{formatForDisplay(totalPrivateExpense)}</span></div></div>
                         <div className="space-y-1.5 pt-0.5">
                            {privateExpenses.map((item) => (
                               <div key={item.id} className={dynamicGridClass}>
                                  <button onClick={isPaid ? undefined : () => removePrivateExpenseItem(item.id)} className={`p-1 md:p-1.5 rounded transition-colors flex items-center justify-center ${isPaid ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`} disabled={isPaid}><Trash2 size={14} className="w-3 h-3 md:w-3.5 md:h-3.5" /></button>
                                  <input type="text" placeholder="Chi riêng..." className="w-full h-8 rounded border border-slate-200 bg-white px-2 text-xs md:text-sm focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-100 outline-none transition-all placeholder:text-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed" value={item.description} onChange={(e) => updatePrivateExpenseItem(item.id, 'description', e.target.value)} disabled={isPaid} />
                                  <SmartInput value={item.amount} onCommit={(val) => updatePrivateExpenseItem(item.id, 'amount', val)} className="w-full text-right h-8 rounded border border-slate-200 bg-white px-2 text-xs md:text-sm font-medium text-slate-700 focus:border-slate-400 focus:ring-1 focus:ring-slate-100 outline-none transition-all" readOnly={isPaid} />
                               </div>
                            ))}
                         </div>
                         {!isPaid && (<div className="pt-0.5"><button onClick={addPrivateExpenseItem} className="inline-flex items-center gap-1 text-[10px] md:text-xs font-medium px-1.5 py-1 rounded ml-[-6px] transition-colors text-slate-500 hover:text-slate-800 hover:bg-slate-100"><Plus size={12} className="md:w-[14px] md:h-[14px]" /> Thêm chi riêng</button></div>)}
                    </div>
                    
                    <div className="h-px bg-slate-200 my-1 col-span-2"></div>
                    <div className={`${gridClass} pt-0.5`}>
                       <span className="text-xs md:text-sm font-bold text-slate-900">Dư thực nhận</span>
                       <div className="w-full h-8 flex items-center justify-end px-2"><span className="text-lg md:text-xl font-bold text-primary">{formatForDisplay(remainingBalance)}</span></div>
                    </div>

                    {selectedBus && (selectedBus.sharePercentage < 100 || (selectedBus.shareholders && selectedBus.shareholders.length > 0)) && (
                        <div className="mt-2 pt-2 border-t border-slate-200 border-dashed animate-in fade-in slide-in-from-top-1 duration-300">
                            <div className="flex items-center gap-1 mb-2">
                               <PieChart size={12} className="text-slate-400" />
                               <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Phân chia cổ phần</span>
                            </div>
                            <div className="space-y-1.5 bg-white/50 border border-slate-100 p-2 rounded-lg">
                                <div className="flex justify-between items-center text-xs">
                                     <span className="text-slate-600 font-medium">Chủ xe ({selectedBus.sharePercentage}%)</span>
                                     <span className="font-bold text-slate-700">{formatForDisplay((remainingBalance * selectedBus.sharePercentage) / 100)}</span>
                                </div>
                                {selectedBus.shareholders?.map(sh => (
                                     <div key={sh.id} className="flex justify-between items-center text-xs">
                                         <span className="text-slate-500">{sh.name} (Cầm {sh.percentage}%)</span>
                                         <span className="font-medium text-slate-600">{formatForDisplay((remainingBalance * sh.percentage) / 100)}</span>
                                     </div>
                                ))}
                            </div>
                        </div>
                    )}
                 </div>
              </section>

              {/* NOTES */}
              <div className="space-y-1">
                 <label className="text-xs font-semibold text-slate-600">Ghi chú thêm {isPaid && "(Có thể chỉnh sửa)"}</label>
                 <textarea className="flex min-h-[60px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300 resize-none shadow-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nhập ghi chú..." />
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 md:p-4 border-t border-slate-100 bg-white flex justify-between gap-3 z-10 shadow-[0_-1px_2px_rgba(0,0,0,0.03)] shrink-0">
               {transaction.id && (<Button variant="outline" className={`border-red-100 text-red-600 h-10 px-3 ${isPaid ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50 hover:text-red-700'}`} onClick={isPaid ? undefined : handleDeleteClick} disabled={isPaid} title={isPaid ? "Không thể xóa bản ghi đã thanh toán" : "Xóa phiếu này"}><Trash2 size={16} className="md:mr-2" /><span className="hidden md:inline">Xóa</span></Button>)}
               <div className="flex gap-3 flex-1 justify-end">
                  <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 h-10 min-w-[80px] md:min-w-[100px]" onClick={onClose}>Đóng</Button>
                  <Button variant="primary" className="bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10 h-10 min-w-[100px] md:min-w-[120px]" onClick={handleSave}><Save size={16} className="mr-2" /> Lưu</Button>
               </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals and Alerts */}
      {isMobileImageViewerOpen && imageUrl && (
         <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-200">
            <div className="absolute top-4 right-4 z-50"><button onClick={() => setIsMobileImageViewerOpen(false)} className="p-2 bg-white/20 text-white rounded-full backdrop-blur-md"><X size={24} /></button></div>
            <div className="flex-1 flex items-center justify-center p-2"><img src={imageUrl} alt="Full Screen Receipt" className="max-w-full max-h-full object-contain" /></div>
            {(isPaid && paymentDate) && (<div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 px-6 py-2 bg-red-600/80 backdrop-blur-md rounded-full border border-red-400/50"><span className="text-white font-bold uppercase tracking-wider text-sm">Đã thanh toán: {paymentDate}</span></div>)}
         </div>
      )}
      <AlertDialog isOpen={showDeleteAlert} onClose={() => setShowDeleteAlert(false)} onConfirm={handleConfirmDelete} title="Bạn có chắc chắn muốn xóa?" description="Hành động này không thể hoàn tác." confirmText="Xóa" variant="destructive" />
      <AlertDialog isOpen={showExistAlert} onClose={handleCancelSwitchEdit} onConfirm={handleConfirmSwitchEdit} title="Trùng dữ liệu" description={`Đã có dữ liệu ngày ${conflictTransaction?.date}. Chuyển sang sửa?`} cancelText="Không" confirmText="Đồng ý" variant="default" />
      <AlertDialog isOpen={showSimpleDuplicateAlert} onClose={() => setShowSimpleDuplicateAlert(false)} onConfirm={() => setShowSimpleDuplicateAlert(false)} title="Trùng dữ liệu" description={`Ngày ${date} đã có dữ liệu.`} confirmText="Đã hiểu" showCancel={false} variant="default" />
      <AlertDialog isOpen={showEmptySaveAlert} onClose={() => setShowEmptySaveAlert(false)} onConfirm={() => { setShowEmptySaveAlert(false); proceedWithSave(); }} title="Dữ liệu trống" description="Bạn chưa nhập số tiền thu chi. Bạn có chắc chắn muốn lưu phiếu này không?" cancelText="Hủy" confirmText="Lưu" variant="default" />
    </>
  );
};

const InputRow = ({ label, value, onChange, readOnly = false }: { label: string; value: number; onChange: (v: number) => void; readOnly?: boolean; }) => (
  <div className="grid grid-cols-[1fr_90px] md:grid-cols-[1fr_130px] gap-2 items-center group">
    <span className="text-xs md:text-sm text-slate-600 group-hover:text-slate-900 transition-colors truncate" title={label}>{label}</span>
    <SmartInput value={value} onCommit={onChange} className={`w-full text-right h-8 rounded border border-slate-200 px-2 text-xs md:text-sm font-medium text-slate-700 outline-none transition-all ${readOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-100'}`} readOnly={readOnly} />
  </div>
);
