
import { PaymentCycle } from '../types';

export const MOCK_PAYMENT_CYCLES: PaymentCycle[] = [
  {
    id: "2025.10",
    createdDate: "02/11/2025",
    transactionIds: [
      't10-02', 't10-04', 't10-06', 't10-08', 't10-10', 
      't10-12', 't10-14', 't10-16', 't10-18', 't10-20', 
      't10-22', 't10-24', 't10-26', 't10-28', 't10-30',
      't11-02' // Bản ghi gối đầu
    ],
    totalAmount: 255950, // Tổng remainingBalance của các bản ghi trên
    note: "Thanh toán đợt 1 tháng 10"
  }
];
