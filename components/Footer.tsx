/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useAppControls } from './uiUtils';
import { cn } from '../lib/utils';

type Theme = 'sdvn' | 'vietnam' | 'black-night' | 'clear-sky' | 'skyline' | 'emerald-water' | 'life';

const Footer: React.FC<{}> = () => {
    const { theme, handleThemeChange, t } = useAppControls();

    return (
        <footer className="base-font fixed bottom-0 left-0 right-0 footer-themed-bg p-3 z-50 text-neutral-300 text-xs sm:text-sm border-t border-white/10">
            <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row justify-center sm:justify-between items-center gap-2 sm:gap-4 px-4">
                <div className="text-neutral-400 whitespace-nowrap"> 
                    <a
                        href="http://sdvn.vn/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-yellow-400 transition-colors duration-200"
                    >
                        {t('footer_copyright')}
                    </a>
                </div>
                <div className="flex items-center flex-wrap justify-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="theme-select" className="text-neutral-400 whitespace-nowrap">{t('footer_theme')}:</label>
                        <select
                            id="theme-select"
                            value={theme}
                            onChange={(e) => handleThemeChange(e.target.value as Theme)}
                            className="bg-black/40 border border-white/20 rounded-md px-2 py-1 text-neutral-200 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                            aria-label="Chọn giao diện nền"
                        >
                            <option value="sdvn">SDVN</option>
                            <option value="vietnam">Việt Nam</option>
                            <option value="black-night">Black Night</option>
                            <option value="clear-sky">Clear Sky</option>
                            <option value="skyline">Skyline</option>
                            <option value="emerald-water">Emerald Water</option>
                            <option value="life">Life</option>
                        </select>
                    </div>
                     <a
                        href="https://stablediffusion.vn/gop-y/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-black/40 border border-white/20 rounded-md px-3 py-1 text-neutral-200 focus:ring-2 focus:ring-yellow-400 focus:outline-none hover:bg-black/60 transition-colors"
                        aria-label="Gửi góp ý"
                    >
                        {t('footer_feedback')}
                    </a>
                     <a
                        href="https://stablediffusion.vn/donate/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-black/40 border border-white/20 rounded-md px-3 py-1 text-neutral-200 focus:ring-2 focus:ring-yellow-400 focus:outline-none hover:bg-black/60 transition-colors"
                        aria-label="Donate"
                    >
                        Donate
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;