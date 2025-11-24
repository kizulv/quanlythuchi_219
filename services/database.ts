import { Transaction, ReconciliationReport, TransactionStatus, PaymentCycle, Bus } from '../types';

// API Endpoints
const API_URL = '/api';

// Helper for sorting
const parseDate = (dateStr: string): number => {
  if (!dateStr) return 0;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return 0;
  const [d, m, y] = parts.map(Number);
  return new Date(y, m - 1, d).getTime();
};

// --- GENERIC FETCH HELPERS ---
async function fetchJson<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_URL}/${endpoint}`);
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
  return res.json();
}

async function postJson(endpoint: string, data: any) {
  const res = await fetch(`${API_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to post to ${endpoint}`);
  return res.json();
}

async function deleteJson(endpoint: string, id: string) {
  const res = await fetch(`${API_URL}/${endpoint}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`Failed to delete from ${endpoint}`);
  return res.json();
}

export const db = {
  // Init is no longer needed as files are persistent on server
  init: () => {
    console.log("Database initialized (File System Mode)");
  },

  getAll: async (): Promise<Transaction[]> => {
    const transactions = await fetchJson<Transaction[]>('transactions');
    transactions.sort((a, b) => parseDate(a.date) - parseDate(b.date));
    return transactions;
  },

  getPaymentCycles: async (): Promise<PaymentCycle[]> => {
    const cycles = await fetchJson<PaymentCycle[]>('cycles');
    cycles.sort((a, b) => b.id.localeCompare(a.id));
    return cycles;
  },

  getBuses: async (): Promise<Bus[]> => {
    return fetchJson<Bus[]>('buses');
  },

  saveBus: async (bus: Bus): Promise<void> => {
    if (!bus.id) {
      bus.id = `bus_${Date.now()}`;
    }
    await postJson('buses', bus);
  },

  deleteBus: async (id: string): Promise<void> => {
    await deleteJson('buses', id);
  },

  getTransactionsByCycle: async (cycleId?: string): Promise<Transaction[]> => {
    const allTransactions = await db.getAll();

    if (cycleId) {
      // Fetch historical cycle
      const cycles = await db.getPaymentCycles();
      const cycle = cycles.find(c => c.id === cycleId);
      
      if (cycle) {
        return allTransactions.filter(t => cycle.transactionIds.includes(t.id));
      } else {
        return allTransactions.filter(t => t.paymentMonth === cycleId);
      }
    } else {
      // Fetch Open/Unpaid Items
      return allTransactions.filter(t => t.status !== TransactionStatus.PAID && !t.paymentMonth);
    }
  },

  getCycleData: async (month: number, year: number, strict: boolean = false): Promise<Transaction[]> => {
    const cycleId = `${year}.${month.toString().padStart(2, '0')}`;
    const cycles = await db.getPaymentCycles();
    const exists = cycles.find(c => c.id === cycleId);

    if (exists) {
      return db.getTransactionsByCycle(cycleId);
    } else {
      if (strict) return [];
      return db.getTransactionsByCycle(undefined);
    }
  },

  search: async (query: string): Promise<Transaction[]> => {
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
    if (!transaction.id) {
      transaction.id = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    await postJson('transactions', transaction);
  },

  createPaymentCycle: async (ids: string[], month: number, year: number, totalAmount: number, note?: string): Promise<void> => {
    const cycleId = `${year}.${month.toString().padStart(2, '0')}`;
    const today = new Date();
    const createdDate = `${today.getDate().toString().padStart(2,'0')}/${(today.getMonth()+1).toString().padStart(2,'0')}/${today.getFullYear()}`;

    // 1. Create/Update Cycle
    const newCycle: PaymentCycle = {
      id: cycleId,
      createdDate,
      transactionIds: ids,
      totalAmount,
      note: note || `Thanh toán kỳ ${month}/${year}`
    };
    await postJson('cycles', newCycle);

    // 2. Update Transactions
    const all = await db.getAll();
    const updates = all.filter(t => ids.includes(t.id)).map(t => ({
       ...t,
       status: TransactionStatus.PAID,
       paymentMonth: cycleId
    }));
    
    // Batch update (simple loop since we don't have a bulk API yet)
    await Promise.all(updates.map(t => postJson('transactions', t)));
  },

  updatePaymentCycle: async (cycleId: string, newIds: string[], totalAmount: number, note?: string): Promise<void> => {
    const cycles = await db.getPaymentCycles();
    const existingCycle = cycles.find(c => c.id === cycleId);
    if (!existingCycle) throw new Error("Cycle not found");

    // 1. Update Cycle
    const updatedCycle = {
      ...existingCycle,
      transactionIds: newIds,
      totalAmount,
      note: note !== undefined ? note : existingCycle.note
    };
    await postJson('cycles', updatedCycle);

    // 2. Update Transactions
    const all = await db.getAll();
    const updates = [];

    for (const t of all) {
      // Case A: Is in the new list -> Must be PAID
      if (newIds.includes(t.id)) {
        if (t.status !== TransactionStatus.PAID || t.paymentMonth !== cycleId) {
           updates.push({ ...t, status: TransactionStatus.PAID, paymentMonth: cycleId });
        }
      }
      // Case B: Was in this cycle, but removed -> Revert to VERIFIED
      else if (t.paymentMonth === cycleId) {
        updates.push({ ...t, status: TransactionStatus.VERIFIED, paymentMonth: undefined });
      }
    }

    await Promise.all(updates.map(t => postJson('transactions', t)));
  },

  deletePaymentCycle: async (cycleId: string): Promise<void> => {
    // 1. Remove Cycle
    await deleteJson('cycles', cycleId);

    // 2. Revert Transactions
    const all = await db.getAll();
    const toRevert = all.filter(t => t.paymentMonth === cycleId);
    
    await Promise.all(toRevert.map(t => 
      postJson('transactions', { ...t, status: TransactionStatus.VERIFIED, paymentMonth: undefined })
    ));
  },

  markAsPaid: async (ids: string[], month: number, year: number): Promise<void> => {
    console.warn("markAsPaid is deprecated. Use createPaymentCycle.");
    await db.createPaymentCycle(ids, month, year, 0);
  },

  delete: async (id: string): Promise<void> => {
    await deleteJson('transactions', id);
  },

  getReconciliation: async (month: number, year: number): Promise<ReconciliationReport | null> => {
    const recons = await fetchJson<ReconciliationReport[]>('reconciliations');
    const id = `recon_${month}_${year}`;
    return recons.find(r => r.id === id) || null;
  },

  saveReconciliation: async (report: ReconciliationReport): Promise<void> => {
    await postJson('reconciliations', { ...report, lastUpdated: new Date().toISOString() });
  }
};
