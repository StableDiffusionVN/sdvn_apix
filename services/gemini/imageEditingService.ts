/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";
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

export async function generateFromMultipleImages(
    imageDataUrls: string[],
    prompt: string,
    aspectRatio?: string,
    removeWatermark?: boolean
): Promise<string> {
    try {
        const imageParts = await Promise.all(
            imageDataUrls.map(async (url) => {
                const { mimeType, data } = parseDataUrl(url);
                return { inlineData: { mimeType, data } };
            })
        );

        const promptParts = [
            `Bạn được cung cấp ${imageDataUrls.length} hình ảnh đầu vào, được sắp xếp theo thứ tự lựa chọn của người dùng.`,
            `Nhiệm vụ của bạn là sử dụng chúng làm ngữ cảnh, nguồn cảm hứng hoặc các yếu tố để kết hợp dựa trên chỉ dẫn sau đây để tạo ra một hình ảnh mới, duy nhất và gắn kết: "${prompt}"`,
        ];
        
        if (aspectRatio && aspectRatio !== 'Giữ nguyên') {
            promptParts.push(
                ...getAspectRatioPromptInstruction(aspectRatio, 1)
            );
        }

        if (removeWatermark) {
            promptParts.push('- **Yêu cầu đặc biệt:** Kết quả không được chứa bất kỳ watermark, logo, hay chữ ký nào.');
        }
        
        promptParts.push('Đầu ra cuối cùng chỉ được là một hình ảnh duy nhất.');

        const fullPrompt = promptParts.join('\n');
        const textPart = { text: fullPrompt };

        const allParts = [...imageParts, textPart];

        console.log("Attempting to generate image from multiple sources...");
        const response = await callGeminiWithRetry(allParts);
        return processGeminiResponse(response);

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during multi-image generation:", processedError);
        throw processedError;
    }
}


/**
 * Refines a user's prompt to be more descriptive, optionally using images for context.
 * @param userPrompt The user's original prompt.
 * @param imageDataUrls Optional array of image data URLs for context.
 * @returns A promise that resolves to the refined prompt string.
 */
export async function refinePrompt(userPrompt: string, imageDataUrls?: string[]): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let parts: any[] = [];
    let metaPrompt = '';

    if (imageDataUrls && imageDataUrls.length > 0) {
        const imageParts = imageDataUrls.map(url => {
            const { mimeType, data } = parseDataUrl(url);
            return { inlineData: { mimeType, data } };
        });
        parts.push(...imageParts);
        metaPrompt = `You are an expert prompt engineer for a generative AI model. Your task is to refine a user's prompt to make it more descriptive and effective, based on the context of the provided image(s).`;
    } else {
        metaPrompt = `You are an expert prompt engineer for a generative AI model. Your task is to take a user's potentially simple prompt and expand it into a highly descriptive and effective prompt for a generative AI model. Add details about style, lighting, composition, and mood.`;
    }

    metaPrompt += `\n\n**User's Prompt:** "${userPrompt}"\n\n**Instructions:**\n1. Generate a new, single, highly descriptive prompt in Vietnamese.\n2. **Output only the refined prompt text**, without any introductory phrases.`;
    
    parts.push({ text: metaPrompt });

    try {
        console.log("Attempting to refine prompt...");
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
        });

        const text = response.text;
        if (text) {
            return text.trim();
        }

        console.warn("AI did not return text for prompt refinement. Falling back to user prompt.");
        return userPrompt;

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during prompt refinement:", processedError);
        // Fallback to the original prompt on error
        return userPrompt;
    }
}

/**
 * Analyzes a user's prompt to extract image generation parameters like count and aspect ratio.
 * @param userPrompt The user's original prompt.
 * @returns A promise resolving to an object with the number of images, aspect ratio, and a refined prompt.
 */
