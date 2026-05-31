import { Slider, Checkbox, Tooltip } from '@mui/material';
import { FUEL_COOLANT_PROPS } from './fuelCoolantProps';
import type { RegenChannelParams, RegenResult, WallMaterial } from './regenCooling';
import ChannelCrossSectionDiagram from './ChannelCrossSectionDiagram';

interface Props {
  enabled:          boolean;
  fuelCode:         string;
  params:           RegenChannelParams;
  onParamsChange:   (p: RegenChannelParams) => void;
  showPlot:         boolean;
  onShowPlotChange: (v: boolean) => void;
  regenResult?:     RegenResult;
}

const sliderSx = {
  color: '#00e5ff',
  width: 80,
  '& .MuiSlider-thumb': { width: 10, height: 10, boxShadow: '0 0 4px rgba(0,229,255,0.6)' },
  '& .MuiSlider-track': { border: 'none' },
  '& .MuiSlider-rail':  { opacity: 0.3 },
};

const checkboxSx = {
  color: 'rgba(0,229,255,0.4)',
  '&.Mui-checked': { color: '#00e5ff' },
  padding: '2px',
};

const SUITABILITY_COLOR: Record<string, string> = {
  good:        '#69ff47',
  marginal:    '#ffb300',
  unsupported: '#ff4444',
};

function FuelBadge({ fuelCode }: { fuelCode: string }) {
  const p = FUEL_COOLANT_PROPS[fuelCode];
  if (!p) return null;
  const color = SUITABILITY_COLOR[p.suitability] ?? '#aaa';
  const label = p.suitability === 'good' ? 'SUPPORTED'
              : p.suitability === 'marginal' ? 'MARGINAL'
              : 'UNSUPPORTED';
  return (
    <Tooltip title={p.warningMsg ?? `${fuelCode} is suitable as a regen coolant`} placement="left" arrow>
      <span style={{
        fontSize: 9, fontFamily: 'monospace', color,
        border: `1px solid ${color}`, borderRadius: 3,
        padding: '1px 4px', opacity: 0.9,
      }}>
        {fuelCode} · {label}
      </span>
    </Tooltip>
  );
}

