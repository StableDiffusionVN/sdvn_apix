/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useContext, createContext, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { COUNTRIES } from '../lib/countries';
import { STYLE_OPTIONS_LIST } from '../lib/styles';
// FIX: Import PolaroidCard to be used in ImageUploader and break circular dependency.
import PolaroidCard from './PolaroidCard';

// Declare JSZip for creating zip files
declare const JSZip: any;

/**
 * Renders a title with optional smart wrapping to keep a specified number of last words together.
 * This prevents orphaned words on a new line.
 * @param title The title string.
 * @param enabled A boolean to enable/disable the smart wrapping logic.
 * @param wordsToKeep The number of words to keep on the same line at the end.
 * @returns A React.ReactNode element for the title.
 */
export const renderSmartlyWrappedTitle = (title: string, enabled: boolean, wordsToKeep: number): React.ReactNode => {
    // Default wordsToKeep to 2 if not provided or invalid
    const numWordsToKeep = (typeof wordsToKeep === 'number' && wordsToKeep > 0) ? wordsToKeep : 2;

    if (!enabled) {
        return title;
    }

    const words = title.split(' ');
    // Only apply wrapping if there are more words than we want to keep together
    if (words.length > numWordsToKeep) {
        const partToKeepTogether = words.splice(-numWordsToKeep).join(' ');
        const firstPart = words.join(' ');
        return (
            <>
                {firstPart}{' '}
                <span className="whitespace-nowrap">{partToKeepTogether}</span>
            </>
        );
    }
    
    return title;
};


/**
 * Handles file input change events, reads the file as a Data URL, and executes a callback.
 * @param e The React change event from the file input.
 * @param callback A function to call with the resulting file data URL.
 */
export const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (result: string) => void
) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                callback(reader.result);
            }
        };
        reader.readAsDataURL(file);
    }
};

/**
 * Triggers a browser download for a given URL.
 * @param url The URL of the file to download (can be a data URL).
 * @param filename The desired name for the downloaded file.
 */
export const downloadImage = (url: string, filename: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Converts a data URL string to a Blob object.
 * @param dataurl The data URL to convert.
 * @returns A Blob object.
 */
export const dataURLtoBlob = (dataurl: string): Blob => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Invalid data URL');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};


export interface ImageForZip {
    url: string;
    filename: string;
    folder?: string;
}

/**
 * Creates a zip file from a list of images and triggers a download.
 * @param images An array of ImageForZip objects.
 * @param zipFilename The desired name for the downloaded zip file.
 */
export const downloadAllImagesAsZip = async (images: ImageForZip[], zipFilename: string = 'results.zip') => {
    if (!images || images.length === 0) {
        alert('Không có ảnh nào để tải về.');
        return;
    }

    try {
        const zip = new JSZip();

        for (const img of images) {
            if (!img.url) continue;

            const blob = dataURLtoBlob(img.url);
            let targetFolder = zip;
            if (img.folder) {
                targetFolder = zip.folder(img.folder) || zip;
            }
            
            const fileExtension = (blob.type.split('/')[1] || 'jpg').toLowerCase();
            const baseFileName = img.filename.replace(/\s+/g, '-').toLowerCase();

            // Handle duplicates by appending a number
            let finalFilename = `${baseFileName}.${fileExtension}`;
            let count = 1;
            // Use the file method to check for existence within the target folder
            while (targetFolder.file(finalFilename)) {
                count++;
                finalFilename = `${baseFileName}-${count}.${fileExtension}`;
            }

            targetFolder.file(finalFilename, blob);
        }

        if (Object.keys(zip.files).length === 0) {
            alert('Không có ảnh hợp lệ nào để tải về.');
            return;
        }

        const content = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = zipFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error('Lỗi khi tạo file zip:', error);
        alert('Đã xảy ra lỗi khi tạo file zip. Vui lòng thử lại.');
    }
};


// --- Reusable Modal Component ---

interface RegenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (prompt: string) => void;
    itemToModify: string | null;
    title?: string;
    description?: string;
    placeholder?: string;
}

