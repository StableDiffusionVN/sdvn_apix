/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type ImageToEdit } from './uiUtils';
import { cn } from '../lib/utils';

// --- Reusable Range Slider Component ---
interface RangeSliderProps {
    id: string;
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    onReset: () => void;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ id, label, value, min, max, step, onChange, onReset }) => (
    <div className="w-full">
        <div className="flex justify-between items-center mb-1">
            <label htmlFor={id} className="base-font font-bold text-neutral-200 text-sm">{label}</label>
            <div className="flex items-center gap-2">
                <span className="text-xs font-mono w-8 text-right text-neutral-300">{value.toFixed(0)}</span>
                <button
                    onClick={onReset}
                    className="text-xs text-neutral-400 hover:text-yellow-400 transition-colors"
                    aria-label={`Reset ${label}`}
                >
                    Reset
                </button>
            </div>
        </div>
        <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="slider-track"
        />
    </div>
);


// --- Main Image Editor Modal Component ---
interface ImageEditorModalProps {
    imageToEdit: ImageToEdit | null;
    onClose: () => void;
}

// --- Types & Constants ---
type CropAction =
    | { type: 'drawing' }
    | { type: 'moving' }
    | { type: 'resizing'; handle: ResizeHandle }
    | null;
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };

// NEW: Color Adjustment Types
type ColorChannel = 'reds' | 'yellows' | 'greens' | 'aquas' | 'blues' | 'magentas';
interface HSLAdjustment {
    h: number; // hue shift
    s: number; // saturation shift
    l: number; // luminance shift
}
type ColorAdjustments = Record<ColorChannel, HSLAdjustment>;
const COLOR_CHANNELS: { id: ColorChannel, name: string, hueRange: [number, number], color: string }[] = [
    { id: 'reds',     name: 'Reds',     hueRange: [330, 30],  color: '#ef4444' },
    { id: 'yellows',  name: 'Yellows',  hueRange: [30, 90],   color: '#f59e0b' },
    { id: 'greens',   name: 'Greens',   hueRange: [90, 150],  color: '#22c55e' },
    { id: 'aquas',    name: 'Aquas',    hueRange: [150, 210], color: '#22d3ee' },
    { id: 'blues',    name: 'Blues',    hueRange: [210, 270], color: '#3b82f6' },
    { id: 'magentas', name: 'Magentas', hueRange: [270, 330], color: '#d946ef' },
];

const CROP_PRESETS = [
  { name: 'Free', ratio: 0 },
  { name: 'Original', ratio: -1 },
  { name: '1:1', ratio: 1 },
  { name: '3:2', ratio: 3 / 2 },
  { name: '2:3', ratio: 2 / 3 },
  { name: '4:3', ratio: 4 / 3 },
  { name: '3:4', ratio: 3 / 4 },
  { name: '5:4', ratio: 5 / 4 },
  { name: '4:5', ratio: 4 / 5 },
  { name: '16:9', ratio: 16 / 9 },
  { name: '9:16', ratio: 9 / 16 },
];
const HANDLE_SIZE = 8;


// --- Color Conversion Helpers ---
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
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
    return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
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

// --- Crop UI Helpers ---
const getHandleAtPoint = (point: Point, rect: Rect): ResizeHandle | null => {
    const halfHandle = HANDLE_SIZE / 2;
    if (point.x > rect.x - halfHandle && point.x < rect.x + halfHandle) {
        if (point.y > rect.y - halfHandle && point.y < rect.y + halfHandle) return 'nw';
        if (point.y > rect.y + rect.height - halfHandle && point.y < rect.y + rect.height + halfHandle) return 'sw';
        if (point.y > rect.y + rect.height / 2 - halfHandle && point.y < rect.y + rect.height / 2 + halfHandle) return 'w';
    }
    if (point.x > rect.x + rect.width - halfHandle && point.x < rect.x + rect.width + halfHandle) {
        if (point.y > rect.y - halfHandle && point.y < rect.y + halfHandle) return 'ne';
        if (point.y > rect.y + rect.height - halfHandle && point.y < rect.y + rect.height + halfHandle) return 'se';
        if (point.y > rect.y + rect.height / 2 - halfHandle && point.y < rect.y + rect.height / 2 + halfHandle) return 'e';
    }
    if (point.x > rect.x + rect.width / 2 - halfHandle && point.x < rect.x + rect.width / 2 + halfHandle) {
        if (point.y > rect.y - halfHandle && point.y < rect.y + halfHandle) return 'n';
        if (point.y > rect.y + rect.height - halfHandle && point.y < rect.y + rect.height + halfHandle) return 's';
    }
    return null;
};
const getCursorForHandle = (handle: ResizeHandle | null) => {
    switch (handle) {
        case 'nw': case 'se': return 'nwse-resize';
        case 'ne': case 'sw': return 'nesw-resize';
        case 'n': case 's': return 'ns-resize';
        case 'e': case 'w': return 'ew-resize';
        default: return 'move';
    }
};

