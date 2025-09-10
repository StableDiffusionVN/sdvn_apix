/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, MotionValue, useMotionValueEvent, useTransform, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
// FIX: Import getBoundingBoxForLayers utility function.
import { getBoundingBoxForLayers, type Layer, type CanvasSettings, type Interaction, type PenNode, type Handle, type Rect, type MultiLayerAction } from './LayerComposer.types';
import { LayerItem } from './LayerItem';
import { SelectionFrame } from './SelectionFrame';
import { CanvasToolbar } from './CanvasToolbar';
import { FloatingLayerToolbar } from './FloatingLayerToolbar';
import { FloatingMultiLayerToolbar } from './FloatingMultiLayerToolbar';

interface LayerComposerCanvasProps {
    canvasViewRef: React.RefObject<HTMLDivElement>;
    layers: Layer[];
    canvasSettings: CanvasSettings;
    selectedLayerIds: string[];
    selectedLayers: Layer[];
    selectionBoundingBox: Rect | null;
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    scale: MotionValue<number>;
    zoomDisplay: number;
    activeCanvasTool: 'select' | 'hand' | 'pen';
    setActiveCanvasTool: (tool: 'select' | 'hand' | 'pen') => void;
    isSpacePanning: boolean;
    interaction: Interaction | null;
    setInteraction: (interaction: Interaction | null) => void;
    panStartRef: React.MutableRefObject<{ pan: { x: number; y: number; }; pointer: { x: number; y: number; }; } | null>;
    penPathPoints: PenNode[];
    setPenPathPoints: React.Dispatch<React.SetStateAction<PenNode[]>>;
    currentPenDrag: { start: { x: number; y: number; }; current: { x: number; y: number; }; } | null;
    setCurrentPenDrag: React.Dispatch<React.SetStateAction<{ start: { x: number; y: number; }; current: { x: number; y: number; }; } | null>>;
    selectionPath: Path2D | null;
    finalizePenPath: () => void;
    canUndo: boolean;
    canRedo: boolean;
    handleUndo: () => void;
    handleRedo: () => void;
    onUpdateLayers: (updates: { id: string; props: Partial<Layer> }[], isFinalChange: boolean) => void;
    beginInteraction: () => void;
    duplicateLayer: (id: string) => Layer;
    exportSelectedLayer: () => void;
    deleteLayer: (id: string) => void;
    deselect: () => void;
    setSelectedLayerIds: React.Dispatch<React.SetStateAction<string[]>>;
    selectionBbox: DOMRect | null;
    copySelectionAsNewLayer: (originalLayer: Layer, newUrl: string, bbox: DOMRect) => Promise<Layer>;
    onFilesDrop: (files: FileList) => void;
    onMultiLayerAction: (action: MultiLayerAction) => void;
    onDuplicateForDrag: () => Layer[];
    snapLines: {type: 'V' | 'H', position: number}[];
    setSnapLines: React.Dispatch<React.SetStateAction<{type: 'V' | 'H', position: number}[]>>;
}

