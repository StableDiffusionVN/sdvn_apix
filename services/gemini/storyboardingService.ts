/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Type } from "@google/genai";
import ai from './client';
import { processApiError, parseDataUrl } from './baseService';

// --- TYPES ---
interface Scene {
    scene: number;
    description: string;
    transition?: string;
}

// NEW: Represents the initial high-level summary of the script
export interface ScriptSummary {
    title: string;
    characters: string;
    setting: string;
    style: string;
    duration: string;
    content: string;
    notes?: string;
}

// Represents the full scenario with detailed scenes for visualization
export interface FullScenario {
    title: string;
    logline: string;
    scenes: Scene[];
}

interface StoryOptions {
    style: string;
    duration: string;
    aspectRatio: string;
    notes?: string;
}

// --- SCHEMAS ---
const SCRIPT_SUMMARY_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "Tiêu đề ngắn gọn cho câu chuyện." },
        characters: { type: Type.STRING, description: "Mô tả ngắn gọn các nhân vật chính." },
        setting: { type: Type.STRING, description: "Mô tả bối cảnh chính của câu chuyện." },
        style: { type: Type.STRING, description: "Mô tả phong cách hình ảnh (ví dụ: hoạt hình Ghibli, phim noir, cyberpunk)." },
        duration: { type: Type.STRING, description: "Thời lượng ước tính của câu chuyện (ví dụ: 1 phút, 30 giây)." },
        content: { type: Type.STRING, description: "Tóm tắt ngắn gọn nội dung, cốt truyện chính trong 1-2 câu." }
    },
    required: ["title", "characters", "setting", "style", "duration", "content"]
};

const FULL_SCENARIO_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        logline: { type: Type.STRING },
        scenes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    scene: { type: Type.INTEGER },
                    description: { type: Type.STRING },
                    transition: { type: Type.STRING, description: "Description of the transition to the NEXT scene. This should be empty for the very last scene." }
                },
                required: ["scene", "description"]
            }
        }
    },
    required: ["title", "logline", "scenes"]
};

const VIDEO_PROMPT_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        start_scene_summary: { type: Type.STRING, description: "A very brief summary of the starting visual." },
        transition_description: { type: Type.STRING, description: "Detailed description of the transition, including actions, effects, and camera work." },
        end_scene_summary: { type: Type.STRING, description: "A very brief summary of the ending visual." },
        camera_movement: { type: Type.STRING, description: "Specific camera movement during the transition (e.g., 'Dolly zoom in', 'Pan left to right')." },
        visual_effects: { type: Type.STRING, description: "Any visual effects to apply (e.g., 'Cross-dissolve', 'Light leaks')." },
        duration_seconds: { type: Type.NUMBER, description: "Estimated duration of the clip in seconds (e.g., 4)." }
    },
    required: ["start_scene_summary", "transition_description", "end_scene_summary", "camera_movement", "visual_effects", "duration_seconds"]
};


// --- PROMPT HELPERS ---
const getScriptSummaryBasePrompt = (language: 'vi' | 'en' | 'zh'): { P1: string, P2: string } => {
    if (language === 'zh') {
        return {
            P1: "你是一名专业的人工智能编剧。你的任务是分析提供的输入（一个想法、文本或音频转录），并生成一个简短的剧本摘要。",
            P2: "摘要必须包括以下字段：标题、角色、背景、风格、时长和内容（情节摘要）。每个字段都应简明扼要。以JSON格式回应。"
        };
    }
    if (language === 'vi') {
        return {
            P1: "Bạn là một AI biên kịch chuyên nghiệp. Nhiệm vụ của bạn là phân tích thông tin đầu vào (ý tưởng, văn bản, hoặc bản ghi âm) và tạo ra một bản tóm tắt kịch bản ngắn.",
            P2: "Bản tóm tắt phải bao gồm các mục sau: Tiêu đề, Nhân vật, Bối cảnh, Phong cách, Thời lượng, và Nội dung (tóm tắt cốt truyện). Mỗi mục phải ngắn gọn và súc tích. Trả lời bằng định dạng JSON."
        };
    }
    return {
        P1: "You are a professional AI scriptwriter. Your task is to analyze the provided input (an idea, text, or audio transcript) and generate a short script summary.",
        P2: "The summary must include the following fields: Title, Characters, Setting, Style, Duration, and Content (plot summary). Each field should be brief and concise. Respond in JSON format."
    };
};

