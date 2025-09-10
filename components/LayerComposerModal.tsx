/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef, ChangeEvent, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotionValue, useMotionValueEvent } from 'framer-motion';
import { useAppControls, GalleryPicker, WebcamCaptureModal } from './uiUtils';
import { generateFreeImage, editImageWithPrompt, generateFromMultipleImages } from '../../services/geminiService';
import { approximateCubicBezier } from './ImageEditor/ImageEditor.utils';
import { LayerComposerSidebar } from './LayerComposer/LayerComposerSidebar';
import { LayerComposerCanvas } from './LayerComposer/LayerComposerCanvas';
import { StartScreen } from './LayerComposer/StartScreen';
import { getBoundingBoxForLayers, type Layer, type CanvasSettings, type Interaction, type PenNode, type Rect, type MultiLayerAction } from './LayerComposer/LayerComposer.types';

interface LayerComposerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
};

const captureLayer = async (layer: Layer): Promise<string> => {
    const canvas = document.createElement('canvas');
    // Use naturalWidth/Height for images to get original quality
    let captureWidth = layer.width;
    let captureHeight = layer.height;

    if (layer.type === 'image' && layer.url) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        await new Promise<void>((resolve, reject) => {
            img.onload = () => {
                captureWidth = img.naturalWidth;
                captureHeight = img.naturalHeight;
                resolve();
            };
            img.onerror = reject;
            img.src = layer.url;
        });
    }

    canvas.width = captureWidth;
    canvas.height = captureHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get context for layer capture");

    if (layer.type === 'image' && layer.url) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = layer.url;
        });
        ctx.drawImage(img, 0, 0, captureWidth, captureHeight);
    } else if (layer.type === 'text' && layer.text) {
        ctx.font = `${layer.fontStyle || 'normal'} ${layer.fontWeight || '400'} ${layer.fontSize || 50}px "${layer.fontFamily || 'Be Vietnam Pro'}"`;
        ctx.fillStyle = layer.color || '#000000';
        ctx.textBaseline = 'top';
        let startX = 0;
        if (layer.textAlign === 'center') {
            ctx.textAlign = 'center'; startX = layer.width / 2;
        } else if (layer.textAlign === 'right') {
            ctx.textAlign = 'right'; startX = layer.width;
        } else {
            ctx.textAlign = 'left';
        }
        const lineHeight = (layer.fontSize || 50) * (layer.lineHeight || 1.2);
        const textToRender = layer.textTransform === 'uppercase' ? (layer.text || '').toUpperCase() : (layer.text || '');
        wrapText(ctx, textToRender, startX, 0, layer.width, lineHeight);
    }
    return canvas.toDataURL('image/png');
};


