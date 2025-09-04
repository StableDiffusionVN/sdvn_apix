/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { type ImageToEdit } from './uiUtils';

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
            <label htmlFor={id} className="base-font font-bold text-neutral-200">{label}</label>
            <button
                onClick={onReset}
                className="text-xs text-neutral-400 hover:text-yellow-400 transition-colors"
                aria-label={`Reset ${label}`}
            >
                Reset
            </button>
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


// --- Aspect Ratio Definitions ---
const ASPECT_RATIOS = [
    { label: 'Off', value: 'off' },
    { label: 'Free', value: '' },
    { label: '1:1', value: String(1 / 1) },
    { label: '4:3', value: String(4 / 3) },
    { label: '3:2', value: String(3 / 2) },
    { label: '16:9', value: String(16 / 9) },
    { label: '3:4', value: String(3 / 4) },
    { label: '2:3', value: String(2 / 3) },
    { label: '9:16', value: String(9 / 16) },
];


// --- Main Image Editor Modal Component ---
interface ImageEditorModalProps {
    imageToEdit: ImageToEdit | null;
    onClose: () => void;
}

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


export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ imageToEdit, onClose }) => {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<Crop>();
    const [exposure, setExposure] = useState(0);
    const [contrast, setContrast] = useState(0);
    const [temp, setTemp] = useState(0);
    const [tint, setTint] = useState(0);
    const [saturation, setSaturation] = useState(0);
    const [vibrance, setVibrance] = useState(0);
    const [aspect, setAspect] = useState<string>('off');
    const [isLoading, setIsLoading] = useState(false);
    
    const imgRef = useRef<HTMLImageElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    const isOpen = imageToEdit !== null;
    const isCropDisabled = aspect === 'off';

    const resetAllFilters = useCallback(() => {
        setExposure(0);
        setContrast(0);
        setTemp(0);
        setTint(0);
        setSaturation(0);
        setVibrance(0);
    }, []);

    useEffect(() => {
        if (isOpen) {
            resetAllFilters();
            setCrop(undefined);
            setCompletedCrop(undefined);
            setAspect('off');
        }
    }, [isOpen, imageToEdit?.url, resetAllFilters]);


    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const currentAspect = aspect && !isCropDisabled ? parseFloat(aspect) : width / height;
        const initialCrop = centerCrop(
            makeAspectCrop({ unit: '%', width: 100 }, currentAspect, width, height),
            width,
            height
        );
        setCrop(initialCrop);
        setCompletedCrop(initialCrop);
    };

    const handleAspectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setAspect(value);

        if (imgRef.current) {
            const { width, height } = imgRef.current;
            const newIsDisabled = value === 'off';
            const newAspectValue = value && !newIsDisabled ? parseFloat(value) : undefined;
            
            const newCrop = centerCrop(
                makeAspectCrop({ unit: '%', width: 100 }, newAspectValue || width / height, width, height),
                width,
                height
            );
            setCrop(newCrop);
            setCompletedCrop(newCrop);
        }
    };
    
    const applyFiltersToCanvas = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const exposureFactor = Math.pow(2, exposure);
        const contrastFactor = (100 + contrast) / 100;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // 1. Exposure
            r *= exposureFactor;
            g *= exposureFactor;
            b *= exposureFactor;
            
            // 2. Contrast
            r = (r - 127.5) * contrastFactor + 127.5;
            g = (g - 127.5) * contrastFactor + 127.5;
            b = (b - 127.5) * contrastFactor + 127.5;
            
            // 3. Temperature & Tint
            r += temp / 2.5;
            g += tint / 2.5;
            b -= temp / 2.5;
            
            // 4. Saturation & Vibrance (in HSL)
            let [h, s, l] = rgbToHsl(r, g, b);

            // Vibrance
            const vibranceAmount = vibrance / 100;
            const saturationAmount = saturation / 100;
            if (vibranceAmount !== 0) {
                 const max_sat = Math.max(r, g, b) / 255;
                 const avg_sat = (r + g + b) / 3 / 255;
                 const sat_delta = max_sat - avg_sat;
                 const vibrance_mult = Math.abs(sat_delta * 2);
                 s += (vibranceAmount > 0) ? (vibranceAmount * (1 - s) * vibrance_mult) : (vibranceAmount * s * vibrance_mult);
            }

            // Saturation
            s += saturationAmount;
            
            s = Math.max(0, Math.min(1, s));
            
            [r, g, b] = hslToRgb(h, s, l);

            // Clamp values
            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }

        ctx.putImageData(imageData, 0, 0);
    }, [exposure, contrast, temp, tint, saturation, vibrance]);


    useEffect(() => {
        if (!isOpen || !imgRef.current?.complete || !previewCanvasRef.current) return;
        const image = imgRef.current;
        if (image.naturalWidth === 0) return;

        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0, image.width, image.height);
        
        applyFiltersToCanvas(ctx, canvas.width, canvas.height);

    }, [isOpen, applyFiltersToCanvas, imageToEdit?.url]);


    const handleSave = useCallback(async () => {
        if (!imgRef.current || !imageToEdit) return;

        setIsLoading(true);
        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        const isCropping = !isCropDisabled && completedCrop;
        const cropX = isCropping ? completedCrop.x * scaleX : 0;
        const cropY = isCropping ? completedCrop.y * scaleY : 0;
        const cropWidth = isCropping ? completedCrop.width * scaleX : image.naturalWidth;
        const cropHeight = isCropping ? completedCrop.height * scaleY : image.naturalHeight;
        
        canvas.width = cropWidth;
        canvas.height = cropHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error("Could not get canvas context");
            setIsLoading(false);
            return;
        }

        ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        
        applyFiltersToCanvas(ctx, canvas.width, canvas.height);

        setTimeout(() => {
            const base64Image = canvas.toDataURL('image/png');
            imageToEdit.onSave(base64Image);
            setIsLoading(false);
            onClose();
        }, 50);

    }, [completedCrop, isCropDisabled, applyFiltersToCanvas, imageToEdit, onClose]);


    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="modal-overlay z-[60]"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="modal-content !max-w-6xl !h-[90vh] image-editor-modal-content"
                    >
                        <div className="flex flex-col md:flex-row gap-8 w-full h-full overflow-hidden">
                            {/* Left Column: Image Preview */}
                            <div className="flex-1 flex items-center justify-center min-h-0">
                                <div className="image-editor-preview-container w-full h-full">
                                    {imageToEdit?.url && (
                                        <>
                                         <img ref={imgRef} src={imageToEdit.url} alt="Hidden source for editor" onLoad={onImageLoad} style={{ display: 'none' }} />
                                            <ReactCrop
                                                crop={crop}
                                                onChange={c => setCrop(c)}
                                                onComplete={c => setCompletedCrop(c)}
                                                aspect={aspect && !isCropDisabled ? parseFloat(aspect) : undefined}
                                                disabled={isCropDisabled}
                                            >
                                                <canvas
                                                    ref={previewCanvasRef}
                                                    className="image-editor-preview"
                                                />
                                            </ReactCrop>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {/* Right Column: Controls and Actions */}
                            <div className="flex flex-col flex-shrink-0 md:w-80">
                                <h3 className="base-font font-bold text-2xl text-yellow-400 mb-4 flex-shrink-0">Image Editor</h3>

                                <div className="flex-grow overflow-y-auto space-y-4 pr-2 -mr-2">
                                    <div className="w-full">
                                        <label htmlFor="aspect-ratio" className="base-font font-bold text-neutral-200 mb-1 block">Aspect Ratio</label>
                                        <select
                                            id="aspect-ratio"
                                            value={aspect}
                                            onChange={handleAspectChange}
                                            className="form-input"
                                        >
                                            {ASPECT_RATIOS.map(ratio => (
                                                <option key={ratio.label} value={ratio.value}>{ratio.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="hidden md:flex md:flex-col md:gap-4">
                                        <RangeSlider id="exposure" label="Exposure" value={exposure} min={-5} max={5} step={0.1} onChange={setExposure} onReset={() => setExposure(0)} />
                                        <RangeSlider id="contrast" label="Contrast" value={contrast} min={-100} max={100} step={1} onChange={setContrast} onReset={() => setContrast(0)} />
                                        <RangeSlider id="temp" label="Temp" value={temp} min={-100} max={100} step={1} onChange={setTemp} onReset={() => setTemp(0)} />
                                        <RangeSlider id="tint" label="Tint" value={tint} min={-100} max={100} step={1} onChange={setTint} onReset={() => setTint(0)} />
                                        <RangeSlider id="saturation" label="Saturation" value={saturation} min={-100} max={100} step={1} onChange={setSaturation} onReset={() => setSaturation(0)} />
                                        <RangeSlider id="vibrance" label="Vibrance" value={vibrance} min={-100} max={100} step={1} onChange={setVibrance} onReset={() => setVibrance(0)} />
                                    </div>
                                </div>
                                
                                <div className="flex justify-end items-center gap-4 mt-auto pt-4 border-t border-white/10 flex-shrink-0">
                                    <button onClick={onClose} className="btn btn-secondary btn-sm" disabled={isLoading}>
                                        Cancel
                                    </button>
                                    <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={isLoading}>
                                        {isLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
