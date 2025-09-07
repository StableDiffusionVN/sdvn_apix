/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { 
    processApiError,
    parseDataUrl, 
    callGeminiWithRetry, 
    processGeminiResponse 
} from './baseService';

interface PhotoRestorationOptions {
    type: string;
    gender: string;
    age: string;
    nationality: string;
    notes?: string;
    removeWatermark?: boolean;
    removeStains?: boolean;
}

export async function restoreOldPhoto(imageDataUrl: string, options: PhotoRestorationOptions): Promise<string> {
    const { mimeType, data: base64Data } = parseDataUrl(imageDataUrl);
    const imagePart = { inlineData: { mimeType, data: base64Data } };

    const promptParts = [
        'Bạn là một chuyên gia phục chế ảnh cũ. Phục chế bức ảnh này để nó trông như mới, sửa chữa mọi hư hỏng và thêm màu sắc nếu cần.',
        '**YÊU CẦU BẮT BUỘC:**'
    ];
    
    if (options.removeStains) {
        promptParts.push('1. **Sửa chữa triệt để:** Loại bỏ HOÀN TOÀN các vết xước, nếp gấp, vết ố, phai màu, và các hư hỏng vật lý khác.');
    } else {
        promptParts.push('1. **Sửa chữa cơ bản:** Sửa các vết rách và nếp gấp lớn, nhưng giữ lại kết cấu và các vết ố nhỏ để duy trì nét cổ điển của ảnh.');
    }

    promptParts.push(
        '2. **Tăng cường chi tiết:** Làm sắc nét hình ảnh và khôi phục các chi tiết bị mất, đặc biệt là trên khuôn mặt.',
        '3. **Tô màu tự nhiên (nếu là ảnh đen trắng):** Áp dụng màu sắc một cách chân thực, phù hợp với thời đại của bức ảnh.',
        '4. **Giữ nguyên bản chất:** Không thay đổi các đặc điểm trên khuôn mặt, bố cục, hay nội dung gốc của ảnh.',
        '',
        '**THÔNG TIN BỔ SUNG ĐỂ CÓ KẾT QUẢ TỐT NHẤT:**'
    );

    if (options.type) {
        promptParts.push(`- **Loại ảnh:** ${options.type}.`);
    }
    if (options.gender && options.gender !== 'Tự động') {
        promptParts.push(`- **Giới tính người trong ảnh:** ${options.gender}.`);
    }
    if (options.age) {
        promptParts.push(`- **Độ tuổi ước tính:** ${options.age}.`);
    }
    if (options.nationality) {
        promptParts.push(`- **Quốc tịch:** ${options.nationality}. Điều này quan trọng để có màu da và trang phục phù hợp.`);
    }

    if (options.notes) {
        promptParts.push(`- **Ghi chú từ người dùng:** "${options.notes}".`);
    }
    if (options.removeWatermark) {
        promptParts.push('- **Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
    }

    promptParts.push('Chỉ trả về hình ảnh đã được phục chế, không kèm theo văn bản giải thích.');

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };

    try {
        console.log("Attempting to restore old photo...");
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during photo restoration:", processedError);
        throw processedError;
    }
}
