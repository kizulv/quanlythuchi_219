import * as path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs/promises";
import { Buffer } from "buffer";
import { fileURLToPath } from "url";
import { jsonDbMiddleware } from "./server/jsonDb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  return async function saveImageHandler(req, res, next) {
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
        } catch (e) {
          // not exists
        }

        const matches = dataUrl.match(/^data:([a-zA-Z0-9/+.]+);base64,(.*)$/);
        const base64 = matches ? matches[2] : dataUrl;
        const buffer = Buffer.from(base64, "base64");

        await fs.writeFile(destPath, buffer);

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
      allowedHosts: ["xe.pcthanh.com"],
    },
    build: {
      copyPublicDir: false,
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            return assetInfo.name;
          },
        },
      },
    },
    plugins: [
      react(),
      {
        name: "vite:copy-images",
        async writeBundle() {
          const src = path.resolve(__dirname, "public/images");
          const dest = path.resolve(__dirname, "dist/images");
          try {
            await fs.cp(src, dest, { recursive: true });
            console.log("Images copied to dist/");
          } catch (err) {
            // Directory doesn't exist, skip
          }
        },
      },
      {
        name: "vite:db-middleware",
        configureServer(server) {
          server.middlewares.use(jsonDbMiddleware());
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