export default function RegenCoolingControls({
  enabled, fuelCode, params, onParamsChange, showPlot, onShowPlotChange, regenResult,
}: Props) {
  const disabledClass = !enabled ? ' ec2-overlay-switch--disabled' : '';
  const set = (partial: Partial<RegenChannelParams>) => onParamsChange({ ...params, ...partial });
  const opacitySx = { ...sliderSx, opacity: enabled ? 1 : 0.35 };

  return (
    <>
      {/* Fuel suitability badge */}
      <div className={`ec2-overlay-switch${disabledClass}`} style={{ padding: '3px 8px', gap: 6, justifyContent: 'flex-end' }}>
        <FuelBadge fuelCode={fuelCode} />
      </div>

      {/* numChannels */}
      <div className={`ec2-overlay-switch${disabledClass}`} style={{ padding: '3px 8px', gap: 6 }}>
        <Tooltip title="Number of coolant channels machined around the nozzle circumference" placement="left" arrow>
          <span className={`ec2-switch-label${enabled ? ' ec2-switch-label--active' : ''}`}>N<sub>ch</sub></span>
        </Tooltip>
        <Slider value={params.numChannels} min={20} max={200} step={5} disabled={!enabled}
          size="small" sx={opacitySx}
          onChange={(_, v) => set({ numChannels: v as number })} />
        <span className="ec2-angle-val" style={{ opacity: enabled ? 1 : 0.35, minWidth: 30 }}>{params.numChannels}</span>
      </div>

      {/* channelWidthMm */}
      <div className={`ec2-overlay-switch${disabledClass}`} style={{ padding: '3px 8px', gap: 6 }}>
        <Tooltip title="Coolant channel width (mm)" placement="left" arrow>
          <span className={`ec2-switch-label${enabled ? ' ec2-switch-label--active' : ''}`}>w<sub>ch</sub></span>
        </Tooltip>
        <Slider value={params.channelWidthMm} min={0.5} max={5.0} step={0.1} disabled={!enabled}
          size="small" sx={opacitySx}
          onChange={(_, v) => set({ channelWidthMm: v as number })} />
        <span className="ec2-angle-val" style={{ opacity: enabled ? 1 : 0.35, minWidth: 40 }}>{params.channelWidthMm.toFixed(1)} mm</span>
      </div>

      {/* channelHeightMm */}
      <div className={`ec2-overlay-switch${disabledClass}`} style={{ padding: '3px 8px', gap: 6 }}>
        <Tooltip title="Coolant channel height / depth (mm)" placement="left" arrow>
          <span className={`ec2-switch-label${enabled ? ' ec2-switch-label--active' : ''}`}>h<sub>ch</sub></span>
        </Tooltip>
        <Slider value={params.channelHeightMm} min={0.5} max={5.0} step={0.1} disabled={!enabled}
          size="small" sx={opacitySx}
          onChange={(_, v) => set({ channelHeightMm: v as number })} />
        <span className="ec2-angle-val" style={{ opacity: enabled ? 1 : 0.35, minWidth: 40 }}>{params.channelHeightMm.toFixed(1)} mm</span>
      </div>

      {/* wallThicknessMm */}
      <div className={`ec2-overlay-switch${disabledClass}`} style={{ padding: '3px 8px', gap: 6 }}>
        <Tooltip title="Hot-side wall thickness between the gas and coolant channel (mm)" placement="left" arrow>
          <span className={`ec2-switch-label${enabled ? ' ec2-switch-label--active' : ''}`}>t<sub>wall</sub></span>
        </Tooltip>
        <Slider value={params.wallThicknessMm} min={0.2} max={3.0} step={0.1} disabled={!enabled}
          size="small" sx={opacitySx}
          onChange={(_, v) => set({ wallThicknessMm: v as number })} />
        <span className="ec2-angle-val" style={{ opacity: enabled ? 1 : 0.35, minWidth: 40 }}>{params.wallThicknessMm.toFixed(1)} mm</span>
      </div>

      {/* wallMaterial */}
      <div className={`ec2-overlay-switch${disabledClass}`} style={{ padding: '3px 8px', gap: 6 }}>
        <span className={`ec2-switch-label${enabled ? ' ec2-switch-label--active' : ''}`}>Material</span>
        <select
          className="ec2-flow-select"
          value={params.wallMaterial}
          disabled={!enabled}
          onChange={e => set({ wallMaterial: e.target.value as WallMaterial })}
          style={{ opacity: enabled ? 1 : 0.35 }}
        >
          <option value="copper">Copper</option>
          <option value="steel">Steel 304</option>
          <option value="inconel">Inconel 718</option>
        </select>
      </div>

      {/* coolantInletTempK */}
      <div className={`ec2-overlay-switch${disabledClass}`} style={{ padding: '3px 8px', gap: 6 }}>
        <Tooltip title="Coolant temperature at the inlet (nozzle exit end). Typically near the propellant tank temperature." placement="left" arrow>
          <span className={`ec2-switch-label${enabled ? ' ec2-switch-label--active' : ''}`}>T<sub>in</sub></span>
        </Tooltip>
        <Slider value={params.coolantInletTempK} min={50} max={500} step={10} disabled={!enabled}
          size="small" sx={opacitySx}
          onChange={(_, v) => set({ coolantInletTempK: v as number })} />
        <span className="ec2-angle-val" style={{ opacity: enabled ? 1 : 0.35, minWidth: 46 }}>{params.coolantInletTempK} K</span>
      </div>

      {/* Channel cross-section diagram */}
      <div style={{ opacity: enabled ? 1 : 0.4 }}>
        <ChannelCrossSectionDiagram params={params} peakHotWallTempK={regenResult?.maxHotWallTemp_K} />
      </div>

      {/* Show Regen Plot checkbox */}
      <div className={`ec2-overlay-switch${disabledClass}`} style={{ padding: '3px' }}>
        <Checkbox
          checked={showPlot}
          disabled={!enabled}
          onChange={e => onShowPlotChange(e.target.checked)}
          size="small"
          disableRipple
          sx={{ ...checkboxSx, opacity: enabled ? 1 : 0.35 }}
        />
        <span className={`ec2-switch-label ec2-switch-label--readable${enabled && showPlot ? ' ec2-switch-label--active' : ''}`}
          style={{ opacity: enabled ? 1 : 0.35 }}>
          Regen Plot
        </span>
      </div>
    </>
  );
}
