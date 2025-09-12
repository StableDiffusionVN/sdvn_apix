/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, useTransform, type MotionValue } from 'framer-motion';
import { cn } from '../../lib/utils';
import { type Layer } from './LayerComposer.types';

// FIX: Added 'edit' to LayerAction to match its usage in LayerComposerCanvas.
export type LayerAction = 'duplicate' | 'delete' | 'export' | 'edit';

interface FloatingLayerToolbarProps {
    layer: Layer;
    onAction: (action: LayerAction) => void;
    scaleMV: MotionValue<number>;
}

const ToolButton: React.FC<{
    label: string;
    isActive?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ label, disabled = false, onClick, children }) => (
    <button
        onClick={onClick}
        className={cn( "p-2 rounded-md transition-colors", 'bg-neutral-800 hover:bg-neutral-700 text-white', disabled && 'opacity-50 cursor-not-allowed hover:bg-neutral-800' )}
        aria-label={label}
        title={label}
        disabled={disabled}
    >
        {children}
    </button>
);

export const FloatingLayerToolbar: React.FC<FloatingLayerToolbarProps> = ({ layer, onAction, scaleMV }) => {
    
    const inverseScale = useTransform(scaleMV, s => 1 / s);
    const yOffset = useTransform(scaleMV, s => -45 / s);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'absolute', top: layer.y, left: layer.x + layer.width / 2, x: '-50%', y: yOffset, scale: inverseScale, transformOrigin: 'center top', zIndex: 1001 }}
            className="flex items-center gap-1 p-1.5 rounded-lg bg-neutral-900/60 backdrop-blur-sm border border-white/10 shadow-lg"
            onPointerDown={e => e.stopPropagation()}
        >
            {layer.type === 'image' && (
                 <>
                    <ToolButton label="Chỉnh sửa Layer" onClick={() => onAction('edit')}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                        </svg>
                    </ToolButton>
                    <div className="w-px h-5 bg-white/20 mx-1 self-center" />
                </>
            )}
            <ToolButton label="Xuất Layer (PNG)" onClick={() => onAction('export')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </ToolButton>
            <div className="w-px h-5 bg-white/20 mx-1 self-center" />
            <ToolButton label="Nhân bản Layer" onClick={() => onAction('duplicate')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </ToolButton>
            <ToolButton label="Xoá Layer" onClick={() => onAction('delete')}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            </ToolButton>
        </motion.div>
    );
};