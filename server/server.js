import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import { Buffer } from "buffer";
import { jsonDbMiddleware } from "./jsonDb.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - increase JSON payload limit for large image uploads
app.use(express.json({ limit: "50mb" }));

// Save image middleware
app.post("/save-image", async (req, res) => {
  try {
    const distReportsDir = path.resolve(__dirname, "../dist/images/reports");

    // Ensure directory exists
    await fs.mkdir(distReportsDir, { recursive: true });

    const { dataUrl, baseFileName: providedFileName } = req.body;

    if (!dataUrl) {
      return res.status(400).json({ error: "dataUrl is required" });
    }

    let baseFileName = providedFileName;
    if (!baseFileName) {
      const now = new Date();
      baseFileName = `${now.toISOString().slice(0, 10)}.jpg`;
    }

    const destPath = path.join(distReportsDir, baseFileName);

    // Handle existing files
    try {
      await fs.access(destPath);
      let counter = 1;
      let oldRename = `${baseFileName.replace(/\.jpg$/i, "")}-${String(
        counter
      ).padStart(2, "0")}.jpg`;
      while (true) {
        try {
          await fs.access(path.join(distReportsDir, oldRename));
          counter++;
          oldRename = `${baseFileName.replace(/\.jpg$/i, "")}-${String(
            counter
          ).padStart(2, "0")}.jpg`;
        } catch (e) {
          break;
        }
      }
      await fs.rename(destPath, path.join(distReportsDir, oldRename));
    } catch (e) {
      // File doesn't exist yet
    }

    // Parse and save base64 image
    const matches = dataUrl.match(/^data:([a-zA-Z0-9/+.]+);base64,(.*)$/);
    const base64 = matches ? matches[2] : dataUrl;
    const buffer = Buffer.from(base64, "base64");

    await fs.writeFile(destPath, buffer);

    const publicUrl = `/images/reports/${baseFileName}`;
    res.json({ url: publicUrl });
  } catch (err) {
    console.error("[Server] save-image error", err);
    res.status(500).json({ error: String(err) });
  }
});

// DB API middleware
app.use(jsonDbMiddleware());

// Serve static files from dist folder
const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));

// SPA fallback - serve index.html for all non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
