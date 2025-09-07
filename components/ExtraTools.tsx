/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls } from './uiUtils';

const ExtraTools: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
    const { openImageLayoutModal } = useAppControls();

    const tools = [
        {
            id: 'image-layout',
            label: 'Ghép ảnh',
            action: openImageLayoutModal,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:text-yellow-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            ),
        },
        // Các công cụ bổ sung khác có thể được thêm vào đây
    ];

    return (
        <div
            className="fixed top-[60px] right-4 z-20 flex flex-col items-end gap-2"
            aria-live="polite"
            aria-label="Extra tools menu"
        >
            <AnimatePresence>
                {isOpen && tools.map((tool, index) => (
                    <motion.button
                        key={tool.id}
                        onClick={tool.action}
                        className="btn-search group"
                        aria-label={tool.label}
                        title={tool.label}
                        initial={{ opacity: 0, x: 20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1, transition: { delay: index * 0.07, ease: [0.22, 1, 0.36, 1] } }}
                        exit={{ opacity: 0, x: 20, scale: 0.9, transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] } }}
                    >
                        {tool.icon}
                    </motion.button>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ExtraTools;