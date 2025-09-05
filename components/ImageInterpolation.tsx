/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, ChangeEvent, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeImagePairForPrompt, editImageWithPrompt, interpolatePrompts, adaptPromptToContext } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    handleFileUpload,
    downloadAllImagesAsZip,
    ImageForZip,
    ResultsView,
    type ImageInterpolationState,
    useLightbox,
    OptionsPanel
} from './uiUtils';

interface ImageInterpolationProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaptionInput: string;
    uploaderDescriptionInput: string;
    uploaderCaptionOutput: string;
    uploaderDescriptionOutput: string;
    uploaderCaptionReference: string;
    uploaderDescriptionReference: string;
    addImagesToGallery: (images: string[]) => void;
    appState: ImageInterpolationState;
    onStateChange: (newState: ImageInterpolationState) => void;
    onReset: () => void;
    onGoBack: () => void;
}

const ASPECT_RATIO_OPTIONS = ['Giữ nguyên', '1:1', '2:3', '4:5', '9:16', '1:2', '3:2', '5:4', '16:9', '2:1'];

const ImageInterpolation: React.FC<ImageInterpolationProps> = (props) => {
    const { 
        uploaderCaptionInput, uploaderDescriptionInput,
        uploaderCaptionOutput, uploaderDescriptionOutput,
        uploaderCaptionReference, uploaderDescriptionReference,
        addImagesToGallery, appState, onStateChange, onReset,
        ...headerProps
    } = props;

    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const lightboxImages = [appState.inputImage, appState.outputImage, appState.referenceImage, ...appState.historicalImages.map(h => h.url)].filter((img): img is string => !!img);
    const [isCopied, setIsCopied] = useState(false);

    // --- Image Upload Handlers ---
    const handleImageUpload = (
        imageSetter: (url: string) => void
    ) => (e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
            imageSetter(imageDataUrl);
            addImagesToGallery([imageDataUrl]);
        });
    };

    const handleInputImageChange = (url: string) => {
        onStateChange({ ...appState, inputImage: url, stage: 'idle', generatedPrompt: '' });
        addImagesToGallery([url]);
    };
    const handleOutputImageChange = (url: string) => {
        onStateChange({ ...appState, outputImage: url, stage: 'idle', generatedPrompt: '' });
        addImagesToGallery([url]);
    };
    const handleReferenceImageChange = (url: string) => {
        onStateChange({ ...appState, referenceImage: url });
        addImagesToGallery([url]);
    };

    const handleGeneratedImageChange = (newUrl: string) => {
        const newHistorical = [...appState.historicalImages, { url: newUrl, prompt: appState.finalPrompt || '' }];
        onStateChange({ ...appState, stage: 'results', generatedImage: newUrl, historicalImages: newHistorical });
        addImagesToGallery([newUrl]);
    };
    
    const handleOptionChange = (field: keyof ImageInterpolationState['options'], value: string | boolean) => {
        onStateChange({
            ...appState,
            options: { ...appState.options, [field]: value }
        });
    };

    // --- Main Logic ---
    useEffect(() => {
        const generatePrompt = async () => {
            if (appState.inputImage && appState.outputImage && appState.stage === 'idle' && !appState.generatedPrompt) {
                onStateChange({ ...appState, stage: 'prompting', error: null });
                try {
                    const prompt = await analyzeImagePairForPrompt(appState.inputImage, appState.outputImage);
                    onStateChange({ ...appState, stage: 'configuring', generatedPrompt: prompt });
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                    onStateChange({ ...appState, stage: 'idle', generatedPrompt: '', error: `Lỗi phân tích ảnh: ${errorMessage}` });
                }
            }
        };
        generatePrompt();
    }, [appState.inputImage, appState.outputImage, appState.stage, appState.generatedPrompt, onStateChange]);

    const handleGenerate = async () => {
        if (!appState.referenceImage || !appState.generatedPrompt) return;

        onStateChange({ ...appState, stage: 'generating', error: null, finalPrompt: null });

        let intermediatePrompt = appState.generatedPrompt;
        try {
            if (appState.additionalNotes.trim()) {
                intermediatePrompt = await interpolatePrompts(appState.generatedPrompt, appState.additionalNotes);
            }
            
            const finalPromptText = await adaptPromptToContext(appState.referenceImage, intermediatePrompt);
            
            const resultUrl = await editImageWithPrompt(
                appState.referenceImage,
                finalPromptText,
                appState.options.aspectRatio,
                appState.options.removeWatermark
            );
            const newHistory = [...appState.historicalImages, { url: resultUrl, prompt: finalPromptText }];
            
            onStateChange({ 
                ...appState, 
                stage: 'results', 
                generatedImage: resultUrl, 
                historicalImages: newHistory,
                finalPrompt: finalPromptText, 
            });
            addImagesToGallery([resultUrl]);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ 
                ...appState, 
                stage: 'results', 
                error: errorMessage,
                finalPrompt: intermediatePrompt,
            });
        }
    };

    const handleRegeneration = async (prompt: string) => {
        if (!appState.generatedImage) return;

        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await editImageWithPrompt(
                appState.generatedImage,
                prompt,
                appState.options.aspectRatio,
                appState.options.removeWatermark
            );
            
            const newHistory = [...appState.historicalImages, { url: resultUrl, prompt: prompt }];
            
            onStateChange({ 
                ...appState, 
                stage: 'results', 
                generatedImage: resultUrl, 
                historicalImages: newHistory,
                finalPrompt: prompt,
            });
            addImagesToGallery([resultUrl]);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ 
                ...appState, 
                stage: 'results', 
                error: errorMessage,
                finalPrompt: prompt,
            });
        }
    };

    // --- UI Handlers ---
    const handleBackToOptions = () => onStateChange({ ...appState, stage: 'configuring' });
    const handleDownloadAll = () => {
        if (appState.historicalImages.length === 0) {
            alert('Không có ảnh nào đã tạo để tải về.');
            return;
        }

        const imagesToZip: ImageForZip[] = [];
        if (appState.inputImage) imagesToZip.push({ url: appState.inputImage, filename: 'input-image', folder: 'input' });
        if (appState.outputImage) imagesToZip.push({ url: appState.outputImage, filename: 'output-image', folder: 'input' });
        if (appState.referenceImage) imagesToZip.push({ url: appState.referenceImage, filename: 'reference-image', folder: 'input' });
        
        appState.historicalImages.forEach((item, index) => {
            imagesToZip.push({ url: item.url, filename: `result-${index + 1}`, folder: 'output' });
        });
        
        downloadAllImagesAsZip(imagesToZip, 'image-interpolation-results.zip');
    };

    const handleCopyPrompt = useCallback(() => {
        if (appState.finalPrompt) {
            navigator.clipboard.writeText(appState.finalPrompt).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                alert('Không thể sao chép prompt.');
            });
        }
    }, [appState.finalPrompt]);

    // --- Render Helpers ---
    const Uploader = ({ id, onUpload, caption, description, currentImage, onImageChange, placeholderType }: any) => (
        <div className="flex flex-col items-center gap-4">
            <label htmlFor={id} className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                <ActionablePolaroidCard
                    caption={caption} status="done" imageUrl={currentImage || undefined} placeholderType={placeholderType}
                    onClick={currentImage ? () => openLightbox(lightboxImages.indexOf(currentImage)) : undefined}
                    isEditable={!!currentImage} isSwappable={true} isGallerySelectable={true} onImageChange={onImageChange}
                />
            </label>
            <input id={id} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={onUpload} />
            {description && <p className="base-font font-bold text-neutral-300 text-center max-w-xs text-md">{description}</p>}
        </div>
    );
    
    const isLoading = appState.stage === 'generating' || appState.stage === 'prompting';
    const showRefUploader = appState.inputImage && appState.outputImage;

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
                {(appState.stage !== 'generating' && appState.stage !== 'results') && <AppScreenHeader {...headerProps} />}
            </AnimatePresence>

            {appState.stage === 'idle' && (
                <motion.div className="flex flex-col md:flex-row items-start justify-center gap-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <Uploader id="input-upload" onUpload={handleImageUpload(handleInputImageChange)} onImageChange={handleInputImageChange} caption={uploaderCaptionInput} description={uploaderDescriptionInput} currentImage={appState.inputImage} placeholderType="magic" />
                    <Uploader id="output-upload" onUpload={handleImageUpload(handleOutputImageChange)} onImageChange={handleOutputImageChange} caption={uploaderCaptionOutput} description={uploaderDescriptionOutput} currentImage={appState.outputImage} placeholderType="magic" />
                </motion.div>
            )}

            {(appState.stage === 'prompting' || appState.stage === 'configuring') && (
                 <motion.div className="flex flex-col items-center gap-8 w-full max-w-7xl py-6 overflow-y-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                        <ActionablePolaroidCard imageUrl={appState.inputImage!} caption="Ảnh Input" status="done" onClick={() => appState.inputImage && openLightbox(lightboxImages.indexOf(appState.inputImage))} isEditable={true} isSwappable={true} isGallerySelectable={true} onImageChange={handleInputImageChange} />
                        <ActionablePolaroidCard imageUrl={appState.outputImage!} caption="Ảnh Output" status="done" onClick={() => appState.outputImage && openLightbox(lightboxImages.indexOf(appState.outputImage))} isEditable={true} isSwappable={true} isGallerySelectable={true} onImageChange={handleOutputImageChange} />
                        <AnimatePresence>
                            {showRefUploader && (
                                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                                    <Uploader id="ref-upload" onUpload={handleImageUpload(handleReferenceImageChange)} onImageChange={handleReferenceImageChange} caption={uploaderCaptionReference} currentImage={appState.referenceImage} placeholderType="magic" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <OptionsPanel>
                        <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">Câu lệnh gợi ý (Prompt)</h2>
                        <div>
                            <label htmlFor="generated-prompt" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Prompt được AI phân tích (có thể sửa)</label>
                            <textarea
                                id="generated-prompt"
                                value={appState.generatedPrompt}
                                onChange={(e) => onStateChange({...appState, generatedPrompt: e.target.value})}
                                className="form-input !h-28"
                                placeholder={appState.stage === 'prompting' ? 'Đang phân tích cặp ảnh...' : ''}
                            />
                        </div>
                        <div>
                            <label htmlFor="additional-notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Yêu cầu chỉnh sửa prompt (tùy chọn)</label>
                            <textarea
                                id="additional-notes"
                                value={appState.additionalNotes}
                                onChange={(e) => onStateChange({...appState, additionalNotes: e.target.value})}
                                placeholder="Ví dụ: thay đổi nhân vật chính thành một con chó, tông màu cyberpunk..."
                                className="form-input !h-24"
                            />
                        </div>

                        <div className="space-y-4 pt-2">
                            <div>
                                <label htmlFor="aspect-ratio" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Tỉ lệ khung ảnh</label>
                                <select
                                    id="aspect-ratio"
                                    value={appState.options.aspectRatio}
                                    onChange={(e) => handleOptionChange('aspectRatio', e.target.value)}
                                    className="form-input"
                                >
                                    {ASPECT_RATIO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="remove-watermark-interp"
                                    checked={appState.options.removeWatermark}
                                    onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                    className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800"
                                    aria-label="Xóa watermark nếu có"
                                />
                                <label htmlFor="remove-watermark-interp" className="ml-3 block text-sm font-medium text-neutral-300">
                                    Xóa watermark (nếu có)
                                </label>
                            </div>
                        </div>


                        <div className="flex items-center justify-end gap-4 pt-4">
                            <button onClick={onReset} className="btn btn-secondary">Bắt đầu lại</button>
                            <button onClick={handleGenerate} className="btn btn-primary" disabled={isLoading || !appState.referenceImage || !appState.generatedPrompt.trim()}>
                                {isLoading ? 'Đang tạo...' : 'Tạo ảnh'}
                            </button>
                        </div>
                    </OptionsPanel>
                </motion.div>
            )}

            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView stage={appState.stage} originalImage={appState.referenceImage} onOriginalClick={() => appState.referenceImage && openLightbox(lightboxImages.indexOf(appState.referenceImage))} error={appState.error}
                    actions={(
                        <>
                            {appState.generatedImage && !appState.error && (<button onClick={handleDownloadAll} className="btn btn-primary">Tải về tất cả</button>)}
                            <button onClick={handleBackToOptions} className="btn btn-secondary">Chỉnh sửa</button>
                            <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">Bắt đầu lại</button>
                        </>
                    )}>
                    <motion.div className="w-full md:w-auto flex-shrink-0" key="generated-interpolation" initial={{ opacity: 0, scale: 0.5, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.2 }} whileHover={{ scale: 1.05, zIndex: 10 }}>
                        <ActionablePolaroidCard
                            caption="Kết quả"
                            status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            imageUrl={appState.generatedImage ?? undefined}
                            error={appState.error ?? undefined}
                            isDownloadable={true}
                            isEditable={true}
                            isRegeneratable={true}
                            onRegenerate={handleRegeneration}
                            regenerationTitle="Tinh chỉnh ảnh nội suy"
                            regenerationDescription="Thêm yêu cầu để cải thiện ảnh kết quả."
                            regenerationPlaceholder="Ví dụ: làm cho màu sắc rực rỡ hơn, thêm các ngôi sao..."
                            onImageChange={handleGeneratedImageChange}
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined}
                        />
                    </motion.div>
                    <motion.div
                        className="w-full md:w-auto flex-shrink-0 flex self-stretch"
                        key="final-prompt-card"
                        initial={{ opacity: 0, scale: 0.5, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.3 }}
                    >
                        <div className="bg-neutral-100 p-4 flex flex-col w-full md:max-w-xs rounded-md shadow-lg relative">
                            {appState.finalPrompt && (
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
                                Prompt cuối cùng đã sử dụng
                            </h4>
                            <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2">
                                <p className="text-sm whitespace-pre-wrap text-neutral-700 base-font">
                                    {appState.finalPrompt}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </ResultsView>
            )}

            <Lightbox images={lightboxImages} selectedIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
        </div>
    );
};

export default ImageInterpolation;
