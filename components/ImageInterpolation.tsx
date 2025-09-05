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
    ImageForZip,
    ResultsView,
    type ImageInterpolationState,
    useLightbox,
    OptionsPanel,
    PromptResultCard,
    useVideoGeneration,
    processAndDownloadAll,
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

// FIX: Added 'export' to the component and implemented the JSX return to fix type errors.
export const ImageInterpolation: React.FC<ImageInterpolationProps> = (props) => {
    const { 
        uploaderCaptionInput, uploaderDescriptionInput,
        uploaderCaptionOutput, uploaderDescriptionOutput,
        uploaderCaptionReference, uploaderDescriptionReference,
        addImagesToGallery, appState, onStateChange, onReset,
        ...headerProps
    } = props;

    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();
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

    const handleDownloadAll = () => {
        const inputImages: ImageForZip[] = [];
        if (appState.inputImage) inputImages.push({ url: appState.inputImage, filename: 'anh-truoc', folder: 'input' });
        if (appState.outputImage) inputImages.push({ url: appState.outputImage, filename: 'anh-sau', folder: 'input' });
        if (appState.referenceImage) inputImages.push({ url: appState.referenceImage, filename: 'anh-tham-chieu', folder: 'input' });
        
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            videoTasks,
            zipFilename: 'ket-qua-noi-suy-anh.zip',
            baseOutputFilename: 'ket-qua-noi-suy',
        });
    };

    const Uploader = ({ id, onUpload, onImageChange, caption, description, currentImage, placeholderType }: any) => (
        <div className="flex flex-col items-center gap-4">
            <label htmlFor={id} className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                <ActionablePolaroidCard
                    caption={caption} status="done" mediaUrl={currentImage || undefined} placeholderType={placeholderType}
                    onClick={currentImage ? () => openLightbox(lightboxImages.indexOf(currentImage)) : undefined}
                    isEditable={!!currentImage} isSwappable={true} isGallerySelectable={true} onImageChange={onImageChange}
                />
            </label>
            <input id={id} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={onUpload} />
            {description && <p className="base-font font-bold text-neutral-300 text-center max-w-xs text-md">{description}</p>}
        </div>
    );

    const isLoading = appState.stage === 'prompting' || appState.stage === 'generating';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
                {appState.stage !== 'results' && appState.stage !== 'generating' && (
                    <AppScreenHeader {...headerProps} />
                )}
            </AnimatePresence>

            {appState.stage === 'idle' && (
                <motion.div className="flex flex-col items-center gap-8 w-full max-w-5xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="flex flex-col md:flex-row items-start justify-center gap-8">
                        <Uploader id="interp-input-upload" onUpload={handleImageUpload(handleInputImageChange)} onImageChange={handleInputImageChange} caption={uploaderCaptionInput} description={uploaderDescriptionInput} currentImage={appState.inputImage} placeholderType="magic" />
                        <Uploader id="interp-output-upload" onUpload={handleImageUpload(handleOutputImageChange)} onImageChange={handleOutputImageChange} caption={uploaderCaptionOutput} description={uploaderDescriptionOutput} currentImage={appState.outputImage} placeholderType="magic" />
                    </div>
                    {appState.error && <p className="text-red-400 mt-4">{appState.error}</p>}
                    <button onClick={handleAnalyzeClick} className="btn btn-primary mt-4" disabled={!appState.inputImage || !appState.outputImage || isLoading}>
                        {isLoading ? 'Đang phân tích...' : 'Phân tích sự biến đổi'}
                    </button>
                </motion.div>
            )}

            {(appState.stage === 'prompting' || appState.stage === 'configuring') && (
                 <motion.div className="flex flex-col items-stretch gap-6 w-full max-w-7xl py-6 overflow-y-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                     <div className="flex flex-col md:flex-row items-center justify-center gap-6 flex-shrink-0">
                         <ActionablePolaroidCard mediaUrl={appState.inputImage!} caption="Ảnh Trước" status="done" onClick={() => openLightbox(lightboxImages.indexOf(appState.inputImage!))} />
                         <div className="text-4xl font-bold text-yellow-400">→</div>
                         <ActionablePolaroidCard mediaUrl={appState.outputImage!} caption="Ảnh Sau" status="done" onClick={() => openLightbox(lightboxImages.indexOf(appState.outputImage!))} />
                     </div>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                         <OptionsPanel>
                             <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">Prompt được tạo ra</h2>
                             {isLoading && appState.stage === 'prompting' ? (
                                <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div></div>
                             ) : (
                                <>
                                    <PromptResultCard title="Prompt chính" promptText={appState.generatedPrompt} />
                                    <PromptResultCard title="Gợi ý sáng tạo" promptText={appState.promptSuggestions} />
                                </>
                             )}
                         </OptionsPanel>
                         <OptionsPanel>
                             <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">Áp dụng cho ảnh mới</h2>
                             <Uploader id="interp-ref-upload" onUpload={handleImageUpload((url) => onStateChange({...appState, referenceImage: url}))} onImageChange={handleReferenceImageChange} caption={uploaderCaptionReference} description={uploaderDescriptionReference} currentImage={appState.referenceImage} placeholderType="magic" />
                             <div className="mt-4 space-y-4">
                                <div>
                                    <label htmlFor="additional-notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Ghi chú (Tùy chỉnh Prompt)</label>
                                    <textarea id="additional-notes" value={appState.additionalNotes} onChange={(e) => onStateChange({...appState, additionalNotes: e.target.value})} placeholder="Ví dụ: thay đổi tông màu thành xanh dương..." className="form-input h-20" rows={2} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div>
                                        <label htmlFor="aspect-ratio-interp" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Tỉ lệ khung ảnh</label>
                                        <select id="aspect-ratio-interp" value={appState.options.aspectRatio} onChange={(e) => handleOptionChange('aspectRatio', e.target.value)} className="form-input">
                                            {ASPECT_RATIO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center pt-8">
                                        <input type="checkbox" id="remove-watermark-interp" checked={appState.options.removeWatermark} onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)} className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" />
                                        <label htmlFor="remove-watermark-interp" className="ml-3 block text-sm font-medium text-neutral-300">Xóa watermark (nếu có)</label>
                                    </div>
                                </div>
                                 <div className="flex items-center justify-end gap-4 pt-4">
                                     <button onClick={onReset} className="btn btn-secondary">Bắt đầu lại</button>
                                     <button onClick={handleGenerate} className="btn btn-primary" disabled={!appState.referenceImage || isLoading}>{isLoading ? 'Đang tạo...' : 'Tạo ảnh'}</button>
                                 </div>
                             </div>
                         </OptionsPanel>
                     </div>
                 </motion.div>
            )}
            
            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView
                    stage={appState.stage}
                    originalImage={appState.referenceImage}
                    onOriginalClick={() => openLightbox(lightboxImages.indexOf(appState.referenceImage!))}
                    error={appState.error}
                    actions={(
                        <>
                            {appState.generatedImage && !appState.error && (<button onClick={handleDownloadAll} className="btn btn-primary">Tải về tất cả</button>)}
                            <button onClick={() => onStateChange({...appState, stage: 'configuring'})} className="btn btn-secondary">Chỉnh sửa</button>
                            <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">Bắt đầu lại</button>
                        </>
                    )}
                >
                     <motion.div className="w-full md:w-auto flex-shrink-0" key="generated-interp" initial={{ opacity: 0, scale: 0.5, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.2 }}>
                        <ActionablePolaroidCard
                            caption="Kết quả"
                            status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            mediaUrl={appState.generatedImage ?? undefined} error={appState.error ?? undefined}
                            isDownloadable={true} isEditable={true} isRegeneratable={true}
                            onImageChange={handleGeneratedImageChange}
                            onRegenerate={handleRegeneration}
                            onGenerateVideoFromPrompt={(prompt) => appState.generatedImage && generateVideo(appState.generatedImage, prompt)}
                            regenerationTitle="Tinh chỉnh ảnh"
                            regenerationDescription="Thêm ghi chú để cải thiện ảnh"
                            regenerationPlaceholder="Ví dụ: thêm hiệu ứng ánh sáng..."
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined}
                        />
                    </motion.div>
                    {appState.historicalImages.map(({ url: sourceUrl }) => {
                        const videoTask = videoTasks[sourceUrl];
                        if (!videoTask) return null;
                        return (
                            <motion.div className="w-full md:w-auto flex-shrink-0" key={`${sourceUrl}-video`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 100, damping: 20 }}>
                                <ActionablePolaroidCard
                                    caption="Video"
                                    status={videoTask.status}
                                    mediaUrl={videoTask.resultUrl}
                                    error={videoTask.error}
                                    isDownloadable={videoTask.status === 'done'}
                                    onClick={videoTask.resultUrl ? () => openLightbox(lightboxImages.indexOf(videoTask.resultUrl!)) : undefined}
                                />
                            </motion.div>
                        );
                    })}
                </ResultsView>
            )}

            <Lightbox images={lightboxImages} selectedIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
        </div>
    );
};
