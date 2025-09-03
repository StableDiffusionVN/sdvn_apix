/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateDressedModelImage, editImageWithPrompt } from '../services/geminiService';
import PolaroidCard from './PolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    RegenerationModal,
    handleFileUpload,
    useMediaQuery,
    downloadAllImagesAsZip,
    downloadImage,
    ImageForZip,
    ResultsView,
    type DressTheModelState,
} from './uiUtils';

interface DressTheModelProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaptionModel: string;
    uploaderDescriptionModel: string;
    uploaderCaptionClothing: string;
    uploaderDescriptionClothing: string;
    addImagesToGallery: (images: string[]) => void;
    appState: DressTheModelState;
    onStateChange: (newState: DressTheModelState) => void;
    onReset: () => void;
    onGoBack: () => void;
}


const BACKGROUND_OPTIONS = ['Tự động', 'Giữ nguyên bối cảnh gốc', 'Studio (đơn sắc, xám, trắng)', 'Đường phố Paris', 'Đường phố Tokyo ban đêm', 'Đường phố New York', 'Thiên nhiên (bãi biển, rừng cây, núi non)', 'Nội thất sang trọng (khách sạn, biệt thự)', 'Sự kiện (thảm đỏ, sàn diễn thời trang)', 'Bối cảnh nghệ thuật (abstract, gradient)', 'Quán cà phê ấm cúng', 'Thư viện cổ kính', 'Khu vườn thượng uyển', 'Sân thượng thành phố lúc hoàng hôn', 'Hẻm nhỏ graffiti', 'Bên trong một viện bảo tàng nghệ thuật', 'Lâu đài cổ tích', 'Khu chợ địa phương sầm uất', 'Cánh đồng hoa oải hương', 'Bến du thuyền sang trọng', 'Ga tàu hỏa cổ điển', 'Loft công nghiệp (Industrial loft)'];
const POSE_OPTIONS = ['Tự động', 'Giữ nguyên tư thế gốc', 'Đứng thẳng (chuyên nghiệp, lookbook)', 'Tạo dáng high-fashion (ấn tượng, nghệ thuật)', 'Ngồi (trên ghế, bậc thang, sofa)', 'Đi bộ (tự nhiên, sải bước trên phố)', 'Chuyển động (xoay người, nhảy múa)', 'Dựa vào tường', 'Nhìn qua vai', 'Tay trong túi quần', 'Chân bắt chéo', 'Cúi người', 'Nằm trên sàn/cỏ', 'Chạy/Nhảy', 'Tạo dáng hành động (action pose)', 'Tương tác với phụ kiện (cầm túi, đội mũ)', 'Tư thế yoga/thiền', 'Cười rạng rỡ', 'Biểu cảm suy tư', 'Chống hông', 'Giơ tay lên trời'];
const PHOTO_STYLE_OPTIONS = ['Tự động', 'Ảnh bìa tạp chí (Vogue, Harper\'s Bazaar)', 'Ảnh lookbook sản phẩm', 'Chân dung cận cảnh', 'Ảnh chụp đường phố (Street style)', 'Phong cách phim điện ảnh (Cinematic)', 'Ảnh chụp tự nhiên (Candid)', 'Ảnh chụp bằng máy phim (35mm film grain)', 'Ảnh Polaroid', 'Ảnh đen trắng cổ điển', 'Ảnh high-key (sáng, ít bóng)', 'Ảnh low-key (tối, tương phản cao)', 'Góc máy Hà Lan (Dutch angle)', 'Ảnh mắt cá (Fisheye lens)', 'Chồng ảnh (Double exposure)', 'Phong cách Lomography (màu sắc rực rỡ, vignette)', 'Chụp từ góc thấp', 'Chụp từ góc cao (bird\'s eye view)', 'Chuyển động mờ (Motion blur)', 'Chân dung siêu thực (Surreal portrait)', 'Ảnh có vệt sáng (Light leaks)'];
const ASPECT_RATIO_OPTIONS = ['Giữ nguyên', '1:1', '2:3', '4:5', '9:16', '1:2', '3:2', '5:4', '16:9', '2:1'];

