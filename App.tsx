/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Footer from './components/Footer';
import Home from './components/Home';
import ArchitectureIdeator from './components/ArchitectureIdeator';
import AvatarCreator from './components/AvatarCreator';
import DressTheModel from './components/DressTheModel';
import PhotoRestoration from './components/PhotoRestoration';
import ImageToReal from './components/ImageToReal';
import SwapStyle from './components/SwapStyle';
import MixStyle from './components/MixStyle';
import FreeGeneration from './components/FreeGeneration';
import ToyModelCreator from './components/ToyModelCreator';
import SearchModal from './components/SearchModal';
import GalleryModal from './components/GalleryModal';
import InfoModal from './components/InfoModal';
import { ImageEditorModal } from './components/ImageEditorModal';
import {
    renderSmartlyWrappedTitle,
    type AnyAppState,
    type HomeState,
    type ArchitectureIdeatorState,
    type AvatarCreatorState,
    type DressTheModelState,
    type PhotoRestorationState,
    type ImageToRealState,
    type SwapStyleState,
    type MixStyleState,
    type FreeGenerationState,
    type ToyModelCreatorState,
    getInitialStateForApp,
    useImageEditor,
} from './components/uiUtils';


interface AppConfig {
    id: string;
    title: string;
    description: string;
    icon: string;
}

type HomeView = { viewId: 'home'; state: HomeState };
type ArchitectureIdeatorView = { viewId: 'architecture-ideator'; state: ArchitectureIdeatorState };
type AvatarCreatorView = { viewId: 'avatar-creator'; state: AvatarCreatorState };
type DressTheModelView = { viewId: 'dress-the-model'; state: DressTheModelState };
type PhotoRestorationView = { viewId: 'photo-restoration'; state: PhotoRestorationState };
type ImageToRealView = { viewId: 'image-to-real'; state: ImageToRealState };
type SwapStyleView = { viewId: 'swap-style'; state: SwapStyleState };
type MixStyleView = { viewId: 'mix-style'; state: MixStyleState };
type FreeGenerationView = { viewId: 'free-generation'; state: FreeGenerationState };
type ToyModelCreatorView = { viewId: 'toy-model-creator'; state: ToyModelCreatorState };

type ViewState =
  | HomeView
  | ArchitectureIdeatorView
  | AvatarCreatorView
  | DressTheModelView
  | PhotoRestorationView
  | ImageToRealView
  | SwapStyleView
  | MixStyleView
  | FreeGenerationView
  | ToyModelCreatorView;


type Theme = 'sdvn' | 'vietnam' | 'dark' | 'dark-green' | 'dark-blue';

