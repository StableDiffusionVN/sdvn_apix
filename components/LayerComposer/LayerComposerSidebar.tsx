/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls, Switch, type GenerationHistoryEntry, getInitialStateForApp } from '../uiUtils';
import { type Layer, type CanvasSettings, type CanvasTool, type AIPreset } from './LayerComposer.types';
import { LayerList } from './LayerList';
import { TextLayerControls } from './TextLayerControls';
import { LayerPropertiesControls } from './LayerPropertiesControls';
import { cn } from '../../lib/utils';
import { AccordionArrowIcon, AddTextIcon, AddIcon, InfoIcon, ChatIcon, NewFileIcon } from '../icons';

interface PresetControlsProps {
    loadedPreset: any | null;
    setLoadedPreset: React.Dispatch<React.SetStateAction<any | null>>;
    onPresetFileLoad: (file: File) => void;
    onGenerateFromPreset: () => void;
    runningJobCount: number;
    selectedLayersForPreset: Layer[];
    t: (key: string, ...args: any[]) => any;
    isSimpleImageMode: boolean;
    setIsSimpleImageMode: (isSimple: boolean) => void;
    onCancelGeneration: () => void;
    hasAiLog: boolean;
    isLogVisible: boolean;
    setIsLogVisible: React.Dispatch<React.SetStateAction<boolean>>;
    generationHistory: GenerationHistoryEntry[];
}

interface LayerComposerSidebarProps {
    layers: Layer[];
    canvasSettings: CanvasSettings;
    isInfiniteCanvas: boolean;
    setIsInfiniteCanvas: (isInfinite: boolean) => void;
    selectedLayerId: string | null;
    selectedLayerIds: string[];
    selectedLayers: Layer[];
    runningJobCount: number;
    error: string | null;
    aiPrompt: string;
    setAiPrompt: (prompt: string) => void;
    presets: AIPreset[];
    aiPreset: string;
    setAiPreset: (preset: string) => void;
    isSimpleImageMode: boolean;
    setIsSimpleImageMode: (isSimple: boolean) => void;
    onGenerateAILayer: () => void;
    onCancelGeneration: () => void;
    onLayersReorder: (reorderedLayers: Layer[]) => void;
    onLayerUpdate: (id: string, newProps: Partial<Layer>, isFinalChange: boolean) => void;
    onLayerDelete: (id: string) => void;
    onLayerSelect: (id: string) => void;
    onCanvasSettingsChange: React.Dispatch<React.SetStateAction<CanvasSettings>>;
    onAddImage: () => void;
    onAddText: () => void;
    onSave: () => void;
    onClose: () => void;
    onHide: () => void;
    onNew: () => void;
    beginInteraction: () => void;
    hasAiLog: boolean;
    isLogVisible: boolean;
    setIsLogVisible: React.Dispatch<React.SetStateAction<boolean>>;
    loadedPreset: any | null;
    setLoadedPreset: React.Dispatch<React.SetStateAction<any | null>>;
    onPresetFileLoad: (file: File) => void;
    onGenerateFromPreset: () => void;
    selectedLayersForPreset: Layer[];
    onResizeSelectedLayers: (dimension: 'width' | 'height', newValue: number) => void;
    activeCanvasTool: CanvasTool;
    shapeFillColor: string;
    setShapeFillColor: (color: string) => void;
    generationHistory: GenerationHistoryEntry[];
    onOpenChatbot: () => void;
    aiNumberOfImages: number;
    setAiNumberOfImages: (num: number) => void;
    aiAspectRatio: string;
    setAiAspectRatio: (ratio: string) => void;
}

const AccordionHeader: React.FC<{ title: string; isOpen: boolean; onClick: () => void; children?: React.ReactNode; rightContent?: React.ReactNode; }> = ({ title, isOpen, onClick, rightContent }) => {
    return (
        <button onClick={onClick} className="w-full flex justify-between items-center p-3 bg-neutral-800 hover:bg-neutral-700/80 transition-colors rounded-t-lg" aria-expanded={isOpen}>
            <h4 className="font-semibold text-neutral-200">{title}</h4>
            <div className="flex items-center gap-2">
                {rightContent}
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                    <AccordionArrowIcon className="h-5 w-5" />
                </motion.div>
            </div>
        </button>
    );
};

