/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Helper function to load an image and return it as an HTMLImageElement
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Failed to load image: ${src.substring(0, 50)}...`));
        img.src = src;
    });
}

/**
 * Draws a star on the canvas.
 * @param ctx The canvas rendering context.
 */
function drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
}


/**
 * Creates a single "photo album" page image from a collection of profession images.
 * @param imageData A record mapping profession strings to their image data URLs.
 * @returns A promise that resolves to a data URL of the generated album page (JPEG format).
 */
export async function createAlbumPage(imageData: Record<string, string>): Promise<string> {
    const canvas = document.createElement('canvas');
    const canvasWidth = 3508;
    const canvasHeight = 2480;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get 2D canvas context');
    }

    // 1. Draw the background
    ctx.fillStyle = '#8C1B17'; 
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Draw the background star
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 0, 0.15)';
    drawStar(ctx, canvasWidth / 2, canvasHeight / 2, 5, canvasHeight * 0.6, canvasHeight * 0.3);
    ctx.fill();
    ctx.restore();


    // 3. Draw the titles
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    
    ctx.font = `bold 180px 'Dancing Script', cursive`;
    ctx.fillText('Người trong muôn nghề', canvasWidth / 2, 280);

    ctx.font = `bold 50px 'Mali', cursive`;
    ctx.fillText('Bạn sẽ như thế nào nếu làm các nghề khác nhau.', canvasWidth / 2, 380);


    // 4. Load all the polaroid images concurrently
    const professions = Object.keys(imageData);
    const loadedImages = await Promise.all(
        Object.values(imageData).map(url => loadImage(url))
    );

    const imagesWithProfessions = professions.map((profession, index) => ({
        profession,
        img: loadedImages[index],
    }));
    const numImages = imagesWithProfessions.length;

    // 5. Define layout for polaroids
    const polaroidWidth = 620;
    const polaroidHeight = 750;
    const gap = 80;

    const totalWidth = (numImages * polaroidWidth) + ((numImages - 1) * gap);
    const startX = (canvasWidth - totalWidth) / 2;
    const startY = (canvasHeight - polaroidHeight) / 2 + 50; // Center vertically and shift down a bit
    
    // 6. Draw each polaroid
    imagesWithProfessions.forEach(({ profession, img }, index) => {
        const x = startX + index * (polaroidWidth + gap);
        const y = startY;
        
        ctx.save();
        
        // Translate context to the top-left of the polaroid
        ctx.translate(x, y);
        
        // Draw a soft shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 15;
        
        // Draw the white polaroid frame
        ctx.fillStyle = '#F8F8F8';
        ctx.fillRect(0, 0, polaroidWidth, polaroidHeight);
        
        // Remove shadow for subsequent drawing
        ctx.shadowColor = 'transparent';

        // Define image container dimensions
        const padding = 35;
        const captionAreaHeight = 150;
        const imageContainerWidth = polaroidWidth - (padding * 2);
        const imageContainerHeight = polaroidHeight - (padding * 2) - captionAreaHeight;
        
        // Calculate image dimensions to fit while maintaining aspect ratio
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        let drawWidth = imageContainerWidth;
        let drawHeight = drawWidth / aspectRatio;

        if (drawHeight > imageContainerHeight) {
            drawHeight = imageContainerHeight;
            drawWidth = drawHeight * aspectRatio;
        }

        // Calculate position to center the image within its container area
        const imgX = padding + (imageContainerWidth - drawWidth) / 2;
        const imgY = padding + (imageContainerHeight - drawHeight) / 2;
        
        ctx.drawImage(img, imgX, imgY, drawWidth, drawHeight);
        
        // Draw the handwritten caption
        ctx.fillStyle = '#111';
        ctx.font = `bold 75px 'Mali', cursive`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const captionY = padding + imageContainerHeight + (captionAreaHeight / 2);

        ctx.fillText(profession, polaroidWidth / 2, captionY);
        
        ctx.restore(); // Restore context to pre-transformation state
    });

    // Convert canvas to a high-quality JPEG and return the data URL
    return canvas.toDataURL('image/jpeg', 0.95);
}