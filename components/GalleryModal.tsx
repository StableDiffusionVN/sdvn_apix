/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadImage, downloadAllImagesAsZip, ImageForZip } from './uiUtils';

interface GalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: string[];
}

const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose, images }) => {
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (selectedImageIndex === null) return;
        if (e.key === 'Escape') {
            handleCloseLightbox();
        } else if (e.key === 'ArrowRight') {
            handleNext();
        } else if (e.key === 'ArrowLeft') {
            handlePrev();
        }
    }, [selectedImageIndex, images.length]);

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        } else {
            // Reset state when modal is closed
            setSelectedImageIndex(null);
            window.removeEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleKeyDown]);

    const handleCloseLightbox = () => {
        setSelectedImageIndex(null);
    };

    const handleImageClick = (index: number) => {
        setSelectedImageIndex(index);
    };

    const handleNext = () => {
        if (selectedImageIndex !== null) {
            setSelectedImageIndex((selectedImageIndex + 1) % images.length);
        }
    };
    
    const handlePrev = () => {
        if (selectedImageIndex !== null) {
            setSelectedImageIndex((selectedImageIndex - 1 + images.length) % images.length);
        }
    };

    const handleDownloadCurrent = () => {
        if (selectedImageIndex !== null && images[selectedImageIndex]) {
            downloadImage(images[selectedImageIndex], `aPix-gallery-image-${selectedImageIndex + 1}.jpg`);
        }
    };

    const handleDownloadAll = () => {
        const imagesToZip: ImageForZip[] = images.map((url, index) => ({
            url,
            filename: `aPix-gallery-image-${index + 1}`,
            folder: 'gallery'
        }));
        downloadAllImagesAsZip(imagesToZip, 'aPix-gallery.zip');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="modal-overlay"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="modal-content !max-w-4xl !h-[85vh] flex flex-col"
                    >
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                             <h3 className="base-font font-bold text-2xl text-yellow-400">Thư viện ảnh</h3>
                             <div className="flex items-center gap-2">
                                <button onClick={handleDownloadAll} className="btn btn-secondary btn-sm" disabled={images.length === 0}>Tải tất cả</button>
                                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Đóng thư viện">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                             </div>
                        </div>
                        {images.length > 0 ? (
                            <div className="gallery-grid">
                                {images.map((img, index) => (
                                    <motion.div 
                                        key={`${img.slice(-20)}-${index}`} 
                                        className="gallery-grid-item" 
                                        onClick={() => handleImageClick(index)}
                                        layoutId={`gallery-image-${index}`}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.03 }}
                                    >
                                        <img src={img} alt={`Generated image ${index + 1}`} loading="lazy" />
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-neutral-400 py-8 flex-1 flex items-center justify-center">
                                <p>Chưa có ảnh nào được tạo trong phiên này.</p>
                            </div>
                        )}
                    </motion.div>

                    <AnimatePresence>
                        {selectedImageIndex !== null && (
                            <motion.div className="gallery-lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <motion.div className="gallery-lightbox-backdrop" onClick={handleCloseLightbox} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}></motion.div>
                                
                                <button className="gallery-nav-btn close" onClick={handleCloseLightbox} aria-label="Đóng">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                                <button className="gallery-nav-btn prev" onClick={handlePrev} aria-label="Ảnh trước">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button className="gallery-nav-btn next" onClick={handleNext} aria-label="Ảnh sau">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                                <motion.div className="relative w-full h-full flex items-center justify-center p-16">
                                <motion.img
                                    key={selectedImageIndex}
                                    layoutId={`gallery-image-${selectedImageIndex}`}
                                    src={images[selectedImageIndex]}
                                    alt={`Generated image ${selectedImageIndex + 1}`}
                                    className="gallery-lightbox-img"
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                />
                                </motion.div>
                                <div className="gallery-lightbox-actions">
                                    <button onClick={handleDownloadCurrent} className="btn btn-primary btn-sm">Tải ảnh này</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GalleryModal;