import { useState, useEffect } from 'react';
import {
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { propellantService, type Propellant } from '../../services/propellantService';
import { engineDesignService, type EngineDesignResult, type EngineFormInputs } from '../../services/engineDesignService';
import './leftPanel.css';

interface LeftPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  isLoading: boolean;
  onDesignStart: () => void;
  onDesignResult: (result: EngineDesignResult) => void;
  onDesignError: () => void;
  onEngineMetaChange: (name: string, version: string) => void;
  onAmbientPressureChange?: (value: number) => void;
  onFormChange?: (form: EngineFormInputs) => void;
  importData?: EngineFormInputs | null;
  lStarM?: number;
  contractionRatio?: number;
  onLStarChange: (v: number | undefined) => void;
  onContractionRatioChange: (v: number) => void;
  onNavigateToCombustion: () => void;
}

export default function LeftPanel({
  collapsed, onToggle,
  isLoading, onDesignStart, onDesignResult, onDesignError,
  onEngineMetaChange, onFormChange,
  importData,
  lStarM, contractionRatio = 8.0,
  onLStarChange, onContractionRatioChange, onNavigateToCombustion,
}: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<'thrust' | 'payload'>('thrust');
  const [fuels, setFuels] = useState<Propellant[]>([]);
  const [oxidizers, setOxidizers] = useState<Propellant[]>([]);
  const [lastResult, setLastResult] = useState<EngineDesignResult | null>(null);

  // Section open/close state
  const [generalOpen, setGeneralOpen]       = useState(true);
  const [propellantsOpen, setPropellantsOpen] = useState(true);
  const [mixtureOpen, setMixtureOpen]       = useState(true);
  const [engineParamsOpen, setEngineParamsOpen] = useState(true);
  const [chamberOpen, setChamberOpen]       = useState(true);

  useEffect(() => {
    propellantService.getPropellants().then(({ fuels, oxidizers }) => {
      setFuels(fuels);
      setOxidizers(oxidizers);
      setForm((prev) => ({
        ...prev,
        fuel: fuels[0]?.code ?? '',
        oxidizer: oxidizers[0]?.code ?? '',
      }));
    });
  }, []);

  const [form, setForm] = useState<EngineFormInputs>({
    engineName: 'Engine1',
    engineVersion: '0.1',
    fuel: '',
    oxidizer: '',
    minMixtureRatio: '3.5',
    maxMixtureRatio: '5.5',
    targetThrust: '1',
    chamberPressure: '10.0',
    performanceMode: 'sea_level',
  });

  useEffect(() => {
    if (!form.fuel || !form.oxidizer) return;

    const thrust = parseFloat(form.targetThrust);
    const pc = parseFloat(form.chamberPressure);
    const mrMin = parseFloat(form.minMixtureRatio);
    const mrMax = parseFloat(form.maxMixtureRatio);

    if (isNaN(thrust) || isNaN(pc) || isNaN(mrMin) || isNaN(mrMax)) return;

    const timer = setTimeout(async () => {
      onDesignStart();
      try {
        const result = await engineDesignService.getEngineDesign({
          ox_code: form.oxidizer,
          fuel_code: form.fuel,
          target_thrust_N: thrust * 1000,
          pc_bar: pc,
          performance_mode: form.performanceMode,
          mr_min: mrMin,
          mr_max: mrMax,
          l_star_m: lStarM,
          contraction_ratio: contractionRatio,
        });
        setLastResult(result);
        onDesignResult(result);
      } catch {
        onDesignError();
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [form.fuel, form.oxidizer, form.targetThrust, form.chamberPressure, form.performanceMode, form.minMixtureRatio, form.maxMixtureRatio, lStarM, contractionRatio, onDesignStart, onDesignResult, onDesignError]);

  useEffect(() => {
    onEngineMetaChange(form.engineName, form.engineVersion);
  }, [form.engineName, form.engineVersion, onEngineMetaChange]);

  useEffect(() => {
    onFormChange?.(form);
  }, [form, onFormChange]);

  useEffect(() => {
    if (!importData) return;
    setForm(importData);
  }, [importData]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const opt = lastResult?.engineOutputs.mixtureRatio.optimum ?? null;
  const lStarRange = opt ? { min: opt.lStarRange.min, max: opt.lStarRange.max } : null;
  const cylindricalLengthMm = opt?.cylindricalLength.value ?? null;
  const lStarFloorActive = opt?.lStarFloorActive ?? false;

  return (
    <aside className={`left-panel ${collapsed ? 'left-panel--collapsed' : ''}`}>
      <div className="left-panel-toggle">
        <Tooltip title={collapsed ? 'Expand panel' : 'Collapse panel'} placement="right">
          <IconButton onClick={onToggle} size="small" sx={{ color: 'rgba(0,229,255,0.6)' }}>
            {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </div>

      {!collapsed && (
        <div className="left-panel-content">
          {/* Tab switcher */}
          <div className="panel-tabs">
            <button
              className={`panel-tab ${activeTab === 'thrust' ? 'panel-tab--active' : ''}`}
              onClick={() => setActiveTab('thrust')}
            >
              ENGINE SETTINGS
            </button>
          </div>

          {activeTab === 'thrust' && (
            <div className="panel-form">

              {/* General */}
              <div className="form-section-header" onClick={() => setGeneralOpen(v => !v)}>
                <span>General</span>
                <span className="form-section-chevron">{generalOpen ? '▾' : '▸'}</span>
              </div>
              {generalOpen && (
                <>
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <TextField
                      value={form.engineName}
                      onChange={handleChange('engineName')}
                      variant="outlined"
                      size="small"
                      fullWidth
                      disabled={isLoading}
                      className="read-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Version</label>
                    <TextField
                      value={form.engineVersion}
                      onChange={handleChange('engineVersion')}
                      variant="outlined"
                      size="small"
                      fullWidth
                      disabled={isLoading}
                      className="read-input"
                    />
                  </div>
                </>
              )}

              {/* Propellants */}
              <div className="form-section-header" onClick={() => setPropellantsOpen(v => !v)}>
                <span>Propellants</span>
                <span className="form-section-chevron">{propellantsOpen ? '▾' : '▸'}</span>
              </div>
              {propellantsOpen && (
                <>
                  <div className="form-group">
                    <label className="form-label">Fuel</label>
                    <FormControl fullWidth size="small">
                      <Select
                        value={form.fuel}
                        onChange={(e) => setForm((p) => ({ ...p, fuel: e.target.value }))}
                        disabled={isLoading}
                        className="read-select"
                      >
                        {fuels.map((f) => (
                          <MenuItem key={f.code} value={f.code} className="read-menu-item">{f.name} | {f.code}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Oxidizer</label>
                    <FormControl fullWidth size="small">
                      <Select
                        value={form.oxidizer}
                        onChange={(e) => setForm((p) => ({ ...p, oxidizer: e.target.value }))}
                        disabled={isLoading}
                        className="read-select"
                      >
                        {oxidizers.map((o) => (
                          <MenuItem key={o.code} value={o.code} className="read-menu-item">{o.name} | {o.code}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </div>
                </>
              )}

              {/* Mixture Ratio Range */}
              <div className="form-section-header" onClick={() => setMixtureOpen(v => !v)}>
                <span>Mixture Ratio Range</span>
                <span className="form-section-chevron">{mixtureOpen ? '▾' : '▸'}</span>
              </div>
              {mixtureOpen && (
                <>
                  <div className="form-group">
                    <label className="form-label">Min</label>
                    <div className="input-with-unit">
                      <TextField
                        value={form.minMixtureRatio}
                        onChange={handleChange('minMixtureRatio')}
                        variant="outlined"
                        size="small"
                        type="number"
                        disabled={isLoading}
                        className="read-input"
                        sx={{ flex: 1 }}
                        slotProps={{ input: { inputProps: { step: 0.5, min: 0.5 } } }}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max</label>
                    <div className="input-with-unit">
                      <TextField
                        value={form.maxMixtureRatio}
                        onChange={handleChange('maxMixtureRatio')}
                        variant="outlined"
                        size="small"
                        type="number"
                        disabled={isLoading}
                        className="read-input"
                        sx={{ flex: 1 }}
                        slotProps={{ input: { inputProps: { step: 0.5, min: 0.5 } } }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Engine Parameters */}
              <div className="form-section-header" onClick={() => setEngineParamsOpen(v => !v)}>
                <span>Engine Parameters</span>
                <span className="form-section-chevron">{engineParamsOpen ? '▾' : '▸'}</span>
              </div>
              {engineParamsOpen && (
                <>
                  <div className="form-group">
                    <label className="form-label">Target Engine Thrust</label>
                    <div className="input-with-unit">
                      <TextField
                        value={form.targetThrust}
                        onChange={handleChange('targetThrust')}
                        variant="outlined"
                        size="small"
                        type="number"
                        disabled={isLoading}
                        className="read-input"
                        sx={{ flex: 1 }}
                        slotProps={{ input: { inputProps: { step: 0.5, min: 0.5 } } }}
                      />
                      <span className="unit-badge">kN</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Chamber Pressure</label>
                    <div className="input-with-unit">
                      <TextField
                        value={form.chamberPressure}
                        onChange={handleChange('chamberPressure')}
                        variant="outlined"
                        size="small"
                        type="number"
                        disabled={isLoading}
                        className="read-input"
                        sx={{ flex: 1 }}
                      />
                      <span className="unit-badge">bar</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Performance Mode</label>
                    <ToggleButtonGroup
                      value={form.performanceMode}
                      exclusive
                      onChange={(_, val) => val && setForm((p) => ({ ...p, performanceMode: val }))}
                      size="small"
                      disabled={isLoading}
                      fullWidth
                    >
                      <ToggleButton value="sea_level" sx={{ flex: 1, fontSize: '0.7rem' }}>Sea Level</ToggleButton>
                      <ToggleButton value="vacuum" sx={{ flex: 1, fontSize: '0.7rem' }}>Vacuum</ToggleButton>
                    </ToggleButtonGroup>
                  </div>
                </>
              )}

              {/* Chamber Design */}
              <div className="form-section-header" onClick={() => setChamberOpen(v => !v)}>
                <span>Chamber Design</span>
                <span className="form-section-chevron">{chamberOpen ? '▾' : '▸'}</span>
              </div>
              {chamberOpen && (
                <>
                  {/* L* */}
                  <div className="form-group">
                    <div className="lp-label-row">
                      <label className="form-label">Characteristic Length (L*)</label>
                      <Tooltip
                        title="Sets the total chamber volume relative to throat area (V_chamber / A_throat). A larger L* gives propellants more residence time before the throat, at the cost of a longer, heavier chamber. Does not affect CEA-computed Isp or Tc — only chamber geometry."
                        placement="right"
                      >
                        <InfoOutlinedIcon sx={{ fontSize: 13, color: 'rgba(0,229,255,0.5)', cursor: 'help' }} />
                      </Tooltip>
                    </div>
                    <div className="input-with-unit">
                      <TextField
                        type="number"
                        size="small"
                        slotProps={{ input: { inputProps: { step: 0.05, min: 0, max: 2.5 } } }}
                        value={lStarM ?? ''}
                        placeholder={lStarRange ? String(((lStarRange.min + lStarRange.max) / 2).toFixed(2)) : '—'}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          onLStarChange(isNaN(v) ? undefined : v);
                        }}
                        sx={{
                          flex: 1,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: (lStarM !== undefined && lStarRange && (lStarM < lStarRange.min || lStarM > lStarRange.max))
                              ? '#f44336'
                              : 'rgba(0,229,255,0.25)',
                          },
                          '& input': { fontFamily: "'Courier New', monospace", fontSize: '12px' },
                        }}
                        className="read-input"
                      />
                      <span className="unit-badge">m</span>
                    </div>
                    {lStarRange && (
                      <div className="lp-lstar-range">
                        Recommended: {lStarRange.min} – {lStarRange.max} m
                      </div>
                    )}
                    {lStarM !== undefined && lStarRange && (lStarM < lStarRange.min || lStarM > lStarRange.max) && (
                      <div className="lp-lstar-warning">
                        Outside recommended range — see{' '}
                        <button className="lp-tab-link" onClick={onNavigateToCombustion}>
                          COMBUSTION tab
                        </button>{' '}
                        for analysis
                      </div>
                    )}
                    <button
                      className="lp-reset-btn"
                      style={{ marginTop: 4 }}
                      onClick={() => onLStarChange(undefined)}
                    >
                      Use default
                    </button>
                  </div>

                  {/* Contraction Ratio */}
                  <div className="form-group">
                    <div className="lp-label-row">
                      <label className="form-label">Contraction Ratio (CR)</label>
                      <Tooltip
                        title="Ratio of chamber area to throat area (Ac/At). Sets how much wider the chamber is than the throat. Combined with L*, this fully determines chamber geometry."
                        placement="right"
                      >
                        <InfoOutlinedIcon sx={{ fontSize: 13, color: 'rgba(0,229,255,0.5)', cursor: 'help' }} />
                      </Tooltip>
                    </div>
                    <div className="input-with-unit">
                      <TextField
                        type="number"
                        size="small"
                        slotProps={{ input: { inputProps: { step: 0.25, min: 2, max: 12 } } }}
                        value={contractionRatio}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v) && v >= 2 && v <= 12) onContractionRatioChange(v);
                        }}
                        sx={{
                          flex: 1,
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,229,255,0.25)' },
                          '& input': { fontFamily: "'Courier New', monospace", fontSize: '12px' },
                        }}
                        className="read-input"
                      />
                      <span className="unit-badge">—</span>
                    </div>
                    <div className="lp-derived">
                      → Lc_cyl = {cylindricalLengthMm !== null ? cylindricalLengthMm.toFixed(1) + ' mm' : '—'}
                    </div>
                    {lStarFloorActive && (
                      <div className="lp-lstar-warning">
                        L* below minimum floor (3 × throat diameter) — increase L* or contraction ratio for it to take effect
                      </div>
                    )}
                  </div>
                </>
              )}

            </div>
          )}
        </div>
      )}
    </aside>
  );
}
