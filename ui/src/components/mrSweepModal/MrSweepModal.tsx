import { useState, useMemo } from 'react';
import TableChartIcon from '@mui/icons-material/TableChart';
import { type MixtureRatioSweepEntry } from '../../services/engineDesignService';

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

interface MrSweepModalProps {
  sweep: { units: Record<string, string>; values: MixtureRatioSweepEntry[] };
  confirmedRow: MixtureRatioSweepEntry | null;
  optimumRow: MixtureRatioSweepEntry | null;
  performanceMode: 'sea_level' | 'vacuum';
  onConfirm: (row: MixtureRatioSweepEntry) => void;
  onClose: () => void;
}

export default function MrSweepModal({ sweep, confirmedRow, optimumRow, performanceMode, onConfirm, onClose }: MrSweepModalProps) {
  const [dialogSelectedRow, setDialogSelectedRow] = useState<MixtureRatioSweepEntry | null>(confirmedRow);
  const [sortCol, setSortCol] = useState<keyof MixtureRatioSweepEntry>('mixtureRatio');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const ispLabel = performanceMode === 'vacuum' ? 'Isp (Vac)' : 'Isp (SL)';
  const cfLabel = performanceMode === 'vacuum' ? 'Cf (Vac)' : 'Cf (SL)';
  const sweepColumns = SWEEP_COLUMNS.map((col) => {
    if (col.key === 'specificImpulse') return { ...col, label: ispLabel };
    if (col.key === 'thrustCoefficientCf') return { ...col, label: cfLabel };
    return col;
  });

  const sortedSweepRows = useMemo(() => {
    return [...sweep.values].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      return (a[sortCol] - b[sortCol]) * dir;
    });
  }, [sweep, sortCol, sortDir]);

  const handleSort = (col: keyof MixtureRatioSweepEntry) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const handleOk = () => {
    if (dialogSelectedRow) onConfirm(dialogSelectedRow);
  };

  return (
    <div className="sweep-overlay" onClick={onClose}>
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
          <button className="sweep-close-btn" onClick={onClose} aria-label="Close">
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
            <button className="sweep-action-btn sweep-action-btn--cancel" onClick={onClose}>
              CANCEL
            </button>
            <button
              className="sweep-action-btn sweep-action-btn--ok"
              onClick={handleOk}
              disabled={dialogSelectedRow === null}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
