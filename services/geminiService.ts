
import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

// Helper to safely access env vars
const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
};

const apiKey = getApiKey();
// Initialize conditionally
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const analyzeFinancialData = async (transactions: Transaction[]): Promise<string> => {
  if (!apiKey || !ai) {
    return "Vui lòng cấu hình API KEY trong file .env để sử dụng tính năng phân tích AI.";
  }

  try {
    // Prepare a summary of data for the AI
    const dataSummary = transactions.map(t => 
      `Ngày: ${t.date}, Thu: ${t.revenue}, Chi chung: ${t.sharedExpense}, Chi riêng: ${t.privateExpense}, Ghi chú: ${t.note}`
    ).join('\n');

    const prompt = `
      Dưới đây là dữ liệu thu chi của một xe khách trong tháng. 
      Hãy phân tích ngắn gọn (dưới 100 từ) về tình hình kinh doanh, chỉ ra các khoản chi bất thường nếu có và đưa ra lời khuyên.
      
      Dữ liệu:
      ${dataSummary}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Không thể tạo phân tích tại thời điểm này.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Đã có lỗi xảy ra khi kết nối với Gemini AI.";
  }
};
