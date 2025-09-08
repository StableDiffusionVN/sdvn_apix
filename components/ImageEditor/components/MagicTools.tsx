/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { type ImageEditorState } from '../useImageEditorState';
import { useAppControls } from '../../uiUtils';

interface MagicToolsProps extends Pick<
    ImageEditorState,
    'isLoading' | 
    'handleRemoveBackground' | 
    'handleInvertColors' | 
    'aiEditPrompt' | 
    'setAiEditPrompt' | 
    'handleAiEdit' | 
    'isSelectionActive'
> {}

const Spinner = () => (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export const MagicTools: React.FC<MagicToolsProps> = ({ 
    isLoading, 
    handleRemoveBackground, 
    handleInvertColors,
    aiEditPrompt,
    setAiEditPrompt,
    handleAiEdit,
    isSelectionActive
}) => {
    const { t } = useAppControls();
    const buttonClasses = "flex-1 p-2 bg-neutral-700 text-neutral-200 rounded-md hover:bg-neutral-600 transition-colors flex items-center justify-center gap-2 text-sm !w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-700";
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleAiEdit();
    };

    return (
        <div className="p-3 space-y-2">
            <button onClick={handleRemoveBackground} className={buttonClasses} disabled={isLoading}>
                 {isLoading ? <Spinner /> : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                )}
                {isLoading ? 'Đang xử lý...' : 'Xóa nền'}
            </button>
            <button onClick={handleInvertColors} className={buttonClasses} disabled={isLoading}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM2 10a8 8 0 0110.89-7.755 1 1 0 00.04 1.962A6 6 0 0010 4a6 6 0 00-6 6 1 1 0 00-2 0z" clipRule="evenodd" />
                </svg>
                Đảo màu
            </button>
            <div className="border-t border-neutral-700/50 mt-3 pt-3 space-y-2">
                <form onSubmit={handleFormSubmit}>
                    <label htmlFor="ai-edit-prompt" className="base-font font-bold text-neutral-200 text-sm mb-1 block">{t('imageEditor_aiEdit_title')}</label>
                    <textarea
                        id="ai-edit-prompt"
                        value={aiEditPrompt}
                        onChange={(e) => setAiEditPrompt(e.target.value)}
                        placeholder={t('imageEditor_aiEdit_placeholder')}
                        className="form-input !h-20 !text-sm"
                        rows={3}
                        disabled={isLoading}
                    />
                    {isSelectionActive && (
                        <p className="text-xs text-yellow-300/80 mt-1">
                            {t('imageEditor_aiEdit_selectionNote')}
                        </p>
                    )}
                    <button type="submit" className="w-full btn btn-primary btn-sm mt-2 flex items-center justify-center" disabled={isLoading || !aiEditPrompt.trim()}>
                        {isLoading && <Spinner />}
                        {isLoading ? t('imageEditor_aiEdit_loading') : t('imageEditor_aiEdit_button')}
                    </button>
                </form>
            </div>
        </div>
    );
};