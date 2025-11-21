/// <reference types="node" />
import * as path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs/promises";

// Helper to handle save-image requests in dev server
function createSaveImageMiddleware() {
  const publicReportsDir = path.resolve(
    process.cwd(),
    "public",
    "images",
    "reports"
  );

  async function ensureDir() {
    await fs.mkdir(publicReportsDir, { recursive: true });
  }

  return async function saveImageHandler(req: any, res: any, next: any) {
    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        });
        res.end();
        return;
      }

      if (
        req.method === "POST" &&
        req.url &&
        req.url.startsWith("/save-image")
      ) {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
        }

        const data = JSON.parse(body || "{}");
        const dataUrl = data.dataUrl;
        let baseFileName = data.baseFileName;

        if (!dataUrl) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "dataUrl is required" }));
          return;
        }

        if (!baseFileName) {
          const now = new Date();
          baseFileName = `${now.toISOString().slice(0, 10)}.jpg`;
        }

        await ensureDir();

        const destPath = path.join(publicReportsDir, baseFileName);
        try {
          await fs.access(destPath);
          let counter = 1;
          let oldRename = `${baseFileName.replace(/\.jpg$/i, "")}-${String(
            counter
          ).padStart(2, "0")}.jpg`;
          while (true) {
            try {
              await fs.access(path.join(publicReportsDir, oldRename));
              counter++;
              oldRename = `${baseFileName.replace(/\.jpg$/i, "")}-${String(
                counter
              ).padStart(2, "0")}.jpg`;
            } catch (e) {
              break;
            }
          }

          await fs.rename(destPath, path.join(publicReportsDir, oldRename));
          console.log(`[Dev] Renamed existing ${baseFileName} -> ${oldRename}`);
        } catch (e) {
          // not exists
        }

        const matches = dataUrl.match(/^data:([a-zA-Z0-9/+.]+);base64,(.*)$/);
        const base64 = matches ? matches[2] : dataUrl;
        const buffer = Buffer.from(base64, "base64");

        await fs.writeFile(destPath, buffer);
        console.log(`[Dev] Saved new file to ${destPath}`);

        const publicUrl = `/images/reports/${baseFileName}`;
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ url: publicUrl }));
        return;
      }
    } catch (err) {
      console.error("[Dev] save-image error", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err) }));
      return;
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
        name: "vite:save-image-middleware",
        configureServer(server) {
          // Insert the middleware at the start of middleware stack
          server.middlewares.use(createSaveImageMiddleware());
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
