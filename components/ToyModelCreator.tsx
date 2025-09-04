/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { ChangeEvent, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateToyModelImage, editImageWithPrompt } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    downloadAllImagesAsZip,
    ImageForZip,
    AppOptionsLayout,
    OptionsPanel,
    type ToyModelCreatorState,
    handleFileUpload,
    useLightbox,
} from './uiUtils';

interface ToyModelCreatorProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaption: string;
    uploaderDescription: string;
    addImagesToGallery: (images: string[]) => void;
    appState: ToyModelCreatorState;
    onStateChange: (newState: ToyModelCreatorState) => void;
    onReset: () => void;
    onGoBack: () => void;
}

const COMPUTER_OPTIONS = ['Tự động', 'iMac Pro màn hình 5K', 'PC Gaming (full LED RGB, tản nhiệt nước)', 'Laptop Macbook Pro', 'Laptop Gaming Alienware', 'Microsoft Surface Studio', 'Dàn máy tính server', 'Máy tính cổ điển (phong cách 80s)', 'Màn hình cong siêu rộng', 'Concept máy tính trong suốt', 'Máy tính bảng iPad Pro', 'Máy tính bảng Samsung Galaxy Tab S9 Ultra', 'Máy tính bảng vẽ Wacom MobileStudio Pro'];
const SOFTWARE_OPTIONS_COMPUTER = ['Tự động', 'Mô hình Wireframe 3D', 'Mô hình đất sét (Clay render)', 'Bản thiết kế kỹ thuật (Blueprint)', 'Giao diện phần mềm Blender', 'Giao diện phần mềm ZBrush', 'Giao diện Autodesk Maya', 'Giao diện Unreal Engine 5', 'Concept art 2D của nhân vật', 'Sơ đồ mạch điện tử', 'Mã code lập trình'];
const SOFTWARE_OPTIONS_TABLET = ['Tự động', 'Giao diện ứng dụng Procreate', 'Giao diện ứng dụng Nomad Sculpt', 'Giao diện ứng dụng Infinite Painter', 'Bản phác thảo kỹ thuật số (Digital sketch)', 'Mô hình đất sét (Clay render)', 'Bảng màu (Color palette)', 'Giao diện ứng dụng Forger'];
const BOX_OPTIONS = ['Tự động', 'Hộp giấy tiêu chuẩn', 'Vỉ nhựa trong suốt (Blister pack)', 'Túi nilon trong suốt (Transparent polybag)', 'Hộp phiên bản sưu tầm', 'Hộp gỗ cao cấp khắc laser', 'Bao bì tối giản', 'Hộp thiếc vintage', 'Hộp bí ẩn (Mystery box)', 'Hộp trưng bày Acrylic', 'Bao bì phong cách Nhật Bản', 'Hộp phát sáng (LED)'];
const BACKGROUND_OPTIONS = ['Tự động', 'Không gian làm việc sạch sẽ, tối giản', 'Bàn làm việc của nghệ sĩ (bừa bộn)', 'Phòng thí nghiệm khoa học viễn tưởng', 'Xưởng của thợ mộc', 'Giá sách trong thư viện cổ', 'Cửa sổ nhìn ra thành phố Tokyo ban đêm', 'Phòng điều khiển tàu vũ trụ', 'Bên trong một viện bảo tàng', 'Bàn làm việc Steampunk', 'Khu vườn Nhật Bản thu nhỏ', 'Bối cảnh Cyberpunk'];
const ASPECT_RATIO_OPTIONS = ['Giữ nguyên', '1:1', '2:3', '4:5', '9:16', '1:2', '3:2', '5:4', '16:9', '2:1'];