const generateImageDescriptions = async (referenceImages: { mimeType: string; data: string }[]): Promise<string> => {
    if (referenceImages.length === 0) return "";

    const imageParts = referenceImages.map(img => ({ inlineData: img }));
    const prompt = "Briefly describe the key visual elements of each image provided, focusing on character appearance, setting, and overall mood. Combine the descriptions into a single paragraph.";
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [...imageParts, { text: prompt }] },
        });
        return `\n\nVisual Reference Context: ${response.text.trim()}`;
    } catch (error) {
        console.warn("Could not generate descriptions for reference images:", error);
        return "";
    }
};

// --- API FUNCTIONS ---
const executeScriptSummaryGeneration = async (prompt: string, parts: any[] = []): Promise<ScriptSummary> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [...parts, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: SCRIPT_SUMMARY_SCHEMA
        }
    });

    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    
    if (parsed.content) {
        return parsed;
    }
    throw new Error("AI returned an invalid script summary structure.");
};

export async function createScriptSummaryFromIdea(idea: string, referenceImagesData: { mimeType: string; data: string }[], options: StoryOptions, language: 'vi' | 'en' | 'zh'): Promise<ScriptSummary> {
    try {
        const { P1, P2 } = getScriptSummaryBasePrompt(language);
        const refImageDescriptions = await generateImageDescriptions(referenceImagesData);
        const notesInstruction = options.notes ? `\n- Additional User Notes (High Priority): "${options.notes}"` : '';
        const finalStyle = options.style && options.style.trim() !== '' ? options.style : (language === 'vi' ? 'Tự động' : (language === 'zh' ? '自动' : 'Auto'));
        const prompt = `${P1}\nInput is a story idea: "${idea}"${refImageDescriptions}\n\n${P2}\n\n**Constraints:**\n- Style: ${finalStyle}\n- Duration: ${options.duration}\n- Aspect Ratio: ${options.aspectRatio}${notesInstruction}\nMake sure the generated summary strictly follows these constraints. If a value is "Tự động" or "Auto" or "自动", you have creative freedom for that field.`;
        const imageParts = referenceImagesData.map(img => ({ inlineData: img }));
        const summary = await executeScriptSummaryGeneration(prompt, imageParts);
        summary.notes = options.notes;
        return summary;
    } catch (error) {
        console.error("Error creating script summary from idea:", error);
        throw processApiError(error);
    }
}

export async function createScriptSummaryFromText(script: string, referenceImagesData: { mimeType: string; data: string }[], options: StoryOptions, language: 'vi' | 'en' | 'zh'): Promise<ScriptSummary> {
    try {
        const { P1, P2 } = getScriptSummaryBasePrompt(language);
        const refImageDescriptions = await generateImageDescriptions(referenceImagesData);
        const notesInstruction = options.notes ? `\n- Additional User Notes (High Priority): "${options.notes}"` : '';
        const finalStyle = options.style && options.style.trim() !== '' ? options.style : (language === 'vi' ? 'Tự động' : (language === 'zh' ? '自动' : 'Auto'));
        const prompt = `${P1}\nInput is a full script. Analyze it and create a summary.\n\n\`\`\`\n${script}\n\`\`\`${refImageDescriptions}\n\n${P2}\n\n**Constraints:**\n- Style: ${finalStyle}\n- Duration: ${options.duration}\n- Aspect Ratio: ${options.aspectRatio}${notesInstruction}\nMake sure the generated summary strictly follows these constraints. If a value is "Tự động" or "Auto" or "自动", you have creative freedom for that field.`;
        const imageParts = referenceImagesData.map(img => ({ inlineData: img }));
        const summary = await executeScriptSummaryGeneration(prompt, imageParts);
        summary.notes = options.notes;
        return summary;
    } catch (error) {
        console.error("Error creating script summary from text:", error);
        throw processApiError(error);
    }
}

