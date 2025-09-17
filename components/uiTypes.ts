/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Base types
export interface ImageForZip {
    url: string;
    filename: string;
    folder?: string;
    extension?: string;
}

export interface VideoTask {
    status: 'pending' | 'done' | 'error';
    resultUrl?: string;
    error?: string;
    operation?: any;
}

export interface AppConfig {
    id: string;
    titleKey: string;
    descriptionKey: string;
    icon: string;
}

export type Theme = 'sdvn' | 'vietnam' | 'black-night' | 'clear-sky' | 'skyline' | 'emerald-water' | 'life';
export const THEMES: Theme[] = ['sdvn', 'vietnam', 'black-night', 'clear-sky', 'skyline', 'emerald-water', 'life'];

export interface ImageToEdit {
    url: string | null;
    onSave: (newUrl: string) => void;
}


// --- Centralized State Definitions ---

export type HomeState = { stage: 'home' };

export interface ArchitectureIdeatorState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        context: string;
        style: string;
        color: string;
        lighting: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

type ImageStatus = 'pending' | 'done' | 'error';
interface GeneratedAvatarImage {
    status: ImageStatus;
    url?: string;
    error?: string;
}
interface HistoricalAvatarImage {
    idea: string;
    url: string;
}
export interface AvatarCreatorState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImages: Record<string, GeneratedAvatarImage>;
    historicalImages: HistoricalAvatarImage[];
    selectedIdeas: string[];
    options: {
        additionalPrompt: string;
        removeWatermark: boolean;
        aspectRatio: string;
    };
    error: string | null;
}

export interface DressTheModelState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    modelImage: string | null;
    clothingImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        background: string;
        pose: string;
        style: string;
        aspectRatio: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface PhotoRestorationState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        type: string;
        gender: string;
        age: string;
        nationality: string;
        notes: string;
        removeWatermark: boolean;
        removeStains: boolean;
    };
    error: string | null;
}

export interface ImageToRealState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        faithfulness: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface SwapStyleState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        style: string;
        styleStrength: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface MixStyleState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    contentImage: string | null;
    styleImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        styleStrength: string;
        notes: string;
        removeWatermark: boolean;
    };
    finalPrompt: string | null;
    error: string | null;
}

export interface FreeGenerationState {
    stage: 'configuring' | 'generating' | 'results';
    image1: string | null;
    image2: string | null;
    generatedImages: string[];
    historicalImages: string[];
    options: {
        prompt: string;
        removeWatermark: boolean;
        numberOfImages: number;
        aspectRatio: string;
    };
    error: string | null;
}

