/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { cn } from '../../lib/utils';
import { type Layer, type BlendMode } from './LayerComposer.types';

interface LayerListItemProps {
    layer: Layer;
    onUpdate: (id: string, newProps: Partial<Layer>, isFinalChange: boolean) => void;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
    isSelected: boolean;
    beginInteraction: () => void;
}

export const LayerListItem: React.FC<LayerListItemProps> = ({ layer, onUpdate, onDelete, onSelect, isSelected, beginInteraction }) => {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            value={layer}
            dragListener={layer.isLocked ? false : true}
            dragControls={dragControls}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
            className={cn("bg-neutral-800 rounded-lg border cursor-pointer", isSelected ? 'border-yellow-400 ring-2 ring-yellow-400/30' : 'border-neutral-700 hover:border-neutral-600')}
            onClick={() => onSelect(layer.id)}
        >
            <div className="p-2">
                <div className="flex items-center gap-3">
                    <div
                        className={cn("text-neutral-500", !layer.isLocked && "cursor-grab hover:text-white")}
                        onPointerDown={(e) => {
                            if (!layer.isLocked) {
                                e.stopPropagation(); // Prevent onSelect from firing when starting drag
                                dragControls.start(e);
                            }
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                    <div className="w-10 h-10 flex-shrink-0">
                        {layer.type === 'image' && layer.url ? (
                            <img src={layer.url} className="w-full h-full object-cover rounded-md" alt="Layer thumbnail"/>
                        ) : layer.type === 'text' ? (
                            <div 
                                className="w-full h-full flex items-center justify-center bg-neutral-700 rounded-md p-1 overflow-hidden"
                                style={{ fontFamily: 'Asimovian', color: layer.color }}
                            >
                                <span className="text-2xl font-bold">T</span>
                            </div>
                        ) : null}
                    </div>
                    <div className="flex-grow min-w-0">
                        <p className="text-sm font-bold text-white truncate">{layer.type === 'text' ? (layer.text || 'Text Layer') : `Image Layer`}</p>
                        <p className="text-xs text-neutral-400 capitalize">
                            {(layer.blendMode === 'source-over' ? 'Normal' : layer.blendMode)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); beginInteraction(); onUpdate(layer.id, { isLocked: !layer.isLocked }, true)}} className={cn("hover:text-white p-1 rounded-full", layer.isLocked ? 'text-yellow-400' : 'text-neutral-500')} title={layer.isLocked ? 'Mở khoá Layer' : 'Khoá Layer'}>
                           {layer.isLocked ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                           ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zm0 9a2 2 0 100-4 2 2 0 000 4z" /><path d="M4 8V7a3 3 0 016 0v1h1a1 1 0 110 2H3a1 1 0 01-1-1V9a1 1 0 011-1h1z" /></svg>
                           )}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); beginInteraction(); onUpdate(layer.id, { isVisible: !layer.isVisible }, true)}} className={cn("transition-colors p-1 rounded-full", layer.isVisible ? 'text-white hover:text-neutral-300' : 'text-neutral-500 hover:text-white')} title={layer.isVisible ? 'Ẩn Layer' : 'Hiện Layer'}>
                            {layer.isVisible ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781z" clipRule="evenodd" /><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A10.025 10.025 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" /></svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Reorder.Item>
    );
};