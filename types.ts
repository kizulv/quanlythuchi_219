
export enum TransactionStatus {
  PAID = 'PAID',
  VERIFIED = 'VERIFIED'
}

export interface TransactionBreakdown {
  revenueDown: number;
  revenueUp: number;
  revenueOther: number;
  expenseFuel: number;
  expenseFixed: number;
  expensePolice: number;
  expenseRepair: number;
  expenseOther: number;
  isShared: boolean;
  busId: string;
  partnerBusId: string;
}

export interface Transaction {
  id: string;
  date: string;
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