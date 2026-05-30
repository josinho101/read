import { useRef, useEffect, useState, useCallback } from 'react';
import './EngineContour.css';

interface Props {
  chamberRadius: number;
  throatRadius: number;
  exitRadius: number;
  expansionRatio: number;
  contractionRatio: number;
  zoom: number;
  onZoomChange?: (zoom: number) => void;
}

type NozzleType = 'bell' | 'conical';

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
  // Adaptive spacing: keep lines ~50 CSS px apart at any zoom level
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
) {
  // Geometry (mm)
  const CR        = Math.max(contractionRatio, 1.1);
  const tConvDeg  = 30;
  const Lconv     = (Rc - Rt) / Math.tan(tConvDeg * DEG);
  const Lc_cyl    = Math.max(Rt * 2, 1000 / CR - Lconv);
  const Ldiv_ref  = (Re - Rt) / Math.tan(15 * DEG);
  const Ln_bell   = 0.8 * Ldiv_ref;
  const tNDeg     = 25;
  const tEDeg     = +Math.max(7, 15 - (expansionRatio - 1) * 0.3).toFixed(1);
  const nozzleLen = nozzleType === 'bell' ? Ln_bell : Ldiv_ref;
  const xConvStart = Lc_cyl;
  const xThroat    = Lc_cyl + Lconv;
  const xExit      = xThroat + nozzleLen;

  // Layout
  const pL = 130, pR = 55, pT = 85, pB = 115;
  const drawW = LOG_W - pL - pR;
  const drawH = LOG_H - pT - pB;
  const midY  = pT + drawH / 2;

  const sx = (drawW / xExit);
  const sy = (drawH / 2 / (Math.max(Rc, Re) * 1.25));

  const px  = (x: number) => pL + x * sx;
  const pt  = (r: number) => midY - r * sy;
  const pb  = (r: number) => midY + r * sy;
  const mir = (y: number) => 2 * midY - y;

  // Bezier control points — convergent
  const ccx1 = px(xConvStart) + 0.22 * (px(xThroat) - px(xConvStart));
  const ccy1 = pt(Rc);
  const ccx2 = px(xThroat)    - 0.10 * (px(xThroat) - px(xConvStart));
  const ccy2 = pt(Rt + (Rc - Rt) * 0.08);

  // Bezier control points — bell divergent
  const bDx  = xExit - xThroat;
  const bDy  = Re - Rt;
  const bLen = Math.sqrt(bDx * bDx + bDy * bDy);
  const bp1x = xThroat + Math.cos(tNDeg * DEG) * bLen * 0.38;
  const bp1r = Rt      + Math.sin(tNDeg * DEG) * bLen * 0.38;
  const bp2x = xExit   - Math.cos(tEDeg * DEG) * bLen * 0.38;
  const bp2r = Re      - Math.sin(tEDeg * DEG) * bLen * 0.38;

  // Dimension helpers
  const f1 = (mm: number) => (mm / 10).toFixed(1);
  const f2 = (mm: number) => (mm / 10).toFixed(2);
  const maxBotY = Math.max(pb(Rc), pb(Re));
  const dimY1   = maxBotY + 24;
  const dimY2   = maxBotY + 50;

  // ── Centerline ──────────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = CYAN; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.35;
  ctx.setLineDash([10, 6]);
  ctx.beginPath(); ctx.moveTo(px(0) - 55, midY); ctx.lineTo(px(xExit) + 20, midY); ctx.stroke();
  ctx.restore();

  // ── Engine fill ──────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.04; ctx.fillStyle = CYAN;
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

  // ── Dc ──────────────────────────────────────────────────────────────────
  dimLine(ctx, px(0) - 42, pt(Rc), px(0) - 42, pb(Rc));
  extLine(ctx, px(0), pt(Rc), px(0) - 45, pt(Rc));
  extLine(ctx, px(0), pb(Rc), px(0) - 45, pb(Rc));
  txt(ctx, `Dc = ${f2(Rc * 2)} cm`, px(0) - 50, midY + 4, 'right');

  // ── Dt ──────────────────────────────────────────────────────────────────
  dimLine(ctx, px(xThroat) + 18, pt(Rt), px(xThroat) + 18, pb(Rt));
  extLine(ctx, px(xThroat), pt(Rt), px(xThroat) + 22, pt(Rt));
  extLine(ctx, px(xThroat), pb(Rt), px(xThroat) + 22, pb(Rt));
  txt(ctx, `Dt = ${f2(Rt * 2)} cm`, px(xThroat) + 24, midY + 4);

  // ── De ──────────────────────────────────────────────────────────────────
  dimLine(ctx, px(xExit) + 30, pt(Re), px(xExit) + 30, pb(Re));
  extLine(ctx, px(xExit), pt(Re), px(xExit) + 34, pt(Re));
  extLine(ctx, px(xExit), pb(Re), px(xExit) + 34, pb(Re));
  txt(ctx, `De = ${f2(Re * 2)} cm`, px(xExit) + 37, midY + 4);

  // ── Ldiv (bell only) ────────────────────────────────────────────────────
  if (nozzleType === 'bell') {
    dimLine(ctx, px(xThroat), pT - 32, px(xExit), pT - 32);
    txt(ctx, `Ldiv = ${f1(Ln_bell)} cm`, (px(xThroat) + px(xExit)) / 2, pT - 37, 'center');
    extLine(ctx, px(xThroat), pt(Rt), px(xThroat), pT - 32, 0.5);
    extLine(ctx, px(xExit),   pt(Re), px(xExit),   pT - 32, 0.5);
  }

  // ── Lchamber ────────────────────────────────────────────────────────────
  dimLine(ctx, px(0), dimY1, px(xThroat), dimY1);
  txt(ctx, `Lchamber = ${f1(Lc_cyl + Lconv)} cm`, (px(0) + px(xThroat)) / 2, dimY1 - 7, 'center');
  extLine(ctx, px(0),      maxBotY + 4, px(0),      dimY1, 0.45);
  extLine(ctx, px(xThroat), maxBotY + 4, px(xThroat), dimY1, 0.45);

  // ── Lnozzle ─────────────────────────────────────────────────────────────
  dimLine(ctx, px(xThroat), dimY1, px(xExit), dimY1);
  txt(ctx, `Lnozzle = ${f1(nozzleLen)} cm`, (px(xThroat) + px(xExit)) / 2, dimY1 + 15, 'center');
  extLine(ctx, px(xExit), maxBotY + 4, px(xExit), dimY1, 0.45);

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
    txt(ctx, 'θdiv = 15°', px(xThroat) + 10, pt(Rt) - 10);
    ctx.save();
    ctx.strokeStyle = AMBER; ctx.lineWidth = 1; ctx.globalAlpha = 0.75; ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(px(xThroat), pt(Rt), 18, -Math.PI / 2, -Math.PI / 2 + 15 * DEG);
    ctx.stroke();
    ctx.restore();
  }

}

