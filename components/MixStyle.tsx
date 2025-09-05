/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useCallback, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mixImageStyle, editImageWithPrompt } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    handleFileUpload,
    useMediaQuery,
    ImageForZip,
    Slider,
    ResultsView,
    type MixStyleState,
    useLightbox,
    useVideoGeneration,
    processAndDownloadAll,
} from './uiUtils';

interface MixStyleProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaptionContent: string;
    uploaderDescriptionContent: string;
    uploaderCaptionStyle: string;
    uploaderDescriptionStyle: string;
    addImagesToGallery: (images: string[]) => void;
    appState: MixStyleState;
    onStateChange: (newState: MixStyleState) => void;
    onReset: () => void;
    onGoBack: () => void;
}

const STYLE_STRENGTH_OPTIONS = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'] as const;

const MixStyle: React.FC<MixStyleProps> = (props) => {
    const { 
        uploaderCaptionContent, uploaderDescriptionContent,
        uploaderCaptionStyle, uploaderDescriptionStyle,
        addImagesToGallery,
        appState, onStateChange, onReset,
        ...headerProps
    } = props;

    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();
    const isMobile = useMediaQuery('(max-width: 768px)');

    const lightboxImages = [appState.contentImage, appState.styleImage, ...appState.historicalImages].filter((img): img is string => !!img);

    const handleContentImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
            onStateChange({
                ...appState,
                stage: appState.styleImage ? 'configuring' : 'idle',
                contentImage: imageDataUrl,
                generatedImage: null,
                historicalImages: [],
                error: null,
            });
            addImagesToGallery([imageDataUrl]);
        });
    };

    const handleStyleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
            onStateChange({
                ...appState,
                stage: appState.contentImage ? 'configuring' : 'idle',
                styleImage: imageDataUrl,
                generatedImage: null,
                historicalImages: [],
                error: null,
            });
            addImagesToGallery([imageDataUrl]);
        });
    };
    
    const handleContentImageChange = (newUrl: string) => {
        onStateChange({
            ...appState,
            stage: appState.styleImage ? 'configuring' : 'idle',
            contentImage: newUrl,
        });
        addImagesToGallery([newUrl]);
    };
    const handleStyleImageChange = (newUrl: string) => {
        onStateChange({
            ...appState,
            stage: appState.contentImage ? 'configuring' : 'idle',
            styleImage: newUrl,
        });
        addImagesToGallery([newUrl]);
    };
    const handleGeneratedImageChange = (newUrl: string) => {
        const newHistorical = [...appState.historicalImages, newUrl];
        onStateChange({ ...appState, stage: 'results', generatedImage: newUrl, historicalImages: newHistorical });
        addImagesToGallery([newUrl]);
    };

    const handleOptionChange = (field: keyof MixStyleState['options'], value: string | boolean) => {
        onStateChange({
            ...appState,
            options: { ...appState.options, [field]: value },
        });
    };

    const executeInitialGeneration = async () => {
        if (!appState.contentImage || !appState.styleImage) return;
        
        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await mixImageStyle(appState.contentImage, appState.styleImage, appState.options);
            onStateChange({
                ...appState,
                stage: 'results',
                generatedImage: resultUrl,
                historicalImages: [...appState.historicalImages, resultUrl],
            });
            addImagesToGallery([resultUrl]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, stage: 'results', error: errorMessage });
        }
    };
    
    const handleRegeneration = async (prompt: string) => {
        if (!appState.generatedImage) return;

        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await editImageWithPrompt(appState.generatedImage, prompt);
            onStateChange({
                ...appState,
                stage: 'results',
                generatedImage: resultUrl,
                historicalImages: [...appState.historicalImages, resultUrl],
            });
            addImagesToGallery([resultUrl]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, stage: 'results', error: errorMessage });
        }
    };
    
    const handleBackToOptions = () => {
        onStateChange({ ...appState, stage: 'configuring', error: null });
    };

    const handleDownloadAll = () => {
        const inputImages: ImageForZip[] = [];
        if (appState.contentImage) {
            inputImages.push({ url: appState.contentImage, filename: 'anh-noi-dung-goc', folder: 'input' });
        }
        if (appState.styleImage) {
            inputImages.push({ url: appState.styleImage, filename: 'anh-style-goc', folder: 'input' });
        }

        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            videoTasks,
            zipFilename: 'ket-qua-tron-style.zip',
            baseOutputFilename: 'ket-qua-tron-style',
        });
    };

    const Uploader = ({ id, onUpload, caption, description, currentImage, placeholderType, onImageChange }: any) => (
        <div className="flex flex-col items-center gap-4">
            <label htmlFor={id} className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                {/* FIX: Replaced incorrect 'imageUrl' prop with 'mediaUrl'. */}
                <ActionablePolaroidCard
                    caption={caption}
                    status="done"
                    mediaUrl={currentImage || undefined}
                    placeholderType={placeholderType}
                    onClick={currentImage ? () => openLightbox(lightboxImages.indexOf(currentImage)) : undefined}
                    isEditable={!!currentImage}
                    isSwappable={true}
                    isGallerySelectable={true}
                    onImageChange={onImageChange}
                />
            </label>
            <input id={id} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={onUpload} />
            <p className="base-font font-bold text-neutral-300 text-center max-w-xs text-md">
                {description}
            </p>
        </div>
    );
    
    const isLoading = appState.stage === 'generating';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
             <AnimatePresence>
                {(appState.stage === 'idle' || appState.stage === 'configuring') && (
                    <AppScreenHeader {...headerProps} />
                )}
            </AnimatePresence>

            {appState.stage === 'idle' && (
                <motion.div
                    className="flex flex-col md:flex-row items-start justify-center gap-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Uploader 
                        id="content-upload"
                        onUpload={handleContentImageUpload}
                        onImageChange={handleContentImageChange}
                        caption={uploaderCaptionContent}
                        description={uploaderDescriptionContent}
                        currentImage={appState.contentImage}
                        placeholderType="magic"
                    />
                     <Uploader 
                        id="style-upload"
                        onUpload={handleStyleImageUpload}
                        onImageChange={handleStyleImageChange}
                        caption={uploaderCaptionStyle}
                        description={uploaderDescriptionStyle}
                        currentImage={appState.styleImage}
                        placeholderType="style"
                    />
                </motion.div>
            )}

            {appState.stage === 'configuring' && appState.contentImage && appState.styleImage && (
                <motion.div
                    className="flex flex-col items-center gap-8 w-full max-w-7xl py-6 overflow-y-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                        {/* FIX: Replaced incorrect 'imageUrl' prop with 'mediaUrl'. */}
                        <ActionablePolaroidCard mediaUrl={appState.contentImage} caption="Ảnh nội dung" status="done" onClick={() => appState.contentImage && openLightbox(lightboxImages.indexOf(appState.contentImage))} isEditable={true} isSwappable={true} isGallerySelectable={true} onImageChange={handleContentImageChange} />
                        {/* FIX: Replaced incorrect 'imageUrl' prop with 'mediaUrl'. */}
                        <ActionablePolaroidCard mediaUrl={appState.styleImage} caption="Ảnh phong cách" status="done" onClick={() => appState.styleImage && openLightbox(lightboxImages.indexOf(appState.styleImage))} isEditable={true} isSwappable={true} isGallerySelectable={true} onImageChange={handleStyleImageChange} />
                    </div>

                    <div className="w-full max-w-3xl bg-black/20 p-6 rounded-lg border border-white/10 space-y-4">
                        <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">Tùy chỉnh</h2>
                        
                        <Slider
                            label="Mức độ ảnh hưởng Style"
                            options={STYLE_STRENGTH_OPTIONS}
                            value={appState.options.styleStrength}
                            onChange={(value) => handleOptionChange('styleStrength', value)}
                        />

                        <div>
                            <label htmlFor="notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Ghi chú bổ sung</label>
                            <textarea
                                id="notes" value={appState.options.notes} onChange={(e) => handleOptionChange('notes', e.target.value)}
                                placeholder="Ví dụ: nhấn mạnh vào màu đỏ, giữ lại chi tiết mắt..."
                                className="form-input h-24" rows={3}
                            />
                        </div>
                        
                        <div className="flex items-center pt-2">
                            <input
                                type="checkbox"
                                id="remove-watermark-mix"
                                checked={appState.options.removeWatermark}
                                onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800"
                                aria-label="Xóa watermark nếu có"
                            />
                            <label htmlFor="remove-watermark-mix" className="ml-3 block text-sm font-medium text-neutral-300">
                                Xóa watermark (nếu có)
                            </label>
                        </div>
                        <div className="flex items-center justify-end gap-4 pt-4">
                            <button onClick={onReset} className="btn btn-secondary">
                                Đổi ảnh khác
                            </button>
                            <button onClick={executeInitialGeneration} className="btn btn-primary" disabled={isLoading}>
                                {isLoading ? 'Đang trộn...' : 'Trộn Style'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView
                    stage={appState.stage}
                    originalImage={appState.contentImage}
                    onOriginalClick={() => appState.contentImage && openLightbox(lightboxImages.indexOf(appState.contentImage))}
                    error={appState.error}
                    isMobile={isMobile}
                    actions={(
                        <>
                            {appState.generatedImage && !appState.error && (
                                <button onClick={handleDownloadAll} className="btn btn-primary">Tải về tất cả</button>
                            )}
                            <button onClick={handleBackToOptions} className="btn btn-secondary">Chỉnh sửa tùy chọn</button>
                            <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">Bắt đầu lại</button>
                        </>
                    )}
                >
                    {appState.styleImage && (
                        <motion.div key="style" className="w-full md:w-auto flex-shrink-0" whileHover={{ scale: 1.05, zIndex: 10 }} transition={{ duration: 0.2 }}>
                            {/* FIX: Replaced incorrect 'imageUrl' prop with 'mediaUrl'. */}
                            <ActionablePolaroidCard caption="Ảnh phong cách" status="done" mediaUrl={appState.styleImage} isMobile={isMobile} onClick={() => appState.styleImage && openLightbox(lightboxImages.indexOf(appState.styleImage))} isEditable={true} onImageChange={handleStyleImageChange} />
                        </motion.div>
                    )}
                    <motion.div
                        className="w-full md:w-auto flex-shrink-0"
                        key="generated-mix"
                        initial={{ opacity: 0, scale: 0.5, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.2 }}
                        whileHover={{ scale: 1.05, zIndex: 10 }}
                    >
                        {/* FIX: Replaced incorrect 'imageUrl' prop with 'mediaUrl'. */}
                        <ActionablePolaroidCard
                            caption="Kết quả"
                            status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            mediaUrl={appState.generatedImage ?? undefined}
                            error={appState.error ?? undefined}
                            isDownloadable={true}
                            isEditable={true}
                            isRegeneratable={true}
                            onImageChange={handleGeneratedImageChange}
                            onRegenerate={handleRegeneration}
                            onGenerateVideoFromPrompt={(prompt) => appState.generatedImage && generateVideo(appState.generatedImage, prompt)}
                            regenerationTitle="Tinh chỉnh ảnh"
                            regenerationDescription="Thêm ghi chú để cải thiện ảnh"
                            regenerationPlaceholder="Ví dụ: làm cho màu sắc tươi hơn, ít chi tiết hơn..."
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined}
                            isMobile={isMobile}
                        />
                    </motion.div>
                     {appState.historicalImages.map(sourceUrl => {
                        const videoTask = videoTasks[sourceUrl];
                        if (!videoTask) return null;
                        return (
                            <motion.div
                                className="w-full md:w-auto flex-shrink-0"
                                key={`${sourceUrl}-video`}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                            >
                                <ActionablePolaroidCard
                                    caption="Video"
                                    status={videoTask.status}
                                    mediaUrl={videoTask.resultUrl}
                                    error={videoTask.error}
                                    isDownloadable={videoTask.status === 'done'}
                                    onClick={videoTask.resultUrl ? () => openLightbox(lightboxImages.indexOf(videoTask.resultUrl!)) : undefined}
                                    isMobile={isMobile}
                                />
                            </motion.div>
                        );
                    })}
                </ResultsView>
            )}

            <Lightbox
                images={lightboxImages}
                selectedIndex={lightboxIndex}
                onClose={closeLightbox}
                onNavigate={navigateLightbox}
            />
        </div>
    );
};

export default MixStyle;