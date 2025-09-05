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
    mediaUrl?: string;
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
    onGenerateVideoFromPrompt?: (prompt: string) => void;
    
    // Props for modals
    regenerationTitle?: string;
    regenerationDescription?: string;
    regenerationPlaceholder?: string;
}


const ActionablePolaroidCard: React.FC<ActionablePolaroidCardProps> = ({
    mediaUrl,
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
    onGenerateVideoFromPrompt,
    regenerationTitle,
    regenerationDescription,
    regenerationPlaceholder,
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
        if (mediaUrl && onImageChange) {
            openImageEditor(mediaUrl, onImageChange);
        }
    }, [mediaUrl, onImageChange, openImageEditor]);
    
    const handleRegenerateClick = useCallback(() => {
        setIsRegenModalOpen(true);
    }, []);

    const handleConfirmImage = useCallback((prompt: string) => {
        setIsRegenModalOpen(false);
        if (onRegenerate) {
            onRegenerate(prompt);
        }
    }, [onRegenerate]);

    const handleConfirmVideo = useCallback((prompt: string) => {
        setIsRegenModalOpen(false);
        if (onGenerateVideoFromPrompt) {
            onGenerateVideoFromPrompt(prompt);
        }
    }, [onGenerateVideoFromPrompt]);

    const handleDownloadClick = useCallback(() => {
        if (mediaUrl) {
            const isVideo = mediaUrl.startsWith('blob:');
            const extension = isVideo ? 'mp4' : 'jpg';
            const filename = `${caption.replace(/[\s()]/g, '-')}.${extension}`;
            downloadImage(mediaUrl, filename);
        }
    }, [mediaUrl, caption]);

    const handleOpenGalleryPicker = useCallback(() => {
        setGalleryPickerOpen(true);
    }, []);

    const handleGalleryImageSelect = (selectedImageUrl: string) => {
        if (onImageChange) {
            onImageChange(selectedImageUrl);
        }
        setGalleryPickerOpen(false);
    };


    const showButtons = status === 'done' && mediaUrl;
    const canDoSomething = isRegeneratable || !!onGenerateVideoFromPrompt;

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
                mediaUrl={mediaUrl}
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
                onShake={showButtons && canDoSomething ? handleRegenerateClick : undefined}
            />
            {canDoSomething && (
                <RegenerationModal
                    isOpen={isRegenModalOpen}
                    onClose={() => setIsRegenModalOpen(false)}
                    onConfirmImage={handleConfirmImage}
                    onConfirmVideo={onGenerateVideoFromPrompt ? handleConfirmVideo : undefined}
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