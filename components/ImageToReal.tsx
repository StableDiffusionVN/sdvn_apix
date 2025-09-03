/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { convertImageToRealistic, editImageWithPrompt } from '../services/geminiService';
import PolaroidCard from './PolaroidCard';
import Lightbox from './Lightbox';
import { 
    RegenerationModal,
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    downloadAllImagesAsZip,
    downloadImage,
    ImageForZip,
    AppOptionsLayout,
    OptionsPanel,
    Slider,
    type ImageToRealState,
    handleFileUpload,
} from './uiUtils';

interface ImageToRealProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaption: string;
    uploaderDescription: string;
    addImagesToGallery: (images: string[]) => void;
    appState: ImageToRealState;
    onStateChange: (newState: ImageToRealState) => void;
    onReset: () => void;
    onGoBack: () => void;
}

const FAITHFULNESS_LEVELS = ['Tự động', 'Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'] as const;

const ImageToReal: React.FC<ImageToRealProps> = (props) => {
    const { 
        uploaderCaption, uploaderDescription, addImagesToGallery,
        appState, onStateChange, onReset, onGoBack,
        ...headerProps 
    } = props;
    
    const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const lightboxImages = [appState.uploadedImage, ...appState.historicalImages].filter((img): img is string => !!img);

    const handleImageUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
            onStateChange({
                ...appState,
                stage: 'configuring',
                uploadedImage: imageDataUrl,
                generatedImage: null,
                historicalImages: [],
                error: null,
            });
        });
    }, [appState, onStateChange]);

    const handleOptionChange = (field: keyof ImageToRealState['options'], value: string | boolean) => {
        onStateChange({
            ...appState,
            options: { ...appState.options, [field]: value }
        });
    };

    const executeInitialGeneration = async () => {
        if (!appState.uploadedImage) return;

        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await convertImageToRealistic(appState.uploadedImage, appState.options);
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

    const handleConfirmRegeneration = async (prompt: string) => {
        setIsRegenerating(false);
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

    const handleDownloadIndividual = () => {
        if (appState.generatedImage) {
            downloadImage(appState.generatedImage, 'anh-chuyen-doi.jpg');
        }
    };

    const handleDownloadAll = () => {
        if (appState.historicalImages.length === 0) {
            alert('Không có ảnh nào đã tạo để tải về.');
            return;
        }
        const imagesToZip: ImageForZip[] = [];
        if (appState.uploadedImage) {
            imagesToZip.push({ url: appState.uploadedImage, filename: 'anh-goc', folder: 'input' });
        }
        appState.historicalImages.forEach((imageUrl, index) => {
            imagesToZip.push({
                url: imageUrl,
                filename: `anh-chuyen-doi-${index + 1}`,
                folder: 'output'
            });
        });
        downloadAllImagesAsZip(imagesToZip, 'anh-chuyen-doi.zip');
    };
    
    const isLoading = appState.stage === 'generating';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
                {(appState.stage === 'idle' || appState.stage === 'configuring') && (<AppScreenHeader {...headerProps} />)}
            </AnimatePresence>

            <div className="flex flex-col items-center justify-center w-full flex-1">
                {appState.stage === 'idle' && (
                    <ImageUploader
                        id="image-to-real-upload"
                        onImageUpload={handleImageUpload}
                        uploaderCaption={uploaderCaption}
                        uploaderDescription={uploaderDescription}
                        placeholderType="magic"
                    />
                )}

                {appState.stage === 'configuring' && appState.uploadedImage && (
                    <AppOptionsLayout>
                        <div className="flex-shrink-0">
                            <PolaroidCard imageUrl={appState.uploadedImage} caption="Ảnh gốc" status="done" onClick={() => setLightboxIndex(0)} />
                        </div>
                        <OptionsPanel>
                            <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">Tùy chỉnh</h2>
                            <Slider
                                label="Mức độ giữ nét"
                                options={FAITHFULNESS_LEVELS}
                                value={appState.options.faithfulness}
                                onChange={(value) => handleOptionChange('faithfulness', value)}
                            />
                            <div>
                                <label htmlFor="notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Ghi chú bổ sung</label>
                                <textarea id="notes" value={appState.options.notes} onChange={(e) => handleOptionChange('notes', e.target.value)}
                                    placeholder="Ví dụ: phong cách ảnh chụp buổi tối, ánh sáng neon..." className="form-input h-24" rows={3} />
                            </div>
                            <div className="flex items-center pt-2">
                                <input type="checkbox" id="remove-watermark-real" checked={appState.options.removeWatermark}
                                    onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                    className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" />
                                <label htmlFor="remove-watermark-real" className="ml-3 block text-sm font-medium text-neutral-300">Xóa watermark (nếu có)</label>
                            </div>
                            <div className="flex items-center justify-end gap-4 pt-4">
                                <button onClick={onReset} className="btn btn-secondary">Đổi ảnh khác</button>
                                <button onClick={executeInitialGeneration} className="btn btn-primary" disabled={isLoading}>{isLoading ? 'Đang chuyển đổi...' : 'Chuyển thành ảnh thật'}</button>
                            </div>
                        </OptionsPanel>
                    </AppOptionsLayout>
                )}
            </div>

            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView
                    stage={appState.stage}
                    originalImage={appState.uploadedImage}
                    onOriginalClick={() => setLightboxIndex(0)}
                    error={appState.error}
                    actions={
                        <>
                            {appState.generatedImage && !appState.error && (<button onClick={handleDownloadAll} className="btn btn-primary">Tải về tất cả</button>)}
                            <button onClick={handleBackToOptions} className="btn btn-secondary">Chỉnh sửa</button>
                            <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">Bắt đầu lại</button>
                        </>
                    }>
                    <motion.div
                        className="w-full md:w-auto flex-shrink-0"
                        key="generated-real"
                        initial={{ opacity: 0, scale: 0.5, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.15 }}>
                        <PolaroidCard caption="Ảnh thật" status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            imageUrl={appState.generatedImage ?? undefined} error={appState.error ?? undefined}
                            onDownload={!appState.error && appState.generatedImage ? handleDownloadIndividual : undefined}
                            onShake={!appState.error && appState.generatedImage ? () => setIsRegenerating(true) : undefined}
                            onClick={!appState.error && appState.generatedImage ? () => setLightboxIndex(lightboxImages.indexOf(appState.generatedImage!)) : undefined} />
                    </motion.div>
                </ResultsView>
            )}

            <RegenerationModal isOpen={isRegenerating} onClose={() => setIsRegenerating(false)}
                onConfirm={handleConfirmRegeneration} itemToModify="Kết quả" title="Tinh chỉnh ảnh"
                description="Thêm ghi chú để cải thiện ảnh" placeholder="Ví dụ: thêm hiệu ứng bokeh, chụp bằng ống kính góc rộng..." />
            
            <Lightbox
                images={lightboxImages}
                selectedIndex={lightboxIndex}
                onClose={() => setLightboxIndex(null)}
                onNavigate={(newIndex) => setLightboxIndex(newIndex)}
            />
        </div>
    );
};

export default ImageToReal;