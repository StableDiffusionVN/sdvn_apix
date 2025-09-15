/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect } from 'react';
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
import ImageInterpolation from './components/ImageInterpolation';
import SearchModal from './components/SearchModal';
import GalleryModal from './components/GalleryModal';
import InfoModal from './components/InfoModal';
import AppToolbar from './components/AppToolbar';
import LoginScreen from './components/LoginScreen';
import UserStatus from './components/UserStatus';
import LanguageSwitcher from './components/LanguageSwitcher';
import { ImageEditorModal } from './components/ImageEditorModal';
import {
    renderSmartlyWrappedTitle,
    useImageEditor,
    useAppControls,
    ImageLayoutModal,
    BeforeAfterModal,
    LayerComposerModal,
    useAuth
} from './components/uiUtils';
import { LoadingSpinnerIcon } from './components/icons';

function App() {
    const {
        currentView,
        settings,
        sessionGalleryImages,
        isSearchOpen,
        isGalleryOpen,
        isInfoOpen,
        isImageLayoutModalOpen,
        isBeforeAfterModalOpen,
        isLayerComposerOpen,
        handleSelectApp,
        handleStateChange,
        addImagesToGallery,
        handleResetApp,
        handleGoBack,
        handleCloseSearch,
        handleCloseGallery,
        handleCloseInfo,
        closeImageLayoutModal,
        closeBeforeAfterModal,
        closeLayerComposer,
        t,
    } = useAppControls();
    
    const { imageToEdit, closeImageEditor } = useImageEditor();
    const { loginSettings, isLoggedIn, isLoading, currentUser } = useAuth();

    useEffect(() => {
        const isAnyModalOpen = isSearchOpen || 
                               isGalleryOpen || 
                               isInfoOpen || 
                               isImageLayoutModalOpen || 
                               isBeforeAfterModalOpen || 
                               isLayerComposerOpen || 
                               !!imageToEdit;

        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        // Cleanup function to ensure overflow is reset when the component unmounts
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isSearchOpen, isGalleryOpen, isInfoOpen, isImageLayoutModalOpen, isBeforeAfterModalOpen, isLayerComposerOpen, imageToEdit]);

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
                        title={renderSmartlyWrappedTitle(t(settings.home.mainTitleKey), settings.home.useSmartTitleWrapping, settings.home.smartTitleWrapWords)}
                        subtitle={t(settings.home.subtitleKey)}
                        apps={settings.apps.map((app: any) => ({...app, title: t(app.titleKey), description: t(app.descriptionKey)}))}
                    />
                );
            case 'free-generation':
                 return (
                    <motion.div key="free-generation" {...motionProps}>
                        <FreeGeneration 
                            {...settings.freeGeneration}
                            mainTitle={t(settings.freeGeneration.mainTitleKey)}
                            subtitle={t(settings.freeGeneration.subtitleKey)}
                            uploaderCaption1={t(settings.freeGeneration.uploaderCaption1Key)}
                            uploaderDescription1={t(settings.freeGeneration.uploaderDescription1Key)}
                            uploaderCaption2={t(settings.freeGeneration.uploaderCaption2Key)}
                            uploaderDescription2={t(settings.freeGeneration.uploaderDescription2Key)}
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
                            mainTitle={t(settings.architectureIdeator.mainTitleKey)}
                            subtitle={t(settings.architectureIdeator.subtitleKey)}
                            uploaderCaption={t(settings.architectureIdeator.uploaderCaptionKey)}
                            uploaderDescription={t(settings.architectureIdeator.uploaderDescriptionKey)}
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
                            mainTitle={t(settings.dressTheModel.mainTitleKey)}
                            subtitle={t(settings.dressTheModel.subtitleKey)}
                            uploaderCaptionModel={t(settings.dressTheModel.uploaderCaptionModelKey)}
                            uploaderDescriptionModel={t(settings.dressTheModel.uploaderDescriptionModelKey)}
                            uploaderCaptionClothing={t(settings.dressTheModel.uploaderCaptionClothingKey)}
                            uploaderDescriptionClothing={t(settings.dressTheModel.uploaderDescriptionClothingKey)}
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
                            mainTitle={t(settings.photoRestoration.mainTitleKey)}
                            subtitle={t(settings.photoRestoration.subtitleKey)}
                            uploaderCaption={t(settings.photoRestoration.uploaderCaptionKey)}
                            uploaderDescription={t(settings.photoRestoration.uploaderDescriptionKey)}
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
                            mainTitle={t(settings.imageToReal.mainTitleKey)}
                            subtitle={t(settings.imageToReal.subtitleKey)}
                            uploaderCaption={t(settings.imageToReal.uploaderCaptionKey)}
                            uploaderDescription={t(settings.imageToReal.uploaderDescriptionKey)}
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
                            mainTitle={t(settings.swapStyle.mainTitleKey)}
                            subtitle={t(settings.swapStyle.subtitleKey)}
                            uploaderCaption={t(settings.swapStyle.uploaderCaptionKey)}
                            uploaderDescription={t(settings.swapStyle.uploaderDescriptionKey)}
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
                            mainTitle={t(settings.mixStyle.mainTitleKey)}
                            subtitle={t(settings.mixStyle.subtitleKey)}
                            uploaderCaptionContent={t(settings.mixStyle.uploaderCaptionContentKey)}
                            uploaderDescriptionContent={t(settings.mixStyle.uploaderDescriptionContentKey)}
                            uploaderCaptionStyle={t(settings.mixStyle.uploaderCaptionStyleKey)}
                            uploaderDescriptionStyle={t(settings.mixStyle.uploaderDescriptionStyleKey)}
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
                            mainTitle={t(settings.toyModelCreator.mainTitleKey)}
                            subtitle={t(settings.toyModelCreator.subtitleKey)}
                            uploaderCaption={t(settings.toyModelCreator.uploaderCaptionKey)}
                            uploaderDescription={t(settings.toyModelCreator.uploaderDescriptionKey)}
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
                            mainTitle={t(settings.avatarCreator.mainTitleKey)}
                            subtitle={t(settings.avatarCreator.subtitleKey)}
                            uploaderCaption={t(settings.avatarCreator.uploaderCaptionKey)}
                            uploaderDescription={t(settings.avatarCreator.uploaderDescriptionKey)}
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
                            mainTitle={t(settings.imageInterpolation.mainTitleKey)}
                            subtitle={t(settings.imageInterpolation.subtitleKey)}
                            uploaderCaptionInput={t(settings.imageInterpolation.uploaderCaptionInputKey)}
                            uploaderDescriptionInput={t(settings.imageInterpolation.uploaderDescriptionInputKey)}
                            uploaderCaptionOutput={t(settings.imageInterpolation.uploaderCaptionOutputKey)}
                            uploaderDescriptionOutput={t(settings.imageInterpolation.uploaderDescriptionOutputKey)}
                            uploaderCaptionReference={t(settings.imageInterpolation.uploaderCaptionReferenceKey)}
                            uploaderDescriptionReference={t(settings.imageInterpolation.uploaderDescriptionReferenceKey)}
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
                        title={renderSmartlyWrappedTitle(t(settings.home.mainTitleKey), settings.home.useSmartTitleWrapping, settings.home.smartTitleWrapWords)}
                        subtitle={t(settings.home.subtitleKey)}
                        apps={settings.apps.map((app: any) => ({...app, title: t(app.titleKey), description: t(app.descriptionKey)}))}
                    />
                 );
        }
    };

    if (isLoading) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-neutral-900">
                <LoadingSpinnerIcon className="animate-spin h-10 w-10 text-yellow-400" />
            </div>
        );
    }

    if (loginSettings?.enabled && !isLoggedIn) {
        return <LoginScreen />;
    }

    return (
        <main className="text-neutral-200 min-h-screen w-full relative">
            <div className="absolute inset-0 bg-black/30 z-0" aria-hidden="true"></div>
            
            <div className="fixed top-4 left-4 z-20 flex items-center gap-2">
                {isLoggedIn && currentUser && <UserStatus />}
                <LanguageSwitcher />
            </div>
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
                apps={settings ? settings.apps.map((app: any) => ({...app, title: t(app.titleKey), description: t(app.descriptionKey)})) : []}
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
            <ImageLayoutModal
                isOpen={isImageLayoutModalOpen}
                onClose={closeImageLayoutModal}
            />
            <BeforeAfterModal
                isOpen={isBeforeAfterModalOpen}
                onClose={closeBeforeAfterModal}
            />
            <LayerComposerModal
                isOpen={isLayerComposerOpen}
                onClose={closeLayerComposer}
            />
            <Footer />
        </main>
    );
}

export default App;