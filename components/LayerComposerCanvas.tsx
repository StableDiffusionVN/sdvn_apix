/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, MotionValue, useMotionValueEvent, useTransform, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { type Layer, type CanvasSettings, type Interaction, type Handle, type Rect, type MultiLayerAction, getBoundingBoxForLayers } from './LayerComposer/LayerComposer.types';
import { LayerItem } from './LayerComposer/LayerItem';
import { SelectionFrame } from './LayerComposer/SelectionFrame';
import { CanvasToolbar } from './LayerComposer/CanvasToolbar';
import { FloatingLayerToolbar, type LayerAction } from './LayerComposer/FloatingLayerToolbar';
import { FloatingMultiLayerToolbar } from './LayerComposer/FloatingMultiLayerToolbar';
import { useAppControls } from '../uiUtils';

interface LayerComposerCanvasProps {
    canvasViewRef: React.RefObject<HTMLDivElement>;
    layers: Layer[];
    canvasSettings: CanvasSettings;
    isInfiniteCanvas: boolean;
    selectedLayerIds: string[];
    selectedLayers: Layer[];
    selectionBoundingBox: Rect | null;
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    scale: MotionValue<number>;
    zoomDisplay: number;
    activeCanvasTool: 'select' | 'hand';
    setActiveCanvasTool: (tool: 'select' | 'hand') => void;
    isSpacePanning: boolean;
    interaction: Interaction | null;
    setInteraction: (interaction: Interaction | null) => void;
    panStartRef: React.MutableRefObject<{ pan: { x: number; y: number; }; pointer: { x: number; y: number; }; } | null>;
    canUndo: boolean;
    canRedo: boolean;
    handleUndo: () => void;
    handleRedo: () => void;
    onUpdateLayers: (updates: { id: string; props: Partial<Layer> }[], isFinalChange: boolean) => void;
    beginInteraction: () => void;
    duplicateLayer: (id: string) => Layer;
    exportSelectedLayer: () => void;
    deleteLayer: (id: string) => void;
    setSelectedLayerIds: React.Dispatch<React.SetStateAction<string[]>>;
    onFilesDrop: (files: FileList) => void;
    onMultiLayerAction: (action: MultiLayerAction) => void;
    onDuplicateForDrag: () => Layer[];
    handleMergeLayers: () => void;
    openImageEditor: (url: string, onSave: (newUrl: string) => void) => void;
    deleteSelectedLayers: () => void;
    duplicateSelectedLayers: () => Layer[];
    handleExportSelectedLayers: () => Promise<void>;
    captureLayer: (layer: Layer) => Promise<string>;
}

