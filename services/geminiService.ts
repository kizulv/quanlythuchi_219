import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

// Helper to safely get API Key in various environments (Vite, Browser, Node)
const getApiKey = () => {
  try {
    // Check import.meta.env for Vite
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
        return import.meta.env.VITE_GEMINI_API_KEY;
    }
    // Check process.env (standard Node/Polyfilled)
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
    // Fallback to window.process if strictly in browser
    if (typeof window !== 'undefined' && (window as any).process?.env?.API_KEY) {
      return (window as any).process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Could not retrieve API Key from environment.");
  }
  return '';
};

const apiKey = getApiKey();

// Initialize AI only if key is present
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const analyzeFinancialData = async (transactions: Transaction[]): Promise<string> => {
  if (!ai || !apiKey) {
    return "⚠️ Tính năng AI chưa được kích hoạt. Vui lòng cấu hình API KEY trong biến môi trường để sử dụng phân tích thông minh.";
  }

  try {
    const totalRevenue = transactions.reduce((sum, t) => sum + t.revenue, 0);
    const totalProfit = transactions.reduce((sum, t) => sum + t.remainingBalance, 0);
    
    // Summarize data to reduce token usage
    const dataSummary = transactions.map(t => 
      `Ngày ${t.date}: Thu ${t.revenue}, Lãi ${t.remainingBalance}, Ghi chú: ${t.note || 'Không'}`
    ).join('\n');

    const prompt = `
      Bạn là trợ lý tài chính cho nhà xe "BusManager Pro".
      
      TỔNG QUAN THÁNG:
      - Tổng thu: ${new Intl.NumberFormat('vi-VN').format(totalRevenue)} nghìn đồng
      - Tổng thực nhận: ${new Intl.NumberFormat('vi-VN').format(totalProfit)} nghìn đồng
      
      CHI TIẾT GIAO DỊCH:
      ${dataSummary}
      
      YÊU CẦU:
      1. Nhận xét ngắn gọn (3-4 câu) về hiệu quả kinh doanh tháng này.
      2. Chỉ ra ngày có doanh thu cao nhất và thấp nhất.
      3. Cảnh báo các khoản chi bất thường nếu có.
      
      Trả lời bằng tiếng Việt, văn phong chuyên nghiệp, súc tích.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Không thể tạo phân tích tại thời điểm này.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Đã có lỗi xảy ra khi kết nối với Gemini AI. Vui lòng thử lại sau.";
  }
};
