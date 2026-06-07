import { interpolateRaoAngles, RAO_LN_DEFAULT } from './raoContour';

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

export type NozzleType   = 'bell' | 'conical' | 'rao';
export type FlowProperty = 'mach' | 'pressure' | 'temperature' | 'velocity';

export interface AngleOverrides {
  convergentHalfDeg?: number;
  divergentRefDeg?: number;
  tNDeg?: number;
  tEDeg?: number;
  lnFraction?: number;  // Rao only — Ln/Lref, range 0.6–1.0, default 0.8
  cylindricalLengthMm?: number;  // from backend (L*-based); overrides heuristic when provided
  throatUpR?:      number;  // upstream (conv-side) throat fillet radius as × Rt, default 1.0
  throatDownR?:    number;  // downstream (div-side) throat fillet radius as × Rt, default 0.382
  chamberFilletR?: number;  // chamber-to-convergent fillet radius as × Rt, default 0.5
}

export interface EngineGeometry {
  Rc: number; Rt: number; Re: number;
  CR: number;
  Lconv: number; Lc_cyl: number;
  Ldiv_ref: number; Ln_bell: number;
  nozzleLen: number;
  xConvStart: number; xThroat: number; xExit: number;
  tNDeg: number; tEDeg: number;
  convergentHalfDeg: number; divergentHalfDeg: number;
  ccx1: number; ccy1: number;
  ccx2: number; ccy2: number;
  bp1x: number; bp1r: number;
  bp2x: number; bp2r: number;
  midY: number; pT: number;
  sx: number; sy: number;
  // throat arc geometry (all in mm)
  thrUpR: number; thrDownR: number;
  thrUpJctX: number; thrUpJctR: number;
  thrDownJctX: number; thrDownJctR: number;
  px:  (x: number) => number;
  pt:  (r: number) => number;
  pb:  (r: number) => number;
  mir: (y: number) => number;
}

