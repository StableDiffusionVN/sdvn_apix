/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import PolaroidCard from './PolaroidCard';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import { useAppControls, useImageEditor } from './uiContexts';
import { useLightbox } from './uiHooks';
import { ImageThumbnail } from './ImageThumbnail';
import { GalleryToolbar } from './GalleryToolbar';
import { ImageThumbnailActions } from './ImageThumbnailActions';
import { combineImages, downloadJson } from './uiFileUtilities';
import Lightbox from './Lightbox';
export * from './SearchableSelect'; // EXPORT THE NEW COMPONENT

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

// --- Reusable Modal Component ---
interface RegenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmImage: (prompt: string) => void;
    onConfirmVideo?: (prompt: string) => void;
    itemToModify: string | null;
    title?: string;
    description?: string;
    placeholder?: string;
}

export const RegenerationModal: React.FC<RegenerationModalProps> = ({
    isOpen,
    onClose,
    onConfirmImage,
    onConfirmVideo,
    itemToModify,
    title = "Tinh chỉnh hoặc Tạo video",
    description = "Thêm yêu cầu để tinh chỉnh ảnh, hoặc dùng nó để tạo video cho",
    placeholder = "Ví dụ: tông màu ấm, phong cách phim xưa..."
}) => {
    const [customPrompt, setCustomPrompt] = useState('');

    useEffect(() => {
        // Reset prompt when modal is newly opened
        if (isOpen) {
            setCustomPrompt('');
        }
    }, [isOpen]);

    const handleConfirmImage = () => {
        onConfirmImage(customPrompt);
    };

    const handleConfirmVideo = () => {
        if (onConfirmVideo) {
            onConfirmVideo(customPrompt);
        }
    };

    if (!isOpen) {
        return null;
    }

    return ReactDOM.createPortal(
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
                            {onConfirmVideo && (
                                <button onClick={handleConfirmVideo} className="btn btn-secondary btn-sm">
                                    Tạo video
                                </button>
                            )}
                            <button onClick={handleConfirmImage} className="btn btn-primary btn-sm">
                                Tạo lại ảnh
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
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
    onImageChange: (imageDataUrl: string) => void;
    uploaderCaption: string;
    uploaderDescription: string;
    placeholderType?: 'person' | 'architecture' | 'clothing' | 'magic' | 'style';
}

/**
 * A reusable image uploader component with a Polaroid card style.
 */
export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageChange, uploaderCaption, uploaderDescription, placeholderType = 'person' }) => {
    return (
        <div className="flex flex-col items-center justify-center w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                 <ActionablePolaroidCard
                    type="uploader"
                    caption={uploaderCaption}
                    status="done"
                    mediaUrl={undefined}
                    placeholderType={placeholderType}
                    onImageChange={onImageChange}
                />
            </motion.div>
            <p className="mt-8 base-font font-bold text-neutral-300 text-center max-w-lg text-lg">
                {uploaderDescription}
            </p>
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
    const { currentView, t } = useAppControls();

    const getExportableState = (state: any) => {
        // Create a deep copy to avoid mutating the original state
        const exportableState = JSON.parse(JSON.stringify(state));

        // Define keys that hold output data or large, non-essential data
        const keysToRemove = [
            'generatedImage', 
            'generatedImages', 
            'historicalImages', 
            'finalPrompt',
            'error',
            // for image-interpolation
            'generatedPrompt',
            'promptSuggestions',
        ];

        // Recursively remove the keys from the state object
        const removeKeys = (obj: any) => {
            if (typeof obj !== 'object' || obj === null) {
                return;
            }

            for (const key of keysToRemove) {
                if (key in obj) {
                    delete obj[key];
                }
            }
            
            // Also reset stage to a configurable one if it exists
            if ('stage' in obj && (obj.stage === 'generating' || obj.stage === 'results' || obj.stage === 'prompting')) {
                // Find a sensible default stage.
                if (currentView.viewId === 'free-generation') {
                    obj.stage = 'configuring';
                } else if (
                    ('uploadedImage' in obj && obj.uploadedImage) ||
                    ('modelImage' in obj && obj.modelImage && 'clothingImage' in obj && obj.clothingImage) ||
                    ('contentImage' in obj && obj.contentImage && 'styleImage' in obj && obj.styleImage) ||
                    ('inputImage' in obj && obj.inputImage && 'outputImage' in obj && obj.outputImage)
                ) {
                     obj.stage = 'configuring';
                } else {
                    obj.stage = 'idle';
                }
            }


            // Recurse into nested objects
            for (const key in obj) {
                if (typeof obj[key] === 'object') {
                    removeKeys(obj[key]);
                }
            }
        };

        removeKeys(exportableState);
        return exportableState;
    };
    
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

            <div className="w-full flex-1 flex items-start justify-start overflow-y-auto overflow-x-auto py-4">
                <motion.div
                    layout
                    className="flex flex-col md:flex-row md:flex-nowrap items-center md:items-stretch gap-6 md:gap-8 px-4 md:px-8 w-full md:w-max mx-auto py-4"
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
                        <button
                          className="btn btn-secondary"
                          onClick={() => downloadJson({ viewId: currentView.viewId, state: getExportableState(currentView.state) }, `aPix-${currentView.viewId}-settings.json`)}
                          title={t('common_exportSettings_tooltip')}
                        >
                            {t('common_exportSettings')}
                        </button>
                        {actions}
                    </motion.div>
                )}
            </div>
        </div>
    );
};


