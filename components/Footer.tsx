/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const Footer = () => {
    return (
        <footer className="base-font fixed bottom-0 left-0 right-0 bg-black/50 p-3 z-50 text-neutral-300 text-xs sm:text-sm border-t border-white/10">
            <div className="max-w-screen-xl mx-auto flex justify-center items-center gap-4 px-4">
                <div className="flex items-center gap-4 text-neutral-500 whitespace-nowrap">
                    <p>Trang web được phát triển bởi Gemini</p>
                    <span className="text-neutral-700 hidden md:inline" aria-hidden="true">|</span>
                    <p className="hidden md:inline">
                        Tạo bởi{' '}
                        <a
                            href="https://www.facebook.com/phamhungd"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 hover:text-yellow-400 transition-colors duration-200"
                        >
                            @phamhungd
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;