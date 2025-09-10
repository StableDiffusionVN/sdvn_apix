/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { ChangeEvent, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { swapImageStyle, editImageWithPrompt } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    ImageForZip,
    AppOptionsLayout,
    OptionsPanel,
    Slider,
    type SwapStyleState,
    handleFileUpload,
    useLightbox,
    useVideoGeneration,
    processAndDownloadAll,
    useAppControls,
    embedJsonInPng,
} from './uiUtils';

interface SwapStyleProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaption: string;
    uploaderDescription: string;
    addImagesToGallery: (images: string[]) => void;
    appState: SwapStyleState;
    onStateChange: (newState: SwapStyleState) => void;
    onReset: () => void;
    onGoBack: () => void;
}

const SwapStyle: React.FC<SwapStyleProps> = (props) => {
    const { 
        uploaderCaption, uploaderDescription, addImagesToGallery,
        appState, onStateChange, onReset,
        ...headerProps
    } = props;
    
    const { t } = useAppControls();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();
    
    // State for searchable style dropdown
    const [styleSearch, setStyleSearch] = React.useState('');
    const [isStyleDropdownOpen, setStyleDropdownOpen] = React.useState(false);
    const styleDropdownRef = useRef<HTMLDivElement>(null);
    
    const STYLE_OPTIONS_LIST = t('styles');
    const STYLE_STRENGTH_LEVELS = t('style_strengthLevels');

    const lightboxImages = [appState.uploadedImage, ...appState.historicalImages].filter((img): img is string => !!img);

    const filteredStyles = STYLE_OPTIONS_LIST.filter((style: string) => 
        style.toLowerCase().includes(styleSearch.toLowerCase())
    );

    useEffect(() => {
        // Initialize search with the current state value
        setStyleSearch(appState.options.style);
    }, [appState.options.style]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (styleDropdownRef.current && !styleDropdownRef.current.contains(event.target as Node)) {
                setStyleDropdownOpen(false);
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
    
    const handleOptionChange = (field: keyof SwapStyleState['options'], value: string | boolean) => {
        onStateChange({
            ...appState,
            options: { ...appState.options, [field]: value },
        });
    };

    const handleStyleSelect = (style: string) => {
        handleOptionChange('style', style);
        setStyleSearch(style);
        setStyleDropdownOpen(false);
    };

    const executeInitialGeneration = async () => {
        if (!appState.uploadedImage) return;

        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await swapImageStyle(appState.uploadedImage, appState.options);
            const settingsToEmbed = { viewId: 'swap-style', state: appState };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed);
            onStateChange({
                ...appState,
                stage: 'results',
                generatedImage: urlWithMetadata,
                historicalImages: [...appState.historicalImages, urlWithMetadata],
            });
            addImagesToGallery([urlWithMetadata]);
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
            const settingsToEmbed = { viewId: 'swap-style', state: appState };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed);
            onStateChange({
                ...appState,
                stage: 'results',
                generatedImage: urlWithMetadata,
                historicalImages: [...appState.historicalImages, urlWithMetadata],
            });
            addImagesToGallery([urlWithMetadata]);
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
            inputImages.push({ url: appState.uploadedImage, filename: 'anh-goc', folder: 'input' });
        }
        
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            videoTasks,
            zipFilename: 'anh-theo-style.zip',
            baseOutputFilename: `anh-style-${appState.options.style.replace(/[\s()]/g, '-')}`,
        });
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
                        onImageChange={handleImageSelectedForUploader}
                        uploaderCaption={uploaderCaption}
                        uploaderDescription={uploaderDescription}
                        placeholderType="magic"
                    />
                )}

                {appState.stage === 'configuring' && appState.uploadedImage && (
                    <AppOptionsLayout>
                        <div className="flex-shrink-0">
                            <ActionablePolaroidCard type="content-input" mediaUrl={appState.uploadedImage} caption={t('common_originalImage')} status="done" onClick={() => openLightbox(0)} onImageChange={handleUploadedImageChange}/>
                        </div>
                        <OptionsPanel>
                            <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">{t('common_options')}</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Searchable Style Dropdown */}
                                <div ref={styleDropdownRef} className="searchable-dropdown-container">
                                    <label htmlFor="style" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('swapStyle_styleLabel')}</label>
                                    <input
                                        type="text"
                                        id="style-search"
                                        value={styleSearch}
                                        onChange={(e) => {
                                            setStyleSearch(e.target.value);
                                            setStyleDropdownOpen(true);
                                        }}
                                        onFocus={() => {
                                            setStyleDropdownOpen(true);
                                        }}
                                        onBlur={() => handleOptionChange('style', styleSearch)}
                                        className="form-input"
                                        placeholder={t('swapStyle_stylePlaceholder')}
                                    />
                                    {isStyleDropdownOpen && (
                                        <ul className="searchable-dropdown-list">
                                            {filteredStyles.length > 0 ? filteredStyles.map((style: string) => (
                                                <li key={style} onMouseDown={() => handleStyleSelect(style)} className="searchable-dropdown-item">
                                                    {style}
                                                </li>
                                            )) : (
                                                <li className="searchable-dropdown-item !cursor-default">{t('common_notFound')}</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                                <Slider
                                    label={t('swapStyle_strengthLabel')}
                                    options={STYLE_STRENGTH_LEVELS}
                                    value={appState.options.styleStrength}
                                    onChange={(value) => handleOptionChange('styleStrength', value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('common_additionalNotes')}</label>
                                <textarea id="notes" value={appState.options.notes} onChange={(e) => handleOptionChange('notes', e.target.value)}
                                    placeholder={t('swapStyle_notesPlaceholder')} className="form-input h-24" rows={3} />
                            </div>
                            <div className="flex items-center pt-2">
                                <input type="checkbox" id="remove-watermark-swap" checked={appState.options.removeWatermark}
                                    onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                    className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" />
                                <label htmlFor="remove-watermark-swap" className="ml-3 block text-sm font-medium text-neutral-300">{t('common_removeWatermark')}</label>
                            </div>
                            <div className="flex items-center justify-end gap-4 pt-4">
                                <button onClick={onReset} className="btn btn-secondary">{t('common_changeImage')}</button>
                                <button onClick={executeInitialGeneration} className="btn btn-primary" disabled={isLoading}>{isLoading ? t('swapStyle_creating') : t('swapStyle_createButton')}</button>
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
                            {appState.generatedImage && !appState.error && (<button onClick={handleDownloadAll} className="btn btn-primary">{t('common_downloadAll')}</button>)}
                            <button onClick={handleBackToOptions} className="btn btn-secondary">{t('common_edit')}</button>
                            <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">{t('common_startOver')}</button>
                        </>
                    }>
                    <motion.div
                        className="w-full md:w-auto flex-shrink-0"
                        key="generated-swap"
                        initial={{ opacity: 0, scale: 0.5, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.15 }}>
                        <ActionablePolaroidCard
                            type="output"
                            caption={appState.options.style || t('swapStyle_autoStyleCaption')} status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            mediaUrl={appState.generatedImage ?? undefined} error={appState.error ?? undefined}
                            onImageChange={handleGeneratedImageChange}
                            onRegenerate={handleRegeneration}
                            onGenerateVideoFromPrompt={(prompt) => appState.generatedImage && generateVideo(appState.generatedImage, prompt)}
                            regenerationTitle={t('common_regenTitle')}
                            regenerationDescription={t('swapStyle_regenDescription')}
                            regenerationPlaceholder={t('swapStyle_regenPlaceholder')}
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined} />
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
                                    type="output"
                                    caption={t('common_video')}
                                    status={videoTask.status}
                                    mediaUrl={videoTask.resultUrl}
                                    error={videoTask.error}
                                    onClick={videoTask.resultUrl ? () => openLightbox(lightboxImages.indexOf(videoTask.resultUrl!)) : undefined}
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

export default SwapStyle;