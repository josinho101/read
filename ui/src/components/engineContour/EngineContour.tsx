import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Switch, IconButton, Tooltip, Checkbox, Slider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestoreIcon from '@mui/icons-material/Restore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import {
  type NozzleType, type FlowProperty, type FlowProfile, type AngleOverrides,
  computeGeometry, buildFlowProfile,
  drawHeatmap, drawColorbar,
} from './isentropicFlow';
import { type Particle, initParticles, advanceParticles, drawParticles } from './flowParticles';
import {
  type PlumeParams, type PlumeGeometry,
  computePlumeGeometry, drawPlume,
} from './exhaustPlume';
import './EngineContour.css';

interface Props {
  chamberRadius: number;
  throatRadius: number;
  exitRadius: number;
  expansionRatio: number;
  contractionRatio: number;
  gamma?: number;
  chamberPressureBar?: number;
  chamberTemperatureK?: number;
  molecularWeightGMol?: number;
  exitPressureBar?: number;
  ambientPressureBar?: number;
}

const DEG   = Math.PI / 180;
const CYAN  = '#00e5ff';
const AMBER = '#ffb300';
const LOG_W = 1140;
const LOG_H = 580;

// ── Drawing helpers ──────────────────────────────────────────────────────────

function arrowHead(
  ctx: CanvasRenderingContext2D,
  fx: number, fy: number,
  tx: number, ty: number,
  color: string, size = 6,
) {
  const a = Math.atan2(ty - fy, tx - fx);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - size * Math.cos(a - Math.PI / 6), ty - size * Math.sin(a - Math.PI / 6));
  ctx.lineTo(tx - size * Math.cos(a + Math.PI / 6), ty - size * Math.sin(a + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function dimLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.save();
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 1.3;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  arrowHead(ctx, x2, y2, x1, y1, AMBER);
  arrowHead(ctx, x1, y1, x2, y2, AMBER);
  ctx.restore();
}

function extLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, alpha = 0.5) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}

