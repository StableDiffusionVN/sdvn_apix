/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef, ChangeEvent, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotionValue, useMotionValueEvent } from 'framer-motion';
import { useAppControls, GalleryPicker, WebcamCaptureModal, downloadImage, downloadJson, useImageEditor, extractJsonFromPng } from './uiUtils';
import { 
    generateFromPreset, 
    editImageWithPrompt, 
    generateFromMultipleImages, 
    refineImageAndPrompt, 
    analyzePromptForImageGenerationParams,
    generateFreeImage
} from '../services/geminiService';
import { LayerComposerSidebar } from './LayerComposer/LayerComposerSidebar';
import { LayerComposerCanvas } from './LayerComposer/LayerComposerCanvas';
import { StartScreen } from './LayerComposer/StartScreen';
import { type Layer, type CanvasSettings, type Interaction, type Rect, type MultiLayerAction, getBoundingBoxForLayers, type CanvasTool, type AIPreset } from './LayerComposer/LayerComposer.types';

interface LayerComposerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHide: () => void;
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

const captureCanvas = async (
    layersToCapture: Layer[],
    boundsToCapture: Rect,
    backgroundColor: string | null
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

    const imagesToLoad = layersToCapture.filter(l => l.type === 'image' && l.url);
    const imageElements = await Promise.all(imagesToLoad.map(l => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = l.url!;
        });
    }));
    const imageMap = new Map(imagesToLoad.map((l, i) => [l.id, imageElements[i]]));

    for (let i = layersToCapture.length - 1; i >= 0; i--) {
        const layer = layersToCapture[i];
        if (!layer.isVisible) continue;
        const drawX = layer.x - boundsToCapture.x;
        const drawY = layer.y - boundsToCapture.y;

        ctx.save();
        ctx.globalAlpha = layer.opacity / 100;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.translate(drawX + layer.width / 2, drawY + layer.height / 2);
        ctx.rotate(layer.rotation * Math.PI / 180);
        ctx.translate(-layer.width / 2, -layer.height / 2);

        if (layer.type === 'text' && layer.text) {
            ctx.font = `${layer.fontStyle || 'normal'} ${layer.fontWeight || '400'} ${layer.fontSize || 50}px "${layer.fontFamily || 'Be Vietnam Pro'}"`;
            ctx.fillStyle = layer.color || '#000000';
            ctx.textBaseline = 'top';
            let startX = 0;
            if (layer.textAlign === 'center') { ctx.textAlign = 'center'; startX = layer.width / 2; }
            else if (layer.textAlign === 'right') { ctx.textAlign = 'right'; startX = layer.width; }
            else { ctx.textAlign = 'left'; }
            const lineHeight = (layer.fontSize || 50) * (layer.lineHeight || 1.2);
            const textToRender = layer.textTransform === 'uppercase' ? (layer.text || '').toUpperCase() : (layer.text || '');
            wrapText(ctx, textToRender, startX, 0, layer.width, lineHeight);
        } else if (layer.type === 'image') {
            const loadedImage = imageMap.get(layer.id);
            if (loadedImage) {
                ctx.drawImage(loadedImage, 0, 0, layer.width, layer.height);
            }
        } else if (layer.type === 'shape') {
            ctx.fillStyle = layer.fillColor || '#FFFFFF';
            if (layer.shapeType === 'ellipse') {
                ctx.beginPath();
                ctx.ellipse(layer.width / 2, layer.height / 2, layer.width / 2, layer.height / 2, 0, 0, 2 * Math.PI);
                ctx.fill();
            } else { // rectangle
                ctx.beginPath();
                // A bit complex to draw a rounded rectangle with rotation, easier to use path
                const r = layer.borderRadius || 0;
                ctx.moveTo(r, 0);
                ctx.lineTo(layer.width - r, 0);
                ctx.arcTo(layer.width, 0, layer.width, r, r);
                ctx.lineTo(layer.width, layer.height - r);
                ctx.arcTo(layer.width, layer.height, layer.width - r, layer.height, r);
                ctx.lineTo(r, layer.height);
                ctx.arcTo(0, layer.height, 0, layer.height - r, r);
                ctx.lineTo(0, r);
                ctx.arcTo(0, 0, r, 0, r);
                ctx.closePath();
                ctx.fill();
            }
        }
        ctx.restore();
    }
    return canvas.toDataURL('image/png');
};

const captureLayer = async (layer: Layer): Promise<string> => {
    const canvas = document.createElement('canvas');
    let captureWidth = layer.width;
    let captureHeight = layer.height;
    const EXPORT_SCALE_FACTOR = 4;

    const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(new Error(`Failed to load image: ${url.substring(0, 50)}...`));
            img.src = url;
        });
    };

    const img = (layer.type === 'image' && layer.url) ? await loadImage(layer.url) : null;
    if (img) {
        captureWidth = img.naturalWidth;
        captureHeight = img.naturalHeight;
    } else if (layer.type === 'text' || layer.type === 'shape') {
        captureWidth = layer.width * EXPORT_SCALE_FACTOR;
        captureHeight = layer.height * EXPORT_SCALE_FACTOR;
    }

    canvas.width = captureWidth;
    canvas.height = captureHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get context for layer capture");

    if (layer.type === 'image' && img) {
        ctx.drawImage(img, 0, 0, captureWidth, captureHeight);
    } else if (layer.type === 'text' && layer.text) {
        ctx.scale(EXPORT_SCALE_FACTOR, EXPORT_SCALE_FACTOR);
        ctx.font = `${layer.fontStyle || 'normal'} ${layer.fontWeight || '400'} ${layer.fontSize || 50}px "${layer.fontFamily || 'Be Vietnam Pro'}"`;
        ctx.fillStyle = layer.color || '#000000';
        ctx.textBaseline = 'top';
        let startX = 0;
        if (layer.textAlign === 'center') { ctx.textAlign = 'center'; startX = layer.width / 2; }
        else if (layer.textAlign === 'right') { ctx.textAlign = 'right'; startX = layer.width; }
        else { ctx.textAlign = 'left'; }
        const lineHeight = (layer.fontSize || 50) * (layer.lineHeight || 1.2);
        const textToRender = layer.textTransform === 'uppercase' ? (layer.text || '').toUpperCase() : (layer.text || '');
        wrapText(ctx, textToRender, startX, 0, layer.width, lineHeight);
    } else if (layer.type === 'shape') {
        ctx.scale(EXPORT_SCALE_FACTOR, EXPORT_SCALE_FACTOR);
        ctx.fillStyle = layer.fillColor || '#FFFFFF';
        if (layer.shapeType === 'ellipse') {
            ctx.beginPath();
            ctx.ellipse(layer.width / 2, layer.height / 2, layer.width / 2, layer.height / 2, 0, 0, 2 * Math.PI);
            ctx.fill();
        } else { // rectangle
             const r = layer.borderRadius || 0;
            ctx.beginPath();
            ctx.moveTo(r, 0);
            ctx.lineTo(layer.width - r, 0);
            ctx.arcTo(layer.width, 0, layer.width, r, r);
            ctx.lineTo(layer.width, layer.height - r);
            ctx.arcTo(layer.width, layer.height, layer.width - r, layer.height, r);
            ctx.lineTo(r, layer.height);
            ctx.arcTo(0, layer.height, 0, layer.height - r, r);
            ctx.lineTo(0, r);
            ctx.arcTo(0, 0, r, 0, r);
            ctx.closePath();
            ctx.fill();
        }
    }
    return canvas.toDataURL('image/png');
};


