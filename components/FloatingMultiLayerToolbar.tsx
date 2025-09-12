/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, useTransform, type MotionValue } from 'framer-motion';
import { cn } from '../../lib/utils';
import { type Rect, type MultiLayerAction } from './LayerComposer/LayerComposer.types';

interface FloatingMultiLayerToolbarProps {
    boundingBox: Rect;
    onAction: (action: MultiLayerAction) => void;
    scaleMV: MotionValue<number>;
    selectedLayerCount: number;
}

const ToolButton: React.FC<{
    label: string;
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ label, disabled = false, onClick, children }) => (
    <button
        onClick={onClick}
        className={cn(
            "p-2 rounded-md transition-colors",
            'bg-neutral-800 hover:bg-neutral-700 text-white',
            disabled && 'opacity-50 cursor-not-allowed hover:bg-neutral-800'
        )}
        aria-label={label}
        title={label}
        disabled={disabled}
    >
        {children}
    </button>
);

export const FloatingMultiLayerToolbar: React.FC<FloatingMultiLayerToolbarProps> = ({ boundingBox, onAction, scaleMV, selectedLayerCount }) => {
    
    const inverseScale = useTransform(scaleMV, s => 1 / s);
    const yOffset = useTransform(scaleMV, s => -45 / s);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{
                position: 'absolute',
                top: boundingBox.y,
                left: boundingBox.x + boundingBox.width / 2,
                x: '-50%',
                y: yOffset,
                scale: inverseScale,
                transformOrigin: 'center top',
                zIndex: 1001,
            }}
            className="flex items-center gap-1 p-1.5 rounded-lg bg-neutral-900/60 backdrop-blur-sm border border-white/10 shadow-lg"
            onPointerDown={e => e.stopPropagation()}
        >
            <ToolButton label="Căn lề trái" onClick={() => onAction('align-left')}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2v20M8 7h8M8 17h4"/></svg></ToolButton>
            <ToolButton label="Căn giữa ngang" onClick={() => onAction('align-center')}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M7 7h10M9 17h6"/></svg></ToolButton>
            <ToolButton label="Căn lề phải" onClick={() => onAction('align-right')}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 2v20M12 7h8M14 17h6"/></svg></ToolButton>
            <div className="w-px h-5 bg-white/20 mx-1 self-center" />
            <ToolButton label="Căn lề trên" onClick={() => onAction('align-top')}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h20M7 8v8M17 8v4"/></svg></ToolButton>
            <ToolButton label="Căn giữa dọc" onClick={() => onAction('align-middle')}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12h20M7 8v8M17 6v12"/></svg></ToolButton>
            <ToolButton label="Căn lề dưới" onClick={() => onAction('align-bottom')}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 20h20M7 16V8M17 16v-4"/></svg></ToolButton>
            <div className="w-px h-5 bg-white/20 mx-1 self-center" />
             <ToolButton label="Phân phối ngang" onClick={() => onAction('distribute-horizontal')}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="9" width="4" height="6"/><rect x="10" y="9" width="4" height="6"/><rect x="18" y="9" width="4" height="6"/></svg></ToolButton>
            <ToolButton label="Phân phối dọc" onClick={() => onAction('distribute-vertical')}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="2" width="6" height="4"/><rect x="9" y="10" width="6" height="4"/><rect x="9" y="18" width="6" height="4"/></svg></ToolButton>
            <div className="w-px h-5 bg-white/20 mx-1 self-center" />
             <ToolButton label="Gộp Layer" onClick={() => onAction('merge')} disabled={selectedLayerCount < 2}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V3" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 12.5l-4 4-4-4" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 8.5l10 5 10-5" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12.5l10 5 10-5" />
                </svg>
            </ToolButton>
            <ToolButton label="Tạo Clipping Mask" onClick={() => onAction('create-mask')} disabled={selectedLayerCount !== 2}>
                 <svg className="h-5 w-5" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none">
                    <defs>
                        <clipPath id="clipPathForIcon">
                        <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" />
                        </clipPath>
                    </defs>
                    <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" clipPath="url(#clipPathForIcon)" />
                    <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" />
                </svg>
            </ToolButton>
            <ToolButton label="Xuất" onClick={() => onAction('export')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </ToolButton>

            <div className="w-px h-5 bg-white/20 mx-1 self-center" />

            <ToolButton label="Nhân bản" onClick={() => onAction('duplicate')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </ToolButton>
            <ToolButton label="Xoá" onClick={() => onAction('delete')}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            </ToolButton>
        </motion.div>
    );
};