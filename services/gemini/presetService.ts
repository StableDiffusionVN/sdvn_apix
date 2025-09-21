/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { generateArchitecturalImage } from './architectureIdeatorService';
import { generatePatrioticImage } from './avatarCreatorService';
import { generateBabyPhoto } from './babyPhotoCreatorService';
import { generateDressedModelImage } from './dressTheModelService';
import { restoreOldPhoto } from './photoRestorationService';
import { convertImageToRealistic } from './imageToRealService';
import { swapImageStyle } from './swapStyleService';
import { mixImageStyle } from './mixStyleService';
import { generateFreeImage } from './freeGenerationService';
import { generateToyModelImage } from './toyModelCreatorService';
import { interpolatePrompts, adaptPromptToContext } from './imageInterpolationService';
import { editImageWithPrompt } from './imageEditingService';
import { type Layer } from '../../components/LayerComposer/LayerComposer.types';

type PresetData = {
    viewId: string;
    state: any;
};

type GeneratorFunction = (...args: any[]) => Promise<any>;

interface PresetConfig {
    imageKeys: string[];
    generator: GeneratorFunction | ((imageUrls: (string | undefined)[], presetData: PresetData) => Promise<string[]>);
}

// This config map is the single source of truth for preset generation logic.
// To add a new preset-compatible app, add its configuration here.
const presetConfig: Record<string, PresetConfig> = {
    'architecture-ideator': {
        imageKeys: ['uploadedImage'],
        generator: (images, preset) => generateArchitecturalImage(images[0]!, preset.state.options),
    },
    'avatar-creator': {
        imageKeys: ['uploadedImage'],
        generator: async (images, preset) => {
            const ideas = preset.state.selectedIdeas;
            if (!ideas || ideas.length === 0) throw new Error("Preset has no ideas selected.");
            const promises = ideas.map((idea: string) => 
                generatePatrioticImage(images[0]!, idea, preset.state.options.additionalPrompt, preset.state.options.removeWatermark, preset.state.options.aspectRatio)
            );
            return Promise.all(promises);
        },
    },
    'baby-photo-creator': {
        imageKeys: ['uploadedImage'],
        generator: async (images, preset) => {
            const ideas = preset.state.selectedIdeas;
            if (!ideas || ideas.length === 0) throw new Error("Preset has no ideas selected.");
            const promises = ideas.map((idea: string) => 
                generateBabyPhoto(images[0]!, idea, preset.state.options.additionalPrompt, preset.state.options.removeWatermark, preset.state.options.aspectRatio)
            );
            return Promise.all(promises);
        },
    },
    'dress-the-model': {
        imageKeys: ['modelImage', 'clothingImage'],
        generator: (images, preset) => generateDressedModelImage(images[0]!, images[1]!, preset.state.options),
    },
    'photo-restoration': {
        imageKeys: ['uploadedImage'],
        generator: (images, preset) => restoreOldPhoto(images[0]!, preset.state.options),
    },
    'image-to-real': {
        imageKeys: ['uploadedImage'],
        generator: (images, preset) => convertImageToRealistic(images[0]!, preset.state.options),
    },
    'swap-style': {
        imageKeys: ['uploadedImage'],
        generator: (images, preset) => swapImageStyle(images[0]!, preset.state.options),
    },
    'mix-style': {
        imageKeys: ['contentImage', 'styleImage'],
        generator: async (images, preset) => {
            const { resultUrl } = await mixImageStyle(images[0]!, images[1]!, preset.state.options);
            return [resultUrl];
        },
    },
    'toy-model-creator': {
        imageKeys: ['uploadedImage'],
        generator: (images, preset) => {
            const concept = preset.state.concept;
            if (!concept) throw new Error("Toy Model Creator preset is missing a 'concept'.");
            return generateToyModelImage(images[0]!, concept, preset.state.options);
        },
    },
    'free-generation': {
        imageKeys: ['image1', 'image2'],
        generator: (images, preset) => generateFreeImage(preset.state.options.prompt, preset.state.options.numberOfImages, preset.state.options.aspectRatio, images[0], images[1], preset.state.options.removeWatermark),
    },
    'image-interpolation': {
        imageKeys: ['referenceImage'],
        generator: async (images, preset) => {
            const { generatedPrompt, additionalNotes } = preset.state;
            const referenceUrl = images[0];
            if (!generatedPrompt || !referenceUrl) throw new Error("Preset is missing prompt or reference image.");
            let iPrompt = generatedPrompt;
            if (additionalNotes) { iPrompt = await interpolatePrompts(iPrompt, additionalNotes); }
            const fPrompt = await adaptPromptToContext(referenceUrl, iPrompt);
            const result = await editImageWithPrompt(referenceUrl, fPrompt, preset.state.options.aspectRatio, preset.state.options.removeWatermark);
            return [result];
        }
    }
};

/**
 * Centralized function to generate images from a preset file and selected canvas layers.
 * @param presetData The parsed JSON data from the preset file.
 * @param selectedLayerUrls The data URLs of the layers selected on the canvas.
 * @returns A promise that resolves to an array of generated image data URLs.
 */
export async function generateFromPreset(presetData: PresetData, selectedLayerUrls: string[]): Promise<string[]> {
    const { viewId, state } = presetData;
    const config = presetConfig[viewId];

    if (!config) {
        throw new Error(`Preset for app "${viewId}" is not supported.`);
    }

    // Map selected canvas layers to the required image inputs for the app.
    // If not enough layers are selected, use the images stored in the preset as fallbacks.
    const finalImageUrls = config.imageKeys.map((key, index) => {
        return selectedLayerUrls[index] ?? state[key];
    });

    // Ensure all required images are present
    if (finalImageUrls.some(url => !url)) {
        throw new Error(`Not enough images provided for "${viewId}" preset. Required: ${config.imageKeys.join(', ')}.`);
    }

    const result = await config.generator(finalImageUrls, presetData);

    // Ensure the result is always an array
    return Array.isArray(result) ? result : [result];
}