export const RegenerationModal: React.FC<RegenerationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    itemToModify,
    title = "Chỉnh sửa ảnh",
    description = "Thêm yêu cầu để tinh chỉnh ảnh",
    placeholder = "Ví dụ: tông màu ấm, phong cách phim xưa..."
}) => {
    const [customPrompt, setCustomPrompt] = useState('');

    useEffect(() => {
        // Reset prompt when modal is newly opened
        if (isOpen) {
            setCustomPrompt('');
        }
    }, [isOpen]);

    const handleConfirm = () => {
        onConfirm(customPrompt);
    };

    return (
        <AnimatePresence>
            {isOpen && itemToModify && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="modal-overlay"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="modal-content"
                    >
                        <h3 className="base-font font-bold text-2xl text-yellow-400">{title}</h3>
                        <p className="text-neutral-300">
                            {description} <span className="font-bold text-white">"{itemToModify}"</span>.
                        </p>
                        <textarea
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder={placeholder}
                            className="modal-textarea"
                            rows={3}
                            aria-label="Yêu cầu chỉnh sửa bổ sung"
                        />
                        <div className="flex justify-end items-center gap-4 mt-2">
                            <button onClick={onClose} className="btn btn-secondary btn-sm">
                                Hủy
                            </button>
                            <button onClick={handleConfirm} className="btn btn-primary btn-sm">
                                Tạo lại
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};


// --- Reusable Hooks ---

/**
 * Custom hook to track media query status.
 * @param query The media query string (e.g., '(max-width: 768px)').
 * @returns boolean indicating if the query matches.
 */
export const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        window.addEventListener('resize', listener);
        return () => window.removeEventListener('resize', listener);
    }, [matches, query]);
    return matches;
};

/**
 * Custom hook to manage the state and actions for the Lightbox component.
 * @returns An object with the lightbox's current index and functions to control it.
 */
export const useLightbox = () => {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const openLightbox = useCallback((index: number) => {
        setLightboxIndex(index);
    }, []);

    const closeLightbox = useCallback(() => {
        setLightboxIndex(null);
    }, []);

    const navigateLightbox = useCallback((newIndex: number) => {
        setLightboxIndex(newIndex);
    }, []);

    return {
        lightboxIndex,
        openLightbox,
        closeLightbox,
        navigateLightbox,
    };
};


// --- NEW: Image Editor Hook ---
export interface ImageToEdit {
    url: string | null;
    onSave: (newUrl: string) => void;
}

interface ImageEditorContextType {
    imageToEdit: ImageToEdit | null;
    openImageEditor: (url: string, onSave: (newUrl: string) => void) => void;
    openEmptyImageEditor: (onSave: (newUrl: string) => void) => void;
    closeImageEditor: () => void;
}

// Create a context with a default undefined value
const ImageEditorContext = createContext<ImageEditorContextType | undefined>(undefined);

// Create a provider component
export const ImageEditorProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [imageToEdit, setImageToEdit] = useState<ImageToEdit | null>(null);

    const openImageEditor = useCallback((url: string, onSave: (newUrl: string) => void) => {
        if (window.innerWidth < 768) {
            alert("Chức năng chỉnh sửa ảnh không khả dụng trên thiết bị di động.");
            return;
        }
        if (!url) {
            console.error("openImageEditor called with no URL.");
            return;
        }
        setImageToEdit({ url, onSave });
    }, []);

    const openEmptyImageEditor = useCallback((onSave: (newUrl: string) => void) => {
        if (window.innerWidth < 768) {
            alert("Chức năng chỉnh sửa ảnh không khả dụng trên thiết bị di động.");
            return;
        }
        setImageToEdit({ url: null, onSave });
    }, []);

    const closeImageEditor = useCallback(() => {
        setImageToEdit(null);
    }, []);

    const value = { imageToEdit, openImageEditor, openEmptyImageEditor, closeImageEditor };

    return (
        <ImageEditorContext.Provider value={value}>
            {children}
        </ImageEditorContext.Provider>
    );
};

