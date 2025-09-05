/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useMemo, useRef } from 'react';
import { type Point, type Rect, type CropResizeHandle } from './ImageEditor.types';
import { getCursorForHandle, isPointInRect } from './ImageEditor.utils';

// --- Re-define a minimal set of props needed by this component
interface ImageEditorCanvasProps {
    previewCanvasRef: React.RefObject<HTMLCanvasElement>;
    drawingCanvasRef: React.RefObject<HTMLCanvasElement>;
    overlayCanvasRef: React.RefObject<HTMLCanvasElement>;
    tempDrawingCanvasRef: React.RefObject<HTMLCanvasElement>;
    handleActionStart: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
    handleCanvasMouseMove: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
    handleActionEnd: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
    setIsCursorOverCanvas: (isOver: boolean) => void;
    setHoveredCropHandle: (handle: CropResizeHandle | null) => void;
    
    // State for rendering overlays
    activeTool: string | null;
    isDrawing: boolean;
    isCursorOverCanvas: boolean;
    cursorPosition: Point | null;
    cropSelection: Rect | null;
    hoveredCropHandle: CropResizeHandle | null;
    brushSize: number;
    brushHardness: number;
    brushOpacity: number;
    brushColor: string;
    
    // Selection related states for drawing overlays
    isSelectionActive: boolean;
    selectionPath: Path2D | null;
    interactionState: string;
    currentDrawingPointsRef: React.RefObject<Point[]>;
    marqueeRect: Rect | null;
    ellipseRect: Rect | null;
    penPathPoints: { anchor: Point, outHandle: Point, inHandle: Point }[];
    currentPenDrag: { start: Point, current: Point } | null;
}

