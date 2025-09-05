/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Footer from './components/Footer';
import Home from './components/Home';
import ArchitectureIdeator from './components/ArchitectureIdeator';
import AvatarCreator from './components/AvatarCreator';
// FIX: Module '"file:///components/DressTheModel"' has no default export.
import { DressTheModel } from './components/DressTheModel';
import PhotoRestoration from './components/PhotoRestoration';
import ImageToReal from './components/ImageToReal';
import SwapStyle from './components/SwapStyle';
import MixStyle from './components/MixStyle';
import FreeGeneration from './components/FreeGeneration';
import ToyModelCreator from './components/ToyModelCreator';
// FIX: Module '"file:///components/ImageInterpolation"' has no default export.
import { ImageInterpolation } from './components/ImageInterpolation';
import SearchModal from './components/SearchModal';
import GalleryModal from './components/GalleryModal';
import InfoModal from './components/InfoModal';
import AppToolbar from './components/AppToolbar';
import { ImageEditorModal } from './components/ImageEditorModal';
import {
    renderSmartlyWrappedTitle,
    useImageEditor,
    useAppControls,
} from './components/uiUtils';

function App() {
    const {
        currentView,
        settings,
        theme,
        sessionGalleryImages,
        isSearchOpen,
        isGalleryOpen,
        isInfoOpen,
        handleThemeChange,
        handleSelectApp,
        handleStateChange,
        addImagesToGallery,
        handleResetApp,
        handleGoBack,
        handleCloseSearch,
        handleCloseGallery,
        handleCloseInfo,
    } = useAppControls();
    
    const { imageToEdit, closeImageEditor } = useImageEditor();

    const renderContent = () => {
        if (!settings) return null; // Wait for settings to load

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
            case 'image-interpolation':
                 return (
                    <motion.div key="image-interpolation" {...motionProps}>
                        <ImageInterpolation 
                            {...settings.imageInterpolation} 
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
            
            <AppToolbar />

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
                apps={settings?.apps || []}
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