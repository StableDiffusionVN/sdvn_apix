/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generatePatrioticImage, editImageWithPrompt } from '../services/geminiService';
import PolaroidCard from './PolaroidCard';
import Lightbox from './Lightbox';
import { 
    downloadImage, 
    RegenerationModal,
    useMediaQuery,
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    downloadAllImagesAsZip,
    ImageForZip,
    type AvatarCreatorState,
    handleFileUpload,
    useLightbox,
    useImageEditor,
} from './uiUtils';

const IDEAS_BY_CATEGORY = [
    {
        category: "Khoảnh Khắc Tự Hào",
        ideas: [
            'Tung bay tà áo dài và lá cờ đỏ',
            'Nụ cười rạng rỡ bên lá cờ Tổ quốc',
            'Chào cờ trang nghiêm ở Quảng trường Ba Đình',
            'Ánh mắt tự hào hướng về lá cờ',
            'Dạo bước trên con đường cờ hoa rực rỡ',
            'Tự tin check-in tại Cột cờ Lũng Cú',
            'Tay trong tay cùng người lính hải quân',
            'Vẻ đẹp kiêu hãnh trước Lăng Bác',
            'Giọt lệ hạnh phúc khi quốc ca vang lên',
            'Gửi gắm tình yêu nơi cột mốc Trường Sa',
            'Thiếu nữ với bó hoa sen và cờ đỏ',
            'Vẫy cao lá cờ chiến thắng',
            'Gia đình nhỏ bên lá cờ Tổ quốc',
            'Khoảnh khắc đời thường dưới bóng cờ',
            'Áo dài đỏ tung bay trên phố cổ'
        ],
    },
    {
        category: "Biểu tượng & Văn hóa",
        ideas: ['Áo dài đỏ sao vàng', 'Bên cạnh hoa sen hồng', 'Họa tiết trống đồng Đông Sơn', 'Đội nón lá truyền thống', 'Vẽ mặt hình cờ đỏ sao vàng', 'Cầm cành đào ngày Tết', 'Bên cạnh cây mai vàng', 'Áo dài trắng nữ sinh', 'Múa lân sư rồng', 'Chơi đàn T\'rưng', 'Thả đèn hoa đăng', 'Nghệ nhân gốm Bát Tràng', 'Vẻ đẹp thiếu nữ bên khung cửi', 'Cầm lồng đèn Trung Thu', 'Nghệ thuật múa rối nước'],
    },
    {
        category: "Lịch sử & Anh hùng",
        ideas: ['Chiến sĩ Điện Biên Phủ', 'Nữ tướng Hai Bà Trưng', 'Vua Hùng dựng nước', 'Thanh niên xung phong', 'Chiến sĩ hải quân Trường Sa', 'Anh bộ đội Cụ Hồ', 'Du kích trong rừng', 'Cô gái mở đường', 'Tinh thần bất khuất thời Trần', 'Hình tượng Thánh Gióng', 'Nữ anh hùng Võ Thị Sáu', 'Chân dung thời bao cấp', 'Chiến sĩ giải phóng quân', 'Dân công hỏa tuyến', 'Người lính biên phòng'],
    },
    {
        category: "Phong cảnh & Địa danh",
        ideas: ['Giữa ruộng bậc thang Sapa', 'Trên thuyền ở Vịnh Hạ Long', 'Đứng trước Hồ Gươm, cầu Thê Húc', 'Khám phá hang Sơn Đoòng', 'Cánh đồng lúa chín vàng', 'Vẻ đẹp cao nguyên đá Hà Giang', 'Hoàng hôn trên phá Tam Giang', 'Biển xanh Phú Quốc', 'Chèo thuyền ở Tràng An, Ninh Bình', 'Đi giữa phố cổ Hội An', 'Cột cờ Lũng Cú', 'Dinh Độc Lập lịch sử', 'Nhà thờ Đức Bà Sài Gòn', 'Bên dòng sông Mekong', 'Vẻ đẹp Đà Lạt mộng mơ'],
    },
    {
        category: "Ẩm thực & Đời sống",
        ideas: ['Thưởng thức Phở Hà Nội', 'Uống cà phê sữa đá Sài Gòn', 'Gói bánh chưng ngày Tết', 'Gánh hàng rong phố cổ', 'Ăn bánh mì vỉa hè', 'Không khí chợ nổi Cái Răng', 'Làm nón lá', 'Người nông dân trên đồng', 'Ngư dân kéo lưới', 'Gia đình sum vầy', 'Bên xe máy Dream huyền thoại', 'Uống trà đá vỉa hè', 'Bữa cơm gia đình Việt', 'Làm muối ở Hòn Khói', 'Trồng cây cà phê Tây Nguyên'],
    },
    {
        category: "Nghệ thuật & Sáng tạo",
        ideas: ['Phong cách tranh cổ động', 'Phong cách tranh sơn mài', 'Họa tiết gốm Chu Đậu', 'Nét vẽ tranh Đông Hồ', 'Ánh sáng từ đèn lồng Hội An', 'Nghệ thuật thư pháp', 'Họa tiết thổ cẩm Tây Bắc', 'Phong cách ảnh phim xưa', 'Nghệ thuật điêu khắc Chăm Pa', 'Vẻ đẹp tranh lụa', 'Phong cách Cyberpunk Sài Gòn', 'Hòa mình vào dải ngân hà', 'Họa tiết rồng thời Lý', 'Ánh sáng neon hiện đại', 'Phong cách Low-poly'],
    },
    {
        category: "Thể thao & Tự hào",
        ideas: ['Cổ động viên bóng đá cuồng nhiệt', 'Khoảnh khắc nâng cúp vàng', 'Vận động viên SEA Games', 'Tay đua xe đạp', 'Võ sĩ Vovinam', 'Cầu thủ bóng đá chuyên nghiệp', 'Niềm vui chiến thắng', 'Đi bão sau trận thắng', 'Vận động viên điền kinh', 'Tinh thần thể thao Olympic', 'Tay vợt cầu lông', 'Nữ vận động viên wushu', 'Cờ đỏ trên khán đài', 'Vận động viên bơi lội', 'Huy chương vàng tự hào'],
    },
    {
        category: "Tương lai & Khoa học",
        ideas: ['Phi hành gia cắm cờ Việt Nam', 'Nhà khoa học trong phòng thí nghiệm', 'Kỹ sư công nghệ tương lai', 'Thành phố thông minh', 'Nông nghiệp công nghệ cao', 'Bác sĩ robot y tế', 'Năng lượng mặt trời Việt Nam', 'Khám phá đại dương', 'Chuyên gia trí tuệ nhân tạo', 'Kiến trúc sư công trình xanh'],
    },
];
const ASPECT_RATIO_OPTIONS = ['Giữ nguyên', '1:1', '2:3', '4:5', '9:16', '1:2', '3:2', '5:4', '16:9', '2:1'];