function txt(
  ctx: CanvasRenderingContext2D,
  s: string, x: number, y: number,
  align: CanvasTextAlign = 'left',
  color = AMBER,
  size = 11,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${size}px "Courier New", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Full-canvas grid (drawn in world/pan-zoom space) ─────────────────────────

function drawFullGrid(
  ctx: CanvasRenderingContext2D,
  cW: number, cH: number,
  panX: number, panY: number, viewZoom: number,
) {
  const raw = 50 / viewZoom;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const frac = raw / mag;
  const spacing = frac < 2 ? mag : frac < 5 ? 2 * mag : 5 * mag;

  const vx0 = -panX / viewZoom;
  const vy0 = -panY / viewZoom;
  const vx1 = (cW - panX) / viewZoom;
  const vy1 = (cH - panY) / viewZoom;

  ctx.save();
  ctx.strokeStyle = CYAN;
  ctx.globalAlpha = 0.07;
  ctx.lineWidth = 0.5 / viewZoom;
  ctx.setLineDash([]);

  for (let x = Math.floor(vx0 / spacing) * spacing; x <= vx1; x += spacing) {
    ctx.beginPath(); ctx.moveTo(x, vy0); ctx.lineTo(x, vy1); ctx.stroke();
  }
  for (let y = Math.floor(vy0 / spacing) * spacing; y <= vy1; y += spacing) {
    ctx.beginPath(); ctx.moveTo(vx0, y); ctx.lineTo(vx1, y); ctx.stroke();
  }
  ctx.restore();
}

// ── Core render (operates in fixed 1140×580 logical space) ───────────────────

function renderEngine(
  ctx: CanvasRenderingContext2D,
  nozzleType: NozzleType,
  Rc: number, Rt: number, Re: number,
  expansionRatio: number,
  contractionRatio: number,
  showLabels: boolean,
  flowProfile?: FlowProfile,
  flowProperty?: FlowProperty,
  particles?: Particle[],
  angleOverrides?: AngleOverrides,
  plumeGeom?: PlumeGeometry,
  plumeParams?: PlumeParams,
) {
  const geom = computeGeometry(nozzleType, Rc, Rt, Re, expansionRatio, contractionRatio, angleOverrides);
  const {
    Lconv, Lc_cyl, Ln_bell,
    xConvStart, xThroat, xExit,
    tNDeg, tEDeg,
    convergentHalfDeg, divergentHalfDeg,
    ccx1, ccy1, ccx2, ccy2,
    bp1x, bp1r, bp2x, bp2r,
    midY, pT,
    px, pt, pb, mir,
  } = geom;

  const tConvDeg = convergentHalfDeg;

  // Dimension helpers
  const f1 = (mm: number) => (mm / 10).toFixed(1);
  const f2 = (mm: number) => (mm / 10).toFixed(2);
  const maxBotY = Math.max(pb(Rc), pb(Re));
  const dimY1   = maxBotY + 24;
  const dimY2   = maxBotY + 50;

  // ── Centerline ──────────────────────────────────────────────────────────
  const centerlineEnd = plumeParams ? plumeParams.exitX + plumeParams.plumeLength : px(xExit) + 20;
  ctx.save();
  ctx.strokeStyle = CYAN; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.35;
  ctx.setLineDash([10, 6]);
  ctx.beginPath(); ctx.moveTo(px(0) - 55, midY); ctx.lineTo(centerlineEnd, midY); ctx.stroke();
  ctx.restore();

  // ── Heatmap (before fill so glow shows on top) ───────────────────────────
  if (flowProfile && flowProperty) {
    drawHeatmap(ctx, flowProfile, flowProperty);
  }

  // ── Engine fill ──────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = flowProfile ? 0.02 : 0.04;
  ctx.fillStyle = CYAN;
  ctx.beginPath();
  ctx.moveTo(px(0), pt(Rc)); ctx.lineTo(px(xConvStart), pt(Rc));
  ctx.bezierCurveTo(ccx1, ccy1, ccx2, ccy2, px(xThroat), pt(Rt));
  nozzleType === 'bell'
    ? ctx.bezierCurveTo(px(bp1x), pt(bp1r), px(bp2x), pt(bp2r), px(xExit), pt(Re))
    : ctx.lineTo(px(xExit), pt(Re));
  ctx.lineTo(px(xExit), pb(Re));
  nozzleType === 'bell'
    ? ctx.bezierCurveTo(px(bp2x), pb(bp2r), px(bp1x), pb(bp1r), px(xThroat), pb(Rt))
    : ctx.lineTo(px(xThroat), pb(Rt));
  ctx.bezierCurveTo(ccx2, mir(ccy2), ccx1, mir(ccy1), px(xConvStart), pb(Rc));
  ctx.lineTo(px(0), pb(Rc)); ctx.closePath(); ctx.fill();
  ctx.restore();

  // ── Particles (after fill, before glow) ─────────────────────────────────
  if (flowProfile && particles && particles.length > 0) {
    drawParticles(ctx, particles, flowProfile);
  }

  // ── Helper: build contour path for top or bottom half ───────────────────
  const buildContour = (c: CanvasRenderingContext2D, top: boolean) => {
    const rpt = (r: number) => top ? pt(r) : pb(r);
    c.beginPath();
    c.moveTo(px(0), rpt(Rc));
    c.lineTo(px(xConvStart), rpt(Rc));
    top
      ? c.bezierCurveTo(ccx1, ccy1, ccx2, ccy2, px(xThroat), pt(Rt))
      : c.bezierCurveTo(ccx1, mir(ccy1), ccx2, mir(ccy2), px(xThroat), pb(Rt));
    if (nozzleType === 'bell') {
      top
        ? c.bezierCurveTo(px(bp1x), pt(bp1r), px(bp2x), pt(bp2r), px(xExit), pt(Re))
        : c.bezierCurveTo(px(bp1x), pb(bp1r), px(bp2x), pb(bp2r), px(xExit), pb(Re));
    } else {
      c.lineTo(px(xExit), rpt(Re));
    }
  };

  // ── Contour — 3 glow passes ──────────────────────────────────────────────
  const glowPasses = [
    { w: 9, a: 0.06 },
    { w: 4.5, a: 0.15 },
    { w: 2.5, a: 1.0 },
  ];
  for (const { w, a } of glowPasses) {
    ctx.save();
    ctx.strokeStyle = CYAN; ctx.lineWidth = w; ctx.globalAlpha = a;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.setLineDash([]);

    buildContour(ctx, true);  ctx.stroke();
    buildContour(ctx, false); ctx.stroke();

    ctx.beginPath(); ctx.moveTo(px(0),     pt(Rc)); ctx.lineTo(px(0),     pb(Rc)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px(xExit), pt(Re)); ctx.lineTo(px(xExit), pb(Re)); ctx.stroke();
    ctx.restore();
  }

  // ── Exhaust plume (after nozzle glow, before labels) ────────────────────
  if (plumeGeom && plumeParams && flowProfile && flowProperty) {
    drawPlume(ctx, plumeGeom, plumeParams, flowProperty, flowProfile);
  }

  if (showLabels) {
    // ── Dc ──────────────────────────────────────────────────────────────────
    dimLine(ctx, px(0) - 42, pt(Rc), px(0) - 42, pb(Rc));
    extLine(ctx, px(0), pt(Rc), px(0) - 45, pt(Rc));
    extLine(ctx, px(0), pb(Rc), px(0) - 45, pb(Rc));
    txt(ctx, `Dc = ${f2(Rc * 2)} cm`, px(0) - 50, midY + 4, 'right');

    // ── Dt ──────────────────────────────────────────────────────────────────
    dimLine(ctx, px(xThroat), pt(Rt), px(xThroat), pb(Rt));
    extLine(ctx, px(xThroat), pt(Rt), px(xThroat), pt(Rt));
    extLine(ctx, px(xThroat), pb(Rt), px(xThroat), pb(Rt));
    txt(ctx, `Dt = ${f2(Rt * 2)} cm`, px(xThroat) + 10, midY + 4);

    // ── De ──────────────────────────────────────────────────────────────────
    dimLine(ctx, px(xExit) + 30, pt(Re), px(xExit) + 30, pb(Re));
    extLine(ctx, px(xExit), pt(Re), px(xExit) + 34, pt(Re));
    extLine(ctx, px(xExit), pb(Re), px(xExit) + 34, pb(Re));
    txt(ctx, `De = ${f2(Re * 2)} cm`, px(xExit) + 37, midY + 4);

    // ── Ldiv (bell only) ────────────────────────────────────────────────────
    if (nozzleType === 'bell') {
      dimLine(ctx, px(xThroat), pT - 32, px(xExit), pT - 32);
      txt(ctx, `Lnozzle = ${f1(Ln_bell)} cm`, (px(xThroat) + px(xExit)) / 2, pT - 37, 'center');
      extLine(ctx, px(xThroat), pt(Rt), px(xThroat), pT - 32, 0.5);
      extLine(ctx, px(xExit),   pt(Re), px(xExit),   pT - 32, 0.5);
    }

    // ── Lchamber ────────────────────────────────────────────────────────────
    dimLine(ctx, px(0), dimY1, px(xThroat), dimY1);
    txt(ctx, `Lchamber = ${f1(Lc_cyl + Lconv)} cm`, (px(0) + px(xThroat)) / 2, dimY1 - 7, 'center');
    extLine(ctx, px(0),       maxBotY + 4, px(0),       dimY1, 0.45);
    extLine(ctx, px(xThroat), pb(Rt),      px(xThroat), dimY1, 0.45);

    // ── Ltotal ──────────────────────────────────────────────────────────────
    dimLine(ctx, px(0), dimY2, px(xExit), dimY2);
    txt(ctx, `Ltotal = ${f1(xExit)} cm`, (px(0) + px(xExit)) / 2, dimY2 - 7, 'center');

    // ── θconv arc + label ────────────────────────────────────────────────────
    txt(ctx, `θconv = ${tConvDeg}°`, px(xConvStart) + 10, pt(Rc) + 28);
    ctx.save();
    ctx.strokeStyle = AMBER; ctx.lineWidth = 1; ctx.globalAlpha = 0.75; ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(px(xConvStart), pt(Rc) + 6, 20, 0, tConvDeg * DEG); ctx.stroke();
    ctx.restore();

    // ── Bell nozzle angle labels ─────────────────────────────────────────────
    if (nozzleType === 'bell') {
      txt(ctx, `θn = ${tNDeg}°`, px(xThroat) + 10, pt(Rt) - 10);
      ctx.save();
      ctx.strokeStyle = AMBER; ctx.lineWidth = 1; ctx.globalAlpha = 0.75; ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(px(xThroat), pt(Rt), 18, -Math.PI / 2, -Math.PI / 2 + tNDeg * DEG);
      ctx.stroke();
      ctx.restore();
      txt(ctx, `θe = ${tEDeg}°`, px(xExit) - 85, pt(Re) - 8);
    }

    // ── Conical nozzle angle label ───────────────────────────────────────────
    if (nozzleType === 'conical') {
      txt(ctx, `θdiv = ${divergentHalfDeg}°`, px(xThroat) + 10, pt(Rt) - 10);
      ctx.save();
      ctx.strokeStyle = AMBER; ctx.lineWidth = 1; ctx.globalAlpha = 0.75; ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(px(xThroat), pt(Rt), 18, -Math.PI / 2, -Math.PI / 2 + divergentHalfDeg * DEG);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ── Legend (drawn in CSS-pixel space, pinned to canvas bottom-left) ──────────

const LEG_W = 228;
const LEG_ITEM_H = 14;
const LEG_PADDING = 26;

function legendHeight() {
  return 9 * LEG_ITEM_H + LEG_PADDING;
}

function drawLegend(ctx: CanvasRenderingContext2D, x: number, y: number, nozzleType: NozzleType) {
  const items: [string, string][] = [
    ['Dc:',       'Chamber Diameter'],
    ['Dt:',       'Throat Diameter'],
    ['De:',       'Exit Diameter'],
    ['Lnozzle:',  'Divergent Nozzle Length'],
    ['Ltotal:',   'Total Engine Length'],
    ['Lchamber:', 'Combustion Chamber Length'],
    ['θconv:',    'Convergent Half-Angle'],
    nozzleType === 'bell'
      ? ['θn:',   'Bell Nozzle Initial Angle']
      : ['θdiv:', 'Half Divergence Angle'],
    nozzleType === 'bell'
      ? ['θe:',   'Bell Nozzle Exit Angle']
      : ['Ldiv:', 'Divergent Section Length'],
  ];

  const legH = legendHeight();

  ctx.save();
  ctx.fillStyle = 'rgba(5,14,24,0.88)';
  ctx.strokeStyle = 'rgba(0,229,255,0.28)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, LEG_W, legH, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  txt(ctx, 'LEGENDS', x + 10, y + 17, 'left', CYAN, 10.5);
  items.forEach(([abbr, desc], i) => {
    txt(ctx, abbr, x + 10, y + 31 + i * LEG_ITEM_H, 'left', AMBER, 9.5);
    txt(ctx, desc, x + 72, y + 31 + i * LEG_ITEM_H, 'left', 'rgba(200,220,230,0.65)', 9.5);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ViewState { panX: number; panY: number; vZoom: number }

const DEFAULT_ZOOM = 0.75;

const centeredView = (cW: number, cH: number, z = DEFAULT_ZOOM): ViewState => ({
  panX: (cW / 2) * (1 - z),
  panY: (cH / 2) * (1 - z),
  vZoom: z,
});

export default function EngineContour({
  chamberRadius, throatRadius, exitRadius,
  expansionRatio, contractionRatio,
  gamma, chamberPressureBar, chamberTemperatureK, molecularWeightGMol,
  exitPressureBar, ambientPressureBar,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const [nozzleType, setNozzleType] = useState<NozzleType>('bell');
  const [showLabels, setShowLabels] = useState(true);
  const [view, setView] = useState<ViewState>({ panX: 0, panY: 0, vZoom: DEFAULT_ZOOM });
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Flow simulation state
  const [showFlowSim, setShowFlowSim]     = useState(false);
  const [flowProperty, setFlowProperty]   = useState<FlowProperty>('mach');
  const [showParticles, setShowParticles] = useState(true);
  const [showPlume, setShowPlume]         = useState(true);

  // Angle overrides
  const [angleOverrides, setAngleOverrides] = useState<AngleOverrides>({});
  const [showAnglesPanel, setShowAnglesPanel] = useState(false);

  // Refs for animation loop
  const animFrameRef  = useRef<number | null>(null);
  const particlesRef  = useRef<Particle[]>([]);
  const redrawRef     = useRef<() => void>(() => {});

  const hasPhysics = Boolean(gamma && chamberPressureBar && chamberTemperatureK && molecularWeightGMol);

  const flowProfile = useMemo<FlowProfile | null>(() => {
    if (!showFlowSim || !gamma || !chamberPressureBar || !chamberTemperatureK || !molecularWeightGMol) {
      return null;
    }
    const geom = computeGeometry(nozzleType, chamberRadius, throatRadius, exitRadius, expansionRatio, contractionRatio, angleOverrides);
    return buildFlowProfile(nozzleType, geom, gamma, chamberPressureBar * 1e5, chamberTemperatureK, molecularWeightGMol);
  }, [
    showFlowSim, gamma, chamberPressureBar, chamberTemperatureK, molecularWeightGMol,
    nozzleType, chamberRadius, throatRadius, exitRadius, expansionRatio, contractionRatio,
    angleOverrides,
  ]);

  const plumeParams = useMemo<PlumeParams | null>(() => {
    if (!showFlowSim || !showPlume || !flowProfile || !gamma) return null;
    const geom    = computeGeometry(nozzleType, chamberRadius, throatRadius, exitRadius, expansionRatio, contractionRatio, angleOverrides);
    const exitPt  = flowProfile.points[flowProfile.points.length - 1];
    const Pa      = (ambientPressureBar ?? exitPressureBar ?? 1.013) * 1e5;
    return {
      exitX:          geom.px(geom.xExit),
      exitTopY:       geom.pt(geom.Re),
      exitBotY:       geom.pb(geom.Re),
      midY:           geom.midY,
      exitMach:       exitPt.mach,
      exitPressurePa: exitPt.pressure,
      exitTempK:      exitPt.temperature,
      gamma,
      ambientPressurePa: Pa,
      exitAngleRad:   geom.tEDeg * (Math.PI / 180),
      plumeLength:    440,
    };
  }, [
    showFlowSim, showPlume, flowProfile, gamma,
    nozzleType, chamberRadius, throatRadius, exitRadius, expansionRatio, contractionRatio,
    angleOverrides, ambientPressureBar, exitPressureBar,
  ]);

  const plumeGeom = useMemo<PlumeGeometry | null>(
    () => plumeParams ? computePlumeGeometry(plumeParams) : null,
    [plumeParams],
  );

  // Re-initialize particles when flow profile changes
  useEffect(() => {
    if (!flowProfile) { particlesRef.current = []; return; }
    particlesRef.current = initParticles(flowProfile);
  }, [flowProfile]);

  const redraw = useCallback(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const { width: cW, height: cH } = container.getBoundingClientRect();
    if (cW === 0 || cH === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const pw  = Math.round(cW * dpr);
    const ph  = Math.round(cH * dpr);

    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width        = pw;
      canvas.height       = ph;
      canvas.style.width  = `${cW}px`;
      canvas.style.height = `${cH}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { panX, panY, vZoom } = view;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#090d12';
    ctx.fillRect(0, 0, cW, cH);

    ctx.translate(panX, panY);
    ctx.scale(vZoom, vZoom);

    drawFullGrid(ctx, cW, cH, panX, panY, vZoom);

    const lbScale = Math.min(cW / LOG_W, cH / LOG_H);
    const offsetX = (cW - LOG_W * lbScale) / 2;
    const offsetY = (cH - LOG_H * lbScale) / 2;
    ctx.translate(offsetX, offsetY);
    ctx.scale(lbScale, lbScale);

    renderEngine(
      ctx, nozzleType,
      chamberRadius, throatRadius, exitRadius,
      expansionRatio, contractionRatio,
      showLabels,
      showFlowSim && flowProfile ? flowProfile : undefined,
      flowProperty,
      showFlowSim && showParticles ? particlesRef.current : undefined,
      angleOverrides,
      showFlowSim && showPlume && plumeGeom ? plumeGeom : undefined,
      showFlowSim && showPlume && plumeParams ? plumeParams : undefined,
    );

    ctx.restore();

    // CSS-pixel space overlays
    ctx.save();
    ctx.scale(dpr, dpr);

    if (showLabels) {
      const legH = legendHeight();
      drawLegend(ctx, 12, cH - legH - 12, nozzleType);
    }

    if (showFlowSim && flowProfile) {
      drawColorbar(ctx, cW, cH, flowProfile, flowProperty);
    }

    ctx.restore();
  }, [
    nozzleType, showLabels,
    chamberRadius, throatRadius, exitRadius, expansionRatio, contractionRatio,
    view,
    showFlowSim, flowProperty, showParticles, flowProfile,
    angleOverrides, showPlume, plumeGeom, plumeParams,
  ]);

  // Keep redrawRef current so the rAF loop always calls the latest redraw
  redrawRef.current = redraw;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width: cW, height: cH } = container.getBoundingClientRect();
    if (cW > 0 && cH > 0) setView(centeredView(cW, cH));
  }, []);

  useEffect(() => {
    redraw();
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(redraw);
    ro.observe(container);
    return () => ro.disconnect();
  }, [redraw]);

  // Animation loop for particles
  useEffect(() => {
    const needsAnimation = showFlowSim && flowProfile && (showParticles || (showPlume && plumeGeom));
    if (!needsAnimation) {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    let lastTime: number | null = null;

    const tick = (now: number) => {
      const dt = Math.min(now - (lastTime ?? now - 16), 50);
      lastTime = now;
      if (showParticles) {
        advanceParticles(
          particlesRef.current, flowProfile, dt,
          showPlume && plumeGeom ? plumeGeom : undefined,
          showPlume && plumeParams ? plumeParams : undefined,
        );
      }
      redrawRef.current();
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [showFlowSim, showParticles, flowProfile, showPlume, plumeGeom, plumeParams]);

  // Non-passive wheel listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { panX, panY, vZoom } = viewRef.current;
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.max(0.05, Math.min(20, vZoom * factor));
      const worldX = (mx - panX) / vZoom;
      const worldY = (my - panY) / vZoom;
      setView({ panX: mx - worldX * newZoom, panY: my - worldY * newZoom, vZoom: newZoom });
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    drag.current = {
      startX: e.clientX, startY: e.clientY,
      startPanX: viewRef.current.panX, startPanY: viewRef.current.panY,
    };
    setDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const { startX, startY, startPanX, startPanY } = drag.current;
    setView(v => ({ ...v, panX: startPanX + e.clientX - startX, panY: startPanY + e.clientY - startY }));
  };

  const handleMouseUp = () => { drag.current = null; setDragging(false); };

  const handleDoubleClick = () => {
    const container = containerRef.current;
    if (!container) return;
    const { width: cW, height: cH } = container.getBoundingClientRect();
    setView(centeredView(cW, cH));
  };

  const handleZoomIn = () => {
    const container = containerRef.current;
    if (!container) return;
    const { width: cW, height: cH } = container.getBoundingClientRect();
    setView(v => {
      const newZoom = Math.min(20, v.vZoom * 1.2);
      const worldX = (cW / 2 - v.panX) / v.vZoom;
      const worldY = (cH / 2 - v.panY) / v.vZoom;
      return { panX: cW / 2 - worldX * newZoom, panY: cH / 2 - worldY * newZoom, vZoom: newZoom };
    });
  };

  const handleZoomOut = () => {
    const container = containerRef.current;
    if (!container) return;
    const { width: cW, height: cH } = container.getBoundingClientRect();
    setView(v => {
      const newZoom = Math.max(0.05, v.vZoom / 1.2);
      const worldX = (cW / 2 - v.panX) / v.vZoom;
      const worldY = (cH / 2 - v.panY) / v.vZoom;
      return { panX: cW / 2 - worldX * newZoom, panY: cH / 2 - worldY * newZoom, vZoom: newZoom };
    });
  };

  return (
    <div className="ec2-wrapper">
      <div ref={containerRef} className="ec2-canvas-container">
        <div className="ec2-switch-stack">
          <div className="ec2-overlay-switch">
            <span className={`ec2-switch-label${nozzleType === 'bell' ? ' ec2-switch-label--active' : ''}`}>
              Bell
            </span>
            <Switch
              checked={nozzleType === 'conical'}
              onChange={(e) => setNozzleType(e.target.checked ? 'conical' : 'bell')}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#00e5ff' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#00e5ff' },
                '& .MuiSwitch-track': { backgroundColor: 'rgba(200,220,230,0.3)' },
                '& .MuiSwitch-thumb': { boxShadow: '0 0 4px rgba(0,229,255,0.5)' },
              }}
            />
            <span className={`ec2-switch-label${nozzleType === 'conical' ? ' ec2-switch-label--active' : ''}`}>
              Conical
            </span>
          </div>
          <div className="ec2-overlay-switch" style={{ padding: '3px' }}>
            <Checkbox
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              size="small"
              disableRipple
              sx={{
                color: 'rgba(0,229,255,0.4)',
                '&.Mui-checked': { color: '#00e5ff' },
                padding: '2px',
              }}
            />
            <span className={`ec2-switch-label${showLabels ? ' ec2-switch-label--active' : ''}`}>
              Engine Dimensions
            </span>
          </div>

        </div>

        {hasPhysics && (
          <div className="ec2-switch-stack ec2-switch-stack--right">
            <div className="ec2-overlay-switch">
              <span className={`ec2-switch-label ec2-switch-label--readable${showFlowSim ? ' ec2-switch-label--active' : ''}`}>
                Fluid Flow Simulation
              </span>
              <Switch
                checked={showFlowSim}
                onChange={(e) => setShowFlowSim(e.target.checked)}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#00e5ff' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#00e5ff' },
                  '& .MuiSwitch-track': { backgroundColor: 'rgba(200,220,230,0.3)' },
                  '& .MuiSwitch-thumb': { boxShadow: '0 0 4px rgba(0,229,255,0.5)' },
                }}
              />
            </div>
            <div className={`ec2-overlay-switch${!showFlowSim ? ' ec2-overlay-switch--disabled' : ''}`} style={{ padding: '3px 8px' }}>
              <span className={`ec2-switch-label${showFlowSim ? ' ec2-switch-label--active' : ''}`}>Property</span>
              <select
                className="ec2-flow-select"
                value={flowProperty}
                onChange={(e) => setFlowProperty(e.target.value as FlowProperty)}
                disabled={!showFlowSim}
              >
                <option value="mach">Mach</option>
                <option value="pressure">Pressure</option>
                <option value="temperature">Temperature</option>
                <option value="velocity">Velocity</option>
              </select>
            </div>
            <div className={`ec2-overlay-switch${!showFlowSim ? ' ec2-overlay-switch--disabled' : ''}`}>
              <span className={`ec2-switch-label${showFlowSim && showParticles ? ' ec2-switch-label--active' : ''}`}>
                Particles
              </span>
              <Switch
                checked={showParticles}
                onChange={(e) => setShowParticles(e.target.checked)}
                disabled={!showFlowSim}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#00e5ff' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#00e5ff' },
                  '& .MuiSwitch-track': { backgroundColor: 'rgba(200,220,230,0.3)' },
                  '& .MuiSwitch-thumb': { boxShadow: '0 0 4px rgba(0,229,255,0.5)' },
                  opacity: showFlowSim ? 1 : 0.35,
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div className={`ec2-overlay-switch${!showFlowSim ? ' ec2-overlay-switch--disabled' : ''}`}>
                <span className={`ec2-switch-label${showFlowSim && showPlume ? ' ec2-switch-label--active' : ''}`}>
                  Exhaust Plume
                </span>
                <Switch
                  checked={showPlume}
                  onChange={(e) => setShowPlume(e.target.checked)}
                  disabled={!showFlowSim}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#00e5ff' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#00e5ff' },
                    '& .MuiSwitch-track': { backgroundColor: 'rgba(200,220,230,0.3)' },
                    '& .MuiSwitch-thumb': { boxShadow: '0 0 4px rgba(0,229,255,0.5)' },
                    opacity: showFlowSim ? 1 : 0.35,
                  }}
                />
              </div>
              <Tooltip title="Nozzle angle overrides" placement="left" arrow>
                <IconButton
                  className={`ec2-zoom-btn${showAnglesPanel ? ' ec2-zoom-btn--active' : ''}`}
                  onClick={() => setShowAnglesPanel(v => !v)}
                  size="small"
                  disableRipple
                >
                  <TuneIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        )}
        <div className="ec2-zoom-controls">
          <Tooltip title="Zoom in" placement="right" arrow>
            <IconButton className="ec2-zoom-btn" onClick={handleZoomIn} size="small" disableRipple>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom out" placement="right" arrow>
            <IconButton className="ec2-zoom-btn" onClick={handleZoomOut} size="small" disableRipple>
              <RemoveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset view" placement="right" arrow>
            <IconButton className="ec2-zoom-btn ec2-zoom-btn--reset" onClick={handleDoubleClick} size="small" disableRipple>
              <RestoreIcon fontSize="small" />
            </IconButton>
          </Tooltip>          
          <Tooltip
            title={
              <div className="ec2-info-tooltip">
                <div><kbd>Scroll</kbd> Zoom in / out</div>
                <div><kbd>Drag</kbd> Pan view</div>
                <div><kbd>Double-click</kbd> Reset view</div>
              </div>
            }
            placement="right"
            arrow
          >
            <IconButton className="ec2-zoom-btn" size="small" disableRipple>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
        {showAnglesPanel && (() => {
          const defaultTEDeg = +Math.max(7, 15 - (expansionRatio - 1) * 0.3).toFixed(1);
          const convVal = angleOverrides.convergentHalfDeg ?? 30;
          const divVal  = angleOverrides.divergentRefDeg   ?? 15;
          const tNVal   = angleOverrides.tNDeg             ?? 25;
          const tEVal   = angleOverrides.tEDeg             ?? defaultTEDeg;
          const sliderSx = {
            color: '#00e5ff',
            '& .MuiSlider-thumb': { width: 10, height: 10, boxShadow: '0 0 4px rgba(0,229,255,0.6)' },
            '& .MuiSlider-track': { border: 'none' },
            '& .MuiSlider-rail': { opacity: 0.3 },
          };
          return (
            <div className="ec2-angles-panel">
              <div className="ec2-angles-header">
                <span>NOZZLE ANGLES</span>
                <button
                  className="ec2-angles-reset"
                  onClick={() => setAngleOverrides({})}
                >
                  Reset
                </button>
              </div>

              <div className="ec2-angle-row">
                <span className="ec2-angle-label">θconv</span>
                <Slider
                  value={convVal}
                  min={20} max={50} step={1}
                  size="small"
                  sx={sliderSx}
                  onChange={(_, v) => setAngleOverrides(o => ({ ...o, convergentHalfDeg: v as number }))}
                />
                <span className="ec2-angle-val">{convVal}°</span>
              </div>

              {nozzleType === 'bell' && (
                <>
                  <div className="ec2-angle-row">
                    <span className="ec2-angle-label">θn</span>
                    <Slider
                      value={tNVal}
                      min={20} max={35} step={1}
                      size="small"
                      sx={sliderSx}
                      onChange={(_, v) => setAngleOverrides(o => ({ ...o, tNDeg: v as number }))}
                    />
                    <span className="ec2-angle-val">{tNVal}°</span>
                  </div>
                  <div className="ec2-angle-row">
                    <span className="ec2-angle-label">θe</span>
                    <Slider
                      value={tEVal}
                      min={0} max={30} step={0.5}
                      size="small"
                      sx={sliderSx}
                      onChange={(_, v) => setAngleOverrides(o => ({ ...o, tEDeg: v as number }))}
                    />
                    <span className="ec2-angle-val">{tEVal}°</span>
                  </div>
                </>
              )}

              {nozzleType === 'conical' && (
                <div className="ec2-angle-row">
                  <span className="ec2-angle-label">θdiv</span>
                  <Slider
                    value={divVal}
                    min={10} max={25} step={1}
                    size="small"
                    sx={sliderSx}
                    onChange={(_, v) => setAngleOverrides(o => ({ ...o, divergentRefDeg: v as number }))}
                  />
                  <span className="ec2-angle-val">{divVal}°</span>
                </div>
              )}
            </div>
          );
        })()}

        <canvas
          ref={canvasRef}
          className="ec2-canvas"
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        />
      </div>
    </div>
  );
}
