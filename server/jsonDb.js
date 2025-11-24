import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_DIR = path.resolve(__dirname, '..', 'db');

async function ensureDbDir() {
  try {
    await fs.access(DB_DIR);
  } catch {
    await fs.mkdir(DB_DIR, { recursive: true });
  }
}

async function readDb(collection) {
  try {
    const filePath = path.join(DB_DIR, `${collection}.json`);
    await fs.access(filePath);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeDb(collection, data) {
  await ensureDbDir();
  const filePath = path.join(DB_DIR, `${collection}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function jsonDbMiddleware() {
  return async (req, res, next) => {
    if (!req.url.startsWith('/api/')) {
      return next();
    }

    try {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/').filter(p => p);
      
      const collection = parts[1];
      const id = parts[2];

      const sendJson = (data, status = 200) => {
        res.writeHead(status, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(data));
      };

      if (req.method === 'OPTIONS') {
         res.writeHead(204, {
           'Access-Control-Allow-Origin': '*',
           'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type'
         });
         res.end();
         return;
      }

      if (req.method === 'GET' && collection && !id) {
        const data = await readDb(collection);
        return sendJson(data);
      }
      
      if (req.method === 'GET' && collection && id) {
         const data = await readDb(collection);
         const item = data.find(i => i.id === id);
         if (item) return sendJson(item);
         return sendJson({ error: 'Not found' }, 404);
      }

      if (req.method === 'POST' && collection) {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }
        
        let payload;
        try {
            payload = JSON.parse(body || '{}');
        } catch (e) {
            return sendJson({ error: 'Invalid JSON' }, 400);
        }

        if (collection === 'transactions' && id === 'batch-update') {
           const { ids, updates } = payload;
           const currentData = await readDb('transactions');
           let updatedCount = 0;
           const updatedData = currentData.map(item => {
             if (ids.includes(item.id)) {
               updatedCount++;
               return { ...item, ...updates };
             }
             return item;
           });
           await writeDb('transactions', updatedData);
           return sendJson({ success: true, count: updatedCount });
        }

        const currentData = await readDb(collection);

        if (Array.isArray(payload)) {
            let newData = [...currentData];
            payload.forEach(item => {
                const idx = newData.findIndex(d => d.id === item.id);
                if (idx >= 0) newData[idx] = item;
                else newData.push(item);
            });
            await writeDb(collection, newData);
            return sendJson({ success: true, count: payload.length });
        } else {
            const idx = currentData.findIndex(item => item.id === payload.id);
            if (idx >= 0) {
              currentData[idx] = payload;
            } else {
              currentData.push(payload);
            }
            await writeDb(collection, currentData);
            return sendJson(payload);
        }
      }

      if (req.method === 'DELETE' && collection && id) {
        const currentData = await readDb(collection);
        const filteredData = currentData.filter(item => item.id !== id);
        await writeDb(collection, filteredData);
        return sendJson({ success: true });
      }

      return sendJson({ error: 'API endpoint not found' }, 404);

    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err) }));
    }
  };
}