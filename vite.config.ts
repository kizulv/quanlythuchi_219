import * as path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs/promises";
import { Buffer } from "buffer";
import { fileURLToPath } from "url";

// Fix for missing __dirname in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- GENERIC DATABASE HELPER ---
const dataDir = path.resolve((process as any).cwd(), "data");

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

async function readDb(filename: string) {
  try {
    const filePath = path.join(dataDir, filename);
    await ensureDataDir();
    try {
      await fs.access(filePath);
    } catch {
      // If file doesn't exist, return empty array
      return [];
    }
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content || "[]");
  } catch (err) {
    console.error(`Error reading DB ${filename}:`, err);
    return [];
  }
}

async function writeDb(filename: string, data: any) {
  try {
    const filePath = path.join(dataDir, filename);
    await ensureDataDir();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error(`Error writing DB ${filename}:`, err);
    return false;
  }
}

// --- API MIDDLEWARE ---
function createApiMiddleware() {
  const publicReportsDir = path.resolve(
    (process as any).cwd(),
    "public",
    "images",
    "reports"
  );

  async function ensureReportsDir() {
    await fs.mkdir(publicReportsDir, { recursive: true });
  }

  return async function apiHandler(req: any, res: any, next: any) {
    const { method, url } = req;
    
    // --- CORS & OPTIONS ---
    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    // Helper to send JSON
    const sendJson = (statusCode: number, data: any) => {
      res.writeHead(statusCode, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify(data));
    };

    // Helper to read body
    const readBody = async () => {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
      }
      return body ? JSON.parse(body) : null;
    };

    try {
      // --- IMAGE UPLOAD ENDPOINT ---
      if (method === "POST" && url.startsWith("/save-image")) {
        const data = await readBody();
        const dataUrl = data.dataUrl;
        let baseFileName = data.baseFileName;

        if (!dataUrl) return sendJson(400, { error: "dataUrl required" });
        if (!baseFileName) baseFileName = `${new Date().toISOString().slice(0, 10)}.jpg`;

        await ensureReportsDir();
        const destPath = path.join(publicReportsDir, baseFileName);
        
        // Handle Rename if exists
        try {
          await fs.access(destPath);
          let counter = 1;
          let oldRename = `${baseFileName.replace(/\.jpg$/i, "")}-${String(counter).padStart(2, "0")}.jpg`;
          while (true) {
            try {
              await fs.access(path.join(publicReportsDir, oldRename));
              counter++;
              oldRename = `${baseFileName.replace(/\.jpg$/i, "")}-${String(counter).padStart(2, "0")}.jpg`;
            } catch { break; }
          }
          await fs.rename(destPath, path.join(publicReportsDir, oldRename));
        } catch {}

        const matches = dataUrl.match(/^data:([a-zA-Z0-9/+.]+);base64,(.*)$/);
        const buffer = Buffer.from(matches ? matches[2] : dataUrl, "base64");
        await fs.writeFile(destPath, buffer);

        return sendJson(200, { url: `/images/reports/${baseFileName}` });
      }

      // --- GENERIC API HANDLER ---
      // Endpoint mapping: /api/collectionName
      if (url.startsWith("/api/")) {
        const collection = url.split("/")[2]?.split("?")[0]; // e.g. "transactions"
        const filename = `${collection}.json`;
        
        // 1. GET ALL
        if (method === "GET") {
          const data = await readDb(filename);
          return sendJson(200, data);
        }

        // 2. POST (Upsert - Create or Update)
        if (method === "POST") {
          const newItem = await readBody();
          const data = await readDb(filename);
          
          const index = data.findIndex((item: any) => item.id === newItem.id);
          if (index >= 0) {
             data[index] = newItem; // Update
          } else {
             data.push(newItem); // Create
          }
          
          await writeDb(filename, data);
          return sendJson(200, { success: true });
        }

        // 3. DELETE
        if (method === "DELETE") {
          const body = await readBody();
          const id = body.id;
          let data = await readDb(filename);
          data = data.filter((item: any) => item.id !== id);
          await writeDb(filename, data);
          return sendJson(200, { success: true });
        }
      }

    } catch (err) {
      console.error("API Error:", err);
      return sendJson(500, { error: String(err) });
    }

    next();
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [
      react(),
      {
        name: "vite:custom-api-middleware",
        configureServer(server) {
          server.middlewares.use(createApiMiddleware());
        },
      },
    ],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});