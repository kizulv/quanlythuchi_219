

import { Transaction, ReconciliationReport, TransactionStatus, PaymentCycle, Bus } from '../types';
import { MOCK_DATABASE } from '../data/mockData';
import { MOCK_BUSES } from '../data/busData';
import { MOCK_RECONCILIATION_REPORTS } from '../data/reconData';
import { MOCK_PAYMENT_CYCLES } from '../data/paymentMonthData';

const DB_KEY = 'busmanager_db_v1';
const RECON_DB_KEY = 'busmanager_recon_v1';
const CYCLES_DB_KEY = 'busmanager_cycles_v1';
const BUSES_DB_KEY = 'busmanager_buses_v1';

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

    // Init Reconciliation Collection
    if (!localStorage.getItem(RECON_DB_KEY)) {
      localStorage.setItem(RECON_DB_KEY, JSON.stringify(MOCK_RECONCILIATION_REPORTS));
      console.log('Reconciliation Database initialized with mock data');
    }

    // Init Payment Cycles Collection
    if (!localStorage.getItem(CYCLES_DB_KEY)) {
      localStorage.setItem(CYCLES_DB_KEY, JSON.stringify(MOCK_PAYMENT_CYCLES));
      console.log('Payment Cycles Database initialized with mock data');
    }

    // Init Buses Collection
    if (!localStorage.getItem(BUSES_DB_KEY)) {
      localStorage.setItem(BUSES_DB_KEY, JSON.stringify(MOCK_BUSES));
      console.log('Buses Database initialized with mock data');
    }
  },

  getAll: async (): Promise<Transaction[]> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const data = localStorage.getItem(DB_KEY);
    let transactions: Transaction[] = data ? JSON.parse(data) : [];
    transactions.sort((a, b) => parseDate(a.date) - parseDate(b.date));
    return transactions;
  },

  getPaymentCycles: async (): Promise<PaymentCycle[]> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const data = localStorage.getItem(CYCLES_DB_KEY);
    let cycles: PaymentCycle[] = data ? JSON.parse(data) : [];
    // Sort by ID descending (newest first)
    cycles.sort((a, b) => b.id.localeCompare(a.id));
    return cycles;
  },

  getBuses: async (): Promise<Bus[]> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const data = localStorage.getItem(BUSES_DB_KEY);
    let buses: Bus[] = data ? JSON.parse(data) : [];
    return buses;
  },

  saveBus: async (bus: Bus): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const data = localStorage.getItem(BUSES_DB_KEY);
    let buses: Bus[] = data ? JSON.parse(data) : [];
    
    const index = buses.findIndex(b => b.id === bus.id);
    if (index >= 0) {
      buses[index] = bus;
    } else {
      if (!bus.id) {
        bus.id = `bus_${Date.now()}`;
      }
      buses.push(bus);
    }
    localStorage.setItem(BUSES_DB_KEY, JSON.stringify(buses));
  },

  deleteBus: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const data = localStorage.getItem(BUSES_DB_KEY);
    let buses: Bus[] = data ? JSON.parse(data) : [];
    const filtered = buses.filter(b => b.id !== id);
    localStorage.setItem(BUSES_DB_KEY, JSON.stringify(filtered));
  },

  /**
   * Get data based on Cycle ID.
   * If cycleId is provided: Fetch historical data linked to that cycle.
   * If cycleId is NULL/Undefined: Fetch "Open" items (Unpaid).
   */
  getTransactionsByCycle: async (cycleId?: string): Promise<Transaction[]> => {
    const allTransactions = await db.getAll();

    if (cycleId) {
      // Fetch historical cycle
      const cycles = await db.getPaymentCycles();
      const cycle = cycles.find(c => c.id === cycleId);
      
      if (cycle) {
        // Filter transactions that are in the cycle's ID list
        return allTransactions.filter(t => cycle.transactionIds.includes(t.id));
      } else {
        // Fallback: try to find by property if cycle record missing (migration safety)
        return allTransactions.filter(t => t.paymentMonth === cycleId);
      }
    } else {
      // Fetch Open/Unpaid Items
      // Logic: Status != PAID OR paymentMonth is empty
      return allTransactions.filter(t => t.status !== TransactionStatus.PAID && !t.paymentMonth);
    }
  },

  /**
   * Legacy method helper, maps month/year to cycle or open items
   */
  getCycleData: async (month: number, year: number, strict: boolean = false): Promise<Transaction[]> => {
    // This method is kept for compatibility but redirected to new logic where possible
    // strict=false implies "Current view" usually
    const cycleId = `${year}.${month.toString().padStart(2, '0')}`;
    
    // Check if cycle exists
    const cycles = await db.getPaymentCycles();
    const exists = cycles.find(c => c.id === cycleId);

    if (exists) {
      return db.getTransactionsByCycle(cycleId);
    } else {
      if (strict) return []; // Asking for a specific past cycle that doesn't exist
      return db.getTransactionsByCycle(undefined); // Return open items
    }
  },

  search: async (query: string): Promise<Transaction[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const all = await db.getAll();
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
    const all = await db.getAll();
    const index = all.findIndex(t => t.id === transaction.id);
    
    if (index >= 0) {
      all[index] = transaction;
    } else {
      if (!transaction.id) {
        transaction.id = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      all.push(transaction);
    }
    localStorage.setItem(DB_KEY, JSON.stringify(all));
  },

  createPaymentCycle: async (ids: string[], month: number, year: number, totalAmount: number, note?: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const cycleId = `${year}.${month.toString().padStart(2, '0')}`;
    const today = new Date();
    const createdDate = `${today.getDate().toString().padStart(2,'0')}/${(today.getMonth()+1).toString().padStart(2,'0')}/${today.getFullYear()}`;

    // 1. Create PaymentCycle Record
    const cycles = await db.getPaymentCycles();
    const existingIndex = cycles.findIndex(c => c.id === cycleId);
    
    const newCycle: PaymentCycle = {
      id: cycleId,
      createdDate,
      transactionIds: ids,
      totalAmount,
      note: note || `Thanh toán kỳ ${month}/${year}`
    };

    if (existingIndex >= 0) {
       cycles[existingIndex] = newCycle;
    } else {
       cycles.push(newCycle);
    }
    localStorage.setItem(CYCLES_DB_KEY, JSON.stringify(cycles));

    // 2. Update Transactions
    const all = await db.getAll();
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

  updatePaymentCycle: async (cycleId: string, newIds: string[], totalAmount: number, note?: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 400));

    // 1. Update Cycle Record
    const cycles = await db.getPaymentCycles();
    const cycleIndex = cycles.findIndex(c => c.id === cycleId);
    
    if (cycleIndex === -1) throw new Error("Cycle not found");
    
    const existingCycle = cycles[cycleIndex];

    cycles[cycleIndex] = {
      ...existingCycle,
      transactionIds: newIds,
      totalAmount: totalAmount,
      note: note !== undefined ? note : existingCycle.note
    };
    localStorage.setItem(CYCLES_DB_KEY, JSON.stringify(cycles));

    // 2. Update Transactions
    // Logic: 
    // - If transaction was in this cycle but NOT in newIds -> Revert to VERIFIED, remove paymentMonth
    // - If transaction is in newIds -> Ensure it is PAID and paymentMonth is set
    const all = await db.getAll();
    
    const updatedAll = all.map(t => {
      // Case A: Is in the new list -> Must be PAID
      if (newIds.includes(t.id)) {
        return {
          ...t,
          status: TransactionStatus.PAID,
          paymentMonth: cycleId
        };
      }
      // Case B: Was in this cycle, but removed -> Revert to VERIFIED/AI (Open)
      else if (t.paymentMonth === cycleId) {
        return {
          ...t,
          status: TransactionStatus.VERIFIED, // or revert to AI_GENERATED if needed, but VERIFIED is safer
          paymentMonth: undefined
        };
      }
      // Case C: Unrelated -> Keep as is
      return t;
    });

    localStorage.setItem(DB_KEY, JSON.stringify(updatedAll));
  },

  deletePaymentCycle: async (cycleId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // 1. Remove Cycle Record
    const cycles = await db.getPaymentCycles();
    const newCycles = cycles.filter(c => c.id !== cycleId);
    localStorage.setItem(CYCLES_DB_KEY, JSON.stringify(newCycles));

    // 2. Revert Transactions to Unpaid (VERIFIED)
    const all = await db.getAll();
    const updatedAll = all.map(t => {
      if (t.paymentMonth === cycleId) {
        return {
          ...t,
          status: TransactionStatus.VERIFIED,
          paymentMonth: undefined
        };
      }
      return t;
    });
    localStorage.setItem(DB_KEY, JSON.stringify(updatedAll));
  },

  markAsPaid: async (ids: string[], month: number, year: number): Promise<void> => {
    console.warn("markAsPaid is deprecated. Use createPaymentCycle.");
    await db.createPaymentCycle(ids, month, year, 0);
  },

  delete: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const all = await db.getAll();
    const filtered = all.filter(t => t.id !== id);
    localStorage.setItem(DB_KEY, JSON.stringify(filtered));
  },

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