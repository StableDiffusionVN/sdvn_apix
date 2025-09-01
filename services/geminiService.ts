/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

// --- Helper Functions ---

/**
 * Creates the primary prompt for the patriotic theme.
 * @param idea The creative idea (e.g., "Áo dài đỏ sao vàng").
 * @param customPrompt Optional additional instructions for modification.
 * @returns The main prompt string.
 */
function getPrimaryPrompt(idea: string, customPrompt?: string): string {
    const modificationText = customPrompt ? ` Yêu cầu chỉnh sửa bổ sung: "${customPrompt}".` : '';
    return `Tạo một bức ảnh chụp chân thật và tự nhiên của người trong ảnh gốc, trong bối cảnh "${idea}".${modificationText} YÊU CẦU QUAN TRỌNG NHẤT: Phải giữ lại chính xác tuyệt đối 100% các đặc điểm trên khuôn mặt, đường nét, và biểu cảm của người trong ảnh gốc. Không được thay đổi hay chỉnh sửa khuôn mặt. Bức ảnh phải thể hiện được niềm tự hào dân tộc Việt Nam một cách sâu sắc. Ảnh phải có chất lượng cao, sắc nét, với tông màu đỏ của quốc kỳ làm chủ đạo nhưng vẫn giữ được sự hài hòa, tự nhiên. Tránh tạo ra ảnh theo phong cách vẽ hay hoạt hình.`;
}


/**
 * Creates a fallback prompt to use when the primary one is blocked.
 * @param idea The creative idea (e.g., "Áo dài đỏ sao vàng").
 * @param customPrompt Optional additional instructions for modification.
 * @returns The fallback prompt string.
 */
function getFallbackPrompt(idea: string, customPrompt?: string): string {
    const modificationText = customPrompt ? ` Yêu cầu bổ sung: "${customPrompt}".` : '';
    return `Tạo một bức ảnh chụp chân dung của người trong ảnh này với chủ đề "${idea}".${modificationText} Bức ảnh cần trông thật và tự nhiên. YÊU CẦU QUAN TRỌNG NHẤT: Phải giữ lại chính xác tuyệt đối 100% các đặc điểm trên khuôn mặt của người trong ảnh gốc. Không được thay đổi khuôn mặt.`;
}

/**
 * Processes the Gemini API response, extracting the image or throwing an error if none is found.
 * @param response The response from the generateContent call.
 * @returns A data URL string for the generated image.
 */
function processGeminiResponse(response: GenerateContentResponse): string {
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
 * A wrapper for the Gemini API call that includes a retry mechanism for internal server errors.
 * @param imagePart The image part of the request payload.
 * @param textPart The text part of the request payload.
 * @returns The GenerateContentResponse from the API.
 */
async function callGeminiWithRetry(imagePart: object, textPart: object): Promise<GenerateContentResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const maxRetries = 3;
    const initialDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts: [imagePart, textPart] },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            console.error(`Error calling Gemini API (Attempt ${attempt}/${maxRetries}):`, errorMessage);

            if (errorMessage.includes('API key not valid')) {
                throw error;
            }

            const isInternalError = errorMessage.includes('"code":500') || errorMessage.includes('INTERNAL');

            if (isInternalError && attempt < maxRetries) {
                const delay = initialDelay * Math.pow(2, attempt - 1);
                console.log(`Internal error detected. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error; // Re-throw if not a retriable error or if max retries are reached.
        }
    }
    throw new Error("Gemini API call failed after all retries.");
}


/**
 * Generates a patriotic-themed image from a source image and an idea.
 * It includes a fallback mechanism for prompts that might be blocked.
 * @param imageDataUrl A data URL string of the source image (e.g., 'data:image/png;base64,...').
 * @param idea The creative idea string (e.g., "Áo dài đỏ sao vàng").
 * @param customPrompt Optional additional instructions for modification.
 * @returns A promise that resolves to a base64-encoded image data URL of the generated image.
 */
export async function generatePatrioticImage(imageDataUrl: string, idea: string, customPrompt?: string): Promise<string> {
  const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!match) {
    throw new Error("Invalid image data URL format. Expected 'data:image/...;base64,...'");
  }
  const [, mimeType, base64Data] = match;

    const imagePart = {
        inlineData: { mimeType, data: base64Data },
    };

    // --- First attempt with the original prompt ---
    try {
        console.log("Attempting generation with original prompt...");
        const prompt = getPrimaryPrompt(idea, customPrompt);
        const textPart = { text: prompt };
        const response = await callGeminiWithRetry(imagePart, textPart);
        return processGeminiResponse(response);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        
        if (errorMessage.includes("API key not valid")) {
            throw error;
        }

        const isNoImageError = errorMessage.includes("The AI model responded with text instead of an image");

        if (isNoImageError) {
            console.warn(`Original prompt was likely blocked for idea: ${idea}. Trying a fallback prompt.`);
            
            // --- Second attempt with the fallback prompt ---
            try {
                const fallbackPrompt = getFallbackPrompt(idea, customPrompt);
                console.log(`Attempting generation with fallback prompt for ${idea}...`);
                const fallbackTextPart = { text: fallbackPrompt };
                const fallbackResponse = await callGeminiWithRetry(imagePart, fallbackTextPart);
                return processGeminiResponse(fallbackResponse);
            } catch (fallbackError) {
                console.error("Fallback prompt also failed.", fallbackError);
                if (fallbackError instanceof Error && fallbackError.message.includes("API key not valid")) {
                   throw fallbackError;
                }
                const finalErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                throw new Error(`The AI model failed with both original and fallback prompts. Last error: ${finalErrorMessage}`);
            }
        } else {
            // This is for other errors, like a final internal server error after retries.
            console.error("An unrecoverable error occurred during image generation.", error);
            throw new Error(`The AI model failed to generate an image. Details: ${errorMessage}`);
        }
    }
}