// --- Reusable Layout Components for App Screens ---

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

// --- Slider Component ---

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


// --- Gallery Picker Component with Drag & Drop ---
interface GalleryPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (imageUrl: string) => void;
    images: string[];
}

export const GalleryPicker: React.FC<GalleryPickerProps> = ({ isOpen, onClose, onSelect, images }) => {
    const { addImagesToGallery, removeImageFromGallery, replaceImageInGallery } = useAppControls();
    const { openImageEditor } = useImageEditor();
    const { 
        lightboxIndex, 
        openLightbox, 
        closeLightbox, 
        navigateLightbox 
    } = useLightbox();
    
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const isDroppingRef = useRef(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [isCombining, setIsCombining] = useState(false);

    useEffect(() => {
        closeLightbox();
        if (!isOpen) {
            setIsSelectionMode(false);
            setSelectedIndices([]);
        }
    }, [isOpen, closeLightbox]);
    
    const handleToggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedIndices([]);
    };

    const handleDeleteSelected = () => {
        if (selectedIndices.length === 0) return;
        const sortedIndices = [...selectedIndices].sort((a, b) => b - a);
        sortedIndices.forEach(index => removeImageFromGallery(index));
        setSelectedIndices([]);
        setIsSelectionMode(false);
    };

    const handleThumbnailClick = (index: number) => {
        if (isSelectionMode) {
            setSelectedIndices(prev =>
                prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
            );
        } else {
            onSelect(images[index]);
        }
    };
    
    const handleEditImage = (indexToEdit: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const urlToEdit = images[indexToEdit];
        if (!urlToEdit || urlToEdit.startsWith('blob:')) {
            alert('Không thể chỉnh sửa video.');
            return;
        };

        openImageEditor(urlToEdit, (newUrl) => {
            replaceImageInGallery(indexToEdit, newUrl);
        });
    };

     const handleCombine = async (direction: 'horizontal' | 'vertical') => {
        if (selectedIndices.length < 2) return;
        setIsCombining(true);
        try {
            const itemsToCombine = selectedIndices.map(index => ({
                url: images[index],
                label: '' // Gallery picker doesn't manage labels, so they are empty.
            }));
            const resultUrl = await combineImages(itemsToCombine, {
                layout: direction,
                gap: 0,
                backgroundColor: '#FFFFFF',
                labels: { enabled: false }
            });
            addImagesToGallery([resultUrl]);
            // Reset state after combining
            setSelectedIndices([]);
            setIsSelectionMode(false);
        } catch (err) {
            console.error("Failed to combine images in picker:", err);
            alert(`Lỗi: Không thể ghép ảnh. ${err instanceof Error ? err.message : "Lỗi không xác định."}`);
        } finally {
            setIsCombining(false);
        }
    };
    
    const handleQuickView = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        openLightbox(index);
    };

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
    <>
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
                        <GalleryToolbar
                            isSelectionMode={isSelectionMode}
                            selectedCount={selectedIndices.length}
                            imageCount={images.length}
                            title="Chọn ảnh từ Thư viện"
                            isCombining={isCombining}
                            onToggleSelectionMode={handleToggleSelectionMode}
                            onDeleteSelected={handleDeleteSelected}
                            onClose={handleClose}
                            onCombineHorizontal={() => handleCombine('horizontal')}
                            onCombineVertical={() => handleCombine('vertical')}
                        />
                        {images.length > 0 ? (
                            <div className="gallery-grid">
                                {images.map((img, index) => (
                                    <ImageThumbnail
                                        key={`${img.slice(-20)}-${index}`}
                                        index={index}
                                        imageUrl={img}
                                        isSelectionMode={isSelectionMode}
                                        isSelected={selectedIndices.includes(index)}
                                        onSelect={handleThumbnailClick}
                                        onEdit={handleEditImage}
                                        onDelete={(indexToDelete, e) => {
                                            e.stopPropagation();
                                           removeImageFromGallery(indexToDelete);
                                        }}
                                        onQuickView={handleQuickView}
                                    />
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
        </AnimatePresence>
    <Lightbox images={images} selectedIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
    </>,
        document.body
    );
};

// --- Reusable Prompt Result Card ---

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
        <div className={cn("prompt-card", className)}>
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
            <div className="prompt-card-content">
                <p className="text-sm whitespace-pre-wrap text-neutral-700 base-font">
                    {promptText || '...'}
                </p>
            </div>
        </div>
    );
};

// --- NEW: Webcam Capture Modal ---
interface WebcamCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (imageDataUrl: string) => void;
}

