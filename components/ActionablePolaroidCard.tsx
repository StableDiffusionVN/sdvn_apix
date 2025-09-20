/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useCallback, ChangeEvent, memo } from 'react';
import PolaroidCard from './PolaroidCard';
import { 
    handleFileUpload,
    downloadImage,
    RegenerationModal,
    useImageEditor,
    useAppControls,
    GalleryPicker,
    WebcamCaptureModal,
} from './uiUtils';

// NEW: More descriptive card types to centralize logic
type CardType =
  | 'uploader'          // Generic uploader placeholder for any image type
  | 'photo-input'       // An input that is specifically a user's photograph (e.g., for an avatar)
  | 'sketch-input'      // An input that is a sketch or architectural drawing
  | 'clothing-input'    // An input for a clothing item
  | 'content-input'     // A generic content image for styling or transformation
  | 'style-input'       // An image used for its artistic style
  | 'multi-input'       // A flexible input used in free-form generation
  | 'output'            // A generated result from the AI
  | 'display';          // A read-only card with no actions

interface ActionablePolaroidCardProps {
    // Core PolaroidCard props
    mediaUrl?: string;
    caption: string;
    status: 'pending' | 'done' | 'error';
    error?: string;
    placeholderType?: 'person' | 'architecture' | 'clothing' | 'magic' | 'style';
    isMobile?: boolean;
    onClick?: () => void;
    
    // Role-based prop to determine which buttons to show
    type: CardType;

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
    type,
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
    const [isWebcamModalOpen, setWebcamModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Determine button visibility based on the card's role (type) ---
    const isDownloadable = type === 'output';
    const isEditable = type !== 'uploader' && type !== 'display';
    const isSwappable = type !== 'output' && type !== 'display';
    const isRegeneratable = type === 'output';
    const isGallerySelectable = type !== 'output' && type !== 'display';
    const isWebcamSelectable = type !== 'output' && type !== 'display';
    
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
            const filename = `${caption.replace(/[\s()]/g, '-')}`;
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

    const handleOpenWebcam = useCallback(() => {
        setWebcamModalOpen(true);
    }, []);

    const handleWebcamCapture = (imageDataUrl: string) => {
        if (onImageChange) {
            onImageChange(imageDataUrl);
        }
        setWebcamModalOpen(false);
    };

    // Determine the primary click action for the card.
    // If it's an uploader, its main job is to trigger the file input.
    // Otherwise, use the provided onClick handler (e.g., for opening a lightbox).
    const effectiveOnClick = type === 'uploader' ? handleSwapClick : onClick;

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
                onClick={effectiveOnClick}
                onDownload={showButtons && isDownloadable ? handleDownloadClick : undefined}
                onEdit={showButtons && isEditable ? handleEditClick : undefined}
                onSwapImage={isSwappable ? handleSwapClick : undefined}
                onSelectFromGallery={isGallerySelectable ? handleOpenGalleryPicker : undefined}
                onCaptureFromWebcam={isWebcamSelectable ? handleOpenWebcam : undefined}
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
            <WebcamCaptureModal
                isOpen={isWebcamModalOpen}
                onClose={() => setWebcamModalOpen(false)}
                onCapture={handleWebcamCapture}
            />
        </>
    );
};

export default memo(ActionablePolaroidCard);