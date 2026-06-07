import { useState, useMemo, useEffect } from 'react';
import { Button, Tooltip } from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { type EngineDesignResult, type MixtureRatioSweepEntry } from '../../services/engineDesignService';
import { type NozzleType, type AngleOverrides, type FlowProperty, computeGeometry } from '../engineContour/isentropicFlow';
import { generateEngineDXF, downloadDXF } from '../../utils/dxfExport';
import { type InjectorType, type InjectorSweepRow } from '../../services/injectorSweepService';
import MrGraph from '../mrGraph/MrGraph';
import EngineContour from '../engineContour/EngineContour';
import CombustionAnalysis from '../combustionAnalysis/CombustionAnalysis';
import InjectorFace from '../injectorFace/InjectorFace';
import InjectorRightPanel from '../injectorRightPanel/InjectorRightPanel';
import './mainContent.css';
import Reference from '../reference/reference';
import LiftOfMass from '../reference/LiftOfMass';

const TABS = ['ENGINE CONTOUR', 'INJECTOR FACE', 'COMBUSTION', 'LIFT OF MASS', 'REFERENCE'] as const;
export type Tab = typeof TABS[number];

interface StatsDisplayData {
  specificImpulse: number;
  totalMassFlow: number;
  chamberRadius: number;
  throatRadius: number;
  exitRadius: number;
  expansionRatio: number;
  chamberTemperature: number;
  contractionRatio: number;
  gamma: number;
  molecularWeightGMol: number;
  characteristicLength: number;
  cylindricalLengthMm: number;
}

const SWEEP_COLUMNS: { key: keyof MixtureRatioSweepEntry; label: string; decimals: number }[] = [
  { key: 'mixtureRatio',               label: 'MR (O/F)',  decimals: 3 },
  { key: 'specificImpulse',            label: 'Isp',       decimals: 1 },
  { key: 'chamberTemperature',         label: 'Tc',        decimals: 0 },
  { key: 'characteristicVelocityCstar',label: 'C*',        decimals: 1 },
  { key: 'thrustCoefficientCf',        label: 'Cf',        decimals: 4 },
  { key: 'specificHeatRatioGamma',     label: 'γ',         decimals: 4 },
  { key: 'combustionMolecularWeight',  label: 'Mol. Wt.',  decimals: 2 },
  { key: 'expansionRatio',             label: 'ε',         decimals: 3 },
  { key: 'totalMassFlow',              label: 'ṁ Tot',     decimals: 2 },
  { key: 'oxidizerMassFlow',           label: 'ṁ Ox',      decimals: 2 },
  { key: 'fuelMassFlow',               label: 'ṁ Fuel',    decimals: 2 },
  { key: 'throatRadius',               label: 'Rt',        decimals: 3 },
  { key: 'exitRadius',                 label: 'Re',        decimals: 3 },
  { key: 'chamberRadius',              label: 'Rc',        decimals: 3 },
  { key: 'contractionRatio',           label: 'CR',        decimals: 2 },
];

interface MainContentProps {
  engineDesignResult: EngineDesignResult | null;
  engineName: string;
  engineVersion: string;
  ambientPressureBar?: number;
  nozzleType: NozzleType;
  onNozzleTypeChange: (t: NozzleType) => void;
  angleOverrides: AngleOverrides;
  onAngleOverridesChange: (a: AngleOverrides) => void;
  showFlowSim: boolean;
  onShowFlowSimChange: (v: boolean) => void;
  flowProperty: FlowProperty;
  onFlowPropertyChange: (v: FlowProperty) => void;
  showParticles: boolean;
  onShowParticlesChange: (v: boolean) => void;
  showPlume: boolean;
  onShowPlumeChange: (v: boolean) => void;
  activeTab: Tab;
  onActiveTabChange: (tab: Tab) => void;
  injectorType: InjectorType;
  onInjectorTypeChange: (t: InjectorType) => void;
  dOxMm: number;
  onDOxMmChange: (v: number) => void;
  dFuelMm: number;
  onDFuelMmChange: (v: number) => void;
  impingementHalfAngleDeg: number;
  onImpingementHalfAngleDegChange: (v: number) => void;
}

