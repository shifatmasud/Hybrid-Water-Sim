

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import Stage from '../Section/Stage.tsx';
import Dock from '../Section/Dock.tsx';
import FloatingWindow from '../Package/FloatingWindow.tsx';
import ThemeToggleButton from '../Core/ThemeToggleButton.tsx';
import ControlPanel from '../Package/ControlPanel/index.tsx';
import CodePanel from '../Package/CodePanel.tsx';
import ConsolePanel from '../Package/ConsolePanel.tsx';
import { WaterConfig, WindowId, WindowState, LogEntry } from '../../types/index.tsx';
import { skyboxOptions, type SkyboxOption } from '../../environments.ts';

interface Palette {
  colorDeep: string;
  colorShallow: string;
}

export interface SceneController {
  extractPalette: () => Promise<Palette | null>;
  updateWaterConfigFromPalette: (palette: Palette) => void;
  addDiscreteImpact?: () => void;
}

const getInitialWindowState = (): Record<WindowId, WindowState> => ({
  control: { id: 'control', title: 'Controls', isOpen: true, zIndex: 10, x: 0, y: 0 },
  code: { id: 'code', title: 'Code', isOpen: false, zIndex: 10, x: 0, y: 0 },
  console: { id: 'console', title: 'Console', isOpen: false, zIndex: 10, x: 0, y: 0 },
});

/**
 * 🏎️ Meta Prototype App
 * Acts as the main state orchestrator for the application.
 */
