import { useMemo } from 'react';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { MixtureRatioSweepEntry } from '../../services/engineDesignService';
import './MrGraph.css';

interface Props {
  values: MixtureRatioSweepEntry[];
  units: Record<string, string>;
  optimumRow: MixtureRatioSweepEntry | null;
  onClose: () => void;
}

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: number;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="mrgraph-tooltip">
      <div className="mrgraph-tooltip-label">O/F: {Number(label).toFixed(3)}</div>
      {payload.map((p) => (
        <div key={p.name} className="mrgraph-tooltip-row" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span className="mrgraph-tooltip-val">{Number(p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

function axisDomain(vals: number[]): [number, number] {
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = (max - min) * 0.05;
  return [min - pad, max + pad];
}

export default function MrGraph({ values, units, optimumRow, onClose }: Props) {
  const data = useMemo(
    () => [...values].sort((a, b) => a.mixtureRatio - b.mixtureRatio),
    [values]
  );

  const ispDomain = useMemo(
    () => axisDomain(data.map((d) => d.specificImpulse)),
    [data]
  );

  const tcDomain = useMemo(
    () => axisDomain(data.map((d) => d.chamberTemperature)),
    [data]
  );

  return (
    <div className="mrgraph-overlay" onClick={onClose}>
      <div
        className="mrgraph-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="MR Performance Graph"
      >
        {/* Header */}
        <div className="mrgraph-header">
          <ShowChartIcon sx={{ fontSize: 15, color: '#00e5ff', flexShrink: 0 }} />
          <span className="mrgraph-title">PROPELLANT PERFORMANCE TRADE-OFFS</span>
          <span className="mrgraph-subtitle">{data.length} data points</span>
          <button className="mrgraph-close-btn" onClick={onClose} aria-label="Close">
            &#x2715;
          </button>
        </div>

        {/* Chart */}
        <div className="mrgraph-body">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 72, left: 12, bottom: 32 }}>
              <CartesianGrid stroke="rgba(0,229,255,0.08)" strokeDasharray="4 4" />

              <XAxis
                dataKey="mixtureRatio"
                type="number"
                domain={['auto', 'auto']}
                tickCount={8}
                tickFormatter={(v: number) => v.toFixed(2)}
                tick={{ fill: 'rgba(200,220,230,0.6)', fontFamily: 'Courier New', fontSize: 11 }}
                label={{
                  value: 'Mixture Ratio (O/F)',
                  position: 'insideBottom',
                  offset: -16,
                  fill: 'rgba(200,220,230,0.6)',
                  fontFamily: 'Courier New',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />

              {/* Left Y-axis — Isp */}
              <YAxis
                yAxisId="isp"
                domain={ispDomain}
                allowDecimals={false}
                tickFormatter={(v: number) => Math.round(v).toString()}
                tick={{ fill: '#4fc3f7', fontFamily: 'Courier New', fontSize: 11 }}
                tickLine={{ stroke: 'rgba(79,195,247,0.3)' }}
                axisLine={{ stroke: 'rgba(79,195,247,0.3)' }}
                width={62}
                label={{
                  value: `Ideal Sea Level Isp (${units['specificImpulse'] ?? 's'})`,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 16,
                  fill: '#4fc3f7',
                  fontFamily: 'Courier New',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />

              {/* Right Y-axis — Tc */}
              <YAxis
                yAxisId="tc"
                orientation="right"
                domain={tcDomain}
                allowDecimals={false}
                tickFormatter={(v: number) => Math.round(v).toString()}
                tick={{ fill: '#ef5350', fontFamily: 'Courier New', fontSize: 11 }}
                tickLine={{ stroke: 'rgba(239,83,80,0.3)' }}
                axisLine={{ stroke: 'rgba(239,83,80,0.3)' }}
                width={68}
                label={{
                  value: `Chamber Flame Temp Tc (${units['chamberTemperature'] ?? 'K'})`,
                  angle: 90,
                  position: 'insideRight',
                  offset: 16,
                  fill: '#ef5350',
                  fontFamily: 'Courier New',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />

              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: 'rgba(0,229,255,0.15)', strokeDasharray: '4 4' }}
              />

              {/* Optimal O/F reference line */}
              {optimumRow && (
                <ReferenceLine
                  yAxisId="isp"
                  x={optimumRow.mixtureRatio}
                  stroke="#4caf50"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  label={{
                    value: `Opt O/F (${optimumRow.mixtureRatio.toFixed(2)})`,
                    position: 'insideTopRight',
                    fill: '#4caf50',
                    fontFamily: 'Courier New',
                    fontSize: 10,
                    dy: -6,
                  }}
                />
              )}

              {/* Isp — blue solid */}
              <Line
                yAxisId="isp"
                type="monotone"
                dataKey="specificImpulse"
                name={`Specific Impulse (${units['specificImpulse'] ?? 's'})`}
                stroke="#4fc3f7"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#4fc3f7', stroke: '#090d12', strokeWidth: 2 }}
              />

              {/* Tc — red dashed */}
              <Line
                yAxisId="tc"
                type="monotone"
                dataKey="chamberTemperature"
                name={`Chamber Temp Tc (${units['chamberTemperature'] ?? 'K'})`}
                stroke="#ef5350"
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={false}
                activeDot={{ r: 4, fill: '#ef5350', stroke: '#090d12', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Footer legend */}
        <div className="mrgraph-footer">
          <div className="mrgraph-legend">
            <span className="mrgraph-legend-item">
              <svg width="24" height="10" aria-hidden="true">
                <line x1="0" y1="5" x2="24" y2="5" stroke="#4fc3f7" strokeWidth="2.5" />
              </svg>
              <span style={{ color: '#4fc3f7' }}>Specific Impulse</span>
            </span>
            {optimumRow && (
              <span className="mrgraph-legend-item">
                <svg width="24" height="10" aria-hidden="true">
                  <line x1="0" y1="5" x2="24" y2="5" stroke="#4caf50" strokeWidth="2" strokeDasharray="6 4" />
                </svg>
                <span style={{ color: '#4caf50' }}>
                  Optimal O/F ({optimumRow.mixtureRatio.toFixed(2)})
                </span>
              </span>
            )}
            <span className="mrgraph-legend-item">
              <svg width="24" height="10" aria-hidden="true">
                <line x1="0" y1="5" x2="24" y2="5" stroke="#ef5350" strokeWidth="2" strokeDasharray="8 4" />
              </svg>
              <span style={{ color: '#ef5350' }}>Chamber Temp (Tc)</span>
            </span>
          </div>
          <button className="mrgraph-close-action" onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