export const ImageEditorCanvas: React.FC<ImageEditorCanvasProps> = (props) => {
    const {
        previewCanvasRef, drawingCanvasRef, overlayCanvasRef, tempDrawingCanvasRef,
        handleActionStart, handleCanvasMouseMove, handleActionEnd,
        setIsCursorOverCanvas, setHoveredCropHandle,
        activeTool, isDrawing, isCursorOverCanvas, cursorPosition, cropSelection, hoveredCropHandle,
        brushSize, brushHardness, brushOpacity, brushColor,
        isSelectionActive, selectionPath, interactionState, currentDrawingPointsRef, marqueeRect,
        ellipseRect, penPathPoints, currentPenDrag
    } = props;
    
    const marchingAntsOffsetRef = useRef(0);
    
    const getCursorStyle = () => {
        if (activeTool === 'colorpicker') return 'crosshair';
        if (activeTool === 'brush' || activeTool === 'eraser') return 'none';
        if (activeTool === 'crop') {
            const handleCursor = getCursorForHandle(hoveredCropHandle);
            if (handleCursor) return handleCursor;
            if (cropSelection && cursorPosition && isPointInRect(cursorPosition, cropSelection)) return 'move';
            return 'crosshair';
        }
        if (activeTool === 'selection' || activeTool === 'pen' || activeTool === 'marquee' || activeTool === 'ellipse') return 'crosshair';
        return 'default';
    };

    const handleCanvasMouseLeave = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        setIsCursorOverCanvas(false);
        setHoveredCropHandle(null);
        handleActionEnd(e);
    };

    const cursorStyle = useMemo(() => {
        if (!isCursorOverCanvas || isDrawing || (activeTool !== 'brush' && activeTool !== 'eraser') || !cursorPosition) {
            return { display: 'none' };
        }
        const hardness = brushHardness / 100;
        const hardnessStop = Math.pow(hardness, 2) * 100;
        let cursorBackground: string, cursorBorder: string, cursorBoxShadow: string;
    
        if (activeTool === 'brush') {
            let color = brushColor;
            let transparentColor = 'transparent';
            if (color.startsWith('#')) {
                const r = parseInt(color.slice(1, 3), 16), g = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
                transparentColor = `rgba(${r},${g},${b},0)`;
                color = `rgba(${r},${g},${b},${brushOpacity / 100 * 0.85})`;
            } else {
                 transparentColor = color.replace(/rgba?\((\d+,\s*\d+,\s*\d+)[^)]*\)/, 'rgba($1, 0)');
            }
            cursorBackground = `radial-gradient(circle, ${color} ${hardnessStop}%, ${transparentColor} 100%)`;
            cursorBorder = `1px solid rgba(255,255,255,0.8)`;
            cursorBoxShadow = `0 0 0 1px rgba(0,0,0,0.8)`;
    
        } else { // eraser
            cursorBackground = `radial-gradient(circle, rgba(255,255,255,${brushOpacity / 100 * 0.3}) ${hardnessStop}%, rgba(255,255,255,0) 100%)`;
            cursorBorder = `1px solid rgba(0,0,0,0.8)`;
            cursorBoxShadow = `0 0 0 1px rgba(255,255,255,0.8)`;
        }
        return {
            position: 'absolute' as 'absolute', borderRadius: '50%', pointerEvents: 'none' as 'none',
            left: `${(overlayCanvasRef.current?.offsetLeft ?? 0) + cursorPosition.x}px`,
            top: `${(overlayCanvasRef.current?.offsetTop ?? 0) + cursorPosition.y}px`,
            width: `${brushSize}px`, height: `${brushSize}px`,
            transform: 'translate(-50%, -50%)', background: cursorBackground, border: cursorBorder, boxShadow: cursorBoxShadow,
        };
    }, [isCursorOverCanvas, isDrawing, activeTool, cursorPosition, brushSize, brushHardness, brushOpacity, brushColor]);

    useEffect(() => {
        let animId: number;
        const animate = () => {
            const overlay = overlayCanvasRef.current;
            if (overlay) {
                const ctx = overlay.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, overlay.width, overlay.height);
                    if (isDrawing && (activeTool === 'brush' || activeTool === 'eraser') && tempDrawingCanvasRef.current) {
                        ctx.save(); ctx.globalAlpha = brushOpacity / 100;
                        ctx.drawImage(tempDrawingCanvasRef.current, 0, 0); ctx.restore();
                    }
                    if (isSelectionActive && selectionPath) {
                        ctx.save(); ctx.strokeStyle = 'white'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
                        ctx.lineDashOffset = -marchingAntsOffsetRef.current; ctx.stroke(selectionPath);
                        ctx.strokeStyle = 'black'; ctx.lineDashOffset = -marchingAntsOffsetRef.current + 5; ctx.stroke(selectionPath);
                        ctx.restore();
                    }
                    if (interactionState === 'drawingSelection' && currentDrawingPointsRef.current && currentDrawingPointsRef.current.length > 1) {
                        ctx.save(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.moveTo(currentDrawingPointsRef.current[0].x, currentDrawingPointsRef.current[0].y);
                        for(let i = 1; i < currentDrawingPointsRef.current.length; i++) ctx.lineTo(currentDrawingPointsRef.current[i].x, currentDrawingPointsRef.current[i].y);
                        ctx.stroke(); ctx.restore();
                    }
                    if (interactionState === 'drawingMarquee' && marqueeRect) {
                        ctx.save(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
                        ctx.strokeRect(marqueeRect.x, marqueeRect.y, marqueeRect.width, marqueeRect.height); ctx.restore();
                    }
                    if (interactionState === 'drawingEllipse' && ellipseRect) {
                        ctx.save();
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([3, 3]);
                        ctx.beginPath();
                        ctx.ellipse(
                            ellipseRect.x + ellipseRect.width / 2,
                            ellipseRect.y + ellipseRect.height / 2,
                            ellipseRect.width / 2,
                            ellipseRect.height / 2,
                            0, 0, 2 * Math.PI
                        );
                        ctx.stroke();
                        ctx.restore();
                    }
                    if (activeTool === 'pen') {
                        if (penPathPoints.length > 0) {
                            ctx.save(); ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)'; ctx.lineWidth = 1.5; ctx.beginPath();
                            ctx.moveTo(penPathPoints[0].anchor.x, penPathPoints[0].anchor.y);
                            for (let i = 0; i < penPathPoints.length - 1; i++) {
                                const p0 = penPathPoints[i]; const p1 = penPathPoints[i+1];
                                ctx.bezierCurveTo(p0.outHandle.x, p0.outHandle.y, p1.inHandle.x, p1.inHandle.y, p1.anchor.x, p1.anchor.y);
                            }
                            ctx.stroke();
                            if (cursorPosition) {
                                const lastNode = penPathPoints[penPathPoints.length - 1];
                                ctx.beginPath(); ctx.setLineDash([3, 3]);
                                if (currentPenDrag) {
                                     const p0 = lastNode.anchor; const p1 = lastNode.outHandle; const p3 = currentPenDrag.start;
                                     const p2 = { x: p3.x - (currentPenDrag.current.x - p3.x), y: p3.y - (currentPenDrag.current.y - p3.y) };
                                     ctx.moveTo(p0.x, p0.y); ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
                                } else { ctx.moveTo(lastNode.anchor.x, lastNode.anchor.y); ctx.lineTo(cursorPosition.x, cursorPosition.y); }
                                ctx.stroke();
                            }
                            if (currentPenDrag) {
                                ctx.setLineDash([]); ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                                ctx.beginPath(); ctx.moveTo(currentPenDrag.start.x, currentPenDrag.start.y); ctx.lineTo(currentPenDrag.current.x, currentPenDrag.current.y); ctx.stroke();
                                const reflectedHandle = { x: currentPenDrag.start.x - (currentPenDrag.current.x - currentPenDrag.start.x), y: currentPenDrag.start.y - (currentPenDrag.current.y - currentPenDrag.start.y) };
                                ctx.beginPath(); ctx.moveTo(currentPenDrag.start.x, currentPenDrag.start.y); ctx.lineTo(reflectedHandle.x, reflectedHandle.y); ctx.stroke();
                            }
                            ctx.setLineDash([]); ctx.fillStyle = 'white'; ctx.strokeStyle = 'black'; ctx.lineWidth = 1;
                            ctx.beginPath(); ctx.arc(penPathPoints[0].anchor.x, penPathPoints[0].anchor.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                            ctx.restore();
                        } else if (currentPenDrag) {
                            ctx.save(); ctx.setLineDash([]); ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                            ctx.beginPath(); ctx.moveTo(currentPenDrag.start.x, currentPenDrag.start.y); ctx.lineTo(currentPenDrag.current.x, currentPenDrag.current.y); ctx.stroke();
                            const reflectedHandle = { x: currentPenDrag.start.x - (currentPenDrag.current.x - currentPenDrag.start.x), y: currentPenDrag.start.y - (currentPenDrag.current.y - currentPenDrag.start.y) };
                            ctx.beginPath(); ctx.moveTo(currentPenDrag.start.x, currentPenDrag.start.y); ctx.lineTo(reflectedHandle.x, reflectedHandle.y); ctx.stroke();
                            ctx.restore();
                        }
                    }
                    if (activeTool === 'colorpicker' && isCursorOverCanvas && cursorPosition) {
                        const previewCtx = previewCanvasRef.current?.getContext('2d', { willReadFrequently: true });
                        if (previewCtx) {
                            try {
                                const pixel = previewCtx.getImageData(cursorPosition.x, cursorPosition.y, 1, 1).data;
                                const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
                                const circleRadius = 12, offset = 20;
                                ctx.save();
                                ctx.beginPath(); ctx.arc(cursorPosition.x + offset, cursorPosition.y + offset, circleRadius, 0, Math.PI * 2);
                                ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
                                ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
                            } catch (e) { console.warn("Could not get pixel data for color picker preview.", e); }
                        }
                    }
                    marchingAntsOffsetRef.current = (marchingAntsOffsetRef.current + 0.5) % 10;
                }
            }
            animId = requestAnimationFrame(animate);
        };
        animId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animId);
    }, [isSelectionActive, selectionPath, interactionState, activeTool, penPathPoints, cursorPosition, currentPenDrag, isCursorOverCanvas, marqueeRect, ellipseRect, isDrawing, brushOpacity]);

    return (
        <div className="image-editor-preview-container w-full h-full">
            <canvas ref={previewCanvasRef} className="image-editor-preview absolute inset-0 m-auto" />
            <canvas ref={drawingCanvasRef} className="image-editor-preview absolute inset-0 m-auto" />
            <canvas ref={overlayCanvasRef} className="absolute inset-0 m-auto" style={{ touchAction: 'none', cursor: getCursorStyle() }}
                onMouseDown={handleActionStart} onMouseMove={handleCanvasMouseMove} onMouseUp={handleActionEnd} onMouseLeave={handleCanvasMouseLeave}
                onTouchStart={handleActionStart} onTouchMove={handleCanvasMouseMove} onTouchEnd={handleActionEnd}
                onMouseEnter={() => setIsCursorOverCanvas(true)}
            />
             {cropSelection && (
                <div className="absolute pointer-events-none" style={{
                    left: `${(overlayCanvasRef.current?.offsetLeft ?? 0) + cropSelection.x}px`, top: `${(overlayCanvasRef.current?.offsetTop ?? 0) + cropSelection.y}px`,
                    width: `${cropSelection.width}px`, height: `${cropSelection.height}px`, boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)', border: '1px dashed rgba(255, 255, 255, 0.8)',
                }} />
            )}
            <div style={cursorStyle} aria-hidden="true" />
        </div>
    );
};