export async function analyzePromptForImageGenerationParams(
    userPrompt: string
): Promise<{ numberOfImages: number; aspectRatio: string; refinedPrompt: string; }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const metaPrompt = `
        You are an intelligent prompt analyzer for an image generation AI. Your task is to analyze the user's prompt to extract specific parameters for image generation.

        Analyze the following prompt: "${userPrompt}"

        Instructions:
        1.  **Number of Images:** Look for requests for a specific number of images (e.g., "create 4 pictures", "tạo 2 ảnh", "make two variations"). If found, extract the number. The number must be between 1 and 4. If not specified, default to 1.
        2.  **Aspect Ratio:** Look for requests for a specific aspect ratio (e.g., "16:9", "phone wallpaper", "ảnh dọc", "widescreen", "ảnh vuông"). Map common terms to the closest valid ratio. Valid ratios are "1:1", "3:4", "4:3", "9:16", "16:9".
            - "square", "vuông" -> "1:1"
            - "portrait", "phone wallpaper", "ảnh dọc", "ảnh cho điện thoại" -> "9:16"
            - "widescreen", "landscape", "ảnh ngang" -> "16:9"
            If not specified, default to "1:1".
        3.  **Refined Prompt:** Return the user's original prompt but with the instructions for number of images and aspect ratio removed. This refined prompt will be sent to the image generation model. It should be clean and focused only on the visual description.

        Return the result as a valid JSON object matching the provided schema.
    `;

    try {
        console.log("Analyzing prompt for generation parameters...");
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: metaPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        numberOfImages: {
                            type: Type.INTEGER,
                            description: "The number of images to generate, from 1 to 4. Default is 1.",
                        },
                        aspectRatio: {
                            type: Type.STRING,
                            description: "The aspect ratio. Must be one of '1:1', '3:4', '4:3', '9:16', '16:9'. Default is '1:1'.",
                        },
                        refinedPrompt: {
                            type: Type.STRING,
                            description: "The user's prompt with parameter instructions removed.",
                        },
                    },
                    required: ["numberOfImages", "aspectRatio", "refinedPrompt"],
                }
            }
        });

        const jsonText = response.text.trim();
        if (jsonText) {
            const parsed = JSON.parse(jsonText);
            // Clamp numberOfImages just in case the model returns something out of bounds.
            parsed.numberOfImages = Math.max(1, Math.min(4, parsed.numberOfImages || 1));
            return parsed;
        }
        
        throw new Error("AI did not return a valid JSON response for parameter analysis.");

    } catch (error) {
        console.error("Error during prompt parameter analysis, falling back to defaults:", error);
        // Fallback to default values and the original prompt if analysis fails.
        return {
            numberOfImages: 1,
            aspectRatio: '1:1',
            refinedPrompt: userPrompt,
        };
    }
}


/**
 * Refines a user's prompt into a detailed architectural prompt, using images for context.
 * @param userPrompt The user's original prompt.
 * @param imageDataUrls Array of image data URLs for context.
 * @returns A promise that resolves to the refined architectural prompt string.
 */
export async function refineArchitecturePrompt(userPrompt: string, imageDataUrls: string[]): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const imageParts = imageDataUrls.map(url => {
        const { mimeType, data } = parseDataUrl(url);
        return { inlineData: { mimeType, data } };
    });

    const metaPrompt = `
        Bạn là một chuyên gia AI trong lĩnh vực kiến trúc. Nhiệm vụ của bạn là tạo ra một câu lệnh (prompt) chi tiết và hiệu quả để biến đổi (các) hình ảnh được cung cấp (thường là bản phác thảo) thành một bức ảnh phối cảnh kiến trúc chân thực, chất lượng cao.

        **YÊU CẦU CỐT LÕI (KHÔNG THAY ĐỔI):** Prompt cuối cùng phải yêu cầu AI "giữ nguyên đường nét, bố cục và hình khối từ hình ảnh một cách chính xác nhất". Đây là nguyên tắc quan trọng nhất.

        **Yêu cầu bổ sung từ người dùng:** "${userPrompt}"

        **Hướng dẫn tạo prompt:**
        1.  Bắt đầu prompt cuối cùng bằng cụm từ: "Giữ nguyên đường nét, bố cục và hình khối từ hình ảnh một cách chính xác nhất, hãy tạo ra một bức ảnh phối cảnh kiến trúc chân thực của công trình này."
        2.  Phân tích (các) hình ảnh để hiểu ý tưởng kiến trúc.
        3.  Tích hợp "Yêu cầu bổ sung của người dùng" vào prompt một cách tự nhiên.
        4.  Thêm các chi tiết chuyên ngành để làm cho prompt phong phú hơn, dựa trên cả hình ảnh và yêu cầu của người dùng, bao gồm:
            - Phong cách kiến trúc (ví dụ: Hiện đại, Tối giản, Brutalist).
            - Bối cảnh (ví dụ: Đô thị, Ven biển, Vùng núi).
            - Vật liệu (ví dụ: Bê tông, Kính, Gỗ).
            - Ánh sáng (ví dụ: Ánh sáng ban ngày, Giờ vàng).
            - Không khí/Tâm trạng (ví dụ: Thanh bình, Hùng vĩ).
    
        **ĐẦU RA:**
        - Chỉ xuất ra câu lệnh cuối cùng bằng tiếng Việt.
        - Không thêm bất kỳ cụm từ giới thiệu nào.
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
        return `Tạo một bức ảnh kiến trúc chân thực, chất lượng cao. ${userPrompt}`;

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during architecture prompt refinement:", processedError);
        return `Tạo một bức ảnh kiến trúc chân thực, chất lượng cao. ${userPrompt}`;
    }
}