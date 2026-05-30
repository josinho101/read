import { type FlowProfile, type FlowProperty, flowColor } from './isentropicFlow';

const DEG = Math.PI / 180;

export interface PlumeParams {
  exitX: number;
  exitTopY: number;
  exitBotY: number;
  midY: number;
  exitMach: number;
  exitPressurePa: number;
  exitTempK: number;
  gamma: number;
  ambientPressurePa: number;
  exitAngleRad: number;
  plumeLength: number;
}

export type PlumeRegime = 'under' | 'over' | 'matched';

export interface DiamondNode {
  x: number;
  halfWidth: number;
  halfHeight: number;
  intensity: number;
}

export interface PlumeGeometry {
  regime: PlumeRegime;
  pressureRatio: number;
  boundary: { x: number; yTop: number; yBot: number }[];
  diamonds: DiamondNode[];
}

export function computePlumeGeometry(p: PlumeParams): PlumeGeometry {
  const { exitX, exitTopY, exitBotY, midY, exitMach, exitPressurePa,
          ambientPressurePa, exitAngleRad, plumeLength } = p;

  const pressureRatio = exitPressurePa / Math.max(ambientPressurePa, 1);
  const regime: PlumeRegime =
    exitMach <= 1 || pressureRatio < 0 ? 'matched' :
    pressureRatio > 1.05 ? 'under' :
    pressureRatio < 0.95 ? 'over' : 'matched';

  const exitHalfH = midY - exitTopY;  // exit radius in canvas px

  let boundaryAngleRad: number;
  let pinchD = 0;
  let pinchHalfH = 0;
  let reexpansionAngleRad = 0;

  if (regime === 'under') {
    const extraDeg = Math.min(25, (pressureRatio - 1) * 18);
    boundaryAngleRad = exitAngleRad + extraDeg * DEG;
  } else if (regime === 'over') {
    const shockAngleDeg = Math.min(30, (1 - pressureRatio) * 22);
    boundaryAngleRad = -shockAngleDeg * DEG;
    pinchHalfH = Math.max(exitHalfH * 0.25, exitHalfH - plumeLength * 0.3 * Math.tan(shockAngleDeg * DEG));
    pinchD = (exitHalfH - pinchHalfH) / Math.tan(shockAngleDeg * DEG);
    reexpansionAngleRad = exitAngleRad;
  } else {
    boundaryAngleRad = exitAngleRad;
  }

  const N = 60;
  const boundary: { x: number; yTop: number; yBot: number }[] = [];

  for (let i = 0; i <= N; i++) {
    const d = (i / N) * plumeLength;
    const x = exitX + d;
    let halfH: number;

    if (regime === 'over') {
      if (d < pinchD) {
        halfH = exitHalfH + d * Math.tan(boundaryAngleRad);
      } else {
        halfH = pinchHalfH + (d - pinchD) * Math.tan(reexpansionAngleRad);
      }
      halfH = Math.max(halfH, exitHalfH * 0.2);
    } else {
      halfH = exitHalfH + d * Math.tan(boundaryAngleRad);
      halfH = Math.max(halfH, exitHalfH * 0.15);
    }

    boundary.push({ x, yTop: midY - halfH, yBot: midY + halfH });
  }

  // Shock diamonds (under/over expanded)
  const diamonds: DiamondNode[] = [];
  if (regime !== 'matched' && exitHalfH > 0) {
    const dExitCanvas = exitHalfH * 2;
    const cellLen = Math.max(20, 0.65 * dExitCanvas * Math.sqrt(Math.max(pressureRatio, 1 / pressureRatio)));
    const nDiamonds = Math.min(5, Math.floor(plumeLength / cellLen));
    for (let i = 0; i < nDiamonds; i++) {
      const cx = exitX + (i + 0.5) * cellLen;
      const boundaryIdx = Math.round(((i + 0.5) * cellLen / plumeLength) * N);
      const bpt = boundary[Math.min(boundaryIdx, N)];
      const bHalfH = bpt ? midY - bpt.yTop : exitHalfH;
      diamonds.push({
        x: cx,
        halfWidth: cellLen * 0.45,
        halfHeight: bHalfH * 0.55,
        intensity: Math.pow(0.65, i),
      });
    }
  }

  return { regime, pressureRatio, boundary, diamonds };
}

