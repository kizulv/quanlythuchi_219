import { Transaction } from '../types';
import rawData from './mockData.json';

// Ensure we treat rawData as unknown first to avoid type overlap issues
const MOCK_DATABASE: Transaction[] = (rawData as unknown) as Transaction[];

export const getTransactionsByMonth = (month: number, year: number): Transaction[] => {
  const prefix = `/${month.toString().padStart(2, '0')}/${year}`;
  return MOCK_DATABASE.filter(t => t.date.endsWith(prefix));
};

export { MOCK_DATABASE };
