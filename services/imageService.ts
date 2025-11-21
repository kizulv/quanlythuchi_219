
// Mock storage để giả lập hệ thống file server
const mockFileSystem: Record<string, string> = {};

/**
 * Xử lý upload ảnh, resize về 666x1182 và giả lập logic lưu file
 */
export const processAndUploadImage = async (file: File, dateStr: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        // 1. Cấu hình Canvas để resize/crop về 666x1182
        const targetWidth = 666;
        const targetHeight = 1182;
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error("Không thể khởi tạo Canvas context"));
          return;
        }

        // Tính toán tỷ lệ để "object-fit: cover"
        const srcRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;
        
        let drawWidth, drawHeight, offsetX, offsetY;

        if (srcRatio > targetRatio) {
          // Ảnh gốc rộng hơn -> Crop 2 bên
          drawHeight = targetHeight;
          drawWidth = img.width * (targetHeight / img.height);
          offsetX = (targetWidth - drawWidth) / 2; // Căn giữa
          offsetY = 0;
        } else {
          // Ảnh gốc cao hơn -> Crop trên dưới
          drawWidth = targetWidth;
          drawHeight = img.height * (targetWidth / img.width);
          offsetX = 0;
          offsetY = (targetHeight - drawHeight) / 2; // Căn giữa
        }

        // Vẽ ảnh lên canvas
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // 2. Xuất ảnh ra Base64 (Giả lập URL file)
        const processedDataUrl = canvas.toDataURL('image/jpeg', 0.9);

        // 3. Xử lý logic tên file
        // Format date input: "DD/MM/YYYY" -> convert to "YYYY-MM-DD"
        const [day, month, year] = dateStr.split('/');
        const baseFileName = `${year}-${month}-${day}.jpg`;
        const publicPath = `/public/images/`;
        
        // Kiểm tra xem file đã tồn tại chưa (Trong mockFileSystem)
        if (mockFileSystem[baseFileName]) {
          // Logic: Rename file CŨ thành -01, -02...
          let counter = 1;
          let oldFileRename = `${year}-${month}-${day}-${counter.toString().padStart(2, '0')}.jpg`;
          
          // Tìm tên mới chưa tồn tại cho file cũ
          while (mockFileSystem[oldFileRename]) {
            counter++;
            oldFileRename = `${year}-${month}-${day}-${counter.toString().padStart(2, '0')}.jpg`;
          }

          // Di chuyển dữ liệu cũ sang tên mới
          mockFileSystem[oldFileRename] = mockFileSystem[baseFileName];
          console.log(`[System] Renamed old file ${baseFileName} to ${oldFileRename}`);
        }

        // Lưu file MỚI vào tên chính
        mockFileSystem[baseFileName] = processedDataUrl;
        console.log(`[System] Saved new file to ${baseFileName}`);

        // Trong môi trường thật, server sẽ trả về URL. Ở đây ta trả về DataURL để hiển thị ngay
        // Nhưng logic tên file đã được xử lý như yêu cầu.
        resolve(processedDataUrl); 
      };

      img.onerror = (err) => reject(err);
    };
    
    reader.onerror = (err) => reject(err);
  });
};
