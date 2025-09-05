/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface MagicToolsProps {
    isLoading: boolean;
    handleRemoveBackground: () => void;
    handleInvertColors: () => void;
}

export const MagicTools: React.FC<MagicToolsProps> = ({ isLoading, handleRemoveBackground, handleInvertColors }) => {
    const buttonClasses = "flex-1 p-2 bg-neutral-700 text-neutral-200 rounded-md hover:bg-neutral-600 transition-colors flex items-center justify-center gap-2 text-sm !w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-700";

    return (
        <div className="p-3 space-y-2">
            <button onClick={handleRemoveBackground} className={buttonClasses} disabled={isLoading}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {isLoading ? 'Processing...' : 'Remove Background'}
            </button>
            <button onClick={handleInvertColors} className={buttonClasses} disabled={isLoading}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM2 10a8 8 0 0110.89-7.755 1 1 0 00.04 1.962A6 6 0 0010 4a6 6 0 00-6 6 1 1 0 00-2 0z" clipRule="evenodd" />
                </svg>
                Invert Colors
            </button>
        </div>
    );
};