export interface ToyModelCreatorState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    concept: string; // e.g., 'desktop_model', 'keychain', 'gachapon', 'miniature'
    options: {
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
        // Concept 6: Crafting Model
        modelType: string;
        blueprintType: string;
        characterMood: string;
        // Constant Options
        aspectRatio: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface ImageInterpolationState {
    stage: 'idle' | 'prompting' | 'configuring' | 'generating' | 'results';
    analysisMode: 'general' | 'detailed';
    inputImage: string | null;
    outputImage: string | null;
    referenceImage: string | null;
    generatedPrompt: string;
    promptSuggestions: string;
    additionalNotes: string;
    finalPrompt: string | null;
    generatedImage: string | null;
    historicalImages: { url: string; prompt: string; }[];
    options: {
        removeWatermark: boolean;
        aspectRatio: string;
    };
    error: string | null;
}


// Union type for all possible app states
export type AnyAppState =
  | HomeState
  | ArchitectureIdeatorState
  | AvatarCreatorState
  | DressTheModelState
  | PhotoRestorationState
  | ImageToRealState
  | SwapStyleState
  | MixStyleState
  | FreeGenerationState
  | ToyModelCreatorState
  | ImageInterpolationState;

// --- App Navigation & State Types (Moved from App.tsx) ---
export type HomeView = { viewId: 'home'; state: HomeState };
export type ArchitectureIdeatorView = { viewId: 'architecture-ideator'; state: ArchitectureIdeatorState };
export type AvatarCreatorView = { viewId: 'avatar-creator'; state: AvatarCreatorState };
export type DressTheModelView = { viewId: 'dress-the-model'; state: DressTheModelState };
export type PhotoRestorationView = { viewId: 'photo-restoration'; state: PhotoRestorationState };
export type ImageToRealView = { viewId: 'image-to-real'; state: ImageToRealState };
export type SwapStyleView = { viewId: 'swap-style'; state: SwapStyleState };
export type MixStyleView = { viewId: 'mix-style'; state: MixStyleState };
export type FreeGenerationView = { viewId: 'free-generation'; state: FreeGenerationState };
export type ToyModelCreatorView = { viewId: 'toy-model-creator'; state: ToyModelCreatorState };
export type ImageInterpolationView = { viewId: 'image-interpolation'; state: ImageInterpolationState };

export type ViewState =
  | HomeView
  | ArchitectureIdeatorView
  | AvatarCreatorView
  | DressTheModelView
  | PhotoRestorationView
  | ImageToRealView
  | SwapStyleView
  | MixStyleView
  | FreeGenerationView
  | ToyModelCreatorView
  | ImageInterpolationView;

// Helper function to get initial state for an app
export const getInitialStateForApp = (viewId: string): AnyAppState => {
    switch (viewId) {
        case 'home':
            return { stage: 'home' };
        case 'architecture-ideator':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { context: '', style: '', color: '', lighting: '', notes: '', removeWatermark: false }, error: null };
        case 'avatar-creator':
            return { stage: 'idle', uploadedImage: null, generatedImages: {}, historicalImages: [], selectedIdeas: [], options: { additionalPrompt: '', removeWatermark: false, aspectRatio: 'Giữ nguyên' }, error: null };
        case 'dress-the-model':
            return { stage: 'idle', modelImage: null, clothingImage: null, generatedImage: null, historicalImages: [], options: { background: '', pose: '', style: '', aspectRatio: 'Giữ nguyên', notes: '', removeWatermark: false }, error: null };
        case 'photo-restoration':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { type: 'Chân dung', gender: 'Tự động', age: '', nationality: '', notes: '', removeWatermark: false, removeStains: true }, error: null };
        case 'image-to-real':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { faithfulness: 'Tự động', notes: '', removeWatermark: false }, error: null };
        case 'swap-style':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { style: '', styleStrength: 'Rất mạnh', notes: '', removeWatermark: false }, error: null };
        case 'mix-style':
            return { stage: 'idle', contentImage: null, styleImage: null, generatedImage: null, historicalImages: [], options: { styleStrength: 'Rất mạnh', notes: '', removeWatermark: false }, finalPrompt: null, error: null };
        case 'free-generation':
            return { stage: 'configuring', image1: null, image2: null, generatedImages: [], historicalImages: [], options: { prompt: '', removeWatermark: false, numberOfImages: 1, aspectRatio: 'Giữ nguyên' }, error: null };
        case 'toy-model-creator':
            return { 
                stage: 'idle', 
                uploadedImage: null, 
                generatedImage: null, 
                historicalImages: [],
                concept: 'desktop_model', 
                options: { 
                    computerType: '', 
                    softwareType: '', 
                    boxType: '', 
                    background: '',
                    keychainMaterial: '',
                    keychainStyle: '',
                    accompanyingItems: '',
                    deskSurface: '',
                    capsuleColor: '',
                    modelFinish: '',
                    capsuleContents: '',
                    displayLocation: '',
                    miniatureMaterial: '',
                    baseMaterial: '',
                    baseShape: '',
                    lightingStyle: '',
                    pokeballType: '',
                    evolutionDisplay: '',
                    modelStyle: '',
                    modelType: '',
                    blueprintType: '',
                    characterMood: '',
                    aspectRatio: 'Giữ nguyên', 
                    notes: '', 
                    removeWatermark: false 
                }, 
                error: null 
            };
        case 'image-interpolation':
             return { stage: 'idle', analysisMode: 'general', inputImage: null, outputImage: null, referenceImage: null, generatedPrompt: '', promptSuggestions: '', additionalNotes: '', finalPrompt: null, generatedImage: null, historicalImages: [], options: { removeWatermark: false, aspectRatio: 'Giữ nguyên' }, error: null };
        default:
            return { stage: 'home' };
    }
};