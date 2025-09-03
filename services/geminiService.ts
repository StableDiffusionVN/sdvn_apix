/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

// --- NEW: Centralized Error Processor ---
function processApiError(error: unknown): Error {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);

    if (errorMessage.includes('ReadableStream uploading is not supported')) {
        return new Error("Ứng dụng tạm thời chưa tương thích ứng dụng di động, mong mọi người thông cảm");
    }
    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('resource_exhausted')) {
        return new Error("Ứng dụng tạm thời đạt giới hạn sử dụng trong ngày, hãy quay trở lại vào ngày tiếp theo.");
    }
    
    // Return original Error object or a new one for other cases
    if (error instanceof Error) {
        return error; 
    }
    return new Error(errorMessage);
}

/**
 * Edits an image based on a text prompt.
 * @param imageDataUrl A data URL string of the source image to edit.
 * @param prompt The text prompt with editing instructions.
 * @returns A promise that resolves to a base64-encoded image data URL of the edited image.
 */
export async function editImageWithPrompt(imageDataUrl: string, prompt: string): Promise<string> {
    try {
        const { mimeType, data: base64Data } = parseDataUrl(imageDataUrl);
        const imagePart = {
            inlineData: { mimeType, data: base64Data },
        };
        
        // Wrap the user's prompt in a more forceful template to improve AI adherence.
        const fullPrompt = [
            '**YÊU CẦU CHỈNH SỬA ẢNH - ƯU TIÊN CAO NHẤT:**',
            'Thực hiện chính xác và duy nhất chỉ một yêu cầu sau đây trên bức ảnh được cung cấp:',
            `"${prompt}"`,
            '**LƯU Ý QUAN TRỌNG:**',
            '- Không thực hiện bất kỳ thay đổi nào khác ngoài yêu cầu đã nêu.',
            '- Giữ nguyên các phần còn lại của bức ảnh.',
            '- Chỉ trả về hình ảnh đã được chỉnh sửa.'
        ].join('\n');
        
        const textPart = { text: fullPrompt };

        console.log("Attempting to edit image with prompt...");
        // Re-using callGeminiWithRetry which is configured for gemini-2.5-flash-image-preview
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("An unrecoverable error occurred during image editing.", processedError);
        throw processedError;
    }
}


// --- Helper Functions ---

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
const getAspectRatioPromptInstruction = (aspectRatio?: string, imageCount: number = 1): string[] => {
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
function parseDataUrl(imageDataUrl: string): { mimeType: string; data: string } {
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        throw new Error("Invalid image data URL format. Expected 'data:image/...;base64,...'");
    }
    const [, mimeType, data] = match;
    return { mimeType, data };
}


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
 * @param parts An array of parts for the request payload (e.g., image parts, text parts).
 * @returns The GenerateContentResponse from the API.
 */
async function callGeminiWithRetry(parts: object[]): Promise<GenerateContentResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const maxRetries = 3;
    const initialDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            console.error(`Error calling Gemini API (Attempt ${attempt}/${maxRetries}):`, errorMessage);

            if (errorMessage.includes('API key not valid') || errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('resource_exhausted')) {
                throw error; // Don't retry on auth or quota errors
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
            console.error("An unrecoverable error occurred during image generation.", processedError);
            throw new Error(`The AI model failed to generate an image. Details: ${errorMessage}`);
        }
    }
}

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
        console.error("An unrecoverable error occurred during architectural image generation.", processedError);
        throw processedError;
    }
}


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
        console.error("An unrecoverable error occurred during dressed model image generation.", processedError);
        throw processedError;
    }
}

// --- NEW: Photo Restoration ---

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
        console.error("An unrecoverable error occurred during photo restoration.", processedError);
        throw processedError;
    }
}


// --- NEW: Image to Realistic ---

interface ImageToRealOptions {
    faithfulness: string;
    notes?: string;
    removeWatermark?: boolean;
}

