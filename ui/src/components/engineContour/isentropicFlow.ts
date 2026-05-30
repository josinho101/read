const DEG         = Math.PI / 180;
const LOG_W       = 1140;
const LOG_H       = 580;
const R_UNIVERSAL = 8314; // J/(kmol·K)

const COLORSTOPS: [number, [number, number, number]][] = [
  [0.00, [ 26,   0, 255]],
  [0.20, [  0, 180, 255]],
  [0.40, [  0, 255, 128]],
  [0.60, [255, 255,   0]],
  [0.80, [255, 128,   0]],
  [1.00, [255,   0,   0]],
];

export type NozzleType   = 'bell' | 'conical';
export type FlowProperty = 'mach' | 'pressure' | 'temperature' | 'velocity';

export interface EngineGeometry {
  Rc: number; Rt: number; Re: number;
  CR: number;
  Lconv: number; Lc_cyl: number;
  Ldiv_ref: number; Ln_bell: number;
  nozzleLen: number;
  xConvStart: number; xThroat: number; xExit: number;
  tNDeg: number; tEDeg: number;
  ccx1: number; ccy1: number;
  ccx2: number; ccy2: number;
  bp1x: number; bp1r: number;
  bp2x: number; bp2r: number;
  midY: number; pT: number;
  sy: number;
  px:  (x: number) => number;
  pt:  (r: number) => number;
  pb:  (r: number) => number;
  mir: (y: number) => number;
}

export interface FlowPoint {
  xLog: number;
  mach: number;
  pressure: number;
  temperature: number;
  velocity: number;
  topY: number;
  botY: number;
}

export interface FlowProfile {
  points: FlowPoint[];
  minMach: number; maxMach: number;
  minP: number;    maxP: number;
  minT: number;    maxT: number;
  minV: number;    maxV: number;
}

// ── Geometry ─────────────────────────────────────────────────────────────────

export function computeGeometry(
  nozzleType: NozzleType,
  Rc: number, Rt: number, Re: number,
  expansionRatio: number,
  contractionRatio: number,
): EngineGeometry {
  const CR       = Math.max(contractionRatio, 1.1);
  const Lconv    = (Rc - Rt) / Math.tan(30 * DEG);
  const Lc_cyl   = Math.max(Rt * 2, 1000 / CR - Lconv);
  const Ldiv_ref = (Re - Rt) / Math.tan(15 * DEG);
  const Ln_bell  = 0.8 * Ldiv_ref;
  const tNDeg    = 25;
  const tEDeg    = +Math.max(7, 15 - (expansionRatio - 1) * 0.3).toFixed(1);
  const nozzleLen  = nozzleType === 'bell' ? Ln_bell : Ldiv_ref;
  const xConvStart = Lc_cyl;
  const xThroat    = Lc_cyl + Lconv;
  const xExit      = xThroat + nozzleLen;

  const pL = 130, pT = 85, pB = 115;
  const drawW = LOG_W - pL - 55;
  const drawH = LOG_H - pT - pB;
  const midY  = pT + drawH / 2;

  const sx = drawW / xExit;
  const sy = (drawH / 2) / (Math.max(Rc, Re) * 1.25);

  const px  = (x: number) => pL + x * sx;
  const pt  = (r: number) => midY - r * sy;
  const pb  = (r: number) => midY + r * sy;
  const mir = (y: number) => 2 * midY - y;

  const ccx1 = px(xConvStart) + 0.22 * (px(xThroat) - px(xConvStart));
  const ccy1 = pt(Rc);
  const ccx2 = px(xThroat) - 0.10 * (px(xThroat) - px(xConvStart));
  const ccy2 = pt(Rt + (Rc - Rt) * 0.08);

  const bDx  = xExit - xThroat;
  const bDy  = Re    - Rt;
  const bLen = Math.sqrt(bDx * bDx + bDy * bDy);
  const bp1x = xThroat + Math.cos(tNDeg * DEG) * bLen * 0.38;
  const bp1r = Rt      + Math.sin(tNDeg * DEG) * bLen * 0.38;
  const bp2x = xExit   - Math.cos(tEDeg * DEG) * bLen * 0.38;
  const bp2r = Re      - Math.sin(tEDeg * DEG) * bLen * 0.38;

  return {
    Rc, Rt, Re,
    CR, Lconv, Lc_cyl, Ldiv_ref, Ln_bell,
    nozzleLen, xConvStart, xThroat, xExit,
    tNDeg, tEDeg,
    ccx1, ccy1, ccx2, ccy2,
    bp1x, bp1r, bp2x, bp2r,
    midY, pT, sy,
    px, pt, pb, mir,
  };
}

// ── Isentropic flow math ──────────────────────────────────────────────────────

function areaRatioFn(M: number, gamma: number): number {
  const t   = (2 / (gamma + 1)) * (1 + (gamma - 1) / 2 * M * M);
  const exp = (gamma + 1) / (2 * (gamma - 1));
  return (1 / M) * Math.pow(t, exp);
}

