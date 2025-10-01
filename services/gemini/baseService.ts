/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Modality } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";
import ai from './client'; // Import the shared client instance

// --- Centralized Error Processor ---
export function processApiError(error: unknown): Error {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);

    if (errorMessage.includes('ReadableStream uploading is not supported')) {
        return new Error("Ứng dụng tạm thời chưa tương thích ứng dụng di động, mong mọi người thông cảm");
    }
    if (errorMessage.toLowerCase().includes('api key not valid')) {
        return new Error("API Key không hợp lệ. Vui lòng liên hệ quản trị viên để được hỗ trợ.");
    }
    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('resource_exhausted')) {
        return new Error("Ứng dụng tạm thời đạt giới hạn sử dụng trong ngày, hãy quay trở lại vào ngày tiếp theo.");
    }
    if (errorMessage.toLowerCase().includes('safety') || errorMessage.toLowerCase().includes('blocked')) {
        return new Error("Yêu cầu của bạn đã bị chặn vì lý do an toàn. Vui lòng thử với một hình ảnh hoặc prompt khác.");
    }
    
    // Return original Error object or a new one for other cases
    if (error instanceof Error) {
        return new Error("Đã xảy ra lỗi không mong muốn từ AI. Vui lòng thử lại sau. Chi tiết: " + error.message);
    }
    return new Error("Đã có lỗi không mong muốn từ AI: " + errorMessage);
}

/**
 * Pads an image with white space to fit a target aspect ratio.
 * @param imageDataUrl The data URL of the source image.
 * @param ratioStr The target aspect ratio as a string (e.g., "16:9").
 * @returns A promise that resolves to the data URL of the padded image.
 */
export const padImageToAspectRatio = (imageDataUrl: string, ratioStr: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (ratioStr === 'Giữ nguyên') {
            return resolve(imageDataUrl);
        }
        const [ratioWidth, ratioHeight] = ratioStr.split(':').map(Number);
        if (isNaN(ratioWidth) || isNaN(ratioHeight) || ratioHeight === 0) {
            return reject(new Error('Invalid aspect ratio string'));
        }
        const targetRatio = ratioWidth / ratioHeight;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not get canvas context'));

            const currentRatio = img.width / img.height;
            let newWidth, newHeight, xOffset = 0, yOffset = 0;

            if (currentRatio > targetRatio) {
                newWidth = img.width;
                newHeight = img.width / targetRatio;
                yOffset = (newHeight - img.height) / 2;
            } else {
                newHeight = img.height;
                newWidth = img.height * targetRatio;
                xOffset = (newWidth - img.width) / 2;
            }

            canvas.width = newWidth;
            canvas.height = newHeight;
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, newWidth, newHeight);
            ctx.drawImage(img, xOffset, yOffset, img.width, img.height);
            
            resolve(canvas.toDataURL('image/jpeg', 0.95)); 
        };
        img.onerror = (err) => {
            reject(err);
        };
        img.src = imageDataUrl;
    });
};

/**
 * Generates the prompt instruction for handling aspect ratio changes.
 * @param aspectRatio The target aspect ratio string.
 * @param imageCount The number of input images to correctly pluralize the prompt.
 * @returns An array of prompt strings.
 */
export const getAspectRatioPromptInstruction = (aspectRatio?: string, imageCount: number = 1): string[] => {
    if (aspectRatio && aspectRatio !== 'Giữ nguyên') {
        const imageNoun = imageCount > 1 ? 'Các hình ảnh gốc' : 'Hình ảnh gốc';
        return [
            `**YÊU CẦU QUAN TRỌNG NHẤT VỀ BỐ CỤC:**`,
            `1. Bức ảnh kết quả BẮT BUỘC phải có tỷ lệ khung hình chính xác là ${aspectRatio}.`,
            `2. ${imageNoun} có thể đã được thêm các khoảng trắng (viền trắng) để đạt đúng tỷ lệ.`,
            `3. Nhiệm vụ của bạn là PHẢI lấp đầy HOÀN TOÀN các khoảng trắng này một cách sáng tạo. Hãy mở rộng bối cảnh, chi tiết, và môi trường xung quanh từ ảnh gốc một cách liền mạch để tạo ra một hình ảnh hoàn chỉnh.`,
            `4. Kết quả cuối cùng TUYỆT ĐỐI không được có bất kỳ viền trắng nào.`
        ];
    }
    return [];
};