// Create the custom hook
export const useImageEditor = (): ImageEditorContextType => {
    const context = useContext(ImageEditorContext);
    if (context === undefined) {
        throw new Error('useImageEditor must be used within an ImageEditorProvider');
    }
    return context;
};


// --- NEW: Centralized State Definitions ---

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
    options: {
        computerType: string;
        softwareType: string;
        boxType: string;
        background: string;
        aspectRatio: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface ImageInterpolationState {
    stage: 'idle' | 'prompting' | 'configuring' | 'generating' | 'results';
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
export interface AppConfig {
    id: string;
    title: string;
    description: string;
    icon: string;
}

export type Theme = 'sdvn' | 'vietnam' | 'black-night' | 'clear-sky' | 'skyline' | 'emerald-water' | 'life';
const THEMES: Theme[] = ['sdvn', 'vietnam', 'black-night', 'clear-sky', 'skyline', 'emerald-water', 'life'];

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
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { context: 'Tự động', style: 'Tự động', color: 'Tự động', lighting: 'Tự động', notes: '', removeWatermark: false }, error: null };
        case 'avatar-creator':
            return { stage: 'idle', uploadedImage: null, generatedImages: {}, historicalImages: [], selectedIdeas: [], options: { additionalPrompt: '', removeWatermark: false, aspectRatio: 'Giữ nguyên' }, error: null };
        case 'dress-the-model':
            return { stage: 'idle', modelImage: null, clothingImage: null, generatedImage: null, historicalImages: [], options: { background: 'Tự động', pose: 'Tự động', style: 'Tự động', aspectRatio: 'Giữ nguyên', notes: '', removeWatermark: false }, error: null };
        case 'photo-restoration':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { type: 'Chân dung', gender: 'Tự động', age: '', nationality: COUNTRIES[0], notes: '', removeWatermark: false, removeStains: true }, error: null };
        case 'image-to-real':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { faithfulness: 'Tự động', notes: '', removeWatermark: false }, error: null };
        case 'swap-style':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { style: STYLE_OPTIONS_LIST[0], styleStrength: 'Rất mạnh', notes: '', removeWatermark: false }, error: null };
        case 'mix-style':
            return { stage: 'idle', contentImage: null, styleImage: null, generatedImage: null, historicalImages: [], options: { styleStrength: 'Rất mạnh', notes: '', removeWatermark: false }, error: null };
        case 'free-generation':
            return { stage: 'configuring', image1: null, image2: null, generatedImages: [], historicalImages: [], options: { prompt: '', removeWatermark: false, numberOfImages: 1, aspectRatio: 'Giữ nguyên' }, error: null };
        case 'toy-model-creator':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { computerType: 'Tự động', softwareType: 'Tự động', boxType: 'Tự động', background: 'Tự động', aspectRatio: 'Giữ nguyên', notes: '', removeWatermark: false }, error: null };
        case 'image-interpolation':
             return { stage: 'idle', inputImage: null, outputImage: null, referenceImage: null, generatedPrompt: '', promptSuggestions: '', additionalNotes: '', finalPrompt: null, generatedImage: null, historicalImages: [], options: { removeWatermark: false, aspectRatio: 'Giữ nguyên' }, error: null };
        default:
            return { stage: 'home' };
    }
};

// --- App Control Context ---
interface AppControlContextType {
    currentView: ViewState;
    settings: any;
    theme: Theme;
    sessionGalleryImages: string[];
    historyIndex: number;
    viewHistory: ViewState[];
    isSearchOpen: boolean;
    isGalleryOpen: boolean;
    isInfoOpen: boolean;
    addImagesToGallery: (newImages: string[]) => void;
    removeImageFromGallery: (imageIndex: number) => void;
    handleThemeChange: (newTheme: Theme) => void;
    navigateTo: (viewId: string) => void;
    handleStateChange: (newAppState: AnyAppState) => void;
    handleSelectApp: (appId: string) => void;
    handleGoHome: () => void;
    handleGoBack: () => void;
    handleGoForward: () => void;
    handleResetApp: () => void;
    handleOpenSearch: () => void;
    handleCloseSearch: () => void;
    handleOpenGallery: () => void;
    handleCloseGallery: () => void;
    handleOpenInfo: () => void;
    handleCloseInfo: () => void;
}