interface AvatarCreatorProps {
    mainTitle: string;
    subtitle: string;
    minIdeas: number;
    maxIdeas: number;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaption: string;
    uploaderDescription: string;
    addImagesToGallery: (images: string[]) => void;
    appState: AvatarCreatorState;
    onStateChange: (newState: AvatarCreatorState) => void;
    onReset: () => void;
    onGoBack: () => void;
    openImageEditor: (url: string, onSave: (newUrl: string) => void) => void;
}

const AvatarCreator: React.FC<AvatarCreatorProps> = (props) => {
    const { 
        minIdeas, maxIdeas, 
        uploaderCaption, uploaderDescription,
        addImagesToGallery,
        appState, onStateChange, onReset, onGoBack,
        openImageEditor,
        ...headerProps
    } = props;
    
    const [modifyingIdea, setModifyingIdea] = useState<string | null>(null);
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const isMobile = useMediaQuery('(max-width: 768px)');

    const outputLightboxImages = appState.selectedIdeas
        .map(idea => appState.generatedImages[idea])
        .filter(img => img?.status === 'done' && img.url)
        .map(img => img.url!);

    const lightboxImages = [appState.uploadedImage, ...outputLightboxImages].filter((img): img is string => !!img);
    
    const handleImageUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
            onStateChange({
                ...appState,
                stage: 'configuring',
                uploadedImage: imageDataUrl,
                generatedImages: {},
                selectedIdeas: [],
                historicalImages: [],
                error: null,
            });
        });
    }, [appState, onStateChange]);

    const handleOptionChange = (field: keyof AvatarCreatorState['options'], value: string | boolean) => {
        onStateChange({
            ...appState,
            options: { ...appState.options, [field]: value },
        });
    };

    const handleIdeaSelect = (idea: string) => {
        const { selectedIdeas } = appState;
        let newSelectedIdeas: string[];

        if (selectedIdeas.includes(idea)) {
            newSelectedIdeas = selectedIdeas.filter(p => p !== idea);
        } else if (selectedIdeas.length < maxIdeas) {
            newSelectedIdeas = [...selectedIdeas, idea];
        } else {
            return; // Max reached, do nothing
        }

        onStateChange({ ...appState, selectedIdeas: newSelectedIdeas });
    };

    const handleGenerateClick = async () => {
        if (!appState.uploadedImage || appState.selectedIdeas.length < minIdeas || appState.selectedIdeas.length > maxIdeas) return;
        
        const stage : 'generating' = 'generating';
        onStateChange({ ...appState, stage: stage });
        
        const ideasToGenerate = appState.selectedIdeas;
        const initialGeneratedImages = { ...appState.generatedImages };
        ideasToGenerate.forEach(idea => {
            initialGeneratedImages[idea] = { status: 'pending' };
        });
        
        onStateChange({ ...appState, stage: stage, generatedImages: initialGeneratedImages });

        const concurrencyLimit = 2;
        const ideasQueue = [...ideasToGenerate];
        
        let currentAppState: AvatarCreatorState = { ...appState, stage: stage, generatedImages: initialGeneratedImages };

        const processIdea = async (idea: string) => {
            try {
                const resultUrl = await generatePatrioticImage(appState.uploadedImage!, idea, appState.options.additionalPrompt, appState.options.removeWatermark, appState.options.aspectRatio);
                
                currentAppState = {
                    ...currentAppState,
                    generatedImages: {
                        ...currentAppState.generatedImages,
                        [idea]: { status: 'done', url: resultUrl },
                    },
                    historicalImages: [...currentAppState.historicalImages, { idea, url: resultUrl }],
                };
                onStateChange(currentAppState);
                addImagesToGallery([resultUrl]);

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                 currentAppState = {
                    ...currentAppState,
                    generatedImages: {
                        ...currentAppState.generatedImages,
                        [idea]: { status: 'error', error: errorMessage },
                    },
                };
                onStateChange(currentAppState);
                console.error(`Failed to generate image for ${idea}:`, err);
            }
        };

        const workers = Array(concurrencyLimit).fill(null).map(async () => {
            while (ideasQueue.length > 0) {
                const idea = ideasQueue.shift();
                if (idea) {
                    await processIdea(idea);
                }
            }
        });

        await Promise.all(workers);
        
        onStateChange({ ...currentAppState, stage: 'results' });
    };

    const handleRegenerateIdea = (idea: string) => {
        if (appState.generatedImages[idea]?.status === 'pending') return;
        setModifyingIdea(idea);
    };

    const handleConfirmRegeneration = async (customPrompt: string) => {
        if (!modifyingIdea) return;

        const imageToEditState = appState.generatedImages[modifyingIdea];
        if (imageToEditState?.status !== 'done' || !imageToEditState.url) {
            setModifyingIdea(null);
            return;
        }

        const idea = modifyingIdea;
        const imageUrlToEdit = imageToEditState.url;
        setModifyingIdea(null);
        
        onStateChange({
            ...appState,
            generatedImages: { ...appState.generatedImages, [idea]: { status: 'pending' } }
        });

        try {
            const resultUrl = await editImageWithPrompt(imageUrlToEdit, customPrompt);
            onStateChange({
                ...appState,
                generatedImages: { ...appState.generatedImages, [idea]: { status: 'done', url: resultUrl } },
                historicalImages: [...appState.historicalImages, { idea: `${idea}-edit`, url: resultUrl }],
            });
            addImagesToGallery([resultUrl]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
             onStateChange({
                ...appState,
                generatedImages: { ...appState.generatedImages, [idea]: { status: 'error', error: errorMessage } }
            });
            console.error(`Failed to regenerate image for ${idea}:`, err);
        }
    };
    
    const handleChooseOtherIdeas = () => {
        onStateChange({ ...appState, stage: 'configuring' });
    };

    const handleDownloadIndividualImage = (idea: string) => {
        const image = appState.generatedImages[idea];
        if (image?.status === 'done' && image.url) {
            downloadImage(image.url, `vietnamtrongtoi-${idea.replace(/\s+/g, '-').toLowerCase()}.jpg`);
        }
    };

    const handleDownloadOriginalImage = () => {
        if (appState.uploadedImage) {
            downloadImage(appState.uploadedImage, 'anh-goc.jpg');
        }
    };

    const handleDownloadAll = async () => {
        const imagesToZip: ImageForZip[] = [];
        
        if (appState.uploadedImage) {
            imagesToZip.push({
                url: appState.uploadedImage,
                filename: 'anh-goc',
                folder: 'input',
            });
        }
    
        appState.historicalImages.forEach(img => {
            imagesToZip.push({
                url: img.url,
                filename: `vietnamtrongtoi-${img.idea}`,
                folder: 'output',
            });
        });
        
        if (imagesToZip.length > 0) {
            await downloadAllImagesAsZip(imagesToZip, 'vietnamtrongtoi-results.zip');
        } else {
            alert('Không có ảnh nào để tải về.');
        }
    };

    const handleSaveUploadedImage = (newUrl: string) => {
        onStateChange({ ...appState, uploadedImage: newUrl });
    };

    const handleSaveGeneratedImage = (idea: string) => (newUrl: string) => {
        const newGeneratedImages = { ...appState.generatedImages, [idea]: { status: 'done' as 'done', url: newUrl } };
        const newHistorical = [...appState.historicalImages, { idea: `${idea}-edit`, url: newUrl }];
        onStateChange({ ...appState, generatedImages: newGeneratedImages, historicalImages: newHistorical });
        addImagesToGallery([newUrl]);
    };

    const getButtonText = () => {
        if (appState.stage === 'generating') return 'Đang tạo...';
        if (appState.selectedIdeas.length < minIdeas) return `Chọn ít nhất ${minIdeas} ý tưởng`;
        return `Tạo ảnh`;
    };
    
    const hasPartialError = appState.stage === 'results' && Object.values(appState.generatedImages).some(img => img.status === 'error');
    const isLoading = appState.stage === 'generating';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
            {(appState.stage === 'idle' || appState.stage === 'configuring') && (
                <AppScreenHeader {...headerProps} />
            )}
            </AnimatePresence>

            {appState.stage === 'idle' && (
                <ImageUploader 
                    id="avatar-upload"
                    onImageUpload={handleImageUpload}
                    uploaderCaption={uploaderCaption}
                    uploaderDescription={uploaderDescription}
                    placeholderType="person"
                />
            )}

            {appState.stage === 'configuring' && appState.uploadedImage && (
                <motion.div 
                    className="flex flex-col items-center gap-6 w-full max-w-6xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <PolaroidCard 
                        imageUrl={appState.uploadedImage} 
                        caption="Ảnh của bạn" 
                        status="done"
                        onClick={() => openLightbox(0)}
                        onEdit={() => openImageEditor(appState.uploadedImage!, handleSaveUploadedImage)}
                    />

                    <div className="w-full max-w-4xl text-center mt-4">
                        <h2 className="base-font font-bold text-2xl text-neutral-200">Chọn từ {minIdeas} đến {maxIdeas} ý tưởng bạn muốn thử</h2>
                        <p className="text-neutral-400 mb-4">Đã chọn: {appState.selectedIdeas.length}/{maxIdeas}</p>
                        <div className="max-h-[50vh] overflow-y-auto p-4 bg-black/20 border border-white/10 rounded-lg space-y-6">
                            {IDEAS_BY_CATEGORY.map(categoryObj => (
                                <div key={categoryObj.category}>
                                    <h3 className="text-xl base-font font-bold text-yellow-400 text-left mb-3 sticky top-0 bg-black/50 py-2 -mx-4 px-4 z-10">{categoryObj.category}</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {categoryObj.ideas.map(p => {
                                            const isSelected = appState.selectedIdeas.includes(p);
                                            return (
                                                <button 
                                                    key={p}
                                                    onClick={() => handleIdeaSelect(p)}
                                                    className={`base-font font-bold p-2 rounded-sm text-sm transition-all duration-200 ${
                                                        isSelected 
                                                        ? 'bg-yellow-400 text-black ring-2 ring-yellow-300 scale-105' 
                                                        : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                                                    } ${!isSelected && appState.selectedIdeas.length === maxIdeas ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    disabled={!isSelected && appState.selectedIdeas.length === maxIdeas}
                                                >
                                                    {p}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="w-full max-w-4xl mx-auto mt-2 space-y-4">
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
                        <div>
                            <label htmlFor="additional-prompt" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Ghi chú bổ sung (tùy chọn)</label>
                            <textarea
                                id="additional-prompt"
                                value={appState.options.additionalPrompt}
                                onChange={(e) => handleOptionChange('additionalPrompt', e.target.value)}
                                placeholder="Ví dụ: tông màu ấm, phong cách phim xưa..."
                                className="form-input h-20"
                                rows={2}
                                aria-label="Ghi chú bổ sung cho ảnh"
                            />
                        </div>
                        <div className="flex items-center pt-2">
                            <input
                                type="checkbox"
                                id="remove-watermark-avatar"
                                checked={appState.options.removeWatermark}
                                onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800"
                                aria-label="Xóa watermark nếu có"
                            />
                            <label htmlFor="remove-watermark-avatar" className="ml-3 block text-sm font-medium text-neutral-300">
                                Xóa watermark (nếu có)
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4">
                        <button onClick={onReset} className="btn btn-secondary">
                            Đổi ảnh khác
                        </button>
                        <button 
                            onClick={handleGenerateClick} 
                            className="btn btn-primary"
                            disabled={appState.selectedIdeas.length < minIdeas || appState.selectedIdeas.length > maxIdeas || isLoading}
                        >
                            {getButtonText()}
                        </button>
                    </div>
                </motion.div>
            )}

            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView
                    stage={appState.stage}
                    originalImage={appState.uploadedImage}
                    onDownloadOriginal={handleDownloadOriginalImage}
                    onOriginalClick={() => openLightbox(0)}
                    onEditOriginal={() => openImageEditor(appState.uploadedImage!, handleSaveUploadedImage)}
                    isMobile={isMobile}
                    hasPartialError={hasPartialError}
                    actions={
                        <>
                            <button onClick={handleDownloadAll} className="btn btn-primary">
                                Tải về tất cả
                            </button>
                            <button onClick={handleChooseOtherIdeas} className="btn btn-secondary">
                                Chọn ý tưởng khác
                            </button>
                            <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">
                                Bắt đầu lại
                            </button>
                        </>
                    }
                >
                    {appState.selectedIdeas.map((idea, index) => {
                        const imageState = appState.generatedImages[idea];
                        const currentImageIndexInLightbox = imageState?.url ? lightboxImages.indexOf(imageState.url) : -1;
                        return (
                            <motion.div
                                className="w-full md:w-auto flex-shrink-0"
                                key={idea}
                                initial={{ opacity: 0, scale: 0.5, y: 100 }}
                                animate={{
                                    opacity: 1,
                                    scale: 1,
                                    y: 0,
                                    rotate: 0,
                                }}
                                transition={{ type: 'spring', stiffness: 80, damping: 15, delay: index * 0.15 }}
                                whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
                            >
                                <PolaroidCard
                                    caption={idea}
                                    status={imageState?.status || 'pending'}
                                    imageUrl={imageState?.url}
                                    error={imageState?.error}
                                    onShake={() => handleRegenerateIdea(idea)}
                                    onDownload={() => handleDownloadIndividualImage(idea)}
                                    onEdit={imageState?.status === 'done' && imageState.url ? () => openImageEditor(imageState.url!, handleSaveGeneratedImage(idea)) : undefined}
                                    onClick={imageState?.status === 'done' && imageState.url ? () => openLightbox(currentImageIndexInLightbox) : undefined}
                                    isMobile={isMobile}
                                />
                            </motion.div>
                        );
                    })}
                </ResultsView>
            )}
            
            <RegenerationModal
                isOpen={!!modifyingIdea}
                onClose={() => setModifyingIdea(null)}
                onConfirm={handleConfirmRegeneration}
                itemToModify={modifyingIdea}
                placeholder="Ví dụ: thêm một bông hoa sen, mặc áo dài màu xanh, tóc búi cao..."
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

export default AvatarCreator;