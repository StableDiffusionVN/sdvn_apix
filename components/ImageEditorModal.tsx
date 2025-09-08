/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, ChangeEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type ImageToEdit, useAppControls, handleFileUpload, GalleryPicker, WebcamCaptureModal } from './uiUtils';
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
        sessionGalleryImages,
        t
    } = useAppControls();
    
    const editorState = useImageEditorState(imageToEdit);
    const { 
        internalImageUrl, 
        isLoading, 
        isGalleryPickerOpen, 
        setIsGalleryPickerOpen,
        isWebcamModalOpen,
        setIsWebcamModalOpen,
        handleFile,
        handleFileSelected,
        handleGallerySelect,
        handleWebcamCapture,
        handleCreateBlank,
        getFinalImage,
    } = editorState;
    
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [activeTooltip, setActiveTooltip] = useState<{ id: string; rect: DOMRect } | null>(null);
    const tooltipTimeoutRef = useRef<number | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const isOpen = imageToEdit !== null;
    
    const handleSave = useCallback(async () => {
        if (!imageToEdit) return;
        const finalUrl = await getFinalImage();
        if (finalUrl) {
            imageToEdit.onSave(finalUrl);
            onClose();
        }
    }, [getFinalImage, imageToEdit, onClose]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                handleFile(file);
            }
        }
    }, [handleFile]);
    
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
                                <div
                                    className="w-full h-full flex flex-col items-center justify-center gap-4 bg-neutral-900/50 rounded-lg border-2 border-dashed border-neutral-700 p-8 relative"
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <h3 className="text-2xl font-bold text-yellow-400 base-font">{t('imageEditor_startTitle')}</h3>
                                    <p className="text-neutral-400 text-center max-w-sm">{t('imageEditor_startSubtitle')}</p>
                                    <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                                        <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary btn-sm">{t('imageEditor_uploadButton')}</button>
                                        <button onClick={() => setIsGalleryPickerOpen(true)} className="btn btn-secondary btn-sm" disabled={sessionGalleryImages.length === 0}>{t('imageEditor_galleryButton')}</button>
                                        <button onClick={() => setIsWebcamModalOpen(true)} className="btn btn-secondary btn-sm">{t('imageEditor_webcamButton')}</button>
                                        <button onClick={handleCreateBlank} className="btn btn-secondary btn-sm">{t('imageEditor_createButton')}</button>
                                    </div>
                                    <AnimatePresence>
                                        {isDraggingOver && (
                                            <motion.div
                                                className="absolute inset-0 z-10 bg-black/70 border-4 border-dashed border-yellow-400 rounded-lg flex flex-col items-center justify-center pointer-events-none"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                                <p className="text-2xl font-bold text-yellow-400">{t('imageEditor_dropPrompt')}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <GalleryPicker isOpen={isGalleryPickerOpen} onClose={() => setIsGalleryPickerOpen(false)} onSelect={handleGallerySelect} images={sessionGalleryImages} />
                                <WebcamCaptureModal
                                    isOpen={isWebcamModalOpen}
                                    onClose={() => setIsWebcamModalOpen(false)}
                                    onCapture={handleWebcamCapture}
                                />
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