import { createServer } from "http";
import fs from "fs/promises";
import path from "path";

const PORT = process.env.PORT || 4001;

const publicReportsDir = path.resolve(
  process.cwd(),
  "public",
  "images",
  "reports"
);

async function ensureDir() {
  await fs.mkdir(publicReportsDir, { recursive: true });
}

function sendJson(res, status, obj) {
  const payload = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(payload);
}

async function handleSaveImage(req, res) {
  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    const data = JSON.parse(body);
    const dataUrl = data.dataUrl;
    let baseFileName = data.baseFileName;

    if (!dataUrl) {
      sendJson(res, 400, { error: "dataUrl is required" });
      return;
    }

    // If no filename provided, generate one
    if (!baseFileName) {
      const now = new Date();
      baseFileName = `${now.toISOString().slice(0, 10)}.jpg`;
    }

    await ensureDir();

    // If file exists, rename old file with -01, -02 ...
    const destPath = path.join(publicReportsDir, baseFileName);
    try {
      await fs.access(destPath);
      // exists -> find new name for old file
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
      console.log(`[Server] Renamed existing ${baseFileName} -> ${oldRename}`);
    } catch (e) {
      // file does not exist -> nothing to rename
    }

    // Extract base64 part
    const matches = dataUrl.match(/^data:([a-zA-Z0-9/+.]+);base64,(.*)$/);
    const base64 = matches ? matches[2] : dataUrl;
    const buffer = Buffer.from(base64, "base64");

    await fs.writeFile(destPath, buffer);
    console.log(`[Server] Saved new file to ${destPath}`);

    // Return public URL relative to server root (Vite serves `public` at `/`)
    const publicUrl = `/images/reports/${baseFileName}`;
    sendJson(res, 200, { url: publicUrl });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: String(err) });
  }
}

const server = createServer(async (req, res) => {
  const { method, url } = req;

  if (method === "OPTIONS") {
    // CORS preflight
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (method === "POST" && url === "/save-image") {
    await handleSaveImage(req, res);
    return;
  }

  // Not found
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`Image save server listening on http://localhost:${PORT}`);
  console.log(`Saving uploads to: ${publicReportsDir}`);
});