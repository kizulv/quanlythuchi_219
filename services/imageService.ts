// Images are uploaded to a small local save server which writes into `public/images/reports`
// The save server accepts POST /save-image with JSON { baseFileName, dataUrl }

/**
 * Resize/crop image to 666x1182 and return a data URL
 */
async function processImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const targetWidth = 666;
        const targetHeight = 1182;
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Không thể khởi tạo Canvas context"));
          return;
        }

        const srcRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (srcRatio > targetRatio) {
          drawHeight = targetHeight;
          drawWidth = img.width * (targetHeight / img.height);
          offsetX = (targetWidth - drawWidth) / 2;
          offsetY = 0;
        } else {
          drawWidth = targetWidth;
          drawHeight = img.height * (targetWidth / img.width);
          offsetX = 0;
          offsetY = (targetHeight - drawHeight) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        const processedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
        resolve(processedDataUrl);
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
}

/**
 * Return a preview (data URL) without uploading.
 */
export async function getProcessedDataUrl(file: File): Promise<string> {
  return processImageToDataUrl(file);
}

/**
 * Xử lý upload ảnh: resize -> upload -> trả về URL server (cache-busted)
 */
export const processAndUploadImage = async (
  file: File,
  dateStr: string
): Promise<string> => {
  try {
    const processedDataUrl = await processImageToDataUrl(file);

    const [day, month, year] = dateStr.split("/");
    const baseFileName = `${year}-${month}-${day}.jpg`;

    try {
      const resp = await fetch("/save-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ baseFileName, dataUrl: processedDataUrl }),
      });

      if (resp.ok) {
        const json = await resp.json();
        const serverUrl = json.url || "";
        if (serverUrl) {
          const sep = serverUrl.includes("?") ? "&" : "?";
          return `${serverUrl}${sep}t=${Date.now()}`;
        }
      } else {
        console.error("[Upload] Server responded with error", resp.status);
        const text = await resp.text();
        console.error(text);
      }
    } catch (err) {
      console.error("[Upload] Failed to upload image to save server", err);
    }

    // Fallback: return the processed data URL so UI can show preview
    return processedDataUrl;
  } catch (err) {
    throw err;
  }
};