const PresetControls: React.FC<PresetControlsProps> = ({
    loadedPreset, setLoadedPreset, onPresetFileLoad, onGenerateFromPreset, runningJobCount, selectedLayersForPreset, t, isSimpleImageMode, setIsSimpleImageMode,
    onCancelGeneration, hasAiLog, isLogVisible, setIsLogVisible, generationHistory
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [showHistoryPicker, setShowHistoryPicker] = useState(false);
    const [showSamplePicker, setShowSamplePicker] = useState(false);
    const { settings } = useAppControls();
    const isGenerating = runningJobCount > 0;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onPresetFileLoad(e.target.files[0]);
        }
    };
    
    const handleOptionChange = (key: string, value: string | boolean | number) => {
        setLoadedPreset(prev => {
            if (!prev) return null;
            const newPreset = JSON.parse(JSON.stringify(prev)); // Deep copy
            newPreset.state.options[key] = value;
            return newPreset;
        });
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
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
            onPresetFileLoad(e.dataTransfer.files[0]);
        }
    };

    if (showHistoryPicker) {
        return (
            <div className="p-3">
                <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold text-neutral-300">{t('layerComposer_preset_historyTitle')}</h5>
                    <button onClick={() => setShowHistoryPicker(false)} className="text-xs text-neutral-400 hover:text-white">{t('layerComposer_preset_historyBack')}</button>
                </div>
                {generationHistory.length > 0 ? (
                    <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {generationHistory.map(entry => (
                            <li
                                key={entry.id}
                                onClick={() => {
                                    setLoadedPreset(entry.settings);
                                    setShowHistoryPicker(false);
                                }}
                                className="flex items-start gap-3 p-2 bg-neutral-900/50 rounded-lg cursor-pointer hover:bg-neutral-700/80 transition-colors"
                            >
                                <img src={entry.thumbnailUrl} alt={`History thumbnail for ${entry.appName}`} className="w-12 h-12 object-cover rounded-md flex-shrink-0 bg-neutral-700" />
                                <div className="flex-grow min-w-0">
                                    <p className="font-bold text-sm text-yellow-400 truncate">{entry.appName}</p>
                                    <p className="text-xs text-neutral-400">{new Date(entry.timestamp).toLocaleString()}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-neutral-500 text-center py-4">{t('historyPanel_empty')}</p>
                )}
            </div>
        );
    }

    if (showSamplePicker) {
        const sampleApps = settings?.apps.filter((app: any) => app.supportsCanvasPreset) || [];
        return (
            <div className="p-3">
                <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold text-neutral-300">{t('layerComposer_preset_sampleTitle')}</h5>
                    <button onClick={() => setShowSamplePicker(false)} className="text-xs text-neutral-400 hover:text-white">{t('layerComposer_preset_historyBack')}</button>
                </div>
                {sampleApps.length > 0 ? (
                    <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {sampleApps.map((app: any) => (
                            <li
                                key={app.id}
                                onClick={() => {
                                    const initialState = getInitialStateForApp(app.id);
                                    setLoadedPreset({ viewId: app.id, state: initialState });
                                    setShowSamplePicker(false);
                                }}
                                className="flex items-center gap-3 p-2 bg-neutral-900/50 rounded-lg cursor-pointer hover:bg-neutral-700/80 transition-colors"
                            >
                                <span className="text-2xl">{app.icon}</span>
                                <div className="flex-grow min-w-0">
                                    <p className="font-bold text-sm text-yellow-400 truncate">{t(app.titleKey)}</p>
                                    <p className="text-xs text-neutral-400 line-clamp-2">{t(app.descriptionKey)}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-neutral-500 text-center py-4">{t('layerComposer_preset_noSamples')}</p>
                )}
            </div>
        );
    }

    const imageInputMap: Record<string, string[]> = {
        'architecture-ideator': ['Ảnh phác thảo', 'Ảnh tham chiếu style'],
        'avatar-creator': ['Ảnh chân dung'],
        'baby-photo-creator': ['Ảnh của bé'],
        'mid-autumn-creator': ['Ảnh gốc'],
        'dress-the-model': ['Ảnh người mẫu', 'Ảnh trang phục'],
        'photo-restoration': ['Ảnh cũ'],
        'image-to-real': ['Ảnh gốc'],
        'swap-style': ['Ảnh nội dung', 'Ảnh tham chiếu style'],
        'mix-style': ['Ảnh nội dung', 'Ảnh phong cách'],
        'toy-model-creator': ['Ảnh gốc'],
        'free-generation': ['Ảnh 1', 'Ảnh 2', 'Ảnh 3', 'Ảnh 4'],
        'image-interpolation': ['Ảnh Tham chiếu']
    };
    
    const imageKeyMap: Record<string, string[]> = {
        'architecture-ideator': ['uploadedImage', 'styleReferenceImage'],
        'avatar-creator': ['uploadedImage'],
        'baby-photo-creator': ['uploadedImage'],
        'mid-autumn-creator': ['uploadedImage'],
        'dress-the-model': ['modelImage', 'clothingImage'],
        'photo-restoration': ['uploadedImage'],
        'image-to-real': ['uploadedImage'],
        'swap-style': ['contentImage', 'styleImage'],
        'mix-style': ['contentImage', 'styleImage'],
        'toy-model-creator': ['uploadedImage'],
        'free-generation': ['image1', 'image2', 'image3', 'image4'],
        'image-interpolation': ['referenceImage']
    };

    const imageKeys = loadedPreset ? imageKeyMap[loadedPreset.viewId] || [] : [];
    const requiredImages = loadedPreset ? imageInputMap[loadedPreset.viewId] || [] : [];
    
    if (!loadedPreset) {
        return (
            <div
                className={cn(
                    "p-3 border-2 border-transparent rounded-lg transition-colors",
                    isDraggingOver && "border-dashed border-yellow-400 bg-neutral-700/50"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json,.png" className="hidden" />
                 <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-sm flex-1">
                            {t('layerComposer_preset_uploadButton')}
                        </button>
                        <button 
                            onClick={() => setShowHistoryPicker(true)} 
                            className="btn btn-secondary btn-sm flex-1" 
                            disabled={generationHistory.length === 0}
                        >
                            {t('layerComposer_preset_loadHistory')}
                        </button>
                    </div>
                    <button onClick={() => setShowSamplePicker(true)} className="btn btn-secondary btn-sm w-full">
                        {t('layerComposer_preset_sampleButton')}
                    </button>
                </div>
                <p className="text-xs text-neutral-500 text-center mt-2">
                    {t('layerComposer_preset_upload_tip')}
                </p>
            </div>
        );
    }
    
    return (
        <div className="p-3 space-y-3">
            <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-yellow-400">Preset: {t(`app_${loadedPreset.viewId}_title`)}</p>
                <button onClick={() => setLoadedPreset(null)} className="text-xs text-neutral-400 hover:text-white">Xóa</button>
            </div>
            
            <div className="space-y-2">
                 {isSimpleImageMode ? (
                    // Multi-Input Mode UI
                    requiredImages.map((label, index) => {
                        const assignedLayer = selectedLayersForPreset[index];
                        const imageKey = imageKeys[index];
                        const presetImage = loadedPreset?.state?.[imageKey];
                        const imageUrl = assignedLayer?.url || presetImage;
                
                        return (
                            <div key={index} className="text-sm bg-neutral-900/50 p-2 rounded-md flex items-center gap-3">
                                {imageUrl ? (
                                    <img src={imageUrl} alt={label} className="w-10 h-10 object-cover rounded-sm flex-shrink-0 bg-neutral-700" />
                                ) : (
                                    <div className="w-10 h-10 flex-shrink-0 bg-neutral-700 rounded-sm flex items-center justify-center text-neutral-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                                <div className="flex-grow min-w-0">
                                    <span className="font-semibold text-neutral-300 block">{label}</span>
                                    {assignedLayer ? (
                                        <span className="text-green-400 text-xs truncate block">
                                            Đã gán: {assignedLayer.text || `Layer #${assignedLayer.id.substring(0,4)}`}
                                        </span>
                                    ) : presetImage ? (
                                        <span className="text-yellow-400 text-xs truncate block">Sử dụng ảnh từ preset</span>
                                    ) : (
                                        <span className="text-neutral-500 text-xs truncate block">Không bắt buộc / Trống</span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    // Batch Mode UI
                    <>
                        <div className="text-sm bg-neutral-900/50 p-3 rounded-md">
                            <p className="font-semibold text-green-400">Chế độ Tạo Hàng Loạt</p>
                            <p className="text-xs text-neutral-400 mt-1">
                                {selectedLayersForPreset.length > 0
                                    ? `Đã chọn ${selectedLayersForPreset.length} layer. Mỗi layer sẽ được xử lý riêng biệt qua preset này.`
                                    : "Chọn một hoặc nhiều layer để tạo hàng loạt."
                                }
                            </p>
                        </div>
                        {requiredImages.map((label, index) => {
                            const imageKey = imageKeys[index];
                            const presetImage = loadedPreset?.state?.[imageKey];
                            const isPrimaryInput = index === 0;
                            const imageUrl = isPrimaryInput ? (selectedLayersForPreset[0]?.url || presetImage) : presetImage;

                            return (
                                <div key={index} className="text-sm bg-neutral-900/50 p-2 rounded-md flex items-center gap-3">
                                    {imageUrl ? (
                                        <img src={imageUrl} alt={label} className="w-10 h-10 object-cover rounded-sm flex-shrink-0 bg-neutral-700" />
                                    ) : (
                                        <div className="w-10 h-10 flex-shrink-0 bg-neutral-700 rounded-sm flex items-center justify-center text-neutral-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="flex-grow min-w-0">
                                        <span className="font-semibold text-neutral-300 block">{label}</span>
                                        {isPrimaryInput ? (
                                            <span className="text-green-400 text-xs truncate block">
                                                {selectedLayersForPreset.length > 0
                                                    ? `Sẽ lần lượt sử dụng ${selectedLayersForPreset.length} layer đã chọn`
                                                    : "Sử dụng layer được chọn"
                                                }
                                            </span>
                                        ) : presetImage ? (
                                            <span className="text-yellow-400 text-xs truncate block">Sử dụng ảnh từ preset</span>
                                        ) : (
                                            <span className="text-neutral-500 text-xs truncate block">Trống (Không sử dụng)</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {Object.entries(loadedPreset.state.options).map(([key, value]) => {
                    if (typeof value === 'boolean') {
                        return (
                            <div key={key} className="flex items-center justify-between text-sm">
                                <label htmlFor={`preset-${key}`} className="font-medium text-neutral-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                                <Switch
                                    id={`preset-${key}`}
                                    checked={!!value}
                                    onChange={(checked) => handleOptionChange(key, checked)}
                                    disabled={isGenerating}
                                />
                            </div>
                        );
                    }
                    if (typeof value === 'string') {
                        const isLongString = value.includes('\n') || value.length > 50;
                        return (
                             <div key={key}>
                                <label htmlFor={`preset-${key}`} className="block text-sm font-medium text-neutral-300 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                                <textarea
                                    id={`preset-${key}`}
                                    value={value}
                                    onChange={(e) => handleOptionChange(key, e.target.value)}
                                    className="form-input !p-1.5 !text-sm resize-y"
                                    rows={isLongString ? 3 : 1}
                                    disabled={isGenerating}
                                />
                            </div>
                        )
                    }
                     if (typeof value === 'number') {
                        return (
                             <div key={key}>
                                <label htmlFor={`preset-${key}`} className="block text-sm font-medium text-neutral-300 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                                <input
                                    id={`preset-${key}`}
                                    type="number"
                                    value={String(value)}
                                    onChange={(e) => handleOptionChange(key, e.target.value)}
                                    className="form-input !p-1.5 !text-sm"
                                    disabled={isGenerating}
                                />
                            </div>
                        )
                    }
                    return null;
                })}
            </div>

            <div className="pt-3 border-t border-neutral-700/50">
                <div className="flex items-center justify-center gap-3 mb-3">
                    <span className={cn( "text-sm font-bold transition-colors", !isSimpleImageMode ? "text-yellow-400" : "text-neutral-500" )}>
                        {t('layerComposer_ai_batchMode')}
                    </span>
                    <Switch
                        id="preset-simple-image-mode"
                        checked={isSimpleImageMode}
                        onChange={setIsSimpleImageMode}
                        disabled={isGenerating}
                    />
                    <span className={cn( "text-sm font-bold transition-colors", isSimpleImageMode ? "text-yellow-400" : "text-neutral-500" )}>
                        {t('layerComposer_ai_multiInputMode')}
                    </span>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        {hasAiLog && (
                            <button
                                onClick={() => setIsLogVisible(v => !v)}
                                className="btn btn-secondary btn-sm flex-grow"
                            >
                                {isLogVisible ? t('layerComposer_ai_hideLog') : t('layerComposer_ai_showLog')}
                            </button>
                        )}
                        {isGenerating && (
                             <button
                                onClick={onCancelGeneration}
                                className="btn btn-secondary btn-sm !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white flex-grow"
                            >
                                {t('layerComposer_ai_cancel')}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onGenerateFromPreset}
                        className="btn btn-primary btn-sm w-full"
                        disabled={!loadedPreset}
                    >
                        {isGenerating ? t('layerComposer_preset_generating_count', runningJobCount) : t('layerComposer_preset_generateButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const LayerComposerSidebar: React.FC<LayerComposerSidebarProps> = (props) => {
    const {
        layers, canvasSettings, isInfiniteCanvas, setIsInfiniteCanvas, selectedLayerId, selectedLayerIds, selectedLayers, runningJobCount, error, aiPrompt, setAiPrompt, onGenerateAILayer,
        onCancelGeneration, onLayersReorder, onLayerUpdate, onLayerDelete, onLayerSelect, onCanvasSettingsChange, onAddImage, onAddText, onSave, onClose, onHide, onNew,
        beginInteraction,
        presets,
        isSimpleImageMode, setIsSimpleImageMode, aiPreset, setAiPreset,
        hasAiLog, isLogVisible, setIsLogVisible,
        loadedPreset, setLoadedPreset, onPresetFileLoad, onGenerateFromPreset, selectedLayersForPreset,
        onResizeSelectedLayers,
        activeCanvasTool, shapeFillColor, setShapeFillColor, generationHistory,
        onOpenChatbot,
        aiNumberOfImages, setAiNumberOfImages, aiAspectRatio, setAiAspectRatio
    } = props;
    const { t, language } = useAppControls();
    const [openSection, setOpenSection] = useState<'ai' | 'preset' | 'canvas' | 'layers' | null>('ai');
    const [activeTab, setActiveTab] = useState<'properties' | 'text'>('properties');
    const selectedLayer = selectedLayers[0];
    const isGenerating = runningJobCount > 0;
    const hasImageInput = selectedLayers.length > 0;
    const ASPECT_RATIO_OPTIONS: string[] = t('aspectRatioOptions');

    const getLayerName = (layer: Layer) => {
        switch(layer.type) {
            case 'image': return 'Image Layer';
            case 'text': return layer.text || 'Text Layer';
            case 'shape': return `${layer.shapeType === 'rectangle' ? 'Rectangle' : 'Ellipse'} Shape`;
            default: return 'Layer';
        }
    };

    useEffect(() => {
        if (selectedLayer) {
            setActiveTab(selectedLayer.type === 'text' ? 'text' : 'properties');
        }
    }, [selectedLayer?.id, selectedLayer?.type]);

    const toggleSection = (section: 'ai' | 'preset' |'canvas' | 'layers') => { setOpenSection(prev => prev === section ? null : section); };

    return (
        <aside className="w-1/3 max-w-sm flex flex-col bg-neutral-900/50 p-6 border-r border-white/10">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h3 className="base-font font-bold text-2xl text-yellow-400">{t('layerComposer_title')}</h3>
                <button onClick={onHide} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Đóng">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <div className="flex-grow overflow-y-auto space-y-2 pr-2 -mr-4">
                <AnimatePresence>
                    {(activeCanvasTool === 'rectangle' || activeCanvasTool === 'ellipse') && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border border-neutral-700 rounded-lg">
                            <div className="p-3 bg-neutral-800/50 space-y-2">
                                <h4 className="font-semibold text-neutral-200">Shape Tool Options</h4>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="shape-color" className="text-sm font-medium text-neutral-300">Fill Color</label>
                                    <div className="relative h-6 w-6 rounded-full border-2 border-white/20 shadow-inner">
                                        <input id="shape-color" type="color" value={shapeFillColor} onChange={(e) => setShapeFillColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <div className="w-full h-full rounded-full pointer-events-none" style={{ backgroundColor: shapeFillColor }}></div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="border border-neutral-700 rounded-lg overflow-hidden flex-shrink-0 mb-2">
                    <AccordionHeader title={t('layerComposer_aiGeneration')} isOpen={openSection === 'ai'} onClick={() => toggleSection('ai')} />
                    <AnimatePresence>
                        {openSection === 'ai' && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-neutral-800/50">
                                <div className="p-3 space-y-3">
                                    
                                    {selectedLayers.length === 0 ? (
                                        <p className="text-xs text-neutral-400 text-center">{t('layerComposer_ai_note_canvas')}</p>
                                    ) : isSimpleImageMode ? (
                                        // Multi-Input Mode UI
                                        <div className="space-y-2">
                                            {selectedLayers.map((layer, index) => (
                                                <div key={layer.id} className="text-sm bg-neutral-900/50 p-2 rounded-md flex items-center gap-3">
                                                    {layer.type === 'image' && layer.url ? (
                                                        <img src={layer.url} alt={`Input ${index + 1}`} className="w-10 h-10 object-cover rounded-sm flex-shrink-0 bg-neutral-700" />
                                                    ) : (
                                                        <div className="w-10 h-10 flex-shrink-0 bg-neutral-700 rounded-sm flex items-center justify-center text-neutral-300 font-bold" style={{ fontFamily: 'Asimovian', fontSize: '1.5rem', color: layer.color || '#FFFFFF' }}>
                                                            {layer.type === 'text' ? 'T' : 'S'}
                                                        </div>
                                                    )}
                                                    <div className="flex-grow min-w-0">
                                                        <span className="font-semibold text-neutral-300 block">Input {index + 1}</span>
                                                        <span className="text-green-400 text-xs truncate block">
                                                            {getLayerName(layer)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        // Batch Mode UI
                                        <div className="text-sm bg-neutral-900/50 p-3 rounded-md">
                                            <p className="font-semibold text-green-400">{t('layerComposer_ai_batchMode')}</p>
                                            <p className="text-xs text-neutral-400 mt-1">
                                                {t('layerComposer_ai_batchMode_desc_count', selectedLayers.length)}
                                            </p>
                                        </div>
                                    )}
                                    
                                    <div>
                                        <label htmlFor="ai-preset-select" className="block text-sm font-medium text-neutral-300 mb-1">{t('layerComposer_ai_preset')}</label>
                                        <select
                                            id="ai-preset-select"
                                            value={aiPreset}
                                            onChange={(e) => setAiPreset(e.target.value)}
                                            className="form-input !p-2 !text-sm w-full"
                                        >
                                            {presets.map(preset => (
                                                <option key={preset.id} value={preset.id} title={preset.description[language as keyof typeof preset.description]}>
                                                    {preset.name[language as keyof typeof preset.name]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <textarea 
                                        value={aiPrompt} 
                                        onChange={e => setAiPrompt(e.target.value)} 
                                        placeholder={t('layerComposer_ai_promptPlaceholder')} 
                                        className="form-input !p-2 !text-sm !h-24" 
                                        rows={4}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                e.preventDefault();
                                                if (!isGenerating && (aiPreset !== 'default' || aiPrompt.trim())) {
                                                    onGenerateAILayer();
                                                }
                                            }
                                        }}
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="ai-num-images" className="block text-sm font-medium text-neutral-300 mb-1">
                                                {t('freeGeneration_numImagesLabel')}
                                            </label>
                                            <select
                                                id="ai-num-images"
                                                value={aiNumberOfImages}
                                                onChange={(e) => setAiNumberOfImages(Number(e.target.value))}
                                                className="form-input !p-2 !text-sm w-full"
                                            >
                                                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="ai-aspect-ratio" className="block text-sm font-medium text-neutral-300 mb-1">
                                                {t('common_aspectRatio')}
                                            </label>
                                            <select
                                                id="ai-aspect-ratio"
                                                value={aiAspectRatio}
                                                onChange={(e) => setAiAspectRatio(e.target.value)}
                                                className="form-input !p-2 !text-sm w-full"
                                            >
                                                {ASPECT_RATIO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-3 border-t border-neutral-700/50">
                                        <div className="flex items-center justify-center gap-3">
                                            <span className={cn( "text-sm font-bold transition-colors", !isSimpleImageMode ? "text-yellow-400" : "text-neutral-500" )}>
                                                {t('layerComposer_ai_batchMode')}
                                            </span>
                                            <Switch
                                                id="simple-image-mode"
                                                checked={isSimpleImageMode}
                                                onChange={setIsSimpleImageMode}
                                                disabled={isGenerating}
                                            />
                                            <span className={cn( "text-sm font-bold transition-colors", isSimpleImageMode ? "text-yellow-400" : "text-neutral-500" )}>
                                                {t('layerComposer_ai_multiInputMode')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-neutral-500 text-center mt-2">
                                            {isSimpleImageMode ? t('layerComposer_ai_multiInputMode_desc') : t('layerComposer_ai_batchMode_desc')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={onOpenChatbot}
                                            className="btn btn-secondary btn-sm flex-grow flex items-center justify-center gap-2"
                                            title={t('layerComposer_chatbot_title')}
                                        >
                                            <ChatIcon className="h-4 w-4" />
                                            Trợ lý
                                        </button>
                                        <button 
                                            onClick={onGenerateAILayer} 
                                            className="btn btn-primary btn-sm flex-grow" 
                                            disabled={isGenerating || (aiPreset === 'default' && !aiPrompt.trim())}
                                            title={t('layerComposer_ai_generate_tooltip')}
                                        >
                                            {isGenerating ? t('layerComposer_ai_generating_count', runningJobCount) : t('layerComposer_ai_generate')}
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            {hasAiLog && (
                                                <button
                                                    onClick={() => setIsLogVisible(v => !v)}
                                                    className="btn btn-secondary btn-sm flex-grow"
                                                >
                                                    {isLogVisible ? t('layerComposer_ai_hideLog') : t('layerComposer_ai_showLog')}
                                                </button>
                                            )}
                                            {isGenerating && (
                                                 <button
                                                    onClick={onCancelGeneration}
                                                    className="btn btn-secondary btn-sm !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white flex-grow"
                                                >
                                                    {t('layerComposer_ai_cancel')}
                                                </button>
                                            )}
                                        </div>
                                        
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <div className="border border-neutral-700 rounded-lg overflow-hidden flex-shrink-0 mb-2">
                    <AccordionHeader title={t('layerComposer_preset_title')} isOpen={openSection === 'preset'} onClick={() => toggleSection('preset')} />
                     <AnimatePresence>
                        {openSection === 'preset' && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-neutral-800/50">
                               <PresetControls
                                    loadedPreset={loadedPreset}
                                    setLoadedPreset={setLoadedPreset}
                                    onPresetFileLoad={onPresetFileLoad}
                                    onGenerateFromPreset={onGenerateFromPreset}
                                    runningJobCount={runningJobCount}
                                    selectedLayersForPreset={selectedLayersForPreset}
                                    t={t}
                                    isSimpleImageMode={isSimpleImageMode}
                                    setIsSimpleImageMode={setIsSimpleImageMode}
                                    onCancelGeneration={onCancelGeneration}
                                    hasAiLog={hasAiLog}
                                    isLogVisible={isLogVisible}
                                    setIsLogVisible={setIsLogVisible}
                                    generationHistory={generationHistory}
                               />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <div className="border border-neutral-700 rounded-lg overflow-hidden">
                    <AccordionHeader title={t('layerComposer_canvasSettings')} isOpen={openSection === 'canvas'} onClick={() => toggleSection('canvas')} />
                     <AnimatePresence> {openSection === 'canvas' && ( <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-neutral-800/50"> <div className="p-3 space-y-4"> <div className={cn("grid grid-cols-3 gap-3 text-sm items-end transition-opacity", isInfiniteCanvas && "opacity-50 pointer-events-none")}> <div><label htmlFor="canvas-w">{t('layerComposer_width')}</label><input id="canvas-w" type="number" value={canvasSettings.width} onChange={e => onCanvasSettingsChange(s => ({...s, width: Number(e.target.value)}))} className="form-input !p-1.5 !text-sm" disabled={isInfiniteCanvas}/></div> <div><label htmlFor="canvas-h">{t('layerComposer_height')}</label><input id="canvas-h" type="number" value={canvasSettings.height} onChange={e => onCanvasSettingsChange(s => ({...s, height: Number(e.target.value)}))} className="form-input !p-1.5 !text-sm" disabled={isInfiniteCanvas}/></div> <div className="flex justify-center items-center h-full pb-1"> <div className="relative w-8 h-8" title={t('layerComposer_background')}> <input id="canvas-bg" type="color" value={canvasSettings.background} onChange={e => onCanvasSettingsChange(s => ({...s, background: e.target.value}))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isInfiniteCanvas}/> <div className="w-full h-full rounded-full border-2 border-white/20 shadow-inner pointer-events-none" style={{ backgroundColor: canvasSettings.background }} /> </div> </div> </div> <div className="flex items-center justify-between mt-2"> <label htmlFor="infinite-canvas-toggle" className="text-sm font-medium text-neutral-200">{t('layerComposer_infiniteCanvas')}</label> <Switch id="infinite-canvas-toggle" checked={isInfiniteCanvas} onChange={setIsInfiniteCanvas} /> </div>
                        <div className="space-y-3 pt-3 border-t border-neutral-700/50">
                            <div className="flex items-center justify-between">
                                <label htmlFor="smart-guides-toggle" className="text-sm font-medium text-neutral-200">Smart Guides</label>
                                <Switch id="smart-guides-toggle" checked={canvasSettings.guides.enabled} onChange={v => onCanvasSettingsChange(s => ({...s, guides: {...s.guides, enabled: v}}))} />
                            </div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="show-grid-toggle" className="text-sm font-medium text-neutral-200">Hiển thị Lưới</label>
                                <Switch id="show-grid-toggle" checked={canvasSettings.grid.visible} onChange={v => onCanvasSettingsChange(s => ({...s, grid: {...s.grid, visible: v}}))} />
                            </div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="snap-grid-toggle" className="text-sm font-medium text-neutral-200">Bắt dính vào Lưới</label>
                                <Switch id="snap-grid-toggle" checked={canvasSettings.grid.snap} onChange={v => onCanvasSettingsChange(s => ({...s, grid: {...s.grid, snap: v}}))} />
                            </div>
                        </div>
                     </div> </motion.div> )} </AnimatePresence>
                </div>
                <div className="border border-neutral-700 rounded-lg overflow-hidden">
                     <AccordionHeader title={t('layerComposer_layers')} isOpen={openSection === 'layers'} onClick={() => toggleSection('layers')} rightContent={ <> <button onClick={(e) => { e.stopPropagation(); onAddText(); }} className="p-1.5 rounded-md bg-white/10 text-neutral-300 hover:bg-white/20 transition-colors" aria-label={t('layerComposer_addText')} title={t('layerComposer_addText')} > <AddTextIcon className="h-4 w-4" /> </button> <button onClick={(e) => { e.stopPropagation(); onAddImage(); }} className="p-1.5 rounded-md bg-white/10 text-neutral-300 hover:bg-white/20 transition-colors" aria-label={t('layerComposer_addImage')} title={t('layerComposer_addImage')} > <AddIcon className="h-4 w-4" strokeWidth={2.5} /> </button> </> } />
                     <AnimatePresence> {openSection === 'layers' && ( <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-neutral-800/50"> <div className="p-3"> <LayerList layers={layers} selectedLayerId={selectedLayerId} onLayersReorder={onLayersReorder} onLayerUpdate={onLayerUpdate} onLayerDelete={onLayerDelete} onLayerSelect={onLayerSelect} beginInteraction={beginInteraction} /> </div> </motion.div> )} </AnimatePresence>
                </div>
                 {selectedLayers.length > 0 && ( <div className="mt-2 border border-neutral-700 rounded-lg"> <div className="flex border-b border-neutral-700 bg-neutral-800 rounded-t-lg"> <button onClick={() => setActiveTab('properties')} className={cn('flex-1 py-2 text-sm font-bold transition-colors', activeTab === 'properties' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-neutral-700/50' : 'text-neutral-400 hover:text-white')} > {t('layerComposer_tab_properties')} </button> {selectedLayer?.type === 'text' && ( <button onClick={() => setActiveTab('text')} className={cn('flex-1 py-2 text-sm font-bold transition-colors', activeTab === 'text' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-neutral-700/50' : 'text-neutral-400 hover:text-white')} > {t('layerComposer_tab_text')} </button> )} </div> <div className="bg-neutral-800/50"> <AnimatePresence mode="wait"> <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} > {activeTab === 'properties' && ( <LayerPropertiesControls selectedLayers={selectedLayers} onUpdate={onLayerUpdate} beginInteraction={beginInteraction} onResize={onResizeSelectedLayers} /> )} {activeTab === 'text' && selectedLayer?.type === 'text' && ( <TextLayerControls layer={selectedLayer} onUpdate={onLayerUpdate} beginInteraction={beginInteraction} /> )} </motion.div> </AnimatePresence> </div> </div> )}
            </div>
            
            <div className="flex-shrink-0 pt-6 border-t border-white/10">
                {error && <p className="text-red-400 text-center text-sm mb-2">{error}</p>}
                <div className="flex items-center gap-2">
                    <button onClick={onNew} className="btn btn-secondary btn-sm p-2.5" title="New Canvas">
                        <NewFileIcon className="h-5 w-5" />
                    </button>
                    <button onClick={onClose} className="btn btn-secondary btn-sm flex-grow"> {t('common_cancel')} </button>
                    <button onClick={onSave} className="btn btn-primary btn-sm flex-grow" disabled={(layers.length === 0 && !isInfiniteCanvas) || isGenerating} title={isInfiniteCanvas ? t('layerComposer_exportJsonTooltip') : t('layerComposer_saveTooltip')} > {isGenerating ? t('layerComposer_saving') : (isInfiniteCanvas ? t('layerComposer_exportJson') : t('layerComposer_save'))} </button>
                </div>
            </div>
        </aside>
    );
};