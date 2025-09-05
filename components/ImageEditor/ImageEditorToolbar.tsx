/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { cn } from '../../lib/utils';
import { type Tool } from './ImageEditor.types';

interface ImageEditorToolbarProps {
    activeTool: Tool | null;
    handleToolSelect: (tool: Tool) => void;
    historyIndex: number;
    history: unknown[];
    handleUndo: () => void;
    handleRedo: () => void;
    commitState: () => void;
    rotation: number;
    setRotation: (value: number | ((prev: number) => number)) => void;
    setFlipHorizontal: (value: boolean | ((prev: boolean) => boolean)) => void;
    setFlipVertical: (value: boolean | ((prev: boolean) => boolean)) => void;
    brushColor: string;
    setBrushColor: (color: string) => void;
    showTooltip: (id: string, e: React.MouseEvent) => void;
    hideTooltip: () => void;
}

export const ImageEditorToolbar: React.FC<ImageEditorToolbarProps> = (props) => {
    const {
        activeTool, handleToolSelect, historyIndex, history, handleUndo, handleRedo, commitState,
        setRotation, setFlipHorizontal, setFlipVertical, brushColor, setBrushColor,
        showTooltip, hideTooltip
    } = props;

    const toolButtonClasses = "p-2 rounded-lg transition-colors aspect-square flex items-center justify-center";
    const activeToolButtonClasses = "bg-yellow-400 text-black";
    const inactiveToolButtonClasses = "bg-neutral-800 hover:bg-neutral-700 text-white";

    return (
        <div className="flex flex-row md:flex-col gap-2 p-2 bg-neutral-900/50 rounded-lg md:h-full justify-start order-first md:order-none">
            <div className='flex flex-col gap-2'>
                <button onMouseEnter={(e) => showTooltip('crop', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('crop')} className={cn(toolButtonClasses, activeTool === 'crop' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Crop Tool"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15" /><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15" /></svg></button>
                <button onMouseEnter={(e) => showTooltip('rotate', e)} onMouseLeave={hideTooltip} onClick={() => {setRotation(r => (r + 90) % 360); commitState();}} className={cn(toolButtonClasses, inactiveToolButtonClasses)} aria-label="Rotate Right"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15l6 6m0 0l6-6m-6 6V9a6 6 0 00-12 0v3" /></svg></button>
                <button onMouseEnter={(e) => showTooltip('flipH', e)} onMouseLeave={hideTooltip} onClick={() => {setFlipHorizontal(f => !f); commitState();}} className={cn(toolButtonClasses, inactiveToolButtonClasses)} aria-label="Flip Horizontal"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7l-4 4-4-4m8 10l-4-4-4 4" /></svg></button>
                <button onMouseEnter={(e) => showTooltip('flipV', e)} onMouseLeave={hideTooltip} onClick={() => {setFlipVertical(f => !f); commitState();}} className={cn(toolButtonClasses, inactiveToolButtonClasses)} aria-label="Flip Vertical"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 12L4 13m3 3l3-3m7-3v12m0-12l3 3m-3-3l-3 3" /></svg></button>
            </div>
            <div className="w-full h-[1px] bg-neutral-700 my-1 hidden md:block"></div><div className="h-full w-[1px] bg-neutral-700 mx-1 block md:hidden"></div>
            <div className='flex flex-col gap-2'>
                <button onMouseEnter={(e) => showTooltip('selection', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('selection')} className={cn(toolButtonClasses, activeTool === 'selection' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Selection Tool">
                    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                        <path d="M4.495 11.05a8.186 8.186 0 0 0 .695-3.067c.001-.027.006-.052.007-.078l.965.41a9.254 9.254 0 0 1-.648 2.888zm14.087-5.128l-.81.61a12.73 12.73 0 0 1 1.272 1.98l1-.307a13.602 13.602 0 0 0-1.462-2.283zm-4.224-2.13a8.128 8.128 0 0 1 2.02 1.285l.825-.62a9.226 9.226 0 0 0-2.6-1.648zm-4.541-.355a6.581 6.581 0 0 1 1.748-.237 6.919 6.919 0 0 1 .864.063l.245-.985a7.967 7.967 0 0 0-1.109-.078 7.501 7.501 0 0 0-2.023.276zM5.873 18.574a3.676 3.676 0 0 1-2.13-1.012L2.66 17.8a4.49 4.49 0 0 0 3.103 1.776zm-2.861-2.9c-.003-.058-.012-.11-.012-.17 0-.594.314-1.01.917-1.756.168-.208.349-.438.53-.682l-1.13-.169A4.135 4.135 0 0 0 2 15.504c0 .136.012.261.022.389zM6.534 6.3a4.422 4.422 0 0 1 1.458-1.97l-.29-1.016a5.53 5.53 0 0 0-2.078 2.599zm15.084 7.022a16.977 16.977 0 0 0-.788-3.266l-.974.299a16.1 16.1 0 0 1 .587 2.11zM18.757 17l2.189 4.515-2.894 1.456-2.266-4.621L13 22.17V9.51L23.266 17zm-1.597-1h3.038L14 11.478v7.624l1.954-2.68 2.552 5.201 1.11-.559zM11 18.854a8.011 8.011 0 0 0-2.454-.391c-.229 0-.444.011-.651.026l-.111 1.013c.243-.022.493-.039.763-.039a7.2 7.2 0 0 1 2.453.453z"/>
                        <path fill="none" d="M0 0h24v24H0z"/>
                    </svg>
                </button>
                <button onMouseEnter={(e) => showTooltip('marquee', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('marquee')} className={cn(toolButtonClasses, activeTool === 'marquee' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Rectangular Marquee Tool"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 4" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" /></svg></button>
                <button onMouseEnter={(e) => showTooltip('ellipse', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('ellipse')} className={cn(toolButtonClasses, activeTool === 'ellipse' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Elliptical Marquee Tool">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <ellipse cx="12" cy="12" rx="10" ry="7" strokeDasharray="2 4" />
                    </svg>
                </button>
                <button onMouseEnter={(e) => showTooltip('pen', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('pen')} className={cn(toolButtonClasses, activeTool === 'pen' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Pen Tool">
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
            <div className="w-full h-[1px] bg-neutral-700 my-1 hidden md:block"></div><div className="h-full w-[1px] bg-neutral-700 mx-1 block md:hidden"></div>
            <div className='flex flex-col gap-2'>
                <button onMouseEnter={(e) => showTooltip('brush', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('brush')} className={cn(toolButtonClasses, activeTool === 'brush' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Brush Tool">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21.8098 3.93814C20.4998 7.20814 17.5098 11.4781 14.6598 14.2681C14.2498 11.6881 12.1898 9.66814 9.58984 9.30814C12.3898 6.44814 16.6898 3.41814 19.9698 2.09814C20.5498 1.87814 21.1298 2.04814 21.4898 2.40814C21.8698 2.78814 22.0498 3.35814 21.8098 3.93814Z"/>
                        <path d="M13.7791 15.0909C13.5791 15.2609 13.3791 15.4309 13.1791 15.5909L11.3891 17.0209C11.3891 16.9909 11.3791 16.9509 11.3791 16.9109C11.2391 15.8409 10.7391 14.8509 9.92914 14.0409C9.10914 13.2209 8.08914 12.7209 6.96914 12.5809C6.93914 12.5809 6.89914 12.5709 6.86914 12.5709L8.31914 10.7409C8.45914 10.5609 8.60914 10.3909 8.76914 10.2109L9.44914 10.3009C11.5991 10.6009 13.3291 12.2909 13.6691 14.4309L13.7791 15.0909Z"/>
                        <path d="M10.4298 17.6208C10.4298 18.7208 10.0098 19.7708 9.20976 20.5608C8.59976 21.1808 7.77977 21.6008 6.77977 21.7208L4.32976 21.9908C2.98976 22.1408 1.83976 20.9908 1.98976 19.6408L2.25976 17.1808C2.49976 14.9908 4.32976 13.5908 6.26976 13.5508C6.45976 13.5408 6.66976 13.5508 6.86976 13.5708C7.71976 13.6808 8.53976 14.0708 9.22976 14.7508C9.89976 15.4208 10.2798 16.2108 10.3898 17.0408C10.4098 17.2408 10.4298 17.4308 10.4298 17.6208Z"/>
                    </svg>
                </button>
                <button onMouseEnter={(e) => showTooltip('eraser', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('eraser')} className={cn(toolButtonClasses, activeTool === 'eraser' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Eraser Tool"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M15.8698693,2.66881311 L20.838395,7.63733874 C21.7170746,8.5160184 21.7170746,9.9406396 20.838395,10.8193193 L12.1565953,19.4998034 L18.25448,19.5 C18.6341758,19.5 18.947971,19.7821539 18.9976334,20.1482294 L19.00448,20.25 C19.00448,20.6296958 18.7223262,20.943491 18.3562506,20.9931534 L18.25448,21 L9.84446231,21.0012505 C9.22825282,21.0348734 8.60085192,20.8163243 8.13013068,20.345603 L3.16160505,15.3770774 C2.28292539,14.4983977 2.28292539,13.0737765 3.16160505,12.1950969 L12.6878888,2.66881311 C13.5665685,1.79013346 14.9911897,1.79013346 15.8698693,2.66881311 Z M11.6976366,17.7582967 L5.7429273,11.8035875 L4.23660183,13.2700937 C3.94370861,13.5629869 3.94370861,14.0378606 4.23660183,14.3307538 L9.1823612,19.2763813 C9.47983601,19.5646202 9.95465072,19.5571329 10.2428895,19.2596581 L11.6976366,17.7582967 Z" /></svg></button>
                <button onMouseEnter={(e) => showTooltip('colorpicker', e)} onMouseLeave={hideTooltip} onClick={() => handleToolSelect('colorpicker')} className={cn(toolButtonClasses, activeTool === 'colorpicker' ? activeToolButtonClasses : inactiveToolButtonClasses)} aria-label="Color Picker Tool">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path style={{fill:'none',stroke:'currentColor',strokeMiterlimit:10,strokeWidth:'1.91px'}} d="M6.34,17.73h0a6.9,6.9,0,0,1,2-4.89L14,7.23l2.86,2.86L11.23,15.7A6.92,6.92,0,0,1,6.34,17.73Z"/>
                        <path style={{fill:'none',stroke:'currentColor',strokeMiterlimit:10,strokeWidth:'1.91px'}} d="M17.32,10.57,13.5,6.75,18,2.29a2.69,2.69,0,0,1,1.91-.79h0a2.7,2.7,0,0,1,2.7,2.7h0a2.73,2.73,0,0,1-.79,1.91Z"/>
                        <line style={{fill:'none',stroke:'currentColor',strokeMiterlimit:10,strokeWidth:'1.91px'}} x1="12.07" y1="5.32" x2="18.75" y2="12"/>
                        <path style={{fill:'none',stroke:'currentColor',strokeMiterlimit:10,strokeWidth:'1.91px'}} d="M6.34,21.55a1,1,0,0,1-1.91,0,6.27,6.27,0,0,1,1-1.91A6.29,6.29,0,0,1,6.34,21.55Z"/>
                    </svg>
                </button>
            </div>
            <div className="mt-auto flex flex-col items-center gap-2">
                <button onMouseEnter={(e) => showTooltip('undo', e)} onMouseLeave={hideTooltip} onClick={handleUndo} disabled={historyIndex <= 0} className={cn(toolButtonClasses, inactiveToolButtonClasses, "disabled:opacity-50 disabled:cursor-not-allowed")} aria-label="Undo"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg></button>
                <button onMouseEnter={(e) => showTooltip('redo', e)} onMouseLeave={hideTooltip} onClick={handleRedo} disabled={historyIndex >= history.length - 1} className={cn(toolButtonClasses, inactiveToolButtonClasses, "disabled:opacity-50 disabled:cursor-not-allowed")} aria-label="Redo"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg></button>
                <div className="relative" onMouseEnter={(e) => showTooltip('colorSwatch', e)} onMouseLeave={hideTooltip}>
                    <label htmlFor="editor-color-picker" className="cursor-pointer block p-1 rounded-lg hover:bg-neutral-700 transition-colors" title="Chọn màu">
                        <div className="w-8 h-8 rounded-full border-2 border-white/50 shadow-lg" style={{ backgroundColor: brushColor }} />
                        <input id="editor-color-picker" type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" />
                    </label>
                </div>
            </div>
        </div>
    );
};