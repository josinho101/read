import { Slider, Checkbox, Tooltip, Select, MenuItem, FormControl } from '@mui/material';
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

  return (
    <>
      {/* Fuel suitability badge */}
      <div className={`ec2-overlay-switch${disabledClass}`}>
        <FuelBadge fuelCode={fuelCode} />
      </div>

      {/* numChannels */}
      <div className={`form-group${!enabled ? ' rp-sim-disabled' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Tooltip title="Number of coolant channels machined around the nozzle circumference" placement="left" arrow>
            <span className="form-label">N<sub>ch</sub></span>
          </Tooltip>
          <span className="unit-badge">{params.numChannels}</span>
        </div>
        <Slider value={params.numChannels} min={20} max={300} step={5} disabled={!enabled}
          size="small" sx={sliderSx}
          onChange={(_, v) => set({ numChannels: v as number })} />
      </div>

      {/* channelWidthMm */}
      <div className={`form-group${!enabled ? ' rp-sim-disabled' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Tooltip title="Coolant channel width (mm)" placement="left" arrow>
            <span className="form-label">w<sub>ch</sub></span>
          </Tooltip>
          <span className="unit-badge">{params.channelWidthMm.toFixed(1)} mm</span>
        </div>
        <Slider value={params.channelWidthMm} min={0.5} max={5.0} step={0.1} disabled={!enabled}
          size="small" sx={sliderSx}
          onChange={(_, v) => set({ channelWidthMm: v as number })} />
      </div>

      {/* channelHeightMm */}
      <div className={`form-group${!enabled ? ' rp-sim-disabled' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Tooltip title="Coolant channel height / depth (mm)" placement="left" arrow>
            <span className="form-label">h<sub>ch</sub></span>
          </Tooltip>
          <span className="unit-badge">{params.channelHeightMm.toFixed(1)} mm</span>
        </div>
        <Slider value={params.channelHeightMm} min={0.5} max={5.0} step={0.1} disabled={!enabled}
          size="small" sx={sliderSx}
          onChange={(_, v) => set({ channelHeightMm: v as number })} />
      </div>

      {/* wallThicknessMm */}
      <div className={`form-group${!enabled ? ' rp-sim-disabled' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Tooltip title="Hot-side wall thickness between the gas and coolant channel (mm)" placement="left" arrow>
            <span className="form-label">t<sub>wall</sub></span>
          </Tooltip>
          <span className="unit-badge">{params.wallThicknessMm.toFixed(1)} mm</span>
        </div>
        <Slider value={params.wallThicknessMm} min={0.2} max={3.0} step={0.1} disabled={!enabled}
          size="small" sx={sliderSx}
          onChange={(_, v) => set({ wallThicknessMm: v as number })} />
      </div>

      {/* wallMaterial */}
      <div className={`form-group${!enabled ? ' rp-sim-disabled' : ''}`}>
        <span className="form-label">Material</span>
        <FormControl fullWidth size="small">
          <Select
            className="read-select"
            value={params.wallMaterial}
            disabled={!enabled}
            onChange={e => set({ wallMaterial: e.target.value as WallMaterial })}
          >
            <MenuItem value="copper">Copper</MenuItem>
            <MenuItem value="steel">Steel 304</MenuItem>
            <MenuItem value="inconel">Inconel 718</MenuItem>
          </Select>
        </FormControl>
      </div>

      {/* coolantInletTempK */}
      <div className={`form-group${!enabled ? ' rp-sim-disabled' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Tooltip title="Coolant temperature at the inlet (nozzle exit end). Typically near the propellant tank temperature." placement="left" arrow>
            <span className="form-label">T<sub>in</sub></span>
          </Tooltip>
          <span className="unit-badge">{params.coolantInletTempK} K</span>
        </div>
        <Slider value={params.coolantInletTempK} min={50} max={500} step={10} disabled={!enabled}
          size="small" sx={sliderSx}
          onChange={(_, v) => set({ coolantInletTempK: v as number })} />
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
