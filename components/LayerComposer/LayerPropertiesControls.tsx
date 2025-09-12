/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useAppControls } from '../uiUtils';
import { type Layer, type BlendMode } from './LayerComposer.types';

const BLEND_MODES: BlendMode[] = ['source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];

interface LayerPropertiesControlsProps {
    layer: Layer;
    onUpdate: (id: string, newProps: Partial<Layer>, isFinalChange: boolean) => void;
    beginInteraction: () => void;
    // FIX: Add missing props to satisfy parent component
    editingMaskForLayerId: string | null;
    onReleaseMask: (layerId: string) => void;
    rectBorderRadius: number;
    onRectBorderRadiusChange: (radius: number) => void;
}

export const LayerPropertiesControls: React.FC<LayerPropertiesControlsProps> = ({ layer, onUpdate, beginInteraction }) => {
    const { t } = useAppControls();
    
    return (
        <div className="p-3 space-y-4">
            <div>
                <label htmlFor={`opacity-${layer.id}`} className="block text-sm font-medium text-neutral-300 mb-1">{t('layerComposer_opacity')}</label>
                <input
                    id={`opacity-${layer.id}`}
                    type="range"
                    min="0"
                    max="100"
                    value={layer.opacity}
                    onMouseDown={e => { e.stopPropagation(); beginInteraction(); }}
                    onInput={(e) => onUpdate(layer.id, { opacity: Number((e.target as HTMLInputElement).value) }, false)}
                    onChange={(e) => onUpdate(layer.id, { opacity: Number((e.target as HTMLInputElement).value) }, true)}
                    onClick={e => e.stopPropagation()}
                    className="slider-track"
                />
            </div>
            <div>
                 <label htmlFor={`blend-mode-${layer.id}`} className="block text-sm font-medium text-neutral-300 mb-1">{t('layerComposer_blendMode')}</label>
                 <select
                    id={`blend-mode-${layer.id}`}
                    onClick={(e) => e.stopPropagation()}
                    value={layer.blendMode}
                    onMouseDown={(e) => { e.stopPropagation(); beginInteraction(); }}
                    onChange={(e) => onUpdate(layer.id, { blendMode: e.target.value as BlendMode }, true)}
                    className="form-input !p-2 !text-sm w-full"
                >
                    {BLEND_MODES.map(mode => <option key={mode} value={mode}>{(mode === 'source-over' ? 'Normal' : mode.charAt(0).toUpperCase() + mode.slice(1))}</option>)}
                </select>
            </div>
        </div>
    );
};