import { useState, useEffect, useCallback } from 'react';
import { IconButton, Tooltip, Select, MenuItem, FormControl, Slider } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { type EngineDesignResult } from '../../services/engineDesignService';
import {
  injectorSweepService,
  type InjectorType,
  type InjectorSweepRow,
  type InjectorSweepResult,
} from '../../services/injectorSweepService';
import './InjectorRightPanel.css';

interface InjectorRightPanelProps {
  engineDesignResult: EngineDesignResult | null;
  injectorType: InjectorType;
  onInjectorTypeChange: (t: InjectorType) => void;
  dOxMm: number;
  onDOxChange: (v: number) => void;
  dFuelMm: number;
  onDFuelChange: (v: number) => void;
  impingementHalfAngleDeg: number;
  onImpingementAngleChange: (v: number) => void;
  selectedRow: InjectorSweepRow | null;
  onRowSelect: (row: InjectorSweepRow) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const INJECTOR_LABELS: Record<InjectorType, string> = {
  impinging:     'Impinging Doublet',
  impinging_fof: 'Impinging Triplet (FOF)',
  impinging_ofo: 'Impinging Triplet (OFO)',
  pintle:        'Pintle',
  coaxial:       'Coaxial',
  showerhead:    'Showerhead',
};

const OX_FUEL_DIA_MIN = 0.25;
const OX_FUEL_DIA_MAX = 5.0;
const OX_FUEL_DIA_STEP = 0.25;
const HALF_ANGLES_DEG  = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];

const SWEEP_INFO =
  'Each row is a valid injector at a different pressure drop (ΔP).\n' +
  'Higher ΔP% → better combustion stability, more pressure loss, more holes.\n\n' +
  'N_ox / N_fuel — number of orifice holes at the chosen drill diameter.\n' +
  'v_ratio (v_fuel / v_ox) — coaxial: target ~10–15 for shear atomisation.\n' +
  'MFR (ρ_f·v_f² / ρ_o·v_o²) — impinging: target ~0.8–1.2 for balanced mixing.\n' +
  '★ marks the recommended midpoint design.';



