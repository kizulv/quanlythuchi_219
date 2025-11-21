import { Transaction } from '../types';
import rawData from './mockData.json';

// Type assertion to ensure safety when importing from JSON
const MOCK_DATABASE: Transaction[] = rawData as unknown as Transaction[];

export const getTransactionsByMonth = (month: number, year: number): Transaction[] => {
  const prefix = `/${month.toString().padStart(2, '0')}/${year}`;
  return MOCK_DATABASE.filter(t => t.date.endsWith(prefix));
};

export { MOCK_DATABASE };