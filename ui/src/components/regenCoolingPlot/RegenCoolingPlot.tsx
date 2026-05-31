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
import type { RegenResult, RegenChannelParams } from '../engineContour/regenCooling';
import type { HeatFluxProfile } from '../engineContour/bartzHeatFlux';
import { HEAT_FLUX_DISPLAY_DIVISOR, REGEN_WALL_TEMP_LIMIT_K } from '../engineContour/bartzConstants';
import './RegenCoolingPlot.css';

interface Props {
  regenResult:    RegenResult;
  heatFluxProfile: HeatFluxProfile;
  channelParams:  RegenChannelParams;
  wallTempK:      number;
}

interface TooltipPayloadItem {
  name:  string;
  value: number;
  color: string;
  payload: Record<string, number>;
}

interface CustomTooltipProps {
  active?:  boolean;
  payload?: TooltipPayloadItem[];
  label?:   number;
}

function RegenTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const raw = payload[0]?.payload ?? {};
  return (
    <div className="rcp-tooltip">
      <div className="rcp-tooltip-row rcp-tooltip-header">
        Axial position: <span>{(label ?? 0).toFixed(1)} mm</span>
      </div>
      {raw.T_hot !== undefined && (
        <div className="rcp-tooltip-row">
          T<sub>hw</sub> <span style={{ color: '#ff4444' }}>{raw.T_hot.toFixed(0)} K</span>
        </div>
      )}
      {raw.T_cold !== undefined && (
        <div className="rcp-tooltip-row">
          T<sub>cw</sub> <span style={{ color: '#00e5ff' }}>{raw.T_cold.toFixed(0)} K</span>
        </div>
      )}
      {raw.T_cool !== undefined && (
        <div className="rcp-tooltip-row">
          T<sub>coolant</sub> <span style={{ color: '#69ff47' }}>{raw.T_cool.toFixed(0)} K</span>
        </div>
      )}
      {raw.qMW !== undefined && (
        <div className="rcp-tooltip-row">
          q <span style={{ color: '#ff6b35' }}>{raw.qMW.toFixed(3)} MW/m²</span>
        </div>
      )}
    </div>
  );
}