export const LayerComposerCanvas: React.FC<LayerComposerCanvasProps> = ({
    canvasViewRef, layers, canvasSettings, selectedLayerIds, selectedLayers, selectionBoundingBox,
    panX, panY, scale, zoomDisplay,
    activeCanvasTool, setActiveCanvasTool, isSpacePanning,
    interaction, setInteraction, panStartRef,
    penPathPoints, setPenPathPoints, currentPenDrag, setCurrentPenDrag,
    selectionPath, finalizePenPath,
    canUndo, canRedo, handleUndo, handleRedo,
    onUpdateLayers, beginInteraction, duplicateLayer, exportSelectedLayer, deleteLayer, deselect,
    setSelectedLayerIds, selectionBbox, copySelectionAsNewLayer, onFilesDrop, onMultiLayerAction,
    onDuplicateForDrag, snapLines, setSnapLines
}) => {
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const [marqueeRect, setMarqueeRect] = useState<Rect | null>(null);
    const [cursorPosition, setCursorPosition] = useState<{x:number, y:number} | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const selectedLayer = selectedLayers.length === 1 ? selectedLayers[0] : null;
    
    // --- Event Handlers ---
    const getPointerInCanvas = useCallback((e: React.PointerEvent) => {
        const viewRect = canvasViewRef.current?.getBoundingClientRect();
        if (!viewRect) return null;
        const currentScale = scale.get(); const currentPanX = panX.get(); const currentPanY = panY.get();
        const ptr_x_rel_view_center = e.clientX - (viewRect.left + viewRect.width / 2);
        const ptr_y_rel_view_center = e.clientY - (viewRect.top + viewRect.height / 2);
        const ptr_x_rel_canvas_center = (ptr_x_rel_view_center - currentPanX) / currentScale;
        const ptr_y_rel_canvas_center = (ptr_y_rel_view_center - currentPanY) / currentScale;
        return { x: ptr_x_rel_canvas_center + canvasSettings.width / 2, y: ptr_y_rel_canvas_center + canvasSettings.height / 2 };
    }, [scale, panX, panY, canvasSettings.width, canvasSettings.height]);

    const getPointerInView = (e: React.PointerEvent) => {
        const viewRect = canvasViewRef.current?.getBoundingClientRect();
        if (!viewRect) return null;
        return { x: e.clientX - viewRect.left, y: e.clientY - viewRect.top };
    };

    const handleDuplicateAction = () => {
        if (selectedLayers.length === 1 && selectionPath && selectionBbox) {
            const originalLayer = selectedLayers[0];
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = async () => {
                const tempCanvas = document.createElement('canvas');
                const ctx = tempCanvas.getContext('2d');
                if (!ctx) return;
                const bbox = selectionBbox;
                tempCanvas.width = bbox.width;
                tempCanvas.height = bbox.height;
                ctx.translate(-bbox.x, -bbox.y);
                ctx.clip(selectionPath);
                ctx.drawImage(img, 0, 0, originalLayer.width, originalLayer.height);
                const newUrl = tempCanvas.toDataURL('image/png');
                const newLayer = await copySelectionAsNewLayer(originalLayer, newUrl, bbox);
                setSelectedLayerIds([newLayer.id]);
            };
            img.src = originalLayer.url;
        } else {
            onMultiLayerAction('duplicate');
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
        if (activeCanvasTool === 'pen' && currentPenDrag) {
            const coords = getPointerInCanvas(e);
            if (coords) setCurrentPenDrag(p => ({ ...p!, current: coords }));
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

        if (currentInteraction.type === 'move' && currentInteraction.initialLayers && currentInteraction.initialBoundingBox) {
            const SNAP_THRESHOLD_VIEW = 8;
            const snapThresholdCanvas = SNAP_THRESHOLD_VIEW / scale.get();
        
            let finalDx = dx;
            let finalDy = dy;
            let activeSnapLines: {type: 'V' | 'H', position: number}[] = [];
        
            const sourceBbox = {
                x: currentInteraction.initialBoundingBox.x + dx,
                y: currentInteraction.initialBoundingBox.y + dy,
                width: currentInteraction.initialBoundingBox.width,
                height: currentInteraction.initialBoundingBox.height,
            };
            const sourceLines = {
                V: [sourceBbox.x, sourceBbox.x + sourceBbox.width / 2, sourceBbox.x + sourceBbox.width],
                H: [sourceBbox.y, sourceBbox.y + sourceBbox.height / 2, sourceBbox.y + sourceBbox.height]
            };
        
            const targetLayers = layers.filter(l => !selectedLayerIds.includes(l.id));
            const targetLines: { V: number[], H: number[] } = {
                V: [0, canvasSettings.width / 2, canvasSettings.width],
                H: [0, canvasSettings.height / 2, canvasSettings.height]
            };
            targetLayers.forEach(l => {
                targetLines.V.push(l.x, l.x + l.width / 2, l.x + l.width);
                targetLines.H.push(l.y, l.y + l.height / 2, l.y + l.height);
            });
        
            let snappedX = false;
            for (const sourceV of sourceLines.V) {
                if (snappedX) break;
                for (const targetV of targetLines.V) {
                    if (Math.abs(sourceV - targetV) < snapThresholdCanvas) {
                        finalDx += (targetV - sourceV);
                        activeSnapLines.push({ type: 'V', position: targetV });
                        snappedX = true;
                        break;
                    }
                }
            }
        
            let snappedY = false;
            for (const sourceH of sourceLines.H) {
                if (snappedY) break;
                for (const targetH of targetLines.H) {
                    if (Math.abs(sourceH - targetH) < snapThresholdCanvas) {
                        finalDy += (targetH - sourceH);
                        activeSnapLines.push({ type: 'H', position: targetH });
                        snappedY = true;
                        break;
                    }
                }
            }
        
            setSnapLines(activeSnapLines);
        
            const updates = currentInteraction.initialLayers.map(layer => ({
                id: layer.id,
                props: { x: layer.x + finalDx, y: layer.y + finalDy }
            }));
            onUpdateLayers(updates, false);

        } else if (currentInteraction.type === 'resize' && currentInteraction.handle && currentInteraction.initialBoundingBox && currentInteraction.initialLayers) {
            const { initialLayers, handle, initialBoundingBox: bbox } = currentInteraction;

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
             if (handle.length === 2) { // Corner handles
                const ar = bbox.width / bbox.height;
                if (Math.abs(dx) > Math.abs(dy) * ar) {
                    scaleY = scaleX;
                } else {
                    scaleX = scaleY;
                }
            }
             const updates = initialLayers.map(layer => {
                const relativeX = layer.x - bbox.x;
                const relativeY = layer.y - bbox.y;

                const newX = bbox.x + (relativeX - bbox.width * pivotX) * scaleX + bbox.width * pivotX;
                const newY = bbox.y + (relativeY - bbox.height * pivotY) * scaleY + bbox.height * pivotY;
                const newWidth = layer.width * scaleX;
                const newHeight = layer.height * scaleY;

                return { id: layer.id, props: { x: newX, y: newY, width: newWidth, height: newHeight }};
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
                const newIds = new Set(initialSelectedIds || []);
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
            setSnapLines([]);
            if (interaction.type === 'marquee') {
                if (!interaction.hasActionStarted) {
                    setSelectedLayerIds([]);
                }
                setMarqueeRect(null);
            } else if(interaction.initialLayers) {
                const updates = interaction.initialLayers.map(l => ({ id: l.id, props: layers.find(layer => layer.id === l.id) ?? {} }));
                onUpdateLayers(updates, true);
            }
            setInteraction(null);
        }
        if (activeCanvasTool === 'pen' && currentPenDrag) {
            const { start, current } = currentPenDrag;
            const dragDistance = Math.hypot(current.x - start.x, current.y - start.y);
            const newNode: PenNode = dragDistance < 5 / scale.get()
                ? { anchor: start, inHandle: start, outHandle: start }
                : { anchor: start, inHandle: { x: start.x - (current.x - start.x), y: start.y - (current.y - start.y) }, outHandle: current };
            setPenPathPoints(prev => [...prev, newNode]);
            setCurrentPenDrag(null);
        }
    };
    
    const handleLayerPointerDown = (e: React.PointerEvent<HTMLDivElement>, layerId: string) => {
        if (activeCanvasTool === 'hand' || isSpacePanning || activeCanvasTool === 'pen') return;
        e.stopPropagation();
        
        const layer = layers.find(l => l.id === layerId);
        if (!layer || layer.isLocked) {
            if (!e.shiftKey) setSelectedLayerIds([]);
            return;
        }
        
        const pointer = getPointerInCanvas(e);
        if (!pointer) return;

        if (e.altKey && selectedLayers.length === 1 && selectedLayer?.id === layerId && selectionPath && selectionBbox) {
            beginInteraction();
            const originalLayer = selectedLayer;
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = async () => {
                const tempCanvas = document.createElement('canvas'); const ctx = tempCanvas.getContext('2d');
                if (!ctx) return;
                const bbox = selectionBbox;
                tempCanvas.width = bbox.width;
                tempCanvas.height = bbox.height;
                ctx.translate(-bbox.x, -bbox.y);
                ctx.clip(selectionPath);
                ctx.drawImage(img, 0, 0, originalLayer.width, originalLayer.height);
                const newUrl = tempCanvas.toDataURL('image/png');
                const newLayer = await copySelectionAsNewLayer(originalLayer, newUrl, bbox);
                setSelectedLayerIds([newLayer.id]);
                setInteraction({ type: 'move', initialLayers: [{...newLayer}], initialBoundingBox: getBoundingBoxForLayers([{...newLayer}]), initialPointer: pointer });
            };
            img.src = originalLayer.url;
            return; 
        }

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
        if (selectedLayers.length > 0 && pointer && selectionBoundingBox) {
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
        const target = e.target as HTMLElement;
        const isBackgroundClick = target.id === 'pen-interaction-overlay' || target.id === 'canvas-wrapper';

        if (activeCanvasTool === 'hand' || isSpacePanning) {
            const pointer = getPointerInView(e);
            if (pointer) {
                panStartRef.current = { pan: { x: panX.get(), y: panY.get() }, pointer };
                e.currentTarget.style.cursor = 'grabbing';
            }
        } else if (activeCanvasTool === 'pen' && isBackgroundClick && selectedLayer) {
            const coords = getPointerInCanvas(e);
            if (!coords) return;
            const firstPoint = penPathPoints[0];
            const clickThreshold = 10 / scale.get();
            if (penPathPoints.length > 2 && Math.hypot(coords.x - firstPoint.anchor.x, coords.y - firstPoint.anchor.y) < clickThreshold) {
                finalizePenPath();
            } else {
                setCurrentPenDrag({ start: coords, current: coords });
            }
        } else if (activeCanvasTool === 'select' && isBackgroundClick) {
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
        const canvas = previewCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const s = scale.get();
        
        if (marqueeRect) {
            ctx.save();
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
            ctx.lineWidth = 1 / s;
            ctx.setLineDash([4 / s, 4 / s]);
            ctx.strokeRect(marqueeRect.x, marqueeRect.y, marqueeRect.width, marqueeRect.height);
            ctx.restore();
        }

        if (snapLines.length > 0) {
            ctx.save();
            ctx.strokeStyle = '#ff00ff'; // Magenta for snapping
            ctx.lineWidth = 1 / scale.get();
            snapLines.forEach(line => {
                ctx.beginPath();
                if (line.type === 'V') {
                    ctx.moveTo(line.position, 0);
                    ctx.lineTo(line.position, canvasSettings.height);
                } else {
                    ctx.moveTo(0, line.position);
                    ctx.lineTo(canvasSettings.width, line.position);
                }
                ctx.stroke();
            });
            ctx.restore();
        }

        if (activeCanvasTool === 'pen') {
            const styles = { path: 'rgba(251, 191, 36, 1)', handle: 'rgba(59, 130, 246, 1)', anchor: 'white', pathW: 2/s, handleLineW: 1/s, anchorS: 8/s, handleS: 6/s };
            ctx.save();
            if (penPathPoints.length > 0) {
                ctx.strokeStyle = styles.path; ctx.lineWidth = styles.pathW; ctx.beginPath();
                ctx.moveTo(penPathPoints[0].anchor.x, penPathPoints[0].anchor.y);
                for (let i = 0; i < penPathPoints.length - 1; i++) {
                    const p0 = penPathPoints[i]; const p1 = penPathPoints[i + 1];
                    ctx.bezierCurveTo(p0.outHandle.x, p0.outHandle.y, p1.inHandle.x, p1.inHandle.y, p1.anchor.x, p1.anchor.y);
                }
                ctx.stroke();
            }
            if (penPathPoints.length > 0) {
                const lastNode = penPathPoints[penPathPoints.length - 1]; ctx.beginPath(); ctx.strokeStyle = styles.path;
                if (currentPenDrag) {
                    ctx.lineWidth = styles.pathW; ctx.setLineDash([]);
                    const p0 = lastNode; const p3_anchor = currentPenDrag.start; const p3_outHandle = currentPenDrag.current;
                    const p3_inHandle = { x: p3_anchor.x - (p3_outHandle.x - p3_anchor.x), y: p3_anchor.y - (p3_outHandle.y - p3_anchor.y) };
                    ctx.moveTo(p0.anchor.x, p0.anchor.y);
                    ctx.bezierCurveTo(p0.outHandle.x, p0.outHandle.y, p3_inHandle.x, p3_inHandle.y, p3_anchor.x, p3_anchor.y);
                } else if (cursorPosition) {
                    ctx.lineWidth = styles.handleLineW; ctx.setLineDash([4/s, 4/s]);
                    ctx.moveTo(lastNode.anchor.x, lastNode.anchor.y);
                    ctx.lineTo(cursorPosition.x, cursorPosition.y);
                }
                ctx.stroke();
            }
            penPathPoints.forEach(p => {
                ctx.beginPath(); ctx.strokeStyle = styles.handle; ctx.lineWidth = styles.handleLineW; ctx.setLineDash([]);
                ctx.moveTo(p.inHandle.x, p.inHandle.y); ctx.lineTo(p.outHandle.x, p.outHandle.y); ctx.stroke();
                ctx.fillStyle = styles.handle; ctx.beginPath(); ctx.arc(p.inHandle.x, p.inHandle.y, styles.handleS / 2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(p.outHandle.x, p.outHandle.y, styles.handleS / 2, 0, Math.PI * 2); ctx.fill();
            });
            if (currentPenDrag) {
                const p_anchor = currentPenDrag.start; const p_outHandle = currentPenDrag.current;
                const p_inHandle = { x: p_anchor.x - (p_outHandle.x - p_anchor.x), y: p_anchor.y - (p_outHandle.y - p_anchor.y) };
                ctx.beginPath(); ctx.strokeStyle = styles.handle; ctx.lineWidth = styles.handleLineW; ctx.setLineDash([]);
                ctx.moveTo(p_inHandle.x, p_inHandle.y); ctx.lineTo(p_outHandle.x, p_outHandle.y); ctx.stroke();
                ctx.fillStyle = styles.handle; ctx.beginPath(); ctx.arc(p_inHandle.x, p_inHandle.y, styles.handleS / 2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(p_outHandle.x, p_outHandle.y, styles.handleS / 2, 0, Math.PI * 2); ctx.fill();
            }
            const drawAnchor = (p: {x:number, y:number}) => {
                ctx.fillStyle = styles.anchor; ctx.strokeStyle = styles.handle; ctx.lineWidth = styles.handleLineW; ctx.setLineDash([]);
                ctx.fillRect(p.x - styles.anchorS / 2, p.y - styles.anchorS / 2, styles.anchorS, styles.anchorS);
                ctx.strokeRect(p.x - styles.anchorS / 2, p.y - styles.anchorS / 2, styles.anchorS, styles.anchorS);
            };
            penPathPoints.forEach(p => drawAnchor(p.anchor));
            if (currentPenDrag) drawAnchor(currentPenDrag.start);
            ctx.restore();
        }
    }, [activeCanvasTool, penPathPoints, currentPenDrag, scale, cursorPosition, marqueeRect, snapLines, canvasSettings]);

    useEffect(() => {
        handleFitCanvas();
    }, [canvasSettings, handleFitCanvas]);
    
    return (
        <main
            ref={canvasViewRef}
            className="flex-1 flex items-center justify-center p-6 bg-neutral-800/30 overflow-hidden relative"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={(e) => { handlePointerUp(e); setCursorPosition(null); }}
            onWheel={handleWheel}
            style={{ cursor: interaction?.type === 'rotate' ? 'alias' : (activeCanvasTool === 'hand' || isSpacePanning) ? 'grab' : 'default' }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div id="pen-interaction-overlay" className="absolute inset-0" style={{ zIndex: 1002, pointerEvents: activeCanvasTool === 'pen' ? 'auto' : 'none', cursor: activeCanvasTool === 'pen' ? 'crosshair' : 'default' }} onPointerDown={handleCanvasPointerDown} />
            <motion.div
                id="canvas-wrapper"
                className="relative shadow-lg flex-shrink-0"
                style={{ width: canvasSettings.width, height: canvasSettings.height, backgroundColor: canvasSettings.background, x: panX, y: panY, scale }}
                onPointerDown={handleCanvasPointerDown}
            >
                {layers.map((layer, index) => (
                    <LayerItem
                        key={layer.id}
                        layer={layer}
                        isSelected={selectedLayerIds.includes(layer.id)}
                        selectionPath={selectedLayer?.id === layer.id ? selectionPath : null}
                        scaleMV={scale}
                        activeCanvasTool={activeCanvasTool}
                        isSpacePanning={isSpacePanning}
                        onLayerPointerDown={handleLayerPointerDown}
                        zIndex={layers.length - 1 - index}
                    />
                ))}
                <canvas ref={previewCanvasRef} width={canvasSettings.width} height={canvasSettings.height} className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 1003 }} />
                
                {selectionBoundingBox && selectedLayers.length > 0 && !selectedLayers.some(l => l.isLocked) && (
                    <SelectionFrame 
                        boundingBox={selectionBoundingBox} 
                        rotation={selectedLayer ? selectedLayer.rotation : 0}
                        isMultiSelect={selectedLayers.length > 1}
                        scaleMV={scale} 
                        onHandlePointerDown={handleHandlePointerDown} 
                        onRotatePointerDown={handleRotatePointerDown} 
                    />
                )}
                
                {selectedLayers.length === 1 && selectedLayer && !selectedLayer.isLocked && <FloatingLayerToolbar layer={selectedLayer} isSelectionActive={!!selectionPath} onAction={(action) => {
                    if (action === 'delete') deleteLayer(selectedLayer.id);
                    if (action === 'duplicate') handleDuplicateAction();
                    if (action === 'export') exportSelectedLayer();
                }} scaleMV={scale} />}
                {selectedLayers.length > 1 && selectionBoundingBox && <FloatingMultiLayerToolbar 
                    boundingBox={selectionBoundingBox}
                    scaleMV={scale}
                    onAction={onMultiLayerAction}
                />}
            </motion.div>
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
                        <p className="text-2xl font-bold text-yellow-400">Thả ảnh để thêm layer mới</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
};