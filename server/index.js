
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pkg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Destructure Pool từ pkg để tránh lỗi import ESM
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 4001;

// Cấu hình Database với timeout
const pool = new Pool({
  host: 'sql.pcthanh.com',
  user: 'postgresql',
  password: '123a456S@@',
  database: 'db_quanlythuchixe',
  port: 5432,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000 // 10s timeout
});

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); 
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Định nghĩa đường dẫn folder
const publicDir = path.resolve(process.cwd(), "public");
const publicReportsDir = path.join(publicDir, "images", "reports");
const publicImagesDir = path.join(publicDir, "images");

// Serve ảnh trực tiếp từ Backend để đảm bảo ảnh mới upload hiển thị ngay
app.use('/images', express.static(publicImagesDir));

// --- KHỞI TẠO ---
async function init() {
  try {
    await fs.mkdir(publicReportsDir, { recursive: true });
    
    // Kiểm tra kết nối DB
    try {
        console.log('[Init] Đang kết nối đến sql.pcthanh.com...');
        const client = await pool.connect();
        console.log('[Init] Kết nối PostgreSQL THÀNH CÔNG!');
        client.release();
    } catch (dbError) {
        console.error('[Init] LỖI KẾT NỐI PostgreSQL:', dbError.message);
        console.error('Vui lòng kiểm tra mạng hoặc thông tin đăng nhập.');
    }

    // Tạo bảng
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(50) PRIMARY KEY,
        date DATE NOT NULL,
        revenue BIGINT DEFAULT 0,
        shared_expense BIGINT DEFAULT 0,
        private_expense BIGINT DEFAULT 0,
        total_balance BIGINT DEFAULT 0,
        split_balance BIGINT DEFAULT 0,
        remaining_balance BIGINT DEFAULT 0,
        note TEXT,
        status VARCHAR(50),
        is_shared BOOLEAN DEFAULT true,
        image_url TEXT,
        breakdown JSONB
      );
    `;
    await pool.query(createTableQuery);
    console.log('[Init] Table transactions đã sẵn sàng.');
  } catch (err) {
    console.error('[Init] Error:', err);
  }
}
init();

// --- API ---

app.get('/api/health', (req, res) => res.send('Server OK'));

app.get('/api/transactions', async (req, res) => {
  const { month, year } = req.query;
  try {
    const query = `
      SELECT * FROM transactions 
      WHERE EXTRACT(MONTH FROM date) = $1 
      AND EXTRACT(YEAR FROM date) = $2
      ORDER BY date ASC
    `;
    const result = await pool.query(query, [month, year]);
    
    const formattedData = result.rows.map(row => {
      const d = new Date(row.date);
      // Format DD/MM/YYYY
      const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      
      return {
        id: row.id,
        date: dateStr,
        revenue: Number(row.revenue),
        sharedExpense: Number(row.shared_expense),
        privateExpense: Number(row.private_expense),
        totalBalance: Number(row.total_balance),
        splitBalance: Number(row.split_balance),
        remainingBalance: Number(row.remaining_balance),
        note: row.note || '',
        status: row.status,
        isShared: row.is_shared,
        imageUrl: row.image_url,
        breakdown: row.breakdown || {},
        details: 'Chi tiết'
      };
    });
    res.json(formattedData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  const t = req.body;
  try {
    const [day, month, year] = t.date.split('/');
    const sqlDate = `${year}-${month}-${day}`;

    const query = `
      INSERT INTO transactions (
        id, date, revenue, shared_expense, private_expense, 
        total_balance, split_balance, remaining_balance, 
        note, status, is_shared, image_url, breakdown
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        revenue = EXCLUDED.revenue,
        shared_expense = EXCLUDED.shared_expense,
        private_expense = EXCLUDED.private_expense,
        total_balance = EXCLUDED.total_balance,
        split_balance = EXCLUDED.split_balance,
        remaining_balance = EXCLUDED.remaining_balance,
        note = EXCLUDED.note,
        status = EXCLUDED.status,
        is_shared = EXCLUDED.is_shared,
        image_url = EXCLUDED.image_url,
        breakdown = EXCLUDED.breakdown;
    `;
    
    const values = [
      t.id, sqlDate, t.revenue, t.sharedExpense, t.privateExpense,
      t.totalBalance, t.splitBalance, t.remainingBalance,
      t.note, t.status, t.isShared, t.imageUrl, JSON.stringify(t.breakdown)
    ];

    await pool.query(query, values);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/save-image', async (req, res) => {
  try {
    const { baseFileName, dataUrl } = req.body;
    if (!dataUrl) return res.status(400).json({ error: "No data" });

    // Tự động đổi tên nếu trùng
    const destPath = path.join(publicReportsDir, baseFileName);
    let finalFileName = baseFileName;
    try {
      await fs.access(destPath);
      let counter = 1;
      const namePart = baseFileName.replace(/\.jpg$/i, "");
      while (true) {
        const newName = `${namePart}-${String(counter).padStart(2, "0")}.jpg`;
        try { await fs.access(path.join(publicReportsDir, newName)); counter++; } 
        catch { finalFileName = newName; break; }
      }
    } catch {}

    const matches = dataUrl.match(/^data:([a-zA-Z0-9/+.]+);base64,(.*)$/);
    const buffer = Buffer.from(matches ? matches[2] : dataUrl, "base64");
    await fs.writeFile(path.join(publicReportsDir, finalFileName), buffer);

    // Trả về URL
    res.json({ url: `/images/reports/${finalFileName}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});
