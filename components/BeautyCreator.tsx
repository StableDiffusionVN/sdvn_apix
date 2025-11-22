
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, useEffect, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { generateBeautyImage, editImageWithPrompt, analyzeForBeautyConcepts } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    ImageForZip,
    OptionsPanel,
    type BeautyCreatorState,
    type GeneratedAvatarImage,
    handleFileUpload,
    useLightbox,
    useVideoGeneration,
    processAndDownloadAll,
    useAppControls,
    embedJsonInPng,
    useMediaQuery,
} from './uiUtils';
import { MagicWandIcon } from './icons';

interface BeautyCreatorProps {
    mainTitle: string;
    subtitle: string;
    minIdeas: number;
    maxIdeas: number;
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
        minIdeas, maxIdeas,
        uploaderCaption, uploaderDescription, uploaderCaptionStyle, uploaderDescriptionStyle,
        addImagesToGallery, 
        appState, onStateChange, onReset,
        logGeneration,
        ...headerProps 
    } = props;
    
    const { t, settings } = useAppControls();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [localNotes, setLocalNotes] = useState(appState.options.notes);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const hasLoggedGeneration = useRef(false);

    const IDEAS_BY_CATEGORY = t('beautyCreator_ideasByCategory');
    const ASPECT_RATIO_OPTIONS = t('aspectRatioOptions');

    useEffect(() => {
        setLocalNotes(appState.options.notes);
    }, [appState.options.notes]);
    
    const outputLightboxImages = appState.selectedIdeas
        .map(idea => appState.generatedImages[idea])
        .filter(img => img?.status === 'done' && img.url)
        .map(img => img.url!);

    const lightboxImages = [appState.uploadedImage, appState.styleReferenceImage, ...outputLightboxImages].filter((img): img is string => !!img);
    
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
    
    const handleStyleReferenceImageChange = (imageDataUrl: string) => {
        onStateChange({
            ...appState,
            styleReferenceImage: imageDataUrl,
            selectedIdeas: [],
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
    
    const handleIdeaSelect = (idea: string) => {
        const { selectedIdeas } = appState;
        let newSelectedIdeas: string[];

        if (selectedIdeas.includes(idea)) {
            newSelectedIdeas = selectedIdeas.filter(p => p !== idea);
        } else if (selectedIdeas.length < maxIdeas) {
            newSelectedIdeas = [...selectedIdeas, idea];
        } else {
            toast.error(t('beautyCreator_maxIdeasError', maxIdeas));
            return;
        }
        onStateChange({ ...appState, selectedIdeas: newSelectedIdeas });
    };

    const executeGeneration = async (ideas?: string[]) => {
        if (!appState.uploadedImage) {
            toast.error(t('beautyCreator_missingImagesError'));
            return;
        }

        hasLoggedGeneration.current = false;

        if (appState.styleReferenceImage) {
            const idea = "Style Reference";
            const preGenState = { ...appState, selectedIdeas: [idea] };
            const generatingState = { ...appState, stage: 'generating' as const, generatedImages: { [idea]: { status: 'pending' as const } }, selectedIdeas: [idea] };
            onStateChange(generatingState);

            try {
                const resultUrl = await generateBeautyImage(appState.uploadedImage, '', appState.options, appState.styleReferenceImage);
                const settingsToEmbed = { 
                    viewId: 'beauty-creator