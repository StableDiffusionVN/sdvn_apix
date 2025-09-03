/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateArchitecturalImage, editImageWithPrompt } from '../services/geminiService';
import PolaroidCard from './PolaroidCard';
import Lightbox from './Lightbox';
import { ImageEditorModal } from './ImageEditorModal';
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
    type ArchitectureIdeatorState,
    handleFileUpload,
    useLightbox,
    useImageEditor,
} from './uiUtils';

interface ArchitectureIdeatorProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaption: string;
    uploaderDescription: string;
    addImagesToGallery: (images: string[]) => void;
    appState: ArchitectureIdeatorState;
    onStateChange: (newState: ArchitectureIdeatorState) => void;
    onReset: () => void;
    onGoBack: () => void;
    openImageEditor: (url: string, onSave: (newUrl: string) => void) => void;
}

const CONTEXT_OPTIONS = ['Tự động', 'Đô thị hiện đại (Modern city)', 'Vùng quê yên tĩnh (Countryside)', 'Ven biển (Coastal)', 'Vùng núi (Mountainous)', 'Sa mạc (Desert)', 'Rừng rậm (Jungle)', 'Khu công nghiệp (Industrial zone)', 'Không gian vũ trụ (Outer space)', 'Thế giới thần tiên (Fairy tale world)', 'Thành phố tương lai (Cyberpunk city)', 'Thành phố dưới nước (Underwater city)', 'Thành phố trên mây (City on clouds)', 'Khu di tích cổ đại (Ancient ruins)', 'Vườn Nhật Bản (Japanese garden)', 'Đường phố London thời Victoria (Victorian London)', 'Khu nhà ổ chuột Brazil (Brazilian favela)', 'Trạm nghiên cứu Bắc Cực (Arctic station)', 'Colony trên sao Hỏa (Mars colony)', 'Vùng đất hoang tàn hậu tận thế (Post-apocalyptic wasteland)', 'Làng Địa Trung Hải (Mediterranean village)', 'Cảnh quan núi lửa (Volcanic landscape)'];
const STYLE_OPTIONS = ['Tự động', 'Hiện đại (Modern)', 'Tối giản (Minimalist)', 'Brutalist', 'Đông Dương (Indochine)', 'Cổ điển (Classical)', 'Nhiệt đới (Tropical)', 'Nhà gỗ (Cabin)', 'Go-tic (Gothic)', 'Art Deco', 'Deconstructivism', 'Bền vững (Sustainable)', 'Hữu cơ (Biophilic/Organic)', 'Tham số (Parametricism)', 'Công nghiệp (Industrial)', 'Scandinavian', 'Nhà nông trại hiện đại (Modern Farmhouse)', 'Địa Trung Hải (Mediterranean)', 'Tương lai (Futuristic)', 'Steampunk', 'Nhà trên cây (Treehouse)', 'Kiến trúc hang động (Cave architecture)', 'Nhà container (Container home)'];
const COLOR_OPTIONS = ['Tự động', 'Tông màu ấm (Warm tones)', 'Tông màu lạnh (Cool tones)', 'Màu trung tính (Neutral colors)', 'Đơn sắc (Monochromatic)', 'Tương phản cao (High contrast)', 'Màu Pastel nhẹ nhàng (Soft pastels)', 'Màu rực rỡ (Vibrant colors)', 'Màu đất (Earthy tones)', 'Màu đá quý (Jewel tones)', 'Neonoir (Neon colors)', 'Màu gỉ sét & kim loại (Rust & Metallic)', 'Trắng và gỗ (White & Wood)', 'Xám bê tông (Concrete gray)', 'Xanh bạc hà & hồng san hô (Mint & Coral)', 'Xanh navy & vàng đồng (Navy & Brass)', 'Sepia (Nâu đỏ)', 'Đen trắng (Black & White)', 'Màu hoàng hôn (Sunset palette)', 'Màu bình minh (Sunrise palette)', 'Màu cầu vồng (Rainbow)', 'Màu của đại dương (Oceanic colors)'];
const LIGHTING_OPTIONS = ['Tự động', 'Ánh sáng ban ngày tự nhiên (Natural daylight)', 'Bình minh/Hoàng hôn (Golden hour)', 'Ánh sáng ban đêm (Night lighting)', 'Ngày u ám, ánh sáng dịu (Overcast, soft light)', 'Nắng gắt, bóng đổ rõ (Harsh sun, hard shadows)', 'Ánh sáng Neon', 'Ánh sáng huyền ảo (Ethereal lighting)', 'Ánh sáng thể tích (Volumetric rays)', 'Ánh sáng sân khấu (Stage lighting)', 'Ánh sáng từ đèn lồng (Lantern light)', 'Ánh sáng lập lòe từ lửa (Flickering firelight)', 'Ánh sáng phát quang sinh học (Bioluminescent glow)', 'Phim noir (Film noir shadows)', 'Ánh sáng studio (Studio lighting)', 'Chiếu sáng từ dưới lên (Uplighting)', 'Ánh sáng lấp lánh (Twinkling/Twinkling lights)', 'Cháy sáng (Overexposed)', 'Tối và u ám (Dark and moody)', 'Ánh sáng phản chiếu từ nước (Water reflection)', 'Bóng đổ từ rèm cửa (Caustic shadows)'];

