
import { ReconciliationReport } from '../types';

// Dữ liệu mẫu cho phần đối soát (giống mockData.ts)
// Giả lập dữ liệu đã lưu trong DB
export const MOCK_RECONCILIATION_REPORTS: ReconciliationReport[] = [
  {
    id: "recon_10_2025",
    month: 10,
    year: 2025,
    cashStorage: 50000,
    cashWallet: 2500,
    bankAccount: 120000,
    existingMoney: 172500, // Tổng tiền đang có
    paidItems: [
      { id: "1", description: "Ứng lương lái xe", amount: 5000 },
      { id: "2", description: "Mua lốp dự phòng", amount: 4500 }
    ],
    debtItems: [],
    lastUpdated: "2025-10-31T10:00:00Z"
  },
  // Tháng 11 chưa có dữ liệu (sẽ lấy mặc định khi mở)
];
