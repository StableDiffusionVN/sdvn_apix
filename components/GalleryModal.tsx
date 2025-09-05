/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadAllImagesAsZip, ImageForZip, useLightbox, useAppControls } from './uiUtils';
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

    const { addImagesToGallery, removeImageFromGallery } = useAppControls();
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            closeLightbox();
        }
    }, [isOpen, closeLightbox]);

    const handleDownloadAll = () => {
        const imagesToZip: ImageForZip[] = images.map((url, index) => ({
            url,
            filename: `aPix-gallery-image-${index + 1}`,
            folder: 'gallery',
            extension: url.startsWith('blob:') ? 'mp4' : undefined,
        }));
        downloadAllImagesAsZip(imagesToZip, 'aPix-gallery.zip');
    };
    
    const handleRemoveClick = (indexToRemove: number) => {
        removeImageFromGallery(indexToRemove);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) {
            return;
        }

        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) {
            return;
        }

        const readImageAsDataURL = (file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        resolve(reader.result);
                    } else {
                        reject(new Error('Failed to read file as Data URL.'));
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        };

        try {
            const imageDataUrls = await Promise.all(imageFiles.map(readImageAsDataURL));
            addImagesToGallery(imageDataUrls);
        } catch (error) {
            console.error("Error reading dropped files:", error);
        }
    };

    return (
        <>
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
                            className="modal-content !max-w-4xl !h-[85vh] flex flex-col relative"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
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
                                    {images.map((img, index) => {
                                        const isVideo = img.startsWith('blob:');
                                        return (
                                            <motion.div 
                                                key={`${img.slice(-20)}-${index}`} 
                                                className="gallery-grid-item group relative" 
                                                onClick={() => openLightbox(index)}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: index * 0.03 }}
                                            >
                                                {isVideo ? (
                                                    <video src={img} autoPlay loop muted playsInline className="w-full h-auto block" />
                                                ) : (
                                                    <img src={img} alt={`Generated image ${index + 1}`} loading="lazy" />
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveClick(index);
                                                    }}
                                                    className="absolute bottom-2 right-2 z-10 p-2 bg-black/60 rounded-full text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                                    aria-label={`Xóa ảnh ${index + 1}`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center text-neutral-400 py-8 flex-1 flex items-center justify-center">
                                    <p>Chưa có ảnh nào được tạo trong phiên này.<br/>Bạn có thể kéo và thả ảnh vào đây để tải lên.</p>
                                </div>
                            )}

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
                                        <p className="text-2xl font-bold text-yellow-400">Thả ảnh vào đây để tải lên</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <Lightbox
                images={images}
                selectedIndex={selectedImageIndex}
                onClose={closeLightbox}
                onNavigate={navigateLightbox}
            />
        </>
    );
};

export default GalleryModal;