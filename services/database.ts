
import { Transaction } from '../types';
import { MOCK_DATABASE } from '../data/mockData';

const DB_KEY = 'busmanager_db_v1';

// Simulate MongoDB-like API
export const db = {
  init: () => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(DB_KEY)) {
      localStorage.setItem(DB_KEY, JSON.stringify(MOCK_DATABASE));
      console.log('Database initialized with mock data');
    }
  },

  getAll: async (): Promise<Transaction[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [];
  },

  getByMonth: async (month: number, year: number): Promise<Transaction[]> => {
    const all = await db.getAll();
    const monthStr = month.toString().padStart(2, '0');
    // Matches dates ending in /MM/YYYY (e.g., 02/11/2025)
    const suffix = `/${monthStr}/${year}`;
    return all.filter(t => t.date.endsWith(suffix));
  },

  search: async (query: string): Promise<Transaction[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    const all = await db.getAll();
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase().trim();
    return all.filter(t => 
      (t.note && t.note.toLowerCase().includes(lowerQuery)) || 
      (t.date && t.date.includes(query))
    );
  },

  save: async (transaction: Transaction): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const all = await db.getAll();
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
    
    localStorage.setItem(DB_KEY, JSON.stringify(all));
  },

  delete: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const all = await db.getAll();
    const filtered = all.filter(t => t.id !== id);
    localStorage.setItem(DB_KEY, JSON.stringify(filtered));
  }
};
