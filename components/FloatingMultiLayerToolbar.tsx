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
            <ToolButton label="Căn lề trái" onClick={() => onAction('align-left')}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M4 3C4.55228 3 5 3.44772 5 4V20C5 20.5523 4.55228 21 4 21C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM10 15C9.44772 15 9 15.4477 9 16C9 16.5523 9.44772 17 10 17H12C12.5523 17 13 16.5523 13 16C13 15.4477 12.5523 15 12 15H10ZM7 16C7 14.3431 8.34315 13 10 13H12C13.6569 13 15 14.3431 15 16C15 17.6569 13.6569 19 12 19H10C8.34315 19 7 17.6569 7 16ZM9 8C9 7.44772 9.44772 7 10 7H18C18.5523 7 19 7.44772 19 8C19 8.55228 18.5523 9 18 9H10C9.44772 9 9 8.55228 9 8ZM10 5C8.34315 5 7 6.34315 7 8C7 9.65685 8.34315 11 10 11H18C19.6569 11 21 9.65685 21 8C21 6.34315 19.6569 5 18 5H10Z" />
                </svg>
            </ToolButton>
            <ToolButton label="Căn giữa ngang" onClick={() => onAction('align-center')}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 3C12.5523 3 13 3.44772 13 4V5H17C18.6569 5 20 6.34315 20 8C20 9.65685 18.6569 11 17 11H13V13H14C15.6569 13 17 14.3431 17 16C17 17.6569 15.6569 19 14 19H13V20C13 20.5523 12.5523 21 12 21C11.4477 21 11 20.5523 11 20V19H10C8.34315 19 7 17.6569 7 16C7 14.3431 8.34315 13 10 13H11V11H7C5.34315 11 4 9.65685 4 8C4 6.34315 5.34315 5 7 5H11V4C11 3.44772 11.4477 3 12 3ZM7 7C6.44772 7 6 7.44772 6 8C6 8.55228 6.44772 9 7 9H12H17C17.5523 9 18 8.55228 18 8C18 7.44772 17.5523 7 17 7H12H7ZM10 15C9.44772 15 9 15.4477 9 16C9 16.5523 9.44772 17 10 17H12H14C14.5523 17 15 16.5523 15 16C15 15.4477 14.5523 15 14 15H12H10Z" />
                </svg>
            </ToolButton>
            <ToolButton label="Căn lề phải" onClick={() => onAction('align-right')}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M20 3C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21C19.4477 21 19 20.5523 19 20V4C19 3.44772 19.4477 3 20 3ZM12 15C11.4477 15 11 15.4477 11 16C11 16.5523 11.4477 17 12 17H14C14.5523 17 15 16.5523 15 16C15 15.4477 14.5523 15 14 15H12ZM9 16C9 14.3431 10.3431 13 12 13H14C15.6569 13 17 14.3431 17 16C17 17.6569 15.6569 19 14 19H12C10.3431 19 9 17.6569 9 16ZM5 8C5 7.44772 5.44772 7 6 7H14C14.5523 7 15 7.44772 15 8C15 8.55228 14.5523 9 14 9H6C5.44772 9 5 8.55228 5 8ZM6 5C4.34315 5 3 6.34315 3 8C3 9.65685 4.34315 11 6 11H14C15.6569 11 17 9.65685 17 8C17 6.34315 15.6569 5 14 5H6Z" />
                </svg>
            </ToolButton>
            <div className="w-px h-5 bg-white/20 mx-1 self-center" />
            <ToolButton label="Căn lề trên" onClick={() => onAction('align-top')}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M3 4C3 3.44772 3.44772 3 4 3H20C20.5523 3 21 3.44772 21 4C21 4.55228 20.5523 5 20 5H4C3.44772 5 3 4.55228 3 4ZM13 10C13 8.34315 14.3431 7 16 7C17.6569 7 19 8.34315 19 10V12C19 13.6569 17.6569 15 16 15C14.3431 15 13 13.6569 13 12V10ZM16 9C15.4477 9 15 9.44772 15 10V12C15 12.5523 15.4477 13 16 13C16.5523 13 17 12.5523 17 12V10C17 9.44772 16.5523 9 16 9ZM8 7C6.34315 7 5 8.34315 5 10V18C5 19.6569 6.34315 21 8 21C9.65685 21 11 19.6569 11 18V10C11 8.34315 9.65685 7 8 7ZM7 10C7 9.44772 7.44772 9 8 9C8.55228 9 9 9.44772 9 10V18C9 18.5523 8.55228 19 8 19C7.44772 19 7 18.5523 7 18V10Z" />
                </svg>
            </ToolButton>
            <ToolButton label="Căn giữa dọc" onClick={() => onAction('align-middle')}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M5 7C5 5.34315 6.34315 4 8 4C9.65685 4 11 5.34315 11 7V11H13V10C13 8.34315 14.3431 7 16 7C17.6569 7 19 8.34315 19 10V11H20C20.5523 11 21 11.4477 21 12C21 12.5523 20.5523 13 20 13H19V14C19 15.6569 17.6569 17 16 17C14.3431 17 13 15.6569 13 14V13H11V17C11 18.6569 9.65685 20 8 20C6.34315 20 5 18.6569 5 17V13H4C3.44772 13 3 12.5523 3 12C3 11.4477 3.44772 11 4 11H5V7ZM8 6C7.44772 6 7 6.44772 7 7V12V17C7 17.5523 7.44772 18 8 18C8.55228 18 9 17.5523 9 17V12V7C9 6.44772 8.55228 6 8 6ZM16 9C15.4477 9 15 9.44772 15 10V12V14C15 14.5523 15.4477 15 16 15C16.5523 15 17 14.5523 17 14V12V10C17 9.44772 16.5523 9 16 9Z" />
                </svg>
            </ToolButton>
            <ToolButton label="Căn lề dưới" onClick={() => onAction('align-bottom')}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M5 6C5 4.34315 6.34315 3 8 3C9.65685 3 11 4.34315 11 6V14C11 15.6569 9.65685 17 8 17C6.34315 17 5 15.6569 5 14V6ZM8 5C7.44772 5 7 5.44772 7 6V14C7 14.5523 7.44772 15 8 15C8.55228 15 9 14.5523 9 14V6C9 5.44772 8.55228 5 8 5ZM3 20C3 19.4477 3.44772 19 4 19H20C20.5523 19 21 19.4477 21 20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20ZM16 9C14.3431 9 13 10.3431 13 12V14C13 15.6569 14.3431 17 16 17C17.6569 17 19 15.6569 19 14V12C19 10.3431 17.6569 9 16 9ZM15 12C15 11.4477 15.4477 11 16 11C16.5523 11 17 11.4477 17 12V14C17 14.5523 16.5523 15 16 15C15.4477 15 15 14.5523 15 14V12Z" />
                </svg>
            </ToolButton>
            <div className="w-px h-5 bg-white/20 mx-1 self-center" />
             <ToolButton label="Phân phối ngang" onClick={() => onAction('distribute-horizontal')}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 3L2 3" strokeLinecap="round"/>
                    <path d="M22 21L2 21" strokeLinecap="round"/>
                    <path d="M20 12C20 10.1144 20 9.17157 19.4142 8.58579C18.8284 8 17.8856 8 16 8L8 8C6.11438 8 5.17157 8 4.58579 8.58579C4 9.17157 4 10.1144 4 12C4 13.8856 4 14.8284 4.58579 15.4142C5.17157 16 6.11438 16 8 16H16C17.8856 16 18.8284 16 19.4142 15.4142C20 14.8284 20 13.8856 20 12Z" />
                </svg>
            </ToolButton>
            <ToolButton label="Phân phối dọc" onClick={() => onAction('distribute-vertical')}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                    <g transform="rotate(90 12 12)">
                        <path d="M22 3L2 3" strokeLinecap="round"/>
                        <path d="M22 21L2 21" strokeLinecap="round"/>
                        <path d="M20 12C20 10.1144 20 9.17157 19.4142 8.58579C18.8284 8 17.8856 8 16 8L8 8C6.11438 8 5.17157 8 4.58579 8.58579C4 9.17157 4 10.1144 4 12C4 13.8856 4 14.8284 4.58579 15.4142C5.17157 16 6.11438 16 8 16H16C17.8856 16 18.8284 16 19.4142 15.4142C20 14.8284 20 13.8856 20 12Z" />
                    </g>
                </svg>
            </ToolButton>
            <div className="w-px h-5 bg-white/20 mx-1 self-center" />
             <ToolButton label="Gộp Layer" onClick={() => onAction('merge')} disabled={selectedLayerCount < 2}>
                <svg className="h-5 w-5" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
                    <path d="m3.25 7.25-1.5.75 6.25 3.25 6.25-3.25-1.5-.75m-11 3.75 6.25 3.25 6.25-3.25"/>
                    <path d="m8 8.25v-6.5m-2.25 4.5 2.25 2 2.25-2"/>
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
