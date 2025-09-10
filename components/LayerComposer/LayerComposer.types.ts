/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- TYPE DEFINITIONS ---
export type BlendMode = 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';

export interface Layer {
    id: string;
    type: 'image' | 'text';
    url?: string;
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight: string;
    fontStyle: 'normal' | 'italic';
    textTransform: 'none' | 'uppercase';
    textAlign?: 'left' | 'center' | 'right';
    color?: string;
    lineHeight?: number;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    blendMode: BlendMode;
    isVisible: boolean;
    isLocked: boolean;
}

export type Point = { x: number; y: number };
export type PenNode = { anchor: Point; inHandle: Point; outHandle: Point };
export type Handle = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';
export type Interaction = {
    type: 'move' | 'resize' | 'rotate' | 'duplicate-move' | 'copy-selection-move' | 'marquee';
    handle?: Handle;
    initialLayers?: Layer[];
    initialPointer: Point;
    initialBoundingBox?: Rect | null; // For resizing group
    initialCenter?: Point;
    initialAngle?: number;
    hasActionStarted?: boolean;
    // For marquee tool
    isShift?: boolean;
    initialSelectedIds?: string[];
};


export interface CanvasSettings {
    width: number;
    height: number;
    background: string;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type MultiLayerAction = 
    | 'align-top' | 'align-middle' | 'align-bottom'
    | 'align-left' | 'align-center' | 'align-right'
    | 'distribute-horizontal' | 'distribute-vertical'
    | 'duplicate' | 'delete';
// FIX: Add getBoundingBoxForLayers utility function here to be shared.
export const getBoundingBoxForLayers = (layersToBound: Layer[]): Rect | null => {
    if (layersToBound.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    layersToBound.forEach(layer => {
        const { x, y, width, height, rotation } = layer;
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const rad = rotation * (Math.PI / 180);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const points = [
            { x: x, y: y },
            { x: x + width, y: y },
            { x: x, y: y + height },
            { x: x + width, y: y + height },
        ];

        points.forEach(p => {
            const translatedX = p.x - centerX;
            const translatedY = p.y - centerY;
            const rotatedX = translatedX * cos - translatedY * sin + centerX;
            const rotatedY = translatedX * sin + translatedY * cos + centerY;
            minX = Math.min(minX, rotatedX);
            minY = Math.min(minY, rotatedY);
            maxX = Math.max(maxX, rotatedX);
            maxY = Math.max(maxY, rotatedY);
        });
    });

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};
