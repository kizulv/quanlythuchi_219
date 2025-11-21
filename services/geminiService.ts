import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

// Initialize the Gemini API client
// Note: In a real app, ensure process.env.API_KEY is set. 
// This code assumes the environment is set up correctly as per instructions.
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeFinancialData = async (transactions: Transaction[]): Promise<string> => {
  if (!apiKey) {
    return "Vui lòng cấu hình API KEY để sử dụng tính năng phân tích AI.";
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