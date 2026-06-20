import {
  IconButton,
  Tooltip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { MATERIALS, type TankSizing } from './materials';
import '../engineContourRightPanel/engineContourRightPanel.css';
import './plumbing.css';

export type PressurantGasKey = 'N2' | 'He';
export type TankShape = 'sphere' | 'cylinder';

interface TankResult extends TankSizing {
  pressureBar: number;
}

export interface PlumbingResults {
  tankPressureBar: number;
  regulatorSetpointBar: number;
  pressurantValid: boolean;
  ox: TankResult;
  fuel: TankResult;
  pressurant: TankResult;
  pressurantGasMassG: number;
}

interface PlumbingRightPanelProps {
  collapsed: boolean;
  onToggle: () => void;

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
  injectorDropFromDesign: boolean;
  lineLossBar: number;
  onLineLossBarChange: (v: number) => void;
  ullageMarginBar: number;
  onUllageMarginBarChange: (v: number) => void;
  pressurantTankBar: number;
  onPressurantTankBarChange: (v: number) => void;
  burnTimeSec: number;
  onBurnTimeSecChange: (v: number) => void;

  results: PlumbingResults;
}

const numberFieldSx = { flex: 1 };

const sliderSx = {
  color: '#00e5ff',
  '& .MuiSlider-thumb': { width: 10, height: 10, boxShadow: '0 0 4px rgba(0,229,255,0.6)' },
  '& .MuiSlider-track': { border: 'none' },
  '& .MuiSlider-rail': { opacity: 0.3 },
};

export default function PlumbingRightPanel({
  collapsed, onToggle,
  gas, onGasChange,
  tankShape, onTankShapeChange,
  aspectRatio, onAspectRatioChange,
  oxMaterial, onOxMaterialChange,
  fuelMaterial, onFuelMaterialChange,
  pressurantMaterial, onPressurantMaterialChange,
  injectorDropPct, onInjectorDropPctChange, injectorDropFromDesign,
  lineLossBar, onLineLossBarChange,
  ullageMarginBar, onUllageMarginBarChange,
  pressurantTankBar, onPressurantTankBarChange,
  burnTimeSec, onBurnTimeSecChange,
  results,
}: PlumbingRightPanelProps) {
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

            {/* Pressurant Gas */}
            <div className="form-group">
              <span className="form-label">Pressurant Gas</span>
              <ToggleButtonGroup
                value={gas}
                exclusive
                onChange={(_, v) => v && onGasChange(v)}
                size="small"
                fullWidth
              >
                <ToggleButton value="N2" sx={{ flex: 1, fontSize: '0.7rem' }}>Nitrogen (N₂)</ToggleButton>
                <ToggleButton value="He" sx={{ flex: 1, fontSize: '0.7rem' }}>Helium (He)</ToggleButton>
              </ToggleButtonGroup>
            </div>

            {/* Tank Shape */}
            <div className="form-group">
              <span className="form-label">Tank Shape</span>
              <ToggleButtonGroup
                value={tankShape}
                exclusive
                onChange={(_, v) => v && onTankShapeChange(v)}
                size="small"
                fullWidth
              >
                <ToggleButton value="sphere" sx={{ flex: 1, fontSize: '0.7rem' }}>Sphere</ToggleButton>
                <ToggleButton value="cylinder" sx={{ flex: 1, fontSize: '0.7rem' }}>Cylinder</ToggleButton>
              </ToggleButtonGroup>
            </div>

            {tankShape === 'cylinder' && (
              <div className="form-group">
                <label className="form-label">Aspect Ratio (L/D)</label>
                <div className="input-with-unit">
                  <TextField
                    value={aspectRatio}
                    onChange={(e) => onAspectRatioChange(Number(e.target.value))}
                    variant="outlined"
                    size="small"
                    type="number"
                    className="read-input"
                    sx={numberFieldSx}
                    slotProps={{ input: { inputProps: { step: 0.5, min: 0.5 } } }}
                  />
                </div>
              </div>
            )}

            {/* Tank Materials */}
            <div className="form-group">
              <label className="form-label">Oxidizer Tank Material</label>
              <FormControl fullWidth size="small">
                <Select className="read-select" value={oxMaterial} onChange={(e) => onOxMaterialChange(e.target.value)}>
                  {Object.entries(MATERIALS).map(([key, m]) => (
                    <MenuItem key={key} value={key}>{m.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="form-group">
              <label className="form-label">Fuel Tank Material</label>
              <FormControl fullWidth size="small">
                <Select className="read-select" value={fuelMaterial} onChange={(e) => onFuelMaterialChange(e.target.value)}>
                  {Object.entries(MATERIALS).map(([key, m]) => (
                    <MenuItem key={key} value={key}>{m.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="form-group">
              <label className="form-label">Pressurant Tank Material</label>
              <FormControl fullWidth size="small">
                <Select className="read-select" value={pressurantMaterial} onChange={(e) => onPressurantMaterialChange(e.target.value)}>
                  {Object.entries(MATERIALS).map(([key, m]) => (
                    <MenuItem key={key} value={key}>{m.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            {/* Pressure Assumptions */}
            <div className="form-section-header">
              <span>Pressure Assumptions</span>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <label className="form-label">Injector ΔP</label>
                <Tooltip title="Pressure drop across the injector as a percentage of chamber pressure. Defaults to the value from the selected Injector Face design." placement="left" arrow>
                  <InfoOutlinedIcon sx={{ fontSize: 13, color: 'rgba(0,229,255,0.5)', cursor: 'help' }} />
                </Tooltip>
              </div>
              <div className="input-with-unit">
                <TextField
                  value={injectorDropPct}
                  onChange={(e) => onInjectorDropPctChange(Number(e.target.value))}
                  variant="outlined"
                  size="small"
                  type="number"
                  className="read-input"
                  sx={numberFieldSx}
                  slotProps={{ input: { inputProps: { step: 1, min: 0 } } }}
                />
                <span className="unit-badge">%</span>
              </div>
              {injectorDropFromDesign ? (
                <span className="plumb-hint-text">From selected Injector Face design.</span>
              ) : (
                <span className="plumb-hint-text">No injector design selected — using default 20%. Visit Injector Face tab to size the injector.</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Line Loss Margin</label>
              <div className="input-with-unit">
                <TextField
                  value={lineLossBar}
                  onChange={(e) => onLineLossBarChange(Number(e.target.value))}
                  variant="outlined"
                  size="small"
                  type="number"
                  className="read-input"
                  sx={numberFieldSx}
                  slotProps={{ input: { inputProps: { step: 0.5, min: 0 } } }}
                />
                <span className="unit-badge">bar</span>
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <label className="form-label">Ullage Margin</label>
                <Tooltip title="Extra pressure the regulator targets above the minimum tank pressure, to ensure adequate flow as propellant drains and tank ullage (gas) volume grows during the burn." placement="left" arrow>
                  <InfoOutlinedIcon sx={{ fontSize: 13, color: 'rgba(0,229,255,0.5)', cursor: 'help' }} />
                </Tooltip>
              </div>
              <div className="input-with-unit">
                <TextField
                  value={ullageMarginBar}
                  onChange={(e) => onUllageMarginBarChange(Number(e.target.value))}
                  variant="outlined"
                  size="small"
                  type="number"
                  className="read-input"
                  sx={numberFieldSx}
                  slotProps={{ input: { inputProps: { step: 0.5, min: 0 } } }}
                />
                <span className="unit-badge">bar</span>
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <label className="form-label">Pressurant Tank Pressure</label>
                <Tooltip title="The regulator steps this down to the propellant tank pressure — pressurant pressure does not directly affect ox/fuel tank pressure, but must stay above the regulator setpoint shown below. ~200-300 bar is a typical COPV storage pressure: higher storage pressure means a smaller, lighter pressurant tank for a given gas mass, but the tank must stay above the regulator setpoint for the entire burn as it depletes." placement="left" arrow>
                  <InfoOutlinedIcon sx={{ fontSize: 13, color: 'rgba(0,229,255,0.5)', cursor: 'help' }} />
                </Tooltip>
              </div>
              <div className="input-with-unit">
                <TextField
                  value={pressurantTankBar}
                  onChange={(e) => onPressurantTankBarChange(Number(e.target.value))}
                  variant="outlined"
                  size="small"
                  type="number"
                  className="read-input"
                  sx={numberFieldSx}
                  slotProps={{ input: { inputProps: { step: 5, min: 0 } } }}
                />
                <span className="unit-badge">bar</span>
              </div>
              {!results.pressurantValid && (
                <span className="plumb-warning-text">
                  Pressurant tank pressure must exceed the regulator setpoint ({results.regulatorSetpointBar.toFixed(1)} bar).
                </span>
              )}
            </div>

            {/* Propellant Load */}
            <div className="form-section-header">
              <span>Propellant Load</span>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="form-label">Burn Time</label>
                <span className="unit-badge">{burnTimeSec} s</span>
              </div>
              <Slider
                value={burnTimeSec}
                onChange={(_, v) => onBurnTimeSecChange(v as number)}
                min={1}
                max={60}
                step={1}
                size="small"
                sx={sliderSx}
              />
              <span className="plumb-hint-text">Longer burn time → more propellant → larger tanks → thicker/heavier walls.</span>
            </div>

          </div>
        </div>
      )}
    </aside>
  );
}
