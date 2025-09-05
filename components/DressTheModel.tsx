/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, ChangeEvent, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateDressedModelImage, editImageWithPrompt } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    handleFileUpload,
    useMediaQuery,
    ImageForZip,
    ResultsView,
    type DressTheModelState,
    useLightbox,
    OptionsPanel,
    useVideoGeneration,
    processAndDownloadAll,
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

// FIX: This component was not implemented, causing it to return 'void'.
export const DressTheModel: React.FC<DressTheModelProps> = (props) => {
    const { 
        uploaderCaptionModel, uploaderDescriptionModel,
        uploaderCaptionClothing, uploaderDescriptionClothing,
        addImagesToGallery,
        appState, onStateChange, onReset,
        ...headerProps
    } = props;

    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    // Searchable dropdown states
    const [backgroundSearch, setBackgroundSearch] = useState(appState.options.background);
    const [isBackgroundDropdownOpen, setIsBackgroundDropdownOpen] = useState(false);
    const backgroundDropdownRef = useRef<HTMLDivElement>(null);
    const [poseSearch, setPoseSearch] = useState(appState.options.pose);
    const [isPoseDropdownOpen, setIsPoseDropdownOpen] = useState(false);
    const poseDropdownRef = useRef<HTMLDivElement>(null);
    const [styleSearch, setStyleSearch] = useState(appState.options.style);
    const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
    const styleDropdownRef = useRef<HTMLDivElement>(null);
    
    const filteredBackgrounds = BACKGROUND_OPTIONS.filter(opt => opt.toLowerCase().includes(backgroundSearch.toLowerCase()));
    const filteredPoses = POSE_OPTIONS.filter(opt => opt.toLowerCase().includes(poseSearch.toLowerCase()));
    const filteredStyles = PHOTO_STYLE_OPTIONS.filter(opt => opt.toLowerCase().includes(styleSearch.toLowerCase()));
    
    useEffect(() => {
        setBackgroundSearch(appState.options.background);
        setPoseSearch(appState.options.pose);
        setStyleSearch(appState.options.style);
    }, [appState.options]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (backgroundDropdownRef.current && !backgroundDropdownRef.current.contains(event.target as Node)) setIsBackgroundDropdownOpen(false);
            if (poseDropdownRef.current && !poseDropdownRef.current.contains(event.target as Node)) setIsPoseDropdownOpen(false);
            if (styleDropdownRef.current && !styleDropdownRef.current.contains(event.target as Node)) setIsStyleDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const lightboxImages = [appState.modelImage, appState.clothingImage, ...appState.historicalImages].filter((img): img is string => !!img);

    const handleModelImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
            onStateChange({
                ...appState,
                stage: appState.clothingImage ? 'configuring' : 'idle',
                modelImage: imageDataUrl,
                generatedImage: null,
                historicalImages: [],
                error: null,
            });
            addImagesToGallery([imageDataUrl]);
        });
    };

    const handleClothingImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
            onStateChange({
                ...appState,
                stage: appState.modelImage ? 'configuring' : 'idle',
                clothingImage: imageDataUrl,
                generatedImage: null,
                historicalImages: [],
                error: null,
            });
            addImagesToGallery([imageDataUrl]);
        });
    };
    
    const handleModelImageChange = (newUrl: string) => {
        onStateChange({
            ...appState,
            stage: appState.clothingImage ? 'configuring' : 'idle',
            modelImage: newUrl,
        });
        addImagesToGallery([newUrl]);
    };
    const handleClothingImageChange = (newUrl: string) => {
        onStateChange({
            ...appState,
            stage: appState.modelImage ? 'configuring' : 'idle',
            clothingImage: newUrl,
        });
        addImagesToGallery([newUrl]);
    };
    const handleGeneratedImageChange = (newUrl: string) => {
        const newHistorical = [...appState.historicalImages, newUrl];
        onStateChange({ ...appState, stage: 'results', generatedImage: newUrl, historicalImages: newHistorical });
        addImagesToGallery([newUrl]);
    };

    const handleOptionChange = (field: keyof DressTheModelState['options'], value: string | boolean) => {
        onStateChange({ ...appState, options: { ...appState.options, [field]: value } });
    };
    
    const handleSelectOption = (field: keyof DressTheModelState['options'], value: string) => {
        handleOptionChange(field, value);
        switch(field) {
            case 'background':
                setBackgroundSearch(value);
                setIsBackgroundDropdownOpen(false);
                break;
            case 'pose':
                setPoseSearch(value);
                setIsPoseDropdownOpen(false);
                break;
            case 'style':
                setStyleSearch(value);
                setIsStyleDropdownOpen(false);
                break;
        }
    };


    const executeInitialGeneration = async () => {
        if (!appState.modelImage || !appState.clothingImage) return;
        onStateChange({ ...appState, stage: 'generating', error: null });
        try {
            const resultUrl = await generateDressedModelImage(appState.modelImage, appState.clothingImage, appState.options);
            onStateChange({ ...appState, stage: 'results', generatedImage: resultUrl, historicalImages: [...appState.historicalImages, resultUrl] });
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
            onStateChange({ ...appState, stage: 'results', generatedImage: resultUrl, historicalImages: [...appState.historicalImages, resultUrl] });
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
        if (appState.modelImage) {
            inputImages.push({ url: appState.modelImage, filename: 'model-goc', folder: 'input' });
        }
        if (appState.clothingImage) {
            inputImages.push({ url: appState.clothingImage, filename: 'trang-phuc-goc', folder: 'input' });
        }
        
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            videoTasks,
            zipFilename: 'ket-qua-thu-do.zip',
            baseOutputFilename: 'ket-qua-thu-do',
        });
    };

    const Uploader = ({ id, onUpload, caption, description, currentImage, onImageChange, placeholderType }: any) => (
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

    const isLoading = appState.stage === 'generating';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
                {(appState.stage === 'idle' || appState.stage === 'configuring') && (<AppScreenHeader {...headerProps} />)}
            </AnimatePresence>

            {appState.stage === 'idle' && (
                <motion.div className="flex flex-col md:flex-row items-start justify-center gap-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <Uploader id="model-upload" onUpload={handleModelImageUpload} onImageChange={handleModelImageChange} caption={uploaderCaptionModel} description={uploaderDescriptionModel} currentImage={appState.modelImage} placeholderType="person" />
                    <Uploader id="clothing-upload" onUpload={handleClothingImageUpload} onImageChange={handleClothingImageChange} caption={uploaderCaptionClothing} description={uploaderDescriptionClothing} currentImage={appState.clothingImage} placeholderType="clothing" />
                </motion.div>
            )}

            {appState.stage === 'configuring' && appState.modelImage && appState.clothingImage && (
                <motion.div className="flex flex-col items-center gap-8 w-full max-w-7xl py-6 overflow-y-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                        <ActionablePolaroidCard mediaUrl={appState.modelImage} caption="Người mẫu" status="done" onClick={() => appState.modelImage && openLightbox(lightboxImages.indexOf(appState.modelImage))} isEditable={true} isSwappable={true} isGallerySelectable={true} onImageChange={handleModelImageChange} />
                        <ActionablePolaroidCard mediaUrl={appState.clothingImage} caption="Trang phục" status="done" onClick={() => appState.clothingImage && openLightbox(lightboxImages.indexOf(appState.clothingImage))} isEditable={true} isSwappable={true} isGallerySelectable={true} onImageChange={handleClothingImageChange} />
                    </div>

                    <OptionsPanel className="max-w-4xl">
                        <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">Tùy chỉnh</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div ref={backgroundDropdownRef} className="searchable-dropdown-container">
                                <label htmlFor="background-search" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Bối cảnh</label>
                                <input type="text" id="background-search" value={backgroundSearch}
                                    onChange={(e) => { setBackgroundSearch(e.target.value); handleOptionChange('background', e.target.value); setIsBackgroundDropdownOpen(true); }}
                                    onFocus={() => setIsBackgroundDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setIsBackgroundDropdownOpen(false), 200)}
                                    className="form-input" placeholder="Tìm hoặc nhập bối cảnh..." autoComplete="off" />
                                {isBackgroundDropdownOpen && (
                                    <ul className="searchable-dropdown-list">
                                        {filteredBackgrounds.length > 0 ? filteredBackgrounds.map(opt => (
                                            <li key={opt} onMouseDown={() => handleSelectOption('background', opt)} className="searchable-dropdown-item">{opt}</li>
                                        )) : (<li className="searchable-dropdown-item !cursor-default">Không tìm thấy</li>)}
                                    </ul>
                                )}
                            </div>
                            <div ref={poseDropdownRef} className="searchable-dropdown-container">
                                <label htmlFor="pose-search" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Tư thế</label>
                                <input type="text" id="pose-search" value={poseSearch}
                                    onChange={(e) => { setPoseSearch(e.target.value); handleOptionChange('pose', e.target.value); setIsPoseDropdownOpen(true); }}
                                    onFocus={() => setIsPoseDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setIsPoseDropdownOpen(false), 200)}
                                    className="form-input" placeholder="Tìm hoặc nhập tư thế..." autoComplete="off" />
                                {isPoseDropdownOpen && (
                                    <ul className="searchable-dropdown-list">
                                        {filteredPoses.length > 0 ? filteredPoses.map(opt => (
                                            <li key={opt} onMouseDown={() => handleSelectOption('pose', opt)} className="searchable-dropdown-item">{opt}</li>
                                        )) : (<li className="searchable-dropdown-item !cursor-default">Không tìm thấy</li>)}
                                    </ul>
                                )}
                            </div>
                            <div ref={styleDropdownRef} className="searchable-dropdown-container">
                                <label htmlFor="style-search" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Phong cách ảnh</label>
                                <input type="text" id="style-search" value={styleSearch}
                                    onChange={(e) => { setStyleSearch(e.target.value); handleOptionChange('style', e.target.value); setIsStyleDropdownOpen(true); }}
                                    onFocus={() => setIsStyleDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setIsStyleDropdownOpen(false), 200)}
                                    className="form-input" placeholder="Tìm hoặc nhập phong cách..." autoComplete="off" />
                                {isStyleDropdownOpen && (
                                    <ul className="searchable-dropdown-list">
                                        {filteredStyles.length > 0 ? filteredStyles.map(opt => (
                                            <li key={opt} onMouseDown={() => handleSelectOption('style', opt)} className="searchable-dropdown-item">{opt}</li>
                                        )) : (<li className="searchable-dropdown-item !cursor-default">Không tìm thấy</li>)}
                                    </ul>
                                )}
                            </div>
                             <div>
                                <label htmlFor="aspect-ratio-dress" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Tỷ lệ khung ảnh</label>
                                <select id="aspect-ratio-dress" value={appState.options.aspectRatio} onChange={(e) => handleOptionChange('aspectRatio', e.target.value)} className="form-input">
                                    {ASPECT_RATIO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Ghi chú bổ sung</label>
                            <textarea id="notes" value={appState.options.notes} onChange={(e) => handleOptionChange('notes', e.target.value)} placeholder="Ví dụ: thêm phụ kiện vòng cổ, ánh sáng ban đêm..." className="form-input h-24" rows={3} />
                        </div>
                        <div className="flex items-center pt-2">
                            <input type="checkbox" id="remove-watermark-dress" checked={appState.options.removeWatermark} onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)} className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" aria-label="Xóa watermark nếu có" />
                            <label htmlFor="remove-watermark-dress" className="ml-3 block text-sm font-medium text-neutral-300">Xóa watermark (nếu có)</label>
                        </div>
                        <div className="flex items-center justify-end gap-4 pt-4">
                            <button onClick={onReset} className="btn btn-secondary">Đổi ảnh khác</button>
                            <button onClick={executeInitialGeneration} className="btn btn-primary" disabled={isLoading}>{isLoading ? 'Đang thử đồ...' : 'Thử đồ'}</button>
                        </div>
                    </OptionsPanel>
                </motion.div>
            )}
            
            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView stage={appState.stage} originalImage={appState.modelImage} onOriginalClick={() => appState.modelImage && openLightbox(lightboxImages.indexOf(appState.modelImage))} error={appState.error} isMobile={isMobile} actions={
                    <>
                        {appState.generatedImage && !appState.error && (<button onClick={handleDownloadAll} className="btn btn-primary">Tải về tất cả</button>)}
                        <button onClick={handleBackToOptions} className="btn btn-secondary">Chỉnh sửa tùy chọn</button>
                        <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">Bắt đầu lại</button>
                    </>
                }>
                    {appState.clothingImage && (
                        <motion.div key="clothing" className="w-full md:w-auto flex-shrink-0" whileHover={{ scale: 1.05, zIndex: 10 }} transition={{ duration: 0.2 }}>
                            <ActionablePolaroidCard caption="Trang phục" status="done" mediaUrl={appState.clothingImage} isMobile={isMobile} onClick={() => appState.clothingImage && openLightbox(lightboxImages.indexOf(appState.clothingImage))} isEditable={true} isSwappable={true} isGallerySelectable={true} onImageChange={handleClothingImageChange} />
                        </motion.div>
                    )}
                    <motion.div className="w-full md:w-auto flex-shrink-0" key="generated-dress" initial={{ opacity: 0, scale: 0.5, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.2 }} whileHover={{ scale: 1.05, zIndex: 10 }}>
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
                            regenerationPlaceholder="Ví dụ: thay đổi kiểu tóc, thêm một chiếc túi xách..."
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

            <Lightbox images={lightboxImages} selectedIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
        </div>
    );
};