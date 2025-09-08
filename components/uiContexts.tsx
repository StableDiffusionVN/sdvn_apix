/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';
import {
    type ImageToEdit, type ViewState, type AnyAppState, type Theme,
    type AppConfig, THEMES, getInitialStateForApp
} from './uiTypes';

// --- Auth Context ---
interface Account {
    username: string;
    password?: string;
}

interface LoginSettings {
    enabled: boolean;
    accounts: Account[];
}

interface AuthContextType {
    loginSettings: LoginSettings | null;
    isLoggedIn: boolean;
    currentUser: string | null;
    isLoading: boolean;
    login: (username: string, password?: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loginSettings, setLoginSettings] = useState<LoginSettings | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            const defaultSettingsOnError: LoginSettings = {
                enabled: true,
                accounts: [
                    { username: "aPix", password: "sdvn" },
                    { username: "guest", password: "123" }
                ]
            };
            
            const handleEnabledLogin = (settings: LoginSettings) => {
                const storedUser = sessionStorage.getItem('currentUser');
                if (storedUser && settings.accounts.some(acc => acc.username === storedUser)) {
                    setCurrentUser(storedUser);
                    setIsLoggedIn(true);
                }
            };

            try {
                const response = await fetch('/setting-login.json');
                if (response.ok) {
                    const settings: LoginSettings = await response.json();
                    setLoginSettings(settings);
                    
                    if (settings.enabled === false) {
                        // Login is disabled. Bypass the login screen. No user is set.
                        setIsLoggedIn(true);
                        setCurrentUser(null);
                        sessionStorage.removeItem('currentUser');
                    } else {
                        // Treat enabled:true or missing enabled property as login required.
                        handleEnabledLogin(settings);
                    }
                } else {
                    // File not found. Default to login enabled.
                    console.warn("setting-login.json not found. Defaulting to login enabled.");
                    setLoginSettings(defaultSettingsOnError);
                    handleEnabledLogin(defaultSettingsOnError);
                }
            } catch (error) {
                // On any other error (parsing, network), default to login enabled.
                console.error("Error processing setting-login.json. Defaulting to login enabled.", error);
                setLoginSettings(defaultSettingsOnError);
                handleEnabledLogin(defaultSettingsOnError);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const login = useCallback(async (username: string, password?: string): Promise<boolean> => {
        if (!loginSettings) return false;

        const account = loginSettings.accounts.find(acc => acc.username === username);
        if (account && account.password === password) {
            setCurrentUser(username);
            setIsLoggedIn(true);
            sessionStorage.setItem('currentUser', username);
            return true;
        }
        return false;
    }, [loginSettings]);

    const logout = useCallback(() => {
        setCurrentUser(null);
        setIsLoggedIn(false);
        sessionStorage.removeItem('currentUser');
    }, []);

    const value = { loginSettings, isLoggedIn, currentUser, isLoading, login, logout };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// --- Image Editor Hook & Context ---
interface ImageEditorContextType {
    imageToEdit: ImageToEdit | null;
    openImageEditor: (url: string, onSave: (newUrl: string) => void) => void;
    openEmptyImageEditor: (onSave: (newUrl: string) => void) => void;
    closeImageEditor: () => void;
}

const ImageEditorContext = createContext<ImageEditorContextType | undefined>(undefined);

export const ImageEditorProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [imageToEdit, setImageToEdit] = useState<ImageToEdit | null>(null);

    const openImageEditor = useCallback((url: string, onSave: (newUrl: string) => void) => {
        if (window.innerWidth < 768) {
            alert("Chức năng chỉnh sửa ảnh không khả dụng trên thiết bị di động.");
            return;
        }
        if (!url) {
            console.error("openImageEditor called with no URL.");
            return;
        }
        setImageToEdit({ url, onSave });
    }, []);

    const openEmptyImageEditor = useCallback((onSave: (newUrl: string) => void) => {
        if (window.innerWidth < 768) {
            alert("Chức năng chỉnh sửa ảnh không khả dụng trên thiết bị di động.");
            return;
        }
        setImageToEdit({ url: null, onSave });
    }, []);

    const closeImageEditor = useCallback(() => {
        setImageToEdit(null);
    }, []);

    const value = { imageToEdit, openImageEditor, openEmptyImageEditor, closeImageEditor };

    return (
        <ImageEditorContext.Provider value={value}>
            {children}
        </ImageEditorContext.Provider>
    );
};

export const useImageEditor = (): ImageEditorContextType => {
    const context = useContext(ImageEditorContext);
    if (context === undefined) {
        throw new Error('useImageEditor must be used within an ImageEditorProvider');
    }
    return context;
};


// --- App Control Context ---
interface AppControlContextType {
    currentView: ViewState;
    settings: any;
    theme: Theme;
    sessionGalleryImages: string[];
    historyIndex: number;
    viewHistory: ViewState[];
    isSearchOpen: boolean;
    isGalleryOpen: boolean;
    isInfoOpen: boolean;
    isExtraToolsOpen: boolean;
    isImageLayoutModalOpen: boolean;
    isBeforeAfterModalOpen: boolean;
    language: 'vi' | 'en';
    addImagesToGallery: (newImages: string[]) => void;
    removeImageFromGallery: (imageIndex: number) => void;
    replaceImageInGallery: (imageIndex: number, newImageUrl: string) => void;
    handleThemeChange: (newTheme: Theme) => void;
    handleLanguageChange: (lang: 'vi' | 'en') => void;
    navigateTo: (viewId: string) => void;
    handleStateChange: (newAppState: AnyAppState) => void;
    handleSelectApp: (appId: string) => void;
    handleGoHome: () => void;
    handleGoBack: () => void;
    handleGoForward: () => void;
    handleResetApp: () => void;
    handleOpenSearch: () => void;
    handleCloseSearch: () => void;
    handleOpenGallery: () => void;
    handleCloseGallery: () => void;
    handleOpenInfo: () => void;
    handleCloseInfo: () => void;
    toggleExtraTools: () => void;
    openImageLayoutModal: () => void;
    closeImageLayoutModal: () => void;
    openBeforeAfterModal: () => void;
    closeBeforeAfterModal: () => void;
    t: (key: string, ...args: any[]) => any;
}

const AppControlContext = createContext<AppControlContextType | undefined>(undefined);

export const AppControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [viewHistory, setViewHistory] = useState<ViewState[]>([{ viewId: 'home', state: { stage: 'home' } }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('app-theme') as Theme;
        if (savedTheme && THEMES.includes(savedTheme)) {
            return savedTheme;
        }
        // If no theme is saved, pick a random one
        return THEMES[Math.floor(Math.random() * THEMES.length)];
    });
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [isExtraToolsOpen, setIsExtraToolsOpen] = useState(false);
    const [isImageLayoutModalOpen, setIsImageLayoutModalOpen] = useState(false);
    const [isBeforeAfterModalOpen, setIsBeforeAfterModalOpen] = useState(false);
    const [sessionGalleryImages, setSessionGalleryImages] = useState<string[]>([]);
    const [settings, setSettings] = useState(null); // Initially null

