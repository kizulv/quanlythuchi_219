
export enum TransactionStatus {
  PAID = 'PAID',
  VERIFIED = 'VERIFIED',
  AI_GENERATED = 'AI_GENERATED'
}

export interface OtherRevenueItem {
  id: string;
  description: string;
  amount: number;
}

export interface OtherExpenseItem {
  id: string;
  description: string;
  amount: number;
}

export interface PrivateExpenseItem {
  id: string;
  description: string;
  amount: number;
}

export interface TransactionBreakdown {
  revenueDown: number;
  revenueUp: number;
  revenueOther: number;
  otherRevenueItems?: OtherRevenueItem[];
  expenseFuel: number;
  expenseFixed: number;
  expensePolice: number;
  expenseRepair: number;
  expenseOther: number;
  otherExpenseItems?: OtherExpenseItem[];
  privateExpenseItems?: PrivateExpenseItem[]; // Thêm trường này
  isShared: boolean;
  busId: string;
  partnerBusId: string;
}

export interface Transaction {
  id: string;
  date: string;
  paymentMonth?: string; // Format: YYYY.MM (VD: 2025.10, 2025.11)
  revenue: number;
  sharedExpense: number;
  totalBalance: number;
  splitBalance: number;
  privateExpense: number;
  remainingBalance: number;
  note: string;
  status: TransactionStatus;
  details: string;
  isShared: boolean;
  breakdown?: TransactionBreakdown;
  imageUrl?: string; // Link ảnh sổ sách
}

export interface DashboardStats {
  periodBalance: number;
  periodBalanceGrowth: number;
  afterSplitBalance: number;
  afterSplitBalanceGrowth: number;
}

export interface FilterOptions {
  search: string;
  startDate?: string;
  endDate?: string;
}

// --- RECONCILIATION TYPES ---
export interface ReconItem {
  id: string;
  description: string;
  amount: number;
}

export interface ReconciliationReport {
  id: string; // Format: recon_MM_YYYY
  month: number;
  year: number;
  cashStorage: number;
  cashWallet: number;
  bankAccount: number;
  existingMoney: number;
  paidItems: ReconItem[];
  debtItems: ReconItem[];
  lastUpdated: string;
}