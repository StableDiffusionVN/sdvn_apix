/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, MotionValue } from 'framer-motion';
import { cn } from '../../lib/utils';
import { type Layer } from './LayerComposer.types';

interface LayerItemProps {
    layer: Layer;
    isSelected: boolean;
    selectionPath: Path2D | null;
    onLayerPointerDown: (e: React.PointerEvent<HTMLDivElement>, layerId: string) => void;
    zIndex: number;
    scaleMV: MotionValue<number>;
    activeCanvasTool: 'select' | 'hand' | 'pen';
    isSpacePanning: boolean;
}

export const LayerItem: React.FC<LayerItemProps> = React.memo(({
    layer, isSelected, selectionPath, zIndex, scaleMV,
    activeCanvasTool, isSpacePanning,
    onLayerPointerDown,
}) => {
    
    const isHandToolActive = activeCanvasTool === 'hand' || isSpacePanning;
    const marchingAntsCanvasRef = React.useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
        const canvas = marchingAntsCanvasRef.current;
        if (!canvas || !isSelected) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let offset = 0;

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (selectionPath) {
                const currentScale = scaleMV.get();
                ctx.save();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1 / currentScale;
                ctx.setLineDash([5 / currentScale, 5 / currentScale]);
                
                ctx.lineDashOffset = -offset;
                ctx.stroke(selectionPath);
                
                ctx.strokeStyle = 'black';
                ctx.lineDashOffset = -offset + (5 / currentScale);
                ctx.stroke(selectionPath);
                
                ctx.restore();
                offset = (offset + 0.5) % (10 / currentScale);
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            // Final clear on cleanup
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
    }, [isSelected, selectionPath, scaleMV]);


    if (!layer.isVisible) {
        return null;
    }

    return (
        <motion.div
            onPointerDown={(e) => onLayerPointerDown(e, layer.id)}
            className={cn(
                "absolute",
                layer.isLocked ? 'cursor-default' : (isHandToolActive ? 'cursor-grab' : 'cursor-move')
            )}
            style={{
                x: layer.x,
                y: layer.y,
                width: layer.width,
                height: layer.height,
                rotate: layer.rotation,
                mixBlendMode: (layer.blendMode === 'source-over' ? 'normal' : layer.blendMode) as any,
                opacity: layer.opacity / 100,
                zIndex: zIndex,
            }}
        >
            {layer.type === 'image' && layer.url && (
                <img src={layer.url} className="w-full h-full pointer-events-none" alt="" />
            )}
            {layer.type === 'text' && (
                <div 
                    className="w-full h-full pointer-events-none p-1 box-border"
                    style={{
                        fontFamily: layer.fontFamily,
                        fontSize: `${layer.fontSize}px`,
                        fontWeight: layer.fontWeight,
                        fontStyle: layer.fontStyle,
                        color: layer.color,
                        textAlign: layer.textAlign,
                        lineHeight: layer.lineHeight,
                        textTransform: layer.textTransform,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}
                >
                    {layer.text}
                </div>
            )}
            
            {isSelected && (
                <canvas
                    ref={marchingAntsCanvasRef}
                    width={layer.width}
                    height={layer.height}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
            )}
        </motion.div>
    );
});