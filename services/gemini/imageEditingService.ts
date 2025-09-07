/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { 
    processApiError, 
    padImageToAspectRatio, 
    getAspectRatioPromptInstruction, 
    parseDataUrl, 
    callGeminiWithRetry, 
    processGeminiResponse 
} from './baseService';

/**
 * Edits an image based on a text prompt.
 * @param imageDataUrl A data URL string of the source image to edit.
 * @param prompt The text prompt with editing instructions.
 * @param aspectRatio Optional target aspect ratio.
 * @param removeWatermark Optional boolean to request watermark removal.
 * @returns A promise that resolves to a base64-encoded image data URL of the edited image.
 */
export async function editImageWithPrompt(
    imageDataUrl: string,
    prompt: string,
    aspectRatio?: string,
    removeWatermark?: boolean
): Promise<string> {
    try {
        const imageToProcess = await padImageToAspectRatio(imageDataUrl, aspectRatio ?? 'Giữ nguyên');
        const { mimeType, data: base64Data } = parseDataUrl(imageToProcess);
        const imagePart = {
            inlineData: { mimeType, data: base64Data },
        };
        
        const hasAspectRatioChange = aspectRatio && aspectRatio !== 'Giữ nguyên';
        
        const promptParts = [
            ...getAspectRatioPromptInstruction(aspectRatio, 1),
        ];

        if (hasAspectRatioChange) {
            promptParts.push(
                '**YÊU CẦU CHỈNH SỬA ẢNH - ƯU TIÊN CAO:**',
                'Sau khi đã lấp đầy các vùng trắng theo yêu cầu về bố cục ở trên, hãy thực hiện thêm yêu cầu chỉnh sửa sau đây trên nội dung của bức ảnh:',
                `"${prompt}"`,
                '**LƯU Ý QUAN TRỌNG:**',
                '- Kết hợp hài hòa giữa việc mở rộng bối cảnh (lấp viền trắng) và việc thực hiện yêu cầu chỉnh sửa.',
                '- Giữ nguyên các phần còn lại của bức ảnh không liên quan đến yêu cầu chỉnh sửa và việc mở rộng bối cảnh.',
                '- Chỉ trả về một hình ảnh duy nhất đã được hoàn thiện.'
            );
        } else {
            promptParts.push(
                '**YÊU CẦU CHỈNH SỬA ẢNH - ƯU TIÊN CAO NHẤT:**',
                'Thực hiện chính xác và duy nhất chỉ một yêu cầu sau đây trên bức ảnh được cung cấp:',
                `"${prompt}"`,
                '**LƯU Ý QUAN TRỌNG:**',
                '- Không thực hiện bất kỳ thay đổi nào khác ngoài yêu cầu đã nêu.',
                '- Giữ nguyên các phần còn lại của bức ảnh.',
                '- Chỉ trả về hình ảnh đã được chỉnh sửa.'
            );
        }

        if (removeWatermark) {
            promptParts.push('- **Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
        }
        
        const fullPrompt = promptParts.join('\n');
        const textPart = { text: fullPrompt };

        console.log("Attempting to edit image with prompt...");
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during image editing:", processedError);
        throw processedError;
    }
}

/**
 * Removes the background from an image, making it transparent.
 * @param imageDataUrl A data URL string of the source image.
 * @returns A promise resolving to a data URL of the image with a transparent background.
 */
export async function removeImageBackground(imageDataUrl: string): Promise<string> {
    try {
        const { mimeType, data: base64Data } = parseDataUrl(imageDataUrl);
        const imagePart = {
            inlineData: { mimeType, data: base64Data },
        };
        
        const prompt = [
            '**YÊU CẦU CỰC KỲ QUAN TRỌNG:**',
            'Xóa toàn bộ nền của hình ảnh này. Nền mới phải hoàn toàn TRONG SUỐT.',
            'Giữ nguyên chủ thể ở tiền cảnh một cách chính xác, không làm mất chi tiết.',
            'Trả về kết quả dưới dạng ảnh PNG có kênh alpha trong suốt.',
            'Chỉ trả về hình ảnh đã xử lý, không kèm theo bất kỳ văn bản nào.'
        ].join('\n');
        
        const textPart = { text: prompt };

        console.log("Attempting to remove image background...");
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during background removal:", processedError);
        throw processedError;
    }
}
