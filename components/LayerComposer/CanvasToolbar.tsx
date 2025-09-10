/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { cn } from '../../lib/utils';

interface CanvasToolbarProps {
    zoomDisplay: number;
    activeTool: 'select' | 'hand' | 'pen';
    isLayerSelected: boolean;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    onToolSelect: (tool: 'select' | 'hand' | 'pen') => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({ 
    zoomDisplay, activeTool, isLayerSelected, onZoomIn, onZoomOut, onFit, onToolSelect, onUndo, onRedo, canUndo, canRedo 
}) => {
    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 p-1.5 rounded-lg bg-neutral-900/60 backdrop-blur-sm border border-white/10 shadow-lg">
            <button onClick={onUndo} disabled={!canUndo} title="Undo (Cmd+Z)" className="p-2 rounded-md hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg></button>
            <button onClick={onRedo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)" className="p-2 rounded-md hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg></button>
            <div className="w-px h-5 bg-white/20 mx-1" />
            <button onClick={onZoomOut} title="Zoom Out (-)" className="p-2 rounded-md hover:bg-neutral-700 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg></button>
            <button onClick={onFit} className="px-3 py-2 text-sm font-semibold rounded-md hover:bg-neutral-700 transition-colors">{zoomDisplay}%</button>
            <button onClick={onZoomIn} title="Zoom In (+)" className="p-2 rounded-md hover:bg-neutral-700 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></button>
            <div className="w-px h-5 bg-white/20 mx-1" />
            <button onClick={() => onToolSelect('select')} title="Select Tool (V)" className={cn("p-2 rounded-md transition-colors", activeTool === 'select' && 'bg-neutral-700')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
            <button onClick={() => onToolSelect('hand')} title="Hand Tool (H, hold Space)" className={cn("p-2 rounded-md transition-colors", activeTool === 'hand' && 'bg-neutral-700')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11" /></svg></button>
            <button onClick={() => onToolSelect('pen')} title="Pen Tool (P)" disabled={!isLayerSelected} className={cn("p-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed", activeTool === 'pen' && 'bg-neutral-700')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.75 22.5001H13.27C14.23 22.5001 14.85 21.8201 14.67 20.9901L14.26 19.1802H9.75999L9.35 20.9901C9.17 21.7701 9.85 22.5001 10.75 22.5001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14.26 19.1702L15.99 17.6301C16.96 16.7701 17 16.1701 16.23 15.2001L13.18 11.3302C12.54 10.5202 11.49 10.5202 10.85 11.3302L7.8 15.2001C7.03 16.1701 7.02999 16.8001 8.03999 17.6301L9.77 19.1702" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12.01 11.1201V13.6501" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12.52 5H11.52C10.97 5 10.52 4.55 10.52 4V3C10.52 2.45 10.97 2 11.52 2H12.52C13.07 2 13.52 2.45 13.52 3V4C13.52 4.55 13.07 5 12.52 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3.27 14.17H4.27C4.82 14.17 5.27 13.72 5.27 13.17V12.17C5.27 11.62 4.82 11.1699 4.27 11.1699H3.27C2.72 11.1699 2.27 11.62 2.27 12.17V13.17C2.27 13.72 2.72 14.17 3.27 14.17Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.73 14.17H19.73C19.18 14.17 18.73 13.72 18.73 13.17V12.17C18.73 11.62 19.18 11.1699 19.73 11.1699H20.73C21.28 11.1699 21.73 11.62 21.73 12.17V13.17C21.73 13.72 21.28 14.17 20.73 14.17Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10.52 3.56006C6.71 4.01006 3.75 7.24004 3.75 11.17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.25 11.17C20.25 7.25004 17.31 4.03006 13.52 3.56006" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>
        </div>
    );
};