export const LayerComposerCanvas: React.FC<LayerComposerCanvasProps> = ({
    canvasViewRef, layers, canvasSettings, isInfiniteCanvas, selectedLayerIds, selectedLayers, 
    selectionBoundingBox,
    panX, panY, scale, zoomDisplay,
    activeCanvasTool, setActiveCanvasTool, isSpacePanning,
    interaction, setInteraction, panStartRef,
    canUndo, canRedo, handleUndo, handleRedo,
    onUpdateLayers, beginInteraction, duplicateLayer, exportSelectedLayer, deleteLayer,
    setSelectedLayerIds, onFilesDrop, onMultiLayerAction,
    onDuplicateForDrag, handleMergeLayers, openImageEditor,
    deleteSelectedLayers, duplicateSelectedLayers, handleExportSelectedLayers,
    captureLayer
}) => {
    const { t } = useAppControls();
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const [marqueeRect, setMarqueeRect] = useState<Rect | null>(null);
    const [cursorPosition, setCursorPosition] = useState<{x:number, y:number} | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const selectedLayer = selectedLayers.length === 1 ? selectedLayers[0] : null;
    
    const getPointerInCanvas = useCallback((e: React.PointerEvent) => {
        const view = canvasViewRef.current;
        if (!view) return null;
        
        const viewRect = view.getBoundingClientRect();
        const style = window.getComputedStyle(view);
        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingTop = parseFloat(style.paddingTop) || 0;
        
        const pointerXInContent = e.clientX - viewRect.left - paddingLeft;
        const pointerYInContent = e.clientY - viewRect.top - paddingTop;
        
        const contentWidth = view.clientWidth;
        const contentHeight = view.clientHeight;
        
        const currentScale = scale.get();
        const currentPanX = panX.get();
        const currentPanY = panY.get();
    
        const ptr_x_rel_view_center = pointerXInContent - (contentWidth / 2);
        const ptr_y_rel_view_center = pointerYInContent - (contentHeight / 2);
    
        const ptr_x_rel_canvas_center = (ptr_x_rel_view_center - currentPanX) / currentScale;
        const ptr_y_rel_canvas_center = (ptr_y_rel_view_center - currentPanY) / currentScale;
        
        return { x: ptr_x_rel_canvas_center + canvasSettings.width / 2, y: ptr_y_rel_canvas_center + canvasSettings.height / 2 };
    }, [scale, panX, panY, canvasSettings.width, canvasSettings.height]);

    const getPointerInView = (e: React.PointerEvent) => {
        const viewRect = canvasViewRef.current?.getBoundingClientRect();
        if (!viewRect) return null;
        return { x: e.clientX - viewRect.left, y: e.clientY - viewRect.top };
    };

    const onToolbarAction = (action: LayerAction) => {
        if (!selectedLayer) return;
        const layer = selectedLayer;
        switch (action) {
            case 'delete':
                deleteLayer(layer.id);
                break;
            case 'duplicate':
                duplicateLayer(layer.id);
                break;
            case 'export':
                exportSelectedLayer();
                break;
            case 'edit':
                if (layer.type === 'image' && layer.url) {
                    openImageEditor(layer.url, (newUrl) => {
                        const img = new Image();
                        img.onload = () => {
                            const newAspectRatio = img.naturalWidth / img.naturalHeight;
                            const newHeight = layer.width / newAspectRatio;
                            onUpdateLayers([{
                                id: layer.id,
                                props: { url: newUrl, width: layer.width, height: newHeight }
                            }], true);
                        };
                        img.src = newUrl;
                    });
                }
                break;
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        setCursorPosition(getPointerInCanvas(e));
        if (panStartRef.current) {
            const pointer = getPointerInView(e);
            if (pointer) {
                panX.set(panStartRef.current.pan.x + (pointer.x - panStartRef.current.pointer.x));
                panY.set(panStartRef.current.pan.y + (pointer.y - panStartRef.current.pointer.y));
            }
            return;
        }
        
        let currentInteraction = interaction;

        if (currentInteraction?.type === 'duplicate-move' && !currentInteraction.hasActionStarted) {
            const newLayers = onDuplicateForDrag();
            if (newLayers && newLayers.length > 0) {
                const updatedInteraction = {
                    ...currentInteraction,
                    type: 'move' as const,
                    initialLayers: newLayers.map(l => ({ ...l })),
                    hasActionStarted: true,
                };
                setInteraction(updatedInteraction);
                currentInteraction = updatedInteraction;
            } else {
                setInteraction(null);
                currentInteraction = null;
            }
        }
        
        if (!currentInteraction) return;
        const currentPointer = getPointerInCanvas(e);
        if (!currentPointer) return;
        const dx = currentPointer.x - currentInteraction.initialPointer.x;
        const dy = currentPointer.y - currentInteraction.initialPointer.y;

        if (currentInteraction.type === 'move' && currentInteraction.initialLayers) {
            const updates = currentInteraction.initialLayers.map(layer => ({ id: layer.id, props: { x: layer.x + dx, y: layer.y + dy } }));
            onUpdateLayers(updates, false);
        } else if (currentInteraction.type === 'resize' && currentInteraction.handle && currentInteraction.initialBoundingBox && currentInteraction.initialLayers) {
            const { initialLayers, handle, initialBoundingBox: bbox } = currentInteraction;
            const maintainAspectRatio = e.shiftKey;

            let scaleX = 1, scaleY = 1, pivotX = 0.5, pivotY = 0.5;

            if (handle.includes('r')) {
                scaleX = (bbox.width + dx) / bbox.width;
                pivotX = 0;
            }
            if (handle.includes('l')) {
                scaleX = (bbox.width - dx) / bbox.width;
                pivotX = 1;
            }
            if (handle.includes('b')) {
                scaleY = (bbox.height + dy) / bbox.height;
                pivotY = 0;
            }
            if (handle.includes('t')) {
                scaleY = (bbox.height - dy) / bbox.height;
                pivotY = 1;
            }
            
            if (maintainAspectRatio) {
                if (handle.length === 2) { // Corner handles
                    const ar = bbox.width / bbox.height;
                    if (Math.abs(dx * (1/ar)) > Math.abs(dy)) {
                        scaleY = scaleX;
                    } else {
                        scaleX = scaleY;
                    }
                } else if (handle === 't' || handle === 'b') {
                    scaleX = scaleY;
                } else if (handle === 'l' || handle === 'r') {
                    scaleY = scaleX;
                }
            }
            
            const updates = initialLayers.map(layer => {
                const relativeX = layer.x - bbox.x;
                const relativeY = layer.y - bbox.y;

                const newX = bbox.x + (relativeX - bbox.width * pivotX) * scaleX + bbox.width * pivotX;
                const newY = bbox.y + (relativeY - bbox.height * pivotY) * scaleY + bbox.height * pivotY;
                const newWidth = layer.width * scaleX;
                const newHeight = layer.height * scaleY;

                const newProps: Partial<Layer> = { x: newX, y: newY, width: newWidth, height: newHeight };

                return { id: layer.id, props: newProps };
            });
            onUpdateLayers(updates, false);
            
        } else if (currentInteraction.type === 'rotate' && selectedLayer && currentInteraction.initialLayers) {
            const { initialLayers, initialCenter, initialAngle } = currentInteraction;
            if (!initialCenter || initialAngle === undefined || initialLayers.length !== 1) return;
            const currentAngle = Math.atan2(currentPointer.y - initialCenter.y, currentPointer.x - initialCenter.x);
            const angleDiff = currentAngle - initialAngle;
            let newRotation = initialLayers[0].rotation + (angleDiff * 180 / Math.PI);
            if (e.shiftKey) newRotation = Math.round(newRotation / 45) * 45;
            onUpdateLayers([{id: initialLayers[0].id, props: { rotation: newRotation }}], false);
        } else if (currentInteraction.type === 'marquee') {
            if (!currentInteraction.hasActionStarted) {
                // @ts-ignore
                currentInteraction.hasActionStarted = true;
            }
            const { initialPointer, initialSelectedIds, isShift } = currentInteraction;
            const newMarqueeRect = {
                x: Math.min(initialPointer.x, currentPointer.x),
                y: Math.min(initialPointer.y, currentPointer.y),
                width: Math.abs(initialPointer.x - currentPointer.x),
                height: Math.abs(initialPointer.y - currentPointer.y),
            };
            setMarqueeRect(newMarqueeRect);

            const layersInMarqueeIds = layers.filter(layer => {
                if (layer.isLocked) return false;
                const layerRect = { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
                return !(
                    layerRect.x > newMarqueeRect.x + newMarqueeRect.width ||
                    layerRect.x + layerRect.width < newMarqueeRect.x ||
                    layerRect.y > newMarqueeRect.y + newMarqueeRect.height ||
                    layerRect.y + layerRect.height < newMarqueeRect.y
                );
            }).map(l => l.id);

            if (isShift) {
                const newIds = new Set<string>(initialSelectedIds || []);
                layersInMarqueeIds.forEach(id => newIds.add(id));
                setSelectedLayerIds(Array.from(newIds));
            } else {
                setSelectedLayerIds(layersInMarqueeIds);
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (panStartRef.current) panStartRef.current = null;
        if (interaction) {
            if (interaction.type === 'marquee') {
                if (!interaction.hasActionStarted) {
                    setSelectedLayerIds([]);
                }
                setMarqueeRect(null);
            } else if (interaction.type === 'move' || interaction.type === 'resize' || interaction.type === 'rotate') {
                const updatedLayers = selectedLayerIds.map(id => ({ id, props: layers.find(layer => layer.id === id) || {} }));
                onUpdateLayers(updatedLayers, true);
            }
            setInteraction(null);
        }
    };
    
    const handleLayerPointerDown = (e: React.PointerEvent<HTMLDivElement>, layerId: string) => {
        if (activeCanvasTool === 'hand' || isSpacePanning) return;
        e.stopPropagation();
        
        const layer = layers.find(l => l.id === layerId);
        if (!layer || layer.isLocked) {
            if (!e.shiftKey) setSelectedLayerIds([]);
            return;
        }
        
        const pointer = getPointerInCanvas(e);
        if (!pointer) return;

        let newSelectedIds = [...selectedLayerIds];
        if (e.shiftKey) {
            newSelectedIds = selectedLayerIds.includes(layerId)
                ? selectedLayerIds.filter(id => id !== layerId)
                : [...selectedLayerIds, layerId];
        } else if (!selectedLayerIds.includes(layerId)) {
            newSelectedIds = [layerId];
        }
        setSelectedLayerIds(newSelectedIds);

        const currentSelectedLayers = layers.filter(l => newSelectedIds.includes(l.id));

        if(currentSelectedLayers.length > 0) {
            beginInteraction();
            const bbox = getBoundingBoxForLayers(currentSelectedLayers);
            if (e.altKey) {
                setInteraction({ type: 'duplicate-move', initialLayers: currentSelectedLayers.map(l => ({...l})), initialBoundingBox: bbox, initialPointer: pointer, hasActionStarted: false });
            } else {
                setInteraction({ type: 'move', initialLayers: currentSelectedLayers.map(l => ({...l})), initialBoundingBox: bbox, initialPointer: pointer });
            }
        }
    };
    
    const handleHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>, handle: Handle) => {
        e.stopPropagation();
        const pointer = getPointerInCanvas(e);
        if (pointer && selectionBoundingBox) {
            beginInteraction();
            setInteraction({ type: 'resize', handle, initialLayers: selectedLayers.map(l => ({...l})), initialPointer: pointer, initialBoundingBox: selectionBoundingBox });
        }
    };

    const handleRotatePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation();
        const pointer = getPointerInCanvas(e);
        if (selectedLayer && !selectedLayer.isLocked && pointer) {
            beginInteraction();
            const centerX = selectedLayer.x + selectedLayer.width / 2;
            const centerY = selectedLayer.y + selectedLayer.height / 2;
            const initialAngle = Math.atan2(pointer.y - centerY, pointer.x - centerX);
            setInteraction({ type: 'rotate', initialLayers: [{...selectedLayer}], initialPointer: pointer, initialCenter: { x: centerX, y: centerY }, initialAngle });
        }
    };
    
    const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (activeCanvasTool === 'hand' || isSpacePanning) {
            const pointer = getPointerInView(e);
            if (pointer) {
                panStartRef.current = { pan: { x: panX.get(), y: panY.get() }, pointer };
                e.currentTarget.style.cursor = 'grabbing';
            }
        } else if (activeCanvasTool === 'select') {
            const coords = getPointerInCanvas(e);
            if (!coords) return;
            setInteraction({
                type: 'marquee',
                initialPointer: coords,
                isShift: e.shiftKey,
                initialSelectedIds: selectedLayerIds,
                hasActionStarted: false,
            });
        }
    };

    const handleFitCanvas = useCallback(() => {
        if (canvasViewRef.current) {
            const { clientWidth: viewWidth, clientHeight: viewHeight } = canvasViewRef.current;
            const { width: canvasWidth, height: canvasHeight } = canvasSettings;
            if (viewWidth > 0 && viewHeight > 0 && canvasWidth > 0 && canvasHeight > 0) {
                const newZoom = Math.min(viewWidth / canvasWidth, viewHeight / canvasHeight) * 0.95;
                scale.set(newZoom); panX.set(0); panY.set(0);
            }
        }
    }, [canvasSettings.width, canvasSettings.height, scale, panX, panY, canvasViewRef]);

    const handleZoomChange = (direction: 'in' | 'out') => {
        const viewRect = canvasViewRef.current?.getBoundingClientRect(); if (!viewRect) return;
        const currentZoom = scale.get(); const newZoom = Math.max(0.1, Math.min(direction === 'in' ? currentZoom * 1.2 : currentZoom / 1.2, 5));
        const viewCenter = { x: viewRect.width / 2, y: viewRect.height / 2 }; const oldPan = { x: panX.get(), y: panY.get() };
        const scaleRatio = newZoom / currentZoom;
        panX.set(viewCenter.x * (1 - scaleRatio) + oldPan.x * scaleRatio);
        panY.set(viewCenter.y * (1 - scaleRatio) + oldPan.y * scaleRatio);
        scale.set(newZoom);
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const viewRect = canvasViewRef.current?.getBoundingClientRect(); if (!viewRect) return;
        const currentZoom = scale.get(); 
        const newZoom = Math.max(0.1, Math.min(currentZoom * Math.pow(2, -e.deltaY * 0.002), 10));
        if (newZoom === currentZoom) return;
        const mousePosInView = { x: e.clientX - viewRect.left, y: e.clientY - viewRect.top }; const oldPan = { x: panX.get(), y: panY.get() };
        const scaleRatio = newZoom / currentZoom;
        panX.set(mousePosInView.x * (1 - scaleRatio) + oldPan.x * scaleRatio);
        panY.set(mousePosInView.y * (1 - scaleRatio) + oldPan.y * scaleRatio);
        scale.set(newZoom);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); onFilesDrop(e.dataTransfer.files); };

    useEffect(() => {
        handleFitCanvas();
    }, [canvasSettings, handleFitCanvas]);

    // This effect resizes the preview canvas to match the viewport size.
    useEffect(() => {
        const view = canvasViewRef.current;
        const canvas = previewCanvasRef.current;
        if (!view || !canvas) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (canvas.width !== width || canvas.height !== height) {
                    canvas.width = width;
                    canvas.height = height;
                }
            }
        });

        resizeObserver.observe(view);
        return () => resizeObserver.disconnect();
    }, [canvasViewRef, previewCanvasRef]);

    const redrawPreview = useCallback(() => {
        const canvas = previewCanvasRef.current;
        const view = canvasViewRef.current;
        if (!canvas || !view) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(view.clientWidth / 2, view.clientHeight / 2);
        ctx.translate(panX.get(), panY.get());
        const s = scale.get();
        ctx.scale(s, s);
        ctx.translate(-canvasSettings.width / 2, -canvasSettings.height / 2);
        
        if (marqueeRect && interaction?.type === 'marquee') {
            ctx.save();
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
            ctx.lineWidth = 1 / s;
            ctx.setLineDash([4 / s, 4 / s]);
            ctx.strokeRect(marqueeRect.x, marqueeRect.y, marqueeRect.width, marqueeRect.height);
            ctx.restore();
        }

        ctx.restore();
    }, [marqueeRect, canvasSettings, interaction, canvasViewRef, panX, panY, scale]);

    useEffect(() => {
        let animId: number;
        const animate = () => {
            redrawPreview();
            animId = requestAnimationFrame(animate);
        };
        animId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animId);
    }, [redrawPreview]);
    
    return (
        <main
            ref={canvasViewRef}
            className={cn(
                "flex-1 flex items-center justify-center p-6 bg-neutral-800/30 overflow-hidden relative",
                isInfiniteCanvas && "infinite-canvas-bg"
            )}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={(e) => { handlePointerUp(e); setCursorPosition(null); }}
            onWheel={handleWheel}
            style={{ cursor: interaction?.type === 'rotate' ? 'alias' : (activeCanvasTool === 'hand' || isSpacePanning) ? 'grab' : 'default' }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <motion.div
                id="canvas-wrapper"
                className="relative shadow-lg flex-shrink-0"
                style={{
                    width: canvasSettings.width,
                    height: canvasSettings.height,
                    backgroundColor: isInfiniteCanvas ? 'transparent' : canvasSettings.background,
                    x: panX,
                    y: panY,
                    scale
                }}
            >
                {layers.map((layer, index) => {
                    return (
                        <LayerItem
                            key={layer.id}
                            layer={layer}
                            captureLayer={captureLayer}
                            activeCanvasTool={activeCanvasTool}
                            isSpacePanning={isSpacePanning}
                            onLayerPointerDown={handleLayerPointerDown}
                            zIndex={layers.length - 1 - index}
                        />
                    );
                })}
                
                {(selectionBoundingBox && (selectedLayers.length > 0) && !(selectedLayers.length === 1 && selectedLayers[0].isLocked)) && (
                    <SelectionFrame 
                        boundingBox={selectionBoundingBox} 
                        rotation={(selectedLayer ? selectedLayer.rotation : 0)}
                        isMultiSelect={selectedLayers.length > 1}
                        scaleMV={scale} 
                        onHandlePointerDown={handleHandlePointerDown} 
                        onRotatePointerDown={handleRotatePointerDown} 
                    />
                )}
                
                {selectedLayers.length === 1 && selectedLayer && !selectedLayer.isLocked && <FloatingLayerToolbar layer={selectedLayer} onAction={onToolbarAction} scaleMV={scale} />}
                {selectedLayers.length > 1 && selectionBoundingBox && <FloatingMultiLayerToolbar 
                    boundingBox={selectionBoundingBox}
                    scaleMV={scale}
                    onAction={onMultiLayerAction}
                    selectedLayerCount={selectedLayers.length}
                />}
            </motion.div>

            {/* Preview Canvas for ephemeral drawings like marquee, pen path preview etc. */}
            <canvas 
                ref={previewCanvasRef} 
                className="absolute top-0 left-0 w-full h-full pointer-events-none" 
                style={{ zIndex: 1002 }} 
            />

            <CanvasToolbar zoomDisplay={zoomDisplay} activeTool={activeCanvasTool} isLayerSelected={!!selectedLayer} onZoomIn={() => handleZoomChange('in')} onZoomOut={() => handleZoomChange('out')} onFit={handleFitCanvas} onToolSelect={setActiveCanvasTool} onUndo={handleUndo} onRedo={handleRedo} canUndo={canUndo} canRedo={canRedo} />
             <AnimatePresence>
                {isDraggingOver && (
                    <motion.div
                        className="absolute inset-0 z-10 bg-black/70 border-4 border-dashed border-yellow-400 rounded-lg flex flex-col items-center justify-center pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        <p className="text-2xl font-bold text-yellow-400">{t('layerComposer_dropPrompt')}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
};