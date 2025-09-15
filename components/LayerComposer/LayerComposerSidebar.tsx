/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls } from '../uiUtils';
import { type Layer, type CanvasSettings } from './LayerComposer.types';
import { LayerList } from './LayerList';
import { TextLayerControls } from './TextLayerControls';
import { LayerPropertiesControls } from './LayerPropertiesControls';
import { cn } from '../../lib/utils';
import { AccordionArrowIcon, AddTextIcon, AddIcon, InfoIcon } from '../icons';

interface LayerComposerSidebarProps {
    layers: Layer[];
    canvasSettings: CanvasSettings;
    isInfiniteCanvas: boolean;
    setIsInfiniteCanvas: (isInfinite: boolean) => void;
    selectedLayerId: string | null;
    selectedLayerIds: string[];
    isLoading: boolean;
    error: string | null;
    aiPrompt: string;
    setAiPrompt: (prompt: string) => void;
    aiPreset: 'none' | 'architecture';
    setAiPreset: (preset: 'none' | 'architecture') => void;
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
    beginInteraction: () => void;
    hasAiLog: boolean;
    isLogVisible: boolean;
    setIsLogVisible: React.Dispatch<React.SetStateAction<boolean>>;
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

export const LayerComposerSidebar: React.FC<LayerComposerSidebarProps> = (props) => {
    const {
        layers, canvasSettings, isInfiniteCanvas, setIsInfiniteCanvas, selectedLayerId, selectedLayerIds, isLoading, error, aiPrompt, setAiPrompt, onGenerateAILayer,
        onCancelGeneration, onLayersReorder, onLayerUpdate, onLayerDelete, onLayerSelect, onCanvasSettingsChange, onAddImage, onAddText, onSave, onClose,
        beginInteraction,
        isSimpleImageMode, setIsSimpleImageMode, aiPreset, setAiPreset,
        hasAiLog, isLogVisible, setIsLogVisible
    } = props;
    const { t } = useAppControls();
    const [openSection, setOpenSection] = useState<'ai' | 'canvas' | 'layers' | null>('ai');
    const [activeTab, setActiveTab] = useState<'properties' | 'text'>('properties');
    const selectedLayer = layers.find(l => l.id === selectedLayerId);

    useEffect(() => {
        if (selectedLayer) {
            setActiveTab(selectedLayer.type === 'text' ? 'text' : 'properties');
        }
    }, [selectedLayer?.id, selectedLayer?.type]);

    const toggleSection = (section: 'ai' |'canvas' | 'layers') => { setOpenSection(prev => prev === section ? null : section); };

    return (
        <aside className="w-1/3 max-w-sm flex flex-col bg-neutral-900/50 p-6 border-r border-white/10">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h3 className="base-font font-bold text-2xl text-yellow-400">{t('layerComposer_title')}</h3>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Đóng">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <div className="flex-grow overflow-y-auto space-y-2 pr-2 -mr-4">
                <div className="border border-neutral-700 rounded-lg overflow-hidden flex-shrink-0 mb-2">
                    <AccordionHeader title={t('layerComposer_aiGeneration')} isOpen={openSection === 'ai'} onClick={() => toggleSection('ai')} />
                    <AnimatePresence>
                        {openSection === 'ai' && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-neutral-800/50">
                                <div className="p-3 space-y-3">
                                    <p className="text-xs text-neutral-400 text-center"> {selectedLayerIds.length > 0 ? t('layerComposer_ai_note_selection') : t('layerComposer_ai_note_canvas')} </p>
                                    
                                    <div>
                                        <label htmlFor="ai-preset-select" className="block text-sm font-medium text-neutral-300 mb-1">{t('layerComposer_ai_preset')}</label>
                                        <select
                                            id="ai-preset-select"
                                            value={aiPreset}
                                            onChange={(e) => setAiPreset(e.target.value as 'none' | 'architecture')}
                                            className="form-input !p-2 !text-sm w-full"
                                            disabled={isLoading}
                                        >
                                            <option value="none">{t('layerComposer_ai_preset_none')}</option>
                                            <option value="architecture">{t('layerComposer_ai_preset_architecture')}</option>
                                        </select>
                                    </div>

                                    <textarea 
                                        value={aiPrompt} 
                                        onChange={e => setAiPrompt(e.target.value)} 
                                        placeholder={t('layerComposer_ai_promptPlaceholder')} 
                                        className="form-input !p-2 !text-sm !h-24" 
                                        rows={4} 
                                        disabled={isLoading}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                e.preventDefault();
                                                if (!isLoading && (aiPreset === 'architecture' || aiPrompt.trim())) {
                                                    onGenerateAILayer();
                                                }
                                            }
                                        }}
                                    />
                                    
