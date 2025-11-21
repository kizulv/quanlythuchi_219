
import { Transaction } from '../types';
import { rawData } from './mockDataRaw';

// Use the rawData from TS file instead of JSON import
const MOCK_DATABASE: Transaction[] = rawData as unknown as Transaction[];

export const getTransactionsByMonth = (month: number, year: number): Transaction[] => {
  const prefix = `/${month.toString().padStart(2, '0')}/${year}`;
  return MOCK_DATABASE.filter(t => t.date.endsWith(prefix));
};

export { MOCK_DATABASE };
