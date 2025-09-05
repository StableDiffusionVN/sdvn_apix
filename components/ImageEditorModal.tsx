/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, ChangeEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type ImageToEdit, useAppControls, handleFileUpload, GalleryPicker } from './uiUtils';
import { ImageEditorToolbar } from './ImageEditor/ImageEditorToolbar';
import { ImageEditorControls } from './ImageEditor/ImageEditorControls';
import { ImageEditorCanvas } from './ImageEditor/ImageEditorCanvas';
import { useImageEditorState } from './ImageEditor/useImageEditorState';
import { TOOLTIPS } from './ImageEditor/ImageEditor.constants';

// --- Main Image Editor Modal Component ---
interface ImageEditorModalProps {
    imageToEdit: ImageToEdit | null;
    onClose: () => void;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ imageToEdit, onClose }) => {
    const { 
        sessionGalleryImages 
    } = useAppControls();
    
    const editorState = useImageEditorState(imageToEdit);
    const { 
        internalImageUrl, 
        isLoading, 
        isGalleryPickerOpen, 
        setIsGalleryPickerOpen, 
        handleFileSelected,
        handleGallerySelect,
        getFinalImage,
    } = editorState;
    
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [activeTooltip, setActiveTooltip] = useState<{ id: string; rect: DOMRect } | null>(null);
    const tooltipTimeoutRef = useRef<number | null>(null);

    const isOpen = imageToEdit !== null;
    
    const handleSave = useCallback(async () => {
        if (!imageToEdit) return;
        const finalUrl = await getFinalImage();
        if (finalUrl) {
            imageToEdit.onSave(finalUrl);
            onClose();
        }
    }, [getFinalImage, imageToEdit, onClose]);
    
    // --- Tooltip Management ---
    const showTooltip = (id: string, e: React.MouseEvent) => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        const target = e.currentTarget as HTMLElement;
        tooltipTimeoutRef.current = window.setTimeout(() => {
            if (document.body.contains(target)) {
                const rect = target.getBoundingClientRect();
                setActiveTooltip({ id, rect });
            }
        }, 1000);
    };

    const hideTooltip = () => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        setActiveTooltip(null);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="modal-overlay z-[60]" aria-modal="true" role="dialog">
                    <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className="modal-content !max-w-7xl !h-[90vh] image-editor-modal-content relative" tabIndex={-1}>
                        {!internalImageUrl ? (
                             <>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e: ChangeEvent<HTMLInputElement>) => handleFileSelected(e)} onClick={(e) => ((e.target as HTMLInputElement).value = '')} />
                                <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-neutral-900/50 rounded-lg border-2 border-dashed border-neutral-700">
                                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-8 rounded-lg hover:bg-neutral-800/50 transition-colors">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-neutral-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <h4 className="text-xl font-bold text-neutral-200">Upload Image</h4>
                                        <p className="text-neutral-400">Click here to select an image from your computer</p>
                                    </button>
                                    <p className="text-neutral-500">or</p>
                                    <button onClick={() => setIsGalleryPickerOpen(true)} className="btn btn-secondary btn-sm" disabled={sessionGalleryImages.length === 0}>Select from Gallery</button>
                                </div>
                                <GalleryPicker isOpen={isGalleryPickerOpen} onClose={() => setIsGalleryPickerOpen(false)} onSelect={handleGallerySelect} images={sessionGalleryImages} />
                            </>
                        ) : (
                            <div className="flex flex-col md:flex-row gap-4 w-full h-full overflow-hidden">
                                {/* Column 1: Toolbar */}
                                <ImageEditorToolbar {...editorState} showTooltip={showTooltip} hideTooltip={hideTooltip} />

                                {/* Column 2: Preview Canvas */}
                                <div className="flex-1 flex items-center justify-center min-h-0 relative">
                                    <ImageEditorCanvas {...editorState} />
                                </div>

                                {/* Column 3: Controls and Actions */}
                                <div className="flex flex-col flex-shrink-0 md:w-80">
                                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                        <h3 className="base-font font-bold text-2xl text-yellow-400">Image Editor</h3>
                                        <button onClick={() => editorState.resetAll(true)} className="btn btn-secondary btn-sm">Reset All</button>
                                    </div>
                                    <ImageEditorControls {...editorState} />
                                    <div className="flex justify-end items-center gap-2 mt-auto pt-4 border-t border-white/10 flex-shrink-0">
                                        <button onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
                                        <button onClick={editorState.handleApplyAllAdjustments} className="btn btn-secondary btn-sm" disabled={isLoading}>{isLoading ? 'Applying...' : 'Apply'}</button>
                                        <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <AnimatePresence>
                            {activeTooltip && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute z-10 p-2 text-xs text-center text-white bg-neutral-800 border border-neutral-600 rounded-md shadow-lg w-48"
                                    style={{
                                        left: activeTooltip.rect.left - 200, // Position to the left of the button
                                        top: activeTooltip.rect.top + activeTooltip.rect.height / 2,
                                        transform: 'translateY(-50%)',
                                    }}
                                >
                                    <div className="font-bold text-yellow-400">{TOOLTIPS[activeTooltip.id as keyof typeof TOOLTIPS].name}</div>
                                    <div>{TOOLTIPS[activeTooltip.id as keyof typeof TOOLTIPS].description}</div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};