/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// FIX: Import the shared AI client instance.
import ai from './client';
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

// FIX: Add the missing refineArchitecturePrompt function.
/**
 * Refines a user's prompt to be more descriptive for architectural image generation.
 * @param userPrompt The user's original prompt.
 * @param imageDataUrls Optional array of image data URLs for context.
 * @returns A promise that resolves to the refined prompt string.
 */
export async function refineArchitecturePrompt(userPrompt: string, imageDataUrls: string[]): Promise<string> {
    const imageParts = imageDataUrls.map(url => {
        const { mimeType, data } = parseDataUrl(url);
        return { inlineData: { mimeType, data } };
    });

    const metaPrompt = `
        You are an expert prompt engineer for an architectural visualization AI.
        Your task is to refine a user's prompt to be more descriptive and effective, using the provided image(s) as context. The goal is to generate a realistic architectural rendering.

        **Context Image(s):** The user has provided one or more images showing a sketch, model, or existing structure.
        **User's Prompt:** "${userPrompt}"

        **Instructions:**
        1.  Analyze the context image(s) to understand the core architectural forms, shapes, and layout.
        2.  Integrate the user's request into a new, single, highly descriptive prompt in Vietnamese.
        3.  The refined prompt MUST instruct the AI to maintain the core structure from the context image(s) while applying the user's specific requests.
        4.  Add architectural details like materials (e.g., concrete, glass, wood), lighting (e.g., golden hour, overcast, studio lighting), environment (e.g., city street, forest, coastline), and overall mood (e.g., minimalist, brutalist, futuristic).
        5.  **Output only the refined prompt text**, without any introductory phrases like "Here is the refined prompt:".
    `;
    
    const parts: any[] = [...imageParts, { text: metaPrompt }];

    try {
        console.log("Attempting to refine architecture prompt...");
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
        });

        const text = response.text;
        if (text) {
            return text.trim();
        }

        console.warn("AI did not return text for architecture prompt refinement. Falling back to user prompt.");
        return userPrompt;

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during architecture prompt refinement:", processedError);
        return userPrompt; // Fallback on error
    }
}
