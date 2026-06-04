import { IconButton, Tooltip, Select, MenuItem, FormControl, Slider } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { type NozzleType, type AngleOverrides } from '../engineContour/isentropicFlow';
import { interpolateRaoAngles, RAO_LN_DEFAULT, RAO_LN_MIN, RAO_LN_MAX, RAO_LN_STEP } from '../engineContour/raoContour';
import './engineContourRightPanel.css';

interface EngineContourRightPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  nozzleType: NozzleType;
  onNozzleTypeChange: (t: NozzleType) => void;
  angleOverrides: AngleOverrides;
  onAngleOverridesChange: (a: AngleOverrides) => void;
  expansionRatio?: number;
}

const sliderSx = {
  color: '#00e5ff',
  '& .MuiSlider-thumb': { width: 10, height: 10, boxShadow: '0 0 4px rgba(0,229,255,0.6)' },
  '& .MuiSlider-track': { border: 'none' },
  '& .MuiSlider-rail': { opacity: 0.3 },
};

export default function EngineContourRightPanel({
  collapsed, onToggle,
  nozzleType, onNozzleTypeChange, angleOverrides, onAngleOverridesChange, expansionRatio = 8,
}: EngineContourRightPanelProps) {
  const convVal      = angleOverrides.convergentHalfDeg ?? 30;
  const divVal       = angleOverrides.divergentRefDeg   ?? 15;
  const tNVal        = angleOverrides.tNDeg             ?? 25;
  const defaultTEDeg = +Math.max(7, 15 - (expansionRatio - 1) * 0.3).toFixed(1);
  const tEVal        = angleOverrides.tEDeg             ?? defaultTEDeg;
  const lnFrac       = angleOverrides.lnFraction        ?? RAO_LN_DEFAULT;

  const { tN: raoTN, tE: raoTE } = interpolateRaoAngles(expansionRatio, lnFrac);

  return (
    <aside className={`right-panel ${collapsed ? 'right-panel--collapsed' : ''}`}>
      <div className="right-panel-toggle">
        <Tooltip title={collapsed ? 'Expand panel' : 'Collapse panel'} placement="left">
          <IconButton onClick={onToggle} size="small" sx={{ color: 'rgba(0,229,255,0.6)' }}>
            {collapsed ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </div>

      {!collapsed && (
        <div className="right-panel-content">
          <div className="panel-form">

            <div className="form-group">
              <span className="form-label">Nozzle Type</span>
              <FormControl fullWidth size="small">
                <Select
                  className="read-select"
                  value={nozzleType}
                  onChange={(e) => onNozzleTypeChange(e.target.value as NozzleType)}
                >
                  <MenuItem value="conical">Conical</MenuItem>
                  <MenuItem value="bell">Bell (Bézier)</MenuItem>
                  <MenuItem value="rao">Rao Optimal</MenuItem>
                </Select>
              </FormControl>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span className="form-label">Contour Angles</span>
              <button className="rp-reset-btn" onClick={() => onAngleOverridesChange({})}>Reset</button>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="form-label">θconv</span>
                <span className="unit-badge">{convVal}°</span>
              </div>
              <Slider
                value={convVal}
                min={20} max={50} step={1}
                size="small"
                sx={sliderSx}
                onChange={(_, v) => onAngleOverridesChange({ ...angleOverrides, convergentHalfDeg: v as number })}
              />
            </div>

            {nozzleType === 'bell' && (
              <>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="form-label">θn</span>
                    <span className="unit-badge">{tNVal}°</span>
                  </div>
                  <Slider
                    value={tNVal}
                    min={20} max={35} step={1}
                    size="small"
                    sx={sliderSx}
                    onChange={(_, v) => onAngleOverridesChange({ ...angleOverrides, tNDeg: v as number })}
                  />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="form-label">θe</span>
                    <span className="unit-badge">{tEVal}°</span>
                  </div>
                  <Slider
                    value={tEVal}
                    min={0} max={30} step={0.5}
                    size="small"
                    sx={sliderSx}
                    onChange={(_, v) => onAngleOverridesChange({ ...angleOverrides, tEDeg: v as number })}
                  />
                </div>
              </>
            )}

            {nozzleType === 'conical' && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="form-label">θdiv</span>
                  <span className="unit-badge">{divVal}°</span>
                </div>
                <Slider
                  value={divVal}
                  min={10} max={25} step={1}
                  size="small"
                  sx={sliderSx}
                  onChange={(_, v) => onAngleOverridesChange({ ...angleOverrides, divergentRefDeg: v as number })}
                />
              </div>
            )}

            {nozzleType === 'rao' && (
              <>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="form-label">Ln/Lref</span>
                    <span className="unit-badge">{lnFrac.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={lnFrac}
                    min={RAO_LN_MIN} max={RAO_LN_MAX} step={RAO_LN_STEP}
                    size="small"
                    sx={sliderSx}
                    onChange={(_, v) => onAngleOverridesChange({ ...angleOverrides, lnFraction: v as number })}
                  />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="form-label">θn</span>
                    <span className="unit-badge">{raoTN.toFixed(1)}°</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(0,229,255,0.45)', fontFamily: "'Courier New', monospace" }}>(auto)</span>
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="form-label">θe</span>
                    <span className="unit-badge">{raoTE.toFixed(1)}°</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(0,229,255,0.45)', fontFamily: "'Courier New', monospace" }}>(auto)</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