export async function createScriptSummaryFromAudio(audio: { mimeType: string; data: string }, referenceImagesData: { mimeType: string; data: string }[], options: StoryOptions, language: 'vi' | 'en' | 'zh'): Promise<ScriptSummary> {
    try {
        const { P1, P2 } = getScriptSummaryBasePrompt(language);
        const refImageDescriptions = await generateImageDescriptions(referenceImagesData);
        const notesInstruction = options.notes ? `\n- Additional User Notes (High Priority): "${options.notes}"` : '';
        const finalStyle = options.style && options.style.trim() !== '' ? options.style : (language === 'vi' ? 'Tự động' : (language === 'zh' ? '自动' : 'Auto'));
        const prompt = `${P1}\nInput is an audio file. First, transcribe the audio. Then, based on the transcript, create the script summary.${refImageDescriptions}\n\n${P2}\n\n**Constraints:**\n- Style: ${finalStyle}\n- Duration: ${options.duration}\n- Aspect Ratio: ${options.aspectRatio}${notesInstruction}\nMake sure the generated summary strictly follows these constraints. If a value is "Tự động" or "Auto" or "自动", you have creative freedom for that field.`;
        
        const audioPart = { inlineData: audio };
        const imageParts = referenceImagesData.map(img => ({ inlineData: img }));
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, ...imageParts, { text: prompt }] },
             config: {
                responseMimeType: "application/json",
                responseSchema: SCRIPT_SUMMARY_SCHEMA
            }
        });
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText) as ScriptSummary;
        if (parsed.content) {
            parsed.notes = options.notes;
            return parsed;
        }
        throw new Error("AI returned an invalid script summary structure from audio.");
    } catch (error) {
        console.error("Error creating script summary from audio:", error);
        throw processApiError(error);
    }
}

export async function developScenesFromSummary(summary: ScriptSummary, language: 'vi' | 'en' | 'zh'): Promise<FullScenario> {
    const notesInstruction_vi = summary.notes ? `\n\n**YÊU CẦU BỔ SUNG QUAN TRỌNG:** Luôn tuân thủ các ghi chú sau đây khi mô tả từng cảnh: "${summary.notes}"` : '';
    const prompt_vi = `Bạn là một AI đạo diễn hình ảnh. Dựa trên bản tóm tắt kịch bản sau, hãy chia câu chuyện thành một số lượng cảnh chính phù hợp (tối thiểu 3, không giới hạn tối đa). Đối với mỗi cảnh, hãy cung cấp hai điều: 1. Một 'description' chi tiết, giàu hình ảnh cho một bức ảnh tĩnh đại diện cho khoảnh khắc quan trọng của cảnh đó. 2. Một 'transition' mô tả chuyển động camera, hành động của nhân vật, hoặc hiệu ứng dẫn đến cảnh TIẾP THEO (để trống cho cảnh cuối cùng).${notesInstruction_vi}
    
    Tóm tắt kịch bản:
    \`\`\`json
    ${JSON.stringify(summary, null, 2)}
    \`\`\`
    
    Trả lời bằng định dạng JSON với cấu trúc { title: string, logline: string, scenes: [{ scene: number, description: string, transition: string }] }. Giữ nguyên title và sử dụng 'content' làm 'logline'.`;
    
    const notesInstruction_en = summary.notes ? `\n\n**IMPORTANT ADDITIONAL REQUIREMENT:** Always adhere to the following notes when describing each scene: "${summary.notes}"` : '';
    const prompt_en = `You are an AI director of photography. Based on the following script summary, break the story down into an appropriate number of key scenes (minimum 3, no maximum limit). For each scene, provide two things: 1. A detailed, visual 'description' for a static image representing the key moment of that scene. 2. A 'transition' description explaining the camera movement, character action, or effect that leads into the *next* scene (leave empty for the last scene).${notesInstruction_en}

    Script Summary:
    \`\`\`json
    ${JSON.stringify(summary, null, 2)}
    \`\`\`
    
    Respond in JSON format with the structure { title: string, logline: string, scenes: [{ scene: number, description: string, transition: string }] }. Keep the original title and use the 'content' field as the 'logline'.`;

    const notesInstruction_zh = summary.notes ? `\n\n**重要附加要求：** 在描述每个场景时，请始终遵守以下说明：“${summary.notes}”` : '';
    const prompt_zh = `你是一位人工智能摄影指导。根据以下剧本摘要，将故事分解为适当数量的关键场景（最少3个，无上限）。对于每个场景，提供两件事：1. 一个详细、视觉化的“description”，用于代表该场景关键时刻的静态图像。2. 一个“transition”描述，解释引向下个场景的摄像机运动、角色动作或效果（最后一个场景留空）。${notesInstruction_zh}\n\n剧本摘要：\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\`\n\n以JSON格式回应，结构为 { title: string, logline: string, scenes: [{ scene: number, description: string, transition: string }] }。保留原始标题，并使用“content”字段作为“logline”。`;
    
    let prompt: string;
    switch (language) {
        case 'zh': prompt = prompt_zh; break;
        case 'en': prompt = prompt_en; break;
        case 'vi': default: prompt = prompt_vi; break;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: FULL_SCENARIO_SCHEMA
            }
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        
        if (parsed.scenes && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
            return parsed;
        }
        throw new Error("AI failed to develop scenes from the summary.");

    } catch (error) {
        console.error("Error developing scenes:", error);
        throw processApiError(error);
    }
}

