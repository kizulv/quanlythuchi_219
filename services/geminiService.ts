import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

// Initialize the Gemini API client
// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeFinancialData = async (transactions: Transaction[]): Promise<string> => {
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