import { Slider, Checkbox, Tooltip } from '@mui/material';
import {
  WALL_TEMP_MIN_K,
  WALL_TEMP_MAX_K,
  WALL_TEMP_STEP_K,
} from './bartzConstants';

interface HeatFluxControlsProps {
  enabled:          boolean;  // true when showFlowSim && flowProperty === 'heatFlux'
  wallTempK:        number;
  onWallTempChange: (v: number) => void;
  showPlot:         boolean;
  onShowPlotChange: (v: boolean) => void;
}

const sliderSx = {
  color: '#00e5ff',
  width: 90,
  '& .MuiSlider-thumb': { width: 10, height: 10, boxShadow: '0 0 4px rgba(0,229,255,0.6)' },
  '& .MuiSlider-track': { border: 'none' },
  '& .MuiSlider-rail':  { opacity: 0.3 },
};

const checkboxSx = {
  color: 'rgba(0,229,255,0.4)',
  '&.Mui-checked': { color: '#00e5ff' },
  padding: '2px',
};

export default function HeatFluxControls({
  enabled, wallTempK, onWallTempChange, showPlot, onShowPlotChange,
}: HeatFluxControlsProps) {
  const disabledClass = !enabled ? ' ec2-overlay-switch--disabled' : '';

  return (
    <>
      <div className={`ec2-overlay-switch${disabledClass}`} style={{ padding: '3px 8px', gap: 6 }}>
        <Tooltip
          title="Assumed temperature of the inner nozzle wall surface. Lower = cooled wall (higher heat load, e.g. regen/film cooling). Higher = uncooled or partially cooled wall. Scales heat flux: q = hg × (T_aw − T_wall)."
          placement="left"
          arrow
        >
          <span className={`ec2-switch-label${enabled ? ' ec2-switch-label--active' : ''}`}>
            T<sub>wall</sub>
          </span>
        </Tooltip>
        <Slider
          value={wallTempK}
          min={WALL_TEMP_MIN_K}
          max={WALL_TEMP_MAX_K}
          step={WALL_TEMP_STEP_K}
          disabled={!enabled}
          size="small"
          sx={{ ...sliderSx, opacity: enabled ? 1 : 0.35 }}
          onChange={(_, v) => onWallTempChange(v as number)}
        />
        <span className={`ec2-angle-val${enabled ? '' : ''}`} style={{ opacity: enabled ? 1 : 0.35, minWidth: 52 }}>
          {wallTempK} K
        </span>
      </div>

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
          Heat Flux Plot
        </span>
      </div>
    </>
  );
}
