/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";
import { 
    processApiError,
    parseDataUrl, 
} from './baseService';

export async function startVideoGenerationFromImage(
    imageDataUrl: string,
    prompt: string
): Promise<any> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const { mimeType, data: base64Data } = parseDataUrl(imageDataUrl);

        console.log("Starting video generation...");
        
        const operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt,
            image: {
                imageBytes: base64Data,
                mimeType,
            },
            config: {
                numberOfVideos: 1
            }
        });

        return operation;

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error starting video generation:", processedError);
        throw processedError;
    }
}

export async function pollVideoOperation(
    operation: any
): Promise<any> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        console.log("Polling video operation status...");
        return await ai.operations.getVideosOperation({ operation });
    } catch (error) {
         const processedError = processApiError(error);
        console.error("Error polling video operation:", processedError);
        throw processedError;
    }
}
