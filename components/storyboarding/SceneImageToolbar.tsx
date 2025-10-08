/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { EditorIcon, FullscreenIcon, DownloadIcon } from '../icons';
import { useAppControls } from '../uiContexts';

interface SceneImageToolbarProps {
    onEdit: () => void;
    onPreview: () => void;
    onDownload: () => void;
}

const SceneImageToolbar: React.FC<SceneImageToolbarProps> = ({ onEdit, onPreview, onDownload }) => {
    const { t } = useAppControls();

    return (
        <div className="absolute top-2 right-2 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label={t('storyboarding_editImage')}
                title={t('storyboarding_editImage')}
            >
                <EditorIcon className="h-5 w-5" />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onPreview(); }}
                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label={t('storyboarding_previewImage')}
                title={t('storyboarding_previewImage')}
            >
                <FullscreenIcon className="h-5 w-5" strokeWidth="1.5" />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onDownload(); }}
                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label={t('storyboarding_downloadImage')}
                title={t('storyboarding_downloadImage')}
            >
                <DownloadIcon className="h-5 w-5" strokeWidth={2} />
            </button>
        </div>
    );
};

export default SceneImageToolbar;