const INITIAL_COLOR_ADJUSTMENTS: ColorAdjustments = {
    reds: { h: 0, s: 0, l: 0 },
    yellows: { h: 0, s: 0, l: 0 },
    greens: { h: 0, s: 0, l: 0 },
    aquas: { h: 0, s: 0, l: 0 },
    blues: { h: 0, s: 0, l: 0 },
    magentas: { h: 0, s: 0, l: 0 },
};

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ imageToEdit, onClose }) => {
    // Internal state for the image being edited to avoid prop drilling issues
    const [internalImageUrl, setInternalImageUrl] = useState<string | null>(null);

    // Filter states
    const [luminance, setLuminance] = useState(0);
    const [contrast, setContrast] = useState(0);
    const [temp, setTemp] = useState(0);
    const [tint, setTint] = useState(0);
    const [saturation, setSaturation] = useState(0);
    const [vibrance, setVibrance] = useState(0);
    const [hue, setHue] = useState(0);
    const [grain, setGrain] = useState(0);
    const [clarity, setClarity] = useState(0);
    const [dehaze, setDehaze] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [flipHorizontal, setFlipHorizontal] = useState(false);
    const [flipVertical, setFlipVertical] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [colorAdjustments, setColorAdjustments] = useState<ColorAdjustments>(INITIAL_COLOR_ADJUSTMENTS);
    const [activeColorTab, setActiveColorTab] = useState<ColorChannel>('reds');
    
    // UI states
    const [openSection, setOpenSection] = useState<'adj' | 'hls' | 'effects' | null>('adj');

    // Image and Crop states
    const [isCropping, setIsCropping] = useState(false);
    const [cropRect, setCropRect] = useState<Rect | null>(null);
    const [cropAction, setCropAction] = useState<CropAction>(null);
    const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
    const [initialCropRect, setInitialCropRect] = useState<Rect | null>(null);
    const [activePreset, setActivePreset] = useState('Free');

    // Refs
    const sourceImageRef = useRef<HTMLImageElement | null>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const originalPreviewData = useRef<ImageData | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const isOpen = imageToEdit !== null;

    const resetAll = useCallback(() => {
        setLuminance(0); setContrast(0); setTemp(0); setTint(0); setSaturation(0);
        setVibrance(0); setHue(0); setRotation(0); setFlipHorizontal(false); setFlipVertical(false);
        setGrain(0); setClarity(0); setDehaze(0);
        setIsCropping(false); setCropRect(null); setCropAction(null);
        setDragStartPoint(null); setInitialCropRect(null); setActivePreset('Free');
        setColorAdjustments(INITIAL_COLOR_ADJUSTMENTS);
        setActiveColorTab('reds');
        setOpenSection('adj');
        if (previewCanvasRef.current) {
            previewCanvasRef.current.style.cursor = 'default';
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setInternalImageUrl(imageToEdit?.url ?? null);
            resetAll();
        }
    }, [isOpen, imageToEdit?.url, resetAll]);
    
    const applyPixelAdjustments = useCallback((sourceImageData: ImageData) => {
        const data = new Uint8ClampedArray(sourceImageData.data);
        const contrastFactor = (100 + contrast) / 100;

        // Pre-calculate factors
        const clarityFactor = clarity / 200; // Range -0.5 to 0.5
        const dehazeFactor = dehaze / 100;   // Range -1 to 1
        const grainAmount = grain * 2.55;  // Scale 0-100 to 0-255

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i], g = data[i + 1], b = data[i + 2];
            
            // Apply global adjustments (Contrast, Temp, Tint)
            r = (r - 127.5) * contrastFactor + 127.5;
            g = (g - 127.5) * contrastFactor + 127.5;
            b = (b - 127.5) * contrastFactor + 127.5;
            
            r += temp / 2.5; g += tint / 2.5; b -= temp / 2.5;

            // Convert to HSL for other adjustments
            let [h, s, l] = rgbToHsl(r, g, b);
            
            // Global HSL adjustments
            h += hue / 360;
            l += luminance / 200;
            s += saturation / 100;

            const vibranceAmount = vibrance / 100;
            if (vibranceAmount !== 0) {
                 const max_rgb = Math.max(r, g, b); const avg_rgb = (r + g + b) / 3; const sat_delta = max_rgb - avg_rgb;
                 const vibrance_mult = Math.abs(sat_delta * 2 / 255);
                 s += (vibranceAmount > 0) ? (vibranceAmount * (1 - s) * vibrance_mult) : (vibranceAmount * s * vibrance_mult);
            }

            // Effects adjustments
            if (clarity !== 0) {
                l += (l - 0.5) * clarityFactor;
            }
            if (dehaze !== 0) {
                // Simplified dehaze: increase contrast and saturation
                l = l - (0.5 - l) * dehazeFactor;
                s = s + s * (1 - s) * dehazeFactor * 0.5;
            }

            // Apply per-color adjustments (HLS section)
            const pixelHueDeg = h * 360;
            for (const channel of COLOR_CHANNELS) {
                const [start, end] = channel.hueRange;
                const isInRange = start > end
                    ? (pixelHueDeg >= start || pixelHueDeg < end)
                    : (pixelHueDeg >= start && pixelHueDeg < end);
                
                if (isInRange) {
                    const adj = colorAdjustments[channel.id];
                    h += adj.h / 360;
                    s += adj.s / 100;
                    l += adj.l / 100;
                    break;
                }
            }

            // Normalize HSL and convert back to RGB
            if (h > 1) h -= 1; if (h < 0) h += 1;
            s = Math.max(0, Math.min(1, s));
            l = Math.max(0, Math.min(1, l));
            
            [r, g, b] = hslToRgb(h, s, l);

            // Apply Grain (final step before writing pixel)
            if (grain > 0) {
                const noise = (Math.random() - 0.5) * grainAmount;
                r += noise; g += noise; b += noise;
            }
            
            data[i] = r; data[i+1] = g; data[i+2] = b;
        }
        return new ImageData(data, sourceImageData.width, sourceImageData.height);
    }, [luminance, contrast, temp, tint, saturation, vibrance, hue, colorAdjustments, grain, clarity, dehaze]);

    const drawAdjustedImage = useCallback(() => {
        if (!originalPreviewData.current || !previewCanvasRef.current) return;
        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const adjustedImageData = applyPixelAdjustments(originalPreviewData.current);
        ctx.putImageData(adjustedImageData, 0, 0);

        // Draw crop UI on top if active
        if (isCropping && cropRect) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.putImageData(adjustedImageData, 0, 0, cropRect.x, cropRect.y, cropRect.width, cropRect.height);
            
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
            ctx.lineWidth = 2;
            ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
            
            ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
            const { x, y, width, height } = cropRect;
            const halfHandle = HANDLE_SIZE / 2;
            const handles = {
                nw: { x: x - halfHandle, y: y - halfHandle }, n: { x: x + width / 2 - halfHandle, y: y - halfHandle }, ne: { x: x + width - halfHandle, y: y - halfHandle },
                e: { x: x + width - halfHandle, y: y + height / 2 - halfHandle }, se: { x: x + width - halfHandle, y: y + height - halfHandle }, s: { x: x + width / 2 - halfHandle, y: y + height - halfHandle },
                sw: { x: x - halfHandle, y: y + height - halfHandle }, w: { x: x - halfHandle, y: y + height / 2 - halfHandle },
            };
            Object.values(handles).forEach(p => ctx.fillRect(p.x, p.y, HANDLE_SIZE, HANDLE_SIZE));
        }
    }, [applyPixelAdjustments, isCropping, cropRect]);


    useEffect(() => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(drawAdjustedImage);
        return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current) };
    }, [drawAdjustedImage]);

    const setupCanvas = useCallback(() => {
        if (!internalImageUrl || !previewCanvasRef.current) return;
        
        const canvas = previewCanvasRef.current;
        const container = canvas.parentElement;
        if (!container) return;

        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = internalImageUrl;
        image.onload = () => {
            sourceImageRef.current = image;
            const containerRect = container.getBoundingClientRect();
            
            const isSwapped = rotation === 90 || rotation === 270;
            const imageAspectRatio = isSwapped
                ? image.naturalHeight / image.naturalWidth
                : image.naturalWidth / image.naturalHeight;
                
            const containerAspectRatio = containerRect.width / containerRect.height;
            
            let canvasWidth, canvasHeight;
            if (imageAspectRatio > containerAspectRatio) {
                canvasWidth = containerRect.width;
                canvasHeight = containerRect.width / imageAspectRatio;
            } else {
                canvasHeight = containerRect.height;
                canvasWidth = containerRect.height * imageAspectRatio;
            }
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();

            const drawWidth = isSwapped ? canvasHeight : canvasWidth;
            const drawHeight = isSwapped ? canvasWidth : canvasHeight;
            
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(rotation * Math.PI / 180);
            ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
            
            ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            ctx.restore();

            originalPreviewData.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
            drawAdjustedImage();
        };
    }, [internalImageUrl, flipHorizontal, flipVertical, rotation, drawAdjustedImage]);

    useEffect(() => {
        if (isOpen && internalImageUrl) {
            setupCanvas();
        }
    }, [isOpen, internalImageUrl, setupCanvas]);

    const handleSave = useCallback(async () => {
        if (!sourceImageRef.current || !imageToEdit) return;
        setIsLoading(true);
        
        setTimeout(() => {
            const image = sourceImageRef.current;
            const canvas = document.createElement('canvas');
            
            const isSwapped = rotation === 90 || rotation === 270;
            canvas.width = isSwapped ? image.naturalHeight : image.naturalWidth;
            canvas.height = isSwapped ? image.naturalWidth : image.naturalHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) { setIsLoading(false); return; }

            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(rotation * Math.PI / 180);
            ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
            ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2, image.naturalWidth, image.naturalHeight);
            ctx.restore();
            
            const sourceImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const finalImageData = applyPixelAdjustments(sourceImageData);
            ctx.putImageData(finalImageData, 0, 0);
            
            const base64Image = canvas.toDataURL('image/png');
            imageToEdit.onSave(base64Image);
            setIsLoading(false);
            onClose();
        }, 50);

    }, [applyPixelAdjustments, flipHorizontal, flipVertical, rotation, imageToEdit, onClose]);
    
    // --- CROP EVENT HANDLERS ---
    const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
        if (!previewCanvasRef.current) return null;
        const canvas = previewCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const handleCropMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isCropping) return;
        const coords = getCoords(e);
        if (!coords) return;
        
        e.preventDefault();
        setDragStartPoint(coords);
        
        if (cropRect) {
            const handle = getHandleAtPoint(coords, cropRect);
            if (handle) {
                setCropAction({ type: 'resizing', handle }); setInitialCropRect(cropRect); return;
            }
            if (coords.x > cropRect.x && coords.x < cropRect.x + cropRect.width && coords.y > cropRect.y && coords.y < cropRect.y + cropRect.height) {
                 setCropAction({ type: 'moving' }); setInitialCropRect(cropRect); return;
            }
        }
        setCropAction({ type: 'drawing' });
        setActivePreset('Free');
        setCropRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
    };
    
    const handleCropMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isCropping) return;
        const coords = getCoords(e);
        if (!coords) return;

        const canvas = previewCanvasRef.current;
        if (canvas) {
            if (cropRect && !cropAction) {
                const handle = getHandleAtPoint(coords, cropRect);
                if (handle) { canvas.style.cursor = getCursorForHandle(handle); } 
                else if (coords.x > cropRect.x && coords.x < cropRect.x + cropRect.width && coords.y > cropRect.y && coords.y < cropRect.y + cropRect.height) { canvas.style.cursor = 'move'; } 
                else { canvas.style.cursor = 'crosshair'; }
            } else if (!cropAction) { canvas.style.cursor = 'crosshair'; }
        }
        
        if (!cropAction || !dragStartPoint) return;
        e.preventDefault();

        const deltaX = coords.x - dragStartPoint.x;
        const deltaY = coords.y - dragStartPoint.y;

        if (cropAction.type === 'drawing' && cropRect) {
            const newRect = {
                x: deltaX > 0 ? cropRect.x : dragStartPoint.x + deltaX, y: deltaY > 0 ? cropRect.y : dragStartPoint.y + deltaY,
                width: Math.abs(deltaX), height: Math.abs(deltaY),
            };
            setCropRect(newRect);
        } else if (cropAction.type === 'moving' && initialCropRect) {
            const canvas = previewCanvasRef.current; if (!canvas) return;
            const newRect = { ...initialCropRect };
            newRect.x = Math.max(0, Math.min(initialCropRect.x + deltaX, canvas.width - initialCropRect.width));
            newRect.y = Math.max(0, Math.min(initialCropRect.y + deltaY, canvas.height - initialCropRect.height));
            setCropRect(newRect);
        } else if (cropAction.type === 'resizing' && initialCropRect) {
             const canvas = previewCanvasRef.current; if (!canvas) return;
            let { x, y, width, height } = initialCropRect;
            const handle = cropAction.handle;
            const preset = CROP_PRESETS.find(p => p.name === activePreset);
            const ratio = preset ? preset.ratio : 0;
            if (handle.includes('e')) { width = Math.min(canvas.width - x, Math.max(0, initialCropRect.width + deltaX)); }
            if (handle.includes('w')) {
                const newWidth = Math.max(0, initialCropRect.width - deltaX);
                x = initialCropRect.x + initialCropRect.width - newWidth; width = newWidth;
                if(x < 0) { width += x; x = 0; }
            }
            if (handle.includes('s')) { height = Math.min(canvas.height - y, Math.max(0, initialCropRect.height + deltaY)); }
            if (handle.includes('n')) {
                const newHeight = Math.max(0, initialCropRect.height - deltaY);
                y = initialCropRect.y + initialCropRect.height - newHeight; height = newHeight;
                 if(y < 0) { height += y; y = 0; }
            }
            if (ratio > 0) {
                 if (handle.includes('n') || handle.includes('s')) {
                    const newWidth = height * ratio;
                    if(handle.includes('w')) { x += width - newWidth; }
                    width = newWidth;
                } else {
                    const newHeight = width / ratio;
                     if(handle.includes('n')) { y += height - newHeight; }
                    height = newHeight;
                }
                if (x + width > canvas.width) { width = canvas.width - x; height = width / ratio; }
                if (y + height > canvas.height) { height = canvas.height - y; width = height * ratio; }
                 if(x < 0) { const w_delta = -x; x=0; width -= w_delta; height = width / ratio; }
                 if(y < 0) { const h_delta = -y; y=0; height -= h_delta; width = height * ratio; }
            }
            setCropRect({ x, y, width, height });
        }
    };
    
    const handleCropMouseUp = () => {
        setCropAction(null); setInitialCropRect(null);
    };
    
    const handlePresetSelect = (presetName: string) => {
        setActivePreset(presetName);
        if (!previewCanvasRef.current || !sourceImageRef.current) return;
        const canvas = previewCanvasRef.current;
        const preset = CROP_PRESETS.find(p => p.name === presetName); if (!preset) return;
        let ratio = preset.ratio;
        if (ratio === -1) { ratio = sourceImageRef.current.naturalWidth / sourceImageRef.current.naturalHeight; }
        if (ratio <= 0) { setCropRect(null); return; }
        let rectWidth, rectHeight;
        if (canvas.width / canvas.height > ratio) { rectHeight = canvas.height; rectWidth = rectHeight * ratio; } 
        else { rectWidth = canvas.width; rectHeight = rectWidth / ratio; }
        setCropRect({ x: (canvas.width - rectWidth) / 2, y: (canvas.height - rectHeight) / 2, width: rectWidth, height: rectHeight });
    };

    const handleApplyCrop = () => {
        if (!cropRect || !sourceImageRef.current || cropRect.width < 1 || cropRect.height < 1 || !previewCanvasRef.current) {
            setIsCropping(false);
            setCropRect(null);
            return;
        }
    
        const image = sourceImageRef.current;
        const previewCanvas = previewCanvasRef.current;
    
        const transformedCanvas = document.createElement('canvas');
        const isSwapped = rotation === 90 || rotation === 270;
        transformedCanvas.width = isSwapped ? image.naturalHeight : image.naturalWidth;
        transformedCanvas.height = isSwapped ? image.naturalWidth : image.naturalHeight;
        const ctx = transformedCanvas.getContext('2d');
        if (!ctx) return;
        
        ctx.translate(transformedCanvas.width / 2, transformedCanvas.height / 2);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
        ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2, image.naturalWidth, image.naturalHeight);
    
        const scaleX = transformedCanvas.width / previewCanvas.width;
        const scaleY = transformedCanvas.height / previewCanvas.height;
    
        const sourceX = cropRect.x * scaleX;
        const sourceY = cropRect.y * scaleY;
        const sourceWidth = cropRect.width * scaleX;
        const sourceHeight = cropRect.height * scaleY;
    
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = sourceWidth;
        cropCanvas.height = sourceHeight;
        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) return;
    
        cropCtx.drawImage(
            transformedCanvas,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, sourceWidth, sourceHeight
        );
        
        const croppedDataUrl = cropCanvas.toDataURL('image/png');
        setInternalImageUrl(croppedDataUrl);
    
        setRotation(0);
        setFlipHorizontal(false);
        setFlipVertical(false);
        setIsCropping(false);
        setCropRect(null);
        setActivePreset('Free');
    };
    
    const handleCancelCrop = () => { setIsCropping(false); setCropRect(null); };

    const transformButtonClasses = "flex-1 p-2 bg-neutral-700 text-neutral-200 rounded-md hover:bg-neutral-600 transition-colors flex items-center justify-center gap-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-700";
    const accordionHeaderClasses = "w-full flex justify-between items-center p-3 bg-neutral-700 hover:bg-neutral-600 transition-colors";

    const handleColorAdjustmentChange = (channel: ColorChannel, type: keyof HSLAdjustment, value: number) => {
        setColorAdjustments(prev => ({ ...prev, [channel]: { ...prev[channel], [type]: value }}));
    };
    const handleColorAdjustmentReset = (channel: ColorChannel, type: keyof HSLAdjustment) => {
        setColorAdjustments(prev => ({ ...prev, [channel]: { ...prev[channel], [type]: 0 }}));
    };
    const currentChannelAdjustments = colorAdjustments[activeColorTab];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose} className="modal-overlay z-[60]"
                    aria-modal="true" role="dialog"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()} className="modal-content !max-w-6xl !h-[90vh] image-editor-modal-content"
                    >
                        <div className="flex flex-col md:flex-row gap-8 w-full h-full overflow-hidden">
                            {/* Left Column: Image Preview */}
                            <div className="flex-1 flex items-center justify-center min-h-0">
                                <div className="image-editor-preview-container w-full h-full">
                                    <canvas
                                        ref={previewCanvasRef} className="image-editor-preview"
                                        onMouseDown={handleCropMouseDown} onMouseMove={handleCropMouseMove}
                                        onMouseUp={handleCropMouseUp} onMouseLeave={handleCropMouseUp}
                                        onTouchStart={handleCropMouseDown} onTouchMove={handleCropMouseMove} onTouchEnd={handleCropMouseUp}
                                    />
                                </div>
                            </div>
                            
                            {/* Right Column: Controls and Actions */}
                            <div className="flex flex-col flex-shrink-0 md:w-80">
                                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                    <h3 className="base-font font-bold text-2xl text-yellow-400">Image Editor</h3>
                                    <button onClick={resetAll} className="btn btn-secondary btn-sm !text-xs !py-1 !px-3">Reset All</button>
                                </div>
                                
                                <div className="flex-shrink-0 space-y-2 border border-neutral-700 rounded-lg p-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="base-font font-bold text-neutral-200">Transform</h4>
                                        <button onClick={() => setIsCropping(prev => !prev)} className={cn('px-3 py-1 text-sm rounded-md transition-colors', isCropping ? 'bg-yellow-400 text-black' : 'bg-neutral-600 hover:bg-neutral-500 text-white' )}>
                                            {isCropping ? 'Cancel Crop' : 'Crop'}
                                        </button>
                                    </div>
                                    <AnimatePresence>
                                        {isCropping && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                <div className="pt-2 flex flex-wrap gap-2">
                                                    {CROP_PRESETS.map(p => (
                                                        <button key={p.name} onClick={() => handlePresetSelect(p.name)} className={cn("px-2 py-1 text-xs rounded-md transition-colors", activePreset === p.name ? 'bg-yellow-400 text-black' : 'bg-neutral-600 hover:bg-neutral-500 text-white')}>
                                                            {p.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <button onClick={() => setRotation(r => (r - 90 + 360) % 360)} className={transformButtonClasses} disabled={isCropping}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-6 6m0 0l-6-6m6 6V9a6 6 0 0112 0v3" /></svg>
                                            Rotate Left
                                        </button>
                                        <button onClick={() => setRotation(r => (r + 90) % 360)} className={transformButtonClasses} disabled={isCropping}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15l6 6m0 0l6-6m-6 6V9a6 6 0 00-12 0v3" /></svg>
                                            Rotate Right
                                        </button>
                                        <button onClick={() => setFlipHorizontal(f => !f)} className={transformButtonClasses} disabled={isCropping}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 12L4 13m3 3l3-3m7-3v12m0-12l3-3m-3 3l-3 3" /></svg>
                                            Flip Horizontal
                                        </button>
                                        <button onClick={() => setFlipVertical(f => !f)} className={transformButtonClasses} disabled={isCropping}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7l-4 4-4-4m8 10l-4-4-4 4" /></svg>
                                            Flip Vertical
                                        </button>
                                    </div>
                                </div>

                                <div className={`flex-grow overflow-y-auto space-y-2 pr-2 -mr-2 mt-4 transition-opacity duration-200 ${isCropping ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                                    {/* Basic Section */}
                                    <div className="border border-neutral-700 rounded-lg overflow-hidden">
                                        <button onClick={() => setOpenSection(openSection === 'adj' ? null : 'adj')} className={accordionHeaderClasses} aria-expanded={openSection === 'adj'}>
                                            <h4 className="base-font font-bold text-neutral-200">Basic</h4>
                                            <motion.div animate={{ rotate: openSection === 'adj' ? 180 : 0 }}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></motion.div>
                                        </button>
                                        <AnimatePresence>
                                            {openSection === 'adj' && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                                    <div className="p-3 space-y-3">
                                                        <RangeSlider id="luminance" label="Exposure" value={luminance} min={-100} max={100} step={1} onChange={setLuminance} onReset={() => setLuminance(0)} />
                                                        <RangeSlider id="contrast" label="Contrast" value={contrast} min={-100} max={100} step={1} onChange={setContrast} onReset={() => setContrast(0)} />
                                                        <RangeSlider id="temp" label="Temp" value={temp} min={-100} max={100} step={1} onChange={setTemp} onReset={() => setTemp(0)} />
                                                        <RangeSlider id="tint" label="Tint" value={tint} min={-100} max={100} step={1} onChange={setTint} onReset={() => setTint(0)} />
                                                        <RangeSlider id="vibrance" label="Vibrance" value={vibrance} min={-100} max={100} step={1} onChange={setVibrance} onReset={() => setVibrance(0)} />
                                                        <RangeSlider id="saturation" label="Saturation" value={saturation} min={-100} max={100} step={1} onChange={setSaturation} onReset={() => setSaturation(0)} />
                                                        <RangeSlider id="hue" label="Hue" value={hue} min={-180} max={180} step={1} onChange={setHue} onReset={() => setHue(0)} />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    {/* HLS Section */}
                                    <div className="border border-neutral-700 rounded-lg overflow-hidden">
                                        <button onClick={() => setOpenSection(openSection === 'hls' ? null : 'hls')} className={accordionHeaderClasses} aria-expanded={openSection === 'hls'}>
                                            <h4 className="base-font font-bold text-neutral-200">HLS</h4>
                                            <motion.div animate={{ rotate: openSection === 'hls' ? 180 : 0 }}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></motion.div>
                                        </button>
                                        <AnimatePresence>
                                            {openSection === 'hls' && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                                    <div className="p-3 space-y-3">
                                                        <div className="flex justify-center gap-4 py-2">
                                                             {COLOR_CHANNELS.map(channel => (
                                                                <button
                                                                    key={channel.id}
                                                                    onClick={() => setActiveColorTab(channel.id)}
                                                                    className={cn(
                                                                        "w-6 h-6 rounded-full transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-800",
                                                                        activeColorTab === channel.id ? 'ring-2 ring-yellow-400 scale-110' : 'hover:scale-110'
                                                                    )}
                                                                    style={{ backgroundColor: channel.color }}
                                                                    aria-label={`Select ${channel.name}`}
                                                                />
                                                            ))}
                                                        </div>
                                                        <AnimatePresence mode="wait">
                                                            <motion.div key={activeColorTab} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.15 }} className="space-y-3">
                                                                <RangeSlider id={`${activeColorTab}-h`} label="Hue" value={currentChannelAdjustments.h} min={-180} max={180} step={1} onChange={v => handleColorAdjustmentChange(activeColorTab, 'h', v)} onReset={() => handleColorAdjustmentReset(activeColorTab, 'h')} />
                                                                <RangeSlider id={`${activeColorTab}-s`} label="Saturation" value={currentChannelAdjustments.s} min={-100} max={100} step={1} onChange={v => handleColorAdjustmentChange(activeColorTab, 's', v)} onReset={() => handleColorAdjustmentReset(activeColorTab, 's')} />
                                                                <RangeSlider id={`${activeColorTab}-l`} label="Luminance" value={currentChannelAdjustments.l} min={-100} max={100} step={1} onChange={v => handleColorAdjustmentChange(activeColorTab, 'l', v)} onReset={() => handleColorAdjustmentReset(activeColorTab, 'l')} />
                                                            </motion.div>
                                                        </AnimatePresence>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                     {/* Effects Section */}
                                    <div className="border border-neutral-700 rounded-lg overflow-hidden">
                                        <button onClick={() => setOpenSection(openSection === 'effects' ? null : 'effects')} className={accordionHeaderClasses} aria-expanded={openSection === 'effects'}>
                                            <h4 className="base-font font-bold text-neutral-200">Effects</h4>
                                            <motion.div animate={{ rotate: openSection === 'effects' ? 180 : 0 }}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></motion.div>
                                        </button>
                                        <AnimatePresence>
                                            {openSection === 'effects' && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                                    <div className="p-3 space-y-3">
                                                        <RangeSlider id="grain" label="Grain" value={grain} min={0} max={100} step={1} onChange={setGrain} onReset={() => setGrain(0)} />
                                                        <RangeSlider id="clarity" label="Clarity" value={clarity} min={-100} max={100} step={1} onChange={setClarity} onReset={() => setClarity(0)} />
                                                        <RangeSlider id="dehaze" label="Dehaze" value={dehaze} min={-100} max={100} step={1} onChange={setDehaze} onReset={() => setDehaze(0)} />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                                
                                <AnimatePresence>
                                {isCropping && (
                                     <motion.div 
                                        className="mt-auto pt-4 border-t border-white/10"
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                    >
                                        <div className="flex justify-end items-center gap-4">
                                            <button onClick={handleCancelCrop} className="btn btn-secondary btn-sm">Cancel</button>
                                            <button onClick={handleApplyCrop} className="btn btn-primary btn-sm" disabled={!cropRect || cropRect.width < 1}>Apply Crop</button>
                                        </div>
                                     </motion.div>
                                )}
                                </AnimatePresence>

                                <div className={`flex justify-end items-center gap-4 mt-auto pt-4 border-t border-white/10 flex-shrink-0 ${isCropping ? 'hidden' : ''}`}>
                                    <button onClick={onClose} className="btn btn-secondary btn-sm" disabled={isLoading}>Cancel</button>
                                    <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Changes'}</button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};