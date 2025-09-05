/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { type Point, type Rect, type CropResizeHandle } from './ImageEditor.types';
import { HANDLE_SIZE } from './ImageEditor.constants';

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s * 100, l * 100];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [r * 255, g * 255, b * 255];
}

export const isPointInRect = (point: Point, rect: Rect) => (
    point.x >= rect.x && point.x <= rect.x + rect.width &&
    point.y >= rect.y && point.y <= rect.y + rect.height
);

export const getRatioValue = (ratioStr: string, image: HTMLImageElement | null): number | null => {
    if (ratioStr === 'Free') return null;
    if (ratioStr === 'Original' && image) return image.naturalWidth / image.naturalHeight;
    const parts = ratioStr.split(':');
    if (parts.length !== 2) return null;
    const [w, h] = parts.map(Number);
    if (isNaN(w) || isNaN(h) || h === 0) return null;
    return w / h;
};

export const getHandleAtPoint = (point: Point, selection: Rect): CropResizeHandle | null => {
    const { x, y, width, height } = selection;
    const right = x + width;
    const bottom = y + height;
    const checkRadius = HANDLE_SIZE / 2;

    const onTopEdge = Math.abs(point.y - y) < checkRadius;
    const onBottomEdge = Math.abs(point.y - bottom) < checkRadius;
    const onLeftEdge = Math.abs(point.x - x) < checkRadius;
    const onRightEdge = Math.abs(point.x - right) < checkRadius;
    const withinY = point.y > y - checkRadius && point.y < bottom + checkRadius;
    const withinX = point.x > x - checkRadius && point.x < right + checkRadius;

    if (onTopEdge && onLeftEdge) return 'topLeft';
    if (onTopEdge && onRightEdge) return 'topRight';
    if (onBottomEdge && onLeftEdge) return 'bottomLeft';
    if (onBottomEdge && onRightEdge) return 'bottomRight';
    if (onTopEdge && withinX) return 'top';
    if (onBottomEdge && withinX) return 'bottom';
    if (onLeftEdge && withinY) return 'left';
    if (onRightEdge && withinX) return 'right';

    return null;
}

export const getCursorForHandle = (handle: CropResizeHandle | null): string => {
    switch (handle) {
        case 'topLeft': case 'bottomRight': return 'nwse-resize';
        case 'topRight': case 'bottomLeft': return 'nesw-resize';
        case 'top': case 'bottom': return 'ns-resize';
        case 'left': case 'right': return 'ew-resize';
        default: return '';
    }
}

export const approximateCubicBezier = (p0: Point, p1: Point, p2: Point, p3: Point, t_steps: number = 20): Point[] => {
    const points: Point[] = [];
    for (let i = 0; i <= t_steps; i++) {
        const t = i / t_steps;
        const u = 1 - t; const tt = t * t; const uu = u * u;
        const uuu = uu * u; const ttt = tt * t;
        const p = {
            x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
            y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
        };
        points.push(p);
    }
    return points;
};

export function hexToRgba(hex: string, opacity: number): string {
    if (!hex.startsWith('#')) return hex;
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r},${g},${b},${opacity / 100})`;
}
