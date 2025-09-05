/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useCallback, ChangeEvent } from 'react';
import PolaroidCard from './PolaroidCard';
import { 
    handleFileUpload,
    downloadImage,
    RegenerationModal,
    useImageEditor,
    useAppControls,
    GalleryPicker,
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
        setGalleryPickerOpen(true);
    }, []);

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