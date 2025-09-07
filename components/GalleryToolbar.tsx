/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface GalleryToolbarProps {
    isSelectionMode: boolean;
    selectedCount: number;
    imageCount: number;
    title: string;
    isCombining?: boolean;
    onToggleSelectionMode: () => void;
    onDeleteSelected: () => void;
    onClose: () => void;
    onDownloadAll?: () => void; // Optional for contexts where download isn't needed
    onCombineHorizontal?: () => void;
    onCombineVertical?: () => void;
}

export const GalleryToolbar: React.FC<GalleryToolbarProps> = ({
    isSelectionMode,
    selectedCount,
    imageCount,
    title,
    isCombining,
    onToggleSelectionMode,
    onDeleteSelected,
    onClose,
    onDownloadAll,
    onCombineHorizontal,
    onCombineVertical,
}) => {
    if (isSelectionMode) {
        return (
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="base-font font-bold text-2xl text-yellow-400">Đã chọn: {selectedCount}</h3>
                <div className="flex items-center gap-2">
                    {onCombineHorizontal && (
                        <button onClick={onCombineHorizontal} className="btn btn-secondary btn-sm" disabled={selectedCount < 2 || isCombining}>
                            {isCombining ? 'Đang ghép...' : 'Ghép ngang'}
                        </button>
                    )}
                    {onCombineVertical && (
                         <button onClick={onCombineVertical} className="btn btn-secondary btn-sm" disabled={selectedCount < 2 || isCombining}>
                             {isCombining ? 'Đang ghép...' : 'Ghép dọc'}
                        </button>
                    )}
                    <div className="w-px h-5 bg-white/20" />
                    <button onClick={onDeleteSelected} className="btn btn-secondary btn-sm !bg-red-500/20 !border-red-500/80 hover:!bg-red-500" disabled={selectedCount === 0 || isCombining}>
                        Xóa
                    </button>
                    <button onClick={onToggleSelectionMode} className="btn btn-secondary btn-sm" aria-label="Hủy chọn" disabled={isCombining}>
                       Hủy
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h3 className="base-font font-bold text-2xl text-yellow-400">{title}</h3>
            <div className="flex items-center gap-2">
               {onDownloadAll && <button onClick={onDownloadAll} className="btn btn-secondary btn-sm" disabled={imageCount === 0}>Tải tất cả</button>}
               <button onClick={onToggleSelectionMode} className="btn btn-secondary btn-sm" disabled={imageCount === 0}>Chọn</button>
               <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Đóng thư viện">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
       </div>
    );
};