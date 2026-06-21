import { useState } from 'react';
import { type EngineDesignResult } from '../../services/engineDesignService';
import { type InjectorSweepRow } from '../../services/injectorSweepService';
import PressureFed, { type ViewState } from './PressureFed';
import { type PressurantGasKey, type TankShape } from './PlumbingRightPanel';
import './plumbing.css';

const SUB_TABS = ['PRESSURE FED'] as const;
type SubTab = typeof SUB_TABS[number];

interface PlumbingProps {
  engineDesignResult: EngineDesignResult | null;
  injectorSelectedRow: InjectorSweepRow | null;
  pressureFedRightCollapsed: boolean;
  onPressureFedRightToggle: () => void;

  gas: PressurantGasKey;
  onGasChange: (g: PressurantGasKey) => void;
  tankShape: TankShape;
  onTankShapeChange: (s: TankShape) => void;
  aspectRatio: number;
  onAspectRatioChange: (v: number) => void;
  oxMaterial: string;
  onOxMaterialChange: (m: string) => void;
  fuelMaterial: string;
  onFuelMaterialChange: (m: string) => void;
  pressurantMaterial: string;
  onPressurantMaterialChange: (m: string) => void;
  injectorDropPct: number;
  onInjectorDropPctChange: (v: number) => void;
  lineLossBar: number;
  onLineLossBarChange: (v: number) => void;
  ullageMarginBar: number;
  onUllageMarginBarChange: (v: number) => void;
  pressurantTankBar: number;
  onPressurantTankBarChange: (v: number) => void;
  burnTimeSec: number;
  onBurnTimeSecChange: (v: number) => void;

  view: ViewState | null;
  onViewChange: (v: ViewState) => void;
}

export default function Plumbing({
  engineDesignResult, injectorSelectedRow, pressureFedRightCollapsed, onPressureFedRightToggle,
  gas, onGasChange, tankShape, onTankShapeChange, aspectRatio, onAspectRatioChange,
  oxMaterial, onOxMaterialChange, fuelMaterial, onFuelMaterialChange, pressurantMaterial, onPressurantMaterialChange,
  injectorDropPct, onInjectorDropPctChange, lineLossBar, onLineLossBarChange,
  ullageMarginBar, onUllageMarginBarChange, pressurantTankBar, onPressurantTankBarChange,
  burnTimeSec, onBurnTimeSecChange,
  view, onViewChange,
}: PlumbingProps) {
  const [subTab, setSubTab] = useState<SubTab>('PRESSURE FED');

  return (
    <div className="plumb-root">
      <div className="plumb-subtabs">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            className={`plumb-subtab ${subTab === tab ? 'plumb-subtab--active' : ''}`}
            onClick={() => setSubTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="plumb-subtab-content">
        {subTab === 'PRESSURE FED' && (
          <PressureFed
            engineDesignResult={engineDesignResult}
            injectorSelectedRow={injectorSelectedRow}
            rightCollapsed={pressureFedRightCollapsed}
            onRightToggle={onPressureFedRightToggle}
            gas={gas}
            onGasChange={onGasChange}
            tankShape={tankShape}
            onTankShapeChange={onTankShapeChange}
            aspectRatio={aspectRatio}
            onAspectRatioChange={onAspectRatioChange}
            oxMaterial={oxMaterial}
            onOxMaterialChange={onOxMaterialChange}
            fuelMaterial={fuelMaterial}
            onFuelMaterialChange={onFuelMaterialChange}
            pressurantMaterial={pressurantMaterial}
            onPressurantMaterialChange={onPressurantMaterialChange}
            injectorDropPct={injectorDropPct}
            onInjectorDropPctChange={onInjectorDropPctChange}
            lineLossBar={lineLossBar}
            onLineLossBarChange={onLineLossBarChange}
            ullageMarginBar={ullageMarginBar}
            onUllageMarginBarChange={onUllageMarginBarChange}
            pressurantTankBar={pressurantTankBar}
            onPressurantTankBarChange={onPressurantTankBarChange}
            burnTimeSec={burnTimeSec}
            onBurnTimeSecChange={onBurnTimeSecChange}
            view={view}
            onViewChange={onViewChange}
          />
        )}
      </div>
    </div>
  );
}
