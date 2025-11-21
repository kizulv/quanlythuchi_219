
import { Transaction } from '../types';

// Sử dụng đường dẫn tương đối, Vite Proxy sẽ chuyển tiếp đến localhost:4001
const API_URL = '/api'; 

export const fetchTransactions = async (month: number, year: number): Promise<Transaction[]> => {
  try {
    const response = await fetch(`${API_URL}/transactions?month=${month}&year=${year}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server Error ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    return data as Transaction[];
  } catch (error) {
    console.error('Error loading transactions:', error);
    return [];
  }
};

export const saveTransactionApi = async (transaction: Transaction): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction),
    });

    if (!response.ok) {
      throw new Error('Failed to save transaction');
    }
    return true;
  } catch (error) {
    console.error('Error saving transaction:', error);
    return false;
  }
};