const ToyModelCreator: React.FC<ToyModelCreatorProps> = (props) => {
    const { 
        uploaderCaption, uploaderDescription, addImagesToGallery,
        appState, onStateChange, onReset,
        ...headerProps
    } = props;
    
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();

    const lightboxImages = [appState.uploadedImage, ...appState.historicalImages].filter((img): img is string => !!img);

    const handleImageSelectedForUploader = (imageDataUrl: string) => {
        onStateChange({
            ...appState,
            stage: 'configuring',
            uploadedImage: imageDataUrl,
            generatedImage: null,
            historicalImages: [],
            error: null,
        });
        addImagesToGallery([imageDataUrl]);
    };

    const handleImageUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, handleImageSelectedForUploader);
    }, [appState, onStateChange]);

    const handleUploadedImageChange = (newUrl: string) => {
        onStateChange({ ...appState, uploadedImage: newUrl });
        addImagesToGallery([newUrl]);
    };

    const handleGeneratedImageChange = (newUrl: string) => {
        const newHistorical = [...appState.historicalImages, newUrl];
        onStateChange({ ...appState, stage: 'results', generatedImage: newUrl, historicalImages: newHistorical });
        addImagesToGallery([newUrl]);
    };
    
    const handleOptionChange = (field: keyof ToyModelCreatorState['options'], value: string | boolean) => {
        const newState = { ...appState, options: { ...appState.options, [field]: value } };
        
        // Logic to reset softwareType if computerType changes category (PC/Tablet)
        if (field === 'computerType') {
            const isTablet = (value as string).toLowerCase().includes('máy tính bảng');
            const currentSoftwareOptions = isTablet ? SOFTWARE_OPTIONS_TABLET : SOFTWARE_OPTIONS_COMPUTER;
            if (!currentSoftwareOptions.includes(newState.options.softwareType)) {
                newState.options.softwareType = 'Tự động';
            }
        }
        
        onStateChange(newState);
    };

    const executeInitialGeneration = async () => {
        if (!appState.uploadedImage) return;

        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await generateToyModelImage(appState.uploadedImage, appState.options);
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
                filename: `mo-hinh-do-choi-${index + 1}`,
                folder: 'output'
            });
        });
        downloadAllImagesAsZip(imagesToZip, 'mo-hinh-do-choi.zip');
    };
    
    const renderSelect = (id: keyof ToyModelCreatorState['options'], label: string, optionList: readonly string[]) => (
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
    
    const isTablet = appState.options.computerType.toLowerCase().includes('máy tính bảng');
    const currentSoftwareOptions = isTablet ? SOFTWARE_OPTIONS_TABLET : SOFTWARE_OPTIONS_COMPUTER;
    const isLoading = appState.stage === 'generating';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
                {(appState.stage === 'idle' || appState.stage === 'configuring') && (<AppScreenHeader {...headerProps} />)}
            </AnimatePresence>

            <div className="flex flex-col items-center justify-center w-full flex-1">
                {appState.stage === 'idle' && (
                    <ImageUploader
                        id="toy-model-upload"
                        onImageUpload={handleImageUpload}
                        onImageChange={handleImageSelectedForUploader}
                        uploaderCaption={uploaderCaption}
                        uploaderDescription={uploaderDescription}
                        placeholderType="magic"
                    />
                )}

                {appState.stage === 'configuring' && appState.uploadedImage && (
                    <AppOptionsLayout>
                        <div className="flex-shrink-0">
                            <ActionablePolaroidCard 
                                imageUrl={appState.uploadedImage} 
                                caption="Ảnh gốc" 
                                status="done" 
                                onClick={() => openLightbox(0)} 
                                isEditable={true}
                                isSwappable={true}
                                isGallerySelectable={true}
                                onImageChange={handleUploadedImageChange}
                            />
                        </div>
                        <OptionsPanel>
                             <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">Tùy chỉnh mô hình</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {renderSelect('computerType', 'Loại máy tính', COMPUTER_OPTIONS)}
                                {renderSelect('softwareType', 'Phần mềm trên màn hình', currentSoftwareOptions)}
                                {renderSelect('boxType', 'Loại hộp đồ chơi', BOX_OPTIONS)}
                                {renderSelect('background', 'Phông nền', BACKGROUND_OPTIONS)}
                            </div>
                            <div>
                                {renderSelect('aspectRatio', 'Tỉ lệ khung ảnh', ASPECT_RATIO_OPTIONS)}
                            </div>
                            <div>
                                <label htmlFor="notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Ghi chú bổ sung</label>
                                <textarea id="notes" value={appState.options.notes} onChange={(e) => handleOptionChange('notes', e.target.value)}
                                    placeholder="Ví dụ: mô hình làm bằng gỗ, hộp đồ chơi có hiệu ứng..." className="form-input h-24" rows={3} />
                            </div>
                            <div className="flex items-center pt-2">
                                <input type="checkbox" id="remove-watermark-toy" checked={appState.options.removeWatermark}
                                    onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                    className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" />
                                <label htmlFor="remove-watermark-toy" className="ml-3 block text-sm font-medium text-neutral-300">Xóa watermark (nếu có)</label>
                            </div>
                            <div className="flex items-center justify-end gap-4 pt-4">
                                <button onClick={onReset} className="btn btn-secondary">Đổi ảnh khác</button>
                                <button onClick={executeInitialGeneration} className="btn btn-primary" disabled={isLoading}>{isLoading ? 'Đang tạo...' : 'Tạo mô hình'}</button>
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
                    error={appState.error}
                    actions={
                        <>
                            {appState.generatedImage && !appState.error && (<button onClick={handleDownloadAll} className="btn btn-primary">Tải về tất cả</button>)}
                            <button onClick={handleBackToOptions} className="btn btn-secondary">Chỉnh sửa tùy chọn</button>
                            <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">Bắt đầu lại</button>
                        </>
                    }>
                    <motion.div
                        className="w-full md:w-auto flex-shrink-0"
                        key="generated-toy"
                        initial={{ opacity: 0, scale: 0.5, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.15 }}>
                        <ActionablePolaroidCard 
                            caption="Mô hình đồ chơi" 
                            status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            imageUrl={appState.generatedImage ?? undefined} error={appState.error ?? undefined}
                            isDownloadable={true}
                            isEditable={true}
                            isRegeneratable={true}
                            onImageChange={handleGeneratedImageChange}
                            onRegenerate={handleRegeneration}
                            regenerationTitle="Tinh chỉnh mô hình"
                            regenerationDescription="Thêm ghi chú để cải thiện ảnh"
                            regenerationPlaceholder="Ví dụ: thêm hiệu ứng ánh sáng neon, ..."
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined} />
                    </motion.div>
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

export default ToyModelCreator;
