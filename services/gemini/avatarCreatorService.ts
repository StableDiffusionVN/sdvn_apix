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
 * Creates the primary prompt for the patriotic theme.
 * @param idea The creative idea (e.g., "Áo dài đỏ sao vàng").
 * @param customPrompt Optional additional instructions for modification.
 * @param removeWatermark A boolean to request watermark removal.
 * @param aspectRatio The target aspect ratio.
 * @returns The main prompt string.
 */
function getPrimaryPrompt(idea: string, customPrompt?: string, removeWatermark?: boolean, aspectRatio?: string): string {
    const modificationText = customPrompt ? ` Yêu cầu chỉnh sửa bổ sung: "${customPrompt}".` : '';
    const watermarkText = removeWatermark ? ' Yêu cầu quan trọng: Kết quả cuối cùng không được chứa bất kỳ watermark, logo, hay chữ ký nào.' : '';
    const aspectRatioInstruction = getAspectRatioPromptInstruction(aspectRatio, 1).join('\n');

    return `${aspectRatioInstruction}\nTạo một bức ảnh chụp chân thật và tự nhiên của người trong ảnh gốc, trong bối cảnh "${idea}".${modificationText}${watermarkText} YÊU CẦU QUAN TRỌNG NHẤT: Phải giữ lại chính xác tuyệt đối 100% các đặc điểm trên khuôn mặt, đường nét, và biểu cảm của người trong ảnh gốc. Không được thay đổi hay chỉnh sửa khuôn mặt. Bức ảnh phải thể hiện được niềm tự hào dân tộc Việt Nam một cách sâu sắc. Ảnh phải có chất lượng cao, sắc nét, với tông màu đỏ của quốc kỳ làm chủ đạo nhưng vẫn giữ được sự hài hòa, tự nhiên. Tránh tạo ra ảnh theo phong cách vẽ hay hoạt hình.`;
}


/**
 * Creates a fallback prompt to use when the primary one is blocked.
 * @param idea The creative idea (e.g., "Áo dài đỏ sao vàng").
 * @param customPrompt Optional additional instructions for modification.
 * @param removeWatermark A boolean to request watermark removal.
 * @param aspectRatio The target aspect ratio.
 * @returns The fallback prompt string.
 */
function getFallbackPrompt(idea: string, customPrompt?: string, removeWatermark?: boolean, aspectRatio?: string): string {
    const modificationText = customPrompt ? ` Yêu cầu bổ sung: "${customPrompt}".` : '';
    const watermarkText = removeWatermark ? ' Yêu cầu thêm: Không có watermark, logo, hay chữ ký trên ảnh.' : '';
     const aspectRatioInstruction = getAspectRatioPromptInstruction(aspectRatio, 1).join('\n');

    return `${aspectRatioInstruction}\nTạo một bức ảnh chụp chân dung của người trong ảnh này với chủ đề "${idea}".${modificationText}${watermarkText} Bức ảnh cần trông thật và tự nhiên. YÊU CẦU QUAN TRỌNG NHẤT: Phải giữ lại chính xác tuyệt đối 100% các đặc điểm trên khuôn mặt của người trong ảnh gốc. Không được thay đổi khuôn mặt.`;
}

/**
 * Generates a patriotic-themed image from a source image and an idea.
 * It includes a fallback mechanism for prompts that might be blocked.
 * @param imageDataUrl A data URL string of the source image (e.g., 'data:image/png;base64,...').
 * @param idea The creative idea string (e.g., "Áo dài đỏ sao vàng").
 * @param customPrompt Optional additional instructions for modification.
 * @param removeWatermark Optional boolean to request watermark removal.
 * @param aspectRatio Optional target aspect ratio.
 * @returns A promise that resolves to a base64-encoded image data URL of the generated image.
 */
export async function generatePatrioticImage(imageDataUrl: string, idea: string, customPrompt?: string, removeWatermark?: boolean, aspectRatio?: string): Promise<string> {
    const imageToProcess = await padImageToAspectRatio(imageDataUrl, aspectRatio ?? 'Giữ nguyên');
    const { mimeType, data: base64Data } = parseDataUrl(imageToProcess);

    const imagePart = {
        inlineData: { mimeType, data: base64Data },
    };

    // --- First attempt with the original prompt ---
    try {
        console.log("Attempting generation with original prompt...");
        const prompt = getPrimaryPrompt(idea, customPrompt, removeWatermark, aspectRatio);
        const textPart = { text: prompt };
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        const errorMessage = processedError.message;
        
        if (errorMessage.includes("API key not valid") || errorMessage.includes("Ứng dụng tạm thời")) {
            throw processedError;
        }

        const isNoImageError = errorMessage.includes("The AI model responded with text instead of an image");

        if (isNoImageError) {
            console.warn(`Original prompt was likely blocked for idea: ${idea}. Trying a fallback prompt.`);
            
            // --- Second attempt with the fallback prompt ---
            try {
                const fallbackPrompt = getFallbackPrompt(idea, customPrompt, removeWatermark, aspectRatio);
                console.log(`Attempting generation with fallback prompt for ${idea}...`);
                const fallbackTextPart = { text: fallbackPrompt };
                const fallbackResponse = await callGeminiWithRetry([imagePart, fallbackTextPart]);
                return processGeminiResponse(fallbackResponse);
            } catch (fallbackError) {
                console.error("Fallback prompt also failed.", fallbackError);
                const processedFallbackError = processApiError(fallbackError);
                if (processedFallbackError.message.includes("API key not valid")) {
                   throw processedFallbackError;
                }
                const finalErrorMessage = processedFallbackError.message;
                throw new Error(`The AI model failed with both original and fallback prompts. Last error: ${finalErrorMessage}`);
            }
        } else {
            // This is for other errors, like a final internal server error after retries.
            console.error("Error during image generation:", processedError);
            throw new Error(`The AI model failed to generate an image. Details: ${errorMessage}`);
        }
    }
}
