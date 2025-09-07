/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { ChangeEvent, useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateToyModelImage, editImageWithPrompt } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    ImageForZip,
    AppOptionsLayout,
    OptionsPanel,
    type ToyModelCreatorState,
    handleFileUpload,
    useLightbox,
    useVideoGeneration,
    processAndDownloadAll,
    getInitialStateForApp,
    SearchableSelect,
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

// --- Concept Definitions ---
const CONCEPTS_DATA = {
    desktop_model: {
        name: 'Mô hình bên bàn máy tính',
        options: [
            { id: 'computerType', label: 'Loại máy tính', type: 'searchable-select', choices: ['iMac Pro màn hình 5K', 'PC Gaming (full LED RGB, tản nhiệt nước)', 'Laptop Macbook Pro', 'Laptop Gaming Alienware', 'Microsoft Surface Studio', 'Dàn máy tính server', 'Máy tính cổ điển (phong cách 80s)', 'Màn hình cong siêu rộng', 'Concept máy tính trong suốt', 'Máy tính bảng iPad Pro', 'Máy tính bảng Samsung Galaxy Tab S9 Ultra', 'Máy tính bảng vẽ Wacom MobileStudio Pro'] },
            { id: 'softwareType', label: 'Phần mềm trên màn hình', type: 'searchable-select', getChoices: (options: ToyModelCreatorState['options']) => (options.computerType.toLowerCase().includes('máy tính bảng') ? ['Mô hình Wireframe 3D', 'Mô hình đất sét (Clay render)', 'Bản thiết kế kỹ thuật (Blueprint)', 'Giao diện ứng dụng Procreate', 'Giao diện ứng dụng Nomad Sculpt', 'Giao diện ứng dụng Infinite Painter', 'Bản phác thảo kỹ thuật số (Digital sketch)', 'Bảng màu (Color palette)', 'Giao diện ứng dụng Forger'] : ['Mô hình Wireframe 3D', 'Mô hình đất sét (Clay render)', 'Bản thiết kế kỹ thuật (Blueprint)', 'Giao diện phần mềm Blender', 'Giao diện phần mềm ZBrush', 'Giao diện Autodesk Maya', 'Giao diện Unreal Engine 5', 'Concept art 2D của nhân vật', 'Sơ đồ mạch điện tử', 'Mã code lập trình']) },
            { id: 'boxType', label: 'Loại hộp đồ chơi', type: 'searchable-select', choices: ['Hộp giấy tiêu chuẩn', 'Vỉ nhựa trong suốt (Blister pack)', 'Túi nilon trong suốt (Transparent polybag)', 'Hộp phiên bản sưu tầm', 'Hộp gỗ cao cấp khắc laser', 'Bao bì tối giản', 'Hộp thiếc vintage', 'Hộp bí ẩn (Mystery box)', 'Hộp trưng bày Acrylic', 'Bao bì phong cách Nhật Bản', 'Hộp phát sáng (LED)'] },
            { id: 'background', label: 'Phông nền', type: 'searchable-select', choices: ['Không gian làm việc sạch sẽ, tối giản', 'Bàn làm việc của nghệ sĩ (bừa bộn)', 'Phòng thí nghiệm khoa học viễn tưởng', 'Xưởng của thợ mộc', 'Giá sách trong thư viện cổ', 'Cửa sổ nhìn ra thành phố Tokyo ban đêm', 'Phòng điều khiển tàu vũ trụ', 'Bên trong một viện bảo tàng', 'Bàn làm việc Steampunk', 'Khu vườn Nhật Bản thu nhỏ', 'Bối cảnh Cyberpunk'] },
        ],
    },
    keychain: {
        name: 'Móc khoá 3D trên bàn',
        options: [
            { id: 'keychainMaterial', label: 'Chất liệu móc khoá', type: 'searchable-select', choices: ['Nhựa Acrylic trong suốt', 'Men cứng (Hard Enamel)', 'Kim loại', 'Gỗ khắc laser', 'Cao su mềm'] },
            { id: 'keychainStyle', label: 'Kiểu móc khoá', type: 'searchable-select', choices: ['Chibi', 'Pixel Art', 'Low Poly', 'Hiện thực (Realistic)'] },
            { id: 'accompanyingItems', label: 'Vật dụng đi kèm', type: 'searchable-select', choices: ['Chùm chìa khoá xe', 'Bút và Sổ tay', 'Cốc cà phê', 'Tai nghe', 'Không có gì'] },
            { id: 'deskSurface', label: 'Bề mặt bàn', type: 'searchable-select', choices: ['Gỗ sồi', 'Mặt đá cẩm thạch', 'Kim loại xước', 'Bàn cutting mat', 'Vải nỉ'] },
        ]
    },
    gachapon: {
        name: 'Mô hình "Gachapon"',
        options: [
            { id: 'capsuleColor', label: 'Màu viên nang', type: 'searchable-select', choices: ['Trong suốt', 'Xanh dương & Trắng', 'Vàng & Cam', 'Đỏ & Trắng', 'Đen & Vàng (Bí ẩn)'] },
            { id: 'modelFinish', label: 'Hoàn thiện mô hình', type: 'searchable-select', choices: ['Sơn bóng (Glossy)', 'Sơn mờ (Matte)', 'Hiệu ứng kim loại', 'Nhựa trong suốt', 'Phát sáng trong đêm'] },
            { id: 'capsuleContents', label: 'Vật phẩm trong nang', type: 'searchable-select', choices: ['Chỉ mô hình', 'Mô hình và đế trưng bày', 'Mô hình và phụ kiện nhỏ'] },
            { id: 'displayLocation', label: 'Nơi trưng bày', type: 'searchable-select', choices: ['Bên cạnh máy Gachapon', 'Trên kệ sưu tầm', 'Trong lòng bàn tay', 'Trên bàn làm việc'] },
        ]
    },
    miniature: {
        name: 'Tượng nhỏ trên đế',
        options: [
            { id: 'miniatureMaterial', label: 'Chất liệu tượng', type: 'searchable-select', choices: ['Nhựa Resin', 'Đất sét Polymer', 'Đồng', 'Đá cẩm thạch', 'Pha lê', 'Gỗ'] },
            { id: 'baseMaterial', label: 'Chất liệu đế', type: 'searchable-select', choices: ['Gỗ óc chó', 'Đá cẩm thạch đen', 'Bê tông', 'Đế Acrylic trong suốt', 'Đá tự nhiên'] },
            { id: 'baseShape', label: 'Hình dạng đế', type: 'searchable-select', choices: ['Tròn', 'Vuông', 'Lục giác', 'Tự nhiên (phiến đá, khúc gỗ)'] },
            { id: 'lightingStyle', label: 'Kiểu chiếu sáng', type: 'searchable-select', choices: ['Ánh sáng studio (mềm, 3 điểm)', 'Đèn chiếu điểm từ trên (Spotlight)', 'Ánh sáng tự nhiên từ cửa sổ', 'Ánh sáng huyền ảo từ dưới lên'] },
        ]
    },
    pokemon_model: {
        name: 'Mô hình Pokémon',
        options: [
            { id: 'pokeballType', label: 'Loại Poké Ball', type: 'searchable-select', choices: ['Poké Ball (thường)', 'Great Ball', 'Ultra Ball', 'Master Ball', 'Premier Ball', 'Safari Ball'] },
            { id: 'evolutionDisplay', label: 'Hiển thị tiến hoá', type: 'searchable-select', choices: ['Một dạng tiến hoá', 'Toàn bộ chuỗi tiến hoá', 'Không hiển thị'] },
            { id: 'modelStyle', label: 'Phong cách mô hình', type: 'searchable-select', choices: ['Chân thực (Realistic)', 'Chibi / Nendoroid', 'Phong cách Funko Pop', 'Mô hình đất sét (Clay)', 'Low Poly', 'Pixel Art'] },
        ]
    }
};