export async function refineSceneDescription(
    originalDescription: string,
    modificationRequest: string,
    language: 'vi' | 'en' | 'zh'
): Promise<string> {
    const prompt_vi = `Bạn là một AI biên kịch chuyên nghiệp. Nhiệm vụ của bạn là viết lại một "Prompt Gốc" dựa trên "Yêu cầu Chỉnh sửa" của người dùng.
    
    **Prompt Gốc:**
    \`\`\`
    ${originalDescription}
    \`\`\`

    **Yêu cầu Chỉnh sửa:**
    "${modificationRequest}"

    **Yêu cầu:**
    1.  Tạo ra một prompt mới, mạch lạc bằng tiếng Việt, kết hợp yêu cầu chỉnh sửa vào prompt gốc.
    2.  Prompt mới phải giữ lại ý tưởng cốt lõi của prompt gốc nhưng được cải tiến theo yêu cầu.
    3.  Chỉ xuất ra văn bản prompt cuối cùng, không có lời dẫn hay định dạng markdown.
    `;

    const prompt_en = `You are a professional AI scriptwriter. Your task is to rewrite an "Original Prompt" based on a user's "Modification Request".

    **Original Prompt:**
    \`\`\`
    ${originalDescription}
    \`\`\`

    **Modification Request:**
    "${modificationRequest}"

    **Requirements:**
    1.  Create a new, coherent prompt in English that incorporates the modification request into the original prompt.
    2.  The new prompt should retain the core idea of the original but be enhanced as requested.
    3.  Output only the final prompt text, without any introductory phrases or markdown formatting.
    `;

    const prompt_zh = `你是一位专业的人工智能编剧。你的任务是根据用户的“修改请求”重写一个“原始提示”。\n\n**原始提示：**\n\`\`\`\n${originalDescription}\n\`\`\`\n\n**修改请求：**\n"${modificationRequest}"\n\n**要求：**\n1. 创建一个新的、连贯的中文提示，将修改请求融入原始提示中。\n2. 新提示应保留原始提示的核心思想，但根据要求进行增强。\n3. 只输出最终的提示文本，不带任何介绍性短语或markdown格式。`;

    let prompt: string;
    switch (language) {
        case 'zh': prompt = prompt_zh; break;
        case 'en': prompt = prompt_en; break;
        case 'vi': default: prompt = prompt_vi; break;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text.trim();
        if (!text) {
            throw new Error("AI did not return a refined description.");
        }
        return text;

    } catch (error) {
        console.error("Error refining scene description:", error);
        throw processApiError(error);
    }
}

