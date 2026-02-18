
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { useMotionValue } from 'framer-motion';
import { useTheme } from '../../../Theme.tsx';
import { WaterConfig } from '../../../types/index.tsx';
import RangeSlider from '../../Core/RangeSlider.tsx';
import ColorPicker from '../../Core/ColorPicker.tsx';
import Select from '../../Core/Select.tsx';
import type { SkyboxOption } from '../../../environments.ts';
import Button from '../../Core/Button.tsx';
import Toggle from '../../Core/Toggle.tsx';

interface WaterSimulationPanelProps {
  waterConfig: WaterConfig;
  onWaterPropChange: (updates: Partial<WaterConfig>) => void;
  onSyncFromSky: () => void;
  isSplitView: boolean;
  onToggleSplitView: () => void;
  skyboxOptions: SkyboxOption[];
  onHdrUpload: (file: File) => void;
}

// Helper for local motion values to use RangeSlider
const LocalRange: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
}> = ({ label, value, min, max, onChange }) => {
  const mv = useMotionValue(value);
  
  React.useEffect(() => {
    mv.set(value);
  }, [value, mv]);

  return (
    <RangeSlider
      label={label}
      motionValue={mv}
      onCommit={(v) => {
        mv.set(v);
        onChange(v);
      }}
      min={min}
      max={max}
    />
  );
};