const ASPECT_RATIO_OPTIONS = ['Giữ nguyên', '1:1', '2:3', '4:5', '9:16', '1:2', '3:2', '5:4', '16:9', '2:1'];

const ToyModelCreator: React.FC<ToyModelCreatorProps> = (props) => {
    const { 
        uploaderCaption, uploaderDescription, addImagesToGallery,
        appState, onStateChange, onReset,
        ...headerProps
    } = props;
    
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();

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
        onStateChange({ ...appState, options: { ...appState.options, [field]: value } });
    };

    const handleConceptChange = (newConceptId: string) => {
        const initialAppState = getInitialStateForApp('toy-model-creator') as ToyModelCreatorState;
        onStateChange({
            ...appState,
            concept: newConceptId,
            options: initialAppState.options, // Reset options to default for the app
        });
    };
    
    const executeInitialGeneration = async () => {
        if (!appState.uploadedImage) return;

        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            // No need to transform options, the service handles '' and 'Tự động' correctly
            const resultUrl = await generateToyModelImage(appState.uploadedImage, appState.concept, appState.options);
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
        if (appState.uploadedImage) {
            inputImages.push({ url: appState.uploadedImage, filename: 'anh-goc', folder: 'input' });
        }
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            videoTasks,
            zipFilename: `mo-hinh-${appState.concept}.zip`,
            baseOutputFilename: 'mo-hinh',
        });
    };
    
    const renderOption = (option: any) => {
        const { id, label, type } = option;
        const value = appState.options[id as keyof typeof appState.options] as string;
        
        if (type === 'text-input') {
            return (
                <div key={id} className="md:col-span-2">
                    <label htmlFor={id} className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{label}</label>
                    <input
                        id={id}
                        type="text"
                        value={value}
                        onChange={(e) => handleOptionChange(id, e.target.value)}
                        className="form-input"
                        placeholder="Ví dụ: Pikachu (giúp AI nhận diện tiến hoá)"
                    />
                </div>
            );
        }
        
        if (type === 'searchable-select') {
             const choices = typeof option.getChoices === 'function' ? option.getChoices(appState.options) : option.choices;
            return (
                <SearchableSelect
                    key={id}
                    id={id}
                    label={label}
                    options={choices}
                    value={value}
                    onChange={(newValue) => handleOptionChange(id, newValue)}
                    placeholder="Để trống để chọn Tự động..."
                />
            );
        }
        return null;
    };
    
    const isLoading = appState.stage === 'generating';
    const currentConceptData = CONCEPTS_DATA[appState.concept as keyof typeof CONCEPTS_DATA];

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
                {(appState.stage === 'idle' || appState.stage === 'configuring') && (<AppScreenHeader {...headerProps} />)}
            </AnimatePresence>

            <div className="flex flex-col items-center justify-center w-full flex-1">
                {appState.stage === 'idle' && (
                    <ImageUploader
                        onImageChange={handleImageSelectedForUploader}
                        uploaderCaption={uploaderCaption}
                        uploaderDescription={uploaderDescription}
                        placeholderType="magic"
                    />
                )}

                {appState.stage === 'configuring' && appState.uploadedImage && (
                    <AppOptionsLayout>
                        <div className="flex-shrink-0">
                            <ActionablePolaroidCard type="content-input" mediaUrl={appState.uploadedImage} caption="Ảnh gốc" status="done" onClick={() => openLightbox(0)} onImageChange={handleUploadedImageChange} />
                        </div>
                        <OptionsPanel>
                            <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">Tùy chỉnh mô hình</h2>
                            <div>
                                <label className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Concept</label>
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                     {Object.entries(CONCEPTS_DATA).map(([id, { name }]) => {
                                        const isSelected = appState.concept === id;
                                        return (
                                            <button
                                                key={id}
                                                onClick={() => handleConceptChange(id)}
                                                role="radio"
                                                aria-checked={isSelected}
                                                className={`base-font font-bold p-3 rounded-md text-sm text-center transition-all duration-200 ${
                                                    isSelected
                                                    ? 'bg-yellow-400 text-black ring-2 ring-yellow-300 scale-105'
                                                    : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                                                }`}
                                            >
                                                {name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentConceptData.options.map(renderOption)}
                            </div>
                            <div>
                                <label htmlFor="aspectRatio-toy" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Tỉ lệ khung ảnh</label>
                                <select id="aspectRatio-toy" value={appState.options.aspectRatio} onChange={(e) => handleOptionChange('aspectRatio', e.target.value)} className="form-input">
                                    {ASPECT_RATIO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Ghi chú bổ sung</label>
                                <textarea id="notes" value={appState.options.notes} onChange={(e) => handleOptionChange('notes', e.target.value)} placeholder="Ví dụ: mô hình làm bằng gỗ, hộp đồ chơi có hiệu ứng..." className="form-input h-24" rows={3} />
                            </div>
                            <div className="flex items-center pt-2">
                                <input type="checkbox" id="remove-watermark-toy" checked={appState.options.removeWatermark} onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)} className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" />
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
                    <motion.div className="w-full md:w-auto flex-shrink-0" key="generated-toy" initial={{ opacity: 0, scale: 0.5, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.15 }}>
                        <ActionablePolaroidCard
                            type="output"
                            caption={CONCEPTS_DATA[appState.concept as keyof typeof CONCEPTS_DATA].name} status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')} mediaUrl={appState.generatedImage ?? undefined} error={appState.error ?? undefined}
                            onImageChange={handleGeneratedImageChange}
                            onRegenerate={handleRegeneration}
                            onGenerateVideoFromPrompt={(prompt) => appState.generatedImage && generateVideo(appState.generatedImage, prompt)}
                            regenerationTitle="Tinh chỉnh mô hình"
                            regenerationDescription="Thêm ghi chú để cải thiện ảnh"
                            regenerationPlaceholder="Ví dụ: thêm hiệu ứng ánh sáng neon, ..."
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined} />
                    </motion.div>
                    {appState.historicalImages.map(sourceUrl => {
                        const videoTask = videoTasks[sourceUrl];
                        if (!videoTask) return null;
                        return (
                            <motion.div className="w-full md:w-auto flex-shrink-0" key={`${sourceUrl}-video`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 100, damping: 20 }}>
                                <ActionablePolaroidCard
                                    type="output"
                                    caption="Video"
                                    status={videoTask.status}
                                    mediaUrl={videoTask.resultUrl}
                                    error={videoTask.error}
                                    onClick={videoTask.resultUrl ? () => openLightbox(lightboxImages.indexOf(videoTask.resultUrl!)) : undefined} />
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

export default ToyModelCreator;