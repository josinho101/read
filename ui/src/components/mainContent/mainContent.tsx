import { useState, useMemo, useEffect } from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import GridOnIcon from '@mui/icons-material/GridOn';
import TableChartIcon from '@mui/icons-material/TableChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { type EngineDesignResult, type MixtureRatioSweepEntry } from '../../services/engineDesignService';
import MrGraph from '../mrGraph/MrGraph';
import './mainContent.css';
import Reference from '../reference/reference';

const TABS = ['ENGINE CONTOUR', 'CALCULATED STEPS & EQUATIONS', 'REFERENCE'] as const;
type Tab = typeof TABS[number];

interface StatsDisplayData {
  specificImpulse: number;
  totalMassFlow: number;
  chamberRadius: number;
  throatRadius: number;
  exitRadius: number;
  expansionRatio: number;
  chamberTemperature: number;
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
}

export default function MainContent({ engineDesignResult }: MainContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>('ENGINE CONTOUR');
  const [zoom, setZoom] = useState(100);
  const [sweepOpen, setSweepOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [dialogSelectedRow, setDialogSelectedRow] = useState<MixtureRatioSweepEntry | null>(null);
  const [confirmedRow, setConfirmedRow] = useState<MixtureRatioSweepEntry | null>(null);
  const [sortCol, setSortCol] = useState<keyof MixtureRatioSweepEntry>('mixtureRatio');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setConfirmedRow(null);
    setDialogSelectedRow(null);
  }, [engineDesignResult]);

  const outputs = engineDesignResult?.engineOutputs ?? null;
  const opt = outputs?.mixtureRatio.optimum ?? null;
  const sweep = outputs?.mixtureRatio.sweep ?? null;

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

  const displayValues: StatsDisplayData | null = confirmedRow
    ? {
        specificImpulse: confirmedRow.specificImpulse,
        totalMassFlow: confirmedRow.totalMassFlow,
        chamberRadius: confirmedRow.chamberRadius,
        throatRadius: confirmedRow.throatRadius,
        exitRadius: confirmedRow.exitRadius,
        expansionRatio: confirmedRow.expansionRatio,
        chamberTemperature: confirmedRow.chamberTemperature,
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
      }
    : null;

  const stats = [
    { label: 'SPECIFIC IMPULSE',     value: displayValues ? fmt(displayValues.specificImpulse, 1) : '--',               unit: 's'    },
    { label: 'MASS FLOW RATE',        value: displayValues ? fmt(displayValues.totalMassFlow / 1000, 2) : '--',          unit: 'kg/s' },
    { label: 'CHAMBER DIAMETER (DC)', value: displayValues ? fmt(displayValues.chamberRadius * 2 / 10, 2) : '--',       unit: 'cm'   },
    { label: 'THROAT DIAMETER (DT)',  value: displayValues ? fmt(displayValues.throatRadius * 2 / 10, 2) : '--',        unit: 'cm'   },
    { label: 'EXIT DIAMETER (DE)',    value: displayValues ? fmt(displayValues.exitRadius * 2 / 10, 2) : '--',          unit: 'cm'   },
    { label: 'EXPANSION RATIO (E)',   value: displayValues ? fmt(displayValues.expansionRatio, 2) : '--',               unit: ''     },
    { label: 'CHAMBER TEMPERATURE',  value: displayValues ? fmt(displayValues.chamberTemperature, 0) : '--',            unit: 'K'    },
  ];

  const handleZoomIn = () => setZoom((z) => Math.min(z + 10, 300));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 10, 20));
  const handleResetView = () => setZoom(100);

  return (
    <div className="main-content">
      {/* Tab bar */}
      <div className="main-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`main-tab ${activeTab === tab ? 'main-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="main-toolbar">
        <div className="toolbar-left">
          <div className="engine-badge">
            <span className="engine-badge-name">Engine</span>
            <span className="engine-badge-version">v0.1</span>
          </div>
          <div className="toolbar-divider" />
          <div className="grid-info">
            <GridOnIcon sx={{ fontSize: 13, color: 'rgba(0,229,255,0.6)' }} />
            <span>GRID SCALING: 1 DIV = 5.0 cm</span>
          </div>
          <div className="toolbar-divider" />
        </div>

        <div className="toolbar-right">
          <div className="zoom-controls">
            <Tooltip title="Zoom out">
              <IconButton onClick={handleZoomOut} className="zoom-btn" size="small">
                <RemoveIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
            <span className="zoom-value">{zoom}%</span>
            <Tooltip title="Zoom in">
              <IconButton onClick={handleZoomIn} className="zoom-btn" size="small">
                <AddIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </div>

          <Button onClick={handleResetView} className="toolbar-btn" variant="outlined" size="small">
            Reset View
          </Button>

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
                MR SWEEP
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
                MR GRAPH
              </Button>
            </span>
          </Tooltip>

          <Button
            className="toolbar-btn toolbar-btn--ignite"
            variant="contained"
            size="small"
            startIcon={<WhatshotIcon sx={{ fontSize: 14 }} />}
          >
            IGNITE ENGINE
          </Button>
        </div>
      </div>

      {/* Canvas / viewport */}
      <div className="main-viewport">
        {activeTab === 'ENGINE CONTOUR' && (
          <div className="canvas-placeholder">
            <div className="canvas-centerline" />
            <div className="canvas-label">Engine contour visualization will render here</div>
          </div>
        )}
        {activeTab === 'CALCULATED STEPS & EQUATIONS' && (
          <div className="canvas-placeholder canvas-placeholder--text">
            <div className="canvas-label">Calculated steps and equations will appear here</div>
          </div>
        )}
        {activeTab === 'REFERENCE' && <Reference />}
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-item">
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value">
              {stat.value}
              {stat.unit && <span className="stat-unit"> {stat.unit}</span>}
            </span>
          </div>
        ))}
      </div>

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
                      {SWEEP_COLUMNS.map((col) => (
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
                          {SWEEP_COLUMNS.map((col) => (
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
