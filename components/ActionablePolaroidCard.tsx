/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useCallback, ChangeEvent } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PolaroidCard from './PolaroidCard';
import { 
    handleFileUpload,
    downloadImage,
    RegenerationModal,
    useImageEditor,
    useAppControls,
} from './uiUtils';

interface ActionablePolaroidCardProps {
    // Core PolaroidCard props
    imageUrl?: string;
    caption: string;
    status: 'pending' | 'done' | 'error';
    error?: string;
    placeholderType?: 'person' | 'architecture' | 'clothing' | 'magic' | 'style';
    isMobile?: boolean;
    onClick?: () => void;
    
    // Action control flags
    isDownloadable?: boolean;
    isEditable?: boolean;
    isSwappable?: boolean;
    isRegeneratable?: boolean;
    isGallerySelectable?: boolean;
    
    // Callbacks for actions
    onImageChange?: (imageDataUrl: string) => void;
    onRegenerate?: (prompt: string) => void;
    
    // Props for modals
    regenerationTitle?: string;
    regenerationDescription?: string;
    regenerationPlaceholder?: string;
}


interface GalleryPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (imageUrl: string) => void;
    images: string[];
}

const GalleryPicker: React.FC<GalleryPickerProps> = ({ isOpen, onClose, onSelect, images }) => {
    if (!isOpen) {
        return null;
    }

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="modal-overlay z-[70]"
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
                            <h3 className="base-font font-bold text-2xl text-yellow-400">Chọn ảnh từ Thư viện</h3>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Đóng thư viện">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="gallery-grid">
                            {images.map((img, index) => (
                                <motion.div
                                    key={`${img.slice(-20)}-${index}`}
                                    className="gallery-grid-item"
                                    onClick={() => onSelect(img)}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.03 }}
                                >
                                    <img src={img} alt={`Generated image ${index + 1}`} loading="lazy" />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};


const ActionablePolaroidCard: React.FC<ActionablePolaroidCardProps> = ({
    imageUrl,
    caption,
    status,
    error,
    placeholderType,
    isMobile,
    onClick,
    isDownloadable = false,
    isEditable = false,
    isSwappable = false,
    isRegeneratable = false,
    isGallerySelectable = false,
    onImageChange,
    onRegenerate,
    regenerationTitle = "Tinh chỉnh ảnh",
    regenerationDescription = "Thêm ghi chú để cải thiện ảnh",
    regenerationPlaceholder = "Ví dụ: tông màu ấm, phong cách phim xưa..."
}) => {
    const { openImageEditor } = useImageEditor();
    const { sessionGalleryImages } = useAppControls();
    const [isRegenModalOpen, setIsRegenModalOpen] = useState(false);
    const [isGalleryPickerOpen, setGalleryPickerOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isGalleryDisabled = sessionGalleryImages.length === 0;

    const handleFileSelected = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        if (onImageChange) {
            handleFileUpload(e, onImageChange);
        }
    }, [onImageChange]);

    const handleSwapClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleEditClick = useCallback(() => {
        if (imageUrl && onImageChange) {
            openImageEditor(imageUrl, onImageChange);
        }
    }, [imageUrl, onImageChange, openImageEditor]);
    
    const handleRegenerateClick = useCallback(() => {
        setIsRegenModalOpen(true);
    }, []);

    const handleConfirmRegeneration = useCallback((prompt: string) => {
        setIsRegenModalOpen(false);
        if (onRegenerate) {
            onRegenerate(prompt);
        }
    }, [onRegenerate]);

    const handleDownloadClick = useCallback(() => {
        if (imageUrl) {
            const filename = `${caption.replace(/[\s()]/g, '-')}.jpg`;
            downloadImage(imageUrl, filename);
        }
    }, [imageUrl, caption]);

    const handleOpenGalleryPicker = useCallback(() => {
        if (!isGalleryDisabled) {
            setGalleryPickerOpen(true);
        }
    }, [isGalleryDisabled]);

    const handleGalleryImageSelect = (selectedImageUrl: string) => {
        if (onImageChange) {
            onImageChange(selectedImageUrl);
        }
        setGalleryPickerOpen(false);
    };


    const showButtons = status === 'done' && imageUrl;

    return (
        <>
            {(isSwappable || isGallerySelectable) && (
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileSelected}
                    // Reset value to allow re-uploading the same file
                    onClick={(e) => (e.currentTarget.value = '')}
                />
            )}
            <PolaroidCard
                imageUrl={imageUrl}
                caption={caption}
                status={status}
                error={error}
                placeholderType={placeholderType}
                isMobile={isMobile}
                onClick={onClick}
                onDownload={showButtons && isDownloadable ? handleDownloadClick : undefined}
                onEdit={showButtons && isEditable ? handleEditClick : undefined}
                onSwapImage={showButtons && isSwappable ? handleSwapClick : undefined}
                onSelectFromGallery={isGallerySelectable ? handleOpenGalleryPicker : undefined}
                isGalleryDisabled={isGalleryDisabled}
                onShake={showButtons && isRegeneratable ? handleRegenerateClick : undefined}
            />
            {isRegeneratable && (
                <RegenerationModal
                    isOpen={isRegenModalOpen}
                    onClose={() => setIsRegenModalOpen(false)}
                    onConfirm={handleConfirmRegeneration}
                    itemToModify={caption}
                    title={regenerationTitle}
                    description={regenerationDescription}
                    placeholder={regenerationPlaceholder}
                />
            )}
            <GalleryPicker
                isOpen={isGalleryPickerOpen}
                onClose={() => setGalleryPickerOpen(false)}
                onSelect={handleGalleryImageSelect}
                images={sessionGalleryImages}
            />
        </>
    );
};

export default ActionablePolaroidCard;