function buildBoundaryPath(
  ctx: CanvasRenderingContext2D,
  boundary: PlumeGeometry['boundary'],
  midY: number,
) {
  if (boundary.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(boundary[0].x, boundary[0].yTop);
  for (let i = 1; i < boundary.length; i++) ctx.lineTo(boundary[i].x, boundary[i].yTop);
  for (let i = boundary.length - 1; i >= 0; i--) ctx.lineTo(boundary[i].x, boundary[i].yBot);
  ctx.closePath();
}

export function drawPlume(
  ctx: CanvasRenderingContext2D,
  geom: PlumeGeometry,
  params: PlumeParams,
  _property: FlowProperty,
  profile: FlowProfile,
): void {
  const { boundary, diamonds, regime } = geom;
  const { exitX, midY, plumeLength, exitTempK, gamma, exitPressurePa, ambientPressurePa } = params;
  if (boundary.length < 2) return;

  const lastPt = profile.points[profile.points.length - 1];

  // Downstream temperature estimate (isentropic expansion to ambient)
  const pRatio = Math.max(0.01, Math.min(100, exitPressurePa / Math.max(ambientPressurePa, 1)));
  const downstreamT = exitTempK * Math.pow(1 / pRatio, (gamma - 1) / gamma);
  const minT = Math.min(profile.minT, downstreamT);
  const maxT = Math.max(profile.maxT, lastPt.temperature);

  const exitColor = flowColor(lastPt.temperature, minT, maxT);
  const coolColor  = flowColor(downstreamT, minT, maxT);

  ctx.save();

  // 1. Heatmap fill clipped to boundary polygon
  ctx.save();
  buildBoundaryPath(ctx, boundary, midY);
  ctx.clip();
  const grad = ctx.createLinearGradient(exitX, 0, exitX + plumeLength, 0);
  grad.addColorStop(0, exitColor);
  grad.addColorStop(1, coolColor);
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.5;
  const minY = Math.min(...boundary.map(b => b.yTop));
  const maxY = Math.max(...boundary.map(b => b.yBot));
  ctx.fillRect(exitX, minY, plumeLength, maxY - minY);
  ctx.restore();

  // 2. Boundary glow lines
  const bColor = regime === 'matched' ? 'rgba(255,160,50,0.7)' : 'rgba(255,80,20,0.65)';
  const passes = [
    { w: 7, a: 0.08 },
    { w: 3.5, a: 0.18 },
    { w: 1.5, a: 0.75 },
  ];
  for (const { w, a } of passes) {
    ctx.save();
    ctx.strokeStyle = bColor;
    ctx.lineWidth = w;
    ctx.globalAlpha = a;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.setLineDash([]);
    // top boundary
    ctx.beginPath();
    ctx.moveTo(boundary[0].x, boundary[0].yTop);
    for (let i = 1; i < boundary.length; i++) ctx.lineTo(boundary[i].x, boundary[i].yTop);
    ctx.stroke();
    // bottom boundary (mirrored)
    ctx.beginPath();
    ctx.moveTo(boundary[0].x, boundary[0].yBot);
    for (let i = 1; i < boundary.length; i++) ctx.lineTo(boundary[i].x, boundary[i].yBot);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Shock diamond overlays
  if (diamonds.length > 0) {
    for (const d of diamonds) {
      // upper diamond (above axis)
      const cx = d.x;
      const hH = d.halfHeight;
      const hW = d.halfWidth;

      ctx.save();
      ctx.globalAlpha = d.intensity * 0.15;
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.beginPath();
      ctx.moveTo(cx - hW, midY);
      ctx.lineTo(cx, midY - hH);
      ctx.lineTo(cx + hW, midY);
      ctx.lineTo(cx, midY + hH);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = d.intensity * 0.45;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(cx - hW, midY);
      ctx.lineTo(cx, midY - hH);
      ctx.lineTo(cx + hW, midY);
      ctx.lineTo(cx, midY + hH);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // Over-expanded: normal shock bar
      if (regime === 'over') {
        const bIdx = Math.round(((cx - params.exitX) / plumeLength) * (boundary.length - 1));
        const bpt = boundary[Math.min(Math.max(bIdx, 0), boundary.length - 1)];
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.globalAlpha = d.intensity * 0.45;
        ctx.beginPath();
        ctx.moveTo(cx, bpt.yTop);
        ctx.lineTo(cx, bpt.yBot);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // 4. Axial core glow
  ctx.save();
  const coreLen = plumeLength * 0.7;
  const coreGrad = ctx.createLinearGradient(exitX, midY, exitX + coreLen, midY);
  coreGrad.addColorStop(0, 'rgba(255,240,180,0.55)');
  coreGrad.addColorStop(0.5, 'rgba(255,160,60,0.25)');
  coreGrad.addColorStop(1, 'rgba(255,100,20,0)');
  ctx.strokeStyle = coreGrad;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(exitX, midY);
  ctx.lineTo(exitX + coreLen, midY);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}