const AppControlContext = createContext<AppControlContextType | undefined>(undefined);

export const AppControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [viewHistory, setViewHistory] = useState<ViewState[]>([{ viewId: 'home', state: { stage: 'home' } }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('app-theme') as Theme;
        if (savedTheme && THEMES.includes(savedTheme)) {
            return savedTheme;
        }
        // If no theme is saved, pick a random one
        return THEMES[Math.floor(Math.random() * THEMES.length)];
    });
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [sessionGalleryImages, setSessionGalleryImages] = useState<string[]>([]);
    const [settings, setSettings] = useState(null); // Initially null

    const currentView = viewHistory[historyIndex];

    const addImagesToGallery = useCallback((newImages: string[]) => {
        setSessionGalleryImages(prev => {
            const uniqueNewImages = newImages.filter(img => !prev.includes(img));
            return [...prev, ...uniqueNewImages];
        });
    }, []);

    const removeImageFromGallery = useCallback((indexToRemove: number) => {
        setSessionGalleryImages(prev => prev.filter((_, index) => index !== indexToRemove));
    }, []);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/setting.json');
                 if (!response.ok) {
                    console.warn('Could not load setting.json, using built-in settings.');
                    // In a real-world scenario, you might have default settings hardcoded here.
                    // For now, we'll just log the issue.
                    return;
                }
                const data = await response.json();
                setSettings(data);
            } catch (error) {
                console.error("Failed to fetch or parse setting.json:", error);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        document.body.classList.remove('theme-sdvn', 'theme-vietnam', 'theme-dark', 'theme-ocean-blue', 'theme-blue-sky', 'theme-black-night', 'theme-clear-sky', 'theme-skyline', 'theme-blulagoo', 'theme-life', 'theme-emerald-water');
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
    };

    const navigateTo = useCallback((viewId: string) => {
        const current = viewHistory[historyIndex];
        const initialState = getInitialStateForApp(viewId);
    
        if (current.viewId === viewId && JSON.stringify(current.state) === JSON.stringify(initialState)) {
            return;
        }
    
        const newHistory = viewHistory.slice(0, historyIndex + 1);
        newHistory.push({ viewId, state: initialState } as ViewState);
        
        setViewHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [viewHistory, historyIndex]);
    
    const handleStateChange = useCallback((newAppState: AnyAppState) => {
        const current = viewHistory[historyIndex];
        if (JSON.stringify(current.state) === JSON.stringify(newAppState)) {
            return; // No change
        }
    
        const newHistory = viewHistory.slice(0, historyIndex + 1);
        newHistory.push({ viewId: current.viewId, state: newAppState } as ViewState);
    
        setViewHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [viewHistory, historyIndex]);

    const handleSelectApp = useCallback((appId: string) => {
        if (settings) {
            const validAppIds = settings.apps.map((app: AppConfig) => app.id);
            if (validAppIds.includes(appId)) {
                navigateTo(appId);
            } else {
                navigateTo('home');
            }
        }
    }, [settings, navigateTo]);

    const handleGoHome = useCallback(() => {
        navigateTo('home');
    }, [navigateTo]);

    const handleGoBack = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
        }
    }, [historyIndex]);
    
    const handleGoForward = useCallback(() => {
        if (historyIndex < viewHistory.length - 1) {
            setHistoryIndex(prev => prev + 1);
        }
    }, [historyIndex, viewHistory.length]);

    const handleResetApp = useCallback(() => {
        const currentViewId = viewHistory[historyIndex].viewId;
        if (currentViewId !== 'home') {
            navigateTo(currentViewId);
        }
    }, [viewHistory, historyIndex, navigateTo]);
    
    const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);
    const handleCloseSearch = useCallback(() => setIsSearchOpen(false), []);
    const handleOpenGallery = useCallback(() => setIsGalleryOpen(true), []);
    const handleCloseGallery = useCallback(() => setIsGalleryOpen(false), []);
    const handleOpenInfo = useCallback(() => setIsInfoOpen(true), []);
    const handleCloseInfo = useCallback(() => setIsInfoOpen(false), []);

    const value: AppControlContextType = {
        currentView,
        settings,
        theme,
        sessionGalleryImages,
        historyIndex,
        viewHistory,
        isSearchOpen,
        isGalleryOpen,
        isInfoOpen,
        addImagesToGallery,
        removeImageFromGallery,
        handleThemeChange,
        navigateTo,
        handleStateChange,
        handleSelectApp,
        handleGoHome,
        handleGoBack,
        handleGoForward,
        handleResetApp,
        handleOpenSearch,
        handleCloseSearch,
        handleOpenGallery,
        handleCloseGallery,
        handleOpenInfo,
        handleCloseInfo,
    };

    return (
        <AppControlContext.Provider value={value}>
            {children}
        </AppControlContext.Provider>
    );
};