/**
 * Parses a data URL string to extract its mime type and base64 data.
 * @param imageDataUrl The data URL to parse.
 * @returns An object containing the mime type and data.
 */
export function parseDataUrl(imageDataUrl: string): { mimeType: string; data: string } {
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        throw new Error("Invalid image data URL format. Expected 'data:image/...;base64,...'");
    }
    const [, mimeType, data] = match;
    return { mimeType, data };
}

/**
 * Processes the Gemini API response, extracting the image or throwing an error if none is found.
 * @param response The response from the generateContent call.
 * @returns A data URL string for the generated image.
 */
export function processGeminiResponse(response: GenerateContentResponse): string {
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        return `data:${mimeType};base64,${data}`;
    }

    const textResponse = response.text;
    console.error("API did not return an image. Response:", textResponse);
    throw new Error(`The AI model responded with text instead of an image: "${textResponse || 'No text response received.'}"`);
}

/**
 * A wrapper for the Gemini API call that includes a retry mechanism for internal server errors
 * and for responses that don't contain an image.
 * @param parts An array of parts for the request payload (e.g., image parts, text parts).
 * @returns The GenerateContentResponse from the API.
 */
export async function callGeminiWithRetry(parts: object[]): Promise<GenerateContentResponse> {
    const maxRetries = 3;
    const initialDelay = 1000;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });

            // Validate that the response contains an image.
            const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
            if (imagePart?.inlineData) {
                return response; // Success! The response is valid.
            }

            // If no image is found, treat it as a failure and prepare for retry.
            const textResponse = response.text || "No text response received.";
            lastError = new Error(`The AI model responded with text instead of an image: "${textResponse}"`);
            console.warn(`Attempt ${attempt}/${maxRetries}: No image returned. Retrying... Response text: ${textResponse}`);

        } catch (error) {
            const processedError = processApiError(error);
            lastError = processedError;
            const errorMessage = processedError.message;
            console.error(`Error calling Gemini API (Attempt ${attempt}/${maxRetries}):`, errorMessage);

            // Don't retry on critical errors like invalid API key or quota issues.
            if (errorMessage.includes('API Key không hợp lệ') || errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('resource_exhausted')) {
                throw processedError;
            }

            // If it's not a retriable server error and we're out of retries, fail.
            const isInternalError = errorMessage.includes('"code":500') || errorMessage.includes('INTERNAL');
            if (!isInternalError && attempt >= maxRetries) {
                throw processedError;
            }
        }
        
        // Wait before the next attempt, but not after the last one.
        if (attempt < maxRetries) {
            const delay = initialDelay * Math.pow(2, attempt - 1);
            console.log(`Waiting ${delay}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    // If the loop completes without returning, all retries have failed. Throw the last error.
    throw lastError || new Error("Gemini API call failed after all retries without returning a valid image.");
}

/**
 * Takes a user's prompt and asks a generative model to expand and enrich it.
 * @param userPrompt The user's original, potentially simple, prompt.
 * @returns A promise that resolves to a more descriptive and detailed prompt string.
 */
export async function enhancePrompt(userPrompt: string): Promise<string> {
    const metaPrompt = `Bạn là một chuyên gia viết prompt cho AI tạo ảnh như Imagen. Nhiệm vụ của bạn là lấy một prompt đơn giản từ người dùng và mở rộng nó thành một prompt có độ mô tả cao và hiệu quả để tạo ra một hình ảnh tuyệt đẹp. Hãy thêm các chi tiết phong phú về phong cách, ánh sáng, bố cục, tâm trạng và các kỹ thuật nghệ thuật. Đầu ra PHẢI bằng tiếng Việt.

Prompt của người dùng: "${userPrompt}"

**Đầu ra:** Chỉ xuất ra văn bản prompt đã được tinh chỉnh, không có bất kỳ cụm từ giới thiệu nào.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: metaPrompt,
        });

        const text = response.text;
        if (text && text.trim()) {
            return text.trim();
        }
        // Fallback if the model returns an empty string
        return userPrompt;
    } catch (error) {
        // Process the error for logging/user feedback but return the original prompt as a safe fallback
        const processedError = processApiError(error);
        console.error("Error during prompt enhancement:", processedError);
        return userPrompt;
    }
}