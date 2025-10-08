/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppControls, PromptRegenerationModal } from '../uiUtils';
import { PencilIcon, DuplicateIcon, LoadingSpinnerIcon, RegenerateIcon, AnimationLineIcon } from '../icons';
import { generateVideoPromptFromScenes } from '../../services/geminiService';
import toast from 'react-hot-toast';
import type { SceneState } from '../uiTypes';

interface TransitionPanelProps {
    sceneBefore: SceneState;
    sceneAfter: SceneState;
    onEditTransition: (newText: string) => void;
    onGenerateVideoPrompt: (promptMode: 'auto' | 'start-end' | 'json') => Promise<void>;
    onEditVideoPrompt: (newPrompt: string) => void;
    onRegenerateTransition: (modificationPrompt: string) => void;
}

const TransitionPanel: React.FC<TransitionPanelProps> = ({ sceneBefore, sceneAfter, onEditTransition, onGenerateVideoPrompt, onEditVideoPrompt, onRegenerateTransition }) => {
    const { t, language } = useAppControls();
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(sceneBefore.transition || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [promptMode, setPromptMode] = useState<'auto' | 'start-end' | 'json'>('auto');

    const [isEditingVideoPrompt, setIsEditingVideoPrompt] = useState(false);
    const [editedVideoPrompt, setEditedVideoPrompt] = useState(sceneBefore.videoPrompt || '');
    const [isRegenModalOpen, setIsRegenModalOpen] = useState(false);

    useEffect(() => {
        setEditedVideoPrompt(sceneBefore.videoPrompt || '');
    }, [sceneBefore.videoPrompt]);

    const handleSaveVideoPrompt = () => {
        onEditVideoPrompt(editedVideoPrompt);
        setIsEditingVideoPrompt(false);
    };

    const handleSave = () => {
        if (editedText.trim() !== (sceneBefore.transition || '')) {
            onEditTransition(editedText);
        }
        setIsEditing(false);
    };

    const handleCopyTransition = () => {
        if (!sceneBefore.transition) return;
        navigator.clipboard.writeText(sceneBefore.transition);
        toast.success(t('common_promptCopied'));
    };
    
    const handleCopyVideoPrompt = () => {
        if (!sceneBefore.videoPrompt) return;
        navigator.clipboard.writeText(sceneBefore.videoPrompt);
        toast.success(t('common_promptCopied'));
    };

    const handleGenerateVideoPrompt = async () => {
        setIsGenerating(true);
        try {
            await onGenerateVideoPrompt(promptMode);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Error";
            toast.error(`Failed to generate video prompt: ${errorMessage}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleConfirmRegeneration = (modificationPrompt: string) => {
        onRegenerateTransition(modificationPrompt);
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
            <div className="storyboard-panel-image-container group flex flex-col">
                 <div className="p-3 h-full flex flex-col">
                    <div className="flex justify-end items-center mb-1 flex-shrink-0">
                         <div className="flex items-center gap-1">
                            <button onClick={handleCopyVideoPrompt} className="p-1 rounded-full hover:bg-neutral-600 transition-colors" title={t('storyboarding_copyPrompt')}>
                                <DuplicateIcon className="h-4 w-4" strokeWidth="1.5" />
                            </button>
                            <button onClick={() => setIsEditingVideoPrompt(true)} className="p-1 rounded-full hover:bg-neutral-600 transition-colors" title="Chỉnh sửa prompt video">
                                <PencilIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    {sceneBefore.videoPrompt || isEditingVideoPrompt ? (
                        isEditingVideoPrompt ? (
                             <textarea 
                                value={editedVideoPrompt} 
                                onChange={(e) => setEditedVideoPrompt(e.target.value)} 
                                onBlur={handleSaveVideoPrompt}
                                className="storyboard-panel-textarea !bg-neutral-900 w-full flex-grow"
                                style={{maxHeight: 'none', resize: 'none'}}
                                autoFocus
                            />
                        ) : (
                            <div 
                                onClick={() => setIsEditingVideoPrompt(true)}
                                className="bg-neutral-900 p-2 rounded flex-grow min-h-0 overflow-y-auto text-xs text-neutral-300 whitespace-pre-wrap storyboard-panel-description cursor-text" 
                                style={{maxHeight: 'none'}}
                            >
                                {sceneBefore.videoPrompt}
                            </div>
                        )
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-900 rounded">
                            <AnimationLineIcon className="h-16 w-16 text-neutral-700 opacity-60" />
                        </div>
                    )}
                </div>
            </div>
            <div className="storyboard-panel-content">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-yellow-400">Chuyển cảnh</h4>
                    <div className="flex items-center gap-2">
                        <button onClick={handleCopyTransition} className="p-1 rounded-full hover:bg-neutral-600 transition-colors" title={t('storyboarding_copyPrompt')} disabled={!sceneBefore.transition}>
                            <DuplicateIcon className="h-4 w-4" strokeWidth="1.5" />
                        </button>
                        <button onClick={() => setIsRegenModalOpen(true)} className="p-1 rounded-full hover:bg-neutral-600 transition-colors" title="Tạo lại chuyển cảnh">
                            <RegenerateIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => setIsEditing(!isEditing)} className="p-1 rounded-full hover:bg-neutral-600 transition-colors" title="Chỉnh sửa chuyển cảnh">
                            <PencilIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                {isEditing ? (
                    <textarea value={editedText} onChange={(e) => setEditedText(e.target.value)} onBlur={handleSave} placeholder="Mô tả chuyển cảnh..." className="storyboard-panel-textarea" autoFocus />
                ) : (
                    <p className="storyboard-panel-description italic">
                        {sceneBefore.transition || 'Mô tả chuyển cảnh...'}
                    </p>
                )}

                <div className="mt-auto pt-3 border-t border-neutral-700/50 space-y-2">
                    <div>
                        <label className="text-xs font-bold text-neutral-400">{t('storyboarding_promptMode')}</label>
                        <select
                            value={promptMode}
                            onChange={(e) => setPromptMode(e.target.value as 'auto' | 'start-end' | 'json')}
                            className="form-input !text-xs !py-1 w-full mt-1"
                        >
                            <option value="auto">{t('storyboarding_promptMode_auto')}</option>
                            <option value="start-end">{t('storyboarding_promptMode_startEnd')}</option>
                            <option value="json">{t('storyboarding_promptMode_json')}</option>
                        </select>
                    </div>
                    <button onClick={handleGenerateVideoPrompt} className="btn btn-secondary !text-xs !py-1.5 !px-4 w-full flex items-center justify-center" disabled={isGenerating}>
                        {isGenerating ? <LoadingSpinnerIcon className="h-4 w-4 animate-spin"/> : 'Tạo prompt video'}
                    </button>
                </div>
            </div>
            <PromptRegenerationModal
                isOpen={isRegenModalOpen}
                onClose={() => setIsRegenModalOpen(false)}
                onConfirm={handleConfirmRegeneration}
                itemToModify={`Chuyển cảnh sau Cảnh ${sceneBefore.scene}`}
            />
        </motion.div>
    );
};

export default TransitionPanel;