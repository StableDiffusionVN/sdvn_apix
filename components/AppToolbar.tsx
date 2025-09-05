/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls, useImageEditor } from './uiUtils';

const AppToolbar: React.FC = () => {
    const {
        currentView,
        historyIndex,
        viewHistory,
        handleGoHome,
        handleGoBack,
        handleGoForward,
        handleOpenGallery,
        handleOpenSearch,
        handleOpenInfo,
        addImagesToGallery
    } = useAppControls();

    const { openEmptyImageEditor, imageToEdit } = useImageEditor();

    const [activeTooltip, setActiveTooltip] = useState<{ text: string; rect: DOMRect } | null>(null);
    const tooltipTimeoutRef = useRef<number | null>(null);

    const showTooltip = (text: string, e: React.MouseEvent) => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        const target = e.currentTarget as HTMLElement;
        tooltipTimeoutRef.current = window.setTimeout(() => {
            if (document.body.contains(target)) {
                const rect = target.getBoundingClientRect();
                setActiveTooltip({ text, rect });
            }
        }, 500);
    };

    const hideTooltip = () => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        setActiveTooltip(null);
    };


    const handleOpenEditor = useCallback(() => {
        openEmptyImageEditor((newUrl) => {
            addImagesToGallery([newUrl]);
        });
    }, [openEmptyImageEditor, addImagesToGallery]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            // Ignore if user is typing in an input/textarea to avoid hijacking browser functionality.
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const isEditorOpen = imageToEdit !== null;

            const isUndo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
            const isRedo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && e.shiftKey;
            const isSearch = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f';
            const isGallery = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g';
            const isHome = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'h';
            const isInfo = (e.metaKey || e.ctrlKey) && e.key === '/';
            const isEditor = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e';

            if (isUndo && !isEditorOpen) {
                e.preventDefault();
                handleGoBack();
            } else if (isRedo && !isEditorOpen) {
                e.preventDefault();
                handleGoForward();
            } else if (isSearch) {
                e.preventDefault();
                handleOpenSearch();
            } else if (isGallery) {
                e.preventDefault();
                handleOpenGallery();
            } else if (isHome) {
                e.preventDefault();
                handleGoHome();
            } else if (isInfo) {
                e.preventDefault();
                handleOpenInfo();
            } else if (isEditor) {
                e.preventDefault();
                handleOpenEditor();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleGoBack, handleGoForward, handleOpenSearch, handleOpenGallery, handleOpenInfo, handleGoHome, handleOpenEditor, imageToEdit]);

    return (
        <>
            <div className="fixed top-4 right-4 z-20 flex items-center gap-2">
                <button
                    onClick={handleGoHome}
                    className="btn-search"
                    aria-label="Trở về trang chủ (Cmd/Ctrl+H)"
                    disabled={currentView.viewId === 'home'}
                    onMouseEnter={(e) => showTooltip("Trang chủ (Cmd/Ctrl+H)", e)}
                    onMouseLeave={hideTooltip}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                       <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                </button>
                <button
                    onClick={handleGoBack}
                    className="btn-search"
                    aria-label="Quay lại (Cmd/Ctrl+Z)"
                    disabled={historyIndex <= 0}
                    onMouseEnter={(e) => showTooltip("Quay lại (Cmd/Ctrl+Z)", e)}
                    onMouseLeave={hideTooltip}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15l-6-6m0 0l6-6m-6 6h13.5a5.5 5.5 0 010 11H10" />
                    </svg>
                </button>
                <button
                    onClick={handleGoForward}
                    className="btn-search"
                    aria-label="Tiến lên (Cmd/Ctrl+Shift+Z)"
                    disabled={historyIndex >= viewHistory.length - 1}
                    onMouseEnter={(e) => showTooltip("Tiến lên (Cmd/Ctrl+Shift+Z)", e)}
                    onMouseLeave={hideTooltip}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H6.5a5.5 5.5 0 000 11H10" />
                    </svg>
                </button>
                <button
                    onClick={handleOpenGallery}
                    className="btn-gallery"
                    aria-label="Mở thư viện ảnh (Cmd/Ctrl+G)"
                    onMouseEnter={(e) => showTooltip("Thư viện ảnh (Cmd/Ctrl+G)", e)}
                    onMouseLeave={hideTooltip}
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </button>
                <button
                    onClick={handleOpenEditor}
                    className="btn-search"
                    aria-label="Mở trình chỉnh sửa ảnh (Cmd/Ctrl+E)"
                    onMouseEnter={(e) => showTooltip("Trình chỉnh sửa ảnh (Cmd/Ctrl+E)", e)}
                    onMouseLeave={hideTooltip}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                    </svg>
                </button>
                <button
                    onClick={handleOpenSearch}
                    className="btn-search"
                    aria-label="Tìm kiếm ứng dụng (Cmd/Ctrl+F)"
                    onMouseEnter={(e) => showTooltip("Tìm kiếm (Cmd/Ctrl+F)", e)}
                    onMouseLeave={hideTooltip}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>
                <button
                    onClick={handleOpenInfo}
                    className="btn-search"
                    aria-label="Mở hướng dẫn (Cmd/Ctrl+/)"
                    onMouseEnter={(e) => showTooltip("Hướng dẫn (Cmd/Ctrl+/)", e)}
                    onMouseLeave={hideTooltip}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </div>
            <AnimatePresence>
                {activeTooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed z-50 p-2 text-xs text-center text-white bg-neutral-900/80 backdrop-blur-sm border border-white/10 rounded-md shadow-lg pointer-events-none"
                        style={{
                            top: activeTooltip.rect.bottom + 8,
                            left: activeTooltip.rect.left + activeTooltip.rect.width / 2,
                            transform: 'translateX(-50%)',
                        }}
                    >
                        {activeTooltip.text}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AppToolbar;