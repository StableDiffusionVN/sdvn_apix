/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { cn } from '../../lib/utils';

interface CanvasToolbarProps {
    zoomDisplay: number;
    activeTool: 'select' | 'hand';
    isLayerSelected: boolean;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    onToolSelect: (tool: 'select' | 'hand') => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({ 
    zoomDisplay, activeTool, onZoomIn, onZoomOut, onFit, onToolSelect, onUndo, onRedo, canUndo, canRedo,
}) => {
    return (
        <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 p-1.5 rounded-lg bg-neutral-900/60 backdrop-blur-sm border border-white/10 shadow-lg"
            onPointerDown={e => e.stopPropagation()}
        >
            <button onClick={onUndo} disabled={!canUndo} title="Undo (Cmd+Z)" className="p-2 rounded-md hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg></button>
            <button onClick={onRedo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)" className="p-2 rounded-md hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg></button>
            <div className="w-px h-5 bg-white/20 mx-1" />
            <button onClick={onZoomOut} title="Zoom Out (-)" className="p-2 rounded-md hover:bg-neutral-700 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg></button>
            <button onClick={onFit} className="px-3 py-2 text-sm font-semibold rounded-md hover:bg-neutral-700 transition-colors">{zoomDisplay}%</button>
            <button onClick={onZoomIn} title="Zoom In (+)" className="p-2 rounded-md hover:bg-neutral-700 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></button>
            <div className="w-px h-5 bg-white/20 mx-1" />
            <button onClick={() => onToolSelect('select')} title="Select Tool (V)" className={cn("p-2 rounded-md transition-colors", activeTool === 'select' && 'bg-neutral-700')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
            <button onClick={() => onToolSelect('hand')} title="Hand Tool (H, hold Space)" className={cn("p-2 rounded-md transition-colors", activeTool === 'hand' && 'bg-neutral-700')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11" /></svg></button>
        </div>
    );
};