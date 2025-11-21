
// Mock storage để lưu trữ dữ liệu ảnh trong bộ nhớ (Giả lập ổ cứng Server)
// Key: Đường dẫn file (VD: /images/2025-11-02.jpg)
// Value: Dữ liệu ảnh Base64 thực tế
const mockFileSystem: Record<string, string> = {};

/**
 * Helper function: Resolve đường dẫn file thành dữ liệu ảnh để hiển thị
 * Nếu là đường dẫn giả lập (/images/...), lấy từ mockFileSystem
 * Nếu là đường dẫn thật (http...), trả về nguyên vẹn
 */
export const resolveImageUrl = (path?: string): string | undefined => {
  if (!path) return undefined;
  // Nếu path nằm trong bộ nhớ giả lập, trả về data base64
  if (mockFileSystem[path]) {
    return mockFileSystem[path];
  }
  // Nếu không, trả về path gốc (trường hợp ảnh có sẵn trên server thật)
  return path;
};

/**
 * Xử lý upload ảnh, resize về 666x1182, giả lập lưu vào /public/images/
 * và xử lý logic rename file cũ.
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

        // 2. Xuất ảnh ra Base64 (Dữ liệu thực tế của file)
        const processedDataUrl = canvas.toDataURL('image/jpeg', 0.9);

        // 3. Xử lý tên file và đường dẫn
        // Format date input: "DD/MM/YYYY" -> convert to "YYYY-MM-DD"
        const [day, month, year] = dateStr.split('/');
        
        // Tên file gốc mong muốn
        const fileName = `${year}-${month}-${day}.jpg`;
        // Đường dẫn giả lập (sẽ hiển thị trên UI)
        const filePath = `/images/${fileName}`;
        
        // LOGIC ĐỔI TÊN:
        // Nếu trong folder đã tồn tại file cùng tên (filePath)
        if (mockFileSystem[filePath]) {
          // Rename file CŨ thành: năm-tháng-ngày-01.jpg (02, 03...)
          let counter = 1;
          let oldFileRenamedName = `${year}-${month}-${day}-${counter.toString().padStart(2, '0')}.jpg`;
          let oldFileRenamedPath = `/images/${oldFileRenamedName}`;
          
          // Tìm tên mới chưa tồn tại cho file cũ
          while (mockFileSystem[oldFileRenamedPath]) {
            counter++;
            oldFileRenamedName = `${year}-${month}-${day}-${counter.toString().padStart(2, '0')}.jpg`;
            oldFileRenamedPath = `/images/${oldFileRenamedName}`;
          }

          // Di chuyển dữ liệu cũ sang tên mới
          mockFileSystem[oldFileRenamedPath] = mockFileSystem[filePath];
          console.log(`[System] Renamed EXISTING file to: ${oldFileRenamedPath}`);
        }

        // Lưu file MỚI vào tên chính (Ghi đè lên key cũ đã được backup)
        mockFileSystem[filePath] = processedDataUrl;
        console.log(`[System] Uploaded NEW file to: ${filePath}`);

        // Trả về đường dẫn "sạch" để lưu vào database
        resolve(filePath); 
      };

      img.onerror = (err) => reject(err);
    };
    
    reader.onerror = (err) => reject(err);
  });
};