export default function RegenCoolingPlot({ regenResult, heatFluxProfile, channelParams }: Props) {
  const { points: regenPoints, maxHotWallTemp_K, exitCoolantTemp_K, totalDeltaP_bar } = regenResult;
  const { throatXPhys } = heatFluxProfile;

  const tempLimit = REGEN_WALL_TEMP_LIMIT_K[channelParams.wallMaterial] ?? 1200;
  const overTemp  = maxHotWallTemp_K > tempLimit;

  // Merge regen points with Bartz heat flux by xPhys_mm
  const hfMap = new Map(heatFluxProfile.points.map(p => [+p.xPhys_mm.toFixed(2), p.heatFlux]));
  const chartData = regenPoints.map(p => ({
    xPhys_mm: +p.xPhys_mm.toFixed(2),
    T_hot:    +p.T_hot_wall_K.toFixed(1),
    T_cold:   +p.T_cold_wall_K.toFixed(1),
    T_cool:   +p.T_coolant_K.toFixed(1),
    qMW:      +((hfMap.get(+p.xPhys_mm.toFixed(2)) ?? 0) / HEAT_FLUX_DISPLAY_DIVISOR).toFixed(4),
  }));

  const tempMax = Math.ceil(Math.max(...regenPoints.map(p => p.T_hot_wall_K)) * 1.1 / 100) * 100;
  const qMax    = +(Math.max(...chartData.map(d => d.qMW)) * 1.1).toFixed(2);

  const materialLabel = channelParams.wallMaterial === 'copper' ? 'Copper'
    : channelParams.wallMaterial === 'steel' ? 'Steel 304' : 'Inconel 718';

  return (
    <div className="rcp-wrapper">
      <div className="rcp-header">
        <span className="rcp-title">REGENERATIVE COOLING</span>
        <span className="rcp-subtitle">
          {channelParams.numChannels} ch · {channelParams.channelWidthMm.toFixed(1)}×{channelParams.channelHeightMm.toFixed(1)} mm · {materialLabel}
          &nbsp;·&nbsp;ΔP = {totalDeltaP_bar.toFixed(2)} bar
          &nbsp;·&nbsp;T<sub>out</sub> = {exitCoolantTemp_K.toFixed(0)} K
        </span>
        <MuiTooltip
          placement="left"
          arrow
          title={
            <div style={{ maxWidth: 280, lineHeight: 1.6 }}>
              <strong>Regenerative cooling analysis</strong><br />
              Shows hot-wall temperature (T<sub>hw</sub>), cold-wall temperature (T<sub>cw</sub>),
              and bulk coolant temperature (T<sub>coolant</sub>) along the nozzle axis.<br /><br />
              Coolant flows <em>counter-current</em> — entering at the nozzle exit and exiting near
              the chamber face. The dashed orange curve shows the gas-side Bartz heat flux
              (right axis).<br /><br />
              Adjust channel geometry sliders to explore the design space. The warning banner
              appears when T<sub>hw</sub> exceeds the material's continuous-use limit.
            </div>
          }
        >
          <InfoOutlinedIcon sx={{ fontSize: 14, color: 'rgba(0,229,255,0.55)', cursor: 'help', marginLeft: 'auto' }} />
        </MuiTooltip>
      </div>

      {overTemp && (
        <div className="rcp-warning">
          ⚠ T<sub>hw</sub> = {maxHotWallTemp_K.toFixed(0)} K exceeds {materialLabel} limit ({tempLimit} K) — increase channel count or reduce wall thickness
        </div>
      )}

      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 50, left: 8, bottom: 24 }}>
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
          {/* Left Y-axis: temperatures */}
          <YAxis
            yAxisId="temp"
            domain={[0, tempMax]}
            label={{ value: 'Temperature (K)', angle: -90, position: 'insideLeft', offset: 14, fill: 'rgba(200,220,230,0.7)', fontSize: 11 }}
            tick={{ fill: 'rgba(200,220,230,0.6)', fontSize: 10 }}
            tickLine={{ stroke: 'rgba(200,220,230,0.3)' }}
            axisLine={{ stroke: 'rgba(0,229,255,0.2)' }}
            width={55}
          />
          {/* Right Y-axis: heat flux */}
          <YAxis
            yAxisId="flux"
            orientation="right"
            domain={[0, qMax]}
            label={{ value: 'q (MW/m²)', angle: 90, position: 'insideRight', offset: 14, fill: 'rgba(200,220,230,0.7)', fontSize: 11 }}
            tick={{ fill: 'rgba(200,220,230,0.6)', fontSize: 10 }}
            tickLine={{ stroke: 'rgba(200,220,230,0.3)' }}
            axisLine={{ stroke: 'rgba(0,229,255,0.2)' }}
            width={48}
          />
          <Tooltip content={<RegenTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="line"
            wrapperStyle={{ fontSize: 10, color: 'rgba(200,220,230,0.7)', paddingBottom: 4 }}
          />
          <ReferenceLine
            yAxisId="temp"
            x={+throatXPhys.toFixed(2)}
            stroke="#00e5ff"
            strokeDasharray="4 3"
            strokeWidth={1.2}
            label={{ value: 'Throat', position: 'top', fill: '#00e5ff', fontSize: 9 }}
          />
          <Line yAxisId="temp" name="T_hw" type="monotone" dataKey="T_hot"
            stroke="#ff4444" strokeWidth={2} dot={false}
            activeDot={{ r: 4, fill: '#ff4444', stroke: '#fff', strokeWidth: 1 }} />
          <Line yAxisId="temp" name="T_cw" type="monotone" dataKey="T_cold"
            stroke="#00e5ff" strokeWidth={1.5} dot={false}
            activeDot={{ r: 4, fill: '#00e5ff', stroke: '#fff', strokeWidth: 1 }} />
          <Line yAxisId="temp" name="T_coolant" type="monotone" dataKey="T_cool"
            stroke="#69ff47" strokeWidth={1.5} dot={false}
            activeDot={{ r: 4, fill: '#69ff47', stroke: '#fff', strokeWidth: 1 }} />
          <Line yAxisId="flux" name="q (Bartz)" type="monotone" dataKey="qMW"
            stroke="#ff6b35" strokeWidth={1.5} strokeDasharray="5 3" dot={false}
            activeDot={{ r: 3, fill: '#ff6b35' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
