/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls, useImageEditor, type ImageForZip, downloadAllImagesAsZip, downloadJson, useDebounce } from './uiUtils';
import { GalleryPicker } from './uiComponents';
import { useLightbox } from './uiHooks';
import { downloadImage } from './uiFileUtilities';
import type { SceneState } from './uiTypes';
import { CloseIcon, CloudUploadIcon } from './icons';
import { createScriptSummaryFromIdea, createScriptSummaryFromText, createScriptSummaryFromAudio, developScenesFromSummary, type ScriptSummary, generateVideoPromptFromScenes, refineSceneDescription, refineSceneTransition } from '../services/geminiService';
import { generateFreeImage } from '../services/gemini/freeGenerationService';
import toast from 'react-hot-toast';
import StoryboardingInput from './storyboarding/StoryboardingInput';
import StoryboardingSummary from './storyboarding/StoryboardingSummary';
import StoryboardingScenes from './storyboarding/StoryboardingScenes';
import Lightbox from './Lightbox';
import * as db from '../lib/db';


interface StoryboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHide: () => void;
}

type InputMethod = 'prompt' | 'text' | 'audio';

const parseDataUrlForComponent = (imageDataUrl: string): { mimeType: string; data: string } => {
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        throw new Error("Invalid image data URL format.");
    }
    const [, mimeType, data] = match;
    return { mimeType, data };
}

const dataURLtoFile = (dataUrl: string, filename: string, fileType: string): File => {
    const arr = dataUrl.split(',');
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: fileType });
};

