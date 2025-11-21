
import { Transaction, TransactionStatus, TransactionBreakdown } from '../types';

// Helper tạo dữ liệu chi tiết mặc định
const createBreakdown = (
  revenue: number, 
  sharedExpense: number, 
  isShared: boolean
): TransactionBreakdown => {
  const revenueDown = Math.floor(revenue * 0.6);
  const revenueUp = revenue - revenueDown;
  
  const expenseFuel = Math.floor(sharedExpense * 0.65);
  const expenseFixed = Math.floor(sharedExpense * 0.15);
  const expensePolice = Math.floor(sharedExpense * 0.1);
  const expenseOther = sharedExpense - expenseFuel - expenseFixed - expensePolice;

  return {
    revenueDown,
    revenueUp,
    revenueOther: 0,
    expenseFuel,
    expenseFixed,
    expensePolice,
    expenseRepair: 0,
    expenseOther,
    isShared,
    busId: '25F-002.19',
    partnerBusId: '25F-000.19'
  };
};

// Dữ liệu giả lập từ PostgreSQL
// Đơn vị: Nghìn đồng (VD: 13400 = 13.400.000 đ)
// Lịch chạy: Cách nhật (2 ngày 1 chuyến), khoảng 15 chuyến/tháng
export const MOCK_DATABASE: Transaction[] = [
  // --- THÁNG 11/2025 ---
  { id: 't11-02', date: '02/11/2025', revenue: 25400, sharedExpense: 12500, privateExpense: 0, totalBalance: 12900, splitBalance: 12900, remainingBalance: 12900, note: "Khách thường", status: TransactionStatus.VERIFIED, details: 'Chi tiết', isShared: true, breakdown: createBreakdown(25400, 12500, true) },
  { id: 't11-04', date: '04/11/2025', revenue: 31200, sharedExpense: 13100, privateExpense: 500, totalBalance: 18100, splitBalance: 18100, remainingBalance: 17600, note: "Gửi hàng nhiều", status: TransactionStatus.VERIFIED, details: 'Chi tiết', isShared: true, breakdown: createBreakdown(31200, 13100, true) },
  { id: 't11-06', date: '06/11/2025', revenue: 28500, sharedExpense: 12800, privateExpense: 0, totalBalance: 15700, splitBalance: 15700, remainingBalance: 15700, note: "", status: TransactionStatus.VERIFIED, details: 'Chi tiết', isShared: true, breakdown: createBreakdown(28500, 12800, true) },
  { id: 't11-08', date: '08/11/2025', revenue: 42000, sharedExpense: 14500, privateExpense: 0, totalBalance: 27500, splitBalance: 27500, remainingBalance: 27500, note: "Cuối tuần khách đông", status: TransactionStatus.PAID, details: 'Chi tiết', isShared: true, breakdown: createBreakdown(42000, 14500, true) },
  { id: 't11-10', date: '10/11/2025', revenue: 26800, sharedExpense: 12600, privateExpense: 200, totalBalance: 14200, splitBalance: 14200, remainingBalance: 14000, note: "Ăn ca", status: TransactionStatus.VERIFIED, details: 'Chi tiết', isShared: true, breakdown: createBreakdown(26800, 12600, true) },
  { id: 't11-12', date: '12/11/2025', revenue: 33400, sharedExpense: 13400, privateExpense: 0, totalBalance: 20000, splitBalance: 20000, remainingBalance: 20000, note: "", status: TransactionStatus.VERIFIED, details: 'Chi tiết', isShared: true, breakdown: createBreakdown(33400, 13400, true) },
  { id: 't11-14', date: '14/11/2025', revenue: 24100, sharedExpense: 12200, privateExpense: 1500, totalBalance: 11900, splitBalance: 11900, remainingBalance: 10400, note: "Thay lọc dầu", status: TransactionStatus.VERIFIED, details: 'Chi tiết', isShared: true, breakdown: createBreakdown(24100, 12200, true) },
  { id: 't11-16', date: '16/11/2025', revenue: 45600, sharedExpense: 15000, privateExpense: 0, totalBalance: 30600, splitBalance: 30600, remainingBalance: 30600, note: "Đoàn du lịch ghép", status: TransactionStatus.PAID, details: 'Chi tiết', isShared: true, breakdown: createBreakdown(45600, 15000, true) },
  { id: 't11-18', date: '18/11/2025', revenue: 27500, sharedExpense: 12500, privateExpense: 0, totalBalance: 15000, splitBalance: 15000, remainingBalance: 15000, note: "", status: TransactionStatus.VERIFIED, details: 'Chi tiết', isShared: true, breakdown: createBreakdown(27500, 12500, true) },
  { id: 't11-20', date: '20/11/2025', revenue: 18500, sharedExpense: 11500, privateExpense: 0, totalBalance: 7000, splitBalance: 3500, remainingBalance: 3500, note: "Chạy tăng cường 1 mình", status: TransactionStatus.VERIFIED, details: 'Chi tiết', isShared: false, breakdown: createBreakdown(18500, 11500, false) },
  { id: 't11-22', date: '22/11/2025', revenue: 30200, sharedExpense: 13000, privateExpense: 0, totalBalance: 17200, splitBalance: 17200, remainingBalance: 17200, note: "", status: TransactionStatus.VERIFIED, details: 'Chi tiết', isShared: true, breakdown: createBreakdown(30200, 13000, true) },
  { id: 't11-24', date: '24/11/2025', revenue: 29800, sharedExpense: 12900, privateExpense: 0, totalBalance: 16900, splitBalance: 16900, remainingBalance: 16900, note: "", status: TransactionStatus.VERIFIED, details: 'Chi tiết', isShared: true, breakdown: createBreakdown(29800, 12900, true) },
  { id: 't11-26', date: '26/11/2025', revenue: 35000, sharedExpense: 13500, privateExpense: 2500, totalBalance: 21500, splitBalance: 21500, remainingBalance: 19000, note: "Nộp phạt vi phạm", status: TransactionStatus.VERIFIED, details: 'Chi tiết', isShared: true, breakdown: createBreakdown(35000, 13500, true) },
  { id: 't11-28', date: '28/11/2025', revenue: 26500, sharedExpense: 12500, privateExpense: 0, totalBalance: 14000, splitBalance: 14000, remainingBalance: 14000, note: "", status: TransactionStatus.VERIFIED, details: 'Chi tiết', isShared: true, breakdown: createBreakdown(26500, 12500, true) },
  { id: 't11-30', date: '30/11/2025', revenue: 41000, sharedExpense: 14200, privateExpense: 0, totalBalance: 26800, splitBalance: 26800, remainingBalance: 26800, note: "Chốt sổ cuối tháng", status: TransactionStatus.PAID, details: 'Chi tiết', isShared: true, breakdown: createBreakdown(41000, 14200, true) },

  // --- THÁNG 10/2025 (Dữ liệu đối chiếu đầy đủ) ---
  { id: 't10-02', date: '02/10/2025', revenue: 24000, sharedExpense: 12000, privateExpense: 0, totalBalance: 12000, splitBalance: 12000, remainingBalance: 12000, note: "Đầu tháng", status: TransactionStatus.PAID, details: 'CT', isShared: true, breakdown: createBreakdown(24000, 12000, true) },
  { id: 't10-04', date: '04/10/2025', revenue: 34000, sharedExpense: 14000, privateExpense: 4700, totalBalance: 20000, splitBalance: 20000, remainingBalance: 15300, note: "Anh Trung mua đồ", status: TransactionStatus.VERIFIED, details: 'CT', isShared: true, breakdown: createBreakdown(34000, 14000, true) },
  { id: 't10-06', date: '06/10/2025', revenue: 26000, sharedExpense: 12500, privateExpense: 0, totalBalance: 13500, splitBalance: 13500, remainingBalance: 13500, note: "", status: TransactionStatus.VERIFIED, details: 'CT', isShared: true, breakdown: createBreakdown(26000, 12500, true) },
  { id: 't10-08', date: '08/10/2025', revenue: 38000, sharedExpense: 14000, privateExpense: 0, totalBalance: 24000, splitBalance: 24000, remainingBalance: 24000, note: "Khách đông", status: TransactionStatus.PAID, details: 'CT', isShared: true, breakdown: createBreakdown(38000, 14000, true) },
  { id: 't10-10', date: '10/10/2025', revenue: 25000, sharedExpense: 12000, privateExpense: 0, totalBalance: 13000, splitBalance: 13000, remainingBalance: 13000, note: "", status: TransactionStatus.VERIFIED, details: 'CT', isShared: true, breakdown: createBreakdown(25000, 12000, true) },
  { id: 't10-12', date: '12/10/2025', revenue: 32000, sharedExpense: 13500, privateExpense: 0, totalBalance: 18500, splitBalance: 18500, remainingBalance: 18500, note: "", status: TransactionStatus.VERIFIED, details: 'CT', isShared: true, breakdown: createBreakdown(32000, 13500, true) },
  { id: 't10-14', date: '14/10/2025', revenue: 23000, sharedExpense: 11800, privateExpense: 500, totalBalance: 11200, splitBalance: 11200, remainingBalance: 10700, note: "Sửa đèn", status: TransactionStatus.VERIFIED, details: 'CT', isShared: true, breakdown: createBreakdown(23000, 11800, true) },
  { id: 't10-16', date: '16/10/2025', revenue: 42000, sharedExpense: 14500, privateExpense: 0, totalBalance: 27500, splitBalance: 27500, remainingBalance: 27500, note: "Khách đoàn", status: TransactionStatus.PAID, details: 'CT', isShared: true, breakdown: createBreakdown(42000, 14500, true) },
  { id: 't10-18', date: '18/10/2025', revenue: 28000, sharedExpense: 12500, privateExpense: 0, totalBalance: 15500, splitBalance: 15500, remainingBalance: 15500, note: "", status: TransactionStatus.VERIFIED, details: 'CT', isShared: true, breakdown: createBreakdown(28000, 12500, true) },
  { id: 't10-20', date: '20/10/2025', revenue: 19000, sharedExpense: 11500, privateExpense: 0, totalBalance: 7500, splitBalance: 3750, remainingBalance: 3750, note: "Chạy 1 mình", status: TransactionStatus.VERIFIED, details: 'CT', isShared: false, breakdown: createBreakdown(19000, 11500, false) },
  { id: 't10-22', date: '22/10/2025', revenue: 29000, sharedExpense: 12800, privateExpense: 0, totalBalance: 16200, splitBalance: 16200, remainingBalance: 16200, note: "", status: TransactionStatus.VERIFIED, details: 'CT', isShared: true, breakdown: createBreakdown(29000, 12800, true) },
  { id: 't10-24', date: '24/10/2025', revenue: 28500, sharedExpense: 12500, privateExpense: 0, totalBalance: 16000, splitBalance: 16000, remainingBalance: 16000, note: "", status: TransactionStatus.VERIFIED, details: 'CT', isShared: true, breakdown: createBreakdown(28500, 12500, true) },
  { id: 't10-26', date: '26/10/2025', revenue: 33000, sharedExpense: 13200, privateExpense: 1000, totalBalance: 19800, splitBalance: 19800, remainingBalance: 18800, note: "Thay dầu", status: TransactionStatus.VERIFIED, details: 'CT', isShared: true, breakdown: createBreakdown(33000, 13200, true) },
  { id: 't10-28', date: '28/10/2025', revenue: 25500, sharedExpense: 12200, privateExpense: 0, totalBalance: 13300, splitBalance: 13300, remainingBalance: 13300, note: "", status: TransactionStatus.VERIFIED, details: 'CT', isShared: true, breakdown: createBreakdown(25500, 12200, true) },
  { id: 't10-30', date: '30/10/2025', revenue: 39000, sharedExpense: 14000, privateExpense: 0, totalBalance: 25000, splitBalance: 25000, remainingBalance: 25000, note: "Cuối tháng", status: TransactionStatus.PAID, details: 'CT', isShared: true, breakdown: createBreakdown(39000, 14000, true) },
];

export const getTransactionsByMonth = (month: number, year: number): Transaction[] => {
  const prefix = `/${month.toString().padStart(2, '0')}/${year}`;
  return MOCK_DATABASE.filter(t => t.date.endsWith(prefix));
};