export interface FlowPoint {
  xLog:        number;
  mach:        number;
  pressure:    number;
  temperature: number;
  velocity:    number;
  areaRatio:   number;  // A(x)/A_throat — stored so Bartz module avoids re-solving Mach
  topY:        number;
  botY:        number;
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
  angles?: AngleOverrides,
): EngineGeometry {
  const convergentHalfDeg = angles?.convergentHalfDeg ?? 30;
  const divergentHalfDeg  = angles?.divergentRefDeg   ?? 15;
  const CR       = Math.max(contractionRatio, 1.1);
  const Lconv    = (Rc - Rt) / Math.tan(convergentHalfDeg * DEG);
  const Lc_cyl   = angles?.cylindricalLengthMm != null
    ? Math.max(Rt * 2, angles.cylindricalLengthMm)
    : Math.max(Rt * 2, 1000 / CR - Lconv);
  const Ldiv_ref = (Re - Rt) / Math.tan(divergentHalfDeg * DEG);
  const Ln_bell    = 0.8 * Ldiv_ref;
  const lnFraction = angles?.lnFraction ?? RAO_LN_DEFAULT;
  const Ln_rao     = lnFraction * Ldiv_ref;
  const raoAngles  = nozzleType === 'rao' ? interpolateRaoAngles(expansionRatio, lnFraction) : null;
  const tNDeg      = raoAngles?.tN ?? angles?.tNDeg ?? 25;
  const tEDeg      = raoAngles?.tE ?? angles?.tEDeg ?? +Math.max(7, 15 - (expansionRatio - 1) * 0.3).toFixed(1);
  const nozzleLen  = nozzleType === 'conical' ? Ldiv_ref
                   : nozzleType === 'rao'     ? Ln_rao
                   :                           Ln_bell;
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

  // ── Throat arc radii ──────────────────────────────────────────────────────
  const junctionAngle = nozzleType === 'conical' ? divergentHalfDeg : tNDeg;

  // Clamp throat arc radii so junctions stay within their respective sections
  const thrUpRaw   = (angles?.throatUpR   ?? 1.0)   * Rt;
  const thrDownRaw = (angles?.throatDownR ?? 0.382)  * Rt;
  const thrUpR   = Math.min(thrUpRaw,   Lconv       / Math.sin(junctionAngle * DEG) * 0.9);
  const thrDownR = Math.min(thrDownRaw, nozzleLen   / Math.sin(junctionAngle * DEG) * 0.9);

  const thrUpJctX   = xThroat - thrUpR   * Math.sin(junctionAngle * DEG);
  const thrUpJctR   = Rt      + thrUpR   * (1 - Math.cos(junctionAngle * DEG));
  const thrDownJctX = xThroat + thrDownR * Math.sin(junctionAngle * DEG);
  const thrDownJctR = Rt      + thrDownR * (1 - Math.cos(junctionAngle * DEG));

  // ── Convergent Bézier (xConvStart → thrUpJct) — smooth bell, no fillet ──
  // Start tangent: horizontal (tangent to cylindrical chamber wall, 0°)
  // End tangent:   junctionAngle (tangent to upstream throat arc)
  const cDx  = thrUpJctX - xConvStart;
  const cDy  = Rc        - thrUpJctR;
  const cLen = Math.sqrt(cDx * cDx + cDy * cDy);
  const cp1x = xConvStart + cLen * 0.38;
  const cp1r = Rc;
  const cp2x = thrUpJctX - Math.cos(junctionAngle * DEG) * cLen * 0.38;
  const cp2r = thrUpJctR + Math.sin(junctionAngle * DEG) * cLen * 0.38;
  const ccx1 = px(cp1x);
  const ccy1 = pt(cp1r);
  const ccx2 = px(cp2x);
  const ccy2 = pt(cp2r);

  // ── Divergent Bézier (thrDownJct → xExit) ────────────────────────────────
  const bDx  = xExit        - thrDownJctX;
  const bDy  = Re            - thrDownJctR;
  const bLen = Math.sqrt(bDx * bDx + bDy * bDy);
  const bp1x = thrDownJctX  + Math.cos(tNDeg * DEG) * bLen * 0.38;
  const bp1r = thrDownJctR  + Math.sin(tNDeg * DEG) * bLen * 0.38;
  const bp2x = xExit        - Math.cos(tEDeg * DEG) * bLen * 0.38;
  const bp2r = Re            - Math.sin(tEDeg * DEG) * bLen * 0.38;

  return {
    Rc, Rt, Re,
    CR, Lconv, Lc_cyl, Ldiv_ref, Ln_bell,
    nozzleLen, xConvStart, xThroat, xExit,
    tNDeg, tEDeg, convergentHalfDeg, divergentHalfDeg,
    ccx1, ccy1, ccx2, ccy2,
    bp1x, bp1r, bp2x, bp2r,
    midY, pT, sx, sy,
    thrUpR, thrDownR,
    thrUpJctX, thrUpJctR,
    thrDownJctX, thrDownJctR,
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
          ccx1, ccy1, ccx2, ccy2, bp1x, bp1r, bp2x, bp2r,
          thrUpR, thrDownR,
          thrUpJctX, thrUpJctR, thrDownJctX, thrDownJctR,
          tNDeg, divergentHalfDeg } = geom;

  const junctionAngle = nozzleType === 'conical' ? divergentHalfDeg : tNDeg;
  const pts: { xLog: number; topY: number; botY: number }[] = [];

  const push = (xMm: number, rMm: number) =>
    pts.push({ xLog: px(xMm), topY: pt(rMm), botY: pb(rMm) });

  // ── Cylindrical chamber (x: 0 → xConvStart) ──────────────────────────────
  for (let i = 0; i <= 15; i++) {
    push((i / 15) * xConvStart, Rc);
  }

  // ── Convergent Bézier (xConvStart → thrUpJct) — smooth bell ──────────────
  for (let i = 1; i <= 30; i++) {
    const t    = i / 30;
    const xLog = cubicBez(t, px(xConvStart), ccx1, ccx2, px(thrUpJctX));
    const topY = cubicBez(t, pt(Rc),         ccy1, ccy2, pt(thrUpJctR));
    pts.push({ xLog, topY, botY: 2 * midY - topY });
  }

  // ── Upstream throat arc (thrUpJct → throat min) ───────────────────────────
  for (let i = 1; i <= 5; i++) {
    const φ = -junctionAngle * DEG + (i / 5) * junctionAngle * DEG;  // -junctionAngle → 0
    push(xThroat + thrUpR * Math.sin(φ), Rt + thrUpR * (1 - Math.cos(φ)));
  }

  // ── Downstream throat arc (throat min → thrDownJct) ───────────────────────
  for (let i = 1; i <= 5; i++) {
    const φ = (i / 5) * junctionAngle * DEG;  // 0 → junctionAngle
    push(xThroat + thrDownR * Math.sin(φ), Rt + thrDownR * (1 - Math.cos(φ)));
  }

  // ── Divergent (thrDownJct → xExit) ───────────────────────────────────────
  for (let i = 1; i <= 55; i++) {
    const t = i / 55;
    if (nozzleType === 'bell' || nozzleType === 'rao') {
      const xLog = cubicBez(t, px(thrDownJctX), px(bp1x), px(bp2x), px(xExit));
      const topY = cubicBez(t, pt(thrDownJctR), pt(bp1r), pt(bp2r), pt(Re));
      pts.push({ xLog, topY, botY: 2 * midY - topY });
    } else {
      push(
        thrDownJctX + t * (xExit - thrDownJctX),
        thrDownJctR + t * (Re    - thrDownJctR),
      );
    }
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
    return { xLog: wp.xLog, mach: M, ...p, areaRatio: AR, topY: wp.topY, botY: wp.botY };
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
        areaRatio:   L(a.areaRatio,   b.areaRatio),
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
  ctx:     CanvasRenderingContext2D,
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
  ctx:      CanvasRenderingContext2D,
  cW:       number,
  cH:       number,
  profile:  FlowProfile,
  property: FlowProperty,
): void {
  // Fixed-size panel anchored to bottom-right (mirrors left overlay at top: 12, left: 12)
  const PAD    = 8;
  const MARGIN = 12;
  const pw = 76;
  const ph = CB_H + 52;
  const px = cW - MARGIN - pw;
  const py = cH - MARGIN - ph;
  const x  = px + PAD;          // gradient bar left
  const y  = py + 30;           // gradient bar top

  const [min, max] = propRange(profile, property);
  const grad = ctx.createLinearGradient(0, y + CB_H, 0, y);
  COLORSTOPS.forEach(([t, [r, g, b]]) => grad.addColorStop(t, `rgb(${r},${g},${b})`));

  ctx.save();

  // Background panel
  ctx.fillStyle = 'rgba(5,14,24,0.82)';
  ctx.strokeStyle = 'rgba(0,229,255,0.22)';
  ctx.lineWidth = 0.8;
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
  ctx.font = '9px "Courier New", monospace';
  ctx.fillStyle = 'rgba(200,220,230,0.75)';
  for (let i = 0; i <= 4; i++) {
    const tickY = y + CB_H - i * (CB_H / 4);
    ctx.fillText(formatTick(min + (i / 4) * (max - min), property), x + CB_W + 5, tickY + 3);
  }

  ctx.restore();
}