function App() {
    const [viewHistory, setViewHistory] = useState<ViewState[]>([{ viewId: 'home', state: { stage: 'home' } }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const currentView = viewHistory[historyIndex];
    const [theme, setTheme] = useState<Theme>('vietnam');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [sessionGalleryImages, setSessionGalleryImages] = useState<string[]>([]);
    const { imageToEdit, openImageEditor, closeImageEditor } = useImageEditor();
    const [settings, setSettings] = useState({
        home: {
            mainTitle: "Tự hào Việt Nam",
            subtitle: "Hãy chọn ứng dụng và bắt đầu sáng tạo",
            useSmartTitleWrapping: true,
            smartTitleWrapWords: 2,
        },
        apps: [
            {
              id: 'avatar-creator',
              title: 'Tạo avatar yêu nước',
              description: 'Biến ảnh chân dung của bạn thành một tác phẩm nghệ thuật thể hiện niềm tự hào dân tộc.',
              icon: '🇻🇳',
            },
            {
              id: 'architecture-ideator',
              title: 'Lên ý tưởng kiến trúc',
              description: 'Biến các ảnh phác thảo kiến trúc (vẽ tay, sketch, 3D) thành ảnh thật, sống động.',
              icon: '🏛️',
            },
            {
              id: 'dress-the-model',
              title: 'Mặc trang phục cho mẫu',
              description: 'Thử trang phục mới cho người mẫu từ ảnh của bạn, giữ nguyên khuôn mặt và vóc dáng.',
              icon: '👗',
            }
        ] as AppConfig[],
        avatarCreator: {
            mainTitle: "Tạo Avatar Yêu Nước",
            subtitle: "Chọn ảnh và ý tưởng để bắt đầu",
            minIdeas: 1,
            maxIdeas: 6,
            useSmartTitleWrapping: true,
            smartTitleWrapWords: 3,
            uploaderCaption: "Tải ảnh của bạn",
            uploaderDescription: "Nhấn vào khung ảnh để tải ảnh và bắt đầu sáng tạo",
        },
        architectureIdeator: {
            mainTitle: "Lên ý tưởng kiến trúc",
            subtitle: "Biến phác thảo của bạn thành hiện thực",
            useSmartTitleWrapping: true,
            smartTitleWrapWords: 2,
            uploaderCaption: "Tải ảnh phác thảo",
            uploaderDescription: "Nhấn vào khung ảnh để tải lên bản vẽ, sketch, hoặc ảnh 3D",
        },
        dressTheModel: {
            mainTitle: "Mặc Trang Phục Cho Mẫu",
            subtitle: "Tải ảnh người mẫu và trang phục để bắt đầu",
            useSmartTitleWrapping: true,
            smartTitleWrapWords: 4,
            uploaderCaptionModel: "Tải ảnh người mẫu",
            uploaderDescriptionModel: "Ảnh chân dung hoặc toàn thân, rõ mặt",
            uploaderCaptionClothing: "Tải ảnh trang phục",
            uploaderDescriptionClothing: "Ảnh sản phẩm rõ ràng, chính diện",
        },
        photoRestoration: {
            mainTitle: "Phục Chế Ảnh Cũ",
            subtitle: "Tải lên bức ảnh cần phục chế để bắt đầu",
            useSmartTitleWrapping: true,
            smartTitleWrapWords: 3,
            uploaderCaption: "Tải ảnh cũ",
            uploaderDescription: "Nhấn vào khung ảnh để tải lên ảnh cần phục chế, sửa chữa",
        },
        imageToReal: {
            mainTitle: "Chuyển Đổi Sang Ảnh Thật",
            subtitle: "Tải lên bất kỳ ảnh nào để biến nó thành ảnh thật",
            useSmartTitleWrapping: true,
            smartTitleWrapWords: 4,
            uploaderCaption: "Tải ảnh gốc",
            uploaderDescription: "Nhấn vào khung ảnh để tải lên ảnh vẽ, 3D, hoạt hình...",
        },
        swapStyle: {
            mainTitle: "Thay Đổi Phong Cách Ảnh",
            subtitle: "Tải ảnh và chọn một phong cách để biến đổi",
            useSmartTitleWrapping: true,
            smartTitleWrapWords: 4,
            uploaderCaption: "Tải ảnh gốc",
            uploaderDescription: "Nhấn vào khung ảnh để tải lên ảnh cần thay đổi phong cách"
        },
        mixStyle: {
            mainTitle: "Trộn Phong Cách Ảnh",
            subtitle: "Tải ảnh nội dung và ảnh phong cách để bắt đầu",
            useSmartTitleWrapping: true,
            smartTitleWrapWords: 3,
            uploaderCaptionContent: "Ảnh nội dung",
            uploaderDescriptionContent: "Ảnh chứa chủ thể và bố cục chính",
            uploaderCaptionStyle: "Ảnh phong cách",
            uploaderDescriptionStyle: "Ảnh chứa màu sắc, kết cấu để tham khảo"
        },
        freeGeneration: {
            mainTitle: "Tạo Ảnh Tự Do",
            subtitle: "Giải phóng sức sáng tạo của bạn với prompt",
            useSmartTitleWrapping: true,
            smartTitleWrapWords: 3,
            uploaderCaption1: "Tải ảnh 1 (tùy chọn)",
            uploaderDescription1: "Ảnh để chỉnh sửa hoặc làm nguồn cảm hứng",
            uploaderCaption2: "Tải ảnh 2 (tùy chọn)",
            uploaderDescription2: "Ảnh thứ hai để kết hợp hoặc tham chiếu"
        },
        toyModelCreator: {
            mainTitle: "Tạo Mô Hình Đồ Chơi",
            subtitle: "Tải lên ảnh một nhân vật hoặc vật thể để bắt đầu",
            useSmartTitleWrapping: true,
            smartTitleWrapWords: 4,
            uploaderCaption: "Tải ảnh gốc",
            uploaderDescription: "Nhấn vào khung ảnh để tải lên ảnh nhân vật, vật thể...",
        }
    });

    const addImagesToGallery = (newImages: string[]) => {
        setSessionGalleryImages(prev => {
            const uniqueNewImages = newImages.filter(img => !prev.includes(img));
            return [...prev, ...uniqueNewImages];
        });
    };

    useEffect(() => {
        const savedTheme = localStorage.getItem('app-theme') as Theme;
        if (savedTheme && ['sdvn', 'vietnam', 'dark', 'dark-green', 'dark-blue'].includes(savedTheme)) {
            setTheme(savedTheme);
        }

        const fetchSettings = async () => {
            try {
                const response = await fetch('/setting.json');
                if (!response.ok) {
                    console.warn('Could not load setting.json, using default settings.');
                    return;
                }
                const data = await response.json();
                setSettings(prevSettings => ({
                    home: { ...prevSettings.home, ...data.home },
                    apps: data.apps || prevSettings.apps,
                    avatarCreator: { ...prevSettings.avatarCreator, ...data.avatarCreator },
                    architectureIdeator: { ...prevSettings.architectureIdeator, ...data.architectureIdeator },
                    dressTheModel: { ...prevSettings.dressTheModel, ...data.dressTheModel },
                    photoRestoration: { ...prevSettings.photoRestoration, ...data.photoRestoration },
                    imageToReal: { ...prevSettings.imageToReal, ...data.imageToReal },
                    swapStyle: { ...prevSettings.swapStyle, ...data.swapStyle },
                    mixStyle: { ...prevSettings.mixStyle, ...data.mixStyle },
                    freeGeneration: { ...prevSettings.freeGeneration, ...data.freeGeneration },
                    toyModelCreator: { ...prevSettings.toyModelCreator, ...data.toyModelCreator },
                }));
            } catch (error) {
                console.error("Failed to fetch or parse setting.json:", error);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        document.body.classList.remove('theme-sdvn', 'theme-vietnam', 'theme-dark', 'theme-dark-green', 'theme-dark-blue');
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
    };

    const navigateTo = (viewId: string) => {
        const current = viewHistory[historyIndex];
        const initialState = getInitialStateForApp(viewId);
    
        if (current.viewId === viewId && JSON.stringify(current.state) === JSON.stringify(initialState)) {
            return;
        }
    
        const newHistory = viewHistory.slice(0, historyIndex + 1);
        newHistory.push({ viewId, state: initialState } as ViewState);
        
        setViewHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };
    
    const handleStateChange = (newAppState: AnyAppState) => {
        const current = viewHistory[historyIndex];
        if (JSON.stringify(current.state) === JSON.stringify(newAppState)) {
            return; // No change
        }
    
        const newHistory = viewHistory.slice(0, historyIndex + 1);
        newHistory.push({ viewId: current.viewId, state: newAppState } as ViewState);
    
        setViewHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const handleSelectApp = (appId: string) => {
        const validAppIds = settings.apps.map(app => app.id);
        if (validAppIds.includes(appId)) {
            navigateTo(appId);
        } else {
            navigateTo('home');
        }
    };

    const handleGoHome = () => {
        navigateTo('home');
    };

    const handleGoBack = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
        }
    }, [historyIndex]);
    
    const handleGoForward = useCallback(() => {
        if (historyIndex < viewHistory.length - 1) {
            setHistoryIndex(prev => prev + 1);
        }
    }, [historyIndex, viewHistory.length]);

    const handleResetApp = () => {
        const currentViewId = viewHistory[historyIndex].viewId;
        if (currentViewId !== 'home') {
            navigateTo(currentViewId);
        }
    };
    
    const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);
    const handleCloseSearch = useCallback(() => setIsSearchOpen(false), []);
    const handleOpenGallery = useCallback(() => setIsGalleryOpen(true), []);
    const handleCloseGallery = useCallback(() => setIsGalleryOpen(false), []);
    const handleOpenInfo = useCallback(() => setIsInfoOpen(true), []);
    const handleCloseInfo = useCallback(() => setIsInfoOpen(false), []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            // Ignore if user is typing in an input/textarea to avoid hijacking browser functionality.
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const isUndo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
            const isRedo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && e.shiftKey;
            const isSearch = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f';
            const isGallery = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g';
            const isHelp = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'h';

            if (isUndo) {
                e.preventDefault();
                handleGoBack();
            } else if (isRedo) {
                e.preventDefault();
                handleGoForward();
            } else if (isSearch) {
                e.preventDefault();
                handleOpenSearch();
            } else if (isGallery) {
                if (sessionGalleryImages.length > 0) {
                    e.preventDefault();
                    handleOpenGallery();
                }
            } else if (isHelp) {
                e.preventDefault();
                handleOpenInfo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleGoBack, handleGoForward, handleOpenSearch, handleOpenGallery, handleOpenInfo, sessionGalleryImages.length]);

    const renderContent = () => {
        const motionProps = {
            className: "w-full h-full flex-1 min-h-0",
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -20 },
            transition: { duration: 0.4 },
        };
        const commonProps = { 
            addImagesToGallery,
            onStateChange: handleStateChange,
            onReset: handleResetApp,
            onGoBack: handleGoBack,
            openImageEditor,
        };

        switch (currentView.viewId) {
            case 'home':
                return (
                    <Home 
                        key="home"
                        onSelectApp={handleSelectApp} 
                        title={renderSmartlyWrappedTitle(settings.home.mainTitle, settings.home.useSmartTitleWrapping, settings.home.smartTitleWrapWords)}
                        subtitle={settings.home.subtitle}
                        apps={settings.apps}
                    />
                );
            case 'free-generation':
                 return (
                    <motion.div key="free-generation" {...motionProps}>
                        <FreeGeneration 
                            {...settings.freeGeneration} 
                            {...commonProps} 
                            appState={currentView.state} 
                        />
                    </motion.div>
                );
            case 'architecture-ideator':
                 return (
                    <motion.div key="architecture-ideator" {...motionProps}>
                        <ArchitectureIdeator 
                            {...settings.architectureIdeator} 
                            {...commonProps} 
                            appState={currentView.state} 
                        />
                    </motion.div>
                );
            case 'dress-the-model':
                return (
                    <motion.div key="dress-the-model" {...motionProps}>
                        <DressTheModel 
                            {...settings.dressTheModel} 
                            {...commonProps}
                            appState={currentView.state} 
                        />
                    </motion.div>
                );
            case 'photo-restoration':
                return (
                    <motion.div key="photo-restoration" {...motionProps}>
                        <PhotoRestoration 
                            {...settings.photoRestoration} 
                            {...commonProps} 
                            appState={currentView.state} 
                        />
                    </motion.div>
                );
            case 'image-to-real':
                return (
                    <motion.div key="image-to-real" {...motionProps}>
                        <ImageToReal 
                            {...settings.imageToReal} 
                            {...commonProps}
                            appState={currentView.state} 
                        />
                    </motion.div>
                );
            case 'swap-style':
                return (
                    <motion.div key="swap-style" {...motionProps}>
                        <SwapStyle 
                            {...settings.swapStyle} 
                            {...commonProps}
                            appState={currentView.state} 
                        />
                    </motion.div>
                );
            case 'mix-style':
                return (
                    <motion.div key="mix-style" {...motionProps}>
                        <MixStyle 
                            {...settings.mixStyle} 
                            {...commonProps}
                            appState={currentView.state} 
                        />
                    </motion.div>
                );
            case 'toy-model-creator':
                 return (
                    <motion.div key="toy-model-creator" {...motionProps}>
                        <ToyModelCreator 
                            {...settings.toyModelCreator} 
                            {...commonProps}
                            appState={currentView.state} 
                        />
                    </motion.div>
                );
            case 'avatar-creator':
                 return (
                    <motion.div key="avatar-creator" {...motionProps}>
                        <AvatarCreator 
                            {...settings.avatarCreator} 
                            {...commonProps}
                            appState={currentView.state} 
                        />
                    </motion.div>
                 );
            default: // Fallback for any invalid view id in history
                 return (
                    <Home 
                        key="home-fallback"
                        onSelectApp={handleSelectApp} 
                        title={renderSmartlyWrappedTitle(settings.home.mainTitle, settings.home.useSmartTitleWrapping, settings.home.smartTitleWrapWords)}
                        subtitle={settings.home.subtitle}
                        apps={settings.apps}
                    />
                 );
        }
    };

    return (
        <main className="text-neutral-200 min-h-screen w-full relative">
            <div className="absolute inset-0 bg-black/30 z-0" aria-hidden="true"></div>
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                <button
                    onClick={handleGoHome}
                    className="btn-search"
                    aria-label="Trở về trang chủ"
                    disabled={currentView.viewId === 'home'}
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
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H6.5a5.5 5.5 0 000 11H10" />
                    </svg>
                </button>
                <button
                    onClick={handleOpenGallery}
                    className="btn-gallery"
                    aria-label="Mở thư viện ảnh (Cmd/Ctrl+G)"
                    disabled={sessionGalleryImages.length === 0}
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                </button>
                <button
                    onClick={handleOpenSearch}
                    className="btn-search"
                    aria-label="Tìm kiếm ứng dụng (Cmd/Ctrl+F)"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>
                <button
                    onClick={handleOpenInfo}
                    className="btn-search"
                    aria-label="Mở hướng dẫn (Cmd/Ctrl+H)"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V12M12 8h.01" />
                    </svg>
                </button>
            </div>
            <div className="relative z-10 w-full min-h-screen flex flex-row items-center justify-center px-4 pt-16 pb-24">
                <AnimatePresence mode="wait">
                   {renderContent()}
                </AnimatePresence>
            </div>
            <SearchModal
                isOpen={isSearchOpen}
                onClose={handleCloseSearch}
                onSelectApp={(appId) => {
                    handleSelectApp(appId);
                    handleCloseSearch();
                }}
                apps={settings.apps}
            />
            <GalleryModal
                isOpen={isGalleryOpen}
                onClose={handleCloseGallery}
                images={sessionGalleryImages}
            />
             <InfoModal
                isOpen={isInfoOpen}
                onClose={handleCloseInfo}
            />
            <ImageEditorModal 
                imageToEdit={imageToEdit}
                onClose={closeImageEditor}
            />
            <Footer theme={theme} onThemeChange={handleThemeChange} />
        </main>
    );
}

export default App;