export async function convertImageToRealistic(imageDataUrl: string, options: ImageToRealOptions): Promise<string> {
    const { mimeType, data: base64Data } = parseDataUrl(imageDataUrl);
    const imagePart = { inlineData: { mimeType, data: base64Data } };

    const promptParts = [
        'Nhiệm vụ của bạn là chuyển đổi hình ảnh được cung cấp thành một bức ảnh SIÊU THỰC (hyper-realistic), chi tiết và sống động như thật. Kết quả cuối cùng phải không thể phân biệt được với một bức ảnh được chụp bằng máy ảnh DSLR cao cấp.',
        '**YÊU CẦU BẮT BUỘC:**'
    ];
    
    const faithfulnessMapping: { [key: string]: string } = {
        'Rất yếu': '1. **Mức độ giữ nét (Rất Yếu):** Bạn có quyền tự do sáng tạo cao nhất. Chỉ cần giữ lại chủ đề chính, bạn có thể thay đổi đáng kể bố cục, góc nhìn và các chi tiết.',
        'Yếu': '1. **Mức độ giữ nét (Yếu):** Bạn có thể thay đổi bố cục và thêm/bớt các yếu tố phụ, nhưng phải giữ lại chủ thể và tư thế chính.',
        'Trung bình': '1. **Mức độ giữ nét (Trung bình):** Giữ lại bố cục và các yếu tố chính, nhưng bạn có thể diễn giải lại các chi tiết nhỏ và kết cấu vật liệu.',
        'Mạnh': '1. **Mức độ giữ nét (Mạnh):** Bám sát chặt chẽ với bố cục và các chi tiết trong ảnh gốc. Chỉ thay đổi phong cách nghệ thuật sang ảnh thật.',
        'Rất mạnh': '1. **Mức độ giữ nét (Rất Mạnh):** SAO CHÉP CHÍNH XÁC. Phải giữ lại TẤT CẢ các chi tiết, hình dạng, vị trí và bố cục từ ảnh gốc một cách tuyệt đối. Nhiệm vụ duy nhất là biến nó thành ảnh thật.',
    };

    if (options.faithfulness && options.faithfulness !== 'Tự động') {
        promptParts.push(faithfulnessMapping[options.faithfulness]);
    } else {
        promptParts.push('1. **Mức độ giữ nét (Tự động):** Giữ nguyên chủ thể, bố cục, và các yếu tố chính của ảnh gốc. Diễn giải một cách hợp lý để tạo ra kết quả chân thực nhất.');
    }

    promptParts.push(
        '2. **Thay đổi phong cách:** Biến đổi hoàn toàn phong cách nghệ thuật (ví dụ: vẽ tay, hoạt hình, 3D) thành một bức ảnh trông như được chụp bằng máy ảnh kỹ thuật số hiện đại.',
        '3. **Chân thực đến kinh ngạc:** Hãy đặc biệt chú ý đến ánh sáng tự nhiên, bóng đổ phức tạp, kết cấu vật liệu chi tiết (da, vải, kim loại, gỗ), và các chi tiết nhỏ nhất để tạo ra một kết quả chân thực.'
    );
    
    if (options.notes) {
        promptParts.push(`- **Ghi chú từ người dùng:** "${options.notes}".`);
    }
    
    if (options.removeWatermark) {
        promptParts.push('- **Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
    }
    
    promptParts.push('Chỉ trả về hình ảnh đã được chuyển đổi, không kèm theo văn bản giải thích.');

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };

    try {
        console.log("Attempting to convert image to realistic with new prompt...");
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("An unrecoverable error occurred during image to real conversion.", processedError);
        throw processedError;
    }
}


// --- NEW: Swap Style ---

interface SwapStyleOptions {
    style: string;
    styleStrength: string;
    notes?: string;
    removeWatermark?: boolean;
}

