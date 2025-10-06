/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { generateBeautyImage, editImageWithPrompt } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    ImageForZip,
    OptionsPanel,
    type BeautyCreatorState,
    handleFileUpload,
    useLightbox,
    useVideoGeneration,
    processAndDownloadAll,
    useAppControls,
    embedJsonInPng,
} from './uiUtils';

interface BeautyCreatorProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaption: string;
    uploaderDescription: string;
    uploaderCaptionStyle: string;
    uploaderDescriptionStyle: string;
    addImagesToGallery: (images: string[]) => void;
    appState: BeautyCreatorState;
    onStateChange: (newState: BeautyCreatorState) => void;
    onReset: () => void;
    onGoBack: () => void;
    logGeneration: (appId: string, preGenState: any, thumbnailUrl: string) => void;
}

const BeautyCreator: React.FC<BeautyCreatorProps> = (props) => {
    const { 
        uploaderCaption, uploaderDescription, uploaderCaptionStyle, uploaderDescriptionStyle,
        addImagesToGallery, 
        appState, onStateChange, onReset,
        logGeneration,
        ...headerProps 
    } = props;
    
    const { t, settings } = useAppControls();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();
    const [localNotes, setLocalNotes] = useState(appState.options.notes);

    const ASPECT_RATIO_OPTIONS = t('aspectRatioOptions');

    useEffect(() => {
        setLocalNotes(appState.options.notes);
    }, [appState.options.notes]);
    
    const lightboxImages = [appState.uploadedImage, appState.styleReferenceImage, ...appState.historicalImages].filter((img): img is string => !!img);
    
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
    
    const handleStyleReferenceImageChange = (imageDataUrl: string) => {
        onStateChange({
            ...appState,
            styleReferenceImage: imageDataUrl,
        });
        addImagesToGallery([imageDataUrl]);
    };

    const handleOptionChange = (field: keyof BeautyCreatorState['options'], value: string | boolean) => {
        onStateChange({
            ...appState,
            options: {
                ...appState.options,
                [field]: value
            }
        });
    };

    const executeInitialGeneration = async () => {
        if (!appState.uploadedImage || !appState.styleReferenceImage) {
            toast.error(t('beautyCreator_missingImagesError'));
            return;
        }
        
        const preGenState = { ...appState };
        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await generateBeautyImage(appState.uploadedImage, appState.styleReferenceImage, appState.options);
            const settingsToEmbed = { 
                viewId: 'beauty-creator', 
                state: { ...appState, stage: 'configuring', generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            logGeneration('beauty-creator', preGenState, urlWithMetadata);
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

        const preGenState = { ...appState };
        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await editImageWithPrompt(appState.generatedImage, prompt);
             const settingsToEmbed = { 
                viewId: 'beauty-creator', 
                state: { ...appState, stage: 'configuring', generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            logGeneration('beauty-creator', preGenState, urlWithMetadata);
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
            inputImages.push({ url: appState.uploadedImage, filename: 'anh-chan-dung', folder: 'input' });
        }
        if (appState.styleReferenceImage) {
            inputImages.push({ url: appState.styleReferenceImage, filename: 'anh-concept', folder: 'input' });
        }
        
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            videoTasks,
            zipFilename: 'anh-beauty.zip',
            baseOutputFilename: 'anh-beauty',
        });
    };
    
    const isLoading = appState.stage === 'generating';

    const inputImagesForResults = [];
    if (appState.uploadedImage) {
        inputImagesForResults.push({
            url: appState.uploadedImage,
            caption: t('common_originalImage'),
            onClick: () => openLightbox(lightboxImages.indexOf(appState.uploadedImage!))
        });
    }
    if (appState.styleReferenceImage) {
        inputImagesForResults.push({
            url: appState.styleReferenceImage,
            caption: t('common_referenceImage'),
            onClick: () => openLightbox(lightboxImages.indexOf(appState.styleReferenceImage!))
        });
    }

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
            {(appState.stage === 'idle' || appState.stage === 'configuring') && (
                <AppScreenHeader {...headerProps} />
            )}
            </AnimatePresence>

            <div className="flex flex-col items-center justify-center w-full flex-1">
                {appState.stage === 'idle' && (
                    <ImageUploader
                        onImageChange={handleImageSelectedForUploader}
                        uploaderCaption={uploaderCaption}
                        uploaderDescription={uploaderDescription}
                        placeholderType="person"
                    />
                )}

                {appState.stage === 'configuring' && appState.uploadedImage && (
                    <motion.div
                        className="flex flex-col items-center gap-8 w-full max-w-6xl py-6 overflow-y-auto"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="flex flex-col md:flex-row items-start justify-center gap-8">
                             <div className="w-full md:w-auto">
                                <ActionablePolaroidCard
                                    type="photo-input"
                                    mediaUrl={appState.uploadedImage}
                                    caption={t('beautyCreator_yourImageCaption')}
                                    status="done"
                                    onClick={() => openLightbox(lightboxImages.indexOf(appState.uploadedImage!))}
                                    onImageChange={handleUploadedImageChange}
                                />
                            </div>
                            <div className="w-full md:w-auto">
                                <ActionablePolaroidCard
                                    type="style-input"
                                    mediaUrl={appState.styleReferenceImage ?? undefined}
                                    caption={uploaderCaptionStyle}
                                    placeholderType='magic'
                                    status='done'
                                    onImageChange={handleStyleReferenceImageChange}
                                    onClick={appState.styleReferenceImage ? () => openLightbox(lightboxImages.indexOf(appState.styleReferenceImage!)) : undefined}
                                />
                                <p className="mt-4 text-center text-sm text-neutral-400 max-w-xs mx-auto">{uploaderDescriptionStyle}</p>
                            </div>
                        </div>

                        <OptionsPanel>
                            <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">{t('common_options')}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label htmlFor="aspect-ratio-beauty" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('common_aspectRatio')}</label>
                                    <select id="aspect-ratio-beauty" value={appState.options.aspectRatio} onChange={(e) => handleOptionChange('aspectRatio', e.target.value)} className="form-input">
                                        {ASPECT_RATIO_OPTIONS.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="pt-2">
                                <label htmlFor="notes-beauty" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('common_additionalNotesOptional')}</label>
                                <textarea
                                    id="notes-beauty"
                                    value={localNotes}
                                    onChange={(e) => setLocalNotes(e.target.value)}
                                    onBlur={() => {
                                        if (localNotes !== appState.options.notes) {
                                            handleOptionChange('notes', localNotes);
                                        }
                                    }}
                                    placeholder={t('beautyCreator_notesPlaceholder')}
                                    className="form-input h-24"
                                    rows={3}
                                />
                            </div>
                             <div className="flex items-center pt-2">
                                <input
                                    type="checkbox"
                                    id="remove-watermark-beauty"
                                    checked={appState.options.removeWatermark}
                                    onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                    className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800"
                                    aria-label={t('common_removeWatermark')}
                                />
                                <label htmlFor="remove-watermark-beauty" className="ml-3 block text-sm font-medium text-neutral-300">
                                    {t('common_removeWatermark')}
                                </label>
                            </div>
                            <div className="flex items-center justify-end gap-4 pt-4">
                                <button onClick={onReset} className="btn btn-secondary">
                                    {t('common_changeImage')}
                                </button>
                                <button 
                                    onClick={executeInitialGeneration} 
                                    className="btn btn-primary"
                                    disabled={isLoading}
                                >
                                    {isLoading ? t('common_creating') : t('beautyCreator_createButton')}
                                </button>
                            </div>
                        </OptionsPanel>
                    </motion.div>
                )}
            </div>

            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView
                    stage={appState.stage}
                    inputImages={inputImagesForResults}
                    error={appState.error}
                    actions={
                        <>
                            {appState.generatedImage && !appState.error && (
                                <button onClick={handleDownloadAll} className="btn btn-secondary">
                                    {t('common_downloadAll')}
                                </button>
                            )}
                            <button onClick={handleBackToOptions} className="btn btn-secondary">
                                {t('common_editOptions')}
                            </button>
                            <button onClick={onReset} className="btn btn-secondary">
                                {t('common_startOver')}
                            </button>
                        </>
                    }
                >
                    <motion.div
                        className="w-full md:w-auto flex-shrink-0"
                        key="generated-beauty"
                        initial={{ opacity: 0, scale: 0.5, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.15 }}
                    >
                        <ActionablePolaroidCard
                            type="output"
                            caption={t('common_result')}
                            status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            mediaUrl={appState.generatedImage ?? undefined}
                            error={appState.error ?? undefined}
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined}
                            onImageChange={handleGeneratedImageChange}
                            onRegenerate={handleRegeneration}
                            onGenerateVideoFromPrompt={(prompt) => appState.generatedImage && generateVideo(appState.generatedImage, prompt)}
                            regenerationTitle={t('common_regenTitle')}
                            regenerationDescription={t('common_regenDescription')}
                            regenerationPlaceholder={t('beautyCreator_regenPlaceholder')}
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

export default BeautyCreator;