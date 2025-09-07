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

interface ArchitectureOptions {
    context: string;
    style: string;
    color: string;
    lighting: string;
    notes?: string;
    removeWatermark?: boolean;
}

/**
 * Generates a realistic architectural image from a sketch.
 * @param imageDataUrl A data URL string of the source sketch image.
 * @param options The user-selected architectural options.
 * @returns A promise that resolves to a base64-encoded image data URL of the generated image.
 */
export async function generateArchitecturalImage(imageDataUrl: string, options: ArchitectureOptions): Promise<string> {
    const { mimeType, data: base64Data } = parseDataUrl(imageDataUrl);

    const imagePart = {
        inlineData: { mimeType, data: base64Data },
    };

    const promptParts = [
        'Biến ảnh phác thảo kiến trúc này thành một bức ảnh chân thực, chất lượng cao.',
        'Dựa vào các tùy chọn sau để tạo ra kết quả:'
    ];

    const optionMapping = {
        context: 'Bối cảnh (Context)',
        style: 'Phong cách kiến trúc (Architectural Style)',
        color: 'Tông màu chủ đạo (Color Palette)',
        lighting: 'Ánh sáng (Lighting)'
    };

    let optionsSelected = false;
    for (const [key, label] of Object.entries(optionMapping)) {
        const value = options[key as keyof typeof optionMapping];
        if (value && value !== 'Tự động') {
            promptParts.push(`- **${label}:** ${value}.`);
            optionsSelected = true;
        }
    }

    if (!optionsSelected) {
        promptParts.push('- Hãy tự động lựa chọn bối cảnh, phong cách, màu sắc và ánh sáng phù hợp nhất để tạo ra một tác phẩm ấn tượng.');
    }

    if (options.notes) {
        promptParts.push(`- **Ghi chú bổ sung từ người dùng:** "${options.notes}".`);
    }

    if (options.removeWatermark) {
        promptParts.push('- **Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
    }

    promptParts.push(
        'YÊU CẦU QUAN TRỌNĠ: Giữ lại cấu trúc, bố cục và các yếu tố thiết kế cốt lõi từ bản phác thảo gốc. Kết quả phải là một bức ảnh chân thực, không phải là ảnh render 3D hay tranh vẽ.'
    );

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };

    try {
        console.log("Attempting to generate architectural image with dynamic prompt...");
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during architectural image generation:", processedError);
        throw processedError;
    }
}
