/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { type GenerationHistoryEntry } from '../components/uiTypes';

const DB_NAME = 'aPixDatabase';
const DB_VERSION = 3;
const GALLERY_STORE = 'imageGallery';
const HISTORY_STORE = 'generationHistory';
const CANVAS_STORE = 'canvasState';
const STORYBOARD_STORE = 'storyboardState';

let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject('Error opening IndexedDB.');
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(GALLERY_STORE)) {
                db.createObjectStore(GALLERY_STORE, { autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(HISTORY_STORE)) {
                db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(CANVAS_STORE)) {
                db.createObjectStore(CANVAS_STORE);
            }
            if (!db.objectStoreNames.contains(STORYBOARD_STORE)) {
                db.createObjectStore(STORYBOARD_STORE);
            }
        };
    });
    return dbPromise;
};

// --- MIGRATION ---
export const migrateFromLocalStorageToIdb = async (): Promise<void> => {
    const migrationFlag = 'migratedToIDB_v1';
    if (localStorage.getItem(migrationFlag)) {
        return;
    }

    console.log("Starting migration from localStorage to IndexedDB...");

    try {
        const db = await initDB();
        
        // Migrate Gallery
        const galleryJson = localStorage.getItem('imageGallery');
        if (galleryJson) {
            const galleryItems: string[] = JSON.parse(galleryJson);
            if (Array.isArray(galleryItems)) {
                const tx = db.transaction(GALLERY_STORE, 'readwrite');
                const store = tx.objectStore(GALLERY_STORE);
                // Reverse to maintain original order (newest first)
                for (const item of galleryItems.reverse()) {
                    store.add(item);
                }
                await new Promise(resolve => tx.oncomplete = resolve);
                localStorage.removeItem('imageGallery'); // Clean up
                console.log(`Migrated ${galleryItems.length} gallery items.`);
            }
        }

        // Migrate History
        const historyJson = localStorage.getItem('generationHistory');
        if (historyJson) {
            const historyItems: GenerationHistoryEntry[] = JSON.parse(historyJson);
            if (Array.isArray(historyItems)) {
                const tx = db.transaction(HISTORY_STORE, 'readwrite');
                const store = tx.objectStore(HISTORY_STORE);
                for (const item of historyItems) {
                    store.add(item);
                }
                await new Promise(resolve => tx.oncomplete = resolve);
                localStorage.removeItem('generationHistory'); // Clean up
                console.log(`Migrated ${historyItems.length} history items.`);
            }
        }

        localStorage.setItem(migrationFlag, 'true');
        console.log("Migration complete.");
    } catch (error) {
        console.error("Migration failed:", error);
    }
};


// --- GALLERY OPERATIONS ---

export const addGalleryImage = async (imageUrl: string): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(GALLERY_STORE, 'readwrite');
    const store = tx.objectStore(GALLERY_STORE);
    store.add(imageUrl);
    return new Promise(resolve => tx.oncomplete = () => resolve());
};

export const addMultipleGalleryImages = async (imageUrls: string[]): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(GALLERY_STORE, 'readwrite');
    const store = tx.objectStore(GALLERY_STORE);
    // Add in reverse to maintain newest-first order
    for (const url of [...imageUrls].reverse()) {
        store.add(url);
    }
    return new Promise(resolve => tx.oncomplete = () => resolve());
};

export const getAllGalleryImages = async (): Promise<string[]> => {
    const db = await initDB();
    const tx = db.transaction(GALLERY_STORE, 'readonly');
    const store = tx.objectStore(GALLERY_STORE);
    const allItems = store.getAll();
    return new Promise((resolve) => {
        tx.oncomplete = () => {
            // Reverse to get newest first, as they are added with auto-incrementing keys
            resolve((allItems.result as string[]).reverse());
        };
    });
};

export const deleteGalleryImage = async (imageUrl: string): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(GALLERY_STORE, 'readwrite');
    const store = tx.objectStore(GALLERY_STORE);
    const cursorReq = store.openCursor(null, 'prev'); // Iterate backwards to find the first match
    return new Promise((resolve) => {
        cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
                if (cursor.value === imageUrl) {
                    cursor.delete();
                    resolve();
                    return;
                }
                cursor.continue();
            } else {
                resolve(); // Not found
            }
        };
        tx.oncomplete = () => resolve();
    });
};

export const replaceGalleryImage = async (oldImageUrl: string, newImageUrl: string): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(GALLERY_STORE, 'readwrite');
    const store = tx.objectStore(GALLERY_STORE);
    const cursorReq = store.openCursor(null, 'prev');
     return new Promise((resolve) => {
        cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
                if (cursor.value === oldImageUrl) {
                    cursor.update(newImageUrl);
                    resolve();
                    return;
                }
                cursor.continue();
            } else {
                resolve(); // Not found
            }
        };
        tx.oncomplete = () => resolve();
    });
};

// --- HISTORY OPERATIONS ---

export const addHistoryEntry = async (entry: GenerationHistoryEntry): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(HISTORY_STORE, 'readwrite');
    const store = tx.objectStore(HISTORY_STORE);
    store.add(entry);
    return new Promise(resolve => tx.oncomplete = () => resolve());
};

export const getAllHistoryEntries = async (): Promise<GenerationHistoryEntry[]> => {
    const db = await initDB();
    const tx = db.transaction(HISTORY_STORE, 'readonly');
    const store = tx.objectStore(HISTORY_STORE);
    const allItems = store.getAll();
    return new Promise((resolve) => {
        tx.oncomplete = () => {
            const sorted = (allItems.result as GenerationHistoryEntry[]).sort((a, b) => b.timestamp - a.timestamp);
            resolve(sorted);
        };
    });
};

// --- CANVAS OPERATIONS ---
export const saveCanvasState = async (state: any): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(CANVAS_STORE, 'readwrite');
    const store = tx.objectStore(CANVAS_STORE);
    store.put(state, 'currentState'); // Use a fixed key
    return new Promise(resolve => tx.oncomplete = () => resolve());
};

export const loadCanvasState = async (): Promise<any | null> => {
    const db = await initDB();
    const tx = db.transaction(CANVAS_STORE, 'readonly');
    const store = tx.objectStore(CANVAS_STORE);
    const request = store.get('currentState');
    return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => {
            resolve(request.result || null);
        };
    });
};

export const clearCanvasState = async (): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(CANVAS_STORE, 'readwrite');
    const store = tx.objectStore(CANVAS_STORE);
    store.clear();
    return new Promise(resolve => tx.oncomplete = () => resolve());
};

// --- STORYBOARD OPERATIONS ---
export const saveStoryboardState = async (state: any): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(STORYBOARD_STORE, 'readwrite');
    const store = tx.objectStore(STORYBOARD_STORE);
    store.put(state, 'currentStoryboard'); // Use a fixed key
    return new Promise(resolve => tx.oncomplete = () => resolve());
};

export const loadStoryboardState = async (): Promise<any | null> => {
    const db = await initDB();
    const tx = db.transaction(STORYBOARD_STORE, 'readonly');
    const store = tx.objectStore(STORYBOARD_STORE);
    const request = store.get('currentStoryboard');
    return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => {
            resolve(request.result || null);
        };
    });
};

export const clearStoryboardState = async (): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(STORYBOARD_STORE, 'readwrite');
    const store = tx.objectStore(STORYBOARD_STORE);
    store.clear();
    return new Promise(resolve => tx.oncomplete = () => resolve());
};