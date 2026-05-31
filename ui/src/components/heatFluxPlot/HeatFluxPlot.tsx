import { useRef, useCallback } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Tooltip as MuiTooltip } from '@mui/material';
import type { HeatFluxProfile } from '../engineContour/bartzHeatFlux';
import { HEAT_FLUX_DISPLAY_DIVISOR } from '../engineContour/bartzConstants';
import './HeatFluxPlot.css';

// Must match the chart margins and YAxis width declared in JSX below
const CHART_MARGIN_LEFT  = 8;
const CHART_MARGIN_RIGHT = 24;
const YAXIS_WIDTH        = 55;
const PLOT_OFFSET_LEFT   = CHART_MARGIN_LEFT + YAXIS_WIDTH;  // px from wrapper left edge to plot area

interface Props {
  heatFluxProfile: HeatFluxProfile;
  wallTempK:       number;
  onHoveredX?:     (xMm: number | null) => void;
}

interface TooltipPayloadItem {
  name:  string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?:  boolean;
  payload?: TooltipPayloadItem[];
  label?:   number;
}

function HeatFluxTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  // Find the raw HeatFluxPoint via the data key
  const entry = payload[0] as TooltipPayloadItem & { payload: Record<string, number> };
  const raw   = entry.payload;

  return (
    <div className="hfp-tooltip">
      <div className="hfp-tooltip-row hfp-tooltip-header">
        Axial position: <span>{(label ?? 0).toFixed(1)} mm</span>
      </div>
      <div className="hfp-tooltip-row">
        q <span>{(raw.heatFlux / HEAT_FLUX_DISPLAY_DIVISOR).toFixed(3)} MW/m²</span>
      </div>
      <div className="hfp-tooltip-row">
        h<sub>g</sub> <span>{(raw.hg / 1000).toFixed(2)} kW/m²K</span>
      </div>
      <div className="hfp-tooltip-row">
        T<sub>aw</sub> <span>{raw.T_aw.toFixed(0)} K</span>
      </div>
      <div className="hfp-tooltip-row">
        T<sub>gas</sub> <span>{raw.T_gas.toFixed(0)} K</span>
      </div>
    </div>
  );
}

export default function HeatFluxPlot({ heatFluxProfile, wallTempK, onHoveredX }: Props) {
  const { points, throatXPhys } = heatFluxProfile;
  const chartAreaRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartAreaRef.current || points.length < 2) return;
    const rect      = chartAreaRef.current.getBoundingClientRect();
    const plotWidth = rect.width - PLOT_OFFSET_LEFT - CHART_MARGIN_RIGHT;
    const chartX    = e.clientX - rect.left - PLOT_OFFSET_LEFT;
    if (chartX < 0 || chartX > plotWidth) { onHoveredX?.(null); return; }
    const xMin = points[0].xPhys_mm;
    const xMax = points[points.length - 1].xPhys_mm;
    const xMm  = xMin + (chartX / plotWidth) * (xMax - xMin);
    onHoveredX?.(xMm);
  }, [points, onHoveredX]);

  // Recharts data: include all raw fields so the tooltip can read them
  const chartData = points.map(p => ({
    xPhys_mm: +p.xPhys_mm.toFixed(2),
    qMW:      +(p.heatFlux / HEAT_FLUX_DISPLAY_DIVISOR).toFixed(4),
    // raw values for tooltip
    heatFlux: p.heatFlux,
    hg:       p.hg,
    T_aw:     p.T_aw,
    T_gas:    p.T_gas,
  }));

  const yMax = +(heatFluxProfile.maxHeatFlux / HEAT_FLUX_DISPLAY_DIVISOR * 1.1).toFixed(2);

  return (
    <div className="hfp-wrapper">
      <div className="hfp-header">
        <span className="hfp-title">HEAT FLUX DISTRIBUTION</span>
        <span className="hfp-subtitle">T<sub>wall</sub> = {wallTempK} K · Bartz correlation</span>
        <MuiTooltip
          placement="left"
          arrow
          title={
            <div style={{ maxWidth: 280, lineHeight: 1.6 }}>
              <strong>How to read this chart</strong><br />
              The curve shows convective heat flux (q) along the nozzle axis from the
              chamber entrance to the nozzle exit. Heat flux peaks at the <em>throat</em>
              (dashed cyan line) — the narrowest point where gas velocity is highest.<br /><br />
              <strong>Hover</strong> any point to see the heat transfer coefficient (h_g),
              adiabatic wall temperature (T_aw), and local gas temperature. The corresponding
              nozzle cross-section is highlighted on the engine view above.<br /><br />
              Drag the <strong>T_wall slider</strong> to simulate different wall cooling
              levels — lower T_wall means a colder, actively-cooled wall and a higher heat load.
            </div>
          }
        >
          <InfoOutlinedIcon sx={{ fontSize: 14, color: 'rgba(0,229,255,0.55)', cursor: 'help', marginLeft: 'auto' }} />
        </MuiTooltip>
      </div>
      <div
        ref={chartAreaRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onHoveredX?.(null)}
        style={{ width: '100%' }}
      >
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart
          data={chartData}
          margin={{ top: 8, right: CHART_MARGIN_RIGHT, left: CHART_MARGIN_LEFT, bottom: 24 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.08)" />
          <XAxis
            dataKey="xPhys_mm"
            type="number"
            domain={['dataMin', 'dataMax']}
            label={{ value: 'Axial Position (mm)', position: 'insideBottom', offset: -12, fill: 'rgba(200,220,230,0.7)', fontSize: 11 }}
            tick={{ fill: 'rgba(200,220,230,0.6)', fontSize: 10 }}
            tickLine={{ stroke: 'rgba(200,220,230,0.3)' }}
            axisLine={{ stroke: 'rgba(0,229,255,0.2)' }}
          />
          <YAxis
            domain={[0, yMax]}
            label={{ value: 'q (MW/m²)', angle: -90, position: 'insideLeft', offset: 12, fill: 'rgba(200,220,230,0.7)', fontSize: 11 }}
            tick={{ fill: 'rgba(200,220,230,0.6)', fontSize: 10 }}
            tickLine={{ stroke: 'rgba(200,220,230,0.3)' }}
            axisLine={{ stroke: 'rgba(0,229,255,0.2)' }}
            width={55}
          />
          <Tooltip content={<HeatFluxTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="line"
            wrapperStyle={{ fontSize: 10, color: 'rgba(200,220,230,0.7)', paddingBottom: 4 }}
          />
          <ReferenceLine
            x={+throatXPhys.toFixed(2)}
            stroke="#00e5ff"
            strokeDasharray="4 3"
            strokeWidth={1.2}
            label={{ value: 'Throat', position: 'top', fill: '#00e5ff', fontSize: 9 }}
          />
          <Line
            name="Heat Flux"
            type="monotone"
            dataKey="qMW"
            stroke="#ff6b35"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#ff6b35', stroke: '#fff', strokeWidth: 1 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
