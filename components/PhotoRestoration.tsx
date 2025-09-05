/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { restoreOldPhoto, editImageWithPrompt } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    ImageForZip,
    AppOptionsLayout,
    OptionsPanel,
    type PhotoRestorationState,
    handleFileUpload,
    useLightbox,
    processAndDownloadAll,
} from './uiUtils';
import { COUNTRIES } from '../lib/countries';

interface PhotoRestorationProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaption: string;
    uploaderDescription: string;
    addImagesToGallery: (images: string[]) => void;
    appState: PhotoRestorationState;
    onStateChange: (newState: PhotoRestorationState) => void;
    onReset: () => void;
    onGoBack: () => void;
}

const PHOTO_TYPE_OPTIONS = ['Chân dung', 'Phong cảnh', 'Gia đình', 'Sự kiện', 'Kiến trúc', 'Đời thường'];
const GENDER_OPTIONS = ['Tự động', 'Nam', 'Nữ', 'Nhiều người'];

const PhotoRestoration: React.FC<PhotoRestorationProps> = (props) => {
    const { 
        uploaderCaption, uploaderDescription, addImagesToGallery, 
        appState, onStateChange, onReset,
        ...headerProps 
    } = props;
    
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    
    // State for searchable nationality dropdown
    const [nationalitySearch, setNationalitySearch] = useState('');
    const [isNationalityDropdownOpen, setNationalityDropdownOpen] = useState(false);
    const nationalityDropdownRef = useRef<HTMLDivElement>(null);

    const lightboxImages = [appState.uploadedImage, ...appState.historicalImages].filter((img): img is string => !!img);

    const filteredCountries = COUNTRIES.filter(country => 
        country.toLowerCase().includes(nationalitySearch.toLowerCase())
    );

    useEffect(() => {
        // Initialize search with the current state value when component loads/state changes
        setNationalitySearch(appState.options.nationality);
    }, [appState.options.nationality]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (nationalityDropdownRef.current && !nationalityDropdownRef.current.contains(event.target as Node)) {
                setNationalityDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
    
    const handleOptionChange = (field: keyof PhotoRestorationState['options'], value: string | boolean) => {
        onStateChange({
            ...appState,
            options: { ...appState.options, [field]: value }
        });
    };

    const handleNationalitySelect = (country: string) => {
        handleOptionChange('nationality', country);
        setNationalitySearch(country);
        setNationalityDropdownOpen(false);
    };

    const executeInitialGeneration = async () => {
        if (!appState.uploadedImage) return;
        
        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await restoreOldPhoto(appState.uploadedImage, appState.options);
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
    
    const handleUploadedImageChange = (newUrl: string) => {
        onStateChange({ ...appState, uploadedImage: newUrl });
        addImagesToGallery([newUrl]);
    };

    const handleGeneratedImageChange = (newUrl: string) => {
        const newHistorical = [...appState.historicalImages, newUrl];
        onStateChange({ ...appState, stage: 'results', generatedImage: newUrl, historicalImages: newHistorical });
        addImagesToGallery([newUrl]);
    };
    
    const handleBackToOptions = () => {
        onStateChange({ ...appState, stage: 'configuring', error: null });
    };

    const handleDownloadAll = () => {
        const inputImages: ImageForZip[] = [];
        if (appState.uploadedImage) {
            inputImages.push({
                url: appState.uploadedImage,
                filename: 'anh-goc',
                folder: 'input',
            });
        }
        
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            zipFilename: 'anh-phuc-che.zip',
            baseOutputFilename: 'anh-phuc-che',
        });
    };
    
    const renderSelect = (id: keyof PhotoRestorationState['options'], label: string, optionList: string[]) => (
        <div>
            <label htmlFor={id} className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{label}</label>
            <select id={id} value={appState.options[id] as string} onChange={(e) => handleOptionChange(id, e.target.value)} className="form-input">
                {optionList.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );
    
    const isLoading = appState.stage === 'generating';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
                {(appState.stage === 'idle' || appState.stage === 'configuring') && (<AppScreenHeader {...headerProps} />)}
            </AnimatePresence>

            <div className="flex flex-col items-center justify-center w-full flex-1">
                {appState.stage === 'idle' && (
                    <ImageUploader
                        id="photo-restore-upload"
                        onImageUpload={handleImageUpload}
                        onImageChange={handleImageSelectedForUploader}
                        uploaderCaption={uploaderCaption}
                        uploaderDescription={uploaderDescription}
                        placeholderType="person"
                    />
                )}

                {appState.stage === 'configuring' && appState.uploadedImage && (
                    <AppOptionsLayout>
                        <div className="flex-shrink-0">
                            {/* FIX: Replaced incorrect 'imageUrl' prop with 'mediaUrl'. */}
                            <ActionablePolaroidCard mediaUrl={appState.uploadedImage} caption="Ảnh gốc" status="done" onClick={() => openLightbox(0)} isEditable={true} isSwappable={true} isGallerySelectable={true} onImageChange={handleUploadedImageChange} />
                        </div>
                        <OptionsPanel>
                            <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">Thông tin bổ sung</h2>
                            <p className="text-neutral-300 text-sm">Cung cấp thêm thông tin giúp AI phục chế ảnh chính xác hơn.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {renderSelect('type', 'Loại ảnh', PHOTO_TYPE_OPTIONS)}
                                {renderSelect('gender', 'Giới tính', GENDER_OPTIONS)}

                                {/* Searchable Nationality Dropdown */}
                                <div ref={nationalityDropdownRef} className="searchable-dropdown-container">
                                    <label htmlFor="nationality" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Quốc tịch</label>
                                    <input
                                        type="text"
                                        id="nationality"
                                        value={nationalitySearch}
                                        onChange={(e) => {
                                            setNationalitySearch(e.target.value);
                                            setNationalityDropdownOpen(true);
                                        }}
                                        onFocus={() => {
                                            setNationalityDropdownOpen(true);
                                            setNationalitySearch('');
                                        }}
                                        onBlur={() => handleOptionChange('nationality', nationalitySearch)}
                                        className="form-input"
                                        placeholder="Tìm kiếm quốc gia..."
                                    />
                                    {isNationalityDropdownOpen && (
                                        <ul className="searchable-dropdown-list">
                                            {filteredCountries.length > 0 ? filteredCountries.map(country => (
                                                <li key={country} onMouseDown={() => handleNationalitySelect(country)} className="searchable-dropdown-item">
                                                    {country}
                                                </li>
                                            )) : (
                                                <li className="searchable-dropdown-item !cursor-default">Không tìm thấy</li>
                                            )}
                                        </ul>
                                    )}
                                </div>

                                {/* Age Input */}
                                <div>
                                    <label htmlFor="age" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Độ tuổi</label>
                                    <input
                                        type="text"
                                        id="age"
                                        value={appState.options.age}
                                        onChange={(e) => handleOptionChange('age', e.target.value)}
                                        className="form-input"
                                        placeholder="Tự động"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Ghi chú</label>
                                <textarea id="notes" value={appState.options.notes} onChange={(e) => handleOptionChange('notes', e.target.value)}
                                    placeholder="Ví dụ: phục chế màu áo dài xanh..." className="form-input h-24" rows={3} />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                                <div className="flex items-center">
                                    <input type="checkbox" id="remove-stains" checked={appState.options.removeStains}
                                        onChange={(e) => handleOptionChange('removeStains', e.target.checked)}
                                        className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" />
                                    <label htmlFor="remove-stains" className="ml-3 block text-sm font-medium text-neutral-300">Xóa vết loang, ố</label>
                                </div>
                                <div className="flex items-center">
                                    <input type="checkbox" id="remove-watermark-restore" checked={appState.options.removeWatermark}
                                        onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                        className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" />
                                    <label htmlFor="remove-watermark-restore" className="ml-3 block text-sm font-medium text-neutral-300">Xóa watermark (nếu có)</label>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-4 pt-4">
                                <button onClick={onReset} className="btn btn-secondary">Đổi ảnh khác</button>
                                <button onClick={executeInitialGeneration} className="btn btn-primary" disabled={isLoading}>{isLoading ? 'Đang phục chế...' : 'Phục chế ảnh'}</button>
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
                        key="generated-restoration"
                        initial={{ opacity: 0, scale: 0.5, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.15 }}>
                        {/* FIX: Replaced incorrect 'imageUrl' prop with 'mediaUrl'. */}
                        <ActionablePolaroidCard caption="Ảnh đã phục chế" status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            mediaUrl={appState.generatedImage ?? undefined} error={appState.error ?? undefined}
                            isDownloadable={true}
                            isEditable={true}
                            isRegeneratable={true}
                            onImageChange={handleGeneratedImageChange}
                            onRegenerate={handleRegeneration}
                            regenerationTitle="Tinh chỉnh ảnh"
                            regenerationDescription="Thêm ghi chú để cải thiện ảnh phục chế"
                            regenerationPlaceholder="Ví dụ: làm cho màu da sáng hơn..."
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

export default PhotoRestoration;