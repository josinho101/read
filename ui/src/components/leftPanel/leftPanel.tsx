import { useState, useEffect } from 'react';
import {
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Tooltip,
  Collapse,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { propellantService, type Propellant } from '../../services/propellantService';
import { engineDesignService, type EngineDesignResult, type EngineFormInputs } from '../../services/engineDesignService';
import './leftPanel.css';

interface LeftPanelProps {
  isLoading: boolean;
  onDesignStart: () => void;
  onDesignResult: (result: EngineDesignResult) => void;
  onDesignError: () => void;
  onEngineMetaChange: (name: string, version: string) => void;
  onAmbientPressureChange?: (value: number) => void;
  onFormChange?: (form: EngineFormInputs) => void;
  importData?: EngineFormInputs | null;
}

export default function LeftPanel({ isLoading, onDesignStart, onDesignResult, onDesignError, onEngineMetaChange, onAmbientPressureChange, onFormChange, importData }: LeftPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'thrust' | 'payload'>('thrust');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [fuels, setFuels] = useState<Propellant[]>([]);
  const [oxidizers, setOxidizers] = useState<Propellant[]>([]);

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

  const [form, setForm] = useState({
    engineName: 'Engine1',
    engineVersion: '0.1',
    fuel: '',
    oxidizer: '',
    minMixtureRatio: '3.5',
    maxMixtureRatio: '5.5',
    targetThrust: '1',
    chamberPressure: '10.0',
    exitPressure: '1.013',
    altitude: '0',
    ambientPressure: '1.013',
  });

  useEffect(() => {
    if (!form.fuel || !form.oxidizer) return;

    const thrust = parseFloat(form.targetThrust);
    const pc = parseFloat(form.chamberPressure);
    const pe = parseFloat(form.exitPressure);
    const mrMin = parseFloat(form.minMixtureRatio);
    const mrMax = parseFloat(form.maxMixtureRatio);

    if (isNaN(thrust) || isNaN(pc) || isNaN(pe) || isNaN(mrMin) || isNaN(mrMax)) return;

    const timer = setTimeout(async () => {
      onDesignStart();
      try {
        const result = await engineDesignService.getEngineDesign({
          ox_code: form.oxidizer,
          fuel_code: form.fuel,
          target_thrust_N: thrust * 1000,
          pc_bar: pc,
          pe_bar: pe,
          mr_min: mrMin,
          mr_max: mrMax,
        });
        onDesignResult(result);
      } catch {
        onDesignError();
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [form.fuel, form.oxidizer, form.targetThrust, form.chamberPressure, form.exitPressure, form.minMixtureRatio, form.maxMixtureRatio, onDesignStart, onDesignResult, onDesignError]);

  useEffect(() => {
    onEngineMetaChange(form.engineName, form.engineVersion);
  }, [form.engineName, form.engineVersion, onEngineMetaChange]);

  useEffect(() => {
    if (!onAmbientPressureChange) return;
    const v = parseFloat(form.ambientPressure);
    if (!isNaN(v) && v > 0) onAmbientPressureChange(v);
  }, [form.ambientPressure, onAmbientPressureChange]);

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

  return (
    <aside className={`left-panel ${collapsed ? 'left-panel--collapsed' : ''}`}>
      <div className="left-panel-toggle">
        <Tooltip title={collapsed ? 'Expand panel' : 'Collapse panel'} placement="right">
          <IconButton onClick={() => setCollapsed(!collapsed)} className="toggle-btn" size="small">
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
              <div className="form-section-header">General</div>
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

              <div className="form-section-header">Propellents</div>
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

              <div className="form-section-header">Mixture Ratio Range</div>
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
                  />
                </div>
              </div>

              <div className="form-section-header">Engine Parameters</div>
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
                <label className="form-label">Exit Pressure</label>
                <div className="input-with-unit">
                  <TextField
                    value={form.exitPressure}
                    onChange={handleChange('exitPressure')}
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
                <label className="form-label">Ambient Pressure</label>
                <div className="input-with-unit">
                  <TextField
                    value={form.ambientPressure}
                    onChange={handleChange('ambientPressure')}
                    variant="outlined"
                    size="small"
                    type="number"
                    disabled={isLoading}
                    className="read-input"
                    sx={{ flex: 1 }}
                    inputProps={{ step: '0.01', min: '0.01' }}
                  />
                  <span className="unit-badge">bar</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