export async function swapImageStyle(imageDataUrl: string, options: SwapStyleOptions): Promise<string> {
    const { mimeType, data: base64Data } = parseDataUrl(imageDataUrl);
    const imagePart = { inlineData: { mimeType, data: base64Data } };

    const promptParts = [
        'Nhiệm vụ của bạn là một nghệ sĩ bậc thầy, biến đổi hình ảnh được cung cấp theo một phong cách nghệ thuật cụ thể.',
        '**YÊU CẦU BẮT BUỘC:**'
    ];
    
    promptParts.push(`1. **Áp dụng phong cách:** Chuyển đổi hoàn toàn hình ảnh gốc sang phong cách nghệ thuật **"${options.style}"**.`);

    const strengthMapping: { [key: string]: string } = {
        'Rất yếu': '2. **Mức độ ảnh hưởng Style (Rất Yếu):** Áp dụng "lớp da" phong cách mới một cách tinh tế. Giữ lại gần như TOÀN BỘ các chi tiết, hình dạng, và bố cục từ ảnh gốc.',
        'Yếu': '2. **Mức độ ảnh hưởng Style (Yếu):** Bám sát chặt chẽ với bố cục và các chi tiết trong ảnh gốc. Chỉ thay đổi phong cách nghệ thuật, giữ nguyên vẹn nội dung.',
        'Trung bình': '2. **Mức độ ảnh hưởng Style (Trung bình):** Giữ lại bố cục và các yếu tố chính của ảnh gốc, nhưng có thể diễn giải lại các chi tiết nhỏ và kết cấu vật liệu theo phong cách mới.',
        'Mạnh': '2. **Mức độ ảnh hưởng Style (Mạnh):** Có thể thay đổi một vài chi tiết phụ và kết cấu, nhưng phải giữ lại chủ thể và bố cục chính của ảnh gốc để phù hợp hơn với style mới.',
        'Rất mạnh': '2. **Mức độ ảnh hưởng Style (Rất Mạnh):** Tự do sáng tạo cao nhất. Chỉ cần giữ lại chủ đề chính, bạn có thể thay đổi đáng kể bố cục, góc nhìn và các chi tiết để phù hợp nhất với phong cách đã chọn.',
    };
    
    promptParts.push(strengthMapping[options.styleStrength]);

    promptParts.push(
        '3. **Kết quả chất lượng cao:** Bức ảnh cuối cùng phải là một tác phẩm nghệ thuật hoàn chỉnh, chất lượng cao, thể hiện rõ nét đặc trưng của phong cách đã chọn.'
    );
    
    if (options.notes) {
        promptParts.push(`- **Ghi chú từ người dùng:** "${options.notes}".`);
    }
    
    if (options.removeWatermark) {
        promptParts.push('- **Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
    }
    
    promptParts.push('Chỉ trả về hình ảnh đã được chuyển đổi, không kèm theo văn bản giải thích.');

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };

    try {
        console.log("Attempting to swap image style...");
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("An unrecoverable error occurred during style swap.", processedError);
        throw processedError;
    }
}


// --- NEW: Mix Style ---

interface MixStyleOptions {
    styleStrength: string;
    notes?: string;
    removeWatermark?: boolean;
}