function solveMach(AR: number, gamma: number, supersonic: boolean): number {
  if (AR <= 1.0) return 1.0;
  let M = supersonic ? 1.5 + (AR - 1) * 0.5 : 0.5 / AR;
  for (let i = 0; i < 50; i++) {
    const f   = areaRatioFn(M, gamma) - AR;
    const t   = 1 + (gamma - 1) / 2 * M * M;
    const exp = (gamma + 1) / (2 * (gamma - 1));
    const dfdM =
      (-1 / (M * M)) * Math.pow((2 / (gamma + 1)) * t, exp) +
      (1 / M) * exp * Math.pow((2 / (gamma + 1)) * t, exp - 1) *
      (2 / (gamma + 1)) * (gamma - 1) * M;
    const dM = f / dfdM;
    M = Math.max(1e-6, M - dM);
    if (Math.abs(dM) < 1e-8) break;
  }
  return M;
}

function localFlowProps(M: number, gamma: number, Pc_Pa: number, Tc_K: number, MW: number) {
  const factor = 1 + (gamma - 1) / 2 * M * M;
  const T = Tc_K / factor;
  const P = Pc_Pa * Math.pow(factor, -gamma / (gamma - 1));
  const V = M * Math.sqrt(gamma * R_UNIVERSAL / MW * T);
  return { pressure: P, temperature: T, velocity: V };
}

// ── Wall profile sampling ─────────────────────────────────────────────────────

function cubicBez(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function sampleWallProfile(
  geom: EngineGeometry,
  nozzleType: NozzleType,
): { xLog: number; topY: number; botY: number }[] {
  const { px, pt, pb, midY, Rc, Rt, Re, xConvStart, xThroat, xExit,
          ccx1, ccy1, ccx2, ccy2, bp1x, bp1r, bp2x, bp2r } = geom;
  const pts: { xLog: number; topY: number; botY: number }[] = [];

  // Cylindrical chamber
  for (let i = 0; i <= 20; i++) {
    pts.push({ xLog: px((i / 20) * xConvStart), topY: pt(Rc), botY: pb(Rc) });
  }
  // Convergent Bézier (skip i=0 to avoid duplicate at xConvStart)
  for (let i = 1; i <= 40; i++) {
    const t    = i / 40;
    const xLog = cubicBez(t, px(xConvStart), ccx1, ccx2, px(xThroat));
    const topY = cubicBez(t, pt(Rc), ccy1, ccy2, pt(Rt));
    pts.push({ xLog, topY, botY: 2 * midY - topY });
  }
  // Divergent (skip i=0 to avoid duplicate at throat)
  for (let i = 1; i <= 60; i++) {
    const t = i / 60;
    let xLog: number, topY: number;
    if (nozzleType === 'bell') {
      xLog = cubicBez(t, px(xThroat), px(bp1x), px(bp2x), px(xExit));
      topY = cubicBez(t, pt(Rt), pt(bp1r), pt(bp2r), pt(Re));
    } else {
      xLog = px(xThroat) + t * (px(xExit) - px(xThroat));
      topY = pt(Rt) + t * (pt(Re) - pt(Rt));
    }
    pts.push({ xLog, topY, botY: 2 * midY - topY });
  }
  return pts;
}

export function buildFlowProfile(
  nozzleType: NozzleType,
  geom: EngineGeometry,
  gamma: number,
  Pc_Pa: number,
  Tc_K: number,
  MW: number,
): FlowProfile {
  const { px, pt, midY, xThroat, Rt } = geom;
  const xThroatLog = px(xThroat);
  const rThroatPx  = midY - pt(Rt);

  const wallPts = sampleWallProfile(geom, nozzleType);
  const points: FlowPoint[] = wallPts.map(wp => {
    const rPx = midY - wp.topY;
    const AR  = Math.max(1.0, (rPx / rThroatPx) ** 2);
    const M   = solveMach(AR, gamma, wp.xLog > xThroatLog);
    const p   = localFlowProps(M, gamma, Pc_Pa, Tc_K, MW);
    return { xLog: wp.xLog, mach: M, ...p, topY: wp.topY, botY: wp.botY };
  });

  const mn = (fn: (p: FlowPoint) => number) => Math.min(...points.map(fn));
  const mx = (fn: (p: FlowPoint) => number) => Math.max(...points.map(fn));
  return {
    points,
    minMach: mn(p => p.mach),        maxMach: mx(p => p.mach),
    minP:    mn(p => p.pressure),    maxP:    mx(p => p.pressure),
    minT:    mn(p => p.temperature), maxT:    mx(p => p.temperature),
    minV:    mn(p => p.velocity),    maxV:    mx(p => p.velocity),
  };
}

// ── Interpolation ─────────────────────────────────────────────────────────────

export function interpolateAt(profile: FlowProfile, xLog: number): FlowPoint {
  const pts = profile.points;
  if (xLog <= pts[0].xLog) return pts[0];
  if (xLog >= pts[pts.length - 1].xLog) return pts[pts.length - 1];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].xLog >= xLog) {
      const t  = (xLog - pts[i-1].xLog) / (pts[i].xLog - pts[i-1].xLog);
      const L  = (a: number, b: number) => a + t * (b - a);
      const a  = pts[i-1], b = pts[i];
      return {
        xLog,
        mach:        L(a.mach,        b.mach),
        pressure:    L(a.pressure,    b.pressure),
        temperature: L(a.temperature, b.temperature),
        velocity:    L(a.velocity,    b.velocity),
        topY:        L(a.topY,        b.topY),
        botY:        L(a.botY,        b.botY),
      };
    }
  }
  return pts[pts.length - 1];
}

