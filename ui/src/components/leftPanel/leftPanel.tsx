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
import './leftPanel.css';

export default function LeftPanel() {
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
    ambientPressure: '101.32',
  });

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
              DESIGN SETTINGS
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
                    className="read-input"
                    sx={{ flex: 1 }}
                  />
                  <span className="unit-badge">bar</span>
                </div>
              </div>

              {/* Advanced Sizing Inputs */}
              <button className="advanced-toggle" onClick={() => setAdvancedOpen(!advancedOpen)}>
                {advancedOpen ? (
                  <KeyboardArrowDownIcon fontSize="small" />
                ) : (
                  <KeyboardArrowRightIcon fontSize="small" />
                )}
                Advanced Sizing Inputs
              </button>

              <Collapse in={advancedOpen}>
                <div className="advanced-content">
                  <div className="form-group">
                    <label className="form-label">CHAMBER PRESSURE</label>
                    <div className="input-with-unit">
                      <TextField
                        defaultValue="3.45"
                        variant="outlined"
                        size="small"
                        type="number"
                        className="read-input"
                        sx={{ flex: 1 }}
                      />
                      <span className="unit-badge">MPa</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">EXPANSION RATIO</label>
                    <TextField
                      defaultValue="8.63"
                      variant="outlined"
                      size="small"
                      type="number"
                      fullWidth
                      className="read-input"
                    />
                  </div>
                </div>
              </Collapse>
            </div>
          )}

          {activeTab === 'payload' && (
            <div className="panel-form">
              <div className="form-group">
                <label className="form-label">PAYLOAD MASS</label>
                <div className="input-with-unit">
                  <TextField
                    defaultValue="1000"
                    variant="outlined"
                    size="small"
                    type="number"
                    className="read-input"
                    sx={{ flex: 1 }}
                  />
                  <span className="unit-badge">kg</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">TARGET ORBIT ALTITUDE</label>
                <div className="input-with-unit">
                  <TextField
                    defaultValue="400"
                    variant="outlined"
                    size="small"
                    type="number"
                    className="read-input"
                    sx={{ flex: 1 }}
                  />
                  <span className="unit-badge">km</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
