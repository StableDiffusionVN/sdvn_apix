/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface ImageThumbnailProps {
    index: number;
    imageUrl: string;
    isSelectionMode: boolean;
    isSelected: boolean;
    onSelect: (index: number) => void;
    onEdit?: (index: number, e: React.MouseEvent) => void;
    onDelete: (index: number, e: React.MouseEvent) => void;
}

export const ImageThumbnail: React.FC<ImageThumbnailProps> = ({
    index,
    imageUrl,
    isSelectionMode,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
}) => {
    const isVideo = imageUrl.startsWith('blob:');

    return (
        <motion.div
            className={cn(
                "gallery-grid-item group",
                isSelectionMode ? 'cursor-pointer' : ''
            )}
            onClick={() => onSelect(index)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, delay: index * 0.03 }}
            layout
        >
            {isVideo ? (
                <video src={imageUrl} autoPlay loop muted playsInline className="w-full h-auto block" />
            ) : (
                <img src={imageUrl} alt={`Generated image ${index + 1}`} loading="lazy" />
            )}

            <AnimatePresence>
                {isSelectionMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                            "absolute inset-0 transition-all duration-200 pointer-events-none",
                            isSelected ? 'ring-4 ring-yellow-400 ring-inset' : 'bg-black/60 opacity-0 group-hover:opacity-100'
                        )}
                    >
                        {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-black border-2 border-black/50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {!isSelectionMode && (
                <div className="thumbnail-actions">
                    {!isVideo && onEdit && (
                        <button onClick={(e) => onEdit(index, e)} className="thumbnail-action-btn" aria-label={`Sửa ảnh ${index + 1}`} title="Sửa ảnh">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" /></svg>
                        </button>
                    )}
                    <button onClick={(e) => onDelete(index, e)} className="thumbnail-action-btn hover:!bg-red-600 focus:!ring-red-500" aria-label={`Xóa ảnh ${index + 1}`} title="Xóa ảnh">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            )}
        </motion.div>
    );
};