// ── Legend (drawn in CSS-pixel space, pinned to canvas bottom-left) ──────────

const LEG_W = 228;
const LEG_ITEM_H = 14;
const LEG_PADDING = 26;

function legendHeight(nozzleType: NozzleType) {
  return 9 * LEG_ITEM_H + LEG_PADDING; // always 9 items
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

  const legH = legendHeight(nozzleType);

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

export default function EngineContour({
  chamberRadius, throatRadius, exitRadius,
  expansionRatio, contractionRatio, zoom,
  onZoomChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const [nozzleType, setNozzleType] = useState<NozzleType>('bell');
  const [view, setView] = useState<ViewState>({ panX: 0, panY: 0, vZoom: zoom / 100 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const zoomFromScroll = useRef(false);

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

    // Pan + zoom (world space)
    ctx.translate(panX, panY);
    ctx.scale(vZoom, vZoom);

    // Full-canvas grid in world space
    drawFullGrid(ctx, cW, cH, panX, panY, vZoom);

    // Letterbox: center the logical 1140×580 in the default view
    const lbScale = Math.min(cW / LOG_W, cH / LOG_H);
    const offsetX = (cW - LOG_W * lbScale) / 2;
    const offsetY = (cH - LOG_H * lbScale) / 2;
    ctx.translate(offsetX, offsetY);
    ctx.scale(lbScale, lbScale);

    renderEngine(
      ctx, nozzleType,
      chamberRadius, throatRadius, exitRadius,
      expansionRatio, contractionRatio,
    );

    ctx.restore();

    // Legend pinned to canvas bottom-left in CSS-pixel space
    ctx.save();
    ctx.scale(dpr, dpr);
    const legH = legendHeight(nozzleType);
    drawLegend(ctx, 12, cH - legH - 12, nozzleType);
    ctx.restore();
  }, [nozzleType, chamberRadius, throatRadius, exitRadius, expansionRatio, contractionRatio, view]);

  useEffect(() => {
    redraw();
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(redraw);
    ro.observe(container);
    return () => ro.disconnect();
  }, [redraw]);

  // Sync zoom prop → vZoom when changed by parent (buttons/reset), but not when scroll already updated vZoom
  useEffect(() => {
    if (zoomFromScroll.current) {
      zoomFromScroll.current = false;
      return;
    }
    setView(v => ({ ...v, vZoom: zoom / 100 }));
  }, [zoom]);

  // Non-passive wheel listener so we can preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { panX, panY, vZoom } = viewRef.current;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.max(0.05, Math.min(20, vZoom * factor));
      const worldX = (mx - panX) / vZoom;
      const worldY = (my - panY) / vZoom;
      zoomFromScroll.current = true;
      setView({ panX: mx - worldX * newZoom, panY: my - worldY * newZoom, vZoom: newZoom });
      onZoomChange?.(Math.round(newZoom * 100));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [onZoomChange]);

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
    zoomFromScroll.current = true;
    setView({ panX: 0, panY: 0, vZoom: 1 });
    onZoomChange?.(100);
  };

  return (
    <div className="ec2-wrapper">
      <div className="ec2-toggle-bar">
        <button
          className={`ec2-toggle-btn${nozzleType === 'bell' ? ' ec2-toggle-btn--active' : ''}`}
          onClick={() => setNozzleType('bell')}
        >
          Bell Nozzle
        </button>
        <button
          className={`ec2-toggle-btn${nozzleType === 'conical' ? ' ec2-toggle-btn--active' : ''}`}
          onClick={() => setNozzleType('conical')}
        >
          Conical Nozzle
        </button>
        <span className="ec2-hint">Scroll to zoom · Drag to pan · Double-click to reset</span>
      </div>

      <div ref={containerRef} className="ec2-canvas-container">
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
