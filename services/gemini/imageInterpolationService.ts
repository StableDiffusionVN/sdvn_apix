/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";
import { 
    processApiError, 
    parseDataUrl,
} from './baseService';

/**
 * Analyzes a pair of images to generate a descriptive prompt for the transformation.
 * @param inputImageDataUrl Data URL of the "before" image.
 * @param outputImageDataUrl Data URL of the "after" image.
 * @returns A promise resolving to the generated text prompt.
 */
export async function analyzeImagePairForPrompt(inputImageDataUrl: string, outputImageDataUrl: string): Promise<{ mainPrompt: string; suggestions: string; }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { mimeType: inputMime, data: inputData } = parseDataUrl(inputImageDataUrl);
    const { mimeType: outputMime, data: outputData } = parseDataUrl(outputImageDataUrl);

    const inputImagePart = { inlineData: { mimeType: inputMime, data: inputData } };
    const outputImagePart = { inlineData: { mimeType: outputMime, data: outputData } };

    const prompt = `
        Bạn là một chuyên gia phân tích hệ thống biến đổi hình ảnh. Nhiệm vụ của bạn là phân tích hai hình ảnh, 'Trước' (Ảnh 1) và 'Sau' (Ảnh 2), và tạo ra một câu lệnh (prompt) **TỔNG QUÁT** và **CÓ HỆ THỐNG** bằng tiếng Việt. Prompt này phải nắm bắt được **bản chất của sự biến đổi** để có thể áp dụng cho các hình ảnh khác.

        **TƯ DUY CỐT LÕI:**
        - **Không mô tả chi tiết:** Tránh mô tả các chi tiết cụ thể của Ảnh 2. Thay vào đó, hãy xác định các **quy tắc** hoặc **khái niệm** biến đổi.
        - **Tập trung vào "CÁCH LÀM" chứ không phải "KẾT QUẢ":** Prompt của bạn là một chỉ dẫn về *cách* biến đổi, không phải là một bản mô tả của hình ảnh kết quả.
        - **Tính ứng dụng cao:** Prompt phải đủ tổng quát để khi áp dụng vào một ảnh tham chiếu khác, nó sẽ tạo ra một sự thay đổi tương tự về mặt phong cách hoặc khái niệm.

        **CÁC KHÍA CẠNH CẦN PHÂN TÍCH (dưới góc độ hệ thống):**
        1.  **Biến đổi Phong cách (Style Transformation):** Phong cách nghệ thuật tổng thể đã thay đổi như thế nào? (ví dụ: "chuyển thành tranh màu nước", "áp dụng phong cách anime thập niên 90", "biến đổi thành ảnh chụp phim cổ điển").
        2.  **Biến đổi Màu sắc & Ánh sáng (Color & Light Transformation):** Quy tắc chung về màu sắc và ánh sáng là gì? (ví dụ: "thay đổi bảng màu thành tông màu lạnh và tương phản cao", "chuyển thời gian trong ngày sang hoàng hôn với ánh sáng vàng ấm").
        3.  **Biến đổi Nội dung (Content Transformation):** Có quy tắc chung nào về việc thêm/bớt/thay đổi đối tượng không? (ví dụ: "thêm các yếu tố huyền ảo như sương mù và ánh sáng lung linh", "thay thế bầu trời bằng một dải ngân hà").
        4.  **Biến đổi Không khí (Atmosphere Transformation):** Cảm xúc hoặc không khí chung đã thay đổi như thế nào? (ví dụ: "tạo ra một không khí u tối và bí ẩn", "làm cho cảnh vật trở nên vui tươi và rực rỡ").
        
        **ĐẦU RA (JSON):**
        - Bắt buộc trả về một đối tượng JSON hợp lệ.
        - **mainPrompt**: Câu lệnh TỔNG QUÁT bằng tiếng Việt, nắm bắt bản chất của sự biến đổi đã phân tích.
        - **suggestions**: Một chuỗi văn bản chứa các gợi ý sáng tạo để chỉnh sửa hoặc mở rộng 'mainPrompt'. Mỗi gợi ý bắt đầu bằng một gạch đầu dòng và dấu cách "- ". Cung cấp ít nhất 3 gợi ý về các khía cạnh khác nhau như:
            - Thay đổi bối cảnh chi tiết.
            - Điều chỉnh bảng màu hoặc ánh sáng.
            - Thêm thắt các yếu tố nghệ thuật hoặc cảm xúc (mood).
        - Ví dụ về chuỗi suggestions: "- Thêm vào các chi tiết máy móc và đèn neon rực rỡ\\n- Sử dụng tông màu xanh dương và tím làm chủ đạo\\n- Tạo không khí u tối, mưa bụi của một đêm trong tương lai"

        Bây giờ, hãy phân tích các hình ảnh được cung cấp và tạo ra đối tượng JSON theo yêu cầu.
    `;
    const textPart = { text: prompt };
    
    try {
        console.log("Attempting to analyze image pair for prompt...");
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, inputImagePart, outputImagePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        mainPrompt: { type: Type.STRING, description: "Câu lệnh tổng quát mô tả sự biến đổi." },
                        suggestions: { type: Type.STRING, description: "Các gợi ý để mở rộng prompt, mỗi gợi ý trên một dòng và bắt đầu bằng '- '." },
                    },
                    required: ["mainPrompt", "suggestions"],
                }
            }
        });
        
        const jsonText = response.text.trim();
        if (jsonText) {
            return JSON.parse(jsonText);
        }

        console.error("API did not return text. Response:", response);
        throw new Error("The AI model did not return a valid JSON response.");

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during prompt generation from image pair:", processedError);
        throw processedError;
    }
}

