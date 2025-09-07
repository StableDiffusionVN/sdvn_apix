/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useAuth } from './uiUtils';

const UserStatus: React.FC = () => {
    const { currentUser, logout } = useAuth();

    if (!currentUser) return null;

    return (
        <div className="fixed top-4 left-4 z-20">
            <button 
                onClick={logout}
                className="group flex items-center gap-2 rounded-full bg-black/30 pl-4 pr-3 py-1.5 text-sm text-neutral-200 backdrop-blur-sm border border-white/10 hover:bg-red-500/80 hover:border-red-500/90 transition-all duration-200"
                aria-label={`Đăng xuất tài khoản ${currentUser}`}
            >
                <span className="font-bold text-yellow-400">{currentUser}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
            </button>
        </div>
    );
};

export default UserStatus;