const MetaPrototype = () => {
  const { theme } = useTheme();
  const [windows, setWindows] = useState<Record<WindowId, WindowState>>(getInitialWindowState);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const sceneControllerRef = useRef<Partial<SceneController>>({});
  const [isSplitView, setIsSplitView] = useState(false);
  const [skyboxOptionsState, setSkyboxOptionsState] = useState<SkyboxOption[]>(skyboxOptions);

  const addLog = useCallback((message: string) => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
    };
    setLogs(prev => [...prev.slice(-100), newLog]); // Keep last 100 logs
  }, []);

  // -- Water Simulation State --
  const [waterConfig, setWaterConfig] = useState<WaterConfig>({
    skyboxUrl: skyboxOptions[0].url,
    sunIntensity: 1.2,
    colorShallow: '#41737c',
    colorDeep: '#7aa8d6',
    transparency: 0.65,
    roughness: 0.1,
    // Noise Layer A
    waveHeight: 0.15,
    waveSpeed: 0.108,
    waveScale: 0.7223,
    normalFlatness: 50,
    noiseType: 'simplex',
    // Noise Layer B
    useNoiseLayerB: false,
    noiseBlendingModeAB: 'mix',
    noiseBlendAB: 0.5,
    noiseTypeB: 'perlin',
    waveHeightB: 0.1,
    waveSpeedB: 0.05,
    waveScaleB: 1.5,
    // Noise Layer C
    useNoiseLayerC: false,
    noiseBlendingModeBC: 'add',
    noiseBlendBC: 0.5,
    noiseTypeC: 'simplex',
    waveHeightC: 0.05,
    waveSpeedC: 0.2,
    waveScaleC: 2.0,
    // Texture-based Normals
    useTextureNormals: true,
    normalMapScale: 1.0,
    normalMapSpeed: 0.05,
    normalMapStrength: 0.5,
    // Surface Texture (Foam)
    useTextureSurface: true,
    foamColor: '#ffffff',
    surfaceTextureScale: 1.0,
    surfaceTextureSpeed: 0.03,
    surfaceTextureStrength: 0.3,
    // Displacement Mapping
    useDisplacement: true,
    displacementStrength: 0.2,
    displacementSpeed: 0.08,
    // Underwater
    underwaterDimming: 0.4,
    underwaterLightIntensity: 2.0,
    underwaterFogColor: '#7aa8d6', // Match deep color by default
    ior: 1.33,
    fogCutoffStart: 80,
    fogCutoffEnd: 300,
    // Ripple Physics Defaults
    rippleDamping: 0.929,
    rippleStrength: 0.11,
    rippleRadius: 0.02,
    rippleIntensity: 3.7,
    rippleNormalIntensity: 7.0,
    // Caustics Defaults
    causticsIntensity: 1.5,
    causticsScale: 0.15,
    causticsSpeed: 1.5,
    // Color Ramp Defaults
    useColorRamp: false,
    colorRampNoiseType: 'simplex',
    colorRampNoiseScale: 1.0,
    colorRampNoiseSpeed: 0.1,
    colorRampNoiseMix: 1.0,
    useColorRampStop3: true,
    useColorRampStop4: false,
    useColorRampStop5: false,
    colorRampStop1Color: '#7aa8d6', // Deep
    colorRampStop1Position: 0.0,
    colorRampStop2Color: '#41737c', // Shallow
    colorRampStop2Position: 0.5,
    colorRampStop3Color: '#ffffff', // Foam
    colorRampStop3Position: 1.0,
    colorRampStop4Color: '#000000',
    colorRampStop4Position: 0.75,
    colorRampStop5Color: '#000000',
    colorRampStop5Position: 1.0,
    // Discrete Ripples
    useTextureImpacts: true,
    useVertexImpacts: false,
    impactStrength: 1.0,
  });

  const handleWaterConfigChange = (updates: Partial<WaterConfig>) => {
    setWaterConfig(prev => ({ ...prev, ...updates }));
    const changedKeys = Object.keys(updates).join(', ');
    addLog(`Water config updated: ${changedKeys}`);
  };

  // Expose a method for WaterScene to call back and update colors
  sceneControllerRef.current.updateWaterConfigFromPalette = (palette) => {
    if (palette) {
      setWaterConfig(prev => ({
        ...prev,
        colorDeep: palette.colorDeep,
        colorShallow: palette.colorShallow,
        underwaterFogColor: palette.colorDeep, // Auto-sync fog color
      }));
      addLog(`🎨 Scene colors synced from environment.`);
    }
  };

  // -- Window Management --
  const bringToFront = (id: WindowId) => {
    setWindows(prev => {
      // FIX: Explicitly type `w` as `WindowState` to resolve a TypeScript type inference issue.
      const maxZ = Math.max(...Object.values(prev).map((w: WindowState) => w.zIndex));
      if (prev[id].zIndex === maxZ) return prev; // Already in front
      return {
        ...prev,
        [id]: { ...prev[id], zIndex: maxZ + 1 },
      };
    });
  };

  const toggleWindow = (id: WindowId) => {
    setWindows(prev => {
      const isOpen = !prev[id].isOpen;
      if (isOpen) bringToFront(id);
      addLog(`Window '${id}' ${isOpen ? 'opened' : 'closed'}.`);
      return { ...prev, [id]: { ...prev[id], isOpen } };
    });
  };
  
  const handleSyncFromSky = async () => {
    if (sceneControllerRef.current?.extractPalette && sceneControllerRef.current?.updateWaterConfigFromPalette) {
      addLog('Syncing colors from environment...');
      const palette = await sceneControllerRef.current.extractPalette();
      if (palette) {
        // Re-use the existing update logic which includes logging
        sceneControllerRef.current.updateWaterConfigFromPalette(palette);
      } else {
        addLog('Skybox texture not loaded yet. Cannot sync.');
      }
    }
  };

  const handleToggleSplitView = () => {
    const nextState = !isSplitView;
    setIsSplitView(nextState);
    addLog(`Split view ${nextState ? 'enabled' : 'disabled'}.`);
  };

  const handleHdrUpload = (file: File) => {
    if (!file || !file.name.toLowerCase().endsWith('.hdr')) {
      addLog('Error: Please select a valid .hdr file.');
      return;
    }
    const url = URL.createObjectURL(file);
    const newOption = { name: `Custom: ${file.name}`, url };
    
    setSkyboxOptionsState(prev => [...prev, newOption]);
    handleWaterConfigChange({ skyboxUrl: url });
    addLog(`Custom HDR '${file.name}' loaded.`);
  };

  const handleAddDiscreteImpact = useCallback(() => {
    sceneControllerRef.current.addDiscreteImpact?.();
    addLog('Triggered discrete ripple impact.');
  }, []);

  // -- Code Panel State --
  const [codeText, setCodeText] = useState(JSON.stringify(waterConfig, null, 2));
  React.useEffect(() => {
    setCodeText(JSON.stringify(waterConfig, null, 2));
  }, [waterConfig]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: '100%',
      backgroundColor: theme.Color.Base.Surface[1],
      overflow: 'hidden',
    }}>
      <Stage waterConfig={waterConfig} sceneController={sceneControllerRef} isSplitView={isSplitView} />
      <ThemeToggleButton />
      
      <AnimatePresence>
        {windows.control.isOpen && (
          <FloatingWindow
            {...windows.control}
            onClose={() => toggleWindow('control')}
            onFocus={() => bringToFront('control')}
          >
            <ControlPanel
              waterConfig={waterConfig}
              onWaterPropChange={handleWaterConfigChange}
              onSyncFromSky={handleSyncFromSky}
              isSplitView={isSplitView}
              onToggleSplitView={handleToggleSplitView}
              skyboxOptions={skyboxOptionsState}
              onHdrUpload={handleHdrUpload}
              onAddDiscreteImpact={handleAddDiscreteImpact}
            />
          </FloatingWindow>
        )}
        {windows.code.isOpen && (
          <FloatingWindow
            {...windows.code}
            onClose={() => toggleWindow('code')}
            onFocus={() => bringToFront('code')}
          >
            <CodePanel
              waterConfig={waterConfig}
              codeText={codeText}
              onCodeChange={(e) => setCodeText(e.target.value)}
              onCopyCode={() => { navigator.clipboard.writeText(codeText); addLog('Code copied to clipboard.'); }}
              onFocus={() => {}}
              onBlur={() => {
                try {
                  const newConfig = JSON.parse(codeText);
                  setWaterConfig(newConfig);
                  addLog('Water config updated from JSON.');
                } catch (err) {
                  addLog('Error parsing JSON.');
                }
              }}
            />
          </FloatingWindow>
        )}
        {windows.console.isOpen && (
          <FloatingWindow
            {...windows.console}
            onClose={() => toggleWindow('console')}
            onFocus={() => bringToFront('console')}
          >
            <ConsolePanel logs={logs} />
          </FloatingWindow>
        )}
      </AnimatePresence>

      <Dock windows={windows} toggleWindow={toggleWindow} />
    </div>
  );
};

export default MetaPrototype;