const DressTheModel: React.FC<DressTheModelProps> = (props) => {
    const { 
        uploaderCaptionModel, uploaderDescriptionModel,
        uploaderCaptionClothing, uploaderDescriptionClothing,
        addImagesToGallery,
        appState, onStateChange, onReset, onGoBack,
        ...headerProps
    } = props;

    const [isRegenerating, setIsRegenerating] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    const lightboxImages = [appState.modelImage, appState.clothingImage, ...appState.historicalImages].filter((img): img is string => !!img);

    const handleModelImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
            const newState: DressTheModelState = {
                ...appState,
                stage: appState.clothingImage ? 'configuring' : 'idle',
                modelImage: imageDataUrl,
                generatedImage: null,
                historicalImages: [],
                error: null,
            };
            onStateChange(newState);
        });
    };
    
    const handleClothingImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
             const newState: DressTheModelState = {
                ...appState,
                stage: appState.modelImage ? 'configuring' : 'idle',
                clothingImage: imageDataUrl,
                generatedImage: null,
                historicalImages: [],
                error: null,
            };
            onStateChange(newState);
        });
    };

    const handleOptionChange = (field: keyof DressTheModelState['options'], value: string | boolean) => {
        onStateChange({
            ...appState,
            options: { ...appState.options, [field]: value }
        });
    };

    const executeInitialGeneration = async () => {
        if (!appState.modelImage || !appState.clothingImage) return;
        
        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await generateDressedModelImage(appState.modelImage, appState.clothingImage, appState.options);
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
            downloadImage(appState.generatedImage, 'ket-qua-mac-do.jpg');
        }
    };
    
    const handleDownloadAll = () => {
        if (appState.historicalImages.length === 0) {
            alert('Không có ảnh nào đã tạo để tải về.');
            return;
        }

        const imagesToZip: ImageForZip[] = [];
        if (appState.modelImage) {
            imagesToZip.push({
                url: appState.modelImage,
                filename: 'anh-mau-goc',
                folder: 'input',
            });
        }
        if (appState.clothingImage) {
            imagesToZip.push({
                url: appState.clothingImage,
                filename: 'anh-trang-phuc-goc',
                folder: 'input',
            });
        }
        appState.historicalImages.forEach((imageUrl, index) => {
            imagesToZip.push({
                url: imageUrl,
                filename: `ket-qua-trang-phuc-${index + 1}`,
                folder: 'output',
            });
        });

        downloadAllImagesAsZip(imagesToZip, 'ket-qua-mac-do.zip');
    };

    const renderSelect = (id: keyof DressTheModelState['options'], label: string, optionList: string[]) => (
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
                        id="model-upload"
                        onUpload={handleModelImageUpload}
                        caption={uploaderCaptionModel}
                        description={uploaderDescriptionModel}
                        currentImage={appState.modelImage}
                        placeholderType="person"
                        onClick={() => appState.modelImage && setLightboxIndex(lightboxImages.indexOf(appState.modelImage))}
                    />
                     <Uploader 
                        id="clothing-upload"
                        onUpload={handleClothingImageUpload}
                        caption={uploaderCaptionClothing}
                        description={uploaderDescriptionClothing}
                        currentImage={appState.clothingImage}
                        placeholderType="clothing"
                        onClick={() => appState.clothingImage && setLightboxIndex(lightboxImages.indexOf(appState.clothingImage))}
                    />
                </motion.div>
            )}

            {appState.stage === 'configuring' && appState.modelImage && appState.clothingImage && (
                <motion.div
                    className="flex flex-col items-center gap-8 w-full max-w-7xl py-6 overflow-y-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                        <PolaroidCard imageUrl={appState.modelImage} caption="Ảnh người mẫu" status="done" onClick={() => appState.modelImage && setLightboxIndex(lightboxImages.indexOf(appState.modelImage))} />
                        <PolaroidCard imageUrl={appState.clothingImage} caption="Ảnh trang phục" status="done" onClick={() => appState.clothingImage && setLightboxIndex(lightboxImages.indexOf(appState.clothingImage))} />
                    </div>

                    <div className="w-full max-w-3xl bg-black/20 p-6 rounded-lg border border-white/10 space-y-4">
                        <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">Tùy chỉnh</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderSelect('background', 'Bối cảnh (Background)', BACKGROUND_OPTIONS)}
                            {renderSelect('pose', 'Tư thế (Pose)', POSE_OPTIONS)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {renderSelect('style', 'Phong cách ảnh', PHOTO_STYLE_OPTIONS)}
                           {renderSelect('aspectRatio', 'Tỉ lệ khung ảnh', ASPECT_RATIO_OPTIONS)}
                        </div>
                        <div>
                            <label htmlFor="notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Ghi chú bổ sung</label>
                            <textarea
                                id="notes"
                                value={appState.options.notes}
                                onChange={(e) => handleOptionChange('notes', e.target.value)}
                                placeholder="Ví dụ: thêm phụ kiện như túi xách, kính râm..."
                                className="form-input h-24"
                                rows={3}
                            />
                        </div>
                        <div className="flex items-center pt-2">
                            <input
                                type="checkbox"
                                id="remove-watermark-dress"
                                checked={appState.options.removeWatermark}
                                onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800"
                                aria-label="Xóa watermark nếu có"
                            />
                            <label htmlFor="remove-watermark-dress" className="ml-3 block text-sm font-medium text-neutral-300">
                                Xóa watermark (nếu có)
                            </label>
                        </div>
                        <div className="flex items-center justify-end gap-4 pt-4">
                            <button onClick={onReset} className="btn btn-secondary">
                                Đổi ảnh khác
                            </button>
                            <button onClick={executeInitialGeneration} className="btn btn-primary" disabled={isLoading}>
                                {isLoading ? 'Đang mặc đồ...' : 'Mặc đồ cho mẫu'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView
                    stage={appState.stage}
                    originalImage={appState.modelImage}
                    onOriginalClick={() => appState.modelImage && setLightboxIndex(lightboxImages.indexOf(appState.modelImage))}
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
                    {appState.clothingImage && (
                         <motion.div key="clothing-result" className="w-full md:w-auto flex-shrink-0" whileHover={{ scale: 1.05, zIndex: 10 }} transition={{ duration: 0.2 }}>
                             <PolaroidCard caption="Ảnh trang phục" status="done" imageUrl={appState.clothingImage} isMobile={isMobile} onClick={() => appState.clothingImage && setLightboxIndex(lightboxImages.indexOf(appState.clothingImage))} />
                        </motion.div>
                    )}
                    <motion.div
                        className="w-full md:w-auto flex-shrink-0"
                        key="generated"
                        initial={{ opacity: 0, scale: 0.5, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.2 }}
                        whileHover={{ scale: 1.05, zIndex: 10 }}
                    >
                        <PolaroidCard
                            caption="Kết quả"
                            status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            imageUrl={appState.generatedImage ?? undefined}
                            error={appState.error ?? undefined}
                            onDownload={!appState.error && appState.generatedImage ? handleDownloadIndividual : undefined}
                            onShake={!appState.error && appState.generatedImage ? () => setIsRegenerating(true) : undefined}
                            onClick={!appState.error && appState.generatedImage ? () => setLightboxIndex(lightboxImages.indexOf(appState.generatedImage!)) : undefined}
                            isMobile={isMobile}
                        />
                    </motion.div>
                </ResultsView>
            )}
            <RegenerationModal
                isOpen={isRegenerating}
                onClose={() => setIsRegenerating(false)}
                onConfirm={handleConfirmRegeneration}
                itemToModify="Kết quả"
                title="Tinh chỉnh ảnh"
                description="Thêm ghi chú để cải thiện ảnh"
                placeholder="Ví dụ: thay đổi màu nền thành xanh dương..."
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

export default DressTheModel;