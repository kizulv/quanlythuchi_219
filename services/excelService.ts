
import * as XLSX from 'xlsx';
import { Transaction } from '../types';

export const exportToExcel = (transactions: Transaction[], monthLabel: string) => {
  // 1. Chuẩn bị dữ liệu: Mapping từ Transaction sang format tiếng Việt dễ đọc
  const dataToExport = transactions.map(t => ({
    'Ngày': t.date,
    'Kỳ thanh toán': t.paymentMonth || '-',
    'Xe': t.isShared ? '2 Xe' : '1 Xe',
    'Tổng thu (nghìn)': t.revenue,
    'Chi chung (nghìn)': t.sharedExpense,
    'Tổng dư (nghìn)': t.totalBalance,
    'Dư chia (nghìn)': t.splitBalance,
    'Chi riêng (nghìn)': t.privateExpense,
    'Dư còn lại (nghìn)': t.remainingBalance,
    'Ghi chú': t.note,
    'Trạng thái': t.status === 'PAID' ? 'Đã thanh toán' : (t.status === 'VERIFIED' ? 'Đã đối soát' : 'AI Tạo'),
    'Chi tiết (Thu)': `Xuôi: ${t.breakdown?.revenueDown || 0}, Ngược: ${t.breakdown?.revenueUp || 0}`,
    'Chi tiết (Chi)': `Dầu: ${t.breakdown?.expenseFuel || 0}, Luật: ${t.breakdown?.expensePolice || 0}, Sửa: ${t.breakdown?.expenseRepair || 0}`
  }));

  // 2. Tạo Worksheet
  const worksheet = XLSX.utils.json_to_sheet(dataToExport);

  // 3. Cấu hình độ rộng cột (để nhìn đẹp hơn khi mở file)
  const columnWidths = [
    { wch: 15 }, // Ngày
    { wch: 15 }, // Kỳ thanh toán
    { wch: 8 },  // Xe
    { wch: 15 }, // Tổng thu
    { wch: 15 }, // Chi chung
    { wch: 15 }, // Tổng dư
    { wch: 15 }, // Dư chia
    { wch: 15 }, // Chi riêng
    { wch: 15 }, // Dư còn lại
    { wch: 30 }, // Ghi chú
    { wch: 15 }, // Trạng thái
    { wch: 25 }, // Chi tiết Thu
    { wch: 30 }, // Chi tiết Chi
  ];
  worksheet['!cols'] = columnWidths;

  // 4. Tạo Workbook và thêm Worksheet vào
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Báo Cáo");

  // 5. Tạo tên file và trigger download
  // monthLabel ví dụ: "11/2025" -> đổi thành "11-2025" để an toàn cho tên file
  const safeFileName = `Bao_Cao_Thu_Chi_${monthLabel.replace('/', '-')}.xlsx`;
  
  XLSX.writeFile(workbook, safeFileName);
};