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

export interface ToyModelOptions {
    // Concept 1: Desktop Model
    computerType: string;
    softwareType: string;
    boxType: string;
    background: string;
    // Concept 2: Keychain
    keychainMaterial: string;
    keychainStyle: string;
    accompanyingItems: string;
    deskSurface: string;
    // Concept 3: Gachapon
    capsuleColor: string;
    modelFinish: string;
    capsuleContents: string;
    displayLocation: string;
    // Concept 4: Miniature
    miniatureMaterial: string;
    baseMaterial: string;
    baseShape: string;
    lightingStyle: string;
    // Concept 5: Pokémon Model
    pokeballType: string;
    evolutionDisplay: string;
    modelStyle: string;
    // Constant Options
    aspectRatio: string;
    notes?: string;
    removeWatermark?: boolean;
}


const buildDesktopModelPrompt = (options: ToyModelOptions): string[] => {
    const promptParts = [
        'Dựa trên chủ thể và chủ đề của hình ảnh được tải lên, nhiệm vụ của bạn là tạo ra một bức ảnh MỚI, siêu thực, chất lượng cao.',
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

    return [...promptParts, ...sceneDetails];
};

const buildKeychainPrompt = (options: ToyModelOptions): string[] => {
    return [
        `Tạo một bức ảnh chụp sản phẩm chuyên nghiệp, siêu thực, cận cảnh (macro photography).`,
        ...getAspectRatioPromptInstruction(options.aspectRatio, 1),
        `**Đối tượng chính:** Một chiếc móc khoá 3D tinh xảo của chủ thể trong ảnh được cung cấp.`,
        `  - **Chất liệu:** ${options.keychainMaterial || 'Tự động chọn chất liệu phù hợp (nhựa, kim loại, men...)'}.`,
        `  - **Phong cách:** ${options.keychainStyle || 'Tự động chọn phong cách (Chibi, realistic...)'}.`,
        `**Bối cảnh:** Móc khoá được đặt một cách nghệ thuật trên một ${options.deskSurface || 'bề mặt bàn phù hợp (gỗ, đá...)'}.`,
        `  - **Vật dụng đi kèm:** ${options.accompanyingItems || 'Tự động chọn vật dụng đi kèm hoặc không có gì'}.`,
        `**Ánh sáng và không khí:** Ánh sáng dịu nhẹ, làm nổi bật các chi tiết và chất liệu của móc khoá. Phông nền được làm mờ (bokeh) để tập trung vào sản phẩm.`
    ];
};

const buildGachaponPrompt = (options: ToyModelOptions): string[] => {
    return [
        `Tạo một bức ảnh chụp sản phẩm theo phong cách Nhật Bản, siêu thực và sống động.`,
        ...getAspectRatioPromptInstruction(options.aspectRatio, 1),
        `**Đối tượng chính:** Một viên nang đồ chơi "Gachapon" bằng nhựa, đang mở hé.`,
        `  - **Màu viên nang:** ${options.capsuleColor || 'Tự động chọn màu phù hợp'}.`,
        `**Bên trong viên nang:** Một mô hình đồ chơi nhỏ (mini-figure) của chủ thể trong ảnh được cung cấp.`,
        `  - **Hoàn thiện mô hình:** ${options.modelFinish || 'Tự động chọn kiểu hoàn thiện (bóng, mờ...)'}.`,
        `  - **Nội dung:** ${options.capsuleContents || 'Tự động chọn vật phẩm đi kèm'}.`,
        `**Bối cảnh:** ${options.displayLocation || 'Tự động chọn nơi trưng bày phù hợp'}.`,
        `**Ánh sáng và không khí:** Ánh sáng rực rỡ, vui tươi, làm nổi bật màu sắc. Bối cảnh có độ sâu trường ảnh nông (shallow depth of field).`
    ];
};

const buildMiniaturePrompt = (options: ToyModelOptions): string[] => {
    return [
        `Tạo một bức ảnh studio nghệ thuật, siêu thực, chụp một tác phẩm điêu khắc tinh xảo.`,
        ...getAspectRatioPromptInstruction(options.aspectRatio, 1),
        `**Đối tượng chính:** Một bức tượng nhỏ (miniature) của chủ thể trong ảnh được cung cấp, được chế tác tỉ mỉ.`,
        `  - **Chất liệu tượng:** ${options.miniatureMaterial || 'Tự động chọn chất liệu phù hợp (resin, đồng, đá...)'}.`,
        `**Bệ trưng bày:** Bức tượng được đặt trang trọng trên một chiếc đế.`,
        `  - **Chất liệu đế:** ${options.baseMaterial || 'Tự động chọn chất liệu đế (gỗ, đá...)'}.`,
        `  - **Hình dạng đế:** ${options.baseShape || 'Tự động chọn hình dạng đế phù hợp'}.`,
        `**Bối cảnh:** Phông nền là một màu trơn hoặc gradient tối giản, không làm xao nhãng chủ thể.`,
        `**Ánh sáng:** ${options.lightingStyle || 'Tự động chọn kiểu chiếu sáng phù hợp nhất'}.`
    ];
};

const buildPokemonModelPrompt = (options: ToyModelOptions): string[] => {
    const promptParts = [
        '**Nhiệm-vụ-cốt-lõi:** Hãy tưởng tượng lại chủ thể trong hình ảnh được cung cấp như một Pokémon hoàn toàn mới. Dựa trên đó, tạo ra một bức ảnh chụp sản phẩm **siêu thực, sống động, và đậm chất điện ảnh (cinematic)**.',
        ...getAspectRatioPromptInstruction(options.aspectRatio, 1),
        '\n**BỐ CỤC CẢNH - HOÀNH TRÁNG:**',
    ];

    const sceneDetails = [];
    
    const pokeballType = options.pokeballType && options.pokeballType !== 'Tự động' ? options.pokeballType : 'Poké Ball (thường)';

    sceneDetails.push(`1. **Phông nền (Background):** Ở **phía sau** tất cả các mô hình, đặt một quả **${pokeballType} KHỔNG LỒ**, được đặt **nghiêng chéo ở một bên** của khung hình. Quả Poké Ball này đóng vai trò như một phông nền hoành tráng và phải được **làm mờ (out of focus / bokeh)** để tạo chiều sâu.`);

    sceneDetails.push('2. **Mô hình chính (Tâm điểm):** Ở **tiền cảnh**, sắc nét và nổi bật, là mô hình đồ chơi của Pokémon chính (dựa trên ảnh gốc). Toàn bộ sự chú ý phải tập trung vào các mô hình ở tiền cảnh.');
    
    const evolutionMap: { [key: string]: string } = {
        'Một dạng tiến hoá': 'Bên cạnh Pokémon chính, đặt một mô hình đồ chơi của một dạng tiến hoá (hoặc tiền tiến hoá) hợp lý.',
        'Toàn bộ chuỗi tiến hoá': 'Bên cạnh Pokémon chính, đặt các mô hình đồ chơi của TOÀN BỘ chuỗi tiến hoá (ví dụ: một dạng tiền tiến hoá và một dạng tiến hoá cao hơn).',
        'Không hiển thị': ''
    };
    if (options.evolutionDisplay && options.evolutionDisplay !== 'Tự động' && evolutionMap[options.evolutionDisplay]) {
        if (evolutionMap[options.evolutionDisplay]) {
            sceneDetails.push(`3. **Các mô hình phụ:** ${evolutionMap[options.evolutionDisplay]} Các mô hình này cũng phải ở tiền cảnh, sắc nét, và được sắp xếp một cách nghệ thuật xung quanh mô hình chính.`);
        }
    } else {
        sceneDetails.push('3. **Các mô hình phụ:** Bên cạnh Pokémon chính, đặt các mô hình đồ chơi của TOÀN BỘ chuỗi tiến hoá (ví dụ: một dạng tiền tiến hoá và một dạng tiến hoá cao hơn). Các mô hình này cũng phải ở tiền cảnh, sắc nét, và được sắp xếp một cách nghệ thuật xung quanh mô hình chính.');
    }

    if (options.modelStyle && options.modelStyle !== 'Tự động') {
        sceneDetails.push(`4. **Phong cách mô hình:** Tất cả các mô hình đồ chơi phải theo phong cách **${options.modelStyle}**.`);
    } else {
        sceneDetails.push('4. **Phong cách mô hình:** Tất cả các mô hình đồ chơi phải có chất lượng cao, chi tiết, theo phong cách chân thực (realistic).');
    }

    sceneDetails.push('5. **Bối cảnh/Nền phụ:** Ngoài Poké Ball khổng lồ, môi trường xung quanh phải được **suy ra từ các đặc điểm hình ảnh của sinh vật gốc** (ví dụ: sinh vật có màu sắc rực lửa thì có thêm các yếu tố núi lửa; sinh vật trông giống nước thì có thêm hiệu ứng nước bắn tóe). Yếu tố này nên tinh tế và không lấn át các mô hình.');
    
    promptParts.push(...sceneDetails);
    
    promptParts.push(
        '\n**YÊU CẦU CHẤT LƯỢNG:**',
        '- Phải có sự tương phản rõ rệt giữa các mô hình sắc nét ở tiền cảnh và Poké Ball khổng lồ mờ ảo ở hậu cảnh.',
        '- Ánh sáng phải kịch tính, chiếu sáng các mô hình từ phía trước và hai bên để làm nổi bật chúng khỏi nền.',
        '- Kết cấu của các mô hình và vật phẩm phải chân thực (nhựa, kim loại, v.v.).'
    );
    
    return promptParts;
};


export async function generateToyModelImage(
    imageDataUrl: string, 
    concept: string, 
    options: ToyModelOptions
): Promise<string> {
    const imageToProcess = await padImageToAspectRatio(imageDataUrl, options.aspectRatio ?? 'Giữ nguyên');
    const { mimeType, data: base64Data } = parseDataUrl(imageToProcess);
    const imagePart = { inlineData: { mimeType, data: base64Data } };

    let promptParts: string[];

    switch (concept) {
        case 'desktop_model':
            promptParts = buildDesktopModelPrompt(options);
            break;
        case 'keychain':
            promptParts = buildKeychainPrompt(options);
            break;
        case 'gachapon':
            promptParts = buildGachaponPrompt(options);
            break;
        case 'miniature':
            promptParts = buildMiniaturePrompt(options);
            break;
        case 'pokemon_model':
            promptParts = buildPokemonModelPrompt(options);
            break;
        default:
            console.warn(`Unknown concept: ${concept}. Falling back to desktop_model.`);
            promptParts = buildDesktopModelPrompt(options);
            break;
    }

    if (options.notes) {
        promptParts.push(`\n**Ghi chú bổ sung từ người dùng:** "${options.notes}".`);
    }

    if (options.removeWatermark) {
        promptParts.push('**Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
    }
    
    promptParts.push(
        '\nHình ảnh cuối cùng phải là một bức ảnh duy nhất, gắn kết, chất lượng cao. Không bao gồm bất kỳ văn bản giải thích nào. Chỉ trả về hình ảnh cuối cùng.'
    );

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };

    try {
        console.log(`Attempting to generate toy model image for concept [${concept}] with prompt...`, prompt);
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during toy model image generation:", processedError);
        throw processedError;
    }
}