export const useAppControls = (): AppControlContextType => {
    const context = useContext(AppControlContext);
    if (context === undefined) {
        throw new Error('useAppControls must be used within an AppControlProvider');
    }
    return context;
};

// --- Reusable UI Components ---

interface AppScreenHeaderProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
}

/**
 * A standardized header component for app screens.
 */
export const AppScreenHeader: React.FC<AppScreenHeaderProps> = ({ mainTitle, subtitle, useSmartTitleWrapping, smartTitleWrapWords }) => (
     <motion.div
        className="text-center mb-8"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
    >
        <h1 className="text-5xl/[1.3] md:text-7xl/[1.3] title-font font-bold text-white [text-shadow:1px_1px_3px_rgba(0,0,0,0.4)] tracking-wider">
            {renderSmartlyWrappedTitle(mainTitle, useSmartTitleWrapping, smartTitleWrapWords)}
        </h1>
        <p className="sub-title-font font-bold text-neutral-200 mt-2 text-xl tracking-wide">{subtitle}</p>
    </motion.div>
);

interface ImageUploaderProps {
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onImageChange: (imageDataUrl: string) => void;
    uploaderCaption: string;
    uploaderDescription: string;
    placeholderType?: 'person' | 'architecture' | 'clothing' | 'magic' | 'style';
    id: string;
}

// FIX: Refactored ImageUploader to use PolaroidCard directly to break a circular dependency.
/**
 * A reusable image uploader component with a Polaroid card style.
 */
export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, onImageChange, uploaderCaption, uploaderDescription, placeholderType = 'person', id }) => {
    const [isGalleryPickerOpen, setGalleryPickerOpen] = useState(false);
    const { sessionGalleryImages } = useAppControls();

    const handleOpenGalleryPicker = useCallback(() => {
        setGalleryPickerOpen(true);
    }, []);

    const handleGalleryImageSelect = (selectedImageUrl: string) => {
        onImageChange(selectedImageUrl);
        setGalleryPickerOpen(false);
    };

    return (
        <div className="flex flex-col items-center justify-center w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="group transform hover:scale-105 transition-transform duration-300">
                    <label htmlFor={id} className="cursor-pointer">
                        <PolaroidCard
                            caption={uploaderCaption}
                            status="done"
                            imageUrl={undefined}
                            placeholderType={placeholderType}
                            onSelectFromGallery={handleOpenGalleryPicker}
                        />
                    </label>
                </div>
            </motion.div>
            <input 
                id={id} 
                type="file" 
                className="hidden" 
                accept="image/png, image/jpeg, image/webp" 
                onChange={onImageUpload} 
                onClick={(e) => (e.currentTarget.value = '')}
            />
            <p className="mt-8 base-font font-bold text-neutral-300 text-center max-w-lg text-lg">
                {uploaderDescription}
            </p>
            <GalleryPicker
                isOpen={isGalleryPickerOpen}
                onClose={() => setGalleryPickerOpen(false)}
                onSelect={handleGalleryImageSelect}
                images={sessionGalleryImages}
            />
        </div>
    );
};


interface ResultsViewProps {
    stage: 'generating' | 'results';
    originalImage: string | null;
    onOriginalClick?: () => void;
    children: React.ReactNode;
    actions: React.ReactNode;
    isMobile?: boolean;
    error?: string | null;
    hasPartialError?: boolean;
}