const ArchitectureIdeator: React.FC<ArchitectureIdeatorProps> = (props) => {
    const { 
        uploaderCaption, uploaderDescription, addImagesToGallery, 
        appState, onStateChange, onReset, onGoBack,
        openImageEditor,
        ...headerProps 
    } = props;
    
    const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();

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
    
    const handleOptionChange = (field: keyof ArchitectureIdeatorState['options'], value: string | boolean) => {
        onStateChange({
            ...appState,
            options: {
                ...appState.options,
                [field]: value
            }
        });
    };

    const executeInitialGeneration = async () => {
        if (!appState.uploadedImage) return;
        
        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await generateArchitecturalImage(appState.uploadedImage, appState.options);
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
            downloadImage(appState.generatedImage, 'ket-qua-kien-truc.jpg');
        }
    };

    const handleDownloadAll = () => {
        if (appState.historicalImages.length === 0) {
            alert('Không có ảnh nào đã tạo để tải về.');
            return;
        }

        const imagesToZip: ImageForZip[] = [];
        if (appState.uploadedImage) {
            imagesToZip.push({
                url: appState.uploadedImage,
                filename: 'anh-phac-thao-goc',
                folder: 'input',
            });
        }
        appState.historicalImages.forEach((imageUrl, index) => {
            imagesToZip.push({
                url: imageUrl,
                filename: `ket-qua-kien-truc-${index + 1}`,
                folder: 'output',
            });
        });
        
        downloadAllImagesAsZip(imagesToZip, 'ket-qua-kien-truc.zip');
    };
    
    const handleSaveUploadedImage = (newUrl: string) => {
        onStateChange({ ...appState, uploadedImage: newUrl });
    };

    const handleSaveGeneratedImage = (newUrl: string) => {
        const newHistorical = [...appState.historicalImages, newUrl];
        onStateChange({ ...appState, stage: 'results', generatedImage: newUrl, historicalImages: newHistorical });
        addImagesToGallery([newUrl]);
    };

    const renderSelect = (id: keyof ArchitectureIdeatorState['options'], label: string, optionList: string[]) => (
        <div>
            <label htmlFor={id} className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{label}</label>
            <select
                id={id}
                value={appState.options[id] as string}
                onChange={(e) => handleOptionChange(id, e.target.value)}
                className="form-input"
            >
                {optionList.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );
    
    const isLoading = appState.stage === 'generating';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
            {appState.stage === 'idle' || appState.stage === 'configuring' && (
                <AppScreenHeader {...headerProps} />
            )}
            </AnimatePresence>

            <div className="flex flex-col items-center justify-center w-full flex-1">
                {appState.stage === 'idle' && (
                    <ImageUploader
                        id="sketch-upload"
                        onImageUpload={handleImageUpload}
                        uploaderCaption={uploaderCaption}
                        uploaderDescription={uploaderDescription}
                        placeholderType="architecture"
                    />
                )}

                {appState.stage === 'configuring' && appState.uploadedImage && (
                    <AppOptionsLayout>
                        <div className="flex-shrink-0">
                            <PolaroidCard 
                                imageUrl={appState.uploadedImage} 
                                caption="Ảnh phác thảo" 
                                status="done"
                                onClick={() => openLightbox(0)}
                                onEdit={() => openImageEditor(appState.uploadedImage!, handleSaveUploadedImage)}
                            />
                        </div>

                        <OptionsPanel>
                            <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">Tùy chỉnh ý tưởng</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {renderSelect('context', 'Bối cảnh', CONTEXT_OPTIONS)}
                                {renderSelect('style', 'Phong cách kiến trúc', STYLE_OPTIONS)}
                                {renderSelect('color', 'Tông màu', COLOR_OPTIONS)}
                                {renderSelect('lighting', 'Ánh sáng', LIGHTING_OPTIONS)}
                            </div>
                            <div>
                                <label htmlFor="notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Ghi chú bổ sung</label>
                                <textarea
                                    id="notes"
                                    value={appState.options.notes}
                                    onChange={(e) => handleOptionChange('notes', e.target.value)}
                                    placeholder="Ví dụ: thêm nhiều cây xanh, vật liệu kính..."
                                    className="form-input h-24"
                                    rows={3}
                                />
                            </div>
                             <div className="flex items-center pt-2">
                                <input
                                    type="checkbox"
                                    id="remove-watermark-arch"
                                    checked={appState.options.removeWatermark}
                                    onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                    className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800"
                                    aria-label="Xóa watermark nếu có"
                                />
                                <label htmlFor="remove-watermark-arch" className="ml-3 block text-sm font-medium text-neutral-300">
                                    Xóa watermark (nếu có)
                                </label>
                            </div>
                            <div className="flex items-center justify-end gap-4 pt-4">
                                <button onClick={onReset} className="btn btn-secondary">
                                    Đổi ảnh khác
                                </button>
                                <button 
                                    onClick={executeInitialGeneration} 
                                    className="btn btn-primary"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Đang tạo...' : 'Tạo ảnh'}
                                </button>
                            </div>
                        </OptionsPanel>

                    </AppOptionsLayout>
                )}
            </div>

            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView
                    stage={appState.stage}
                    originalImage={appState.uploadedImage}
                    onOriginalClick={() => openLightbox(0)}
                    onEditOriginal={() => openImageEditor(appState.uploadedImage!, handleSaveUploadedImage)}
                    error={appState.error}
                    actions={
                        <>
                            {appState.generatedImage && !appState.error && (
                                <button onClick={handleDownloadAll} className="btn btn-primary">
                                    Tải về tất cả
                                </button>
                            )}
                            <button onClick={handleBackToOptions} className="btn btn-secondary">
                                Chỉnh sửa tùy chọn
                            </button>
                            <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">
                                Bắt đầu lại
                            </button>
                        </>
                    }
                >
                    <motion.div
                        className="w-full md:w-auto flex-shrink-0"
                        key="generated-architecture"
                        initial={{ opacity: 0, scale: 0.5, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.15 }}
                    >
                        <PolaroidCard
                            caption="Kết quả"
                            status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            imageUrl={appState.generatedImage ?? undefined}
                            error={appState.error ?? undefined}
                            onDownload={!appState.error && appState.generatedImage ? handleDownloadIndividual : undefined}
                            onShake={!appState.error && appState.generatedImage ? () => setIsRegenerating(true) : undefined}
                            onEdit={!appState.error && appState.generatedImage ? () => openImageEditor(appState.generatedImage!, handleSaveGeneratedImage) : undefined}
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined}
                        />
                    </motion.div>
                </ResultsView>
            )}

            <RegenerationModal
                isOpen={isRegenerating}
                onClose={() => setIsRegenerating(false)}
                onConfirm={handleConfirmRegeneration}
                itemToModify="Kết quả"
                title="Tinh chỉnh ảnh kiến trúc"
                description="Thêm ghi chú để cải thiện ảnh"
                placeholder="Ví dụ: thêm hồ bơi, vật liệu bằng gỗ, ánh sáng ban đêm..."
            />

            <Lightbox
                images={lightboxImages}
                selectedIndex={lightboxIndex}
                onClose={closeLightbox}
                onNavigate={navigateLightbox}
            />
        </div>
    );
};

export default ArchitectureIdeator;