const LayerComposerModal: React.FC<LayerComposerModalProps> = ({ isOpen, onClose }) => {
    const { sessionGalleryImages, addImagesToGallery, t } = useAppControls();

    const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>({ width: 1024, height: 1024, background: '#ffffff' });
    const [canvasInitialized, setCanvasInitialized] = useState(false);
    const [layers, setLayers] = useState<Layer[]>([]);
    const [history, setHistory] = useState<Layer[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const interactionStartHistoryState = useRef<Layer[] | null>(null);

    const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isWebcamOpen, setIsWebcamOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const canvasViewRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [interaction, setInteraction] = useState<Interaction | null>(null);
    const [isConfirmingClose, setIsConfirmingClose] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    
    const panX = useMotionValue(0);
    const panY = useMotionValue(0);
    const scale = useMotionValue(1);
    const [zoomDisplay, setZoomDisplay] = useState(100);
    useMotionValueEvent(scale, "change", (latest) => setZoomDisplay(Math.round(latest * 100)));

    const [activeCanvasTool, setActiveCanvasTool] = useState<'select' | 'hand' | 'pen'>('select');
    const [isSpacePanning, setIsSpacePanning] = useState(false);
    const panStartRef = useRef<{ pan: {x: number, y: number}, pointer: { x: number, y: number } } | null>(null);

    const [penPathPoints, setPenPathPoints] = useState<PenNode[]>([]);
    const [currentPenDrag, setCurrentPenDrag] = useState<{start: { x: number, y: number }, current: { x: number, y: number }} | null>(null);
    const [selectionPath, setSelectionPath] = useState<Path2D | null>(null);
    const [selectionBbox, setSelectionBbox] = useState<DOMRect | null>(null);
    const [isStartScreenDraggingOver, setIsStartScreenDraggingOver] = useState(false);
    const [snapLines, setSnapLines] = useState<{type: 'V' | 'H', position: number}[]>([]);


    const selectedLayers = useMemo(() => {
        return layers.filter(l => selectedLayerIds.includes(l.id));
    }, [layers, selectedLayerIds]);
    const selectionBoundingBox = useMemo(() => getBoundingBoxForLayers(selectedLayers), [selectedLayers]);
    const selectedLayer = selectedLayers.length === 1 ? selectedLayers[0] : null;
    
    const beginInteraction = useCallback(() => {
        interactionStartHistoryState.current = layers;
    }, [layers]);

    const updateLayerProperties = (id: string, newProps: Partial<Layer>, isFinalChange: boolean) => {
        setLayers(prevLayers => {
            const newLayers = prevLayers.map(l => id === l.id ? { ...l, ...newProps } : l);
             if (isFinalChange) {
                const newHistory = history.slice(0, historyIndex + 1);
                if (interactionStartHistoryState.current && JSON.stringify(interactionStartHistoryState.current) !== JSON.stringify(newLayers)) {
                    newHistory.push(newLayers);
                    setHistory(newHistory);
                    setHistoryIndex(newHistory.length - 1);
                }
                interactionStartHistoryState.current = null;
            }
            return newLayers;
        });
    };

    const updateMultipleLayers = (updates: { id: string, props: Partial<Layer> }[], isFinalChange: boolean) => {
        setLayers(prevLayers => {
            const layerMap = new Map(prevLayers.map(l => [l.id, l]));
            updates.forEach(({ id, props }) => {
                const currentLayer = layerMap.get(id);
                if (currentLayer) {
                    layerMap.set(id, { ...currentLayer, ...props });
                }
            });
            const newLayers = prevLayers.map(l => layerMap.get(l.id) || l);

            if (isFinalChange) {
                const newHistory = history.slice(0, historyIndex + 1);
                if (interactionStartHistoryState.current && JSON.stringify(interactionStartHistoryState.current) !== JSON.stringify(newLayers)) {
                    newHistory.push(newLayers);
                    setHistory(newHistory);
                    setHistoryIndex(newHistory.length - 1);
                }
                interactionStartHistoryState.current = null;
            }
            return newLayers;
        });
    };

    const reorderLayers = (reorderedLayers: Layer[]) => {
        beginInteraction();
        setLayers(reorderedLayers);
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(reorderedLayers);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        interactionStartHistoryState.current = null;
    };
    
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setLayers(history[newIndex]);
        }
    }, [history, historyIndex]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setLayers(history[newIndex]);
        }
    }, [history, historyIndex]);

    const deselect = useCallback(() => {
        setSelectionPath(null);
        setSelectionBbox(null);
        setPenPathPoints([]);
        if (activeCanvasTool === 'pen') {
            setActiveCanvasTool('select');
        }
    }, [activeCanvasTool]);

    useEffect(() => {
        if (activeCanvasTool === 'pen') setActiveCanvasTool('select');
        setPenPathPoints([]);
        setCurrentPenDrag(null);
        setSelectionPath(null);
        setSelectionBbox(null);
    }, [selectedLayerIds]);


    useEffect(() => {
        if (!isOpen) {
            setLayers([]);
            setSelectedLayerIds([]);
            setCanvasSettings({ width: 1024, height: 1024, background: '#ffffff' });
            setError(null);
            setInteraction(null);
            setCanvasInitialized(false);
            setHistory([[]]);
            setHistoryIndex(0);
        }
    }, [isOpen]);

    const handleRequestClose = useCallback(() => {
        if (layers.length > 0) {
            setIsConfirmingClose(true);
        } else {
            onClose();
        }
    }, [layers, onClose]);

    const addImagesAsLayers = (loadedImages: HTMLImageElement[]) => {
        if (loadedImages.length === 0) return;

        beginInteraction();
        
        let currentLayers = [...layers];
        let newSelectedIds: string[] = [];
        let canvasNeedsInit = layers.length === 0 && !canvasInitialized;
        let canvasSettingsToUpdate = { ...canvasSettings };

        if (canvasNeedsInit) {
            const firstImg = loadedImages[0];
            canvasSettingsToUpdate = {
                width: firstImg.width,
                height: firstImg.height,
                background: canvasSettings.background,
            };
            setCanvasSettings(canvasSettingsToUpdate);
            setCanvasInitialized(true);
        }

        [...loadedImages].reverse().forEach((img, index) => {
            let newLayer: Layer;
            if (index === loadedImages.length - 1 && canvasNeedsInit) {
                newLayer = {
                    id: Math.random().toString(36).substring(2, 9),
                    type: 'image',
                    url: img.src, x: 0, y: 0, width: img.width, height: img.height,
                    rotation: 0, opacity: 100, blendMode: 'source-over',
                    isVisible: true, isLocked: true,
                    // These properties are added to satisfy the type, they are not used for image layers
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    textTransform: 'none',
                };
                currentLayers = [newLayer, ...currentLayers];
            } else {
                const aspectRatio = img.width / img.height;
                const initialWidth = Math.min(300, canvasSettingsToUpdate.width * 0.5);
                const initialHeight = initialWidth / aspectRatio;
                newLayer = {
                    id: Math.random().toString(36).substring(2, 9),
                    type: 'image',
                    url: img.src, x: (canvasSettingsToUpdate.width - initialWidth) / 2, y: (canvasSettingsToUpdate.height - initialHeight) / 2,
                    width: initialWidth, height: initialHeight, rotation: 0, opacity: 100,
                    blendMode: 'source-over', isVisible: true, isLocked: false,
                    // These properties are added to satisfy the type, they are not used for image layers
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    textTransform: 'none',
                };
                currentLayers = [newLayer, ...currentLayers];
            }
            newSelectedIds.push(newLayer.id);
        });

        setLayers(currentLayers);
        setSelectedLayerIds(newSelectedIds);
        
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(currentLayers);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        interactionStartHistoryState.current = null;
    };


    const handleAddImage = (url: string) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            addImagesAsLayers([img]);
        };
        img.src = url;
        setIsGalleryOpen(false);
        setIsWebcamOpen(false);
    };

    const handleAddTextLayer = useCallback(() => {
        if (!canvasInitialized) {
            setCanvasInitialized(true);
        }

        beginInteraction();
    
        const newLayer: Layer = {
            id: Math.random().toString(36).substring(2, 9),
            type: 'text',
            text: 'Hello World',
            fontFamily: 'Be Vietnam Pro',
            fontSize: 50,
            fontWeight: '400',
            fontStyle: 'normal',
            textTransform: 'none',
            textAlign: 'left',
            color: '#000000',
            lineHeight: 1.2,
            x: (canvasSettings.width - 300) / 2,
            y: (canvasSettings.height - 60) / 2,
            width: 300,
            height: 60,
            rotation: 0,
            opacity: 100,
            blendMode: 'source-over',
            isVisible: true,
            isLocked: false,
        };
    
        const newLayers = [newLayer, ...layers];
        setLayers(newLayers);
        setSelectedLayerIds([newLayer.id]);
    
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newLayers);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        interactionStartHistoryState.current = null;
    }, [layers, canvasSettings.width, canvasSettings.height, history, historyIndex, beginInteraction, canvasInitialized]);
    
    const handleFiles = (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        const fileReadPromises = imageFiles.map(file => {
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') resolve(reader.result);
                    else reject(new Error('Failed to read file'));
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });

        Promise.all(fileReadPromises).then(dataUrls => {
            const imageLoadPromises = dataUrls.map(url => {
                return new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = url;
                });
            });

            Promise.all(imageLoadPromises).then(addImagesAsLayers).catch(err => {
                console.error("Error loading images:", err);
                setError(t('layerComposer_error', err instanceof Error ? err.message : "Image loading failed."));
            });
        }).catch(err => {
            console.error("Error reading files:", err);
            setError(t('layerComposer_error', err instanceof Error ? err.message : "File reading failed."));
        });
    };


    const handleCreateNew = useCallback(() => {
        setCanvasSettings({ width: 2048, height: 2048, background: '#ffffff' });
        setCanvasInitialized(true);
    }, []);

    const handleUploadClick = () => fileInputRef.current?.click();
    
    const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
    };
    
    const handleStartScreenDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsStartScreenDraggingOver(true);
    };
    const handleStartScreenDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsStartScreenDraggingOver(false);
    };
    const handleStartScreenDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsStartScreenDraggingOver(false); handleFiles(e.dataTransfer.files);
    };


    const deleteSelectedLayers = useCallback(() => {
        if (selectedLayerIds.length === 0) return;
        beginInteraction();
        const newLayers = layers.filter(l => !selectedLayerIds.includes(l.id));
        setLayers(newLayers);
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newLayers);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        interactionStartHistoryState.current = null;
        setSelectedLayerIds([]);
    }, [selectedLayerIds, layers, history, historyIndex, beginInteraction]);
    
    const duplicateSelectedLayers = () => {
        if (selectedLayers.length === 0) return;
        
        beginInteraction();
        let newLayers = [...layers];
        const newSelectedIds: string[] = [];

        const topMostSelectedIndex = layers.findIndex(l => l.id === selectedLayers[0].id);

        const layersToDuplicate = [...selectedLayers].reverse(); 

        for(const layerToDup of layersToDuplicate) {
             const newLayer: Layer = {
                ...layerToDup, id: Math.random().toString(36).substring(2, 9),
                x: layerToDup.x + 20, y: layerToDup.y + 20,
            };
            newLayers.splice(topMostSelectedIndex, 0, newLayer);
            newSelectedIds.push(newLayer.id);
        }
        
        setLayers(newLayers);
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newLayers);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        interactionStartHistoryState.current = null;
        setSelectedLayerIds(newSelectedIds);
    };

    const handleDuplicateForDrag = (): Layer[] => {
        if (selectedLayers.length === 0) return [];
        
        let newLayersState = [...layers];
        const newDuplicatedLayers: Layer[] = [];
        const newSelectedIds: string[] = [];
        
        const topMostLayerInSelection = selectedLayers[0];
        const topMostSelectedIndex = layers.findIndex(l => l.id === topMostLayerInSelection.id);
    
        [...selectedLayers].reverse().forEach(layerToDup => {
            const newLayer: Layer = {
                ...layerToDup,
                id: Math.random().toString(36).substring(2, 9),
                x: layerToDup.x,
                y: layerToDup.y,
            };
            newLayersState.splice(topMostSelectedIndex, 0, newLayer);
            newDuplicatedLayers.unshift(newLayer);
            newSelectedIds.push(newLayer.id);
        });
        
        setLayers(newLayersState);
        setSelectedLayerIds(newSelectedIds);
        
        return newDuplicatedLayers;
    };
    
    const exportSelectedLayer = useCallback(async () => {
        if (!selectedLayer || selectedLayer.type !== 'image') return;
        try {
            const img = new Image(); img.crossOrigin = "Anonymous";
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve(); img.onerror = (err) => reject(new Error(`Image load failed: ${err}`));
                img.src = selectedLayer.url!;
            });
            const tempCanvas = document.createElement('canvas'); const ctx = tempCanvas.getContext('2d');
            if (!ctx) throw new Error("Could not get 2D context for export.");
            if (selectionPath && selectionBbox) {
                const bbox = selectionBbox; tempCanvas.width = bbox.width; tempCanvas.height = bbox.height;
                ctx.translate(-bbox.x, -bbox.y); ctx.clip(selectionPath);
                ctx.drawImage(img, 0, 0, selectedLayer.width, selectedLayer.height);
            } else {
                tempCanvas.width = img.naturalWidth; tempCanvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);
            }
            addImagesToGallery([tempCanvas.toDataURL('image/png')]);
        } catch (e) {
            console.error("Failed to export layer", e);
            setError(t('layerComposer_error', e instanceof Error ? e.message : "Unknown error."));
        }
    }, [selectedLayer, selectionPath, selectionBbox, addImagesToGallery, t]);

    const copySelectionAsNewLayer = async (originalLayer: Layer, newUrl: string, bbox: DOMRect): Promise<Layer> => {
        const newLayer: Layer = {
            id: Math.random().toString(36).substring(2, 9),
            type: 'image',
            url: newUrl,
            x: originalLayer.x + bbox.x,
            y: originalLayer.y + bbox.y,
            width: bbox.width,
            height: bbox.height,
            rotation: 0,
            opacity: 100,
            blendMode: 'source-over',
            isVisible: true,
            isLocked: false,
            // Satisfy the type, not used for images
            fontWeight: 'normal',
            fontStyle: 'normal',
            textTransform: 'none',
        };
        const currentIndex = layers.findIndex(l => l.id === originalLayer.id);
        
        const newLayers = [
            ...layers.slice(0, currentIndex),
            newLayer,
            ...layers.slice(currentIndex)
        ];
        setLayers(newLayers);
        deselect();
        return newLayer;
    };

    const captureCanvas = useCallback(async (
        layersToCapture: Layer[],
        boundsToCapture: Rect,
        backgroundColor: string | null // null for transparent
    ): Promise<string> => {
        const canvas = document.createElement('canvas');
        canvas.width = boundsToCapture.width;
        canvas.height = boundsToCapture.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not create canvas context for capture");

        if (backgroundColor) {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        const imagePromises = layersToCapture.map(layer => {
            return new Promise<HTMLImageElement>((resolve, reject) => {
                if (layer.type !== 'image' || !layer.url) {
                    const emptyImg = new Image();
                    emptyImg.onload = () => resolve(emptyImg);
                    emptyImg.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
                    return;
                }
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = layer.url;
            });
        });

        const loadedImages = await Promise.all(imagePromises);

        for (let i = layersToCapture.length - 1; i >= 0; i--) {
            const layer = layersToCapture[i];
            const loadedImage = loadedImages[i];
            if (!layer.isVisible) continue;

            const drawX = layer.x - boundsToCapture.x;
            const drawY = layer.y - boundsToCapture.y;

            ctx.save();
            ctx.globalAlpha = layer.opacity / 100;
            ctx.globalCompositeOperation = layer.blendMode;
            ctx.translate(drawX + layer.width / 2, drawY + layer.height / 2);
            ctx.rotate(layer.rotation * Math.PI / 180);

            if (layer.type === 'text' && layer.text) {
                ctx.font = `${layer.fontStyle || 'normal'} ${layer.fontWeight || '400'} ${layer.fontSize || 50}px "${layer.fontFamily || 'Be Vietnam Pro'}"`;
                ctx.fillStyle = layer.color || '#000000';
                ctx.textBaseline = 'top';
                let startX = -layer.width / 2;
                if (layer.textAlign === 'center') {
                    ctx.textAlign = 'center'; startX = 0;
                } else if (layer.textAlign === 'right') {
                    ctx.textAlign = 'right'; startX = layer.width / 2;
                } else {
                    ctx.textAlign = 'left';
                }
                const lineHeight = (layer.fontSize || 50) * (layer.lineHeight || 1.2);
                const textToRender = layer.textTransform === 'uppercase' ? (layer.text || '').toUpperCase() : (layer.text || '');
                wrapText(ctx, textToRender, startX, -layer.height / 2, layer.width, lineHeight);
            } else if (layer.type === 'image') {
                if (loadedImage.src && !loadedImage.src.includes('base64,R0lGODlhAQABAAD')) {
                    ctx.drawImage(loadedImage, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
                }
            }
            ctx.restore();
        }
        return canvas.toDataURL('image/png');
    }, []);

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const dataUrl = await captureCanvas(
                layers,
                { x: 0, y: 0, width: canvasSettings.width, height: canvasSettings.height },
                canvasSettings.background
            );
            addImagesToGallery([dataUrl]);
            onClose();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error.";
            setError(t('layerComposer_error', errorMessage));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateAILayer = async () => {
        if (!aiPrompt.trim()) return;
        setIsLoading(true);
        setError(null);
    
        try {
            let resultUrl: string;
            
            // Case 1: No layers selected -> text-to-image using Imagen
            if (selectedLayers.length === 0) {
                const canvasRatio = canvasSettings.width / canvasSettings.height;
                let aspectRatioString = '1:1';
                if (canvasRatio > 1.7) aspectRatioString = '16:9';
                else if (canvasRatio > 1.2) aspectRatioString = '4:3';
                else if (canvasRatio < 0.6) aspectRatioString = '9:16';
                else if (canvasRatio < 0.8) aspectRatioString = '3:4';
    
                const results = await generateFreeImage(aiPrompt, 1, aspectRatioString);
                if (results.length === 0) throw new Error("AI did not generate an image.");
                resultUrl = results[0];
            } 
            // Case 2: One layer selected -> image-to-image using Gemini
            else if (selectedLayers.length === 1) {
                const layerToProcess = selectedLayers[0];
                const dataUrl = await captureLayer(layerToProcess);
                resultUrl = await editImageWithPrompt(dataUrl, aiPrompt);
            } 
            // Case 3: Multiple layers selected -> multi-image-to-image using Gemini
            else {
                const orderedSelectedLayers = selectedLayerIds.map(id => layers.find(l => l.id === id)).filter(Boolean) as Layer[];
                const dataUrls = await Promise.all(orderedSelectedLayers.map(layer => captureLayer(layer)));
                resultUrl = await generateFromMultipleImages(dataUrls, aiPrompt);
            }
    
            const newImg = new Image();
            newImg.crossOrigin = "Anonymous";
            newImg.onload = () => {
                beginInteraction();
                const aspectRatio = newImg.width / newImg.height;
                const initialWidth = Math.min(newImg.width, canvasSettings.width * 0.75);
                const initialHeight = initialWidth / aspectRatio;
    
                const newLayer: Layer = {
                    id: Math.random().toString(36).substring(2, 9),
                    type: 'image',
                    url: resultUrl,
                    x: (canvasSettings.width - initialWidth) / 2,
                    y: (canvasSettings.height - initialHeight) / 2,
                    width: initialWidth,
                    height: initialHeight,
                    rotation: 0,
                    opacity: 100,
                    blendMode: 'source-over',
                    isVisible: true,
                    isLocked: false,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    textTransform: 'none',
                };
                const newLayers = [newLayer, ...layers];
                setLayers(newLayers);
                setSelectedLayerIds([newLayer.id]);
                const newHistory = history.slice(0, historyIndex + 1);
                newHistory.push(newLayers);
                setHistory(newHistory);
                setHistoryIndex(newHistory.length - 1);
                interactionStartHistoryState.current = null;
            };
            newImg.src = resultUrl;
    
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error.";
            setError(t('layerComposer_error', errorMessage));
        } finally {
            setIsLoading(false);
        }
    };

    const finalizePenPath = useCallback(() => {
        if (!selectedLayer || penPathPoints.length < 3) {
            setPenPathPoints([]);
            return;
        }

        const canvasToLocal = (p: { x: number; y: number }, layer: Layer): { x: number; y: number } => {
            const angleRad = -layer.rotation * (Math.PI / 180);
            const cos = Math.cos(angleRad);
            const sin = Math.sin(angleRad);
            const center_x = layer.x + layer.width / 2;
            const center_y = layer.y + layer.height / 2;
            const translated_x = p.x - center_x;
            const translated_y = p.y - center_y;
            const rotated_x = translated_x * cos - translated_y * sin;
            const rotated_y = translated_x * sin + translated_y * cos;
            return { x: rotated_x + layer.width / 2, y: rotated_y + layer.height / 2 };
        };

        const approximatedCanvasPoints: { x: number; y: number }[] = [];
        for (let i = 0; i < penPathPoints.length; i++) {
            const p0 = penPathPoints[i];
            const nextNode = penPathPoints[(i + 1) % penPathPoints.length];
            approximatedCanvasPoints.push(...approximateCubicBezier(p0.anchor, p0.outHandle, nextNode.inHandle, nextNode.anchor));
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const localPoints = approximatedCanvasPoints.map(p => {
            const localPoint = canvasToLocal(p, selectedLayer);
            minX = Math.min(minX, localPoint.x);
            minY = Math.min(minY, localPoint.y);
            maxX = Math.max(maxX, localPoint.x);
            maxY = Math.max(maxY, localPoint.y);
            return localPoint;
        });

        const path = new Path2D();
        if (localPoints.length > 0) {
            path.moveTo(localPoints[0].x, localPoints[0].y);
            for (let i = 1; i < localPoints.length; i++) {
                path.lineTo(localPoints[i].x, localPoints[i].y);
            }
            path.closePath();
        }

        setSelectionPath(path);
        if (isFinite(minX)) {
            setSelectionBbox(new DOMRect(minX, minY, maxX - minX, maxY - minY));
        } else {
            setSelectionBbox(null);
        }

        setPenPathPoints([]);
        setActiveCanvasTool('select');
    }, [penPathPoints, selectedLayer]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
            if (e.code === 'Space' && !e.repeat) { e.preventDefault(); setIsSpacePanning(true); }
            if (e.code === 'KeyV') { e.preventDefault(); setActiveCanvasTool('select'); }
            if (e.code === 'KeyH') { e.preventDefault(); setActiveCanvasTool('hand'); }
            if (e.code === 'KeyP' && selectedLayer && selectedLayer.type === 'image') { e.preventDefault(); setActiveCanvasTool('pen'); }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedLayerIds.length > 0) {
                   deleteSelectedLayers();
                }
            }
            if ((e.metaKey || e.ctrlKey) && e.code === 'KeyD' && (selectionPath || activeCanvasTool === 'pen')) { e.preventDefault(); deselect(); }
            if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
            if ((e.metaKey || e.ctrlKey) && ((e.code === 'KeyZ' && e.shiftKey) || (e.code === 'KeyY' && !e.shiftKey))) { e.preventDefault(); handleRedo(); }
            if (e.code === 'Escape' && activeCanvasTool === 'pen') { e.preventDefault(); setPenPathPoints([]); setCurrentPenDrag(null); }
        };
        const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setIsSpacePanning(false); };
        window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
        return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
    }, [isOpen, selectedLayerIds, layers, deleteSelectedLayers, selectionPath, deselect, activeCanvasTool, handleUndo, handleRedo, selectedLayer]);
    
    const handleSelectLayer = (id: string) => {
        setSelectedLayerIds([id]);
    };
    
    const handleDeleteLayer = (id: string) => {
        beginInteraction();
        const newLayers = layers.filter(l => l.id !== id);
        setLayers(newLayers);
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newLayers);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        interactionStartHistoryState.current = null;
        setSelectedLayerIds(prev => prev.filter(selId => selId !== id));
    };
    
    const handleDuplicateLayer = (id: string): Layer => {
        const layerToDup = layers.find(l => l.id === id);
        if (!layerToDup) {
            throw new Error("Layer to duplicate not found");
        }
        
        beginInteraction();
        let newLayers = [...layers];
        const newSelectedIds: string[] = [];
        const topMostSelectedIndex = layers.findIndex(l => l.id === id);

        const newLayer: Layer = {
            ...layerToDup, id: Math.random().toString(36).substring(2, 9),
            x: layerToDup.x + 20, y: layerToDup.y + 20,
        };
        newLayers.splice(topMostSelectedIndex, 0, newLayer);
        newSelectedIds.push(newLayer.id);
        
        setLayers(newLayers);
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newLayers);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        interactionStartHistoryState.current = null;
        setSelectedLayerIds(newSelectedIds);
        return newLayer;
    };

    const handleAlign = (type: 'top' | 'middle' | 'bottom' | 'left' | 'center' | 'right') => {
        if (selectedLayers.length < 2 || !selectionBoundingBox) return;

        beginInteraction();
        const bbox = selectionBoundingBox;

        const updates = selectedLayers.map(layer => {
            let newProps: Partial<Layer> = {};
            switch (type) {
                case 'top': newProps.y = bbox.y; break;
                case 'middle': newProps.y = bbox.y + (bbox.height / 2) - (layer.height / 2); break;
                case 'bottom': newProps.y = bbox.y + bbox.height - layer.height; break;
                case 'left': newProps.x = bbox.x; break;
                case 'center': newProps.x = bbox.x + (bbox.width / 2) - (layer.width / 2); break;
                case 'right': newProps.x = bbox.x + bbox.width - layer.width; break;
            }
            return { id: layer.id, props: newProps };
        });

        updateMultipleLayers(updates, true);
    };

    const handleDistribute = (type: 'horizontal' | 'vertical') => {
        if (selectedLayers.length < 3) return;

        beginInteraction();

        if (type === 'horizontal') {
            const sortedLayers = [...selectedLayers].sort((a, b) => (a.x + a.width / 2) - (b.x + b.width / 2));
            const firstLayer = sortedLayers[0];
            const lastLayer = sortedLayers[sortedLayers.length - 1];

            const minCenter = firstLayer.x + firstLayer.width / 2;
            const maxCenter = lastLayer.x + lastLayer.width / 2;
            const totalRange = maxCenter - minCenter;
            
            if (totalRange <= 0) return;

            const gap = totalRange / (sortedLayers.length - 1);

            const updates = sortedLayers.map((layer, index) => {
                const newCenterX = minCenter + index * gap;
                const newX = newCenterX - layer.width / 2;
                return { id: layer.id, props: { x: newX } };
            });
            updateMultipleLayers(updates, true);

        } else { // vertical
            const sortedLayers = [...selectedLayers].sort((a, b) => (a.y + a.height / 2) - (b.y + b.height / 2));
            const firstLayer = sortedLayers[0];
            const lastLayer = sortedLayers[sortedLayers.length - 1];

            const minCenter = firstLayer.y + firstLayer.height / 2;
            const maxCenter = lastLayer.y + lastLayer.height / 2;
            const totalRange = maxCenter - minCenter;

            if (totalRange <= 0) return;
            
            const gap = totalRange / (sortedLayers.length - 1);
            
            const updates = sortedLayers.map((layer, index) => {
                const newCenterY = minCenter + index * gap;
                const newY = newCenterY - layer.height / 2;
                return { id: layer.id, props: { y: newY } };
            });
            updateMultipleLayers(updates, true);
        }
    };

    const handleMultiLayerAction = (action: MultiLayerAction) => {
        switch (action) {
            case 'align-top': handleAlign('top'); break;
            case 'align-middle': handleAlign('middle'); break;
            case 'align-bottom': handleAlign('bottom'); break;
            case 'align-left': handleAlign('left'); break;
            case 'align-center': handleAlign('center'); break;
            case 'align-right': handleAlign('right'); break;
            case 'distribute-horizontal': handleDistribute('horizontal'); break;
            case 'distribute-vertical': handleDistribute('vertical'); break;
            case 'duplicate': duplicateSelectedLayers(); break;
            case 'delete': deleteSelectedLayers(); break;
        }
    };


    return ReactDOM.createPortal(
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleRequestClose} className="modal-overlay z-[60]" aria-modal="true" role="dialog">
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className="modal-content !max-w-[95vw] !w-[95vw] !h-[95vh] flex flex-row !p-0">
                            {!canvasInitialized ? (
                                <div 
                                    className="w-full h-full flex items-center justify-center p-6 bg-neutral-800/30 relative"
                                    onDragOver={handleStartScreenDragOver}
                                    onDragLeave={handleStartScreenDragLeave}
                                    onDrop={handleStartScreenDrop}
                                >
                                    <StartScreen
                                        onCreateNew={handleCreateNew}
                                        onOpenGallery={() => setIsGalleryOpen(true)}
                                        onUpload={handleUploadClick}
                                        onOpenWebcam={() => setIsWebcamOpen(true)}
                                        hasGalleryImages={sessionGalleryImages.length > 0}
                                    />
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelected} multiple onClick={(e) => ((e.target as HTMLInputElement).value = '')} />
                                    <AnimatePresence>
                                        {isStartScreenDraggingOver && (
                                            <motion.div
                                                className="absolute inset-0 z-10 bg-black/70 border-4 border-dashed border-yellow-400 rounded-lg flex flex-col items-center justify-center pointer-events-none"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                                <p className="text-2xl font-bold text-yellow-400">Thả ảnh để bắt đầu</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <>
                                    <LayerComposerSidebar
                                        layers={layers}
                                        canvasSettings={canvasSettings}
                                        selectedLayerId={selectedLayerIds.length > 0 ? selectedLayerIds[0] : null}
                                        selectedLayerIds={selectedLayerIds}
                                        isLoading={isLoading}
                                        error={error}
                                        aiPrompt={aiPrompt}
                                        setAiPrompt={setAiPrompt}
                                        onGenerateAILayer={handleGenerateAILayer}
                                        onLayersReorder={reorderLayers}
                                        onLayerUpdate={updateLayerProperties}
                                        onLayerDelete={handleDeleteLayer}
                                        onLayerSelect={handleSelectLayer}
                                        onCanvasSettingsChange={setCanvasSettings}
                                        onAddImage={() => setIsGalleryOpen(true)}
                                        onAddText={handleAddTextLayer}
                                        onSave={handleSave}
                                        onClose={handleRequestClose}
                                        beginInteraction={beginInteraction}
                                    />
                                    <LayerComposerCanvas
                                        canvasViewRef={canvasViewRef}
                                        layers={layers}
                                        canvasSettings={canvasSettings}
                                        selectedLayerIds={selectedLayerIds}
                                        selectedLayers={selectedLayers}
                                        selectionBoundingBox={selectionBoundingBox}
                                        panX={panX}
                                        panY={panY}
                                        scale={scale}
                                        zoomDisplay={zoomDisplay}
                                        activeCanvasTool={activeCanvasTool}
                                        setActiveCanvasTool={setActiveCanvasTool}
                                        isSpacePanning={isSpacePanning}
                                        interaction={interaction}
                                        setInteraction={setInteraction}
                                        panStartRef={panStartRef}
                                        penPathPoints={penPathPoints}
                                        setPenPathPoints={setPenPathPoints}
                                        currentPenDrag={currentPenDrag}
                                        setCurrentPenDrag={setCurrentPenDrag}
                                        selectionPath={selectionPath}
                                        finalizePenPath={finalizePenPath}
                                        canUndo={canUndo}
                                        canRedo={canRedo}
                                        handleUndo={handleUndo}
                                        handleRedo={handleRedo}
                                        onUpdateLayers={updateMultipleLayers}
                                        beginInteraction={beginInteraction}
                                        duplicateLayer={handleDuplicateLayer}
                                        exportSelectedLayer={exportSelectedLayer}
                                        deleteLayer={handleDeleteLayer}
                                        deselect={deselect}
                                        setSelectedLayerIds={setSelectedLayerIds}
                                        selectionBbox={selectionBbox}
                                        copySelectionAsNewLayer={copySelectionAsNewLayer}
                                        onFilesDrop={handleFiles}
                                        onMultiLayerAction={handleMultiLayerAction}
                                        onDuplicateForDrag={handleDuplicateForDrag}
                                        snapLines={snapLines}
                                        setSnapLines={setSnapLines}
                                    />
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isOpen && isConfirmingClose && (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay z-[70]" aria-modal="true" role="dialog">
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className="modal-content !max-w-md">
                            <h3 className="base-font font-bold text-2xl text-yellow-400">{t('confirmClose_title')}</h3>
                            <p className="text-neutral-300 my-2">{t('confirmClose_message')}</p>
                            <div className="flex justify-end items-center gap-4 mt-4">
                                <button onClick={() => setIsConfirmingClose(false)} className="btn btn-secondary btn-sm">{t('confirmClose_stay')}</button>
                                <button onClick={() => { onClose(); setIsConfirmingClose(false); }} className="btn btn-primary btn-sm">{t('confirmClose_close')}</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <GalleryPicker isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} onSelect={handleAddImage} images={sessionGalleryImages}/>
             <WebcamCaptureModal isOpen={isWebcamOpen} onClose={() => setIsWebcamOpen(false)} onCapture={handleAddImage}/>
        </>
    , document.body);
};

export default LayerComposerModal;