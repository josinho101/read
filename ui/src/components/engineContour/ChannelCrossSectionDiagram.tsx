import type { RegenChannelParams } from './regenCooling';

interface Props {
  params: RegenChannelParams;
  peakHotWallTempK?: number;
}

// Maps a temperature to a color in the orange-red range
function wallTempColor(tempK: number): string {
  // 400 K (cool) → orange-yellow, 1200 K (hot) → bright red
  const t = Math.min(1, Math.max(0, (tempK - 400) / 800));
  const r = 255;
  const g = Math.round(180 * (1 - t));
  const b = 0;
  return `rgb(${r},${g},${b})`;
}

export default function ChannelCrossSectionDiagram({ params, peakHotWallTempK }: Props) {
  const SVG_W = 160;
  const SVG_H = 80;
  const PADDING = 10;

  const totalW = SVG_W - PADDING * 2;
  const totalH = SVG_H - PADDING * 2;

  // Proportional sizes relative to channel + wall
  const wallH    = Math.min(params.wallThicknessMm, 5);
  const chanH    = Math.min(params.channelHeightMm, 5);
  const totalMm  = wallH + chanH + 4; // 4 mm backing assumed

  const wallPx   = (wallH / totalMm) * totalH;
  const chanPx   = (chanH / totalMm) * totalH;
  const backPx   = totalH - wallPx - chanPx;

  // Channel width as fraction of available width (show ~3 channels for context)
  const chanWMm  = Math.min(params.channelWidthMm, 5);
  const finWMm   = Math.max(params.channelWidthMm * 0.4, 0.5);
  const pitchMm  = chanWMm + finWMm;
  const nVisible = Math.min(3, Math.floor((totalW * 0.9) / ((chanWMm / pitchMm) * totalW / 3)));
  const unitPx   = totalW / (nVisible * pitchMm);
  const chanPxW  = chanWMm * unitPx;
  const finPxW   = finWMm  * unitPx;

  const hotColor  = peakHotWallTempK ? wallTempColor(peakHotWallTempK) : 'rgba(255,140,0,0.6)';
  const topY      = PADDING;
  const wallY     = topY;
  const chanY     = topY + wallPx;
  const backY     = chanY + chanPx;

  const channels: number[] = [];
  let xPos = PADDING;
  for (let i = 0; i < nVisible; i++) {
    channels.push(xPos + finPxW / 2);
    xPos += chanPxW + finPxW;
  }
  const usedW = xPos - PADDING - finPxW / 2;

  return (
    <svg
      width={SVG_W}
      height={SVG_H}
      style={{ display: 'block', margin: '4px auto', overflow: 'visible' }}
      aria-label="Channel cross-section diagram"
    >
      {/* Hot gas zone (above) */}
      <defs>
        <linearGradient id="gasGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,100,30,0)" />
          <stop offset="100%" stopColor="rgba(255,80,20,0.35)" />
        </linearGradient>
      </defs>
      <rect x={PADDING} y={0} width={totalW} height={PADDING} fill="url(#gasGrad)" />

      {/* Hot wall layer */}
      <rect
        x={PADDING} y={wallY}
        width={totalW} height={wallPx}
        fill={hotColor}
        opacity={0.85}
        rx={1}
      />

      {/* Coolant channels (blue rectangles) and fins (dark) */}
      {channels.map((cx, i) => (
        <rect
          key={i}
          x={cx} y={chanY}
          width={chanPxW} height={chanPx}
          fill="rgba(0,180,255,0.55)"
          stroke="rgba(0,229,255,0.4)"
          strokeWidth={0.8}
          rx={1}
        />
      ))}

      {/* Backing wall (dark) */}
      <rect
        x={PADDING} y={backY}
        width={usedW + finPxW / 2} height={backPx}
        fill="rgba(40,60,80,0.8)"
        rx={1}
      />

      {/* Labels */}
      <text x={PADDING + totalW + 3} y={wallY + wallPx / 2 + 3}
        fontSize={8} fill="rgba(255,180,60,0.85)" fontFamily="monospace">T_hw</text>
      <text x={PADDING + totalW + 3} y={chanY + chanPx / 2 + 3}
        fontSize={8} fill="rgba(0,229,255,0.85)" fontFamily="monospace">coolant</text>

      {/* Hot-gas arrow indicator */}
      <text x={PADDING + 4} y={8}
        fontSize={7} fill="rgba(255,120,40,0.7)" fontFamily="monospace">hot gas ↓</text>
    </svg>
  );
}