export async function mixImageStyle(contentImageDataUrl: string, styleImageDataUrl: string, options: MixStyleOptions): Promise<string> {
    const { mimeType: contentMime, data: contentData } = parseDataUrl(contentImageDataUrl);
    const { mimeType: styleMime, data: styleData } = parseDataUrl(styleImageDataUrl);

    const contentImagePart = { inlineData: { mimeType: contentMime, data: contentData } };
    const styleImagePart = { inlineData: { mimeType: styleMime, data: styleData } };

    const promptParts = [
        'Bạn là một nghệ sĩ AI chuyên về chuyển giao phong cách. Tôi cung cấp cho bạn 2 tấm ảnh:',
        '- Ảnh 1: Ảnh "Nội dung" - chứa bố cục, chủ thể và các yếu tố chính.',
        '- Ảnh 2: Ảnh "Phong cách" - chứa phong cách nghệ thuật, bảng màu, kết cấu và không khí cần áp dụng.',
        '**Nhiệm vụ của bạn là tạo ra một bức ảnh MỚI, vẽ lại Ảnh 1 theo phong cách của Ảnh 2.**',
        '**YÊU CẦU CỰC KỲ QUAN TRỌNG:**'
    ];

     const strengthMapping: { [key: string]: string } = {
        'Rất yếu': '1. **Mức độ ảnh hưởng phong cách (Rất Yếu):** Giữ lại tất cả các chi tiết và hình dạng của Ảnh 1 (Nội dung). Chỉ áp dụng bảng màu và không khí chung (mood) từ Ảnh 2 (Phong cách).',
        'Yếu': '1. **Mức độ ảnh hưởng phong cách (Yếu):** Giữ lại các chi tiết chính của Ảnh 1. Áp dụng bảng màu và các kết cấu (texture) cơ bản từ Ảnh 2.',
        'Trung bình': '1. **Mức độ ảnh hưởng phong cách (Trung bình):** Kết hợp hài hòa. Giữ lại chủ thể và hình dạng cốt lõi của Ảnh 1, nhưng vẽ lại chúng một cách rõ rệt bằng màu sắc, ánh sáng và kết cấu từ Ảnh 2.',
        'Mạnh': '1. **Mức độ ảnh hưởng phong cách (Mạnh):** Ưu tiên mạnh mẽ cho Ảnh 2. Bố cục của Ảnh 1 vẫn nhận ra được, nhưng các chi tiết, kết cấu và đối tượng được biến đổi sâu sắc theo phong cách của Ảnh 2.',
        'Rất mạnh': '1. **Mức độ ảnh hưởng phong cách (Rất Mạnh):** Áp dụng tối đa phong cách từ Ảnh 2. Sử dụng bố cục của Ảnh 1 như một gợi ý, vẽ lại toàn bộ cảnh theo phong cách đặc trưng của Ảnh 2. Kết quả phải trông như một tác phẩm của nghệ sĩ đã vẽ Ảnh 2.',
    };

    // The default is now 'Rất yếu', so a value will always be present in the mapping.
    promptParts.push(strengthMapping[options.styleStrength]);


    promptParts.push(
        '2. **Bảo toàn nội dung:** Phải giữ lại TOÀN BỘ bố cục, chủ thể, và các đối tượng chính từ Ảnh 1. Không được thêm, bớt, hay thay đổi các yếu tố cốt lõi này.',
        '3. **Chuyển giao phong cách:** Áp dụng một cách tinh tế và toàn diện các đặc điểm nghệ thuật của Ảnh 2 (ví dụ: nét cọ, nhiễu hạt, màu sắc, ánh sáng, kết cấu) lên Ảnh 1.'
    );

    if (options.notes) {
        promptParts.push(`- **Ghi chú bổ sung từ người dùng:** "${options.notes}".`);
    }
    
    if (options.removeWatermark) {
        promptParts.push('- **Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
    }
    
    promptParts.push('Chỉ trả về hình ảnh kết quả cuối cùng, không kèm theo văn bản giải thích.');
    
    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };

    try {
        console.log("Attempting to mix image styles...");
        const response = await callGeminiWithRetry([contentImagePart, styleImagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("An unrecoverable error occurred during style mix.", processedError);
        throw processedError;
    }
}

// --- NEW: Free Generation ---

type ImagenAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

function mapToImagenAspectRatio(ratio: string): ImagenAspectRatio {
    const ratioMap: { [key: string]: ImagenAspectRatio } = {
        '1:1': '1:1', '2:3': '3:4', '4:5': '3:4', '9:16': '9:16', '1:2': '9:16',
        '3:2': '4:3', '5:4': '4:3', '16:9': '16:9', '2:1': '16:9',
    };
    return ratioMap[ratio] || '1:1';
}

export async function generateFreeImage(
    prompt: string,
    numberOfImages: number,
    aspectRatio: string,
    imageDataUrl1?: string,
    imageDataUrl2?: string,
    removeWatermark?: boolean
): Promise<string[]> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        // Case 1: Image generation (Text-to-Image)
        if (!imageDataUrl1) {
            const maxRetries = 3;
            const initialDelay = 1000;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`Attempting text-to-image generation (Attempt ${attempt}/${maxRetries})...`);
                    
                    const config: {
                        numberOfImages: number;
                        outputMimeType: 'image/jpeg';
                        aspectRatio?: ImagenAspectRatio;
                    } = {
                        numberOfImages: numberOfImages,
                        outputMimeType: 'image/jpeg',
                    };
                    if (aspectRatio && aspectRatio !== 'Giữ nguyên') {
                        config.aspectRatio = mapToImagenAspectRatio(aspectRatio);
                    }

                    const response = await ai.models.generateImages({
                        model: 'imagen-4.0-generate-001',
                        prompt: prompt,
                        config: config,
                    });

                    if (response.generatedImages && response.generatedImages.length > 0) {
                        return response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
                    } else {
                        throw new Error("API did not return any images.");
                    }
                } catch (innerError) {
                    const errorMessage = innerError instanceof Error ? innerError.message : JSON.stringify(innerError);
                    console.error(`Error calling generateImages API (Attempt ${attempt}/${maxRetries}):`, errorMessage);

                    if (errorMessage.includes('API key not valid')) {
                        throw innerError;
                    }

                    const isInternalError = errorMessage.includes('"code":500') || errorMessage.includes('INTERNAL');

                    if (isInternalError && attempt < maxRetries) {
                        const delay = initialDelay * Math.pow(2, attempt - 1);
                        console.log(`Internal error detected. Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                    throw innerError;
                }
            }
             throw new Error("Image generation API call failed after all retries.");
        }

        // Case 2: Image editing (Image-to-Image / Image+Image-to-Image)
        // This mode only supports 1 image output.
        const parts: object[] = [];
        let inputImageCount = 0;

        if (imageDataUrl1) {
            const image1ToProcess = await padImageToAspectRatio(imageDataUrl1, aspectRatio);
            const { mimeType, data } = parseDataUrl(image1ToProcess);
            parts.push({ inlineData: { mimeType, data } });
            inputImageCount++;
        }
        if (imageDataUrl2) {
            const image2ToProcess = await padImageToAspectRatio(imageDataUrl2, aspectRatio);
            const { mimeType, data } = parseDataUrl(image2ToProcess);
            parts.push({ inlineData: { mimeType, data } });
            inputImageCount++;
        }

        const promptParts = [
            ...getAspectRatioPromptInstruction(aspectRatio, inputImageCount),
            prompt,
            'Thực hiện yêu cầu trong prompt để tạo ra một bức ảnh mới dựa trên (các) hình ảnh đã cho.'
        ];

        if (removeWatermark) {
            promptParts.push('Yêu cầu đặc biệt: Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
        }

        const fullPrompt = promptParts.join('\n');
        parts.push({ text: fullPrompt });

        console.log("Attempting image editing generation...");
        const response = await callGeminiWithRetry(parts);
        const resultUrl = await processGeminiResponse(response);
        return [resultUrl]; // Return as an array with one item
    } catch (error) {
        const processedError = processApiError(error);
        console.error("An unrecoverable error occurred during free image generation.", processedError);
        throw processedError;
    }
}


// --- NEW: Toy Model Creator ---

export interface ToyModelOptions {
    computerType: string;
    softwareType: string;
    boxType: string;
    background: string;
    aspectRatio: string;
    notes?: string;
    removeWatermark?: boolean;
}

export async function generateToyModelImage(imageDataUrl: string, options: ToyModelOptions): Promise<string> {
    const imageToProcess = await padImageToAspectRatio(imageDataUrl, options.aspectRatio ?? 'Giữ nguyên');
    const { mimeType, data: base64Data } = parseDataUrl(imageToProcess);

    const imagePart = {
        inlineData: { mimeType, data: base64Data },
    };

    const promptParts = [
        'Dựa trên chủ thể và chủ đề của hình ảnh được tải lên, nhiệm vụ của bạn là tạo ra một bức ảnh MỚI, siêu thực, chất lượng cao.'
    ];

    if (options.aspectRatio && options.aspectRatio !== 'Giữ nguyên') {
        promptParts.push(...getAspectRatioPromptInstruction(options.aspectRatio, 1));
    } else {
        promptParts.push('Bức ảnh phải có tỷ lệ khung hình ngang (landscape).');
    }

    promptParts.push('\nBức ảnh phải mô tả cảnh sau đây với chi tiết cực kỳ cao:');
    
    const sceneDetails = [
        '1. **Chủ thể chính:** Một mô hình đồ chơi (action figure) chất lượng cao, chi tiết của nhân vật/vật thể chính từ hình ảnh được tải lên. Mô hình đồ chơi này phải là tâm điểm chính.',
        '2. **Bối cảnh:** Mô hình đồ chơi đang đứng trên một mặt bàn làm việc.'
    ];

    // Dynamic options
    if (options.computerType && options.computerType !== 'Tự động') {
        sceneDetails.push(`3. **Máy tính:** Ở phía sau, có một ${options.computerType}.`);
    } else {
        sceneDetails.push('3. **Máy tính:** Ở phía sau, có một máy tính hiện đại (ví dụ: iMac, PC gaming, laptop).');
    }

    if (options.softwareType && options.softwareType !== 'Tự động') {
         sceneDetails.push(`Màn hình của máy tính PHẢI hiển thị một ${options.softwareType} của chính mô hình đồ chơi đó.`);
    } else {
         sceneDetails.push('Màn hình của máy tính PHẢI hiển thị một mô hình 3D wireframe hoặc render đất sét xám của chính mô hình đồ chơi đó, như thể nó đang được thiết kế trong phần mềm 3D.');
    }
    
    if (options.boxType && options.boxType !== 'Tự động') {
        sceneDetails.push(`4. **Bao bì:** Về một phía của mô hình đồ chơi, có một ${options.boxType} được thiết kế chuyên nghiệp cho món đồ chơi. Hộp phải có hình ảnh của món đồ chơi và nhãn hiệu phù hợp liên quan đến chủ thể.`);
    } else {
        sceneDetails.push('4. **Bao bì:** Về một phía của mô hình đồ chơi, có một hộp đựng bán lẻ được thiết kế chuyên nghiệp cho món đồ chơi. Hộp phải có hình ảnh của món đồ chơi và nhãn hiệu phù hợp liên quan đến chủ thể.');
    }
    
    if (options.background && options.background !== 'Tự động') {
        sceneDetails.push(`5. **Phông nền:** Phía sau bàn làm việc và máy tính, phông nền phải là một ${options.background}, được làm mờ để tạo chiều sâu.`);
    } else {
         sceneDetails.push('5. **Phông nền:** Phía sau bàn làm việc và máy tính, phông nền phải là một cảnh mờ, có không khí của môi trường từ hình ảnh gốc được tải lên (ví dụ: nếu ảnh gốc là một cầu thủ bóng đá, phông nền là một sân vận động mờ).');
    }

    promptParts.push(...sceneDetails);

    // Additional notes and requirements
    if (options.notes) {
        promptParts.push(`\n**Ghi chú bổ sung từ người dùng:** "${options.notes}".`);
    }

    if (options.removeWatermark) {
        promptParts.push('**Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
    }
    
    promptParts.push(
        '\nHình ảnh cuối cùng phải là một bức ảnh duy nhất, gắn kết, chất lượng cao, trông giống như một bức ảnh chụp sản phẩm chuyên nghiệp. Không bao gồm bất kỳ văn bản giải thích nào. Chỉ trả về hình ảnh cuối cùng.'
    );

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };

    try {
        console.log("Attempting to generate toy model image with dynamic options...", prompt);
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("An unrecoverable error occurred during toy model image generation.", processedError);
        throw processedError;
    }
}