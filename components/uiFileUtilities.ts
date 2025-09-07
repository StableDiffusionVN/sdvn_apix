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
 * Triggers a browser download for a given URL.
 * @param url The URL of the file to download (can be a data URL).
 * @param filename The desired name for the downloaded file.
 */
export const downloadImage = (url: string, filename: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        labels = { enabled: false, fontColor: '#000000', backgroundColor: '#FFFFFF' }
    } = options;
    
    const loadedImages = await Promise.all(items.map(item => loadImage(item.url)));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Không thể lấy context của canvas.");
    
    const hasMainTitle = labels.enabled && mainTitle.trim() !== '';
    const hasItemLabels = labels.enabled && items.some(item => item.label.trim() !== '');
    
    // Standardize label font size and padding for consistency
    const itemLabelFontSize = 40;
    const labelVerticalPadding = 24;
    const finalItemLabelHeight = hasItemLabels ? itemLabelFontSize + labelVerticalPadding * 2 : 0;

    if (layout === 'horizontal') {
        const titleFontSize = Math.max(24, Math.min(80, (loadedImages.reduce((sum, img) => sum + img.width, 0)) / 25));
        const titleHeight = hasMainTitle ? titleFontSize + labelVerticalPadding * 2 : 0;
        const targetHeight = Math.max(...loadedImages.map(img => img.height));

        const scaledImages = loadedImages.map(img => {
            const scaleFactor = targetHeight / img.height;
            return { img, width: img.width * scaleFactor, height: targetHeight };
        });

        const totalContentWidth = scaledImages.reduce((sum, sImg) => sum + sImg.width, 0) + (gap * (loadedImages.length - 1));
        const totalContentHeight = titleHeight + targetHeight + finalItemLabelHeight;

        canvas.width = totalContentWidth + gap * 2;
        canvas.height = totalContentHeight + gap * 2;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (hasMainTitle) {
            ctx.fillStyle = labels.fontColor || '#000000';
            ctx.font = `bold ${titleFontSize}px "Be Vietnam Pro"`;
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
                ctx.font = `bold ${itemLabelFontSize}px "Be Vietnam Pro"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.label.trim(), currentX + sImg.width / 2, labelY + finalItemLabelHeight / 2);
            }
            currentX += sImg.width + gap;
        }

    } else if (layout === 'vertical') {
        const targetWidth = Math.max(...loadedImages.map(img => img.width));
        const titleFontSize = Math.max(24, Math.min(80, targetWidth / 20));
        const titleHeight = hasMainTitle ? titleFontSize + labelVerticalPadding * 2 : 0;
        
        const scaledImages = loadedImages.map(img => {
            const scaleFactor = targetWidth / img.width;
            return { img, width: targetWidth, height: img.height * scaleFactor };
        });

        let totalContentHeight = titleHeight;
        scaledImages.forEach((_sImg, i) => {
            totalContentHeight += scaledImages[i].height;
            if (hasItemLabels && items[i].label.trim() !== '') {
                totalContentHeight += finalItemLabelHeight;
            }
        });
        totalContentHeight += gap * (loadedImages.length - 1);

        canvas.width = targetWidth + gap * 2;
        canvas.height = totalContentHeight + gap * 2;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (hasMainTitle) {
            ctx.fillStyle = labels.fontColor || '#000000';
            ctx.font = `bold ${titleFontSize}px "Be Vietnam Pro"`;
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
                ctx.font = `bold ${itemLabelFontSize}px "Be Vietnam Pro"`;
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
        
        // NEW: Square-root algorithm for row partitioning to prioritize horizontal layout
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
        
        const titleFontSize = Math.max(24, Math.min(96, canvasMaxWidth / 25));
        const titleHeight = hasMainTitle ? titleFontSize + labelVerticalPadding * 2 : 0;

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

        canvas.width = canvasMaxWidth;
        canvas.height = finalTotalHeight;
        
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (hasMainTitle) {
            ctx.fillStyle = labels.fontColor || '#000000';
            ctx.font = `bold ${titleFontSize}px "Be Vietnam Pro"`;
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
                    ctx.font = `bold ${itemLabelFontSize}px "Be Vietnam Pro"`;
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