export const StoryboardingModal: React.FC<StoryboardingModalProps> = ({ isOpen, onClose, onHide }) => {
    const { t, language, addImagesToGallery, imageGallery } = useAppControls();
    const { openImageEditor } = useImageEditor();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();

    const [activeInput, setActiveInput] = useState<InputMethod>('prompt');
    const [idea, setIdea] = useState('');
    const [scriptText, setScriptText] = useState('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    
    const [scriptSummary, setScriptSummary] = useState<ScriptSummary | null>(null);
    const [scenes, setScenes] = useState<SceneState[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);
    const [isDraggingRef, setIsDraggingRef] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [pickingCustomImageForScene, setPickingCustomImageForScene] = useState<number | null>(null);
    
    const [style, setStyle] = useState('');
    const [duration, setDuration] = useState('Tự động');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [notes, setNotes] = useState('');
    const [storyboardLanguage, setStoryboardLanguage] = useState<'vi' | 'en' | 'zh'>('vi');

    const [audioData, setAudioData] = useState<{ name: string; type: string; dataUrl: string } | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const audioInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);
    const scenesRef = useRef(scenes);
    useEffect(() => {
        scenesRef.current = scenes;
    }, [scenes]);


    const durationOptions: string[] = t('storyboarding_durationOptions');
    const aspectRatioOptions: string[] = t('storyboarding_aspectRatioOptions');

    const styleOptions: any[] = useMemo(() => t('storyboarding_styleOptions'), [t]);

    const handleStyleChange = (displayValue: string) => {
        if (!displayValue) {
            setStyle(''); // Handle empty selection, which means "Auto"
            return;
        }
        // Extract content within parentheses, e.g., "Cinematic" from "Điện ảnh (Cinematic)"
        const match = displayValue.match(/\(([^)]+)\)/);
        // If there's a match, use it. Otherwise, use the full string (for custom input).
        const aiValue = match ? match[1] : displayValue;
        setStyle(aiValue);
    };
    
    const displayStyleValue = useMemo(() => {
        if (!style) return ''; // If state is empty, display is empty
    
        // Flatten the grouped options into a single array of strings
        const allOptions: string[] = styleOptions.flatMap((opt: any) =>
            typeof opt === 'string' ? [opt] : (opt.options || [])
        );
    
        // Find the full display string that corresponds to the stored AI value
        for (const fullDisplayValue of allOptions) {
            const match = fullDisplayValue.match(/\(([^)]+)\)/);
            const aiValue = match ? match[1] : fullDisplayValue;
            if (aiValue === style) {
                return fullDisplayValue; // Found it, e.g., "Điện ảnh (Cinematic)"
            }
        }
    
        // Fallback if no match is found (e.g., custom typed value)
        return style;
    }, [style, styleOptions]);


    const resetState = useCallback(() => {
        setActiveInput('prompt');
        setIdea('');
        setScriptText('');
        setAudioFile(null);
        setReferenceImages([]);
        setScriptSummary(null);
        setScenes([]);
        setIsLoading(false);
        setLoadingMessage('');
        setError(null);
        setStyle('');
        setDuration(durationOptions[6] || 'Tự động');
        setAspectRatio(aspectRatioOptions[0] || '16:9');
        setNotes('');
        setStoryboardLanguage('vi');
    }, [durationOptions, aspectRatioOptions]);

    const handleNew = () => {
        resetState();
        db.clearStoryboardState();
        toast.success("Storyboard mới đã được tạo.");
    };

    useEffect(() => {
        if (isOpen) {
            const loadState = async () => {
                const savedState = await db.loadStoryboardState();
                if (savedState) {
                    setActiveInput(savedState.activeInput || 'prompt');
                    setIdea(savedState.idea || '');
                    setScriptText(savedState.scriptText || '');
                    if (savedState.audioData) {
                        const file = dataURLtoFile(savedState.audioData.dataUrl, savedState.audioData.name, savedState.audioData.type);
                        setAudioFile(file);
                    } else {
                        setAudioFile(null);
                    }
                    setReferenceImages(savedState.referenceImages || []);
                    setScriptSummary(savedState.scriptSummary || null);
                    setScenes(savedState.scenes || []);
                    setStyle(savedState.style || '');
                    setDuration(savedState.duration || durationOptions[6]);
                    setAspectRatio(savedState.aspectRatio || aspectRatioOptions[0]);
                    setNotes(savedState.notes || '');
                    setStoryboardLanguage(savedState.storyboardLanguage || 'vi');
                }
                setIsLoaded(true);
            };
            loadState();
        } else {
            setIsLoaded(false);
        }
    }, [isOpen, durationOptions, aspectRatioOptions]);

    useEffect(() => {
        if (audioFile) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    setAudioData({
                        name: audioFile.name,
                        type: audioFile.type,
                        dataUrl: reader.result as string,
                    });
                }
            };
            reader.readAsDataURL(audioFile);
        } else {
            setAudioData(null);
        }
    }, [audioFile]);

    const debouncedState = useDebounce({
        activeInput, idea, scriptText, audioData, referenceImages,
        scriptSummary, scenes, style, duration, aspectRatio, notes, storyboardLanguage
    }, 1000);

    useEffect(() => {
        if (isOpen && isLoaded) {
            db.saveStoryboardState(debouncedState);
        }
    }, [debouncedState, isOpen, isLoaded]);

    const handleGenerateScriptSummary = async () => {
        setIsLoading(true);
        setError(null);
        setLoadingMessage(t('storyboarding_generating_scenario'));
        setScriptSummary(null);

        try {
            let result: ScriptSummary;
            const referenceImagesData = referenceImages.map(url => parseDataUrlForComponent(url));
            const options = { style, duration, aspectRatio, notes };

            switch (activeInput) {
                case 'text':
                    if (!scriptText.trim()) throw new Error(t('storyboarding_error_noText'));
                    result = await createScriptSummaryFromText(scriptText, referenceImagesData, options, storyboardLanguage);
                    break;
                case 'audio':
                    if (!audioFile) throw new Error(t('storyboarding_error_noAudio'));
                    const audioData = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                        reader.onerror = reject;
                        reader.readAsDataURL(audioFile);
                    });
                    result = await createScriptSummaryFromAudio({ mimeType: audioFile.type, data: audioData }, referenceImagesData, options, storyboardLanguage);
                    break;
                case 'prompt':
                default:
                    if (!idea.trim()) throw new Error(t('storyboarding_error_noIdea'));
                    result = await createScriptSummaryFromIdea(idea, referenceImagesData, options, storyboardLanguage);
                    break;
            }
            setScriptSummary(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('storyboarding_error_scenario');
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDevelopScenesFromSummary = async () => {
        if (!scriptSummary) return;
        setIsLoading(true);
        setLoadingMessage(t('storyboarding_developing_scenes'));
        setError(null);
        setScenes([]);

        try {
            const finalScenario = await developScenesFromSummary(scriptSummary, storyboardLanguage);
            setScenes(finalScenario.scenes.map(s => ({ ...s, status: 'idle', imageSource: 'reference' })));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('storyboarding_error_develop');
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInitialScriptGeneration = () => {
        setScenes([]);
        handleGenerateScriptSummary();
    };
    
    const handleGenerateImage = async (sceneIndex: number) => {
        const sceneToGenerate = scenesRef.current[sceneIndex];
        if (!sceneToGenerate) return;

        setScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, status: 'pending', error: undefined } : s));
        
        try {
            let sourceImages: (string | undefined)[] = [];
            const source = sceneToGenerate.imageSource;

            if (source === 'reference') {
                sourceImages = referenceImages;
            } else if (source.startsWith('data:image')) {
                sourceImages = [source];
            } else {
                const sourceSceneIndex = parseInt(source, 10);
                if (!isNaN(sourceSceneIndex) && scenesRef.current[sourceSceneIndex]?.imageUrl) {
                    sourceImages = [scenesRef.current[sourceSceneIndex].imageUrl];
                } else {
                    sourceImages = referenceImages; // Fallback
                }
            }
            
            const results = await generateFreeImage(
                sceneToGenerate.description, 
                1, 
                aspectRatio, 
                sourceImages[0],
                sourceImages[1],
                sourceImages[2],
                sourceImages[3],
                true
            );
            if (results.length > 0) {
                setScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, status: 'done', imageUrl: results[0] } : s));
                addImagesToGallery(results);
            } else {
                throw new Error(t('storyboarding_error_noImage'));
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('storyboarding_error_imageGen');
            setScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, status: 'error', error: errorMessage } : s));
        }
    };

    const handleGenerateAll = async () => {
        for (let i = 0; i < scenesRef.current.length; i++) {
            const scene = scenesRef.current[i];
            if (scene.status !== 'done' && scene.status !== 'pending') {
                await handleGenerateImage(i);
            }
        }
    };

    const handleDownloadAll = async () => {
        const imagesToDownload: ImageForZip[] = scenes
            .filter(scene => scene.imageUrl)
            .map(scene => ({
                url: scene.imageUrl!,
                filename: `scene-${scene.scene}`,
                folder: 'storyboard',
            }));
    
        if (imagesToDownload.length === 0) {
            toast.error(t('storyboarding_error_noImagesToDownload'));
            return;
        }
        
        await downloadAllImagesAsZip(imagesToDownload, 'storyboard.zip');
    };
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'text' | 'audio') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (type === 'text') {
            const reader = new FileReader();
            reader.onload = (event) => setScriptText(event.target?.result as string);
            reader.readAsText(file);
        } else if (type === 'audio') {
            setAudioFile(file);
        }
        e.target.value = '';
    };
    
    const handleRefDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingRef(true); };
    const handleRefDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingRef(false); };
    const handleRefDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDraggingRef(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
            const remainingSlots = 4 - referenceImages.length;
            const filesToAdd = files.slice(0, remainingSlots);
            filesToAdd.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => { setReferenceImages(prev => [...prev, reader.result as string]); };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleGallerySelect = (imageUrl: string) => {
        if (pickingCustomImageForScene !== null) {
            handleImageSourceChange(pickingCustomImageForScene, imageUrl);
        } else if (referenceImages.length < 4) {
            setReferenceImages(prev => [...prev, imageUrl]);
        }
        setIsGalleryPickerOpen(false);
        setPickingCustomImageForScene(null);
    };

    const handleSummaryChange = useCallback((field: keyof ScriptSummary, value: string) => {
        setScriptSummary(prev => prev ? { ...prev, [field]: value } : null);
    }, []);

    const handleEditSceneDescription = (index: number, newDescription: string) => { setScenes(prev => prev.map((s, i) => i === index ? { ...s, description: newDescription } : s)); };
    const handleEditSceneTransition = (index: number, newTransition: string) => { setScenes(prev => prev.map((s, i) => i === index ? { ...s, transition: newTransition } : s)); };
    const handleImageSourceChange = (sceneIndex: number, newSource: string) => { setScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, imageSource: newSource } : s)); };
    const handleSelectCustomImage = (sceneIndex: number) => { setPickingCustomImageForScene(sceneIndex); setIsGalleryPickerOpen(true); };

    const handleEditImage = (index: number) => {
        const scene = scenes[index];
        if (scene && scene.imageUrl) {
            openImageEditor(scene.imageUrl, (newUrl) => {
                setScenes(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: newUrl, imageSource: newUrl } : s));
                addImagesToGallery([newUrl]);
            });
        }
    };

    const handlePreviewImage = (index: number) => {
        const scene = scenes[index];
        if (scene && scene.imageUrl) {
            const lightboxImages = scenes.map(s => s.imageUrl).filter((url): url is string => !!url);
            const imageIndexInLightbox = lightboxImages.indexOf(scene.imageUrl);
            if (imageIndexInLightbox !== -1) {
                const allAppImages = imageGallery;
                const globalIndex = allAppImages.indexOf(scene.imageUrl);
                if (globalIndex !== -1) {
                    openLightbox(globalIndex);
                }
            }
        }
    };

    const handleDownloadImage = (index: number) => {
        const scene = scenes[index];
        if (scene && scene.imageUrl) {
            downloadImage(scene.imageUrl, `storyboard-scene-${scene.scene}`);
        }
    };

    const handleAddScene = useCallback(() => {
        setScenes(prev => {
            const newSceneNumber = prev.length > 0 ? Math.max(...prev.map(s => s.scene)) + 1 : 1;
            const newScene: SceneState = {
                scene: newSceneNumber,
                description: t('storyboarding_newScene_placeholder', newSceneNumber),
                status: 'idle',
                imageSource: 'reference',
            };
            const updatedScenes = [...prev];
            if (updatedScenes.length > 0) {
                const lastScene = updatedScenes[updatedScenes.length - 1];
                if (lastScene.transition === undefined) {
                    updatedScenes[updatedScenes.length - 1] = {
                        ...lastScene,
                        transition: ''
                    };
                }
            }
            return [...updatedScenes, newScene];
        });
    }, [t]);

    const handleEditSceneVideoPrompt = (index: number, newPrompt: string) => {
        setScenes(prev => prev.map((s, i) => i === index ? { ...s, videoPrompt: newPrompt } : s));
    };

    const handleGenerateVideoPromptForScene = async (sceneIndex: number, promptMode: 'auto' | 'start-end' | 'json') => {
        const sceneBefore = scenes[sceneIndex];
        const sceneAfter = scenes[sceneIndex + 1];

        if (!sceneBefore || !sceneAfter) return;

        try {
            const result = await generateVideoPromptFromScenes(
                sceneBefore.description,
                sceneBefore.transition || '',
                sceneAfter.description,
                storyboardLanguage,
                promptMode
            );
            handleEditSceneVideoPrompt(sceneIndex, result);
        } catch (err) {
            console.error("Error generating video prompt in modal:", err);
            throw err;
        }
    };
    
    const handleRegenerateScenePrompt = async (index: number, modificationPrompt: string) => {
        const originalScene = scenes[index];
        if (!originalScene) return;

        setIsLoading(true);
        setLoadingMessage(`Đang viết lại prompt cho Cảnh ${originalScene.scene}...`);
        setError(null);

        try {
            const newDescription = await refineSceneDescription(originalScene.description, modificationPrompt, storyboardLanguage);
            handleEditSceneDescription(index, newDescription);
            toast.success(`Đã tạo lại prompt cho Cảnh ${originalScene.scene}.`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Không thể tạo lại prompt.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegenerateSceneTransition = async (index: number, modificationPrompt: string) => {
        const originalScene = scenes[index];
        if (!originalScene || originalScene.transition === undefined) return;

        setIsLoading(true);
        setLoadingMessage(`Đang viết lại chuyển cảnh cho Cảnh ${originalScene.scene}...`);
        setError(null);

        try {
            const newTransition = await refineSceneTransition(originalScene.transition, modificationPrompt, storyboardLanguage);
            handleEditSceneTransition(index, newTransition);
            toast.success(`Đã tạo lại chuyển cảnh cho Cảnh ${originalScene.scene}.`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Không thể tạo lại chuyển cảnh.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async () => {
        if (scenes.length === 0 && !scriptSummary) {
            toast.error(t('storyboarding_export_disabled'));
            return;
        }
    
        const exportState = {
            version: 'storyboard-v1',
            activeInput,
            idea,
            scriptText,
            audioData,
            referenceImages,
            style,
            duration,
            aspectRatio,
            notes,
            storyboardLanguage,
            scriptSummary,
            scenes,
        };
    
        downloadJson(exportState, `storyboard-session-${Date.now()}.json`);
    };

    const processImportFile = (file: File) => {
        if (!file || file.type !== 'application/json') {
            toast.error(t('storyboarding_import_error'));
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result as string;
                const importedState = JSON.parse(result);

                if (importedState.version !== 'storyboard-v1' || !Array.isArray(importedState.scenes)) {
                    throw new Error(t('storyboarding_import_error'));
                }

                resetState(); 
                setActiveInput(importedState.activeInput || 'prompt');
                setIdea(importedState.idea || '');
                setScriptText(importedState.scriptText || '');
                
                if (importedState.audioData) {
                    const newAudioFile = dataURLtoFile(importedState.audioData.dataUrl, importedState.audioData.name, importedState.audioData.type);
                    setAudioFile(newAudioFile);
                } else {
                    setAudioFile(null);
                }

                setReferenceImages(importedState.referenceImages || []);
                setStyle(importedState.style || '');
                setDuration(importedState.duration || durationOptions[6]);
                setAspectRatio(importedState.aspectRatio || aspectRatioOptions[0]);
                setNotes(importedState.notes || '');
                setStoryboardLanguage(importedState.storyboardLanguage || 'vi');
                setScriptSummary(importedState.scriptSummary || null);
                setScenes(importedState.scenes || []);
                
                toast.success(t('storyboarding_import_success'));

            } catch (err) {
                toast.error(err instanceof Error ? err.message : t('storyboarding_import_error'));
                console.error("Failed to import storyboard:", err);
            }
        };
        reader.readAsText(file);
    };

    const handleFileSelectedForImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processImportFile(file);
        }
        e.target.value = '';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            if (e.dataTransfer.items[0].kind === 'file' && e.dataTransfer.items[0].type === 'application/json') {
                setIsDraggingOver(true);
            }
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processImportFile(e.dataTransfer.files[0]);
        }
    };
    
    return ReactDOM.createPortal(
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onHide} className="modal-overlay z-[60]" aria-modal="true" role="dialog" >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="modal-content !max-w-[95vw] !w-[95vw] !h-[95vh] flex flex-row !p-0 overflow-hidden relative"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <aside className="w-1/3 max-w-sm flex flex-col bg-neutral-900/50 p-4 border-r border-white/10">
                                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                    <h3 className="base-font font-bold text-xl text-yellow-400">{t('extraTools_storyboarding')}</h3>
                                    <button onClick={onHide} className="p-2 rounded-full hover:bg-white/10" aria-label={t('common_cancel')}><CloseIcon className="h-5 w-5" /></button>
                                </div>
                                <div className="flex-grow flex flex-col overflow-y-auto space-y-4 pr-2 -mr-4">
                                    <StoryboardingInput
                                        activeInput={activeInput} setActiveInput={setActiveInput} idea={idea} setIdea={setIdea} scriptText={scriptText} setScriptText={setScriptText}
                                        audioFile={audioFile} audioInputRef={audioInputRef} textInputRef={textInputRef} handleFileSelect={handleFileSelect}
                                        referenceImages={referenceImages} isDraggingRef={isDraggingRef} handleRefDragOver={handleRefDragOver} handleRefDragLeave={handleRefDragLeave}
                                        handleRefDrop={handleRefDrop} setReferenceImages={setReferenceImages} setIsGalleryPickerOpen={setIsGalleryPickerOpen}
                                        style={displayStyleValue} setStyle={handleStyleChange} styleOptions={styleOptions}
                                        duration={duration} setDuration={setDuration} durationOptions={durationOptions}
                                        aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} aspectRatioOptions={aspectRatioOptions}
                                        notes={notes} setNotes={setNotes}
                                        storyboardLanguage={storyboardLanguage}
                                        setStoryboardLanguage={setStoryboardLanguage}
                                    />
                                    {scriptSummary && (
                                        <StoryboardingSummary scriptSummary={scriptSummary} onSummaryChange={handleSummaryChange} />
                                    )}
                                </div>
                                <div className="flex-shrink-0 pt-4 border-t border-white/10">
                                    {!scriptSummary && (
                                        <button onClick={handleInitialScriptGeneration} className="btn btn-primary btn-sm w-full" disabled={isLoading}>
                                            {isLoading ? loadingMessage : t('storyboarding_idea_submit')}
                                        </button>
                                    )}
                                    {scriptSummary && scenes.length === 0 && (
                                        <div className="flex items-center gap-2">
                                            <button onClick={handleGenerateScriptSummary} className="btn btn-secondary btn-sm" disabled={isLoading}>
                                                {t('storyboarding_regenerateScript')}
                                            </button>
                                            <button onClick={handleDevelopScenesFromSummary} className="btn btn-primary btn-sm flex-grow" disabled={isLoading}>
                                                {isLoading && loadingMessage === t('storyboarding_developing_scenes') ? loadingMessage : t('storyboarding_developScenes')}
                                            </button>
                                        </div>
                                    )}
                                    {scriptSummary && scenes.length > 0 && (
                                         <div className="flex items-center gap-2">
                                            <button onClick={handleGenerateScriptSummary} className="btn btn-secondary btn-sm" disabled={isLoading}>
                                                {t('storyboarding_regenerateScript')}
                                            </button>
                                            <button onClick={handleDevelopScenesFromSummary} className="btn btn-primary btn-sm flex-grow" disabled={isLoading}>
                                                {isLoading && loadingMessage === t('storyboarding_developing_scenes') ? loadingMessage : t('storyboarding_redevelopScenes')}
                                            </button>
                                        </div>
                                    )}
                                    {error && <p className="text-red-400 text-center text-sm mt-2">{error}</p>}
                                </div>
                            </aside>

                            <main className="flex-1 flex flex-col p-4 overflow-hidden bg-neutral-800/30">
                                <div className="flex-shrink-0 pb-4 mb-4 border-b border-white/10 flex items-center justify-end gap-2">
                                    <input type="file" ref={importInputRef} onChange={handleFileSelectedForImport} accept=".json" className="hidden" />
                                    <button onClick={() => importInputRef.current?.click()} className="btn btn-secondary btn-sm" disabled={isLoading}>
                                        {t('storyboarding_import')}
                                    </button>
                                    <button onClick={handleExport} className="btn btn-secondary btn-sm" disabled={isLoading || (scenes.length === 0 && !scriptSummary)} title={(scenes.length === 0 && !scriptSummary) ? t('storyboarding_export_disabled') : ''}>
                                        {t('storyboarding_export')}
                                    </button>
                                    <button onClick={handleNew} className="btn btn-secondary btn-sm" disabled={isLoading}>
                                        {t('storyboarding_new')}
                                    </button>
                                    <button onClick={handleGenerateAll} className="btn btn-secondary btn-sm" disabled={isLoading || scenes.length === 0 || scenes.some(s => s.status === 'pending')}>
                                        {t('storyboarding_generateAll')}
                                    </button>
                                    <button onClick={handleDownloadAll} className="btn btn-secondary btn-sm" disabled={isLoading || scenes.every(s => !s.imageUrl)}>
                                        {t('common_downloadAll')}
                                    </button>
                                </div>
                                <div className="flex-grow overflow-y-auto">
                                    <StoryboardingScenes
                                        scenes={scenes} referenceImages={referenceImages} onGenerateImage={handleGenerateImage}
                                        onEditSceneDescription={handleEditSceneDescription} onImageSourceChange={handleImageSourceChange}
                                        onSelectCustomImage={handleSelectCustomImage} onEditImage={handleEditImage} onPreviewImage={handlePreviewImage}
                                        onDownloadImage={handleDownloadImage} onAddScene={handleAddScene}
                                        onEditSceneTransition={handleEditSceneTransition}
                                        onGenerateVideoPrompt={handleGenerateVideoPromptForScene}
                                        onEditSceneVideoPrompt={handleEditSceneVideoPrompt}
                                        onRegenerateScenePrompt={handleRegenerateScenePrompt}
                                        onRegenerateSceneTransition={handleRegenerateSceneTransition}
                                    />
                                </div>
                            </main>
                             <AnimatePresence>
                                {isDraggingOver && (
                                    <motion.div
                                        className="absolute inset-0 z-50 bg-black/70 border-4 border-dashed border-yellow-400 rounded-lg flex flex-col items-center justify-center pointer-events-none"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <CloudUploadIcon className="h-16 w-16 text-yellow-400 mb-4" strokeWidth={1} />
                                        <p className="text-2xl font-bold text-yellow-400">{t('storyboarding_dropPrompt')}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <GalleryPicker
                isOpen={isGalleryPickerOpen}
                onClose={() => { setIsGalleryPickerOpen(false); setPickingCustomImageForScene(null); }}
                onSelect={handleGallerySelect}
                images={imageGallery}
            />
            <Lightbox
                images={imageGallery}
                selectedIndex={lightboxIndex}
                onClose={closeLightbox}
                onNavigate={navigateLightbox}
            />
        </>,
        document.body
    );
};