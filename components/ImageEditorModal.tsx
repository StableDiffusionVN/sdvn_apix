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
    { label: 'Free', value: '' }, // Using empty string for controlled component
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

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ imageToEdit, onClose }) => {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<Crop>();
    const [brightness, setBrightness] = useState(100);
    const [warmth, setWarmth] = useState(0);
    const [saturation, setSaturation] = useState(100);
    const [vibrance, setVibrance] = useState(100); // Using contrast for this
    const [tint, setTint] = useState(0); // Using hue-rotate for this
    const [aspect, setAspect] = useState<number | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    const imageStyle = { filter: `brightness(${brightness}%) sepia(${warmth}%) saturate(${saturation}%) contrast(${vibrance}%) hue-rotate(${tint}deg)` };
    const isOpen = imageToEdit !== null;

    useEffect(() => {
        if (isOpen) {
            // Reset state when a new image is opened
            setCrop(undefined);
            setCompletedCrop(undefined);
            setBrightness(100);
            setWarmth(0);
            setSaturation(100);
            setVibrance(100);
            setTint(0);
            setAspect(undefined);
        }
    }, [isOpen, imageToEdit?.url]);

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const currentAspect = aspect || width / height;
        const initialCrop = centerCrop(
            makeAspectCrop({ unit: '%', width: 90 }, currentAspect, width, height),
            width,
            height
        );
        setCrop(initialCrop);
        setCompletedCrop(initialCrop); // Set completed crop on load
    };

    const handleAspectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        const newAspect = value ? parseFloat(value) : undefined;
        setAspect(newAspect);

        if (imgRef.current) {
            const { width, height } = imgRef.current;
            const cropWidth = newAspect ? 90 : 100; // Use a slightly smaller crop for aspect ratios
            const newCrop = centerCrop(
                makeAspectCrop({ unit: '%', width: cropWidth }, newAspect || width / height, width, height),
                width,
                height
            );
            setCrop(newCrop);
            setCompletedCrop(newCrop);
        }
    };


    const handleSave = useCallback(async () => {
        if (!completedCrop || !imgRef.current || !imageToEdit) {
            return;
        }

        setIsLoading(true);
        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        const cropX = completedCrop.x * scaleX;
        const cropY = completedCrop.y * scaleY;
        const cropWidth = completedCrop.width * scaleX;
        const cropHeight = completedCrop.height * scaleY;

        canvas.width = cropWidth;
        canvas.height = cropHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error("Could not get canvas context");
            setIsLoading(false);
            return;
        }

        ctx.filter = imageStyle.filter;

        ctx.drawImage(
            image,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            cropWidth,
            cropHeight
        );

        // Use a short timeout to allow the UI to update before blocking the main thread
        setTimeout(() => {
            const base64Image = canvas.toDataURL('image/png');
            imageToEdit.onSave(base64Image);
            setIsLoading(false);
            onClose();
        }, 50);

    }, [completedCrop, imageStyle.filter, imageToEdit, onClose]);


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
                                        <ReactCrop
                                            crop={crop}
                                            onChange={c => setCrop(c)}
                                            onComplete={c => setCompletedCrop(c)}
                                            aspect={aspect}
                                        >
                                            <img
                                                ref={imgRef}
                                                src={imageToEdit.url}
                                                alt="Image preview for editing"
                                                className="image-editor-preview"
                                                style={imageStyle}
                                                onLoad={onImageLoad}
                                            />
                                        </ReactCrop>
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
                                            value={aspect || ''}
                                            onChange={handleAspectChange}
                                            className="form-input"
                                        >
                                            {ASPECT_RATIOS.map(ratio => (
                                                <option key={ratio.label} value={ratio.value}>{ratio.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="hidden md:flex md:flex-col md:gap-4">
                                        <RangeSlider
                                            id="brightness"
                                            label="Brightness"
                                            value={brightness}
                                            min={50} max={200} step={1}
                                            onChange={setBrightness} onReset={() => setBrightness(100)}
                                        />
                                        <RangeSlider
                                            id="warmth"
                                            label="Warmth"
                                            value={warmth}
                                            min={0} max={100} step={1}
                                            onChange={setWarmth} onReset={() => setWarmth(0)}
                                        />
                                        <RangeSlider
                                            id="saturation"
                                            label="Saturation"
                                            value={saturation}
                                            min={0} max={200} step={1}
                                            onChange={setSaturation} onReset={() => setSaturation(100)}
                                        />
                                        <RangeSlider
                                            id="vibrance"
                                            label="Vibrance"
                                            value={vibrance}
                                            min={50} max={200} step={1}
                                            onChange={setVibrance} onReset={() => setVibrance(100)}
                                        />
                                        <RangeSlider
                                            id="tint"
                                            label="Tint"
                                            value={tint}
                                            min={-50} max={50} step={1}
                                            onChange={setTint} onReset={() => setTint(0)}
                                        />
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
