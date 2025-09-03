/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateFreeImage, editImageWithPrompt } from '../services/geminiService';
import PolaroidCard from './PolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    RegenerationModal,
    handleFileUpload,
    useMediaQuery,
    downloadAllImagesAsZip,
    ImageForZip,
    ResultsView,
    OptionsPanel,
    downloadImage,
    type FreeGenerationState
} from './uiUtils';

interface FreeGenerationProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaption1: string;
    uploaderDescription1: string;
    uploaderCaption2: string;
    uploaderDescription2: string;
    addImagesToGallery: (images: string[]) => void;
    appState: FreeGenerationState;
    onStateChange: (newState: FreeGenerationState) => void;
    onReset: () => void;
    onGoBack: () => void;
}

const NUMBER_OF_IMAGES_OPTIONS = ['1', '2', '3', '4'] as const;
const ASPECT_RATIO_OPTIONS = ['Giữ nguyên', '1:1', '2:3', '4:5', '9:16', '1:2', '3:2', '5:4', '16:9', '2:1'];

const FreeGeneration: React.FC<FreeGenerationProps> = (props) => {
    const { 
        uploaderCaption1, uploaderDescription1,
        uploaderCaption2, uploaderDescription2,
        addImagesToGallery,
        appState, onStateChange, onReset, onGoBack,
        ...headerProps
    } = props;

    const [imageToRegenerate, setImageToRegenerate] = useState<{ url: string; index: number } | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const isMobile = useMediaQuery('(max-width: 768px)');

    const lightboxImages = [appState.image1, appState.image2, ...appState.historicalImages].filter((img): img is string => !!img);

    const handleImage1Upload = (e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
            onStateChange({
                ...appState,
                image1: imageDataUrl,
                generatedImages: [],
                historicalImages: [],
                error: null,
            });
        });
    };

    const handleImage2Upload = (e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
             onStateChange({
                ...appState,
                image2: imageDataUrl,
                generatedImages: [],
                historicalImages: [],
                error: null,
            });
        });
    };

    const handleOptionChange = (field: keyof FreeGenerationState['options'], value: string | boolean | number) => {
        onStateChange({
            ...appState,
            options: { ...appState.options, [field]: value }
        });
    };

    const handleGenerate = async () => {
        if (!appState.options.prompt) {
            onStateChange({ ...appState, error: "Vui lòng nhập prompt để tạo ảnh." });
            return;
        }
        
        const numImages = appState.image1 ? 1 : appState.options.numberOfImages;
        
        onStateChange({ ...appState, stage: 'generating', error: null, generatedImages: [] });

        try {
            const resultUrls = await generateFreeImage(
                appState.options.prompt, 
                numImages, 
                appState.options.aspectRatio, 
                appState.image1 ?? undefined, 
                appState.image2 ?? undefined, 
                appState.options.removeWatermark
            );
            onStateChange({
                ...appState,
                stage: 'results',
                generatedImages: resultUrls,
                historicalImages: [...appState.historicalImages, ...resultUrls],
            });
            addImagesToGallery(resultUrls);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, stage: 'results', error: errorMessage });
        }
    };

    const handleConfirmRegeneration = async (prompt: string) => {
        if (!imageToRegenerate) return;

        const { url, index } = imageToRegenerate;
        const originalGeneratedImages = [...appState.generatedImages];
        setImageToRegenerate(null);

        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await editImageWithPrompt(url, prompt);
            
            const newGeneratedImages = [...originalGeneratedImages];
            newGeneratedImages[index] = resultUrl;
            
            onStateChange({
                ...appState,
                stage: 'results',
                generatedImages: newGeneratedImages,
                historicalImages: [...appState.historicalImages, resultUrl],
            });
            addImagesToGallery([resultUrl]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, stage: 'results', error: errorMessage, generatedImages: originalGeneratedImages });
        }
    };

    const handleBackToOptions = () => {
        onStateChange({ ...appState, stage: 'configuring', error: null, generatedImages: [] });
    };
    
    const handleDownloadAll = () => {
        if (appState.historicalImages.length === 0) {
             alert('Không có ảnh nào đã tạo để tải về.');
            return;
        }

        const imagesToZip: ImageForZip[] = [];
        if (appState.image1) imagesToZip.push({ url: appState.image1, filename: 'anh-goc-1', folder: 'input' });
        if (appState.image2) imagesToZip.push({ url: appState.image2, filename: 'anh-goc-2', folder: 'input' });
        
        appState.historicalImages.forEach((url, index) => {
            imagesToZip.push({ url, filename: `ket-qua-${index + 1}`, folder: 'output'});
        });
        
        downloadAllImagesAsZip(imagesToZip, 'ket-qua-tao-anh-tu-do.zip');
    };

    const handleDownloadIndividual = (url: string) => {
        downloadImage(url, 'ket-qua-tao-anh-tu-do.jpg');
    };

    const Uploader = ({ id, onUpload, caption, description, currentImage, placeholderType, onClick }: any) => (
        <div className="flex flex-col items-center gap-4">
            <label htmlFor={id} className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                <PolaroidCard
                    caption={caption}
                    status="done"
                    imageUrl={currentImage || undefined}
                    placeholderType={placeholderType}
                    onClick={onClick}
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
                {(appState.stage === 'configuring') && (
                    <AppScreenHeader {...headerProps} />
                )}
            </AnimatePresence>

            {appState.stage === 'configuring' && (
                 <motion.div
                    className="flex flex-col items-center gap-8 w-full max-w-7xl py-6 overflow-y-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex flex-col md:flex-row items-start justify-center gap-8">
                        <Uploader 
                            id="free-gen-upload-1"
                            onUpload={handleImage1Upload}
                            caption={uploaderCaption1}
                            description={uploaderDescription1}
                            currentImage={appState.image1}
                            placeholderType="magic"
                            onClick={() => appState.image1 && setLightboxIndex(lightboxImages.indexOf(appState.image1))}
                        />
                        <AnimatePresence>
                        {appState.image1 && (
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                                <Uploader 
                                    id="free-gen-upload-2"
                                    onUpload={handleImage2Upload}
                                    caption={uploaderCaption2}
                                    description={uploaderDescription2}
                                    currentImage={appState.image2}
                                    placeholderType="magic"
                                    onClick={() => appState.image2 && setLightboxIndex(lightboxImages.indexOf(appState.image2))}
                                />
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                     
                    <OptionsPanel>
                        <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">Nhập yêu cầu (Prompt)</h2>
                        
                        <div>
                            <textarea
                                id="prompt" value={appState.options.prompt} onChange={(e) => handleOptionChange('prompt', e.target.value)}
                                placeholder="Ví dụ: một con mèo phi hành gia đang cưỡi ván trượt trên sao Hỏa, phong cách tranh sơn dầu..."
                                className="form-input !h-32"
                                rows={5}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={`transition-opacity duration-300 ${appState.image1 ? 'opacity-50' : 'opacity-100'}`}>
                                <label htmlFor="number-of-images" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">
                                    Số lượng ảnh
                                </label>
                                <select
                                    id="number-of-images"
                                    value={appState.options.numberOfImages}
                                    onChange={(e) => handleOptionChange('numberOfImages', parseInt(e.target.value, 10))}
                                    className="form-input"
                                    disabled={!!appState.image1}
                                    aria-label="Chọn số lượng ảnh"
                                >
                                    {NUMBER_OF_IMAGES_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                {appState.image1 && <p className="text-xs text-neutral-400 mt-1">Chế độ sửa ảnh chỉ tạo 1 ảnh/lần.</p>}
                            </div>
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
                                {!appState.image1 && <p className="text-xs text-neutral-400 mt-1">Tỉ lệ gần nhất được hỗ trợ sẽ được sử dụng.</p>}
                            </div>
                        </div>

                        <div className="flex items-center pt-2">
                            <input
                                type="checkbox"
                                id="remove-watermark-free"
                                checked={appState.options.removeWatermark}
                                onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800"
                                aria-label="Xóa watermark nếu có"
                            />
                            <label htmlFor="remove-watermark-free" className="ml-3 block text-sm font-medium text-neutral-300">
                                Xóa watermark (nếu có)
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-4 pt-4">
                             { (appState.image1 || appState.image2) && <button onClick={() => { onStateChange({...appState, image1: null, image2: null}) }} className="btn btn-secondary">
                                Xóa ảnh
                            </button> }
                            <button onClick={handleGenerate} className="btn btn-primary" disabled={isLoading || !appState.options.prompt.trim()}>
                                {isLoading ? 'Đang tạo...' : 'Tạo ảnh'}
                            </button>
                        </div>
                    </OptionsPanel>
                </motion.div>
            )}

            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView
                    stage={appState.stage}
                    originalImage={appState.image1}
                    onOriginalClick={() => appState.image1 && setLightboxIndex(lightboxImages.indexOf(appState.image1))}
                    error={appState.error}
                    isMobile={isMobile}
                    actions={(
                        <>
                            {appState.historicalImages.length > 0 && !appState.error && (
                                <button onClick={handleDownloadAll} className="btn btn-primary">Tải về tất cả</button>
                            )}
                            <button onClick={handleBackToOptions} className="btn btn-secondary">Chỉnh sửa</button>
                            <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">Bắt đầu lại</button>
                        </>
                    )}
                >
                    {appState.image2 && (
                        <motion.div key="image2-result" className="w-full md:w-auto flex-shrink-0" whileHover={{ scale: 1.05, zIndex: 10 }} transition={{ duration: 0.2 }}>
                            <PolaroidCard caption="Ảnh gốc 2" status="done" imageUrl={appState.image2} isMobile={isMobile} onClick={() => appState.image2 && setLightboxIndex(lightboxImages.indexOf(appState.image2))} />
                        </motion.div>
                    )}
                    {
                       isLoading ? 
                        Array.from({ length: appState.image1 ? 1 : appState.options.numberOfImages }).map((_, index) => (
                             <motion.div
                                className="w-full md:w-auto flex-shrink-0"
                                key={`pending-${index}`}
                                initial={{ opacity: 0, scale: 0.5, y: 100 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.2 + index * 0.1 }}
                            >
                                <PolaroidCard caption={`Kết quả ${index + 1}`} status="pending" />
                            </motion.div>
                        ))
                       :
                       appState.generatedImages.map((url, index) => (
                             <motion.div
                                className="w-full md:w-auto flex-shrink-0"
                                key={url}
                                initial={{ opacity: 0, scale: 0.5, y: 100 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.2 + index * 0.1 }}
                                whileHover={{ scale: 1.05, zIndex: 10 }}
                            >
                                <PolaroidCard
                                    caption={`Kết quả ${index + 1}`}
                                    status={'done'}
                                    imageUrl={url}
                                    onDownload={() => handleDownloadIndividual(url)}
                                    onShake={() => setImageToRegenerate({ url, index })}
                                    onClick={() => setLightboxIndex(lightboxImages.indexOf(url))}
                                    isMobile={isMobile}
                                />
                            </motion.div>
                       ))
                    }
                     {appState.error && !isLoading && (
                         <motion.div
                            className="w-full md:w-auto flex-shrink-0"
                            key="error-card"
                            initial={{ opacity: 0, scale: 0.5, y: 100 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                        >
                            <PolaroidCard
                                caption="Lỗi"
                                status="error"
                                error={appState.error}
                                isMobile={isMobile}
                            />
                        </motion.div>
                    )}

                </ResultsView>
            )}
             <RegenerationModal
                isOpen={!!imageToRegenerate}
                onClose={() => setImageToRegenerate(null)}
                onConfirm={handleConfirmRegeneration}
                itemToModify={imageToRegenerate ? `Kết quả ${imageToRegenerate.index + 1}`: ''}
                title="Tinh chỉnh ảnh"
                description="Thêm ghi chú để cải thiện ảnh"
                placeholder="Ví dụ: làm cho màu sắc tươi hơn..."
            />

            <Lightbox
                images={lightboxImages}
                selectedIndex={lightboxIndex}
                onClose={() => setLightboxIndex(null)}
                onNavigate={(newIndex) => setLightboxIndex(newIndex)}
            />
        </div>
    );
};

export default FreeGeneration;