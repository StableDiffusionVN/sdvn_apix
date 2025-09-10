/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { type ImageForZip, type VideoTask } from './uiTypes';

// Declare JSZip for creating zip files
declare const JSZip: any;

/**
 * Handles file input change events, reads the file as a Data URL, and executes a callback.
 * @param e The React change event from the file input.
 * @param callback A function to call with the resulting file data URL.
 */
export const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (result: string) => void
) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                callback(reader.result);
            }
        };
        reader.readAsDataURL(file);
    }
};

/**
 * Triggers a browser download for a given URL, automatically determining the file extension.
 * @param url The URL of the file to download (can be a data URL or blob URL).
 * @param filenameWithoutExtension The desired name for the downloaded file, without the extension.
 */
export const downloadImage = (url: string, filenameWithoutExtension: string) => {
    if (!url) return;

    // Determine extension from URL
    let extension = 'jpg'; // Default extension
    if (url.startsWith('data:image/png')) {
        extension = 'png';
    } else if (url.startsWith('data:image/jpeg')) {
        extension = 'jpg';
    } else if (url.startsWith('data:image/webp')) {
        extension = 'webp';
    } else if (url.startsWith('blob:')) {
        // This is likely a video from video generation or a blob from another source.
        // It's safer to assume mp4 for videos.
        extension = 'mp4';
    }

    const filename = `${filenameWithoutExtension}.${extension}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Triggers a browser download for a JSON object.
 * @param data The JavaScript object to download.
 * @param filenameWithExtension The desired filename, including the .json extension.
 */
export const downloadJson = (data: object, filenameWithExtension: string) => {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filenameWithExtension;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to create or download JSON file:", error);
        alert("Could not download settings file.");
    }
};


/**
 * Converts a data URL string to a Blob object.
 * @param dataurl The data URL to convert.
 * @returns A Blob object.
 */
export const dataURLtoBlob = async (dataurl: string): Promise<Blob> => {
    // Handle blob URLs directly
    if (dataurl.startsWith('blob:')) {
        const response = await fetch(dataurl);
        return await response.blob();
    }
    
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Invalid data URL');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

/**
 * Creates a zip file from a list of images and triggers a download.
 * @param images An array of ImageForZip objects.
 * @param zipFilename The desired name for the downloaded zip file.
 */
export const downloadAllImagesAsZip = async (images: ImageForZip[], zipFilename: string = 'results.zip') => {
    if (!images || images.length === 0) {
        alert('Không có ảnh nào để tải về.');
        return;
    }

    try {
        const zip = new JSZip();

        for (const img of images) {
            if (!img.url) continue;

            const blob = await dataURLtoBlob(img.url);
            let targetFolder = zip;
            if (img.folder) {
                targetFolder = zip.folder(img.folder) || zip;
            }
            
            const fileExtension = img.extension || (blob.type.split('/')[1] || 'jpg').toLowerCase();
            const baseFileName = img.filename.replace(/\s+/g, '-').toLowerCase();

            // Handle duplicates by appending a number
            let finalFilename = `${baseFileName}.${fileExtension}`;
            let count = 1;
            // Use the file method to check for existence within the target folder
            while (targetFolder.file(finalFilename)) {
                count++;
                finalFilename = `${baseFileName}-${count}.${fileExtension}`;
            }

            targetFolder.file(finalFilename, blob);
        }

        if (Object.keys(zip.files).length === 0) {
            alert('Không có ảnh hợp lệ nào để tải về.');
            return;
        }

        const content = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = zipFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error('Lỗi khi tạo file zip:', error);
        alert('Đã xảy ra lỗi khi tạo file zip. Vui lòng thử lại.');
    }
};

/**
 * A centralized utility to process and download all generated assets (images and videos) as a zip file.
 * @param inputImages Array of input images for the zip.
 * @param historicalImages Array of generated images/videos. Can be simple URLs or objects with details for naming.
 * @param videoTasks The video generation task object to find completed videos.
 * @param zipFilename The final name for the downloaded zip file.
 * @param baseOutputFilename A base prefix for all generated output files.
 */
export const processAndDownloadAll = async ({
    inputImages = [],
    historicalImages = [],
    videoTasks = {},
    zipFilename,
    baseOutputFilename,
}: {
    inputImages?: ImageForZip[];
    historicalImages?: Array<string | { url: string; idea?: string; prompt?: string; }>;
    videoTasks?: Record<string, VideoTask>;
    zipFilename: string;
    baseOutputFilename: string;
}) => {
    const allItemsToZip: ImageForZip[] = [...inputImages];
    const processedUrls = new Set<string>();

    // Add historical images first
    historicalImages.forEach((item, index) => {
        const url = typeof item === 'string' ? item : item.url;
        if (processedUrls.has(url)) return;

        // Generate a descriptive filename part
        const namePartRaw = (typeof item !== 'string' && (item.idea || item.prompt))
            ? (item.idea || item.prompt!)
            : `${index + 1}`;
        
        // Sanitize the filename part
        const namePart = namePartRaw.substring(0, 30).replace(/[\s()]/g, '_').replace(/[^\w-]/g, '');
        
        const isVideo = url.startsWith('blob:');

        allItemsToZip.push({
            url,
            filename: `${baseOutputFilename}-${namePart}`,
            folder: 'output',
            extension: isVideo ? 'mp4' : undefined,
        });
        processedUrls.add(url);
    });

    // Add any completed videos from videoTasks that weren't already in historicalImages
    Object.values(videoTasks).forEach((task, index) => {
        if (task.status === 'done' && task.resultUrl && !processedUrls.has(task.resultUrl)) {
            allItemsToZip.push({
                url: task.resultUrl,
                filename: `${baseOutputFilename}-video-${index + 1}`,
                folder: 'output',
                extension: 'mp4',
            });
            processedUrls.add(task.resultUrl);
        }
    });

    if (allItemsToZip.length === inputImages.length) {
        alert('Không có ảnh hoặc video nào đã tạo để tải về.');
        return;
    }

    await downloadAllImagesAsZip(allItemsToZip, zipFilename);
};


// --- REFACTORED: Image Combining Utility ---
const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Failed to load image: ${url.substring(0, 50)}...`));
        img.src = url;
    });
};