// ── Color utilities ───────────────────────────────────────────────────────────

export function flowColor(value: number, min: number, max: number): string {
  let t = max === min ? 0.5 : (value - min) / (max - min);
  t = Math.max(0, Math.min(1, t));
  for (let i = 0; i < COLORSTOPS.length - 1; i++) {
    const [t0, c0] = COLORSTOPS[i];
    const [t1, c1] = COLORSTOPS[i + 1];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0);
      const r = Math.round(c0[0] + f * (c1[0] - c0[0]));
      const g = Math.round(c0[1] + f * (c1[1] - c0[1]));
      const b = Math.round(c0[2] + f * (c1[2] - c0[2]));
      return `rgb(${r},${g},${b})`;
    }
  }
  return 'rgb(255,0,0)';
}

// ── Heatmap renderer ──────────────────────────────────────────────────────────

export function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  profile: FlowProfile,
  property: FlowProperty,
): void {
  const { points, minMach, maxMach, minP, maxP, minT, maxT, minV, maxV } = profile;
  if (points.length < 2) return;

  const [min, max] =
    property === 'mach'        ? [minMach, maxMach] :
    property === 'pressure'    ? [minP,    maxP]    :
    property === 'temperature' ? [minT,    maxT]    :
                                 [minV,    maxV];

  ctx.save();
  ctx.globalAlpha = 0.75;
  for (let i = 0; i < points.length - 1; i++) {
    const p  = points[i];
    const p1 = points[i + 1];
    const val =
      property === 'mach'        ? p.mach        :
      property === 'pressure'    ? p.pressure    :
      property === 'temperature' ? p.temperature :
                                   p.velocity;
    ctx.fillStyle = flowColor(val, min, max);
    ctx.fillRect(p.xLog, p.topY, p1.xLog - p.xLog + 0.5, p.botY - p.topY);
  }
  ctx.restore();
}

// ── Colorbar ─────────────────────────────────────────────────────────────────

const CB_W = 16;
const CB_H = 160;

function propLabel(property: FlowProperty): string {
  if (property === 'mach')        return 'MACH';
  if (property === 'pressure')    return 'P (kPa)';
  if (property === 'temperature') return 'T (K)';
  return 'V (m/s)';
}

function formatTick(value: number, property: FlowProperty): string {
  if (property === 'mach')        return value.toFixed(3);
  if (property === 'pressure')    return (value / 1000).toFixed(1);
  if (property === 'temperature') return value.toFixed(0);
  return value.toFixed(1);
}

function propRange(profile: FlowProfile, property: FlowProperty): [number, number] {
  if (property === 'mach')        return [profile.minMach, profile.maxMach];
  if (property === 'pressure')    return [profile.minP,    profile.maxP];
  if (property === 'temperature') return [profile.minT,    profile.maxT];
  return [profile.minV, profile.maxV];
}

export function drawColorbar(
  ctx: CanvasRenderingContext2D,
  cW: number, cH: number,
  profile: FlowProfile,
  property: FlowProperty,
): void {
  const x = cW - 105;
  const y = cH - CB_H - 34;

  const grad = ctx.createLinearGradient(0, y + CB_H, 0, y);
  COLORSTOPS.forEach(([t, [r, g, b]]) => grad.addColorStop(t, `rgb(${r},${g},${b})`));

  ctx.save();

  // Background panel
  ctx.fillStyle = 'rgba(5,14,24,0.82)';
  ctx.strokeStyle = 'rgba(0,229,255,0.22)';
  ctx.lineWidth = 0.8;
  const px = x - 8, py = y - 30, pw = CB_W + 76, ph = CB_H + 52;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 4);
  ctx.fill();
  ctx.stroke();

  // Gradient bar
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, CB_W, CB_H);
  ctx.strokeStyle = 'rgba(0,229,255,0.35)';
  ctx.strokeRect(x, y, CB_W, CB_H);

  // Property title
  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 9.5px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(propLabel(property), x, y - 15);

  // Tick labels
  const [min, max] = propRange(profile, property);
  ctx.font = '9px "Courier New", monospace';
  ctx.fillStyle = 'rgba(200,220,230,0.75)';
  for (let i = 0; i <= 4; i++) {
    const tickY = y + CB_H - i * (CB_H / 4);
    ctx.fillText(formatTick(min + (i / 4) * (max - min), property), x + CB_W + 5, tickY + 3);
  }

  ctx.restore();
}