export const WaterSimulation: React.FC<WaterSimulationPanelProps> = ({ waterConfig, onWaterPropChange, onSyncFromSky, isSplitView, onToggleSplitView, skyboxOptions, onHdrUpload }) => {
  const { theme } = useTheme();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onHdrUpload(file);
    }
  };
  
  const selectOptions = skyboxOptions.map(opt => ({ value: opt.url, label: opt.name }));

  return (
    <>
      <label style={{ ...theme.Type.Readable.Label.S, display: 'block', marginBottom: theme.spacing['Space.M'], color: theme.Color.Base.Content[2], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Water Simulation
      </label>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.M'] }}>
         <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".hdr,image/vnd.radiance"
            onChange={handleFileChange}
         />
         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: theme.spacing['Space.S']}}>
            <Button
                label="Sync Colors"
                onClick={onSyncFromSky}
                variant="secondary"
                size="S"
                icon="ph-sparkle"
            />
            <Button
                label="Split View"
                onClick={onToggleSplitView}
                variant={isSplitView ? 'primary' : 'secondary'}
                size="S"
                icon="ph-rows"
                disabled={true}
            />
            <Button
                label="Upload"
                onClick={handleUploadClick}
                variant="secondary"
                size="S"
                icon="ph-upload-simple"
            />
         </div>
         <Select
            label="Environment"
            value={waterConfig.skyboxUrl}
            onChange={(e) => onWaterPropChange({ skyboxUrl: e.target.value })}
            options={selectOptions}
         />
         <ColorPicker
            label="Deep"
            value={waterConfig.colorDeep}
            onChange={(e) => onWaterPropChange({ colorDeep: e.target.value })}
         />
         <ColorPicker
            label="Shallow"
            value={waterConfig.colorShallow}
            onChange={(e) => onWaterPropChange({ colorShallow: e.target.value })}
         />
         
         <div style={{ borderTop: `1px solid ${theme.Color.Base.Surface[3]}`, margin: `${theme.spacing['Space.S']} 0` }} />
         <label style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[3] }}>Waves & Surface</label>

         <LocalRange label="Wave Height" value={waterConfig.waveHeight * 10} min={0} max={50} onChange={(v) => onWaterPropChange({ waveHeight: v / 10 })} />
         <LocalRange label="Wave Speed" value={waterConfig.waveSpeed * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ waveSpeed: v / 100 })} />
         <LocalRange label="Scale" value={waterConfig.waveScale * 10} min={1} max={100} onChange={(v) => onWaterPropChange({ waveScale: v / 10 })} />
         <LocalRange label="Roughness" value={waterConfig.roughness * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ roughness: v / 100 })} />
         <LocalRange label="Normal Flatness" value={waterConfig.normalFlatness} min={1} max={100} onChange={(v) => onWaterPropChange({ normalFlatness: v })} />
         
         <div style={{ borderTop: `1px solid ${theme.Color.Base.Surface[3]}`, margin: `${theme.spacing['Space.S']} 0` }} />
         <label style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[3] }}>Displacement</label>
         <Toggle 
          label="Texture Displacement" 
          isOn={waterConfig.useDisplacement} 
          onToggle={() => onWaterPropChange({ useDisplacement: !waterConfig.useDisplacement })} 
         />
         <LocalRange label="Displacement Strength" value={waterConfig.displacementStrength * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ displacementStrength: v / 100 })} />
         <LocalRange label="Displacement Speed" value={waterConfig.displacementSpeed * 100} min={0} max={20} onChange={(v) => onWaterPropChange({ displacementSpeed: v / 100 })} />


         <div style={{ borderTop: `1px solid ${theme.Color.Base.Surface[3]}`, margin: `${theme.spacing['Space.S']} 0` }} />
         <label style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[3] }}>Surface Detail</label>

         <Toggle 
          label="Texture Normals" 
          isOn={waterConfig.useTextureNormals} 
          onToggle={() => onWaterPropChange({ useTextureNormals: !waterConfig.useTextureNormals })} 
         />
         <LocalRange label="Detail Scale" value={waterConfig.normalMapScale * 10} min={1} max={50} onChange={(v) => onWaterPropChange({ normalMapScale: v / 10 })} />
         <LocalRange label="Detail Speed" value={waterConfig.normalMapSpeed * 100} min={0} max={20} onChange={(v) => onWaterPropChange({ normalMapSpeed: v / 100 })} />
         <LocalRange label="Detail Strength" value={waterConfig.normalMapStrength * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ normalMapStrength: v / 100 })} />

         <div style={{ borderTop: `1px solid ${theme.Color.Base.Surface[3]}`, margin: `${theme.spacing['Space.S']} 0` }} />
         <label style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[3] }}>Surface Texture (Foam)</label>

         <Toggle 
          label="Enable Foam" 
          isOn={waterConfig.useTextureSurface} 
          onToggle={() => onWaterPropChange({ useTextureSurface: !waterConfig.useTextureSurface })} 
         />
         <ColorPicker
            label="Foam Color"
            value={waterConfig.foamColor}
            onChange={(e) => onWaterPropChange({ foamColor: e.target.value })}
         />
         <LocalRange label="Foam Scale" value={waterConfig.surfaceTextureScale * 10} min={1} max={50} onChange={(v) => onWaterPropChange({ surfaceTextureScale: v / 10 })} />
         <LocalRange label="Foam Speed" value={waterConfig.surfaceTextureSpeed * 100} min={0} max={20} onChange={(v) => onWaterPropChange({ surfaceTextureSpeed: v / 100 })} />
         <LocalRange label="Foam Strength" value={waterConfig.surfaceTextureStrength * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ surfaceTextureStrength: v / 100 })} />


         <div style={{ borderTop: `1px solid ${theme.Color.Base.Surface[3]}`, margin: `${theme.spacing['Space.S']} 0` }} />
         <label style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[3] }}>Ripples (Interactive)</label>
         
         <LocalRange label="Damping" value={waterConfig.rippleDamping * 1000} min={900} max={999} onChange={(v) => onWaterPropChange({ rippleDamping: v / 1000 })} />
         <LocalRange label="Strength" value={waterConfig.rippleStrength * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ rippleStrength: v / 100 })} />
         <LocalRange label="Radius" value={waterConfig.rippleRadius * 100} min={1} max={20} onChange={(v) => onWaterPropChange({ rippleRadius: v / 100 })} />
         <LocalRange label="Displacement" value={waterConfig.rippleIntensity * 10} min={0} max={50} onChange={(v) => onWaterPropChange({ rippleIntensity: v / 10 })} />
         <LocalRange label="Normal Strength" value={waterConfig.rippleNormalIntensity} min={0} max={20} onChange={(v) => onWaterPropChange({ rippleNormalIntensity: v })} />

         <div style={{ borderTop: `1px solid ${theme.Color.Base.Surface[3]}`, margin: `${theme.spacing['Space.S']} 0` }} />
         <label style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[3] }}>Underwater</label>

         <LocalRange label="Dimming" value={waterConfig.underwaterDimming * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ underwaterDimming: v / 100 })} />
         <ColorPicker
            label="Fog Color"
            value={waterConfig.underwaterFogColor}
            onChange={(e) => onWaterPropChange({ underwaterFogColor: e.target.value })}
         />
         <LocalRange label="Fog Start" value={waterConfig.fogCutoffStart} min={0} max={500} onChange={(v) => onWaterPropChange({ fogCutoffStart: v })} />
         <LocalRange label="Fog End" value={waterConfig.fogCutoffEnd} min={10} max={1000} onChange={(v) => onWaterPropChange({ fogCutoffEnd: v })} />
         
         <div style={{ borderTop: `1px solid ${theme.Color.Base.Surface[3]}`, margin: `${theme.spacing['Space.S']} 0` }} />
         <label style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[3] }}>Caustics</label>
         
         <LocalRange label="Intensity" value={waterConfig.causticsIntensity * 10} min={0} max={50} onChange={(v) => onWaterPropChange({ causticsIntensity: v / 10 })} />
         <LocalRange label="Scale" value={waterConfig.causticsScale * 100} min={1} max={50} onChange={(v) => onWaterPropChange({ causticsScale: v / 100 })} />
         <LocalRange label="Speed" value={waterConfig.causticsSpeed * 10} min={0} max={50} onChange={(v) => onWaterPropChange({ causticsSpeed: v / 10 })} />

      </div>
    </>
  );
};