export async function refineSceneTransition(
    originalTransition: string,
    modificationRequest: string,
    language: 'vi' | 'en' | 'zh'
): Promise<string> {
    const prompt_vi = `Bạn là một AI biên kịch chuyên nghiệp. Nhiệm vụ của bạn là viết lại một đoạn văn mô tả "Chuyển cảnh gốc" dựa trên "Yêu cầu Chỉnh sửa" của người dùng.
    
    **Chuyển cảnh gốc:**
    \`\`\`
    ${originalTransition}
    \`\`\`

    **Yêu cầu Chỉnh sửa:**
    "${modificationRequest}"

    **Yêu cầu:**
    1.  Tạo ra một mô tả chuyển cảnh mới, mạch lạc bằng tiếng Việt, kết hợp yêu cầu chỉnh sửa vào mô tả gốc.
    2.  Mô tả mới phải giữ lại ý tưởng cốt lõi của chuyển cảnh gốc nhưng được cải tiến theo yêu cầu.
    3.  Chỉ xuất ra văn bản mô tả cuối cùng, không có lời dẫn hay định dạng markdown.
    `;

    const prompt_en = `You are a professional AI scriptwriter. Your task is to rewrite a "Transition Description" based on a user's "Modification Request".

    **Original Transition:**
    \`\`\`
    ${originalTransition}
    \`\`\`

    **Modification Request:**
    "${modificationRequest}"

    **Requirements:**
    1.  Create a new, coherent transition description in English that incorporates the modification request into the original.
    2.  The new description should retain the core idea of the original transition but be enhanced as requested.
    3.  Output only the final description text, without any introductory phrases or markdown formatting.
    `;

    const prompt_zh = `你是一位专业的人工智能编剧。你的任务是根据用户的“修改请求”重写一个“原始转场描述”。\n\n**原始转场描述：**\n\`\`\`\n${originalTransition}\n\`\`\`\n\n**修改请求：**\n"${modificationRequest}"\n\n**要求：**\n1. 创建一个新的、连贯的中文转场描述，将修改请求融入原始描述中。\n2. 新描述应保留原始转场的核心思想，但根据要求进行增强。\n3. 只输出最终的描述文本，不带任何介绍性短语或markdown格式。`;
    
    let prompt: string;
    switch (language) {
        case 'zh': prompt = prompt_zh; break;
        case 'en': prompt = prompt_en; break;
        case 'vi': default: prompt = prompt_vi; break;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text.trim();
        if (!text) {
            throw new Error("AI did not return a refined transition.");
        }
        return text;

    } catch (error) {
        console.error("Error refining scene transition:", error);
        throw processApiError(error);
    }
}