/**
 * Merges a base prompt with user's notes into a new, cohesive prompt.
 * @param basePrompt The initial prompt generated from image analysis.
 * @param userNotes The user's additional modification requests.
 * @returns A promise that resolves to the new, merged prompt.
 */
export async function interpolatePrompts(basePrompt: string, userNotes: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
        Bạn là một trợ lý AI chuyên tinh chỉnh các câu lệnh tạo ảnh.
        Nhiệm vụ của bạn là hợp nhất "Yêu cầu Chỉnh sửa của Người dùng" vào "Prompt Gốc" để tạo ra một prompt mới, mạch lạc bằng tiếng Việt.

        - **Prompt Gốc (mô tả một sự biến đổi cơ bản):** "${basePrompt}"
        - **Yêu cầu Chỉnh sửa của Người dùng (CÓ ƯU TIÊN CAO HƠN):** "${userNotes}"

        **Quy tắc quan trọng:**
        1.  **Ưu tiên yêu cầu của người dùng:** Prompt mới phải ưu tiên thực hiện yêu cầu của người dùng. Nếu có sự mâu thuẫn, yêu cầu của người dùng sẽ ghi đè lên các phần tương ứng trong Prompt Gốc.
        2.  **Giữ lại ý chính:** Giữ lại bản chất của sự biến đổi từ Prompt Gốc, trừ khi nó bị thay đổi trực tiếp bởi yêu cầu của người dùng.
        3.  **Tích hợp hợp lý:** Tích hợp các thay đổi một cách tự nhiên vào prompt, tạo thành một câu lệnh hoàn chỉnh.

        **Ví dụ:**
        - **Prompt Gốc:** "biến ảnh thành tranh màu nước"
        - **Yêu cầu người dùng:** "sử dụng tông màu chủ đạo là xanh dương và vàng"
        - **Prompt Mới:** "biến ảnh thành tranh màu nước, sử dụng bảng màu chủ đạo là xanh dương và vàng"

        - **Prompt Gốc:** "thêm một chiếc mũ phù thủy nhỏ màu đỏ cho con mèo"
        - **Yêu cầu người dùng:** "thay mũ bằng vương miện và làm cho mắt mèo phát sáng"
        - **Prompt Mới:** "đội một chiếc vương miện cho con mèo và làm cho mắt nó phát sáng"

        Bây giờ, hãy tạo prompt mới dựa trên các đầu vào được cung cấp. Chỉ xuất ra văn bản prompt cuối cùng bằng tiếng Việt. Không thêm bất kỳ cụm từ giới thiệu nào.
    `;

    try {
        console.log("Attempting to interpolate prompts with prioritization...");
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text;
        if (text) {
            return text.trim();
        }
        
        console.error("API did not return text for prompt interpolation. Response:", response);
        throw new Error("The AI model did not return a valid text prompt for interpolation.");

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during prompt interpolation:", processedError);
        throw processedError;
    }
}

/**
 * Adapts a base prompt to be more contextually relevant to a reference image.
 * @param imageDataUrl The data URL of the reference image.
 * @param basePrompt The initial prompt describing a transformation.
 * @returns A promise that resolves to the new, contextually-aware prompt.
 */
export async function adaptPromptToContext(imageDataUrl: string, basePrompt: string): Promise<string> {
    const { mimeType, data: base64Data } = parseDataUrl(imageDataUrl);
    const imagePart = { inlineData: { mimeType, data: base64Data } };

    const promptText = `Nhiệm vụ của bạn là một chuyên gia tinh chỉnh prompt cho AI tạo ảnh. Tôi sẽ cung cấp cho bạn: 1. Một "Ảnh Tham Chiếu". 2. Một "Prompt Gốc" mô tả một sự biến đổi. Yêu cầu của bạn là viết lại "Prompt Gốc" thành một "Prompt Mới" sao cho phù hợp hơn với bối cảnh, chủ thể, và phong cách của "Ảnh Tham Chiếu". Sự biến đổi cốt lõi phải được giữ nguyên. Ví dụ: - Ảnh Tham Chiếu: ảnh một con chó thật. - Prompt Gốc: "biến thành nhân vật hoạt hình" - Prompt Mới: "biến con chó trong ảnh thành nhân vật hoạt hình theo phong cách Pixar". - Ảnh Tham Chiếu: ảnh một toà nhà cổ kính. - Prompt Gốc: "thêm các chi tiết cyberpunk" - Prompt Mới: "thêm các chi tiết máy móc và đèn neon theo phong cách cyberpunk vào toà nhà cổ kính, giữ lại kiến trúc gốc". - Ảnh Tham Chiếu: một bức tranh phong cảnh màu nước. - Prompt Gốc: "thay đổi bầu trời thành dải ngân hà" - Prompt Mới: "vẽ lại bầu trời thành một dải ngân hà rực rỡ theo phong cách màu nước, hoà hợp với phần còn lại của bức tranh". Prompt Gốc hiện tại là: "${basePrompt}". Hãy phân tích Ảnh Tham Chiếu và tạo ra Prompt Mới bằng tiếng Việt. Chỉ trả về nội dung của prompt, không có các cụm từ giới thiệu như "Đây là prompt mới:".`;
    const textPart = { text: promptText };
    
    try {
        console.log("Attempting to adapt prompt to image context...");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        const text = response.text;
        if (text) {
            return text.trim();
        }

        console.warn("API did not return text for context adaptation. Falling back to base prompt. Response:", response);
        return basePrompt;

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during prompt context adaptation. Falling back to base prompt.", processedError);
        return basePrompt;
    }
}
