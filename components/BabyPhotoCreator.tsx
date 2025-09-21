/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { generateBabyPhoto, estimateAgeGroup, editImageWithPrompt } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    useMediaQuery,
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    ImageForZip,
    type BabyPhotoCreatorState,
    handleFileUpload,
    useLightbox,
    useVideoGeneration,
    processAndDownloadAll,
    useAppControls,
    embedJsonInPng,
} from './uiUtils';
import { MagicWandIcon } from './icons';

interface BabyPhotoCreatorProps {
    mainTitle: string;
    subtitle: string;
    minIdeas: number;
    maxIdeas: number;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaption: string;
    uploaderDescription: string;
    addImagesToGallery: (images: string[]) => void;
    appState: BabyPhotoCreatorState;
    onStateChange: (newState: BabyPhotoCreatorState) => void;
    onReset: () => void;
    onGoBack: () => void;
    logGeneration: (appId: string, preGenState: any, thumbnailUrl: string) => void;
}

const BabyPhotoCreator: React.FC<BabyPhotoCreatorProps> = (props) => {
    const { 
        minIdeas, maxIdeas, 
        uploaderCaption, uploaderDescription,
        addImagesToGallery,
        appState, onStateChange, onReset,
        logGeneration,
        ...headerProps
    } = props;
    
    const { t, settings } = useAppControls();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [localPrompt, setLocalPrompt] = useState(appState.options.additionalPrompt);
    const [isEstimatingAge, setIsEstimatingAge] = useState(false);
    const hasLoggedGeneration = useRef(false);

    useEffect(() => {
        setLocalPrompt(appState.options.additionalPrompt);
    }, [appState.options.additionalPrompt]);
    
    const IDEAS_BY_CATEGORY = t('babyPhotoCreator_ideasByCategory');
    const ASPECT_RATIO_OPTIONS = t('aspectRatioOptions');

    const outputLightboxImages = appState.selectedIdeas
        .map(idea => appState.generatedImages[idea])
        .filter(img => img?.status === 'done' && img.url)
        .map(img => img.url!);

    const lightboxImages = [appState.uploadedImage, ...outputLightboxImages].filter((img): img is string => !!img);
    
    const handleImageSelectedForUploader = (imageDataUrl: string) => {
        onStateChange({
            ...appState,
            stage: 'configuring',
            uploadedImage: imageDataUrl,
            generatedImages: {},
            selectedIdeas: [],
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

    const handleOptionChange = (field: keyof BabyPhotoCreatorState['options'], value: string | boolean) => {
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
            toast.error(t('babyPhotoCreator_maxIdeasError', maxIdeas));
            return;
        }

        onStateChange({ ...appState, selectedIdeas: newSelectedIdeas });
    };

    const handleGenerateClick = async () => {
        if (!appState.uploadedImage || appState.selectedIdeas.length < minIdeas || appState.selectedIdeas.length > maxIdeas) return;
        
        hasLoggedGeneration.current = false;
        const preGenState = { ...appState };
        let ideasToGenerate = [...appState.selectedIdeas];
        const randomCount = ideasToGenerate.filter(i => i === 'Random').length;

        if (randomCount > 0) {
            setIsEstimatingAge(true);
            try {
                const ageGroup = await estimateAgeGroup(appState.uploadedImage);
                const ageGroupConfig = IDEAS_BY_CATEGORY.find((c: any) => c.key === ageGroup);
                const availableIdeas = ageGroupConfig ? ageGroupConfig.ideas : [].concat(...IDEAS_BY_CATEGORY.map((c: any) => c.ideas));
                
                const randomIdeas: string[] = [];
                for (let i = 0; i < randomCount; i++) {
                    if (availableIdeas.length > 0) {
                         randomIdeas.push(availableIdeas[Math.floor(Math.random() * availableIdeas.length)]);
                    }
                }
                ideasToGenerate = ideasToGenerate.filter(i => i !== 'Random').concat(randomIdeas);
                ideasToGenerate = [...new Set(ideasToGenerate)]; // Ensure unique ideas
            } catch (err) {
                toast.error(t('babyPhotoCreator_ageEstimationError'));
                setIsEstimatingAge(false);
                return;
            } finally {
                setIsEstimatingAge(false);
            }
        }
        
        const stage : 'generating' = 'generating';
        onStateChange({ ...appState, stage: stage });
        
        const initialGeneratedImages = { ...appState.generatedImages };
        ideasToGenerate.forEach(idea => {
            initialGeneratedImages[idea] = { status: 'pending' };
        });
        
        onStateChange({ ...appState, stage: stage, generatedImages: initialGeneratedImages });

        const concurrencyLimit = 2;
        const ideasQueue = [...ideasToGenerate];
        
        let currentAppState: BabyPhotoCreatorState = { ...appState, stage: stage, generatedImages: initialGeneratedImages, selectedIdeas: ideasToGenerate };
        const settingsToEmbed = {
            viewId: 'baby-photo-creator',
            state: { ...appState, stage: 'configuring', generatedImages: {}, historicalImages: [], error: null },
        };

        const processIdea = async (idea: string) => {
            try {
                const resultUrl = await generateBabyPhoto(appState.uploadedImage!, idea, appState.options.additionalPrompt, appState.options.removeWatermark, appState.options.aspectRatio);
                const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
                
                if (!hasLoggedGeneration.current) {
                    logGeneration('baby-photo-creator', preGenState, urlWithMetadata);
                    hasLoggedGeneration.current = true;
                }
                
                currentAppState = {
                    ...currentAppState,
                    generatedImages: {
                        ...currentAppState.generatedImages,
                        [idea]: { status: 'done', url: urlWithMetadata },
                    },
                    historicalImages: [...currentAppState.historicalImages, { idea, url: urlWithMetadata }],
                };
                onStateChange(currentAppState);
                addImagesToGallery([urlWithMetadata]);

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

    const handleRegenerateIdea = async (idea: string, customPrompt: string) => {
        const imageToEditState = appState.generatedImages[idea];
        if (imageToEditState?.status !== 'done' || !imageToEditState.url) {
            return;
        }

        const imageUrlToEdit = imageToEditState.url;
        const preGenState = { ...appState };
        
        onStateChange({
            ...appState,
            generatedImages: { ...appState.generatedImages, [idea]: { status: 'pending' } }
        });

        try {
            const resultUrl = await editImageWithPrompt(imageUrlToEdit, customPrompt);
            const settingsToEmbed = {
                viewId: 'baby-photo-creator',
                state: { ...appState, stage: 'configuring', generatedImages: {}, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            logGeneration('baby-photo-creator', preGenState, urlWithMetadata);
            onStateChange({
                ...appState,
                generatedImages: { ...appState.generatedImages, [idea]: { status: 'done', url: urlWithMetadata } },
                historicalImages: [...appState.historicalImages, { idea: `${idea}-edit`, url: urlWithMetadata }],
            });
            addImagesToGallery([urlWithMetadata]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
             onStateChange({
                ...appState,
                generatedImages: { ...appState.generatedImages, [idea]: { status: 'error', error: errorMessage } }
            });
            console.error(`Failed to regenerate image for ${idea}:`, err);
        }
    };
    
     const handleGeneratedImageChange = (idea: string) => (newUrl: string) => {
        const newGeneratedImages = { ...appState.generatedImages, [idea]: { status: 'done' as 'done', url: newUrl } };
        const newHistorical = [...appState.historicalImages, { idea: `${idea}-edit`, url: newUrl }];
        onStateChange({ ...appState, generatedImages: newGeneratedImages, historicalImages: newHistorical });
        addImagesToGallery([newUrl]);
    };
    
    const handleChooseOtherIdeas = () => {
        onStateChange({ ...appState, stage: 'configuring', generatedImages: {}, historicalImages: [] });
    };

    const handleDownloadAll = () => {
        const inputImages: ImageForZip[] = [];
        if (appState.uploadedImage) {
            inputImages.push({
                url: appState.uploadedImage,
                filename: 'anh-goc-cua-be',
                folder: 'input',
            });
        }
        
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            videoTasks,
            zipFilename: 'anh-concept-cho-be.zip',
            baseOutputFilename: 'anh-be',
        });
    };

    const getButtonText = () => {
        if (isEstimatingAge) return t('babyPhotoCreator_estimatingAge');
        if (appState.stage === 'generating') return t('common_creating');
        if (appState.selectedIdeas.length < minIdeas) return t('babyPhotoCreator_selectAtLeast', minIdeas);
        return t('babyPhotoCreator_createButton');
    };
    
    const hasPartialError = appState.stage === 'results' && Object.values(appState.generatedImages).some(img => img.status === 'error');
    const isLoading = appState.stage === 'generating' || isEstimatingAge;

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
            {(appState.stage === 'idle' || appState.stage === 'configuring') && (
                <AppScreenHeader {...headerProps} />
            )}
            </AnimatePresence>

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
                    className="flex flex-col items-center gap-6 w-full max-w-6xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <ActionablePolaroidCard
                        type="photo-input"
                        mediaUrl={appState.uploadedImage}
                        caption={t('babyPhotoCreator_yourImageCaption')}
                        status="done"
                        onClick={() => openLightbox(0)}
                        onImageChange={handleUploadedImageChange}
                    />

                    <div className="w-full max-w-4xl text-center mt-4">
                        <h2 className="base-font font-bold text-2xl text-neutral-200">{t('babyPhotoCreator_selectIdeasTitle', minIdeas, maxIdeas)}</h2>
                        <p className="text-neutral-400 mb-4">{t('babyPhotoCreator_selectedCount', appState.selectedIdeas.length, maxIdeas)}</p>
                        
                        <button 
                            onClick={() => handleIdeaSelect('Random')}
                            className={`base-font font-bold p-3 rounded-md text-base transition-all duration-200 inline-flex items-center gap-2 mb-4 ${
                                appState.selectedIdeas.includes('Random')
                                ? 'bg-yellow-400 text-black ring-2 ring-yellow-300 scale-105' 
                                : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                            } ${!appState.selectedIdeas.includes('Random') && appState.selectedIdeas.length === maxIdeas ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!appState.selectedIdeas.includes('Random') && appState.selectedIdeas.length === maxIdeas}
                        >
                            <MagicWandIcon className="h-5 w-5" />
                            {t('babyPhotoCreator_randomConcept')}
                        </button>

                        <div className="max-h-[50vh] overflow-y-auto p-4 bg-black/20 border border-white/10 rounded-lg space-y-6">
                            {Array.isArray(IDEAS_BY_CATEGORY) && IDEAS_BY_CATEGORY.map((categoryObj: any) => (
                                <div key={categoryObj.category}>
                                    <h3 className="text-xl base-font font-bold text-yellow-400 text-left mb-3 sticky top-0 bg-black/50 py-2 -mx-4 px-4 z-10">{categoryObj.category}</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {categoryObj.ideas.map((p: string) => {
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
                            <label htmlFor="aspect-ratio" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('common_aspectRatio')}</label>
                            <select
                                id="aspect-ratio"
                                value={appState.options.aspectRatio}
                                onChange={(e) => handleOptionChange('aspectRatio', e.target.value)}
                                className="form-input"
                            >
                                {ASPECT_RATIO_OPTIONS.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="additional-prompt" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('common_additionalNotesOptional')}</label>
                            <textarea
                                id="additional-prompt"
                                value={localPrompt}
                                onChange={(e) => setLocalPrompt(e.target.value)}
                                onBlur={() => {
                                    if (localPrompt !== appState.options.additionalPrompt) {
                                        handleOptionChange('additionalPrompt', localPrompt);
                                    }
                                }}
                                placeholder={t('babyPhotoCreator_notesPlaceholder')}
                                className="form-input h-20"
                                rows={2}
                            />
                        </div>
                        <div className="flex items-center pt-2">
                            <input
                                type="checkbox"
                                id="remove-watermark-baby"
                                checked={appState.options.removeWatermark}
                                onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800"
                                aria-label={t('common_removeWatermark')}
                            />
                            <label htmlFor="remove-watermark-baby" className="ml-3 block text-sm font-medium text-neutral-300">
                                {t('common_removeWatermark')}
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4">
                        <button onClick={onReset} className="btn btn-secondary">
                            {t('common_changeImage')}
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
                    onOriginalClick={() => openLightbox(0)}
                    isMobile={isMobile}
                    hasPartialError={hasPartialError}
                    actions={
                        <>
                            <button onClick={handleDownloadAll} className="btn btn-primary">
                                {t('common_downloadAll')}
                            </button>
                            <button onClick={handleChooseOtherIdeas} className="btn btn-secondary">
                                {t('babyPhotoCreator_chooseOtherIdeas')}
                            </button>
                            <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">
                                {t('common_startOver')}
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
                                <ActionablePolaroidCard
                                    type="output"
                                    caption={idea}
                                    status={imageState?.status || 'pending'}
                                    mediaUrl={imageState?.url}
                                    error={imageState?.error}
                                    onImageChange={handleGeneratedImageChange(idea)}
                                    onRegenerate={(prompt) => handleRegenerateIdea(idea, prompt)}
                                    onGenerateVideoFromPrompt={(prompt) => imageState?.url && generateVideo(imageState.url, prompt)}
                                    regenerationTitle={t('common_regenTitle')}
                                    regenerationDescription={t('common_regenDescription')}
                                    regenerationPlaceholder={t('babyPhotoCreator_regenPlaceholder')}
                                    onClick={imageState?.status === 'done' && imageState.url ? () => openLightbox(currentImageIndexInLightbox) : undefined}
                                    isMobile={isMobile}
                                />
                            </motion.div>
                        );
                    })}
                     {appState.historicalImages.map(({ url: sourceUrl }) => {
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
                                    isMobile={isMobile}
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

export default BabyPhotoCreator;