                                    <div className="flex items-center justify-between pt-3 border-t border-neutral-700/50">
                                        <label htmlFor="simple-image-mode" className="text-sm font-medium text-neutral-200 flex items-center gap-2">
                                            {t('layerComposer_ai_simpleMode')}
                                            <span title={t('layerComposer_ai_simpleMode_tooltip')} className="cursor-help text-neutral-400">
                                                <InfoIcon className="h-4 w-4" />
                                            </span>
                                        </label>
                                        <input 
                                            type="checkbox" 
                                            id="simple-image-mode"
                                            checked={isSimpleImageMode}
                                            onChange={(e) => setIsSimpleImageMode(e.target.checked)}
                                            className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800"
                                            disabled={selectedLayerIds.length < 2}
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {hasAiLog && (
                                            <button
                                                onClick={() => setIsLogVisible(v => !v)}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                {isLogVisible ? t('layerComposer_ai_hideLog') : t('layerComposer_ai_showLog')}
                                            </button>
                                        )}
                                        {isLoading ? (
                                             <button
                                                onClick={onCancelGeneration}
                                                className="btn btn-secondary btn-sm !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white flex-grow"
                                            >
                                                {t('layerComposer_ai_cancel')}
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={onGenerateAILayer} 
                                                className="btn btn-primary btn-sm flex-grow" 
                                                disabled={isLoading || ((aiPreset === 'none') && !aiPrompt.trim())}
                                                title={t('layerComposer_ai_generate_tooltip')}
                                            >
                                                {t('layerComposer_ai_generate')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <div className="border border-neutral-700 rounded-lg overflow-hidden">
                    <AccordionHeader title={t('layerComposer_canvasSettings')} isOpen={openSection === 'canvas'} onClick={() => toggleSection('canvas')} />
                     <AnimatePresence> {openSection === 'canvas' && ( <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-neutral-800/50"> <div className="p-3"> <div className={cn("grid grid-cols-3 gap-3 text-sm items-end transition-opacity", isInfiniteCanvas && "opacity-50 pointer-events-none")}> <div><label htmlFor="canvas-w">{t('layerComposer_width')}</label><input id="canvas-w" type="number" value={canvasSettings.width} onChange={e => onCanvasSettingsChange(s => ({...s, width: Number(e.target.value)}))} className="form-input !p-1.5 !text-sm" disabled={isInfiniteCanvas}/></div> <div><label htmlFor="canvas-h">{t('layerComposer_height')}</label><input id="canvas-h" type="number" value={canvasSettings.height} onChange={e => onCanvasSettingsChange(s => ({...s, height: Number(e.target.value)}))} className="form-input !p-1.5 !text-sm" disabled={isInfiniteCanvas}/></div> <div className="flex justify-center items-center h-full pb-1"> <div className="relative w-8 h-8" title={t('layerComposer_background')}> <input id="canvas-bg" type="color" value={canvasSettings.background} onChange={e => onCanvasSettingsChange(s => ({...s, background: e.target.value}))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isInfiniteCanvas}/> <div className="w-full h-full rounded-full border-2 border-white/20 shadow-inner pointer-events-none" style={{ backgroundColor: canvasSettings.background }} /> </div> </div> </div> <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-700"> <label htmlFor="infinite-canvas-toggle" className="text-sm font-medium text-neutral-200">{t('layerComposer_infiniteCanvas')}</label> <input type="checkbox" id="infinite-canvas-toggle" checked={isInfiniteCanvas} onChange={(e) => setIsInfiniteCanvas(e.target.checked)} className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" /> </div> </div> </motion.div> )} </AnimatePresence>
                </div>
                <div className="border border-neutral-700 rounded-lg overflow-hidden">
                     <AccordionHeader title={t('layerComposer_layers')} isOpen={openSection === 'layers'} onClick={() => toggleSection('layers')} rightContent={ <> <button onClick={(e) => { e.stopPropagation(); onAddText(); }} className="p-1.5 rounded-md bg-white/10 text-neutral-300 hover:bg-white/20 transition-colors" aria-label={t('layerComposer_addText')} title={t('layerComposer_addText')} > <AddTextIcon className="h-4 w-4" /> </button> <button onClick={(e) => { e.stopPropagation(); onAddImage(); }} className="p-1.5 rounded-md bg-white/10 text-neutral-300 hover:bg-white/20 transition-colors" aria-label={t('layerComposer_addImage')} title={t('layerComposer_addImage')} > <AddIcon className="h-4 w-4" strokeWidth={2.5} /> </button> </> } />
                     <AnimatePresence> {openSection === 'layers' && ( <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-neutral-800/50"> <div className="p-3"> <LayerList layers={layers} selectedLayerId={selectedLayerId} onLayersReorder={onLayersReorder} onLayerUpdate={onLayerUpdate} onLayerDelete={onLayerDelete} onLayerSelect={onLayerSelect} beginInteraction={beginInteraction} /> </div> </motion.div> )} </AnimatePresence>
                </div>
                 {selectedLayer && ( <div className="mt-2 border border-neutral-700 rounded-lg"> <div className="flex border-b border-neutral-700 bg-neutral-800 rounded-t-lg"> <button onClick={() => setActiveTab('properties')} className={cn('flex-1 py-2 text-sm font-bold transition-colors', activeTab === 'properties' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-neutral-700/50' : 'text-neutral-400 hover:text-white')} > {t('layerComposer_tab_properties')} </button> {selectedLayer.type === 'text' && ( <button onClick={() => setActiveTab('text')} className={cn('flex-1 py-2 text-sm font-bold transition-colors', activeTab === 'text' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-neutral-700/50' : 'text-neutral-400 hover:text-white')} > {t('layerComposer_tab_text')} </button> )} </div> <div className="bg-neutral-800/50"> <AnimatePresence mode="wait"> <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} > {activeTab === 'properties' && ( <LayerPropertiesControls layer={selectedLayer} onUpdate={onLayerUpdate} beginInteraction={beginInteraction} /> )} {activeTab === 'text' && selectedLayer.type === 'text' && ( <TextLayerControls layer={selectedLayer} onUpdate={onLayerUpdate} beginInteraction={beginInteraction} /> )} </motion.div> </AnimatePresence> </div> </div> )}
            </div>
            
            <div className="flex-shrink-0 pt-6 border-t border-white/10">
                {error && <p className="text-red-400 text-center text-sm mb-2">{error}</p>}
                <div className="flex items-center gap-2">
                    <button onClick={onClose} className="btn btn-secondary w-full btn-sm"> {t('common_cancel')} </button>
                    <button onClick={onSave} className="btn btn-primary w-full btn-sm" disabled={(layers.length === 0 && !isInfiniteCanvas) || isLoading} title={isInfiniteCanvas ? t('layerComposer_exportJsonTooltip') : t('layerComposer_saveTooltip')} > {isLoading ? t('layerComposer_saving') : (isInfiniteCanvas ? t('layerComposer_exportJson') : t('layerComposer_save'))} </button>
                </div>
            </div>
        </aside>
    );
};