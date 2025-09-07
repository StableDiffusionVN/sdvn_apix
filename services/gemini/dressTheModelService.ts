/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { 
    processApiError, 
    padImageToAspectRatio,
    parseDataUrl, 
    callGeminiWithRetry, 
    processGeminiResponse 
} from './baseService';

interface DressModelOptions {
    background: string;
    pose: string;
    style: string;
    aspectRatio: string;
    notes?: string;
    removeWatermark?: boolean;
}

/**
 * Generates an image of a model wearing specified clothing.
 * @param modelImageDataUrl Data URL for the model's image.
 * @param clothingImageDataUrl Data URL for the clothing's image.
 * @param options User-selected options for background, pose, and notes.
 * @returns A promise that resolves to the generated image's data URL.
 */
export async function generateDressedModelImage(
    modelImageDataUrl: string, 
    clothingImageDataUrl: string, 
    options: DressModelOptions
): Promise<string> {
    const modelImageToProcess = await padImageToAspectRatio(modelImageDataUrl, options.aspectRatio ?? 'Giữ nguyên');
    const { mimeType: modelMime, data: modelData } = parseDataUrl(modelImageToProcess);
    const { mimeType: clothingMime, data: clothingData } = parseDataUrl(clothingImageDataUrl);

    const modelImagePart = { inlineData: { mimeType: modelMime, data: modelData } };
    const clothingImagePart = { inlineData: { mimeType: clothingMime, data: clothingData } };

    const promptParts = [];

    // Aspect Ratio instruction first and more specific
    if (options.aspectRatio && options.aspectRatio !== 'Giữ nguyên') {
        promptParts.push(
            `**YÊU CẦU ƯU TIÊN SỐ 1 - TỶ LỆ KHUNG HÌNH:**`,
            `1. Bức ảnh kết quả BẮT BUỘC phải có tỷ lệ khung hình chính xác là **${options.aspectRatio}**.`,
            `2. **Quan trọng:** Ảnh 2 (người mẫu) đã được thêm nền trắng để đạt đúng tỷ lệ này. Nhiệm vụ của bạn là lấp đầy phần nền trắng đó một cách sáng tạo, mở rộng bối cảnh theo các tùy chọn bên dưới. Điều này KHÔNG có nghĩa là thay đổi người mẫu, mà là xây dựng môi trường xung quanh họ.`,
            ``
        );
    }

    promptParts.push(
        'Tôi cung cấp cho bạn 2 tấm ảnh:',
        '- Ảnh 1: Một trang phục.',
        '- Ảnh 2: Một người mẫu (có thể đã được thêm nền trắng).',
        'Nhiệm vụ của bạn là tạo ra một bức ảnh MỚI, trong đó người mẫu từ Ảnh 2 đang mặc trang phục từ Ảnh 1.',
        '',
        '**YÊU CẦU CỰC KỲ QUAN TRỌNG:**',
        '1.  **GIỮ NGUYÊN NGƯỜI MẪU:** Phải giữ lại chính xác 100% khuôn mặt, vóc dáng, màu da của người mẫu trong Ảnh 2. Tuyệt đối không được thay đổi người mẫu.',
        '2.  **CHUYỂN ĐỔI TRANG PHỤC:** Lấy trang phục từ Ảnh 1 và mặc nó lên người mẫu một cách tự nhiên và chân thực, phù hợp với tư thế của họ. Giữ nguyên màu sắc, họa tiết và kiểu dáng của trang phục.',
        '3.  **TÙY CHỈNH KẾT QUẢ:** Dựa vào các yêu cầu sau để tạo ra bức ảnh cuối cùng:'
    );
    
    let optionsSelected = false;
    if (options.background && options.background !== 'Tự động') {
        promptParts.push(`    *   **Bối cảnh (Background):** ${options.background}.`);
        optionsSelected = true;
    }
    if (options.pose && options.pose !== 'Tự động') {
        promptParts.push(`    *   **Tư thế (Pose):** ${options.pose}.`);
        optionsSelected = true;
    }
    if (options.style && options.style !== 'Tự động') {
        promptParts.push(`    *   **Phong cách ảnh (Photo Style):** ${options.style}.`);
        optionsSelected = true;
    }
    if (options.notes) {
        promptParts.push(`    *   **Ghi chú:** ${options.notes}`);
        optionsSelected = true; // Notes count as a selection
    }
    
    if (!optionsSelected) {
        promptParts.push('    *   **Toàn quyền sáng tạo:** Hãy tự động chọn bối cảnh, tư thế và phong cách ảnh phù hợp nhất với trang phục và người mẫu để tạo ra một bức ảnh thời trang ấn tượng.');
    }
    
    promptParts.push(
        '',
        'Kết quả cuối cùng phải là một bức ảnh duy nhất, chất lượng cao, trông giống như ảnh chụp thời trang chuyên nghiệp. Chỉ trả về ảnh kết quả, không trả về ảnh gốc hay văn bản giải thích.'
    );

    if (options.removeWatermark) {
        promptParts.push('YÊU CẦU THÊM: Ảnh kết quả không được chứa bất kỳ watermark, logo hay chữ ký nào.');
    }

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };

    try {
        console.log("Attempting to generate dressed model image with dynamic prompt...");
        const response = await callGeminiWithRetry([clothingImagePart, modelImagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during dressed model image generation:", processedError);
        throw processedError;
    }
}