interface CombineImageItem {
    url: string;
    label: string;
}

interface CombineImageOptions {
    layout: 'horizontal' | 'vertical' | 'smart-grid';
    mainTitle?: string;
    gap?: number;
    backgroundColor?: string;
    labels?: {
        enabled: boolean;
        fontColor?: string;
        backgroundColor?: string;
        baseFontSize?: number;
    };
}

export const combineImages = async (
    items: CombineImageItem[],
    options: CombineImageOptions
): Promise<string> => {
    if (items.length < 1) {
        throw new Error("Cần ít nhất một ảnh để xử lý.");
    }

    const {
        layout,
        mainTitle = '',
        gap = 0,
        backgroundColor = '#FFFFFF',
        labels = { enabled: false, fontColor: '#000000', backgroundColor: '#FFFFFF', baseFontSize: 40 }
    } = options;
    
    const loadedImages = await Promise.all(items.map(item => loadImage(item.url)));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Không thể lấy context của canvas.");
    
    const hasMainTitle = labels.enabled && mainTitle.trim() !== '';
    const hasItemLabels = labels.enabled && items.some(item => item.label.trim() !== '');

    if (layout === 'horizontal') {
        const targetHeight = Math.max(...loadedImages.map(img => img.height));
        const scaledImages = loadedImages.map(img => {
            const scaleFactor = targetHeight / img.height;
            return { img, width: img.width * scaleFactor, height: targetHeight };
        });

        const totalContentWidth = scaledImages.reduce((sum, sImg) => sum + sImg.width, 0) + (gap * (loadedImages.length - 1));
        canvas.width = totalContentWidth + gap * 2;
        
        const baseFontSize = labels.baseFontSize || 40;
        const referenceWidth = 1500;
        const fontScaleFactor = canvas.width / referenceWidth;
        const finalItemLabelFontSize = Math.max(12, Math.round(baseFontSize * fontScaleFactor));
        const finalTitleFontSize = Math.max(18, Math.round((baseFontSize * 1.5) * fontScaleFactor));
        const labelVerticalPadding = Math.round(finalItemLabelFontSize * 0.6);
        const finalItemLabelHeight = hasItemLabels ? finalItemLabelFontSize + labelVerticalPadding * 2 : 0;
        const titleHeight = hasMainTitle ? finalTitleFontSize + labelVerticalPadding * 2 : 0;
        
        const totalContentHeight = titleHeight + targetHeight + finalItemLabelHeight;
        canvas.height = totalContentHeight + gap * 2;
        
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (hasMainTitle) {
            ctx.fillStyle = labels.fontColor || '#000000';
            ctx.font = `bold ${finalTitleFontSize}px "Be Vietnam Pro"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(mainTitle.trim(), canvas.width / 2, gap + titleHeight / 2);
        }

        let currentX = gap;
        for (let i = 0; i < scaledImages.length; i++) {
            const sImg = scaledImages[i];
            const item = items[i];
            ctx.drawImage(sImg.img, currentX, gap + titleHeight, sImg.width, sImg.height);
            
            if (hasItemLabels && item.label.trim() !== '') {
                const labelY = gap + titleHeight + targetHeight;
                ctx.fillStyle = labels.backgroundColor || '#FFFFFF';
                ctx.fillRect(currentX, labelY, sImg.width, finalItemLabelHeight);
                ctx.fillStyle = labels.fontColor || '#000000';
                ctx.font = `bold ${finalItemLabelFontSize}px "Be Vietnam Pro"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.label.trim(), currentX + sImg.width / 2, labelY + finalItemLabelHeight / 2);
            }
            currentX += sImg.width + gap;
        }

    } else if (layout === 'vertical') {
        const targetWidth = Math.max(...loadedImages.map(img => img.width));
        canvas.width = targetWidth + gap * 2;

        const baseFontSize = labels.baseFontSize || 40;
        const referenceWidth = 1500;
        const fontScaleFactor = canvas.width / referenceWidth;
        const finalItemLabelFontSize = Math.max(12, Math.round(baseFontSize * fontScaleFactor));
        const finalTitleFontSize = Math.max(18, Math.round((baseFontSize * 1.5) * fontScaleFactor));
        const labelVerticalPadding = Math.round(finalItemLabelFontSize * 0.6);
        const finalItemLabelHeight = hasItemLabels ? finalItemLabelFontSize + labelVerticalPadding * 2 : 0;
        const titleHeight = hasMainTitle ? finalTitleFontSize + labelVerticalPadding * 2 : 0;
        
        const scaledImages = loadedImages.map(img => {
            const scaleFactor = targetWidth / img.width;
            return { img, width: targetWidth, height: img.height * scaleFactor };
        });

        let totalContentHeight = titleHeight;
        scaledImages.forEach((sImg, i) => {
            totalContentHeight += sImg.height;
            if (hasItemLabels && items[i].label.trim() !== '') {
                totalContentHeight += finalItemLabelHeight;
            }
        });
        totalContentHeight += gap * (loadedImages.length - 1);

        canvas.height = totalContentHeight + gap * 2;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (hasMainTitle) {
            ctx.fillStyle = labels.fontColor || '#000000';
            ctx.font = `bold ${finalTitleFontSize}px "Be Vietnam Pro"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(mainTitle.trim(), canvas.width / 2, gap + titleHeight / 2);
        }

        let currentY = titleHeight + gap;
        for (let i = 0; i < scaledImages.length; i++) {
            const sImg = scaledImages[i];
            const item = items[i];
            ctx.drawImage(sImg.img, gap, currentY, sImg.width, sImg.height);
            currentY += sImg.height;

            if (hasItemLabels && item.label.trim() !== '') {
                ctx.fillStyle = labels.backgroundColor || '#FFFFFF';
                ctx.fillRect(gap, currentY, sImg.width, finalItemLabelHeight);
                ctx.fillStyle = labels.fontColor || '#000000';
                ctx.font = `bold ${finalItemLabelFontSize}px "Be Vietnam Pro"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.label.trim(), gap + sImg.width / 2, currentY + finalItemLabelHeight / 2);
                currentY += finalItemLabelHeight;
            }
            if (i < scaledImages.length - 1) {
                currentY += gap;
            }
        }
    } else { // smart-grid
        const canvasMaxWidth = 1920; 
        const contentWidth = canvasMaxWidth - gap * 2;
        
        const n = loadedImages.length;
        const cols = n > 0 ? Math.ceil(Math.sqrt(n)) : 0;
        const numRows = cols > 0 ? Math.ceil(n / cols) : 0;

        const imageRows: HTMLImageElement[][] = [];
        for (let i = 0; i < numRows; i++) {
            const start = i * cols;
            const end = start + cols;
            const rowImages = loadedImages.slice(start, end);
            if (rowImages.length > 0) {
                imageRows.push(rowImages);
            }
        }
        
        canvas.width = canvasMaxWidth;

        const baseFontSize = labels.baseFontSize || 40;
        const referenceWidth = 1500;
        const fontScaleFactor = canvas.width / referenceWidth;
        const finalItemLabelFontSize = Math.max(12, Math.round(baseFontSize * fontScaleFactor));
        const finalTitleFontSize = Math.max(18, Math.round((baseFontSize * 1.5) * fontScaleFactor));
        const labelVerticalPadding = Math.round(finalItemLabelFontSize * 0.6);
        const finalItemLabelHeight = hasItemLabels ? finalItemLabelFontSize + labelVerticalPadding * 2 : 0;
        const titleHeight = hasMainTitle ? finalTitleFontSize + labelVerticalPadding * 2 : 0;
        
        const finalRowLayouts: { height: number; images: HTMLImageElement[]; items: CombineImageItem[] }[] = [];
        let finalTotalHeight = titleHeight + gap * 2 + Math.max(0, imageRows.length - 1) * gap;
        
        let startIndex = 0;
        for (const row of imageRows) {
            if (row.length === 0) continue;
            
            const rowItems = items.slice(startIndex, startIndex + row.length);
            startIndex += row.length;

            const rowARSum = row.reduce((sum, img) => sum + (img.width / img.height), 0);
            const rowImageHeight = (contentWidth - (row.length - 1) * gap) / rowARSum;
            
            finalRowLayouts.push({ images: row, items: rowItems, height: rowImageHeight });
            finalTotalHeight += rowImageHeight + (hasItemLabels ? finalItemLabelHeight : 0);
        }

        canvas.height = finalTotalHeight;
        
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (hasMainTitle) {
            ctx.fillStyle = labels.fontColor || '#000000';
            ctx.font = `bold ${finalTitleFontSize}px "Be Vietnam Pro"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(mainTitle.trim(), canvas.width / 2, gap + titleHeight / 2);
        }
        
        let yPos = titleHeight + gap;
        for (const layout of finalRowLayouts) {
            let xPos = gap;
            for (let i = 0; i < layout.images.length; i++) {
                const img = layout.images[i];
                const item = layout.items[i];
                const imgAR = img.width / img.height;
                const dWidth = layout.height * imgAR;
                
                ctx.drawImage(img, xPos, yPos, dWidth, layout.height);
                
                if (hasItemLabels && item.label.trim() !== '') {
                    const labelY = yPos + layout.height;
                    ctx.fillStyle = labels.backgroundColor || '#FFFFFF';
                    ctx.fillRect(xPos, labelY, dWidth, finalItemLabelHeight);
                    ctx.fillStyle = labels.fontColor || '#000000';
                    ctx.font = `bold ${finalItemLabelFontSize}px "Be Vietnam Pro"`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(item.label.trim(), xPos + dWidth / 2, labelY + finalItemLabelHeight / 2);
                }

                xPos += dWidth + gap;
            }
            yPos += layout.height + (hasItemLabels ? finalItemLabelHeight : 0) + gap;
        }
    }
    
    return canvas.toDataURL('image/png');
};


// --- NEW: PNG Metadata Utilities for Import/Export ---

const crc32 = (function() {
    let table: number[] | undefined;

    function makeTable() {
        table = [];
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[i] = c;
        }
    }

    return function(bytes: Uint8Array): number {
        if (!table) makeTable();
        let crc = -1;
        for (let i = 0; i < bytes.length; i++) {
            crc = (crc >>> 8) ^ table![(crc ^ bytes[i]) & 0xFF];
        }
        return (crc ^ -1) >>> 0;
    };
})();

export const embedJsonInPng = async (imageDataUrl: string, jsonData: object): Promise<string> => {
    // We can only add chunks to PNGs. If it's another format, return the original.
    if (!imageDataUrl.startsWith('data:image/png;base64,')) {
        console.warn('Cannot embed JSON in non-PNG image. Returning original.');
        return imageDataUrl;
    }
    
    try {
        const blob = await dataURLtoBlob(imageDataUrl);
        const buffer = await blob.arrayBuffer();
        const view = new Uint8Array(buffer);

        // The IEND chunk is always the last 12 bytes of a valid PNG.
        const iendIndex = view.length - 12;

        // Create custom chunk 'apIX' (aPix)
        const chunkType = new TextEncoder().encode('apIX');
        const chunkDataStr = JSON.stringify(jsonData);
        const chunkData = new TextEncoder().encode(chunkDataStr);
        const chunkLength = chunkData.length;

        const fullChunk = new Uint8Array(4 + 4 + chunkLength + 4);
        const chunkDataView = new DataView(fullChunk.buffer);
        
        chunkDataView.setUint32(0, chunkLength, false); // Length (Big Endian)
        fullChunk.set(chunkType, 4); // Type
        fullChunk.set(chunkData, 8); // Data
        
        const crcData = new Uint8Array(4 + chunkLength);
        crcData.set(chunkType);
        crcData.set(chunkData, 4);
        const crc = crc32(crcData);
        chunkDataView.setUint32(8 + chunkLength, crc, false); // CRC (Big Endian)

        const newPngData = new Uint8Array(iendIndex + fullChunk.length + 12);
        newPngData.set(view.slice(0, iendIndex)); // Data before IEND
        newPngData.set(fullChunk, iendIndex); // Our custom chunk
        newPngData.set(view.slice(iendIndex), iendIndex + fullChunk.length); // IEND chunk

        const newBlob = new Blob([newPngData], { type: 'image/png' });

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(newBlob);
        });
    } catch (error) {
        console.error("Failed to embed JSON in PNG:", error);
        return imageDataUrl; // Return original URL on failure
    }
};

export const extractJsonFromPng = async (file: File): Promise<object | null> => {
    try {
        const buffer = await file.arrayBuffer();
        const view = new DataView(buffer);
        const uint8View = new Uint8Array(buffer);

        if (view.getUint32(0) !== 0x89504E47 || view.getUint32(4) !== 0x0D0A1A0A) {
            console.error("Not a valid PNG file for extraction.");
            return null;
        }

        let offset = 8;
        while (offset < view.byteLength) {
            const length = view.getUint32(offset, false);
            const typeBytes = uint8View.slice(offset + 4, offset + 8);
            const type = new TextDecoder().decode(typeBytes);

            if (type === 'apIX') {
                const dataBytes = uint8View.slice(offset + 8, offset + 8 + length);
                const jsonString = new TextDecoder().decode(dataBytes);
                return JSON.parse(jsonString);
            }

            if (type === 'IEND') {
                break;
            }
            offset += 12 + length;
        }
    } catch (error) {
        console.error("Failed to extract JSON from PNG:", error);
    }
    return null;
};