interface AILogMessage {
  id: number;
  message: string;
  type: 'info' | 'prompt' | 'success' | 'error' | 'spinner';
}

const AIProcessLogger: React.FC<{ log: AILogMessage[]; onClose: () => void; t: (key: string) => string; }> = ({ log, onClose, t }) => {
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const logContainerRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [log]);

    const handleCopy = (message: string, id: number) => {
        navigator.clipboard.writeText(message).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    return (
        <motion.div
            className="ai-process-logger"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="ai-process-logger-header">
                <h4 className="ai-process-logger-title">{t('layerComposer_ai_processTitle')}</h4>
                <button onClick={onClose} className="ai-process-logger-close" aria-label="Close log">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <ul ref={logContainerRef} className="ai-process-logger-content">
                {log.map(item => (
                    <li key={item.id} className={`ai-process-logger-item log-item-${item.type}`}>
                        {item.type === 'spinner' ? (
                            <div className="log-item-spinner">
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>{item.message}</span>
                            </div>
                        ) : item.type === 'prompt' ? (
                            <div className="log-item-prompt">
                                <pre>{item.message}</pre>
                                <button onClick={() => handleCopy(item.message, item.id)} className="copy-btn" title={copiedId === item.id ? t('layerComposer_ai_log_copied') : t('layerComposer_ai_log_copy')}>
                                    {copiedId === item.id ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <span>{item.message}</span>
                        )}
                    </li>
                ))}
            </ul>
        </motion.div>
    );
};

const findClosestImagenAspectRatio = (width: number, height: number): '1:1' | '3:4' | '4:3' | '9:16' | '16:9' => {
    if (width <= 0 || height <= 0) return '1:1';
    const targetRatio = width / height;
    const supportedRatios: Record<'1:1' | '3:4' | '4:3' | '9:16' | '16:9', number> = {
        '1:1': 1.0,
        '9:16': 9 / 16,
        '16:9': 16 / 9,
        '3:4': 3 / 4,
        '4:3': 4 / 3,
    };

    let closestMatch: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '1:1';
    let minDiff = Infinity;

    for (const ratioStr in supportedRatios) {
        const key = ratioStr as keyof typeof supportedRatios;
        const ratioVal = supportedRatios[key];
        const diff = Math.abs(targetRatio - ratioVal);
        if (diff < minDiff) {
            minDiff = diff;
            closestMatch = key;
        }
    }
    return closestMatch;
};

const parseMultiPrompt = (prompt: string): string[] => {
    // This regex finds a pattern like: prefix {var1|var2} suffix
    // It is non-greedy and handles multiline text with the 's' flag.
    const match = prompt.match(/^(.*?)\{(.*?)\}(.*)$/s);
    if (match) {
        const prefix = match[1] || '';
        // Split by '|' and trim whitespace from each variation
        const variations = match[2].split('|').map(v => v.trim()).filter(v => v);
        const suffix = match[3] || '';
        // If there are actual variations, construct the full prompts
        if (variations.length > 0) {
            return variations.map(v => `${prefix}${v}${suffix}`.trim());
        }
    }
    // If no match or no variations, return the original prompt in an array
    return [prompt];
};


export const LayerComposerModal: React.FC<LayerComposerModalProps> = ({ isOpen, onClose, onHide }) => {
    const { sessionGalleryImages, addImagesToGallery, t, settings, language } = useAppControls();
    const { openImageEditor } = useImageEditor();

    const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>({ 
        width: 1024, 
        height: 1024, 
        background: '#ffffff', 
        grid: { visible: false, snap: false, size: 50, color: '#cccccc' },
        guides: { enabled: true, color: '#ff4d4d' },
    });
    const [isInfiniteCanvas, setIsInfiniteCanvas] = useState(true);
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
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [interaction, setInteraction] = useState<Interaction | null>(null);
    const [isConfirmingClose, setIsConfirmingClose] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isSimpleImageMode, setIsSimpleImageMode] = useState(false);
    const [aiPreset, setAiPreset] = useState<string>('default');
    const [presets, setPresets] = useState<AIPreset[]>([]);
    const [aiProcessLog, setAiProcessLog] = useState<AILogMessage[]>([]);
    const [isLogVisible, setIsLogVisible] = useState(false);
    const [editingMaskForLayerId, setEditingMaskForLayerId] = useState<string | null>(null);
    const [rectBorderRadius, setRectBorderRadius] = useState(0);
    const [loadedPreset, setLoadedPreset] = useState<any | null>(null);
    const [activeCanvasTool, setActiveCanvasTool] = useState<CanvasTool>('select');
    const [shapeFillColor, setShapeFillColor] = useState<string>('#FFFFFF');

    const onRectBorderRadiusChange = (radius: number) => {
        setRectBorderRadius(radius);
    };

    const onReleaseMask = (layerId: string) => {
        setEditingMaskForLayerId(null);
    };
    
    const panX = useMotionValue(0);
    const panY = useMotionValue(0);
    const scale = useMotionValue(1);
    const [zoomDisplay, setZoomDisplay] = useState(100);
    useMotionValueEvent(scale, "change", (latest) => setZoomDisplay(Math.round(latest * 100)));

    const [isSpacePanning, setIsSpacePanning] = useState(false);
    const panStartRef = useRef<{ pan: { x: number; y: number; }; pointer: { x: number; y: number; }; } | null>(null);

    const [isStartScreenDraggingOver, setIsStartScreenDraggingOver] = useState(false);

    const selectedLayers = useMemo(() => {
        return selectedLayerIds.map(id => layers.find(l => l.id === id)).filter((l): l is Layer => !!l);
    }, [layers, selectedLayerIds]);
    const selectionBoundingBox = useMemo(() => {
        return getBoundingBoxForLayers(selectedLayers);
    }, [selectedLayers]);
    const selectedLayer = selectedLayers.length === 1 ? selectedLayers[0] : null;

    const prevIsLoadingRef = useRef(false);
    const generationController = useRef<AbortController | null>(null);

    useEffect(() => {
        const fetchPresets = async () => {
            try {
                const response = await fetch('/presets.json');
                if (!response.ok) {
                    throw new Error('Could not load presets.json');
                }
                const data = await response.json();
                setPresets(data.presets);
            } catch (error) {
                console.error(error);
                setPresets([
                    {
                        id: "default",
                        name: { vi: "Mặc định", en: "Default" },
                        description: { vi: "Sử dụng prompt của bạn trực tiếp không qua xử lý.", en: "Use your prompt directly without processing." },
                        requiresImageContext: false,
                        refine: false,
                        promptTemplate: { vi: "{{userPrompt}}", en: "{{userPrompt}}" }
                    },
                    {
                        id: "architecture",
                        name: { vi: "Kiến trúc", en: "Architecture" },
                        description: { vi: "Biến phác thảo hoặc ảnh 3D thành ảnh kiến trúc chân thực, giữ lại bố cục gốc.", en: "Turns sketches or 3D images into realistic architectural photos, preserving the original layout." },
                        requiresImageContext: true,
                        refine: true,
                        promptTemplate: { vi: "Giữ nguyên đường nét, bố cục và hình khối từ hình ảnh một cách chính xác nhất, hãy tạo ra một bức ảnh phối cảnh kiến trúc chân thực của công trình này.", en: "Maintaining the lines, layout, and form from the image as accurately as possible, create a realistic architectural perspective photo of this structure."}
                    }
                ]);
            }
        };

        if (isOpen) {
            fetchPresets();
        }
    }, [isOpen]);

    useEffect(() => {
        if (prevIsLoadingRef.current && !isLoading && isLogVisible) {
            const timer = setTimeout(() => {
                setIsLogVisible(false);
            }, 5000); 
    
            return () => clearTimeout(timer);
        }
    }, [isLoading, isLogVisible]);
    
    useEffect(() => {
        prevIsLoadingRef.current = isLoading;
    }, [isLoading]);
    
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

    const updateMultipleLayers = (updates: { id: string; props: Partial<Layer> }[], isFinalChange: boolean) => {
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

    const handleResizeSelectedLayers = useCallback((dimension: 'width' | 'height', newValue: number) => {
        if (selectedLayers.length === 0 || !newValue || newValue <= 0) return;
    
        beginInteraction();
    
        const updates = selectedLayers.map(layer => {
            const aspectRatio = (layer.width > 0 && layer.height > 0) ? layer.width / layer.height : 1;
            let newWidth, newHeight;
    
            if (dimension === 'width') {
                newWidth = newValue;
                newHeight = newValue / aspectRatio;
            } else { // dimension === 'height'
                newHeight = newValue;
                newWidth = newValue * aspectRatio;
            }
    
            return { id: layer.id, props: { width: newWidth, height: newHeight } };
        });
    
        updateMultipleLayers(updates, true);
    }, [selectedLayers, beginInteraction, updateMultipleLayers]);

    const reorderLayers = useCallback((reorderedLayers: Layer[]) => {
        beginInteraction();
        setLayers(reorderedLayers);
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(reorderedLayers);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        interactionStartHistoryState.current = null;
    }, [beginInteraction, history, historyIndex]);
    
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const handleUndo = useCallback(() => { if (historyIndex > 0) { const newIndex = historyIndex - 1; setHistoryIndex(newIndex); setLayers(history[newIndex]); } }, [history, historyIndex]);
    const handleRedo = useCallback(() => { if (historyIndex < history.length - 1) { const newIndex = historyIndex + 1; setHistoryIndex(newIndex); setLayers(history[newIndex]); } }, [history, historyIndex]);

    const handleCloseAndReset = useCallback(() => {
        setLayers([]);
        setSelectedLayerIds([]);
        setCanvasSettings({ width: 1024, height: 1024, background: '#ffffff', grid: { visible: false, snap: false, size: 50, color: '#cccccc' }, guides: { enabled: true, color: '#ff4d4d' } });
        setError(null);
        setInteraction(null);
        setCanvasInitialized(false);
        setHistory([[]]);
        setHistoryIndex(0);
        setIsInfiniteCanvas(true);
        setAiProcessLog([]);
        setIsLogVisible(false);
        setLoadedPreset(null);
        onClose();
    }, [onClose]);

    const handleRequestClose = useCallback(() => {
        if (layers.length > 0) {
            setIsConfirmingClose(true);
        } else {
            handleCloseAndReset();
        }
    }, [layers, handleCloseAndReset]);
    
    const loadCanvasStateFromJson = useCallback((jsonData: any) => {
        if (!jsonData || typeof jsonData.canvasSettings !== 'object' || !Array.isArray(jsonData.layers)) { setError(t('layerComposer_invalidJsonError')); return; }
        const { canvasSettings: loadedSettings, layers: loadedLayers } = jsonData;
        const defaultGridSettings = { visible: false, snap: false, size: 50, color: '#cccccc' };
        const defaultGuideSettings = { enabled: true, color: '#ff4d4d' };
        setCanvasSettings({ 
            ...loadedSettings, 
            grid: { ...defaultGridSettings, ...loadedSettings.grid },
            guides: { ...defaultGuideSettings, ...loadedSettings.guides }
        }); 
        setLayers(loadedLayers); 
        setHistory([loadedLayers]); 
        setHistoryIndex(0);
        setCanvasInitialized(true); 
        setIsInfiniteCanvas(loadedSettings.isInfinite ?? false);
        panX.set(0); 
        panY.set(0); 
        scale.set(1);
    }, [t, panX, panY, scale]);

    const handleJsonFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => { try { const result = e.target?.result; if (typeof result === 'string') { const jsonData = JSON.parse(result); loadCanvasStateFromJson(jsonData); } } catch (err) { console.error("Error parsing JSON file:", err); setError(t('layerComposer_invalidJsonError')); } };
        reader.onerror = () => setError(t('layerComposer_invalidJsonError'));
        reader.readAsText(file);
    };

    const addImagesAsLayers = useCallback((loadedImages: HTMLImageElement[], position?: { x: number; y: number }) => {
        if (loadedImages.length === 0) return;
        beginInteraction();
        let currentLayers = [...layers];
        let newSelectedIds: string[] = [];
        let canvasNeedsInit = layers.length === 0 && !canvasInitialized;
        let canvasSettingsToUpdate = { ...canvasSettings };
    
        if (canvasNeedsInit) {
            const firstImg = loadedImages[0];
            canvasSettingsToUpdate = { ...canvasSettings, width: firstImg.naturalWidth, height: firstImg.naturalHeight };
            setCanvasSettings(canvasSettingsToUpdate);
            setCanvasInitialized(true);
            setIsInfiniteCanvas(false);
        }
    
        let nextY = position ? position.y : 0;
        let nextX = position ? position.x : 0;

        [...loadedImages].reverse().forEach((img, index) => {
            const initialWidth = img.naturalWidth;
            const initialHeight = img.naturalHeight;

            let newX: number;
            let newY: number;

            if (position) {
                newX = nextX;
                newY = nextY;
                // Offset subsequent images slightly so they don't perfectly overlap
                nextX += 20;
                nextY += 20;
            } else {
                 if (canvasViewRef.current) {
                    const viewWidth = canvasViewRef.current.clientWidth;
                    const viewHeight = canvasViewRef.current.clientHeight;
                    // Calculate center of the current viewport in canvas coordinates
                    const canvasCenterX = (-panX.get() / scale.get()) + (viewWidth / 2 / scale.get());
                    const canvasCenterY = (-panY.get() / scale.get()) + (viewHeight / 2 / scale.get());
                    newX = canvasCenterX - initialWidth / 2;
                    newY = canvasCenterY - initialHeight / 2;
                } else {
                    // Fallback to canvas center if view ref is not available
                    newX = (canvasSettingsToUpdate.width - initialWidth) / 2;
                    newY = (canvasSettingsToUpdate.height - initialHeight) / 2;
                }
            }

            const newLayer: Layer = {
                id: Math.random().toString(36).substring(2, 9),
                type: 'image',
                url: img.src,
                x: newX,
                y: newY,
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
            currentLayers = [newLayer, ...currentLayers];
            newSelectedIds.push(newLayer.id);
        });
    
        setLayers(currentLayers);
        setSelectedLayerIds(newSelectedIds);
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(currentLayers);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        interactionStartHistoryState.current = null;
    }, [layers, canvasInitialized, canvasSettings, history, historyIndex, beginInteraction, panX, panY, scale, canvasViewRef]);

    const handleAddImage = useCallback((url: string, referenceBounds?: Rect | null) => {
        const img = new Image(); img.crossOrigin = "Anonymous";
        img.onload = () => { 
            const position = referenceBounds 
                ? { x: referenceBounds.x + referenceBounds.width + 20, y: referenceBounds.y } 
                : undefined;
            addImagesAsLayers([img], position); 
        };
        img.src = url; setIsGalleryOpen(false); setIsWebcamOpen(false);
    }, [addImagesAsLayers]);
    
    const handleAddTextLayer = useCallback(() => {
        if (!canvasInitialized) { setCanvasInitialized(true); }
        beginInteraction();
        const newLayer: Layer = {
            id: Math.random().toString(36).substring(2, 9), type: 'text', text: 'Hello World', fontFamily: 'Be Vietnam Pro', fontSize: 50, fontWeight: '400', fontStyle: 'normal', textTransform: 'none',
            textAlign: 'left', color: '#000000', lineHeight: 1.2, x: (canvasSettings.width - 300) / 2, y: (canvasSettings.height - 60) / 2,
            width: 300, height: 60, rotation: 0, opacity: 100, blendMode: 'source-over', isVisible: true, isLocked: false,
        };
        const newLayers = [newLayer, ...layers]; setLayers(newLayers); setSelectedLayerIds([newLayer.id]);
        const newHistory = history.slice(0, historyIndex + 1); newHistory.push(newLayers);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        interactionStartHistoryState.current = null;
    }, [layers, canvasSettings.width, canvasSettings.height, history, historyIndex, beginInteraction, canvasInitialized]);
    
    const addLayer = useCallback((layerData: Omit<Layer, 'id'>) => {
        if (!canvasInitialized) {
            setCanvasInitialized(true);
        }
        beginInteraction();
        const newLayer: Layer = {
            ...layerData,
            id: Math.random().toString(36).substring(2, 9),
        };
        const newLayers = [newLayer, ...layers];
        setLayers(newLayers);
        setSelectedLayerIds([newLayer.id]);
    
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newLayers);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        interactionStartHistoryState.current = null;
    }, [layers, canvasInitialized, history, historyIndex, beginInteraction]);

    const handleFilesDrop = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const jsonFile = Array.from(files).find(f => f.name.toLowerCase().endsWith('.json'));
        if (jsonFile) { handleJsonFile(jsonFile); return; }
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) return;
        const fileReadPromises = imageFiles.map(file => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => { if (typeof reader.result === 'string') resolve(reader.result); else reject(new Error('Failed to read file')); }; reader.onerror = reject; reader.readAsDataURL(file); }));
        Promise.all(fileReadPromises).then(dataUrls => {
            const imageLoadPromises = dataUrls.map(url => new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.crossOrigin = "Anonymous"; img.onload = () => resolve(img); img.onerror = reject; img.src = url; }));
            Promise.all(imageLoadPromises).then(loadedImages => addImagesAsLayers(loadedImages)).catch(err => { console.error("Error loading images:", err); setError(t('layerComposer_error', err instanceof Error ? err.message : "Image loading failed.")); });
        }).catch(err => { console.error("Error reading files:", err); setError(t('layerComposer_error', err instanceof Error ? err.message : "File reading failed.")); });
    };

    const handleCreateNew = useCallback(() => { setCanvasSettings({ width: 2048, height: 2048, background: '#ffffff', grid: { visible: false, snap: false, size: 50, color: '#cccccc' }, guides: { enabled: true, color: '#ff4d4d' } }); setCanvasInitialized(true); }, []);
    const handleUploadClick = () => fileInputRef.current?.click();
    const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => { handleFilesDrop(e.target.files); };
    const handleStartScreenDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsStartScreenDraggingOver(true); };
    const handleStartScreenDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsStartScreenDraggingOver(false); };
    const handleStartScreenDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsStartScreenDraggingOver(false); handleFilesDrop(e.dataTransfer.files); };

    const deleteSelectedLayers = useCallback(() => {
        if (selectedLayerIds.length === 0) return;
        beginInteraction();
        const newLayers = layers.filter(l => !selectedLayerIds.includes(l.id));
        setLayers(newLayers);
        const newHistory = history.slice(0, historyIndex + 1); newHistory.push(newLayers);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        interactionStartHistoryState.current = null; setSelectedLayerIds([]);
    }, [selectedLayerIds, layers, history, historyIndex, beginInteraction]);
    
    const duplicateSelectedLayers = () => {
        if (selectedLayers.length === 0) return [];
        beginInteraction();
        let newLayers = [...layers]; const newSelectedIds: string[] = [];
        const topMostSelectedIndex = layers.findIndex(l => l.id === selectedLayers[0].id);
        const layersToDuplicate = [...selectedLayers].reverse(); 
        for(const layerToDup of layersToDuplicate) {
             const newLayer: Layer = { ...layerToDup, id: Math.random().toString(36).substring(2, 9), x: layerToDup.x + 20, y: layerToDup.y + 20 };
            newLayers.splice(topMostSelectedIndex, 0, newLayer); newSelectedIds.push(newLayer.id);
        }
        setLayers(newLayers);
        const newHistory = history.slice(0, historyIndex + 1); newHistory.push(newLayers);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        interactionStartHistoryState.current = null; setSelectedLayerIds(newSelectedIds);
        return newLayers.filter(l => newSelectedIds.includes(l.id));
    };

    const handleDuplicateForDrag = (): Layer[] => {
        if (selectedLayers.length === 0) return [];
        beginInteraction();
        let newLayersState = [...layers]; const newDuplicatedLayers: Layer[] = []; const newSelectedIds: string[] = [];
        const topMostLayerInSelection = selectedLayers[0]; const topMostSelectedIndex = layers.findIndex(l => l.id === topMostLayerInSelection.id);
        [...selectedLayers].reverse().forEach(layerToDup => {
            const newLayer: Layer = { ...layerToDup, id: Math.random().toString(36).substring(2, 9), x: layerToDup.x, y: layerToDup.y };
            newLayersState.splice(topMostSelectedIndex, 0, newLayer); newDuplicatedLayers.unshift(newLayer); newSelectedIds.push(newLayer.id);
        });
        setLayers(newLayersState); setSelectedLayerIds(newSelectedIds);
        return newDuplicatedLayers;
    };
    
    const handleExportSelectedLayers = useCallback(async () => {
        if (selectedLayers.length < 1) return;
        setIsLoading(true); setError(null);
        try {
            for (const layer of selectedLayers) {
                const exportedUrl = await captureLayer(layer);
                addImagesToGallery([exportedUrl]);
                await new Promise(resolve => setTimeout(resolve, 200)); 
                downloadImage(exportedUrl, `aPix-canvas-export-${layer.id || 'layer'}`);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error.";
            setError(t('layerComposer_error', errorMessage));
        } finally { setIsLoading(false); }
    }, [selectedLayers, addImagesToGallery, t]);

    const handleSave = async () => {
        setIsLoading(true); setError(null);
        try {
            const canvasState = { canvasSettings: { ...canvasSettings, isInfinite: isInfiniteCanvas }, layers };
            downloadJson(canvasState, `aPix-canvas-state-${Date.now()}.json`);
            if (!isInfiniteCanvas) {
                const dataUrl = await captureCanvas( layers, { x: 0, y: 0, width: canvasSettings.width, height: canvasSettings.height }, canvasSettings.background );
                addImagesToGallery([dataUrl]);
                handleCloseAndReset();
            }
        } catch (err) { const errorMessage = err instanceof Error ? err.message : "Unknown error."; setError(t('layerComposer_error', errorMessage)); }
        finally { setIsLoading(false); }
    };

    const addLog = (message: string, type: AILogMessage['type']) => {
        setAiProcessLog(prev => [...prev, { id: Date.now() + Math.random(), message, type }]);
    };
    
    const handleMergeLayers = useCallback(async () => {
        if (selectedLayers.length < 2) return; beginInteraction(); setIsLoading(true); setError(null);
        try {
            const bbox = getBoundingBoxForLayers(selectedLayers); if (!bbox) throw new Error("Could not calculate bounding box.");
            const mergedImageUrl = await captureCanvas(selectedLayers, bbox, null);
            const newLayer: Layer = {
                id: Math.random().toString(36).substring(2, 9), type: 'image', url: mergedImageUrl, x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height,
                rotation: 0, opacity: 100, blendMode: 'source-over', isVisible: true, isLocked: false,
                fontWeight: 'normal', fontStyle: 'normal', textTransform: 'none',
            };
            const topMostLayerIndex = layers.findIndex(l => l.id === selectedLayerIds[0]);
            const newLayers = layers.filter(l => !selectedLayerIds.includes(l.id));
            newLayers.splice(topMostLayerIndex, 0, newLayer);
            setLayers(newLayers); setSelectedLayerIds([newLayer.id]);
            const newHistory = history.slice(0, historyIndex + 1); newHistory.push(newLayers);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            interactionStartHistoryState.current = null;
        } catch (err) { const msg = err instanceof Error ? err.message : "Unknown error."; setError(t('layerComposer_error', msg)); interactionStartHistoryState.current = null; }
        finally { setIsLoading(false); }
    }, [selectedLayers, layers, selectedLayerIds, beginInteraction, history, historyIndex, t]);
    
    const handleGenerateAILayer = async () => {
        generationController.current = new AbortController();
        const { signal } = generationController.current;
    
        setIsLogVisible(true);
        setIsLoading(true);
        setError(null);
        setAiProcessLog([]);
    
        const promptsToGenerate = parseMultiPrompt(aiPrompt);
        const isPromptEmpty = promptsToGenerate.every(p => !p.trim());
        const finalPrompts = isPromptEmpty ? [''] : promptsToGenerate;
        const currentPreset = presets.find(pr => pr.id === aiPreset);
    
        if (isPromptEmpty && (!currentPreset || currentPreset.id === 'default')) {
            setIsLoading(false);
            setIsLogVisible(false);
            return;
        }
    
        try {
            addLog(t('layerComposer_ai_log_start'), 'info');
            if (promptsToGenerate.length > 1) {
                addLog(`Detected ${promptsToGenerate.length} prompt variations. Generating all...`, 'info');
            }
    
            const hasLayerContext = selectedLayers.length > 0;
            const referenceBounds = hasLayerContext ? getBoundingBoxForLayers(selectedLayers) : null;
            const imageUrls = hasLayerContext ? await Promise.all(selectedLayers.map(l => captureLayer(l))) : [];
            if (signal.aborted) return;
    
            const generationPromises = finalPrompts.map(async (userPromptChunk) => {
                if (!currentPreset) throw new Error("Selected preset not found.");
    
                if (currentPreset.requiresImageContext && !hasLayerContext) {
                    throw new Error(`Preset "${currentPreset.name[language as keyof typeof currentPreset.name]}" requires at least one image layer to be selected.`);
                }
    
                const template = currentPreset.promptTemplate[language as keyof typeof currentPreset.promptTemplate] || currentPreset.promptTemplate['en'];
                let finalPrompt = '';
    
                if (currentPreset.refine && hasLayerContext) {
                    addLog(t('layerComposer_ai_log_refining'), 'spinner');
                    finalPrompt = await refineImageAndPrompt(template, userPromptChunk, imageUrls);
                    setAiProcessLog(prev => prev.filter(l => l.type !== 'spinner'));
                } else {
                    finalPrompt = template.replace('{{userPrompt}}', userPromptChunk).trim();
                    addLog(t('layerComposer_ai_log_noRefine'), 'info');
                }
                if (signal.aborted) throw new Error("Cancelled");
    
                addLog(t('layerComposer_ai_log_finalPrompt'), 'info');
                addLog(finalPrompt, 'prompt');
    
                if (!hasLayerContext) {
                    const params = await analyzePromptForImageGenerationParams(finalPrompt);
                    if (signal.aborted) throw new Error("Cancelled");
    
                    const canvasAspectRatioStr = findClosestImagenAspectRatio(canvasSettings.width, canvasSettings.height);
                    const finalAspectRatio = params.aspectRatio !== '1:1' ? params.aspectRatio : canvasAspectRatioStr;
                    const finalNumImages = finalPrompts.length > 1 ? 1 : params.numberOfImages;
    
                    return generateFreeImage(params.refinedPrompt, finalNumImages, finalAspectRatio as any);
                } else {
                    if (isSimpleImageMode && finalPrompts.length === 1 && selectedLayers.length > 1) {
                        return Promise.all(imageUrls.map(url => editImageWithPrompt(url, finalPrompt)));
                    } else if (selectedLayers.length === 1) {
                        return editImageWithPrompt(imageUrls[0], finalPrompt);
                    } else {
                        return generateFromMultipleImages(imageUrls, finalPrompt);
                    }
                }
            });
    
            addLog(t('layerComposer_ai_log_generating'), 'spinner');
            const results = (await Promise.all(generationPromises)).flat();
            if (signal.aborted) return;
    
            if (results.length === 0) throw new Error("AI did not generate any images.");
    
            const imageLoadPromises = results.map(url => new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = url;
            }));
            const loadedImages = await Promise.all(imageLoadPromises);
            if (signal.aborted) return;
    
            const position = referenceBounds ? { x: referenceBounds.x + referenceBounds.width + 20, y: referenceBounds.y } : undefined;
            addImagesAsLayers(loadedImages, position);
    
            setAiProcessLog(prev => prev.filter(l => l.type !== 'spinner'));
            addLog(t('layerComposer_ai_log_success'), 'success');
    
        } catch (err) {
            if (signal.aborted || (err instanceof Error && err.message === 'Cancelled')) {
                console.log("Generation process was cancelled.");
            } else {
                const errorMessage = err instanceof Error ? err.message : "Unknown error.";
                setError(t('layerComposer_error', errorMessage));
                setAiProcessLog(prev => prev.filter(l => l.type !== 'spinner'));
                addLog(t('layerComposer_ai_log_error', errorMessage), 'error');
            }
        } finally {
            if (!generationController.current?.signal.aborted) {
                setIsLoading(false);
            }
            generationController.current = null;
        }
    };
    
    const handleCancelGeneration = useCallback(() => {
        if (generationController.current) {
            generationController.current.abort();
        }
        setIsLoading(false);
        setAiProcessLog(prev => {
            const newLog = prev.filter(l => l.type !== 'spinner');
            newLog.push({ id: Date.now(), message: `${t('layerComposer_ai_cancel')}...`, type: 'error' });
            return newLog;
        });
    }, [t]);

    const handleMoveLayers = useCallback((direction: 'up' | 'down') => {
        if (selectedLayerIds.length === 0) return;
        beginInteraction();
        const newLayers = [...layers];
        const selectedIndices = selectedLayerIds.map(id => newLayers.findIndex(l => l.id === id)).filter(index => index !== -1).sort((a, b) => a - b);
        if (direction === 'up') {
            for (let i = 0; i < selectedIndices.length; i++) {
                const currentIndex = selectedIndices[i];
                if (currentIndex > 0 && !selectedIndices.includes(currentIndex - 1)) {
                    const [item] = newLayers.splice(currentIndex, 1);
                    newLayers.splice(currentIndex - 1, 0, item);
                    for (let j = i + 1; j < selectedIndices.length; j++) { selectedIndices[j]--; }
                }
            }
        } else {
            for (let i = selectedIndices.length - 1; i >= 0; i--) {
                const currentIndex = selectedIndices[i];
                if (currentIndex < newLayers.length - 1 && !selectedIndices.includes(currentIndex + 1)) {
                    const [item] = newLayers.splice(currentIndex, 1);
                    newLayers.splice(currentIndex + 1, 0, item);
                    for (let j = 0; j < i; j++) { selectedIndices[j]++; }
                }
            }
        }
        reorderLayers(newLayers);
    }, [layers, selectedLayerIds, reorderLayers, beginInteraction]);
    
    const handleSelectLayer = (id: string) => { setSelectedLayerIds([id]); };

    const handleMultiLayerAction = useCallback((action: MultiLayerAction) => {
        switch (action) { case 'delete': deleteSelectedLayers(); return; case 'duplicate': duplicateSelectedLayers(); return; case 'export': handleExportSelectedLayers(); return; }
        if (selectedLayers.length < 2) return;
        beginInteraction();
        
        if (action === 'merge') { handleMergeLayers(); return; }

        const bbox = getBoundingBoxForLayers(selectedLayers); if (!bbox) { interactionStartHistoryState.current = null; return; }
        const updates: { id: string; props: Partial<Layer> }[] = [];
        const GAP = 10;
        
        switch (action) {
            case 'align-left': selectedLayers.forEach(l => updates.push({ id: l.id, props: { x: bbox.x }})); break;
            case 'align-center': selectedLayers.forEach(l => updates.push({ id: l.id, props: { x: bbox.x + (bbox.width / 2) - (l.width / 2) }})); break;
            case 'align-right': selectedLayers.forEach(l => updates.push({ id: l.id, props: { x: bbox.x + bbox.width - l.width }})); break;
            case 'align-top': selectedLayers.forEach(l => updates.push({ id: l.id, props: { y: bbox.y }})); break;
            case 'align-middle': selectedLayers.forEach(l => updates.push({ id: l.id, props: { y: bbox.y + (bbox.height / 2) - (l.height / 2) }})); break;
            case 'align-bottom': selectedLayers.forEach(l => updates.push({ id: l.id, props: { y: bbox.y + bbox.height - l.height }})); break;
            case 'distribute-horizontal': { const sorted = [...selectedLayers].sort((a,b) => a.x - b.x); if (sorted.length < 2) break; const totalW = sorted.reduce((s, l) => s + l.width, 0); const gap = (bbox.width - totalW) / (sorted.length - 1); let currentX = bbox.x; sorted.forEach(l => { updates.push({ id: l.id, props: { x: currentX } }); currentX += l.width + gap; }); break; }
            case 'distribute-vertical': { const sorted = [...selectedLayers].sort((a,b) => a.y - b.y); if (sorted.length < 2) break; const totalH = sorted.reduce((s, l) => s + l.height, 0); const gap = (bbox.height - totalH) / (sorted.length - 1); let currentY = bbox.y; sorted.forEach(l => { updates.push({ id: l.id, props: { y: currentY } }); currentY += l.height + gap; }); break; }
            case 'distribute-and-scale-horizontal': {
                const sorted = [...selectedLayers].sort((a, b) => a.x - b.x);
                if (sorted.length === 0) break;
                const totalHeight = sorted.reduce((sum, l) => sum + l.height, 0);
                const avgHeight = totalHeight / sorted.length;
                if (avgHeight <= 0) break;
                let currentX = bbox.x;
                
                sorted.forEach(layer => {
                    const aspectRatio = (layer.height > 0) ? layer.width / layer.height : 1;
                    const newWidth = avgHeight * aspectRatio;
                    updates.push({
                        id: layer.id,
                        props: { width: newWidth, height: avgHeight, x: currentX, y: bbox.y }
                    });
                    currentX += newWidth + GAP;
                });
                break;
            }
            case 'distribute-and-scale-vertical': {
                const sorted = [...selectedLayers].sort((a, b) => a.y - b.y);
                if (sorted.length === 0) break;
                const totalWidth = sorted.reduce((sum, l) => sum + l.width, 0);
                const avgWidth = totalWidth / sorted.length;
                if (avgWidth <= 0) break;
                let currentY = bbox.y;

                sorted.forEach(layer => {
                    const aspectRatio = (layer.width > 0) ? layer.height / layer.width : 1;
                    const newHeight = avgWidth * aspectRatio;
                    updates.push({
                        id: layer.id,
                        props: { width: avgWidth, height: newHeight, x: bbox.x, y: currentY }
                    });
                    currentY += newHeight + GAP;
                });
                break;
            }
        }
        if (updates.length > 0) { updateMultipleLayers(updates, true); } else { interactionStartHistoryState.current = null; }
    }, [selectedLayers, layers, beginInteraction, updateMultipleLayers, deleteSelectedLayers, duplicateSelectedLayers, handleExportSelectedLayers, handleMergeLayers]);
    
    const handleBakeSelectedLayer = useCallback(async () => {
        if (selectedLayers.length !== 1) return;
        const layerToBake = selectedLayers[0];

        beginInteraction();
        setIsLoading(true);
        setError(null);

        try {
            const bbox = getBoundingBoxForLayers([layerToBake]);
            if (!bbox) throw new Error("Could not calculate layer bounds.");

            const bakedImageUrl = await captureCanvas([layerToBake], bbox, null);
            
            const newLayer: Layer = {
                id: Math.random().toString(36).substring(2, 9),
                type: 'image',
                url: bakedImageUrl,
                x: bbox.x,
                y: bbox.y,
                width: bbox.width,
                height: bbox.height,
                rotation: 0,
                opacity: 100,
                blendMode: 'source-over',
                isVisible: layerToBake.isVisible,
                isLocked: false,
                text: undefined,
                fontFamily: undefined,
                fontSize: undefined,
                fontWeight: 'normal',
                fontStyle: 'normal',
                textTransform: 'none',
                textAlign: undefined,
                color: undefined,
                lineHeight: undefined,
            };

            const oldLayers = layers;
            const oldHistoryIndex = historyIndex;

            const newLayers = oldLayers.map(l => l.id === layerToBake.id ? newLayer : l);
            setLayers(newLayers);
            setSelectedLayerIds([newLayer.id]);

            const newHistory = history.slice(0, oldHistoryIndex + 1);
            newHistory.push(newLayers);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            interactionStartHistoryState.current = null;

            // Reset masking state after baking
            if (editingMaskForLayerId === layerToBake.id) {
                setEditingMaskForLayerId(null);
                setRectBorderRadius(0);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error.";
            setError(t('layerComposer_error', errorMessage));
        } finally {
            setIsLoading(false);
        }
    }, [selectedLayers, layers, history, historyIndex, beginInteraction, editingMaskForLayerId, setLayers, setHistory, setHistoryIndex, setSelectedLayerIds, setIsLoading, setError, t]);

    const handleGenerateFromPreset = useCallback(async () => {
        if (!loadedPreset) return;
    
        setIsLogVisible(true);
        setIsLoading(true);
        setError(null);
        setAiProcessLog([]);
        addLog(t('layerComposer_ai_log_start'), 'info');
        
        try {
            const selectedLayerUrls = await Promise.all(selectedLayers.map(l => captureLayer(l)));
            const resultUrls = await generateFromPreset(loadedPreset, selectedLayerUrls);

            if (resultUrls.length > 0) {
                 const imageLoadPromises = resultUrls.map(url => new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image(); img.crossOrigin = "Anonymous"; img.onload = () => resolve(img); img.onerror = reject; img.src = url;
                }));
                const loadedImages = await Promise.all(imageLoadPromises);
                const referenceBounds = getBoundingBoxForLayers(selectedLayers.length > 0 ? selectedLayers : layers.slice(-1));
                const position = referenceBounds ? { x: referenceBounds.x + referenceBounds.width + 20, y: referenceBounds.y } : undefined;
                addImagesAsLayers(loadedImages, position);
            }

            setAiProcessLog(prev => prev.filter(l => l.type !== 'spinner'));
            addLog(t('layerComposer_ai_log_success'), 'success');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error during preset generation.";
            setError(errorMessage);
            setAiProcessLog(prev => prev.filter(l => l.type !== 'spinner'));
            addLog(t('layerComposer_ai_log_error', errorMessage), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [loadedPreset, selectedLayers, layers, addImagesAsLayers, t]);


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const isUndo = (e.metaKey || e.ctrlKey) && e.code === 'KeyZ' && !e.shiftKey;
            const isRedo = (e.metaKey || e.ctrlKey) && (e.code === 'KeyZ' && e.shiftKey || e.code === 'KeyY');
            if (isUndo) { e.preventDefault(); handleUndo(); return; }
            if (isRedo) { e.preventDefault(); handleRedo(); return; }
            
            if (e.code === 'Space' && !e.repeat) { e.preventDefault(); setIsSpacePanning(true); }
            
            const isDelete = (e.code === 'Delete' || e.code === 'Backspace');
            const isDuplicate = (e.metaKey || e.ctrlKey) && e.code === 'KeyJ';
            const isMoveDown = (e.metaKey || e.ctrlKey) && e.code === 'BracketLeft';
            const isMoveUp = (e.metaKey || e.ctrlKey) && e.code === 'BracketRight';
            const isDeselectAll = (e.metaKey || e.ctrlKey) && e.code === 'KeyD';
            const isExport = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e';

            if (selectedLayerIds.length > 0) {
                if (isDelete) { e.preventDefault(); deleteSelectedLayers(); return; }
                if (isDuplicate) { e.preventDefault(); duplicateSelectedLayers(); return; }
                if (isMoveDown) { e.preventDefault(); handleMoveLayers('down'); return; }
                if (isMoveUp) { e.preventDefault(); handleMoveLayers('up'); return; }
                if (isExport) { e.preventDefault(); handleExportSelectedLayers(); return; }
            }
            if (isDeselectAll) { e.preventDefault(); setSelectedLayerIds([]); return; }
            
            const isSimpleKey = !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
            if (isSimpleKey) {
                let handled = false;
                switch (e.code) {
                    case 'KeyV': setActiveCanvasTool('select'); handled = true; break;
                    case 'KeyH': setActiveCanvasTool('hand'); handled = true; break;
                }
                if (handled) e.preventDefault();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.code === 'Space') { setIsSpacePanning(false); }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [
        isOpen, handleUndo, handleRedo, deleteSelectedLayers, duplicateSelectedLayers,
        handleMoveLayers, setSelectedLayerIds, selectedLayerIds, activeCanvasTool,
        selectedLayer, handleExportSelectedLayers
    ]);

    const handlePresetFile = async (file: File) => {
        let settingsData = null;
        setError(null);
        setLoadedPreset(null);
        try {
            if (file.type === 'image/png') {
                settingsData = await extractJsonFromPng(file);
                if (!settingsData) throw new Error("No preset data found in PNG.");
            } else if (file.type === 'application/json') {
                settingsData = JSON.parse(await file.text());
            } else {
                throw new Error("Unsupported file type.");
            }

            if (settingsData && settingsData.viewId && settingsData.state) {
                 const appConfig = settings?.apps.find(app => app.id === settingsData.viewId);
                if (appConfig && (appConfig as any).supportsCanvasPreset) {
                    setLoadedPreset(settingsData);
                } else {
                    throw new Error(`The app "${settingsData.viewId}" does not support presets.`);
                }
            } else {
                throw new Error("Invalid preset file format.");
            }
        } catch (e) {
            console.error("Failed to load preset file", e);
            setError(e instanceof Error ? e.message : "Could not read preset file.");
        }
    };
    
    return ReactDOM.createPortal(
        <>
            <motion.div
                className="modal-overlay z-[60]"
                aria-modal="true"
                role="dialog"
                initial={false}
                animate={isOpen ? "open" : "closed"}
                variants={{
                    open: { opacity: 1, pointerEvents: 'auto' },
                    closed: { opacity: 0, pointerEvents: 'none' },
                }}
                transition={{ duration: 0.2 }}
                onClick={onHide}
            >
                <motion.div
                    className="modal-content !max-w-[95vw] !w-[95vw] !h-[95vh] flex flex-row !p-0 relative"
                    onClick={(e) => e.stopPropagation()}
                    initial={false}
                    animate={isOpen ? "open" : "closed"}
                    variants={{
                        open: { opacity: 1, scale: 1, y: 0 },
                        closed: { opacity: 0, scale: 0.95, y: 20 },
                    }}
                    transition={{ duration: 0.2 }}
                >
                    {!canvasInitialized ? (
                        <div className="w-full h-full" onDragOver={handleStartScreenDragOver} onDragLeave={handleStartScreenDragLeave} onDrop={handleStartScreenDrop}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*,.json"
                                multiple
                                onChange={handleFileSelected}
                            />
                            <StartScreen
                                onCreateNew={handleCreateNew}
                                onOpenGallery={() => setIsGalleryOpen(true)}
                                onUpload={handleUploadClick}
                                onOpenWebcam={() => setIsWebcamOpen(true)}
                                hasGalleryImages={sessionGalleryImages.length > 0}
                            />
                            <AnimatePresence>
                                {isStartScreenDraggingOver && (
                                    <motion.div
                                        className="absolute inset-0 z-10 bg-black/70 border-4 border-dashed border-yellow-400 rounded-lg flex flex-col items-center justify-center pointer-events-none"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                        <p className="text-2xl font-bold text-yellow-400">{t('layerComposer_startScreen_dropPrompt')}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <>
                            <LayerComposerSidebar
                                layers={layers}
                                canvasSettings={canvasSettings}
                                isInfiniteCanvas={isInfiniteCanvas}
                                setIsInfiniteCanvas={setIsInfiniteCanvas}
                                selectedLayerId={selectedLayer?.id || null}
                                selectedLayerIds={selectedLayerIds}
                                selectedLayers={selectedLayers}
                                isLoading={isLoading}
                                error={error}
                                aiPrompt={aiPrompt}
                                setAiPrompt={setAiPrompt}
                                presets={presets}
                                aiPreset={aiPreset}
                                setAiPreset={setAiPreset}
                                isSimpleImageMode={isSimpleImageMode}
                                setIsSimpleImageMode={setIsSimpleImageMode}
                                onGenerateAILayer={handleGenerateAILayer}
                                onCancelGeneration={handleCancelGeneration}
                                onLayersReorder={reorderLayers}
                                onLayerUpdate={updateLayerProperties}
                                onLayerDelete={deleteSelectedLayers}
                                onLayerSelect={handleSelectLayer}
                                onCanvasSettingsChange={setCanvasSettings}
                                onAddImage={() => setIsGalleryOpen(true)}
                                onAddText={handleAddTextLayer}
                                onSave={handleSave}
                                onClose={handleRequestClose}
                                onHide={onHide}
                                beginInteraction={beginInteraction}
                                hasAiLog={aiProcessLog.length > 0}
                                isLogVisible={isLogVisible}
                                setIsLogVisible={setIsLogVisible}
                                loadedPreset={loadedPreset}
                                setLoadedPreset={setLoadedPreset}
                                onPresetFileLoad={handlePresetFile}
                                onGenerateFromPreset={handleGenerateFromPreset}
                                selectedLayersForPreset={selectedLayers}
                                onResizeSelectedLayers={handleResizeSelectedLayers}
                                activeCanvasTool={activeCanvasTool}
                                shapeFillColor={shapeFillColor}
                                setShapeFillColor={setShapeFillColor}
                            />
                            <LayerComposerCanvas
                                canvasViewRef={canvasViewRef}
                                layers={layers}
                                canvasSettings={canvasSettings}
                                isInfiniteCanvas={isInfiniteCanvas}
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
                                canUndo={canUndo}
                                canRedo={canRedo}
                                handleUndo={handleUndo}
                                handleRedo={handleRedo}
                                onUpdateLayers={updateMultipleLayers}
                                beginInteraction={beginInteraction}
                                duplicateLayer={(id) => duplicateSelectedLayers().find(l => l.id === id)!}
                                exportSelectedLayer={handleExportSelectedLayers}
                                deleteLayer={deleteSelectedLayers}
                                setSelectedLayerIds={setSelectedLayerIds}
                                onFilesDrop={(files) => handleFilesDrop(files)}
                                onMultiLayerAction={handleMultiLayerAction}
                                onDuplicateForDrag={handleDuplicateForDrag}
                                handleMergeLayers={handleMergeLayers}
                                openImageEditor={openImageEditor}
                                deleteSelectedLayers={deleteSelectedLayers}
                                duplicateSelectedLayers={duplicateSelectedLayers}
                                handleExportSelectedLayers={handleExportSelectedLayers}
                                handleBakeSelectedLayer={handleBakeSelectedLayer}
                                captureLayer={captureLayer}
                                addLayer={addLayer}
                                shapeFillColor={shapeFillColor}
                            />
                        </>
                    )}
                </motion.div>
                 <AnimatePresence>
                    {isOpen && isLogVisible && aiProcessLog.length > 0 && (
                        <AIProcessLogger log={aiProcessLog} onClose={() => setIsLogVisible(false)} t={t} />
                    )}
                </AnimatePresence>
            </motion.div>
            
            <GalleryPicker
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                onSelect={handleAddImage}
                images={sessionGalleryImages}
            />
             <WebcamCaptureModal
                isOpen={isWebcamOpen}
                onClose={() => setIsWebcamOpen(false)}
                onCapture={handleAddImage}
            />
            <AnimatePresence>
                 {isOpen && isConfirmingClose && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="modal-overlay z-[80]"
                        aria-modal="true" role="dialog"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="modal-content !max-w-md"
                        >
                            <h3 className="base-font font-bold text-2xl text-yellow-400">{t('confirmClose_title')}</h3>
                            <p className="text-neutral-300 my-2">{t('confirmClose_message')}</p>
                            <div className="flex justify-end items-center gap-4 mt-4">
                                <button onClick={() => setIsConfirmingClose(false)} className="btn btn-secondary btn-sm">{t('confirmClose_stay')}</button>
                                <button onClick={() => { handleCloseAndReset(); setIsConfirmingClose(false); }} className="btn btn-primary btn-sm">{t('confirmClose_close')}</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    , document.body);
};