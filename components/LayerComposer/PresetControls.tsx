/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef } from 'react';
import { cn } from '../../lib/utils';
import { Switch, type GenerationHistoryEntry } from '../uiUtils';
import { type Layer } from './LayerComposer.types';

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

export const PresetControls: React.FC<PresetControlsProps> = ({
    loadedPreset, setLoadedPreset, onPresetFileLoad, onGenerateFromPreset, runningJobCount, selectedLayersForPreset, t, isSimpleImageMode, setIsSimpleImageMode,
    onCancelGeneration, hasAiLog, isLogVisible, setIsLogVisible, generationHistory
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [showHistoryPicker, setShowHistoryPicker] = useState(false);
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

            {requiredImages.map((label, index) => (
                <div key={index} className="text-sm bg-neutral-900/50 p-2 rounded-md">
                    <span className="font-semibold text-neutral-300">{label}: </span>
                    {selectedLayersForPreset[index] ? (
                        <span className="text-green-400">Đã gán Layer "{selectedLayersForPreset[index].text || `Image ID ${selectedLayersForPreset[index].id.substring(0,4)}`}"</span>
                    ) : (
                        <span className="text-yellow-400">Sẽ dùng ảnh từ preset</span>
                    )}
                </div>
            ))}
            
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
                    if (typeof value === 'string' || typeof value === 'number') {
                        return (
                             <div key={key}>
                                <label htmlFor={`preset-${key}`} className="block text-sm font-medium text-neutral-300 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                                <input
                                    id={`preset-${key}`}
                                    type={typeof value === 'number' ? 'number' : 'text'}
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
