
import { Transaction, ReconciliationReport, TransactionStatus } from '../types';
import { MOCK_DATABASE } from '../data/mockData';
import { MOCK_RECONCILIATION_REPORTS } from '../data/reconData';

const DB_KEY = 'busmanager_db_v1';
const RECON_DB_KEY = 'busmanager_recon_v1';

// Helper to parse date string "DD/MM/YYYY" to timestamp for sorting
const parseDate = (dateStr: string): number => {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return 0;
  const [d, m, y] = parts.map(Number);
  return new Date(y, m - 1, d).getTime();
};

// Simulate MongoDB-like API
export const db = {
  init: () => {
    if (typeof window === 'undefined') return;
    
    // Init Transactions Collection
    if (!localStorage.getItem(DB_KEY)) {
      localStorage.setItem(DB_KEY, JSON.stringify(MOCK_DATABASE));
      console.log('Transaction Database initialized with mock data');
    }

    // Init Reconciliation Collection with Mock Data from data/reconData.ts
    if (!localStorage.getItem(RECON_DB_KEY)) {
      localStorage.setItem(RECON_DB_KEY, JSON.stringify(MOCK_RECONCILIATION_REPORTS));
      console.log('Reconciliation Database initialized with mock data');
    }
  },

  getAll: async (): Promise<Transaction[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    const data = localStorage.getItem(DB_KEY);
    let transactions: Transaction[] = data ? JSON.parse(data) : [];
    
    // Database sắp xếp theo ngày tháng tăng dần từ thấp đến cao
    transactions.sort((a, b) => parseDate(a.date) - parseDate(b.date));
    
    return transactions;
  },

  getByMonth: async (month: number, year: number): Promise<Transaction[]> => {
    const all = await db.getAll(); // getAll is now sorted
    const monthStr = month.toString().padStart(2, '0');
    // Matches dates ending in /MM/YYYY (e.g., 02/11/2025)
    const suffix = `/${monthStr}/${year}`;
    return all.filter(t => t.date.endsWith(suffix));
  },

  /**
   * Lấy dữ liệu theo KỲ THANH TOÁN (Cycle)
   * - Nếu kỳ đó đã thanh toán (có bản ghi paymentMonth = 'YYYY.MM'), trả về bản ghi đó.
   * - Nếu kỳ đó chưa thanh toán (thường là tháng hiện tại), trả về tất cả bản ghi chưa thanh toán (status != PAID).
   */
  getCycleData: async (month: number, year: number, strict: boolean = false): Promise<Transaction[]> => {
    const all = await db.getAll();
    const cycleId = `${year}.${month.toString().padStart(2, '0')}`; // ex: 2025.10

    // 1. Tìm xem có bản ghi nào đã được gán cho kỳ thanh toán này chưa
    const paidItems = all.filter(t => t.paymentMonth === cycleId);

    if (paidItems.length > 0) {
      return paidItems;
    }

    // 2. Nếu không có bản ghi đã thanh toán nào cho kỳ này
    // Nếu strict mode (dùng cho so sánh quá khứ), trả về rỗng.
    if (strict) {
      return [];
    }

    // Nếu không strict (chế độ xem tháng hiện tại), trả về các bản ghi chưa thanh toán (backlog)
    // Logic: Các bản ghi chưa có paymentMonth (hoặc rỗng) VÀ trạng thái KHÁC PAID
    const unpaidItems = all.filter(t => (!t.paymentMonth || t.paymentMonth === "") && t.status !== TransactionStatus.PAID);
    return unpaidItems;
  },

  search: async (query: string): Promise<Transaction[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    const all = await db.getAll(); // getAll is now sorted
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase().trim();
    return all.filter(t => 
      (t.note && t.note.toLowerCase().includes(lowerQuery)) || 
      (t.date && t.date.toLowerCase().includes(lowerQuery)) ||
      (t.paymentMonth && t.paymentMonth.includes(lowerQuery))
    );
  },

  save: async (transaction: Transaction): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const all = await db.getAll(); // fetch sorted
    const index = all.findIndex(t => t.id === transaction.id);
    
    if (index >= 0) {
      // Update existing
      all[index] = transaction;
    } else {
      // Insert new
      // Generate a pseudo-ObjectId if missing
      if (!transaction.id) {
        transaction.id = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      all.push(transaction);
    }
    
    // Save back to storage
    localStorage.setItem(DB_KEY, JSON.stringify(all));
  },

  markAsPaid: async (ids: string[], month: number, year: number): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const all = await db.getAll();
    const cycleId = `${year}.${month.toString().padStart(2, '0')}`;

    // Update only matching IDs
    const updatedAll = all.map(t => {
      if (ids.includes(t.id)) {
        return {
          ...t,
          status: TransactionStatus.PAID,
          paymentMonth: cycleId
        };
      }
      return t;
    });

    localStorage.setItem(DB_KEY, JSON.stringify(updatedAll));
  },

  delete: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const all = await db.getAll();
    const filtered = all.filter(t => t.id !== id);
    localStorage.setItem(DB_KEY, JSON.stringify(filtered));
  },

  // --- RECONCILIATION METHODS ---
  
  getReconciliation: async (month: number, year: number): Promise<ReconciliationReport | null> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const data = localStorage.getItem(RECON_DB_KEY);
    const allRecons: ReconciliationReport[] = data ? JSON.parse(data) : [];
    
    const id = `recon_${month}_${year}`;
    return allRecons.find(r => r.id === id) || null;
  },

  saveReconciliation: async (report: ReconciliationReport): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const data = localStorage.getItem(RECON_DB_KEY);
    const allRecons: ReconciliationReport[] = data ? JSON.parse(data) : [];
    
    const index = allRecons.findIndex(r => r.id === report.id);
    if (index >= 0) {
      allRecons[index] = { ...report, lastUpdated: new Date().toISOString() };
    } else {
      allRecons.push({ ...report, lastUpdated: new Date().toISOString() });
    }
    
    localStorage.setItem(RECON_DB_KEY, JSON.stringify(allRecons));
  }
};
