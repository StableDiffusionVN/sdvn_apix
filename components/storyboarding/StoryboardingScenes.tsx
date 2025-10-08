/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion } from 'framer-motion';
import ScenePanel from './ScenePanel';
import TransitionPanel from './TransitionPanel';
import type { SceneState } from '../uiTypes';
import { AddIcon } from '../icons';
import { useAppControls } from '../uiUtils';

interface StoryboardingScenesProps {
    scenes: SceneState[];
    referenceImages: string[];
    onGenerateImage: (index: number) => void;
    onEditSceneDescription: (index: number, newDescription: string) => void;
    onEditSceneTransition: (index: number, newTransition: string) => void;
    onImageSourceChange: (index: number, newSource: string) => void;
    onSelectCustomImage: (index: number) => void;
    onEditImage: (index: number) => void;
    onPreviewImage: (index: number) => void;
    onDownloadImage: (index: number) => void;
    onAddScene: () => void;
    onGenerateVideoPrompt: (index: number, promptMode: 'auto' | 'start-end' | 'json') => Promise<void>;
    onEditSceneVideoPrompt: (index: number, newPrompt: string) => void;
    onRegenerateScenePrompt: (index: number, modificationPrompt: string) => void;
    onRegenerateSceneTransition: (index: number, modificationPrompt: string) => void;
}

const StoryboardingScenes: React.FC<StoryboardingScenesProps> = (props) => {
    const {
        scenes, referenceImages, onGenerateImage, onEditSceneDescription, onEditSceneTransition,
        onImageSourceChange, onSelectCustomImage, onEditImage, onPreviewImage, onDownloadImage,
        onAddScene, onGenerateVideoPrompt, onEditSceneVideoPrompt, onRegenerateScenePrompt,
        onRegenerateSceneTransition
    } = props;
    const { t } = useAppControls();

    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(24rem,1fr))] justify-start gap-6 p-4 w-full">
            {scenes.map((scene, index) => (
                <React.Fragment key={scene.scene}>
                    <ScenePanel
                        scene={scene}
                        index={index}
                        allScenes={scenes}
                        referenceImages={referenceImages}
                        onGenerate={onGenerateImage}
                        onEditPrompt={onEditSceneDescription}
                        onImageSourceChange={onImageSourceChange}
                        onSelectCustomImage={onSelectCustomImage}
                        onEditImage={onEditImage}
                        onPreviewImage={onPreviewImage}
                        onDownloadImage={onDownloadImage}
                        onRegeneratePrompt={onRegenerateScenePrompt}
                    />
                    {scene.transition !== undefined && index < scenes.length - 1 && (
                        <TransitionPanel
                            sceneBefore={scene}
                            sceneAfter={scenes[index + 1]}
                            onEditTransition={(newText) => onEditSceneTransition(index, newText)}
                            onGenerateVideoPrompt={(promptMode) => onGenerateVideoPrompt(index, promptMode)}
                            onEditVideoPrompt={(newPrompt) => onEditSceneVideoPrompt(index, newPrompt)}
                            onRegenerateTransition={(modificationPrompt) => onRegenerateSceneTransition(index, modificationPrompt)}
                        />
                    )}
                </React.Fragment>
            ))}
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="storyboard-panel"
            >
                <button
                    onClick={onAddScene}
                    className="w-full h-full flex flex-col items-center justify-center text-neutral-500 hover:text-yellow-400 transition-colors duration-200"
                    aria-label={t('storyboarding_addScene')}
                >
                    <AddIcon className="h-8 w-8" strokeWidth={1.5} />
                    <span className="mt-2 font-bold text-sm">{t('storyboarding_addScene')}</span>
                </button>
            </motion.div>
        </div>
    );
};

export default StoryboardingScenes;