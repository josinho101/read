import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Tooltip } from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  engineDesignService,
  type EngineDesignResult,
  type MixtureRatioSweepEntry,
  type StationProperties,
  type CeaStationProps,
} from '../../services/engineDesignService';
import MrSweepModal from '../mrSweepModal/MrSweepModal';
import './EngineStations.css';

type StationKey = 'chamber' | 'throat' | 'exit';

const STATIONS: { key: StationKey; label: string }[] = [
  { key: 'chamber', label: 'Station c (Chamber)' },
  { key: 'throat',  label: 'Station t (Throat)' },
  { key: 'exit',    label: 'Station e (Exit)' },
];

interface ParamRow {
  key: keyof CeaStationProps;
  label: string;
  unit: string;
  decimals: number;
  tooltip: string;
  stations: StationKey[];
}

interface ParamGroup {
  title: string;
  rows: ParamRow[];
}

const PARAM_GROUPS: ParamGroup[] = [
  {
    title: 'Temperature & Enthalpy',
    rows: [
      { key: 'temperature', label: 'Temperature', unit: 'K', decimals: 1, stations: ['chamber', 'throat', 'exit'],
        tooltip: 'How hot the gas is here — chamber is hottest, exit is coolest as energy converts to speed' },
      { key: 'enthalpy', label: 'Enthalpy', unit: 'kJ/kg', decimals: 1, stations: ['chamber', 'throat', 'exit'],
        tooltip: 'Total heat content of the gas — drops across the nozzle as thermal energy becomes kinetic energy' },
      { key: 'sonicVelocity', label: 'Sonic Velocity', unit: 'm/s', decimals: 1, stations: ['chamber', 'throat', 'exit'],
        tooltip: 'Speed of sound at this station — the gas must exceed this to go supersonic at the throat' },
    ],
  },
  {
    title: 'Composition',
    rows: [
      { key: 'molecularWeight', label: 'Molecular Weight', unit: 'g/mol', decimals: 2, stations: ['chamber', 'throat', 'exit'],
        tooltip: 'Average mass of the combustion product molecules — lower means lighter exhaust and higher Isp' },
      { key: 'gamma', label: 'γ — Specific heat ratio', unit: '', decimals: 4, stations: ['chamber', 'throat', 'exit'],
        tooltip: 'Ratio of heat capacities Cp/Cv — controls how efficiently the nozzle converts heat to thrust' },
    ],
  },
  {
    title: 'Density & Flow',
    rows: [
      { key: 'density', label: 'Density', unit: 'kg/m³', decimals: 3, stations: ['chamber', 'throat', 'exit'],
        tooltip: 'Mass of gas per unit volume — highest in the chamber, drops sharply as the gas expands' },
      { key: 'heatCapacityCp', label: 'Heat Capacity Cp', unit: 'kJ/kg·K', decimals: 3, stations: ['chamber', 'throat', 'exit'],
        tooltip: 'Energy needed to raise 1 kg of gas by 1 °C at constant pressure' },
    ],
  },
  {
    title: 'Transport',
    rows: [
      { key: 'viscosity', label: 'Dynamic Viscosity', unit: 'Pa·s', decimals: 6, stations: ['chamber', 'throat', 'exit'],
        tooltip: 'Resistance of the gas to shear flow — small but matters for boundary layer and heat transfer calculations' },
      { key: 'thermalConductivity', label: 'Thermal Conductivity', unit: 'W/m·K', decimals: 3, stations: ['chamber', 'throat', 'exit'],
        tooltip: 'How easily the gas transfers heat — used in wall heat flux and cooling channel analysis' },
      { key: 'prandtlNumber', label: 'Prandtl Number', unit: '', decimals: 3, stations: ['chamber', 'throat', 'exit'],
        tooltip: 'Ratio of momentum to thermal diffusivity — typically 0.5–0.7 for hot combustion gases' },
    ],
  },
  {
    title: 'Station-specific',
    rows: [
      { key: 'pressureRatioToChPc', label: 'Pressure Ratio Pc/P', unit: '', decimals: 3, stations: ['throat', 'exit'],
        tooltip: 'Ratio of chamber pressure to local pressure at this station — shows how much the gas has expanded' },
      { key: 'machNumber', label: 'Mach Number', unit: '', decimals: 3, stations: ['exit'],
        tooltip: 'Ratio of flow speed to local speed of sound — exceeds 1.0 (supersonic) in the divergent section' },
    ],
  },
];

function ParamLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span>{label}</span>
      <Tooltip title={tooltip} placement="left" arrow>
        <InfoOutlinedIcon sx={{ fontSize: 13, color: 'rgba(0,229,255,0.5)', cursor: 'help' }} />
      </Tooltip>
    </div>
  );
}

function deltaBadgeClass(deltaPct: number): string {
  if (deltaPct < 3) return 'es-badge--good';
  if (deltaPct <= 7) return 'es-badge--warn';
  return 'es-badge--bad';
}

interface Props {
  engineDesignResult: EngineDesignResult | null;
}

