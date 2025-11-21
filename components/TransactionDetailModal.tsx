
import React, { useState, useEffect, useRef } from 'react';
import { X, Calculator, Check, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import { Transaction, TransactionBreakdown } from '../types';
import { Button } from './ui/Button';
import { processAndUploadImage, resolveImageUrl } from '../services/imageService';

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
  expenseFuel: 0,
  expenseFixed: 0,
  expensePolice: 0,
  expenseRepair: 0,
  expenseOther: 0,
  isShared: true,
  busId: '25F-002.19',
  partnerBusId: '25F-000.19'
};

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ 
  transaction, 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const [breakdown, setBreakdown] = useState<TransactionBreakdown>(defaultBreakdown);
  const [note, setNote] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (transaction) {
      setBreakdown(transaction.breakdown || defaultBreakdown);
      setNote(transaction.note);
      setImageUrl(transaction.imageUrl);
    }
  }, [transaction]);

  if (!isOpen) return null;

  // Calculations (Raw numbers, unit = thousand VND, e.g., 13400 = 13.400.000)
  const totalRevenue = breakdown.revenueDown + breakdown.revenueUp + breakdown.revenueOther;
  const totalExpense = breakdown.expenseFuel + breakdown.expenseFixed + breakdown.expensePolice + breakdown.expenseRepair + breakdown.expenseOther;
  const totalBalance = totalRevenue - totalExpense;
  
  // Rule: If going 1 car (!isShared) -> split = total / 2. If 2 cars (isShared) -> split = total.
  const splitBalance = !breakdown.isShared ? totalBalance / 2 : totalBalance;
  
  const remainingBalance = splitBalance - transaction.privateExpense; 

  // Helper: Format value for display (just adds dots)
  const formatForDisplay = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  // Handle input changes
  const handleNumberChange = (field: keyof TransactionBreakdown, value: string) => {
    // User inputs like "13.400". We just remove the separator and store "13400".
    const rawInput = parseInt(value.replace(/,/g, '').replace(/\./g, ''), 10) || 0;
    setBreakdown(prev => ({ ...prev, [field]: rawInput }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBreakdown(prev => ({ ...prev, isShared: e.target.checked }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        // Gọi service xử lý ảnh
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
    const updated: Transaction = {
      ...transaction,
      note,
      breakdown,
      isShared: breakdown.isShared, // Sync top level property
      revenue: totalRevenue,
      sharedExpense: totalExpense,
      totalBalance: totalBalance,
      splitBalance: splitBalance,
      remainingBalance: remainingBalance,
      imageUrl: imageUrl // Save the image URL
    };
    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col md:flex-row overflow-hidden animate-fade-in">
        
        {/* Left Side: Image Viewer */}
        <div className="w-full md:w-1/2 bg-slate-900 relative flex flex-col group">
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
             <div className="text-white font-semibold bg-black/50 px-3 py-1 rounded-full backdrop-blur-md self-start">
               {transaction.date}
             </div>
             {imageUrl && (
               <div className="text-xs text-slate-300 bg-black/30 px-2 py-1 rounded backdrop-blur-sm self-start font-mono">
                 Src: {imageUrl}
               </div>
             )}
          </div>
          
          <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
            {imageUrl ? (
              <img 
                src={resolveImageUrl(imageUrl)} 
                alt="Sổ ghi chép" 
                className="w-full h-full object-contain rounded-lg shadow-2xl"
              />
            ) : (
              /* Placeholder for the actual image */
              <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700">
                <ImageIcon size={64} className="mb-4 opacity-50" />
                <p className="text-sm font-medium">Chưa có hình ảnh sổ sách</p>
                <p className="text-xs mt-2 opacity-70">Upload ảnh sổ viết tay để đối chiếu</p>
                
                {/* Simulated notebook lines/content for effect */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" 
                     style={{backgroundImage: 'linear-gradient(#fff 1px, transparent 1px)', backgroundSize: '100% 2rem'}}>
                </div>
              </div>
            )}

            {/* Loading Overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center text-white">
                <Loader2 size={40} className="animate-spin mb-2" />
                <span className="text-sm font-medium">Đang xử lý & nén ảnh...</span>
              </div>
            )}
          </div>

          {/* Upload Controls */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 z-10 px-4">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
            />
            <Button 
              variant="primary" 
              className="shadow-xl bg-white text-slate-900 hover:bg-slate-100 border-0"
              onClick={triggerUpload}
              disabled={isUploading}
            >
              <Upload size={18} className="mr-2" />
              {imageUrl ? "Thay ảnh khác" : "Tải ảnh lên"}
            </Button>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 bg-white flex flex-col h-full">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50">
             <div>
                <h2 className="font-semibold text-lg">Chi tiết đối soát</h2>
                <p className="text-xs text-slate-500">Đơn vị nhập liệu: Nghìn đồng (VD: 13.400)</p>
             </div>
             <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                <X size={20} />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            
            {/* Checkbox & Bus Select */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="isShared" 
                  checked={breakdown.isShared}
                  onChange={handleCheckboxChange}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="isShared" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Đi 2 xe (Đi ăn chia - bỏ tích nếu đi 1 xe)
                </label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={breakdown.busId}
                  onChange={(e) => setBreakdown({...breakdown, busId: e.target.value})}
                >
                  <option value="25F-002.19">25F-002.19</option>
                  <option value="29B-123.45">29B-123.45</option>
                </select>
                
                {breakdown.isShared && (
                  <select 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={breakdown.partnerBusId}
                    onChange={(e) => setBreakdown({...breakdown, partnerBusId: e.target.value})}
                  >
                    <option value="25F-000.19">25F-000.19</option>
                    <option value="15B-999.99">15B-999.99</option>
                  </select>
                )}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Revenue Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-slate-900">Tổng thu:</h3>
              <div className="space-y-3 pl-2">
                <InputRow label="- Xuôi" value={breakdown.revenueDown} onChange={(v) => handleNumberChange('revenueDown', v)} displayFormatter={formatForDisplay} />
                <InputRow label="- Ngược" value={breakdown.revenueUp} onChange={(v) => handleNumberChange('revenueUp', v)} displayFormatter={formatForDisplay}/>
                <InputRow label="- Thu khác" value={breakdown.revenueOther} onChange={(v) => handleNumberChange('revenueOther', v)} displayFormatter={formatForDisplay}/>
              </div>
              <div className="mt-2 text-right font-bold text-slate-900 text-lg border-t pt-2 border-dashed border-slate-200">
                {formatForDisplay(totalRevenue)}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Expense Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-slate-900 flex justify-between">
                <span>Tổng chi:</span>
                <span className="font-bold">{formatForDisplay(totalExpense)}</span>
              </h3>
              <div className="space-y-3 pl-2">
                <InputRow label="- Dầu" value={breakdown.expenseFuel} onChange={(v) => handleNumberChange('expenseFuel', v)} displayFormatter={formatForDisplay}/>
                <InputRow label="- Chi cố định" value={breakdown.expenseFixed} onChange={(v) => handleNumberChange('expenseFixed', v)} displayFormatter={formatForDisplay}/>
                <InputRow label="- Chi luật (CA)" value={breakdown.expensePolice} onChange={(v) => handleNumberChange('expensePolice', v)} displayFormatter={formatForDisplay}/>
                <InputRow label="- Sửa chữa, bảo dưỡng" value={breakdown.expenseRepair} onChange={(v) => handleNumberChange('expenseRepair', v)} displayFormatter={formatForDisplay}/>
                <InputRow label="- Chi khác" value={breakdown.expenseOther} onChange={(v) => handleNumberChange('expenseOther', v)} displayFormatter={formatForDisplay}/>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Summary Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Tổng dư:</span>
                <span className="font-bold text-lg">{formatForDisplay(totalBalance)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Tổng dư sau chia {!breakdown.isShared ? '(1 Xe: /2)' : '(2 Xe)'}:</span>
                <span className="font-bold text-lg">{formatForDisplay(splitBalance)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">Chi riêng:</span>
                <input 
                  type="text" 
                  className="w-32 text-right h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formatForDisplay(transaction.privateExpense)}
                  readOnly
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-900">Dư thực:</span>
                <span className="font-bold text-xl text-primary">{formatForDisplay(remainingBalance)}</span>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ghi chú:</label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <p className="text-xs text-muted-foreground italic">
                Ghi chú tạo tự động từ các khoản thu - chi
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-slate-50 flex justify-between gap-4">
             <Button variant="primary" className="w-full bg-slate-900 hover:bg-slate-800" onClick={handleSave}>
                Lưu lại
             </Button>
             <Button variant="outline" className="w-full bg-white" onClick={onClose}>
                Đóng
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for input rows
const InputRow = ({ 
  label, 
  value, 
  onChange,
  displayFormatter 
}: { 
  label: string, 
  value: number, 
  onChange: (v: string) => void,
  displayFormatter: (v: number) => string
}) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-slate-600">{label}:</span>
    <input 
      type="text" 
      className="w-32 text-right h-8 rounded-md border border-transparent hover:border-input focus:border-input bg-transparent px-2 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
      value={displayFormatter(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);