export async function generateVideoPromptFromScenes(
    promptBefore: string,
    promptTransition: string,
    promptAfter: string,
    language: 'vi' | 'en' | 'zh',
    mode: 'auto' | 'start-end' | 'json'
): Promise<string> {
    
    let prompt: string;
    let config: any = {};

    switch (mode) {
        case 'json':
            const prompt_json_vi = `Bạn là một AI phân tích kịch bản. Dựa trên 3 phần thông tin sau, hãy điền vào một cấu trúc JSON chi tiết để mô tả một đoạn video ngắn.
**Cảnh Trước:** "${promptBefore}"
**Chuyển Cảnh:** "${promptTransition}"
**Cảnh Sau:** "${promptAfter}"
Hãy phân tích và điền vào các trường JSON theo schema được cung cấp.`;
            const prompt_json_en = `You are a script analysis AI. Based on the following three pieces of information, fill out a detailed JSON structure to describe a short video clip.
**Scene Before:** "${promptBefore}"
**Transition:** "${promptTransition}"
**Scene After:** "${promptAfter}"
Analyze and populate the JSON fields according to the provided schema.`;
            const prompt_json_zh = `你是一个剧本分析AI。根据以下三条信息，填写一个详细的JSON结构来描述一个短视频片段。\n**前场景：** "${promptBefore}"\n**转场：** "${promptTransition}"\n**后场景：** "${promptAfter}"\n请根据提供的schema分析并填充JSON字段。`;
            switch(language) {
                case 'zh': prompt = prompt_json_zh; break;
                case 'en': prompt = prompt_json_en; break;
                case 'vi': default: prompt = prompt_json_vi; break;
            }
            config = {
                responseMimeType: "application/json",
                responseSchema: VIDEO_PROMPT_SCHEMA
            };
            break;

        case 'start-end':
            const prompt_startend_vi = `Bạn là một AI chuyên viết kịch bản và prompt cho video. Dựa trên mô tả của hai cảnh và đoạn chuyển cảnh giữa chúng, hãy tạo ra một prompt duy nhất, chi tiết. **Tập trung chủ yếu vào việc mô tả hành động chuyển tiếp**, chuyển động camera, hoặc hiệu ứng xảy ra trong \`Chuyển Cảnh\`. \`Cảnh Trước\` và \`Cảnh Sau\` chỉ đóng vai trò là điểm bắt đầu và kết thúc cho chuyển động đó. Prompt phải đủ chi tiết để một AI tạo video có thể hiểu. Chỉ xuất ra văn bản prompt cuối cùng.
**Cảnh Trước:** "${promptBefore}"
**Chuyển Cảnh:** "${promptTransition}"
**Cảnh Sau:** "${promptAfter}"`;
            const prompt_startend_en = `You are an expert video prompter. Based on two scenes and a transition, create a single, detailed prompt. **Focus primarily on describing the transitional action**, camera movement, or effect that occurs in the \`Transition\`. The \`Scene Before\` and \`Scene After\` serve only as the start and end points for that motion. The prompt must be detailed enough for a video generation AI. Output only the final prompt text.
**Scene Before:** "${promptBefore}"
**Transition:** "${promptTransition}"
**Scene After:** "${promptAfter}"`;
            const prompt_startend_zh = `你是一位专业的视频提示工程师。根据两个场景及其间的转场描述，创建一个单一、详细的提示。**主要关注描述在\`转场\`中发生的过渡动作**、摄像机运动或效果。\`前场景\`和\`后场景\`仅作为该运动的起点和终点。提示必须足够详细，以便视频生成AI能够理解。只输出最终的提示文本。\n**前场景：** "${promptBefore}"\n**转场：** "${promptTransition}"\n**后场景：** "${promptAfter}"`;
            switch(language) {
                case 'zh': prompt = prompt_startend_zh; break;
                case 'en': prompt = prompt_startend_en; break;
                case 'vi': default: prompt = prompt_startend_vi; break;
            }
            break;

        case 'auto':
        default:
            const prompt_auto_vi = `Bạn là một AI chuyên viết kịch bản và prompt cho video. Dựa trên mô tả của hai cảnh và đoạn chuyển cảnh giữa chúng, hãy tạo ra một prompt duy nhất, chi tiết để tạo ra một đoạn video ngắn mô tả chính xác quá trình chuyển đổi đó.
**Cảnh Trước:** "${promptBefore}"
**Chuyển Cảnh:** "${promptTransition}"
**Cảnh Sau:** "${promptAfter}"
**Yêu cầu:** Kết hợp cả ba phần thông tin thành một luồng tự sự liền mạch. Mô tả rõ ràng hành động, chuyển động camera, thay đổi ánh sáng, hoặc hiệu ứng xảy ra trong quá trình chuyển cảnh. Prompt phải đủ chi tiết để một AI tạo video (như VEO) có thể hiểu và tạo ra một clip ngắn (3-5 giây) chất lượng cao. Chỉ xuất ra văn bản prompt cuối cùng, không có lời dẫn.`;
            const prompt_auto_en = `You are an expert video prompter and scriptwriter AI. Based on the descriptions of two scenes and the transition between them, generate a single, detailed prompt to create a short video clip that accurately depicts that transition.
**Scene Before:** "${promptBefore}"
**Transition:** "${promptTransition}"
**Scene After:** "${promptAfter}"
**Requirements:** Combine all three pieces of information into a seamless narrative flow. Clearly describe the action, camera movement, lighting changes, or effects that occur during the transition. The prompt must be detailed enough for a video generation AI (like VEO) to understand and create a high-quality short clip (3-5 seconds). Output only the final prompt text, with no introductory phrases.`;
            const prompt_auto_zh = `你是一位专业的视频提示工程师和编剧AI。根据两个场景及其间的转场描述，生成一个单一、详细的提示，以创建一个准确描绘该过渡的短视频片段。\n**前场景：** "${promptBefore}"\n**转场：** "${promptTransition}"\n**后场景：** "${promptAfter}"\n**要求：** 将所有三条信息组合成一个无缝的叙事流程。清晰地描述转场期间发生的动作、摄像机运动、灯光变化或效果。提示必须足够详细，以便视频生成AI（如VEO）能够理解并创建一个高质量的短片（3-5秒）。只输出最终的提示文本，不带任何介绍性短语。`;
            
            switch(language) {
                case 'zh': prompt = prompt_auto_zh; break;
                case 'en': prompt = prompt_auto_en; break;
                case 'vi': default: prompt = prompt_auto_vi; break;
            }
            break;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: config
        });
        const text = response.text.trim();
        if (!text) {
            throw new Error("AI did not generate a video prompt.");
        }
        if (mode === 'json') {
            try {
                const parsed = JSON.parse(text);
                return JSON.stringify(parsed, null, 2);
            } catch {
                return text; 
            }
        }
        return text;
    } catch (error) {
        console.error("Error generating video prompt from scenes:", error);
        throw processApiError(error);
    }
}