/**
 * A reusable component to display the results of an image generation process.
 */
export const ResultsView: React.FC<ResultsViewProps> = ({ stage, originalImage, onOriginalClick, children, actions, isMobile, error, hasPartialError }) => {
    const isTotalError = !!error;
    
    return (
        <div className="w-full flex-1 flex flex-col items-center justify-between pt-12">
            <AnimatePresence>
                {stage === 'results' && (
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                    >
                        {isTotalError ? (
                            <>
                                <h2 className="base-font font-bold text-3xl text-red-400">Đã xảy ra lỗi</h2>
                                <p className="text-neutral-300 mt-1 max-w-md mx-auto">{error}</p>
                            </>
                        ) : (
                            <>
                                <h2 className="base-font font-bold text-3xl text-neutral-100">Đây là kết quả của bạn!</h2>
                                {hasPartialError ? (
                                    <p className="text-yellow-300 mt-1">Một vài ảnh đã gặp lỗi. Bạn có thể thử tạo lại chúng.</p>
                                ) : (
                                    <p className="text-neutral-300 mt-1">Bạn có thể tạo lại từng ảnh hoặc tải về máy.</p>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="w-full flex-1 flex items-start justify-center overflow-y-auto md:overflow-x-auto py-4">
                <motion.div
                    layout
                    className="flex flex-col md:flex-row flex-nowrap items-start md:items-stretch justify-start gap-8 px-4 md:px-8 w-full md:w-max mx-auto py-4"
                >
                    {originalImage && (
                        <motion.div
                            key="original-image-result"
                            className="w-full md:w-auto flex-shrink-0"
                            initial={{ opacity: 0, scale: 0.5, y: 100 }}
                            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 80, damping: 15, delay: -0.15 }}
                            whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
                        >
                             <div className={cn("polaroid-card")}>
                                <div className={cn("polaroid-image-container has-image")}>
                                    <img src={originalImage} alt="Ảnh gốc" className="w-full h-auto md:w-auto md:h-full block" onClick={onOriginalClick}/>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 text-center px-2">
                                    <p className="polaroid-caption text-black">Ảnh gốc</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                    {children}
                </motion.div>
            </div>

            <div className="w-full px-4 my-6 flex items-center justify-center">
                {stage === 'results' && (
                    <motion.div
                        className="results-actions"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                    >
                        {actions}
                    </motion.div>
                )}
            </div>
        </div>
    );
};


// --- NEW: Reusable Layout Components for App Screens ---

interface AppOptionsLayoutProps {
    children: React.ReactNode;
}

/**
 * A standardized single-column layout for screens that show an uploaded image and an options panel.
 */
export const AppOptionsLayout: React.FC<AppOptionsLayoutProps> = ({ children }) => (
    <motion.div
        className="flex flex-col items-center gap-8 w-full max-w-6xl py-6 overflow-y-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
        {children}
    </motion.div>
);

interface OptionsPanelProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * A standardized panel for displaying app-specific options.
 */
export const OptionsPanel: React.FC<OptionsPanelProps> = ({ children, className }) => (
     <div className={cn("w-full max-w-3xl bg-black/20 p-6 rounded-lg border border-white/10 space-y-4", className)}>
        {children}
    </div>
);

// --- NEW: Slider Component ---

interface SliderProps {
    label: string;
    options: readonly string[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export const Slider: React.FC<SliderProps> = ({ label, options, value, onChange, disabled = false }) => {
    const valueIndex = options.indexOf(value);
    const sliderValue = valueIndex >= 0 ? valueIndex : 0;

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        const newIndex = parseInt(e.target.value, 10);
        if (options[newIndex]) {
            onChange(options[newIndex]);
        }
    };

    return (
        <div>
            <label className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">
                {label}
            </label>
            <div className="slider-container">
                <input
                    type="range"
                    min="0"
                    max={options.length - 1}
                    value={sliderValue}
                    onChange={handleSliderChange}
                    className="slider-track"
                    aria-label={label}
                    disabled={disabled}
                />
                <div className="slider-labels">
                    {options.map((option, index) => (
                        <span 
                            key={index} 
                            className={cn(
                                "slider-label",
                                { 'slider-label-active': index === sliderValue && !disabled }
                            )}
                        >
                            {option}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};


// --- NEW: Gallery Picker Component with Drag & Drop ---
interface GalleryPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (imageUrl: string) => void;
    images: string[];
}

export const GalleryPicker: React.FC<GalleryPickerProps> = ({ isOpen, onClose, onSelect, images }) => {
    const { addImagesToGallery, removeImageFromGallery } = useAppControls();
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const isDroppingRef = useRef(false);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        isDroppingRef.current = true;
        setIsDraggingOver(false);

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) {
            isDroppingRef.current = false;
            return;
        }

        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) {
            isDroppingRef.current = false;
            return;
        }

        const readImageAsDataURL = (file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        resolve(reader.result);
                    } else {
                        reject(new Error('Failed to read file as Data URL.'));
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        };

        try {
            const imageDataUrls = await Promise.all(imageFiles.map(readImageAsDataURL));
            addImagesToGallery(imageDataUrls);
        } catch (error) {
            console.error("Error reading dropped files:", error);
        } finally {
             setTimeout(() => { isDroppingRef.current = false; }, 100);
        }
    };

    const handleClose = () => {
        if (isDroppingRef.current) return;
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="modal-overlay z-[70]"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="modal-content !max-w-4xl !h-[85vh] flex flex-col relative"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="base-font font-bold text-2xl text-yellow-400">Chọn ảnh từ Thư viện</h3>
                            <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Đóng thư viện">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        {images.length > 0 ? (
                            <div className="gallery-grid">
                                {images.map((img, index) => (
                                    <motion.div
                                        key={`${img.slice(-20)}-${index}`}
                                        className="gallery-grid-item group relative"
                                        onClick={() => onSelect(img)}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.03 }}
                                    >
                                        <img src={img} alt={`Generated image ${index + 1}`} loading="lazy" />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeImageFromGallery(index);
                                            }}
                                            className="absolute bottom-2 right-2 z-10 p-2 bg-black/60 rounded-full text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                            aria-label={`Xóa ảnh ${index + 1}`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center text-neutral-400 py-8 flex-1 flex items-center justify-center">
                                <p>Chưa có ảnh nào trong thư viện.<br/>Bạn có thể kéo và thả ảnh vào đây để tải lên.</p>
                            </div>
                        )}
                         <AnimatePresence>
                            {isDraggingOver && (
                                <motion.div
                                    className="absolute inset-0 z-10 bg-black/70 border-4 border-dashed border-yellow-400 rounded-lg flex flex-col items-center justify-center pointer-events-none"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="text-2xl font-bold text-yellow-400">Thả ảnh vào đây để tải lên</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

// --- NEW: Reusable Prompt Result Card ---

interface PromptResultCardProps {
    title: string;
    promptText: string | null;
    className?: string;
}

export const PromptResultCard: React.FC<PromptResultCardProps> = ({ title, promptText, className }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyPrompt = useCallback(() => {
        if (promptText) {
            navigator.clipboard.writeText(promptText).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                alert('Không thể sao chép prompt.');
            });
        }
    }, [promptText]);

    return (
        <div className={cn("bg-neutral-100 p-4 flex flex-col w-full rounded-md shadow-lg relative", className)}>
            {promptText && (
                <button
                    onClick={handleCopyPrompt}
                    className="absolute top-3 right-3 p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 rounded-full transition-colors"
                    aria-label="Sao chép prompt"
                    title="Sao chép prompt"
                >
                    {isCopied ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    )}
                </button>
            )}
            <h4 className="polaroid-caption !text-left !text-lg !text-black !pb-2 border-b border-neutral-300 mb-2 !p-0 pr-8">
                {title}
            </h4>
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2">
                <p className="text-sm whitespace-pre-wrap text-neutral-700 base-font">
                    {promptText || '...'}
                </p>
            </div>
        </div>
    );
};