    const [language, setLanguage] = useState<'vi' | 'en'>(() => (localStorage.getItem('app-language') as 'vi' | 'en') || 'vi');
    const [translations, setTranslations] = useState<Record<string, any>>({});

    const currentView = viewHistory[historyIndex];

    useEffect(() => {
        const fetchTranslations = async () => {
             const modules = [
                'common', 
                'data',
                'home', 
                'architectureIdeator',
                'avatarCreator',
                'dressTheModel',
                'freeGeneration',
                'imageInterpolation',
                'imageToReal',
                'mixStyle',
                'photoRestoration',
                'swapStyle',
                'toyModelCreator'
            ];
            try {
                const fetchPromises = modules.map(module =>
                    fetch(`/locales/${language}/${module}.json`)
                        .then(res => {
                            if (!res.ok) {
                                console.warn(`Could not fetch ${module}.json for ${language}`);
                                return {}; // Return empty object on failure to not break Promise.all
                            }
                            return res.json();
                        })
                );

                const loadedTranslations = await Promise.all(fetchPromises);
                
                const mergedTranslations = loadedTranslations.reduce(
                    (acc, current) => ({ ...acc, ...current }),
                    {}
                );
                setTranslations(mergedTranslations);
            } catch (error) {
                console.error(`Could not load translations for ${language}`, error);
            }
        };
        fetchTranslations();
    }, [language]);

    const handleLanguageChange = useCallback((lang: 'vi' | 'en') => {
        setLanguage(lang);
        localStorage.setItem('app-language', lang);
    }, []);

    const t = useCallback((key: string, ...args: any[]): any => {
        let translation = translations[key];
        if (translation === undefined) {
            console.warn(`Translation key not found: ${key}`);
            return key;
        }
        if (typeof translation === 'string' && args.length > 0) {
            args.forEach((arg, index) => {
                translation = translation.replace(`{${index}}`, arg);
            });
        }
        return translation;
    }, [translations]);


    const addImagesToGallery = useCallback((newImages: string[]) => {
        setSessionGalleryImages(prev => {
            const uniqueNewImages = newImages.filter(img => !prev.includes(img));
            return [...prev, ...uniqueNewImages];
        });
    }, []);

    const removeImageFromGallery = useCallback((indexToRemove: number) => {
        setSessionGalleryImages(prev => prev.filter((_, index) => index !== indexToRemove));
    }, []);

