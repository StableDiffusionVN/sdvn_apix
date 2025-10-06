/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import ai from './client';
import {
    processApiError,
    parseDataUrl,
    callGeminiWithRetry,
    processGeminiResponse
} from './baseService';

interface BeautyOptions {
    notes: string;
    removeWatermark: boolean;
    aspectRatio: string;
}

async function analyzeBeautyConceptImage(styleImageDataUrl: string): Promise<string> {
    const { mimeType, data } = parseDataUrl(styleImageDataUrl);
    const imagePart = { inlineData: { mimeType, data } };

    const prompt = `Phân tích hình ảnh này và mô tả chi tiết concept beauty của nó. Tập trung vào các yếu tố sau:
1.  **Bố cục & Tư thế:** Chụp cận, bán thân hay toàn thân? Người mẫu tạo dáng như thế nào?
2.  **Cảm xúc & Tâm trạng:** Kịch tính, thanh tao, vui vẻ, mạnh mẽ?
3.  **Phong cách ánh sáng:** Softbox, ánh sáng tự nhiên, bóng đổ gay gắt, ánh sáng ven (rim light)?
4.  **Màu sắc & Chỉnh màu:** Tông màu ấm, lạnh, đơn sắc, bão hòa cao?
5.  **Trang điểm & Tạo kiểu:** Tự nhiên, quyến rũ, avant-garde?
6.  **Phong cách nhiếp ảnh tổng thể:** Điện ảnh, biên tập thời trang, studio sạch sẽ?
Chỉ trả lời bằng một đoạn văn mô tả liền mạch, súc tích.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, {text: prompt}] },
        });

        const text = response.text;
        if (!text) {
             throw new Error("AI không thể phân tích được phong cách của ảnh.");
        }
        return text.trim();
    } catch (error) {
        console.error("Error in analyzeBeautyConceptImage:", error);
        throw new Error("Lỗi khi phân tích ảnh concept.");
    }
}

export async function generateBeautyImage(
    imageDataUrl: string,
    styleReferenceImageDataUrl: string | null,
    options: BeautyOptions
): Promise<string> {
    const { mimeType, data: base64Data } = parseDataUrl(imageDataUrl);
    const portraitImagePart = { inlineData: { mimeType, data: base64Data } };

    const requestParts: object[] = [portraitImagePart];
    const promptParts: string[] = [];

    if (options.aspectRatio && options.aspectRatio !== 'Giữ nguyên') {
        promptParts.push(`**YÊU CẦU BỐ CỤC:** Bức ảnh kết quả BẮT BUỘC phải có tỷ lệ khung hình chính xác là ${options.aspectRatio}.`);
    }

    promptParts.push(
        'Tạo một bức ảnh chân dung beauty chuyên nghiệp, chất lượng cao của người trong ảnh gốc.',
        '**YÊU CẦU QUAN TRỌNG NHẤT:** Phải giữ lại chính xác tuyệt đối 100% các đặc điểm trên khuôn mặt, đường nét, và biểu cảm của người trong ảnh gốc. Không được thay đổi hay chỉnh sửa khuôn mặt.'
    );

    if (styleReferenceImageDataUrl) {
        const styleDescription = await analyzeBeautyConceptImage(styleReferenceImageDataUrl);
        promptParts.push(
            'Áp dụng concept, phong cách và cảm xúc được mô tả chi tiết sau đây:',
            `--- MÔ TẢ CONCEPT ---`,
            styleDescription,
            `--- KẾT THÚC MÔ TẢ ---`
        );
    } else {
        promptParts.push('Hãy tự sáng tạo một concept beauty phù hợp (ví dụ: studio, tự nhiên, thời trang cao cấp) để làm nổi bật người trong ảnh.');
    }

    if (options.notes) {
        promptParts.push(`- **Ghi chú bổ sung của người dùng (Ưu tiên cao):** "${options.notes}". Tích hợp yêu cầu này trong khi vẫn tuân thủ mô tả concept ở trên.`);
    }

    if (options.removeWatermark) {
        promptParts.push('- **Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
    }

    promptParts.push(
        'Bức ảnh phải có chất lượng như ảnh tạp chí, với ánh sáng chuyên nghiệp, trang điểm hoàn hảo, và làn da mịn màng. Tránh tạo ra ảnh theo phong cách vẽ hay hoạt hình.'
    );

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };
    requestParts.push(textPart);

    const config: any = {};
    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9', '2:3', '4:5', '3:2', '5:4', '21:9'];
    if (options.aspectRatio && options.aspectRatio !== 'Giữ nguyên' && validRatios.includes(options.aspectRatio)) {
        config.imageConfig = { aspectRatio: options.aspectRatio };
    }

    try {
        const response = await callGeminiWithRetry(requestParts, config);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during beauty image generation:", processedError);
        throw processedError;
    }
}
