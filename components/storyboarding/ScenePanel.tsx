/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppControls, PromptRegenerationModal } from '../uiUtils';
import type { SceneState } from '../uiTypes';
import SceneImageToolbar from './SceneImageToolbar';
import { PencilIcon, LoadingSpinnerIcon, ErrorIcon, StoryboardPlaceholderIcon, DuplicateIcon, RegenerateIcon } from '../icons';
import toast from 'react-hot-toast';

interface ScenePanelProps {
    scene: SceneState;
    index: number;
    allScenes: SceneState[];
    referenceImages: string[];
    onGenerate: (index: number) => void;
    onEditPrompt: (index: number, newDescription: string) => void;
    onImageSourceChange: (index: number, newSource: string) => void;
    onSelectCustomImage: (index: number) => void;
    onEditImage: (index: number) => void;
    onPreviewImage: (index: number) => void;
    onDownloadImage: (index: number) => void;
    onRegeneratePrompt: (index: number, modificationPrompt: string) => void;
}

const ScenePanel: React.FC<ScenePanelProps> = (props) => {
    const {
        scene, index, allScenes, referenceImages, onGenerate, onEditPrompt, onImageSourceChange,
        onSelectCustomImage, onEditImage, onPreviewImage, onDownloadImage, onRegeneratePrompt,
    } = props;

    const { t } = useAppControls();
    const [isEditing, setIsEditing] = useState(false);
    const [editedDescription, setEditedDescription] = useState(scene.description);
    const [isRegenModalOpen, setIsRegenModalOpen] = useState(false);

    const handleSaveEdit = () => {
        if (editedDescription.trim() !== scene.description) {
            onEditPrompt(index, editedDescription);
        }
        setIsEditing(false);
    };

    const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'custom') {
            onSelectCustomImage(index);
        } else {
            onImageSourceChange(index, value);
        }
    };

    const getSourceThumbnail = () => {
        if (scene.imageSource === 'reference') {
            return referenceImages.length > 0 ? referenceImages[0] : null;
        }
        if (scene.imageSource.startsWith('data:image')) {
            return scene.imageSource;
        }
        const sceneIndex = parseInt(scene.imageSource, 10);
        if (!isNaN(sceneIndex) && allScenes[sceneIndex]?.imageUrl) {
            return allScenes[sceneIndex].imageUrl;
        }
        return null;
    };

    const sourceThumbnailUrl = getSourceThumbnail();

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(scene.description);
        toast.success(t('common_promptCopied'));
    };
    
    const handleConfirmRegeneration = (modificationPrompt: string) => {
        onRegeneratePrompt(index, modificationPrompt);
        setIsRegenModalOpen(false);
    };

    return (
        <motion.div
            className="storyboard-panel"
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
        >
            <div className="storyboard-panel-image-container group">
                {scene.status === 'pending' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                        <LoadingSpinnerIcon className="h-8 w-8 text-yellow-400 animate-spin" />
                    </div>
                )}
                {scene.status === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/50 p-2">
                        <ErrorIcon className="h-8 w-8 text-red-400 mb-2" />
                        <p className="text-xs text-red-300 text-center">{scene.error}</p>
                    </div>
                )}
                {scene.imageUrl ? (
                    <>
                        <img src={scene.imageUrl} className="w-full h-full object-contain" alt={`Scene ${scene.scene}`} />
                        <SceneImageToolbar 
                            onEdit={() => onEditImage(index)}
                            onPreview={() => onPreviewImage(index)}
                            onDownload={() => onDownloadImage(index)}
                        />
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-900/50">
                        <StoryboardPlaceholderIcon className="h-20 w-20 text-neutral-700 opacity-60" />
                    </div>
                )}
            </div>
            <div className="storyboard-panel-content">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-yellow-400">{t('storyboarding_scene_title')} {scene.scene}</h4>
                    <div className="flex items-center gap-2">
                        <button onClick={handleCopyPrompt} className="p-1 rounded-full hover:bg-neutral-600 transition-colors" title={t('storyboarding_copyPrompt')}>
                            <DuplicateIcon className="h-4 w-4" strokeWidth="1.5" />
                        </button>
                        <button onClick={() => setIsRegenModalOpen(true)} className="p-1 rounded-full hover:bg-neutral-600 transition-colors" title="Tạo lại prompt">
                            <RegenerateIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => setIsEditing(!isEditing)} className="p-1 rounded-full hover:bg-neutral-600 transition-colors" title={t('storyboarding_editPrompt')}>
                            <PencilIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                {isEditing ? (
                    <textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        onBlur={handleSaveEdit}
                        className="storyboard-panel-textarea"
                        autoFocus
                    />
                ) : (
                    <p className="storyboard-panel-description">{scene.description}</p>
                )}
                <div className="mt-auto pt-2 border-t border-neutral-700/50 space-y-2">
                    <div>
                        <label className="text-xs font-bold text-neutral-400">{t('storyboarding_syncImage')}</label>
                        <div className="flex items-center gap-2 mt-1">
                            <select
                                value={scene.imageSource.startsWith('data:image') ? 'custom' : scene.imageSource}
                                onChange={handleSourceChange}
                                className="form-input !text-xs !py-1 flex-grow"
                            >
                                <option value="reference">{t('storyboarding_sync_reference')}</option>
                                {allScenes.map((s, i) => {
                                    if (i !== index && s.imageUrl) {
                                        return <option key={i} value={String(i)}>{t('storyboarding_sync_scene', s.scene)}</option>;
                                    }
                                    return null;
                                })}
                                <option value="custom">{t('storyboarding_sync_custom')}</option>
                            </select>
                            {sourceThumbnailUrl && (
                                <img src={sourceThumbnailUrl} className="w-8 h-8 object-cover rounded-sm flex-shrink-0 bg-neutral-700" alt="Source preview" />
                            )}
                        </div>
                    </div>
                    <button onClick={() => onGenerate(index)} className="btn btn-secondary !text-xs !py-1.5 !px-4 w-full" disabled={scene.status === 'pending'}>
                        {scene.status === 'pending' ? t('common_creating') : (scene.status === 'done' ? t('common_regenerate') : t('storyboarding_scene_generate'))}
                    </button>
                </div>
            </div>
            <PromptRegenerationModal
                isOpen={isRegenModalOpen}
                onClose={() => setIsRegenModalOpen(false)}
                onConfirm={handleConfirmRegeneration}
                itemToModify={`Prompt Cảnh ${scene.scene}`}
            />
        </motion.div>
    );
};

export default ScenePanel;