export default function MainContent({
  engineDesignResult, engineName, engineVersion, ambientPressureBar,
  nozzleType, onNozzleTypeChange, angleOverrides, onAngleOverridesChange,
  showFlowSim, onShowFlowSimChange, flowProperty, onFlowPropertyChange,
  showParticles, onShowParticlesChange, showPlume, onShowPlumeChange,
  activeTab, onActiveTabChange,
  injectorType, onInjectorTypeChange,
  dOxMm, onDOxMmChange,
  dFuelMm, onDFuelMmChange,
  impingementHalfAngleDeg, onImpingementHalfAngleDegChange,
}: MainContentProps) {
  const [sweepOpen, setSweepOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [dialogSelectedRow, setDialogSelectedRow] = useState<MixtureRatioSweepEntry | null>(null);
  const [confirmedRow, setConfirmedRow] = useState<MixtureRatioSweepEntry | null>(null);
  const [sortCol, setSortCol] = useState<keyof MixtureRatioSweepEntry>('mixtureRatio');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Injector Face tab state
  const [injectorSelectedRow, setInjectorSelectedRow] = useState<InjectorSweepRow | null>(null);
  const [injectorRightCollapsed, setInjectorRightCollapsed] = useState(false);

  // Engine Contour tab state
  const [engineContourRightCollapsed, setEngineContourRightCollapsed] = useState(true);

  useEffect(() => {
    setConfirmedRow(null);
    setDialogSelectedRow(null);
  }, [engineDesignResult]);

  const outputs = engineDesignResult?.engineOutputs ?? null;
  const opt = outputs?.mixtureRatio.optimum ?? null;
  const sweep = outputs?.mixtureRatio.sweep ?? null;
  const performanceMode = engineDesignResult?.engineInputs.performanceMode ?? 'sea_level';
  const ispLabel = performanceMode === 'vacuum' ? 'Isp (Vac)' : 'Isp (SL)';
  const cfLabel = performanceMode === 'vacuum' ? 'Cf (Vac)' : 'Cf (SL)';
  const sweepColumns = SWEEP_COLUMNS.map((col) => {
    if (col.key === 'specificImpulse') return { ...col, label: ispLabel };
    if (col.key === 'thrustCoefficientCf') return { ...col, label: cfLabel };
    return col;
  });

  const fmt = (v: number, decimals: number) => v.toFixed(decimals);

  const sortedSweepRows = useMemo(() => {
    if (!sweep) return [];
    return [...sweep.values].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      return (a[sortCol] - b[sortCol]) * dir;
    });
  }, [sweep, sortCol, sortDir]);

  const optimumRow = useMemo(() => {
    if (!sweep) return null;
    const maxIsp = Math.max(...sweep.values.map((r) => r.specificImpulse));
    return sweep.values.find((r) => r.specificImpulse === maxIsp) ?? null;
  }, [sweep]);

  const handleSort = (col: keyof MixtureRatioSweepEntry) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const handleOpenSweep = () => {
    setDialogSelectedRow(confirmedRow);
    setSweepOpen(true);
  };

  const handleCancelSweep = () => {
    setSweepOpen(false);
    setDialogSelectedRow(null);
  };

  const handleOkSweep = () => {
    setConfirmedRow(dialogSelectedRow);
    setSweepOpen(false);
    setDialogSelectedRow(null);
  };

  const handleExportDXF = () => {
    if (!displayValues) return;
    const geom = computeGeometry(
      nozzleType,
      displayValues.chamberRadius,
      displayValues.throatRadius,
      displayValues.exitRadius,
      displayValues.expansionRatio,
      displayValues.contractionRatio,
      { ...angleOverrides, cylindricalLengthMm: displayValues.cylindricalLengthMm },
    );
    const dxf = generateEngineDXF(geom, nozzleType);
    downloadDXF(dxf, `${engineName}_v${engineVersion}_contour.dxf`);
  };

  const displayValues: StatsDisplayData | null = confirmedRow
    ? {
        specificImpulse: confirmedRow.specificImpulse,
        totalMassFlow: confirmedRow.totalMassFlow,
        chamberRadius: confirmedRow.chamberRadius,
        throatRadius: confirmedRow.throatRadius,
        exitRadius: confirmedRow.exitRadius,
        expansionRatio: confirmedRow.expansionRatio,
        chamberTemperature: confirmedRow.chamberTemperature,
        contractionRatio: confirmedRow.contractionRatio,
        gamma: confirmedRow.specificHeatRatioGamma,
        molecularWeightGMol: confirmedRow.combustionMolecularWeight,
        characteristicLength: opt?.characteristicLength.value ?? 0,
        cylindricalLengthMm: opt?.cylindricalLength.value ?? 0,
      }
    : opt
    ? {
        specificImpulse: opt.specificImpulse.value,
        totalMassFlow: opt.totalMassFlow.value,
        chamberRadius: opt.chamberRadius.value,
        throatRadius: opt.throatRadius.value,
        exitRadius: opt.exitRadius.value,
        expansionRatio: opt.expansionRatio.value,
        chamberTemperature: opt.chamberTemperature.value,
        contractionRatio: opt.contractionRatio.value,
        gamma: opt.specificHeatRatioGamma.value,
        molecularWeightGMol: opt.combustionMolecularWeight.value,
        characteristicLength: opt.characteristicLength.value,
        cylindricalLengthMm: opt.cylindricalLength.value,
      }
    : null;

  const stats = [
    { label: `SPECIFIC IMPULSE (${performanceMode === 'vacuum' ? 'VAC' : 'SL'})`, value: displayValues ? fmt(displayValues.specificImpulse, 1) : '--', unit: 's' },
    { label: 'MASS FLOW RATE',        value: displayValues ? fmt(displayValues.totalMassFlow / 1000, 2) : '--',          unit: 'kg/s' },
    { label: 'CHAMBER DIAMETER (DC)', value: displayValues ? fmt(displayValues.chamberRadius * 2 / 10, 2) : '--',       unit: 'cm'   },
    { label: 'THROAT DIAMETER (DT)',  value: displayValues ? fmt(displayValues.throatRadius * 2 / 10, 2) : '--',        unit: 'cm'   },
    { label: 'EXIT DIAMETER (DE)',    value: displayValues ? fmt(displayValues.exitRadius * 2 / 10, 2) : '--',          unit: 'cm'   },
    { label: 'EXPANSION RATIO (E)',   value: displayValues ? fmt(displayValues.expansionRatio, 2) : '--',               unit: ''     },
    { label: 'CHAMBER TEMPERATURE',  value: displayValues ? fmt(displayValues.chamberTemperature, 0) : '--',            unit: 'K'    },
    { label: 'CHAR. LENGTH (L*)',    value: displayValues ? fmt(displayValues.characteristicLength, 2) : '--',            unit: 'm'    },
  ];

  return (
    <div className="main-content">
      {/* Tab bar */}
      <div className="main-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`main-tab ${activeTab === tab ? 'main-tab--active' : ''}`}
            onClick={() => onActiveTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Toolbar — Engine Contour tab only */}
      {activeTab === 'ENGINE CONTOUR' && <div className="main-toolbar">
        <div className="toolbar-left">
          <div className="engine-badge">
            <span className="engine-badge-name">{engineName}</span>
            <span className="engine-badge-version">v{engineVersion}</span>
          </div>
        </div>

        <div className="toolbar-right">
          <Tooltip title={sweep ? 'View mixture ratio sweep data' : 'Run engine design first'}>
            <span>
              <Button
                className="toolbar-btn toolbar-btn--sweep"
                variant="outlined"
                size="small"
                startIcon={<TableChartIcon sx={{ fontSize: 14 }} />}
                onClick={handleOpenSweep}
                disabled={!sweep}
              >
                Mix Ratio Sweep
              </Button>
            </span>
          </Tooltip>

          <Tooltip title={sweep ? 'View performance trade-off graph' : 'Run engine design first'}>
            <span>
              <Button
                className="toolbar-btn toolbar-btn--sweep"
                variant="outlined"
                size="small"
                startIcon={<ShowChartIcon sx={{ fontSize: 14 }} />}
                onClick={() => setGraphOpen(true)}
                disabled={!sweep}
              >
                Mix Ratio Graph
              </Button>
            </span>
          </Tooltip>

          <Tooltip title={displayValues ? 'Export nozzle contour as DXF for CAD import' : 'Run engine design first'}>
            <span>
              <Button
                className="toolbar-btn toolbar-btn--sweep"
                variant="outlined"
                size="small"
                startIcon={<FileDownloadIcon sx={{ fontSize: 14 }} />}
                onClick={handleExportDXF}
                disabled={!displayValues}
              >
                Export DXF
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>}

      {/* Canvas / viewport */}
      <div className="main-viewport">
        {activeTab === 'ENGINE CONTOUR' && (
          displayValues ? (
            <EngineContour
              chamberRadius={displayValues.chamberRadius}
              throatRadius={displayValues.throatRadius}
              exitRadius={displayValues.exitRadius}
              expansionRatio={displayValues.expansionRatio}
              contractionRatio={displayValues.contractionRatio}
              gamma={displayValues.gamma}
              chamberPressureBar={engineDesignResult!.engineInputs.chamberPressure.value}
              chamberTemperatureK={displayValues.chamberTemperature}
              molecularWeightGMol={displayValues.molecularWeightGMol}
              exitPressureBar={performanceMode === 'sea_level' ? 1.01325 : 0.001}
              ambientPressureBar={ambientPressureBar}
              nozzleType={nozzleType}
              onNozzleTypeChange={onNozzleTypeChange}
              angleOverrides={{ ...angleOverrides, cylindricalLengthMm: displayValues.cylindricalLengthMm }}
              onAngleOverridesChange={onAngleOverridesChange}
              showFlowSim={showFlowSim}
              onShowFlowSimChange={onShowFlowSimChange}
              flowProperty={flowProperty}
              onFlowPropertyChange={onFlowPropertyChange}
              showParticles={showParticles}
              onShowParticlesChange={onShowParticlesChange}
              showPlume={showPlume}
              onShowPlumeChange={onShowPlumeChange}
              rightCollapsed={engineContourRightCollapsed}
              onRightToggle={() => setEngineContourRightCollapsed(c => !c)}
            />
          ) : (
            <div className="canvas-placeholder">
              <div className="canvas-centerline" />
              <div className="canvas-label">Run engine design to render contour</div>
            </div>
          )
        )}
        {activeTab === 'COMBUSTION' && <CombustionAnalysis engineDesignResult={engineDesignResult} />}
        {activeTab === 'LIFT OF MASS' && <LiftOfMass engineDesignResult={engineDesignResult} />}
        {activeTab === 'REFERENCE' && <Reference engineDesignResult={engineDesignResult} />}
        {activeTab === 'INJECTOR FACE' && (
          engineDesignResult ? (
            <div className="injector-tab-layout">
              <InjectorFace
                chamberRadiusMm={
                  (injectorSelectedRow
                    ? (opt?.chamberRadius.value ?? 0)
                    : (opt?.chamberRadius.value ?? 0))
                }
                nOxidizer={injectorSelectedRow?.oxidizer_hole_count ?? 0}
                nFuel={injectorSelectedRow?.fuel_hole_count ?? 0}
                dOxMm={dOxMm}
                dFuelMm={dFuelMm}
                injectorType={injectorType}
                impingementHalfAngleDeg={impingementHalfAngleDeg}
                selectedRow={injectorSelectedRow}
                chamberPressureBar={engineDesignResult?.engineInputs.chamberPressure.value}
              />
              <InjectorRightPanel
                engineDesignResult={engineDesignResult}
                injectorType={injectorType}
                onInjectorTypeChange={onInjectorTypeChange}
                dOxMm={dOxMm}
                onDOxChange={onDOxMmChange}
                dFuelMm={dFuelMm}
                onDFuelChange={onDFuelMmChange}
                impingementHalfAngleDeg={impingementHalfAngleDeg}
                onImpingementAngleChange={onImpingementHalfAngleDegChange}
                selectedRow={injectorSelectedRow}
                onRowSelect={setInjectorSelectedRow}
                collapsed={injectorRightCollapsed}
                onToggle={() => setInjectorRightCollapsed((c) => !c)}
              />
            </div>
          ) : (
            <div className="canvas-placeholder">
              <div className="canvas-centerline" />
              <div className="canvas-label">Run engine design first to size the injector</div>
            </div>
          )
        )}
      </div>

      {/* Stats bar — Engine Contour tab only */}
      {activeTab === 'ENGINE CONTOUR' && <div className="stats-bar">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-item">
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value">
              {stat.value}
              {stat.unit && <span className="stat-unit"> {stat.unit}</span>}
            </span>
          </div>
        ))}
      </div>}

      {/* MR Sweep Dialog */}
      {sweepOpen && sweep && (
        <div className="sweep-overlay" onClick={handleCancelSweep}>
          <div
            className="sweep-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="MR Sweep Data"
          >
            <div className="sweep-modal-header">
              <TableChartIcon sx={{ fontSize: 15, color: '#00e5ff', flexShrink: 0 }} />
              <span className="sweep-modal-title">MR SWEEP DATA</span>
              <span className="sweep-modal-subtitle">{sweep.values.length} data points</span>
              <button className="sweep-close-btn" onClick={handleCancelSweep} aria-label="Close">
                &#x2715;
              </button>
            </div>

            <div className="sweep-modal-body">
              <div className="sweep-table-scroll">
                <table className="sweep-table">
                  <thead>
                    <tr>
                      <th className="sweep-th sweep-th--check" />
                      {sweepColumns.map((col) => (
                        <th
                          key={col.key}
                          className={`sweep-th sweep-th--sortable ${sortCol === col.key ? 'sweep-th--sorted' : ''}`}
                          onClick={() => handleSort(col.key)}
                        >
                          <div className="sweep-th-inner">
                            <span className="sweep-th-label">{col.label}</span>
                            <span className="sweep-th-unit">{sweep.units[col.key]}</span>
                            <span className="sweep-sort-icon">
                              {sortCol === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSweepRows.map((row, i) => {
                      const isSelected = dialogSelectedRow === row;
                      const isOptimum = row === optimumRow;
                      return (
                        <tr
                          key={i}
                          className={`sweep-tr ${isSelected ? 'sweep-tr--selected' : ''} ${isOptimum ? 'sweep-tr--optimum' : ''}`}
                          onClick={() => setDialogSelectedRow(isSelected ? null : row)}
                        >
                          <td className="sweep-td sweep-td--check">
                            <input
                              type="checkbox"
                              className="sweep-checkbox"
                              checked={isSelected}
                              onChange={() => setDialogSelectedRow(isSelected ? null : row)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select O/F ${row.mixtureRatio.toFixed(3)}`}
                            />
                          </td>
                          {sweepColumns.map((col) => (
                            <td key={col.key} className="sweep-td">
                              {row[col.key].toFixed(col.decimals)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="sweep-modal-footer">
              <span className="sweep-selection-hint">
                {dialogSelectedRow
                  ? `O/F = ${dialogSelectedRow.mixtureRatio.toFixed(3)} selected — click OK to apply to stats`
                  : optimumRow
                  ? 'Highlighted row is optimum Isp'
                  : 'Select a row to apply its values to the stats bar'}
              </span>
              <div className="sweep-footer-actions">
                <button className="sweep-action-btn sweep-action-btn--cancel" onClick={handleCancelSweep}>
                  CANCEL
                </button>
                <button
                  className="sweep-action-btn sweep-action-btn--ok"
                  onClick={handleOkSweep}
                  disabled={dialogSelectedRow === null}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MR Graph Dialog */}
      {graphOpen && sweep && (
        <MrGraph
          values={sweep.values}
          units={sweep.units}
          optimumRow={optimumRow}
          onClose={() => setGraphOpen(false)}
        />
      )}
    </div>
  );
}