export const WebcamCaptureModal: React.FC<WebcamCaptureModalProps> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);

    useEffect(() => {
        const startWebcam = async () => {
            setError(null);
            setIsStreaming(false);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false,
                });
                streamRef.current = mediaStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.onloadedmetadata = () => {
                        setIsStreaming(true);
                    };
                }
            } catch (err) {
                console.error("Webcam error:", err);
                if (err instanceof DOMException && err.name === 'NotAllowedError') {
                    setError("Bạn cần cấp quyền truy cập camera trong trình duyệt để sử dụng tính năng này.");
                } else {
                    setError("Không thể truy cập camera. Vui lòng kiểm tra lại thiết bị của bạn.");
                }
            }
        };

        const stopWebcam = () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            setIsStreaming(false);
        };

        if (isOpen) {
            startWebcam();
        } else {
            stopWebcam();
        }

        return () => {
            stopWebcam();
        };
    }, [isOpen]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current && isStreaming) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                onCapture(dataUrl);
            }
            onClose();
        }
    };
    
    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="modal-overlay z-[80]"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="modal-content !max-w-3xl"
                    >
                         <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="base-font font-bold text-2xl text-yellow-400">Chụp ảnh từ Webcam</h3>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Đóng webcam">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="aspect-video bg-neutral-900 rounded-md overflow-hidden relative flex items-center justify-center">
                            {error ? (
                                <div className="text-center p-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <p className="text-red-300">{error}</p>
                                </div>
                            ) : (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className={cn(
                                            "w-full h-full object-cover transition-opacity duration-300",
                                            isStreaming ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {!isStreaming && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <svg className="animate-spin h-8 w-8 text-neutral-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        </div>
                                    )}
                                </>
                            )}
                            <canvas ref={canvasRef} className="hidden" />
                        </div>
                         <div className="flex justify-end items-center gap-4 mt-4">
                            <button onClick={onClose} className="btn btn-secondary btn-sm">Hủy</button>
                            <button onClick={handleCapture} className="btn btn-primary btn-sm" disabled={!isStreaming || !!error}>Chụp ảnh</button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};