export default function InjectorRightPanel({
  engineDesignResult,
  injectorType, onInjectorTypeChange,
  dOxMm, onDOxChange,
  dFuelMm, onDFuelChange,
  impingementHalfAngleDeg, onImpingementAngleChange,
  selectedRow, onRowSelect,
  collapsed, onToggle,
}: InjectorRightPanelProps) {
  const [sweepResult, setSweepResult] = useState<InjectorSweepResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [localDOx, setLocalDOx]     = useState(dOxMm);
  const [localDFuel, setLocalDFuel] = useState(dFuelMm);
  const [localAngle, setLocalAngle] = useState(impingementHalfAngleDeg);

  const fetchSweep = useCallback(async () => {
    if (!engineDesignResult) return;
    const opt      = engineDesignResult.engineOutputs.mixtureRatio.optimum;
    const Pc_bar   = engineDesignResult.engineInputs.chamberPressure.value;
    const oxCode   = engineDesignResult.engineInputs.propellants.oxidizer.code;
    const fuelCode = engineDesignResult.engineInputs.propellants.fuel.code;

    // CEA returns mass flow in g/s; the API expects kg/s
    const mDotKgs = opt.totalMassFlow.value / 1000;
    const ofRatio = opt.mixtureRatio.value;

    setLoading(true);
    setError(null);
    try {
      const result = await injectorSweepService.getSweep({
        m_dot_total_kgs: mDotKgs,
        of_ratio: ofRatio,
        pc_bar: Pc_bar,
        injector_type: injectorType,
        ox_code: oxCode,
        fuel_code: fuelCode,
        d_o_mm: dOxMm,
        d_f_mm: dFuelMm,
        impingement_half_angle_deg: impingementHalfAngleDeg,
      });
      setSweepResult(result);

      const rec = result.sweep.find((r) => r.recommended);
      if (rec) onRowSelect(rec);
    } catch (e: unknown) {
      if (e instanceof TypeError) {
        setError('Unable to reach the calculation server. Please ensure the API is running.');
      } else {
        setError(e instanceof Error ? e.message : 'Sweep failed');
      }
    } finally {
      setLoading(false);
    }
  }, [engineDesignResult, injectorType, dOxMm, dFuelMm, impingementHalfAngleDeg]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchSweep();
  }, [fetchSweep]);

  const isImpinging = injectorType === 'impinging' || injectorType === 'impinging_fof' || injectorType === 'impinging_ofo';

  return (
    <aside className={`inj-rp ${collapsed ? 'inj-rp--collapsed' : ''}`}>
      {/* Collapse toggle */}
      <div className="inj-rp-toggle">
        <Tooltip title={collapsed ? 'Expand panel' : 'Collapse panel'} placement="left">
          <IconButton onClick={onToggle} size="small" sx={{ color: 'rgba(0,229,255,0.6)' }}>
            {collapsed ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </div>

      {!collapsed && (
        <div className="inj-rp-content">
          <div className="inj-rp-header">INJECTOR DESIGN</div>

          {/* Architecture selector */}
          <div className="inj-rp-section">
            <div className="inj-rp-section-label">Architecture</div>
            <FormControl fullWidth size="small">
              <Select
                className="read-select"
                value={injectorType}
                onChange={(e) => onInjectorTypeChange(e.target.value as InjectorType)}
              >
                {(Object.entries(INJECTOR_LABELS) as [InjectorType, string][]).map(([v, label]) => (
                  <MenuItem key={v} value={v}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {/* Orifice diameters */}
          <div className="inj-rp-section">
            <div className="inj-rp-section-label">Orifice Diameters (mm)</div>
            <div className="inj-rp-two-col">
              <div className="inj-rp-field">
                <span className="inj-rp-field-label">Oxidizer — {localDOx.toFixed(2)} mm</span>
                <Slider
                  size="small"
                  value={localDOx}
                  min={OX_FUEL_DIA_MIN}
                  max={OX_FUEL_DIA_MAX}
                  step={OX_FUEL_DIA_STEP}
                  valueLabelDisplay="auto"
                  onChange={(_, v) => setLocalDOx(v as number)}
                  onChangeCommitted={(_, v) => onDOxChange(v as number)}
                  sx={{ color: 'rgba(0,229,255,0.7)' }}
                />
              </div>
              <div className="inj-rp-field">
                <span className="inj-rp-field-label">Fuel — {localDFuel.toFixed(2)} mm</span>
                <Slider
                  size="small"
                  value={localDFuel}
                  min={OX_FUEL_DIA_MIN}
                  max={OX_FUEL_DIA_MAX}
                  step={OX_FUEL_DIA_STEP}
                  valueLabelDisplay="auto"
                  onChange={(_, v) => setLocalDFuel(v as number)}
                  onChangeCommitted={(_, v) => onDFuelChange(v as number)}
                  sx={{ color: 'rgba(0,229,255,0.7)' }}
                />
              </div>
            </div>
          </div>

          {/* Impingement angle — only shown for impinging type */}
          {isImpinging && (
            <div className="inj-rp-section">
              <div className="inj-rp-section-label">Impingement ½-angle — {localAngle}°</div>
              <Slider
                size="small"
                value={localAngle}
                min={HALF_ANGLES_DEG[0]}
                max={HALF_ANGLES_DEG[HALF_ANGLES_DEG.length - 1]}
                step={1}
                valueLabelDisplay="auto"
                onChange={(_, v) => setLocalAngle(v as number)}
                onChangeCommitted={(_, v) => onImpingementAngleChange(v as number)}
                sx={{ color: 'rgba(0,229,255,0.7)' }}
              />
              <div className="inj-rp-hint">
                30° → deep convergence &nbsp;|&nbsp; 60° → near-face
              </div>
            </div>
          )}

          {/* Sweep table */}
          <div className="inj-rp-section">
            <div className="inj-rp-section-label-row">
              <span className="inj-rp-section-label">Pressure Drop Sweep</span>
              <Tooltip
                title={<span style={{ whiteSpace: 'pre-line', fontSize: 11 }}>{SWEEP_INFO}</span>}
                placement="left"
                arrow
              >
                <InfoOutlinedIcon sx={{ fontSize: 14, color: 'rgba(0,229,255,0.5)', cursor: 'pointer' }} />
              </Tooltip>
            </div>

            {loading && !sweepResult && <div className="inj-rp-status">Computing...</div>}
            {error   && <div className="inj-rp-error">{error}</div>}

            {!error && sweepResult && (
              <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
              <div className="inj-sweep-table-wrap">
                <table className="inj-sweep-table">
                  <thead>
                    <tr>
                      <th>ΔP %</th>
                      <th>ΔP bar</th>
                      <th>N<sub>ox</sub></th>
                      <th>N<sub>f</sub></th>
                      <th>★</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sweepResult.sweep.map((row) => {
                      const isSel = selectedRow?.dp_percentage === row.dp_percentage;
                      return (
                        <tr
                          key={row.dp_percentage}
                          className={`inj-sweep-tr ${isSel ? 'inj-sweep-tr--selected' : ''} ${row.recommended ? 'inj-sweep-tr--rec' : ''}`}
                          onClick={() => onRowSelect(row)}
                        >
                          <td>{row.dp_percentage.toFixed(1)}</td>
                          <td>{row.delta_P_bar.toFixed(2)}</td>
                          <td>{row.oxidizer_hole_count}</td>
                          <td>{row.fuel_hole_count}</td>
                          <td>{row.recommended ? '★' : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </div>
            )}

            {!loading && !error && !sweepResult && !engineDesignResult && (
              <div className="inj-rp-status">Run engine design first.</div>
            )}
          </div>

        </div>
      )}
    </aside>
  );
}
