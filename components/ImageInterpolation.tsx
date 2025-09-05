/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, ChangeEvent, useRef } from 'react';
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
    OptionsPanel,
    PromptResultCard
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
    
    const appStateRef = useRef(appState);
    useEffect(() => {
        appStateRef.current = appState;
    });

    const handleImageUpload = (
        imageSetter: (url: string) => void
    ) => (e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
            imageSetter(imageDataUrl);
            addImagesToGallery([imageDataUrl]);
        });
    };

    const handleInputImageChange = (url: string) => {
        onStateChange({ 
            ...appState, 
            inputImage: url, 
            stage: 'idle', 
            generatedPrompt: '',
            promptSuggestions: '',
            additionalNotes: '',
            referenceImage: null,
            generatedImage: null,
            finalPrompt: null,
            historicalImages: [],
            error: null,
        });
        addImagesToGallery([url]);
    };
    const handleOutputImageChange = (url: string) => {
        onStateChange({ 
            ...appState, 
            outputImage: url, 
            stage: 'idle', 
            generatedPrompt: '',
            promptSuggestions: '',
            additionalNotes: '',
            referenceImage: null,
            generatedImage: null,
            finalPrompt: null,
            historicalImages: [],
            error: null,
        });
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

    const handleAnalyzeClick = async () => {
        if (!appState.inputImage || !appState.outputImage) return;

        onStateChange({ ...appStateRef.current, stage: 'prompting', error: null });
        try {
            const result = await analyzeImagePairForPrompt(appState.inputImage, appState.outputImage);
            onStateChange({ ...appStateRef.current, stage: 'configuring', generatedPrompt: result.mainPrompt, promptSuggestions: result.suggestions || '' });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appStateRef.current, stage: 'idle', generatedPrompt: '', promptSuggestions: '', error: `Lỗi phân tích ảnh: ${errorMessage}` });
        }
    };

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
    const showRefUploader = appState.stage === 'configuring' || appState.stage === 'prompting';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
                {(appState.stage !== 'generating' && appState.stage !== 'results') && <AppScreenHeader {...headerProps} />}
            </AnimatePresence>

            {appState.stage === 'idle' && (
                <>
                    <motion.div className="flex flex-col md:flex-row items-start justify-center gap-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <Uploader id="input-upload" onUpload={handleImageUpload(handleInputImageChange)} onImageChange={handleInputImageChange} caption={uploaderCaptionInput} description={uploaderDescriptionInput} currentImage={appState.inputImage} placeholderType="magic" />
                        <Uploader id="output-upload" onUpload={handleImageUpload(handleOutputImageChange)} onImageChange={handleOutputImageChange} caption={uploaderCaptionOutput} description={uploaderDescriptionOutput} currentImage={appState.outputImage} placeholderType="magic" />
                    </motion.div>

                    {appState.inputImage && appState.outputImage && (
                        <motion.div 
                            className="mt-8 text-center"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            {appState.error && <p className="text-red-400 mb-4">{appState.error}</p>}
                            <button 
                                onClick={handleAnalyzeClick} 
                                className="btn btn-primary"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Đang phân tích...' : 'Phân tích & Tạo Prompt'}
                            </button>
                        </motion.div>
                    )}
                </>
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
                                disabled={appState.stage === 'prompting'}
                            />
                        </div>

                        {appState.promptSuggestions && (
                            <div className="space-y-2">
                                <label className="block text-left base-font font-bold text-lg text-neutral-200">Gợi ý chỉnh sửa</label>
                                <div className="flex flex-wrap gap-2">
                                    {appState.promptSuggestions.split('\n').map(s => s.replace(/^- /, '').trim()).filter(s => s).map((s, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => onStateChange({ ...appState, additionalNotes: `${appState.additionalNotes}${appState.additionalNotes ? '\n' : ''}- ${s}` })}
                                            className="bg-neutral-800/80 border border-neutral-700 text-neutral-300 text-xs px-3 py-1.5 rounded-full hover:bg-neutral-700/80 transition-colors"
                                            title={`Thêm: ${s}`}
                                        >
                                            + {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

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
                        <PromptResultCard 
                            title="Prompt cuối cùng đã sử dụng"
                            promptText={appState.finalPrompt}
                            className="md:max-w-xs"
                        />
                    </motion.div>
                </ResultsView>
            )}

            <Lightbox images={lightboxImages} selectedIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
        </div>
    );
};

export default ImageInterpolation;
