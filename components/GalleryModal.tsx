/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadAllImagesAsZip, ImageForZip, useLightbox } from './uiUtils';
import Lightbox from './Lightbox';

interface GalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: string[];
}

const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose, images }) => {
    const { 
        lightboxIndex: selectedImageIndex, 
        openLightbox, 
        closeLightbox, 
        navigateLightbox 
    } = useLightbox();

    useEffect(() => {
        if (!isOpen) {
            closeLightbox();
        }
    }, [isOpen, closeLightbox]);

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
                                        onClick={() => openLightbox(index)}
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

                    <Lightbox
                        images={images}
                        selectedIndex={selectedImageIndex}
                        onClose={closeLightbox}
                        onNavigate={navigateLightbox}
                    />

                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GalleryModal;