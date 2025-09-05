/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadImage } from './uiUtils';

interface LightboxProps {
    images: string[];
    selectedIndex: number | null;
    onClose: () => void;
    onNavigate: (newIndex: number) => void;
}

const Lightbox: React.FC<LightboxProps> = ({ images, selectedIndex, onClose, onNavigate }) => {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (selectedIndex === null) return;
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowRight' && images.length > 1) {
            onNavigate((selectedIndex + 1) % images.length);
        } else if (e.key === 'ArrowLeft' && images.length > 1) {
            onNavigate((selectedIndex - 1 + images.length) % images.length);
        }
    }, [selectedIndex, images.length, onClose, onNavigate]);

    useEffect(() => {
        if (selectedIndex !== null) {
            window.addEventListener('keydown', handleKeyDown);
        } else {
            window.removeEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedIndex, handleKeyDown]);

    const handleDownloadCurrent = () => {
        if (selectedIndex !== null && images[selectedIndex]) {
            const url = images[selectedIndex];
            const extension = url.startsWith('blob:') ? 'mp4' : 'jpg';
            downloadImage(url, `aPix-image-${selectedIndex + 1}.${extension}`);
        }
    };

    return (
        <AnimatePresence>
            {selectedIndex !== null && (
                <motion.div className="gallery-lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div className="gallery-lightbox-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}></motion.div>
                    
                    <div className="relative w-full h-full flex items-center justify-center" onClick={onClose}>
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={selectedIndex}
                                className="relative" 
                                onClick={(e) => e.stopPropagation()} // Prevent click on image from closing lightbox
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                            >
                                {images[selectedIndex].startsWith('blob:') ? (
                                    <video
                                        src={images[selectedIndex]}
                                        controls
                                        autoPlay
                                        className="gallery-lightbox-img"
                                    />
                                ) : (
                                    <img
                                        src={images[selectedIndex]}
                                        alt={`Generated image ${selectedIndex + 1}`}
                                        className="gallery-lightbox-img"
                                    />
                                )}
                                <button 
                                    className="lightbox-action-btn"
                                    onClick={handleDownloadCurrent}
                                    aria-label="Tải ảnh này"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Lightbox;