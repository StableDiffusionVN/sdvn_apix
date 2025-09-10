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

interface LayerComposerSidebarProps {
    layers: Layer[];
    canvasSettings: CanvasSettings;
    selectedLayerId: string | null;
    selectedLayerIds: string[];
    isLoading: boolean;
    error: string | null;
    aiPrompt: string;
    setAiPrompt: (prompt: string) => void;
    onGenerateAILayer: () => void;
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
}

const AccordionHeader: React.FC<{
    title: string;
    isOpen: boolean;
    onClick: () => void;
    children?: React.ReactNode;
    rightContent?: React.ReactNode;
}> = ({ title, isOpen, onClick, children, rightContent }) => {
    return (
        <button onClick={onClick} className="w-full flex justify-between items-center p-3 bg-neutral-800 hover:bg-neutral-700/80 transition-colors rounded-t-lg" aria-expanded={isOpen}>
            <h4 className="font-semibold text-neutral-200">{title}</h4>
            <div className="flex items-center gap-2">
                {rightContent}
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </motion.div>
            </div>
        </button>
    );
};


export const LayerComposerSidebar: React.FC<LayerComposerSidebarProps> = ({
    layers, canvasSettings, selectedLayerId, selectedLayerIds, isLoading, error, aiPrompt, setAiPrompt, onGenerateAILayer,
    onLayersReorder, onLayerUpdate, onLayerDelete, onLayerSelect,
    onCanvasSettingsChange, onAddImage, onAddText, onSave, onClose,
    beginInteraction
}) => {
    const { t } = useAppControls();
    const [openSection, setOpenSection] = useState<'canvas' | 'layers' | null>('layers');
    const [activeTab, setActiveTab] = useState<'properties' | 'text'>('properties');
    const selectedLayer = layers.find(l => l.id === selectedLayerId);

    useEffect(() => {
        if (selectedLayer) {
            // Prefer showing text tab if it's a text layer, otherwise default to properties
            setActiveTab(selectedLayer.type === 'text' ? 'text' : 'properties');
        }
    }, [selectedLayer?.id, selectedLayer?.type]);

    const toggleSection = (section: 'canvas' | 'layers') => {
        setOpenSection(prev => prev === section ? null : section);
    };


    return (
        <aside className="w-1/3 max-w-sm flex flex-col bg-neutral-900/50 p-6 border-r border-white/10">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h3 className="base-font font-bold text-2xl text-yellow-400">{t('layerComposer_title')}</h3>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Đóng">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
             {/* AI Generation (Always Open at the top) */}
            <div className="border border-neutral-700 rounded-lg overflow-hidden flex-shrink-0 mb-4">
                <div className="w-full flex justify-between items-center p-3 bg-neutral-800 rounded-t-lg">
                    <h4 className="font-semibold text-neutral-200">{t('layerComposer_aiGeneration')}</h4>
                </div>
                <div className="bg-neutral-800/50">
                    <div className="p-3 space-y-3">
                        <p className="text-xs text-neutral-400 text-center">
                            {selectedLayerIds.length > 0
                                ? t('layerComposer_ai_note_selection')
                                : t('layerComposer_ai_note_canvas')
                            }
                        </p>
                        <textarea
                            value={aiPrompt}
                            onChange={e => setAiPrompt(e.target.value)}
                            placeholder={t('layerComposer_ai_promptPlaceholder')}
                            className="form-input !p-2 !text-sm !h-24"
                            rows={4}
                            disabled={isLoading}
                        />
                        <button
                            onClick={onGenerateAILayer}
                            className="btn btn-primary btn-sm w-full"
                            disabled={isLoading || !aiPrompt.trim()}
                        >
                            {isLoading ? t('layerComposer_ai_generating') : t('layerComposer_ai_generate')}
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto space-y-2 pr-2 -mr-4">
                {/* Canvas Settings Accordion */}
                <div className="border border-neutral-700 rounded-lg overflow-hidden">
                    <AccordionHeader 
                        title={t('layerComposer_canvasSettings')} 
                        isOpen={openSection === 'canvas'}
                        onClick={() => toggleSection('canvas')}
                    />
                     <AnimatePresence>
                        {openSection === 'canvas' && (
                             <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-neutral-800/50">
                                <div className="p-3">
                                    <div className="grid grid-cols-3 gap-3 text-sm items-end">
                                        <div><label htmlFor="canvas-w">{t('layerComposer_width')}</label><input id="canvas-w" type="number" value={canvasSettings.width} onChange={e => onCanvasSettingsChange(s => ({...s, width: Number(e.target.value)}))} className="form-input !p-1.5 !text-sm"/></div>
                                        <div><label htmlFor="canvas-h">{t('layerComposer_height')}</label><input id="canvas-h" type="number" value={canvasSettings.height} onChange={e => onCanvasSettingsChange(s => ({...s, height: Number(e.target.value)}))} className="form-input !p-1.5 !text-sm"/></div>
                                        <div className="flex justify-center items-center h-full pb-1">
                                            <div className="relative w-8 h-8" title={t('layerComposer_background')}>
                                                <input id="canvas-bg" type="color" value={canvasSettings.background} onChange={e => onCanvasSettingsChange(s => ({...s, background: e.target.value}))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                <div className="w-full h-full rounded-full border-2 border-white/20 shadow-inner pointer-events-none" style={{ backgroundColor: canvasSettings.background }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Layers Accordion */}
                <div className="border border-neutral-700 rounded-lg overflow-hidden">
                     <AccordionHeader 
                        title={t('layerComposer_layers')} 
                        isOpen={openSection === 'layers'}
                        onClick={() => toggleSection('layers')}
                        rightContent={
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAddText(); }}
                                    className="p-1.5 rounded-md bg-white/10 text-neutral-300 hover:bg-white/20 transition-colors"
                                    aria-label={t('layerComposer_addText')}
                                    title={t('layerComposer_addText')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAddImage(); }}
                                    className="p-1.5 rounded-md bg-white/10 text-neutral-300 hover:bg-white/20 transition-colors"
                                    aria-label={t('layerComposer_addImage')}
                                    title={t('layerComposer_addImage')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                                    </svg>
                                </button>
                            </>
                        }
                    />
                     <AnimatePresence>
                        {openSection === 'layers' && (
                             <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-neutral-800/50">
                                <div className="p-3">
                                     <LayerList
                                        layers={layers}
                                        selectedLayerId={selectedLayerId}
                                        onLayersReorder={onLayersReorder}
                                        onLayerUpdate={onLayerUpdate}
                                        onLayerDelete={onLayerDelete}
                                        onLayerSelect={onLayerSelect}
                                        beginInteraction={beginInteraction}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Selected Layer Controls */}
                 {selectedLayer && (
                    <div className="mt-2 border border-neutral-700 rounded-lg">
                        <div className="flex border-b border-neutral-700 bg-neutral-800 rounded-t-lg">
                            <button onClick={() => setActiveTab('properties')} className={cn('flex-1 py-2 text-sm font-bold transition-colors', activeTab === 'properties' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-neutral-700/50' : 'text-neutral-400 hover:text-white')} >
                                {t('layerComposer_tab_properties')}
                            </button>
                             {selectedLayer.type === 'text' && (
                                <button onClick={() => setActiveTab('text')} className={cn('flex-1 py-2 text-sm font-bold transition-colors', activeTab === 'text' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-neutral-700/50' : 'text-neutral-400 hover:text-white')} >
                                    {t('layerComposer_tab_text')}
                                </button>
                            )}
                        </div>
                        <div className="bg-neutral-800/50">
                             <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {activeTab === 'properties' && (
                                        <LayerPropertiesControls
                                            layer={selectedLayer}
                                            onUpdate={onLayerUpdate}
                                            beginInteraction={beginInteraction}
                                        />
                                    )}
                                    {activeTab === 'text' && selectedLayer.type === 'text' && (
                                        <TextLayerControls
                                            layer={selectedLayer}
                                            onUpdate={onLayerUpdate}
                                            beginInteraction={beginInteraction}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                 )}
            </div>
            
            <div className="flex-shrink-0 pt-6 border-t border-white/10">
                {error && <p className="text-red-400 text-center text-sm mb-2">{error}</p>}
                <div className="flex items-center gap-2">
                    <button onClick={onClose} className="btn btn-secondary btn-sm flex-1">
                        {t('common_cancel')}
                    </button>
                    <button onClick={onSave} className="btn btn-primary btn-sm flex-1" disabled={layers.length === 0 || isLoading}>
                        {isLoading ? t('layerComposer_saving') : t('layerComposer_save')}
                    </button>
                </div>
            </div>
        </aside>
    );
};