    const replaceImageInGallery = useCallback((indexToReplace: number, newImageUrl: string) => {
        setSessionGalleryImages(prev => {
            const newImages = [...prev];
            if (indexToReplace >= 0 && indexToReplace < newImages.length) {
                newImages[indexToReplace] = newImageUrl;
            }
            return newImages;
        });
    }, []);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/setting.json');
                 if (!response.ok) {
                    console.warn('Could not load setting.json, using built-in settings.');
                    // In a real-world scenario, you might have default settings hardcoded here.
                    // For now, we'll just log the issue.
                    return;
                }
                const data = await response.json();
                setSettings(data);
            } catch (error) {
                console.error("Failed to fetch or parse setting.json:", error);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        document.body.classList.remove('theme-sdvn', 'theme-vietnam', 'theme-dark', 'theme-ocean-blue', 'theme-blue-sky', 'theme-black-night', 'theme-clear-sky', 'theme-skyline', 'theme-blulagoo', 'theme-life', 'theme-emerald-water');
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
    };

    const navigateTo = useCallback((viewId: string) => {
        const current = viewHistory[historyIndex];
        const initialState = getInitialStateForApp(viewId);
    
        if (current.viewId === viewId && JSON.stringify(current.state) === JSON.stringify(initialState)) {
            return;
        }
    
        const newHistory = viewHistory.slice(0, historyIndex + 1);
        newHistory.push({ viewId, state: initialState } as ViewState);
        
        setViewHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [viewHistory, historyIndex]);
    
    const handleStateChange = useCallback((newAppState: AnyAppState) => {
        const current = viewHistory[historyIndex];
        if (JSON.stringify(current.state) === JSON.stringify(newAppState)) {
            return; // No change
        }
    
        const newHistory = viewHistory.slice(0, historyIndex + 1);
        newHistory.push({ viewId: current.viewId, state: newAppState } as ViewState);
    
        setViewHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [viewHistory, historyIndex]);

    const handleSelectApp = useCallback((appId: string) => {
        if (settings) {
            const validAppIds = settings.apps.map((app: AppConfig) => app.id);
            if (validAppIds.includes(appId)) {
                navigateTo(appId);
            } else {
                navigateTo('home');
            }
        }
    }, [settings, navigateTo]);

    const handleGoHome = useCallback(() => {
        navigateTo('home');
    }, [navigateTo]);

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

    const handleResetApp = useCallback(() => {
        const currentViewId = viewHistory[historyIndex].viewId;
        if (currentViewId !== 'home') {
            navigateTo(currentViewId);
        }
    }, [viewHistory, historyIndex, navigateTo]);
    
    const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);
    const handleCloseSearch = useCallback(() => setIsSearchOpen(false), []);
    const handleOpenGallery = useCallback(() => setIsGalleryOpen(true), []);
    const handleCloseGallery = useCallback(() => setIsGalleryOpen(false), []);
    const handleOpenInfo = useCallback(() => setIsInfoOpen(true), []);
    const handleCloseInfo = useCallback(() => setIsInfoOpen(false), []);
    const toggleExtraTools = useCallback(() => setIsExtraToolsOpen(prev => !prev), []);
    const openImageLayoutModal = useCallback(() => {
        setIsImageLayoutModalOpen(true);
        setIsExtraToolsOpen(false); // Close the tools menu when opening the modal
    }, []);
    const closeImageLayoutModal = useCallback(() => setIsImageLayoutModalOpen(false), []);
    const openBeforeAfterModal = useCallback(() => {
        setIsBeforeAfterModalOpen(true);
        setIsExtraToolsOpen(false);
    }, []);
    const closeBeforeAfterModal = useCallback(() => setIsBeforeAfterModalOpen(false), []);

    const value: AppControlContextType = {
        currentView,
        settings,
        theme,
        sessionGalleryImages,
        historyIndex,
        viewHistory,
        isSearchOpen,
        isGalleryOpen,
        isInfoOpen,
        isExtraToolsOpen,
        isImageLayoutModalOpen,
        isBeforeAfterModalOpen,
        language,
        addImagesToGallery,
        removeImageFromGallery,
        replaceImageInGallery,
        handleThemeChange,
        handleLanguageChange,
        navigateTo,
        handleStateChange,
        handleSelectApp,
        handleGoHome,
        handleGoBack,
        handleGoForward,
        handleResetApp,
        handleOpenSearch,
        handleCloseSearch,
        handleOpenGallery,
        handleCloseGallery,
        handleOpenInfo,
        handleCloseInfo,
        toggleExtraTools,
        openImageLayoutModal,
        closeImageLayoutModal,
        openBeforeAfterModal,
        closeBeforeAfterModal,
        t,
    };

    return (
        <AppControlContext.Provider value={value}>
            {children}
        </AppControlContext.Provider>
    );
};

export const useAppControls = (): AppControlContextType => {
    const context = useContext(AppControlContext);
    if (context === undefined) {
        throw new Error('useAppControls must be used within an AppControlProvider');
    }
    return context;
};