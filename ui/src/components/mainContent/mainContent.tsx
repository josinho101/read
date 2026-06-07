import { useState, useMemo, useEffect } from 'react';
import { Button, Tooltip, Tabs, Tab as MuiTab } from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { type EngineDesignResult, type MixtureRatioSweepEntry } from '../../services/engineDesignService';
import { type NozzleType, type AngleOverrides, type FlowProperty, computeGeometry } from '../engineContour/isentropicFlow';
import { generateEngineDXF, downloadDXF } from '../../utils/dxfExport';
import { type InjectorType, type InjectorSweepRow } from '../../services/injectorSweepService';
import MrGraph from '../mrGraph/MrGraph';
import MrSweepModal from '../mrSweepModal/MrSweepModal';
import EngineContour from '../engineContour/EngineContour';
import CombustionAnalysis from '../combustionAnalysis/CombustionAnalysis';
import EngineStations from '../engineStations/EngineStations';
import InjectorFace from '../injectorFace/InjectorFace';
import InjectorRightPanel from '../injectorRightPanel/InjectorRightPanel';
import './mainContent.css';
import Reference from '../reference/reference';
import LiftOfMass from '../reference/LiftOfMass';

const TABS = ['ENGINE CONTOUR', 'ENGINE STATIONS', 'INJECTOR FACE', 'COMBUSTION', 'LIFT OF MASS', 'REFERENCE'] as const;
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
  const [confirmedRow, setConfirmedRow] = useState<MixtureRatioSweepEntry | null>(null);

  // Injector Face tab state
  const [injectorSelectedRow, setInjectorSelectedRow] = useState<InjectorSweepRow | null>(null);
  const [injectorRightCollapsed, setInjectorRightCollapsed] = useState(false);

  // Engine Contour tab state
  const [engineContourRightCollapsed, setEngineContourRightCollapsed] = useState(true);

  useEffect(() => {
    setConfirmedRow(null);
  }, [engineDesignResult]);

  const outputs = engineDesignResult?.engineOutputs ?? null;
  const opt = outputs?.mixtureRatio.optimum ?? null;
  const sweep = outputs?.mixtureRatio.sweep ?? null;
  const performanceMode = engineDesignResult?.engineInputs.performanceMode ?? 'sea_level';

  const fmt = (v: number, decimals: number) => v.toFixed(decimals);

  const optimumRow = useMemo(() => {
    if (!sweep) return null;
    const maxIsp = Math.max(...sweep.values.map((r) => r.specificImpulse));
    return sweep.values.find((r) => r.specificImpulse === maxIsp) ?? null;
  }, [sweep]);

  const handleOpenSweep = () => {
    setSweepOpen(true);
  };

  const handleCloseSweep = () => {
    setSweepOpen(false);
  };

  const handleConfirmSweep = (row: MixtureRatioSweepEntry) => {
    setConfirmedRow(row);
    setSweepOpen(false);
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
      <Tabs
        className="main-tabs"
        value={activeTab}
        onChange={(_event, newValue: Tab) => onActiveTabChange(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="main content tabs"
      >
        {TABS.map((tab) => (
          <MuiTab key={tab} value={tab} label={tab} className="main-tab" />
        ))}
      </Tabs>

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
        {activeTab === 'ENGINE STATIONS' && <EngineStations engineDesignResult={engineDesignResult} />}
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
        <MrSweepModal
          sweep={sweep}
          confirmedRow={confirmedRow}
          optimumRow={optimumRow}
          performanceMode={performanceMode}
          onConfirm={handleConfirmSweep}
          onClose={handleCloseSweep}
        />
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
