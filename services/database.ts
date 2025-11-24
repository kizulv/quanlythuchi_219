import {
  Transaction,
  ReconciliationReport,
  TransactionStatus,
  PaymentCycle,
  Bus,
} from "../types";

const API_URL = "/api";

const parseDate = (dateStr: string): number => {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return 0;
  const [d, m, y] = parts.map(Number);
  return new Date(y, m - 1, d).getTime();
};

export const db = {
  init: () => {},

  getAll: async (): Promise<Transaction[]> => {
    try {
      const res = await fetch(`${API_URL}/transactions`);
      let transactions: Transaction[] = await res.json();
      transactions.sort((a, b) => parseDate(a.date) - parseDate(b.date));
      return transactions;
    } catch (error) {
      console.error("Failed to fetch transactions", error);
      return [];
    }
  },

  getPaymentCycles: async (): Promise<PaymentCycle[]> => {
    try {
      const res = await fetch(`${API_URL}/cycles`);
      let cycles: PaymentCycle[] = await res.json();
      cycles.sort((a, b) => b.id.localeCompare(a.id));
      return cycles;
    } catch (error) {
      return [];
    }
  },

  getBuses: async (): Promise<Bus[]> => {
    try {
      const res = await fetch(`${API_URL}/buses`);
      return await res.json();
    } catch (error) {
      return [];
    }
  },

  saveBus: async (bus: Bus): Promise<void> => {
    if (!bus.id) {
      bus.id = `bus_${Date.now()}`;
    }
    await fetch(`${API_URL}/buses`, {
      method: "POST",
      body: JSON.stringify(bus),
    });
  },

  deleteBus: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/buses/${id}`, { method: "DELETE" });
  },

  getTransactionsByCycle: async (cycleId?: string): Promise<Transaction[]> => {
    const allTransactions = await db.getAll();

    if (cycleId) {
      const cycles = await db.getPaymentCycles();
      const cycle = cycles.find((c) => c.id === cycleId);

      if (cycle) {
        return allTransactions.filter((t) =>
          cycle.transactionIds.includes(t.id)
        );
      } else {
        return allTransactions.filter((t) => t.paymentMonth === cycleId);
      }
    } else {
      return allTransactions.filter(
        (t) => t.status !== TransactionStatus.PAID && !t.paymentMonth
      );
    }
  },

  getCycleData: async (
    month: number,
    year: number,
    strict: boolean = false
  ): Promise<Transaction[]> => {
    const cycleId = `${year}.${month.toString().padStart(2, "0")}`;
    const cycles = await db.getPaymentCycles();
    const exists = cycles.find((c) => c.id === cycleId);

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
    return all.filter(
      (t) =>
        (t.note && t.note.toLowerCase().includes(lowerQuery)) ||
        (t.date && t.date.toLowerCase().includes(lowerQuery)) ||
        (t.paymentMonth && t.paymentMonth.includes(lowerQuery))
    );
  },

  save: async (transaction: Transaction): Promise<void> => {
    if (!transaction.id) {
      transaction.id = `trans_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    }
    await fetch(`${API_URL}/transactions`, {
      method: "POST",
      body: JSON.stringify(transaction),
    });
  },

  createPaymentCycle: async (
    ids: string[],
    month: number,
    year: number,
    totalAmount: number,
    note?: string
  ): Promise<void> => {
    const cycleId = `${year}.${month.toString().padStart(2, "0")}`;
    const today = new Date();
    const createdDate = `${today.getDate().toString().padStart(2, "0")}/${(
      today.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${today.getFullYear()}`;

    const newCycle: PaymentCycle = {
      id: cycleId,
      createdDate,
      transactionIds: ids,
      totalAmount,
      note: note || `Thanh toán kỳ ${month}/${year}`,
    };

    await fetch(`${API_URL}/cycles`, {
      method: "POST",
      body: JSON.stringify(newCycle),
    });

    await fetch(`${API_URL}/transactions/batch-update`, {
      method: "POST",
      body: JSON.stringify({
        ids: ids,
        updates: {
          status: TransactionStatus.PAID,
          paymentMonth: cycleId,
        },
      }),
    });
  },

  updatePaymentCycle: async (
    cycleId: string,
    newIds: string[],
    totalAmount: number,
    note?: string
  ): Promise<void> => {
    const cycles = await db.getPaymentCycles();
    const existingCycle = cycles.find((c) => c.id === cycleId);
    if (!existingCycle) throw new Error("Cycle not found");

    const updatedCycle = {
      ...existingCycle,
      transactionIds: newIds,
      totalAmount: totalAmount,
      note: note !== undefined ? note : existingCycle.note,
    };
    await fetch(`${API_URL}/cycles`, {
      method: "POST",
      body: JSON.stringify(updatedCycle),
    });

    const removedIds = existingCycle.transactionIds.filter(
      (id) => !newIds.includes(id)
    );

    if (removedIds.length > 0) {
      await fetch(`${API_URL}/transactions/batch-update`, {
        method: "POST",
        body: JSON.stringify({
          ids: removedIds,
          updates: {
            status: TransactionStatus.VERIFIED,
            paymentMonth: undefined,
          },
        }),
      });
    }

    await fetch(`${API_URL}/transactions/batch-update`, {
      method: "POST",
      body: JSON.stringify({
        ids: newIds,
        updates: {
          status: TransactionStatus.PAID,
          paymentMonth: cycleId,
        },
      }),
    });
  },

  deletePaymentCycle: async (cycleId: string): Promise<void> => {
    await fetch(`${API_URL}/cycles/${cycleId}`, { method: "DELETE" });

    const all = await db.getAll();
    const cycleTransIds = all
      .filter((t) => t.paymentMonth === cycleId)
      .map((t) => t.id);

    if (cycleTransIds.length > 0) {
      await fetch(`${API_URL}/transactions/batch-update`, {
        method: "POST",
        body: JSON.stringify({
          ids: cycleTransIds,
          updates: {
            status: TransactionStatus.VERIFIED,
            paymentMonth: "",
          },
        }),
      });
    }
  },

  markAsPaid: async (
    ids: string[],
    month: number,
    year: number
  ): Promise<void> => {
    console.warn("markAsPaid is deprecated. Use createPaymentCycle.");
    await db.createPaymentCycle(ids, month, year, 0);
  },

  delete: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/transactions/${id}`, { method: "DELETE" });
  },

  getReconciliation: async (
    month: number,
    year: number
  ): Promise<ReconciliationReport | null> => {
    try {
      const res = await fetch(`${API_URL}/recons`);
      const allRecons: ReconciliationReport[] = await res.json();
      const id = `recon_${month}_${year}`;
      return allRecons.find((r) => r.id === id) || null;
    } catch {
      return null;
    }
  },

  saveReconciliation: async (report: ReconciliationReport): Promise<void> => {
    await fetch(`${API_URL}/recons`, {
      method: "POST",
      body: JSON.stringify({
        ...report,
        lastUpdated: new Date().toISOString(),
      }),
    });
  },
};
