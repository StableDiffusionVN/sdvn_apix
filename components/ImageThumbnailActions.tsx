/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface ImageThumbnailActionsProps {
    isSelectionMode: boolean;
    isVideo: boolean;
    onEdit?: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    onQuickView?: (e: React.MouseEvent) => void;
}

export const ImageThumbnailActions: React.FC<ImageThumbnailActionsProps> = ({
    isSelectionMode,
    isVideo,
    onEdit,
    onDelete,
    onQuickView,
}) => {
    if (isSelectionMode) {
        return null;
    }

    return (
        <div className="thumbnail-actions">
            {onQuickView && (
                <button onClick={onQuickView} className="thumbnail-action-btn" aria-label="Xem nhanh" title="Xem nhanh">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </button>
            )}
            {!isVideo && onEdit && (
                <button onClick={onEdit} className="thumbnail-action-btn" aria-label="Sửa ảnh" title="Sửa ảnh">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" /></svg>
                </button>
            )}
            <button onClick={onDelete} className="thumbnail-action-btn hover:!bg-red-600 focus:!ring-red-500" aria-label="Xóa ảnh" title="Xóa ảnh">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            </button>
        </div>
    );
};