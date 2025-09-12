/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useAppControls } from '../uiUtils';

interface StartScreenProps {
    onCreateNew: () => void;
    onOpenGallery: () => void;
    onUpload: () => void;
    onOpenWebcam: () => void;
    hasGalleryImages: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({
    onCreateNew, onOpenGallery, onUpload, onOpenWebcam, hasGalleryImages
}) => {
    const { t } = useAppControls();
    
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-neutral-900/50 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-yellow-400 base-font">{t('layerComposer_title')}</h3>
            <p className="text-neutral-400 text-center max-w-sm">Tạo canvas mới, tải lên ảnh hoặc kéo thả file .json để bắt đầu.</p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                <button onClick={onCreateNew} className="btn btn-primary btn-sm">{t('imageEditor_createButton')}</button>
                <button onClick={onOpenGallery} className="btn btn-secondary btn-sm" disabled={!hasGalleryImages}>{t('imageEditor_galleryButton')}</button>
                <button onClick={onUpload} className="btn btn-secondary btn-sm">{t('imageEditor_uploadButton')}</button>
                <button onClick={onOpenWebcam} className="btn btn-secondary btn-sm">{t('imageEditor_webcamButton')}</button>
            </div>
        </div>
    );
};