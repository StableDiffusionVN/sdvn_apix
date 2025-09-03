/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PolaroidCard from './PolaroidCard';
import { cn } from '../lib/utils';
import { COUNTRIES } from '../lib/countries';
import { STYLE_OPTIONS_LIST } from '../lib/styles';

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
  | ToyModelCreatorState;

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
        default:
            return { stage: 'home' };
    }
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
    uploaderCaption: string;
    uploaderDescription: string;
    placeholderType?: 'person' | 'architecture' | 'clothing' | 'magic' | 'style';
    id: string;
}

/**
 * A reusable image uploader component with a Polaroid card style.
 */
export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, uploaderCaption, uploaderDescription, placeholderType = 'person', id }) => (
    <div className="flex flex-col items-center justify-center w-full">
        <label htmlFor={id} className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
            <PolaroidCard
                caption={uploaderCaption}
                status="done"
                placeholderType={placeholderType}
            />
        </label>
        <input id={id} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={onImageUpload} />
        <p className="mt-8 base-font font-bold text-neutral-300 text-center max-w-lg text-lg">
            {uploaderDescription}
        </p>
    </div>
);


interface ResultsViewProps {
    stage: 'generating' | 'results';
    originalImage: string | null;
    onDownloadOriginal?: () => void;
    children: React.ReactNode;
    actions: React.ReactNode;
    isMobile?: boolean;
    error?: string | null;
    hasPartialError?: boolean;
}

/**
 * A reusable component to display the results of an image generation process.
 */
export const ResultsView: React.FC<ResultsViewProps> = ({ stage, originalImage, onDownloadOriginal, children, actions, isMobile, error, hasPartialError }) => {
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

            <div className="w-full flex-1 flex items-start md:items-center justify-center overflow-y-auto md:overflow-x-auto py-4">
                <motion.div
                    layout
                    className="flex flex-col md:flex-row flex-nowrap items-stretch md:items-center justify-start gap-8 px-4 md:px-8 w-full md:w-max mx-auto py-4"
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
                            <PolaroidCard
                                caption="Ảnh gốc"
                                status="done"
                                imageUrl={originalImage}
                                onDownload={onDownloadOriginal}
                                isMobile={isMobile}
                            />
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