export default function EngineStations({ engineDesignResult }: Props) {
  const [selectedEntry, setSelectedEntry] = useState<MixtureRatioSweepEntry | null>(null);
  const [sweepOpen, setSweepOpen] = useState(false);
  const [stationProps, setStationProps] = useState<StationProperties | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sweep = engineDesignResult?.engineOutputs.mixtureRatio.sweep ?? null;
  const performanceMode = engineDesignResult?.engineInputs.performanceMode ?? 'sea_level';

  const optimumRow = useMemo(() => {
    if (!sweep) return null;
    const maxIsp = Math.max(...sweep.values.map((r) => r.specificImpulse));
    return sweep.values.find((r) => r.specificImpulse === maxIsp) ?? null;
  }, [sweep]);

  useEffect(() => {
    setSelectedEntry(optimumRow);
  }, [optimumRow]);

  const fetchStationProps = useCallback(async () => {
    if (!engineDesignResult || !selectedEntry) return;
    const { propellants, chamberPressure, performanceMode: mode } = engineDesignResult.engineInputs;

    setLoading(true);
    setError(null);
    try {
      const result = await engineDesignService.getStationProperties({
        ox_code: propellants.oxidizer.code,
        fuel_code: propellants.fuel.code,
        pc_bar: chamberPressure.value,
        performance_mode: mode,
        mixture_ratio: selectedEntry.mixtureRatio,
      });
      setStationProps(result);
    } catch (e: unknown) {
      if (e instanceof TypeError) {
        setError('Unable to reach the calculation server. Please ensure the API is running.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load station properties');
      }
    } finally {
      setLoading(false);
    }
  }, [engineDesignResult, selectedEntry]);

  useEffect(() => {
    fetchStationProps();
  }, [fetchStationProps]);

  if (!engineDesignResult || !sweep) {
    return (
      <div className="canvas-placeholder">
        <div className="canvas-centerline" />
        <div className="canvas-label">Run engine design to view station properties</div>
      </div>
    );
  }

  const fmtValue = (row: ParamRow, station: StationKey) => {
    if (!stationProps || !row.stations.includes(station)) return '—';
    const value = stationProps[station][row.key];
    if (value === undefined) return '—';
    return `${value.toFixed(row.decimals)}${row.unit ? ` ${row.unit}` : ''}`;
  };

  const ispEquil = selectedEntry?.specificImpulse ?? null;
  const ispEquilUnit = sweep.units.specificImpulse ?? 's';
  const frozen = stationProps?.frozenPerformance ?? null;

  return (
    <div className="es-root">
      <div className="es-toolbar">
        <span className="es-toolbar-label">
          {selectedEntry
            ? `Showing data for MR = ${selectedEntry.mixtureRatio.toFixed(3)}`
            : '— select a mixture ratio'}
        </span>
        <Tooltip title={sweep ? 'View mixture ratio sweep data' : 'Run engine design first'}>
          <span>
            <Button
              className="toolbar-btn toolbar-btn--sweep"
              variant="outlined"
              size="small"
              startIcon={<TableChartIcon sx={{ fontSize: 14 }} />}
              onClick={() => setSweepOpen(true)}
              disabled={!sweep}
            >
              Mix Ratio Sweep
            </Button>
          </span>
        </Tooltip>
      </div>

      {loading && !stationProps && <div className="es-status">Computing station properties…</div>}
      {error && <div className="es-error">{error}</div>}

      <div className="es-table-scroll" style={{ opacity: loading && stationProps ? 0.5 : 1, transition: 'opacity 0.15s' }}>
        <table className="es-table">
          <thead>
            <tr>
              <th className="es-th es-th--param">Parameter</th>
              {STATIONS.map((s) => (
                <th key={s.key} className="es-th">{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PARAM_GROUPS.map((group, gi) => (
              group.rows.map((row, ri) => (
                <tr key={`${gi}-${row.key}`} className={`es-tr ${ri === 0 ? 'es-tr--group-start' : ''}`}>
                  <td className="es-td es-td--param">
                    {ri === 0 && <div className="es-group-title">{group.title}</div>}
                    <ParamLabel label={row.label} tooltip={row.tooltip} />
                  </td>
                  {STATIONS.map((s) => (
                    <td key={s.key} className="es-td es-td--value">{fmtValue(row, s.key)}</td>
                  ))}
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>

      <div className="es-frozen-card" style={{ opacity: loading && stationProps ? 0.5 : 1, transition: 'opacity 0.15s' }}>
        <div className="es-frozen-header">
          <span className="es-frozen-title">Frozen vs. Equilibrium Performance</span>
          <Tooltip
            title="Equilibrium Isp assumes combustion products keep recombining as they expand through the nozzle. Frozen Isp assumes no reactions occur past the throat. Real engines fall between these — the gap shows the maximum performance you gain from good mixing and residence time."
            placement="left"
            arrow
          >
            <InfoOutlinedIcon sx={{ fontSize: 13, color: 'rgba(0,229,255,0.5)', cursor: 'help' }} />
          </Tooltip>
        </div>
        <div className="es-frozen-row">
          <span className="es-frozen-label">Equilibrium Vacuum Isp</span>
          <span className="es-frozen-value">{ispEquil !== null ? `${ispEquil.toFixed(1)} ${ispEquilUnit}` : '—'}</span>
        </div>
        <div className="es-frozen-row">
          <span className="es-frozen-label">Frozen Vacuum Isp</span>
          <span className="es-frozen-value">{frozen ? `${frozen.ispFrozenVacS.toFixed(1)} s` : '—'}</span>
        </div>
        {frozen && (
          <div className="es-frozen-row">
            <span className="es-frozen-label">Δ (Equilibrium − Frozen)</span>
            <span className={`es-badge ${deltaBadgeClass(frozen.frozenVsEquilIspDeltaPct)}`}>
              {frozen.frozenVsEquilIspDeltaPct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {sweepOpen && (
        <MrSweepModal
          sweep={sweep}
          confirmedRow={selectedEntry}
          optimumRow={optimumRow}
          performanceMode={performanceMode}
          onConfirm={(row) => { setSelectedEntry(row); setSweepOpen(false); }}
          onClose={() => setSweepOpen(false)}
        />
      )}
    </div>
  );
}
