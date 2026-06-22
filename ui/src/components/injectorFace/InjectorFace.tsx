import { useRef, useEffect, useCallback, useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestoreIcon from '@mui/icons-material/Restore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { type InjectorType, type InjectorSweepRow } from '../../services/injectorSweepService';
import './InjectorFace.css';

interface InjectorFaceProps {
  /** Chamber radius in mm — drawn as the outer boundary circle */
  chamberRadiusMm: number;
  /** Number of oxidizer orifices to place on the face */
  nOxidizer: number;
  /** Number of fuel orifices to place on the face */
  nFuel: number;
  /** Oxidizer orifice drill diameter (mm) */
  dOxMm: number;
  /** Fuel orifice drill diameter (mm) */
  dFuelMm: number;
  /** Injector architecture — controls the visual layout of holes */
  injectorType: InjectorType;
  /** Impingement half-angle (degrees) — only used for 'impinging' type */
  impingementHalfAngleDeg?: number;
  /** Selected sweep row — rendered as an overlay in the top-right corner */
  selectedRow?: InjectorSweepRow | null;
  /** Chamber pressure in bar — used to derive propellant inlet pressure */
  chamberPressureBar?: number;
  view: ViewState | null;
  onViewChange: (v: ViewState) => void;
}

export interface ViewState { panX: number; panY: number; vZoom: number }

export const INJECTOR_FACE_DEFAULT_ZOOM = 0.8;

export function centeredView(cW: number, cH: number, z = INJECTOR_FACE_DEFAULT_ZOOM): ViewState {
  return { panX: (cW / 2) * (1 - z), panY: (cH / 2) * (1 - z), vZoom: z };
}

const FALLBACK_VIEW: ViewState = { panX: 0, panY: 0, vZoom: INJECTOR_FACE_DEFAULT_ZOOM };

export const COLOR_OX   = '#ffb300';  // orange — oxidizer
export const COLOR_FUEL = '#00e5ff';  // cyan   — fuel
export const COLOR_WALL = 'rgba(0,229,255,0.25)';
export const COLOR_WALL_STROKE = 'rgba(0,229,255,0.6)';
export const COLOR_IMP_LINE = 'rgba(255,179,0,0.35)';
export const AMBER = '#ffb300';

// ── Dimension helpers ──────────────────────────────────────────────────────────

export function arrowHead(
  ctx: CanvasRenderingContext2D,
  fromX: number, fromY: number,
  toX: number, toY: number,
  color: string,
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const size = 5;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 6), toY - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 6), toY - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function dimLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
) {
  ctx.save();
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  arrowHead(ctx, x2, y2, x1, y1, AMBER);
  arrowHead(ctx, x1, y1, x2, y2, AMBER);
  ctx.restore();
}

export function extensionLine(
  ctx: CanvasRenderingContext2D,
  fromX: number, fromY: number,
  toX: number, toY: number,
) {
  ctx.save();
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 3]);
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.restore();
}

export function drawSpacingDim(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  labelMm: number,
  label?: string,
  // True measured-edge anchors the dimension line's endpoints extend back
  // to (e.g. the circle's centerline when the dimension line itself sits
  // offset below the shape) — defaults to the dimension line's own
  // endpoints, which draws a zero-length (i.e. no-op) extension.
  anchor1?: { x: number; y: number },
  anchor2?: { x: number; y: number },
) {
  if (anchor1) extensionLine(ctx, anchor1.x, anchor1.y, x1, y1);
  if (anchor2) extensionLine(ctx, anchor2.x, anchor2.y, x2, y2);

  dimLine(ctx, x1, y1, x2, y2);

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const offX = Math.sin(angle) * 10;
  const offY = -Math.cos(angle) * 10;

  ctx.save();
  ctx.fillStyle = AMBER;
  ctx.font = '10px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label ?? `${labelMm.toFixed(2)} mm`, midX + offX, midY + offY);
  ctx.restore();
}

// ── Hole layout helpers ────────────────────────────────────────────────────────

function packRings(
  N: number,
  faceR: number,
  minPitch: number,
  cx: number,
  cy: number,
): [number, number][] {
  if (N <= 0) return [];
  const positions: [number, number][] = [];
  let remaining = N;
  let ringIdx = 0;

  while (remaining > 0) {
    ringIdx++;
    const r = faceR * (0.30 + (ringIdx - 1) * 0.22);
    if (r > faceR) break;

    const circumference = 2 * Math.PI * r;
    const capacity = Math.max(1, Math.floor(circumference / minPitch));
    const count = Math.min(capacity, remaining);

    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      positions.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
    remaining -= count;
  }
  return positions;
}

export function drawHole(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  radius: number,
  color: string,
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

// ── Grid ──────────────────────────────────────────────────────────────────────

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  cW: number, cH: number,
  panX: number, panY: number, vZoom: number,
) {
  const raw = 50 / vZoom;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const frac = raw / mag;
  const spacing = frac < 2 ? mag : frac < 5 ? 2 * mag : 5 * mag;

  const vx0 = -panX / vZoom;
  const vy0 = -panY / vZoom;
  const vx1 = (cW - panX) / vZoom;
  const vy1 = (cH - panY) / vZoom;

  ctx.save();
  ctx.strokeStyle = COLOR_FUEL;
  ctx.globalAlpha = 0.07;
  ctx.lineWidth = 0.5 / vZoom;
  ctx.setLineDash([]);
  for (let x = Math.floor(vx0 / spacing) * spacing; x <= vx1; x += spacing) {
    ctx.beginPath(); ctx.moveTo(x, vy0); ctx.lineTo(x, vy1); ctx.stroke();
  }
  for (let y = Math.floor(vy0 / spacing) * spacing; y <= vy1; y += spacing) {
    ctx.beginPath(); ctx.moveTo(vx0, y); ctx.lineTo(vx1, y); ctx.stroke();
  }
  ctx.restore();
}

// ── Main draw function ─────────────────────────────────────────────────────────

function drawFaceHalf(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  props: InjectorFaceProps,
) {
  const { chamberRadiusMm, nOxidizer, nFuel, dOxMm, dFuelMm, injectorType } = props;

  const cx = w / 2;
  const cy = h / 2;

  const padding = 40;
  const scale = (Math.min(w, h) / 2 - padding) / chamberRadiusMm;

  const faceR = chamberRadiusMm * scale;
  const usableR = faceR * 0.85;

  // --- Chamber boundary circle ---
  ctx.beginPath();
  ctx.arc(cx, cy, faceR, 0, 2 * Math.PI);
  ctx.fillStyle = COLOR_WALL;
  ctx.fill();
  ctx.strokeStyle = COLOR_WALL_STROKE;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // --- Diameter dimension ---
  const yDim = cy + faceR + 18;

  ctx.save();
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 3]);
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.moveTo(cx - faceR, cy); ctx.lineTo(cx - faceR, yDim + 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + faceR, cy); ctx.lineTo(cx + faceR, yDim + 4); ctx.stroke();
  ctx.restore();

  dimLine(ctx, cx - faceR, yDim, cx + faceR, yDim);

  ctx.save();
  ctx.fillStyle = AMBER;
  ctx.font = '11px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`Ø ${(chamberRadiusMm * 2).toFixed(1)} mm`, cx, yDim - 2);
  ctx.restore();

  const rOx   = Math.max(2, (dOxMm   / 2) * scale);
  const rFuel = Math.max(2, (dFuelMm / 2) * scale);
  const minPitch = Math.max(rOx, rFuel) * 3 * 2;

  // ---- Layout by injector type ----

  if (injectorType === 'showerhead') {
    const total = nOxidizer + nFuel;
    const allPos = packRings(total, usableR, minPitch, cx, cy);
    allPos.forEach((pos, i) => {
      const isOx = i % 2 === 0;
      drawHole(ctx, pos[0], pos[1], isOx ? rOx : rFuel, isOx ? COLOR_OX : COLOR_FUEL);
    });

    if (allPos.length > 1) {
      const [x1, y1] = allPos[0];
      const [x2, y2] = allPos[1];
      const distMm = Math.hypot(x2 - x1, y2 - y1) / scale;
      drawSpacingDim(ctx, x1, y1, x2, y2, distMm);
    }

  } else if (injectorType === 'pintle') {
    // Pintle: oxidizer flows axially through the central post; fuel sheets
    // out radially through a continuous annular gap around the post — not
    // discrete drilled holes, so draw a fuel annulus rather than a hole ring.
    const postR = Math.max(rOx * 3, usableR * 0.12);
    const annulusOuterR = postR + Math.max(rFuel * 2, postR * 0.35);

    // Pass 1: fuel annulus
    ctx.beginPath();
    ctx.arc(cx, cy, annulusOuterR, 0, 2 * Math.PI);
    ctx.fillStyle = COLOR_FUEL;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,229,255,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pass 2: oxidizer post on top, punching out the center of the annulus
    ctx.beginPath();
    ctx.arc(cx, cy, postR, 0, 2 * Math.PI);
    ctx.fillStyle = COLOR_OX;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,179,0,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Radial gap: the clearance between the post edge and the annulus edge.
    // The fuel film fills this gap on every side of the post at once, so the
    // full annulus diameter is the post diameter PLUS the gap on *both*
    // sides — label it explicitly as a per-side value (×2) so it isn't
    // misread as a simple diameter-to-diameter delta. Drawn clear of the
    // circle (above it) since the true gap is too narrow on-shape to hold a
    // legible label, with vertical dashed extension lines tracing straight
    // up from the actual post/annulus edges — mirroring the Ox ⌀/Fuel ⌀
    // dimensions' style.
    const fuelDimY = cy - annulusOuterR - 22;
    const gapMm = (annulusOuterR - postR) / scale;
    const gapDimY = fuelDimY - 34;
    drawSpacingDim(
      ctx,
      cx + postR, gapDimY,
      cx + annulusOuterR, gapDimY,
      gapMm,
      `Gap ${gapMm.toFixed(2)} mm`,
      { x: cx + postR, y: cy }, { x: cx + annulusOuterR, y: cy },
    );

    drawSpacingDim(
      ctx, cx - annulusOuterR, fuelDimY, cx + annulusOuterR, fuelDimY,
      (annulusOuterR * 2) / scale, `Fuel ⌀ ${((annulusOuterR * 2) / scale).toFixed(2)} mm`,
      { x: cx - annulusOuterR, y: cy }, { x: cx + annulusOuterR, y: cy },
    );

    const oxDimY = cy + annulusOuterR + 22;
    drawSpacingDim(
      ctx, cx - postR, oxDimY, cx + postR, oxDimY,
      (postR * 2) / scale, `Ox ⌀ ${((postR * 2) / scale).toFixed(2)} mm`,
      { x: cx - postR, y: cy }, { x: cx + postR, y: cy },
    );

  } else if (injectorType === 'coaxial') {
    const elemPitch = Math.max(minPitch, (dOxMm + dFuelMm) * scale * 2.5);
    const positions = packRings(nOxidizer, usableR, elemPitch, cx, cy);
    const innerR = Math.max(3, rOx);
    const outerR = Math.max(innerR, rOx + rFuel * 1.5);
    // Pass 1: all fuel annuli first
    positions.forEach(([ex, ey]) => {
      ctx.beginPath();
      ctx.arc(ex, ey, outerR, 0, 2 * Math.PI);
      ctx.fillStyle = COLOR_FUEL;
      ctx.fill();
    });
    // Pass 2: all ox posts on top
    positions.forEach(([ex, ey]) => {
      ctx.beginPath();
      ctx.arc(ex, ey, innerR, 0, 2 * Math.PI);
      ctx.fillStyle = COLOR_OX;
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,10,20,0.9)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    if (positions.length > 0) {
      const [ex, ey] = positions[0];
      drawSpacingDim(ctx, ex, ey - innerR, ex, ey - outerR, (outerR - innerR) / scale);
    }

  } else if (injectorType === 'impinging_fof') {
    // FOF triplet: 1 central oxidizer + 2 flanking fuel holes per element.
    // nOxidizer = element count (N_f = 2 × N_o enforced by BE).
    const nElements = nOxidizer;
    const flankSpread = rOx + rFuel + minPitch * 0.5;
    const elemPitch = flankSpread * 2 + Math.max(rOx, rFuel) * 2 + minPitch * 0.3;
    const elemPositions = packRings(nElements, usableR, elemPitch, cx, cy);

    elemPositions.forEach(([px, py]) => {
      const angle = Math.atan2(py - cy, px - cx);
      const perpAngle = angle + Math.PI / 2;

      const oxX  = px;
      const oxY  = py;
      const f1X  = px + Math.cos(perpAngle) * flankSpread;
      const f1Y  = py + Math.sin(perpAngle) * flankSpread;
      const f2X  = px - Math.cos(perpAngle) * flankSpread;
      const f2Y  = py - Math.sin(perpAngle) * flankSpread;

      // Y-shaped convergence lines: both fuel jets aim at the central ox hole
      ctx.beginPath(); ctx.moveTo(f1X, f1Y); ctx.lineTo(oxX, oxY);
      ctx.strokeStyle = COLOR_IMP_LINE; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(f2X, f2Y); ctx.lineTo(oxX, oxY);
      ctx.strokeStyle = COLOR_IMP_LINE; ctx.lineWidth = 1; ctx.stroke();

      drawHole(ctx, f1X, f1Y, rFuel, COLOR_FUEL);
      drawHole(ctx, f2X, f2Y, rFuel, COLOR_FUEL);
      drawHole(ctx, oxX, oxY, rOx,   COLOR_OX);
    });

    if (elemPositions.length > 0) {
      const [px, py] = elemPositions[0];
      const perpAngle = Math.atan2(py - cy, px - cx) + Math.PI / 2;
      const f1X = px + Math.cos(perpAngle) * flankSpread;
      const f1Y = py + Math.sin(perpAngle) * flankSpread;
      const distMm = Math.hypot(f1X - px, f1Y - py) / scale;
      drawSpacingDim(ctx, px, py, f1X, f1Y, distMm);
    }

  } else if (injectorType === 'impinging_ofo') {
    // OFO triplet: 1 central fuel + 2 flanking oxidizer holes per element.
    // nFuel = element count (N_o = 2 × N_f enforced by BE).
    const nElements = nFuel;
    const flankSpread = rOx + rFuel + minPitch * 0.5;
    const elemPitch = flankSpread * 2 + Math.max(rOx, rFuel) * 2 + minPitch * 0.3;
    const elemPositions = packRings(nElements, usableR, elemPitch, cx, cy);

    elemPositions.forEach(([px, py]) => {
      const angle = Math.atan2(py - cy, px - cx);
      const perpAngle = angle + Math.PI / 2;

      const fX   = px;
      const fY   = py;
      const o1X  = px + Math.cos(perpAngle) * flankSpread;
      const o1Y  = py + Math.sin(perpAngle) * flankSpread;
      const o2X  = px - Math.cos(perpAngle) * flankSpread;
      const o2Y  = py - Math.sin(perpAngle) * flankSpread;

      // Y-shaped convergence lines: both ox jets aim at the central fuel hole
      ctx.beginPath(); ctx.moveTo(o1X, o1Y); ctx.lineTo(fX, fY);
      ctx.strokeStyle = COLOR_IMP_LINE; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(o2X, o2Y); ctx.lineTo(fX, fY);
      ctx.strokeStyle = COLOR_IMP_LINE; ctx.lineWidth = 1; ctx.stroke();

      drawHole(ctx, o1X, o1Y, rOx,   COLOR_OX);
      drawHole(ctx, o2X, o2Y, rOx,   COLOR_OX);
      drawHole(ctx, fX,  fY,  rFuel, COLOR_FUEL);
    });

    if (elemPositions.length > 0) {
      const [px, py] = elemPositions[0];
      const perpAngle = Math.atan2(py - cy, px - cx) + Math.PI / 2;
      const o1X = px + Math.cos(perpAngle) * flankSpread;
      const o1Y = py + Math.sin(perpAngle) * flankSpread;
      const distMm = Math.hypot(o1X - px, o1Y - py) / scale;
      drawSpacingDim(ctx, px, py, o1X, o1Y, distMm);
    }

  } else {
    // Impinging doublet: 1 ox + 1 fuel per pair, side by side.
    const nPairs = Math.min(nOxidizer, nFuel);
    const pairSpread = (rOx + rFuel + minPitch * 0.4);
    const pairPitch = pairSpread * 3;
    const pairPositions = packRings(nPairs, usableR, pairPitch, cx, cy);

    pairPositions.forEach(([px, py]) => {
      const angle = Math.atan2(py - cy, px - cx);
      const perpAngle = angle + Math.PI / 2;

      const oxX  = px + Math.cos(perpAngle) * pairSpread / 2;
      const oxY  = py + Math.sin(perpAngle) * pairSpread / 2;
      const fX   = px - Math.cos(perpAngle) * pairSpread / 2;
      const fY   = py - Math.sin(perpAngle) * pairSpread / 2;

      ctx.beginPath();
      ctx.moveTo(oxX, oxY);
      ctx.lineTo(fX, fY);
      ctx.strokeStyle = COLOR_IMP_LINE;
      ctx.lineWidth = 1;
      ctx.stroke();

      drawHole(ctx, oxX, oxY, rOx,   COLOR_OX);
      drawHole(ctx, fX,  fY,  rFuel, COLOR_FUEL);
    });

    if (pairPositions.length > 0) {
      const [px, py] = pairPositions[0];
      const perpAngle = Math.atan2(py - cy, px - cx) + Math.PI / 2;
      const oxX = px + Math.cos(perpAngle) * pairSpread / 2;
      const oxY = py + Math.sin(perpAngle) * pairSpread / 2;
      const fX  = px - Math.cos(perpAngle) * pairSpread / 2;
      const fY  = py - Math.sin(perpAngle) * pairSpread / 2;
      const distMm = Math.hypot(fX - oxX, fY - oxY) / scale;
      drawSpacingDim(ctx, oxX, oxY, fX, fY, distMm);
    }

    const extraOx   = nOxidizer - nPairs;
    const extraFuel = nFuel     - nPairs;
    if (extraOx > 0) {
      const extras = packRings(extraOx, usableR * 0.5, minPitch, cx, cy);
      extras.forEach(([x, y]) => drawHole(ctx, x, y, rOx, COLOR_OX));
    }
    if (extraFuel > 0) {
      const extras = packRings(extraFuel, usableR * 0.5, minPitch, cx, cy);
      extras.forEach(([x, y]) => drawHole(ctx, x, y, rFuel, COLOR_FUEL));
    }
  }
}

// ── Cross-section helpers ──────────────────────────────────────────────────────

// Stylized proportionality constants — there is no manifold-depth or bore-length
// data in the model, so these pick fixed, visually-reasonable proportions rather
// than depicting a to-scale technical drawing (mirrors how drawFaceHalf already
// invents the pintle annulus gap from postR alone).
const BORE_LENGTH_FACTOR = 6;
const POST_HEIGHT_FACTOR = 2.5;
const CONVERGENCE_DEPTH_FACTOR = 8;

function drawBore(
  ctx: CanvasRenderingContext2D,
  x: number, yTop: number, halfWidth: number, length: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x - halfWidth, yTop, halfWidth * 2, length);
}

/** Convergence half-angle (rad) and depth for a pair/triplet of jets spread `spreadPx` apart at the face. */
function convergenceGeometry(
  spreadPx: number,
  impingementHalfAngleDeg: number | undefined,
): { angleRad: number; depthPx: number } {
  if (impingementHalfAngleDeg != null && impingementHalfAngleDeg > 0) {
    const angleRad = (impingementHalfAngleDeg * Math.PI) / 180;
    return { angleRad, depthPx: spreadPx / Math.tan(angleRad) };
  }
  const depthPx = spreadPx * CONVERGENCE_DEPTH_FACTOR;
  const angleRad = Math.atan2(spreadPx, depthPx);
  return { angleRad, depthPx };
}

function drawCrossSectionHalf(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  props: InjectorFaceProps,
) {
  const { chamberRadiusMm, nOxidizer, nFuel, dOxMm, dFuelMm, injectorType, impingementHalfAngleDeg } = props;

  const faceY = h / 2;
  const padding = 40;
  // Reserve a margin on the left (next to the divider) so the drawing can be
  // shifted right without its right edge overflowing the half's clip region.
  const leftMargin = (Math.min(w, h) / 2 - padding) * 0.35;
  const scale = (Math.min(w, h) / 2 - padding - leftMargin) / chamberRadiusMm;
  const faceHalfWidth = chamberRadiusMm * scale;
  const cx = w / 2 + leftMargin;

  const rOx = Math.max(2, (dOxMm / 2) * scale);
  const rFuel = Math.max(2, (dFuelMm / 2) * scale);
  const minPitch = Math.max(rOx, rFuel) * 3 * 2;

  const wallExtent = faceHalfWidth * 0.6;

  // --- Face plate ---
  ctx.save();
  ctx.strokeStyle = COLOR_WALL_STROKE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - faceHalfWidth, faceY);
  ctx.lineTo(cx + faceHalfWidth, faceY);
  ctx.stroke();
  ctx.restore();

  // --- Chamber wall stubs ---
  ctx.save();
  ctx.strokeStyle = COLOR_WALL_STROKE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - faceHalfWidth, faceY);
  ctx.lineTo(cx - faceHalfWidth, faceY + wallExtent);
  ctx.moveTo(cx + faceHalfWidth, faceY);
  ctx.lineTo(cx + faceHalfWidth, faceY + wallExtent);
  ctx.stroke();
  ctx.restore();

  // --- Centerline ---
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 4, 2, 4]);
  ctx.beginPath();
  ctx.moveTo(cx, faceY - wallExtent * 0.6);
  ctx.lineTo(cx, faceY + wallExtent * 1.6);
  ctx.stroke();
  ctx.restore();

  // --- Ø dimension ---
  const yDim = faceY + wallExtent + 18;
  dimLine(ctx, cx - faceHalfWidth, yDim, cx + faceHalfWidth, yDim);
  ctx.save();
  ctx.fillStyle = AMBER;
  ctx.font = '11px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`Ø ${(chamberRadiusMm * 2).toFixed(1)} mm`, cx, yDim - 2);
  ctx.restore();

  // ---- Layout by injector type ----

  if (injectorType === 'showerhead') {
    const total = Math.min(7, nOxidizer + nFuel);
    if (total > 0) {
      const span = faceHalfWidth * 1.4;
      const step = total > 1 ? span / (total - 1) : 0;
      const startX = cx - span / 2;
      for (let i = 0; i < total; i++) {
        const isOx = i % 2 === 0;
        const r = isOx ? rOx : rFuel;
        const x = total > 1 ? startX + step * i : cx;
        drawBore(ctx, x, faceY, r, r * BORE_LENGTH_FACTOR, isOx ? COLOR_OX : COLOR_FUEL);
      }
    }

  } else if (injectorType === 'pintle') {
    const postR = Math.max(rOx * 3, faceHalfWidth * 0.12);
    const annulusOuterR = postR + Math.max(rFuel * 2, postR * 0.35);
    const postHeight = postR * POST_HEIGHT_FACTOR;

    // Fuel annulus: thin slabs flanking the post, flush with the face
    ctx.fillStyle = COLOR_FUEL;
    ctx.fillRect(cx - annulusOuterR, faceY - postHeight * 0.4, annulusOuterR - postR, postHeight * 0.4);
    ctx.fillRect(cx + postR, faceY - postHeight * 0.4, annulusOuterR - postR, postHeight * 0.4);

    // Oxidizer post protruding upstream through the face
    ctx.fillStyle = COLOR_OX;
    ctx.fillRect(cx - postR, faceY - postHeight, postR * 2, postHeight);

    // Axial oxidizer flow arrow, straight through the post
    ctx.strokeStyle = COLOR_OX;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, faceY - postHeight * 0.85);
    ctx.lineTo(cx, faceY + wallExtent * 0.3);
    ctx.stroke();
    arrowHead(ctx, cx, faceY - postHeight * 0.85, cx, faceY + wallExtent * 0.3, COLOR_OX);

    // Radial fuel-exit arrows at the face, both sides
    const fuelArrowY = faceY - postHeight * 0.2;
    ctx.strokeStyle = COLOR_FUEL;
    ctx.beginPath();
    ctx.moveTo(cx - postR, fuelArrowY);
    ctx.lineTo(cx - annulusOuterR * 1.3, fuelArrowY);
    ctx.stroke();
    arrowHead(ctx, cx - postR, fuelArrowY, cx - annulusOuterR * 1.3, fuelArrowY, COLOR_FUEL);
    ctx.beginPath();
    ctx.moveTo(cx + postR, fuelArrowY);
    ctx.lineTo(cx + annulusOuterR * 1.3, fuelArrowY);
    ctx.stroke();
    arrowHead(ctx, cx + postR, fuelArrowY, cx + annulusOuterR * 1.3, fuelArrowY, COLOR_FUEL);

  } else if (injectorType === 'coaxial') {
    const innerR = Math.max(3, rOx);
    const outerR = Math.max(innerR, rOx + rFuel * 1.5);
    const boreLength = outerR * BORE_LENGTH_FACTOR;
    const nElements = Math.min(2, Math.max(1, nOxidizer));
    const span = nElements > 1 ? outerR * 4 : 0;
    const startX = cx - span / 2;

    for (let i = 0; i < nElements; i++) {
      const ex = nElements > 1 ? startX + span * i : cx;
      drawBore(ctx, ex, faceY, outerR, boreLength, COLOR_FUEL);
      drawBore(ctx, ex, faceY, innerR, boreLength, COLOR_OX);
    }

  } else if (injectorType === 'impinging_fof' || injectorType === 'impinging_ofo') {
    const isFof = injectorType === 'impinging_fof';
    const centerColor = isFof ? COLOR_OX : COLOR_FUEL;
    const flankColor = isFof ? COLOR_FUEL : COLOR_OX;
    const centerR = isFof ? rOx : rFuel;
    const flankR = isFof ? rFuel : rOx;
    const flankSpread = rOx + rFuel + minPitch * 0.5;

    const { angleRad, depthPx } = convergenceGeometry(flankSpread, impingementHalfAngleDeg);
    const apexX = cx;
    const apexY = faceY + depthPx;

    drawBore(ctx, cx, faceY, centerR, Math.min(depthPx * 0.3, centerR * BORE_LENGTH_FACTOR), centerColor);
    [-1, 1].forEach((side) => {
      const fx = cx + side * flankSpread;
      drawBore(ctx, fx, faceY, flankR, Math.min(depthPx * 0.3, flankR * BORE_LENGTH_FACTOR), flankColor);
      ctx.strokeStyle = COLOR_IMP_LINE;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(fx, faceY);
      ctx.lineTo(apexX, apexY);
      ctx.stroke();
    });
    ctx.save();
    ctx.strokeStyle = COLOR_IMP_LINE;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(apexX, apexY + wallExtent * 0.4);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = AMBER;
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${(angleRad * 180 / Math.PI).toFixed(1)}°`, apexX + 6, apexY);
    ctx.restore();

  } else {
    // Impinging doublet (default case): 1 ox + 1 fuel jet converging.
    const pairSpread = rOx + rFuel + minPitch * 0.4;
    const { angleRad, depthPx } = convergenceGeometry(pairSpread / 2, impingementHalfAngleDeg);
    const apexX = cx;
    const apexY = faceY + depthPx;

    const oxX = cx - pairSpread / 2;
    const fX = cx + pairSpread / 2;
    drawBore(ctx, oxX, faceY, rOx, Math.min(depthPx * 0.3, rOx * BORE_LENGTH_FACTOR), COLOR_OX);
    drawBore(ctx, fX, faceY, rFuel, Math.min(depthPx * 0.3, rFuel * BORE_LENGTH_FACTOR), COLOR_FUEL);

    ctx.strokeStyle = COLOR_IMP_LINE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(oxX, faceY);
    ctx.lineTo(apexX, apexY);
    ctx.moveTo(fX, faceY);
    ctx.lineTo(apexX, apexY);
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = COLOR_IMP_LINE;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(apexX, apexY + wallExtent * 0.4);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = AMBER;
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${(angleRad * 180 / Math.PI).toFixed(1)}°`, apexX + 6, apexY);
    ctx.restore();
  }
}

// ── Outer orchestrator: splits the canvas into face view (left) + cross-section (right) ──

function drawFace(
  canvas: HTMLCanvasElement,
  cssW: number,
  cssH: number,
  view: ViewState,
  props: InjectorFaceProps,
) {
  const { chamberRadiusMm } = props;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, cssW, cssH);

  if (chamberRadiusMm <= 0) return;

  ctx.save();
  ctx.translate(view.panX, view.panY);
  ctx.scale(view.vZoom, view.vZoom);

  drawGrid(ctx, cssW, cssH, view.panX, view.panY, view.vZoom);

  const halfW = cssW / 2;
  const gap = 2;

  // Left half: face view
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, halfW - gap / 2, cssH);
  ctx.clip();
  drawFaceHalf(ctx, halfW, cssH, props);
  ctx.restore();

  // Right half: cross-section view
  ctx.save();
  ctx.beginPath();
  ctx.rect(halfW + gap / 2, 0, halfW - gap / 2, cssH);
  ctx.clip();
  ctx.translate(halfW, 0);
  drawCrossSectionHalf(ctx, halfW, cssH, props);
  ctx.restore();

  ctx.restore();

  // ---- Legend (pinned to bottom-right, CSS-pixel space) ----
  const legX = cssW - 90;
  const legY = cssH - 40;
  drawHole(ctx, legX, legY,      5, COLOR_OX);
  drawHole(ctx, legX, legY + 16, 5, COLOR_FUEL);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '10px "Courier New", monospace';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText('Oxidizer', legX + 10, legY + 4);
  ctx.fillText('Fuel',     legX + 10, legY + 20);
}

function fmt(v: number | null | undefined, dec = 2): string {
  if (v == null || !isFinite(v)) return '—';
  return v.toFixed(dec);
}

export default function InjectorFace(props: InjectorFaceProps) {
  const { selectedRow, dOxMm, dFuelMm, chamberPressureBar, view: viewProp, onViewChange: setView } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const view = viewProp ?? FALLBACK_VIEW;
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const redraw = useCallback(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = rect.height;
    if (cssW === 0 || cssH === 0) return;
    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    drawFace(canvas, cssW, cssH, viewRef.current, props);
  }, [props]);

  // Set centered view once dimensions are known — retry each frame until layout is ready
  useEffect(() => {
    if (viewProp) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let rafId: number;
    const tryCenter = () => {
      const { width: cW, height: cH } = canvas.getBoundingClientRect();
      if (cW > 0 && cH > 0) {
        setView(centeredView(cW, cH));
      } else {
        rafId = requestAnimationFrame(tryCenter);
      }
    };
    rafId = requestAnimationFrame(tryCenter);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    redraw();
    const obs = new ResizeObserver(redraw);
    if (canvasRef.current) obs.observe(canvasRef.current);
    return () => obs.disconnect();
  }, [redraw]);

  // Re-draw when view changes
  useEffect(() => { redraw(); }, [view, redraw]);

  // Non-passive wheel listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { panX, panY, vZoom } = viewRef.current;
      const rect = el.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.max(0.05, Math.min(20, vZoom * factor));
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const wx = (mx - panX) / vZoom;
      const wy = (my - panY) / vZoom;
      setView({ panX: mx - wx * newZoom, panY: my - wy * newZoom, vZoom: newZoom });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
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
    setView({ ...viewRef.current, panX: startPanX + e.clientX - startX, panY: startPanY + e.clientY - startY });
  };

  const handleMouseUp = () => { drag.current = null; setDragging(false); };

  const handleDoubleClick = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width: cW, height: cH } = canvas.getBoundingClientRect();
    setView(centeredView(cW, cH));
  };

  const handleZoomIn = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const v = viewRef.current;
    const newZoom = Math.min(20, v.vZoom * 1.2);
    const cx = rect.width / 2, cy = rect.height / 2;
    const wx = (cx - v.panX) / v.vZoom;
    const wy = (cy - v.panY) / v.vZoom;
    setView({ panX: cx - wx * newZoom, panY: cy - wy * newZoom, vZoom: newZoom });
  };

  const handleZoomOut = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const v = viewRef.current;
    const newZoom = Math.max(0.05, v.vZoom / 1.2);
    const cx = rect.width / 2, cy = rect.height / 2;
    const wx = (cx - v.panX) / v.vZoom;
    const wy = (cy - v.panY) / v.vZoom;
    setView({ panX: cx - wx * newZoom, panY: cy - wy * newZoom, vZoom: newZoom });
  };

  return (
    <div ref={containerRef} className="injector-face-wrap">
      <canvas
        ref={canvasRef}
        className="injector-face-canvas"
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />

      <div className="injf-overlay-controls">
        <Tooltip title="Zoom in" placement="right" arrow>
          <IconButton className="injf-zoom-btn" onClick={handleZoomIn} size="small" disableRipple>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom out" placement="right" arrow>
          <IconButton className="injf-zoom-btn" onClick={handleZoomOut} size="small" disableRipple>
            <RemoveIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reset view" placement="right" arrow>
          <IconButton className="injf-zoom-btn injf-zoom-btn--reset" onClick={handleDoubleClick} size="small" disableRipple>
            <RestoreIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip
          title={
            <div>
              <div><kbd>Scroll</kbd> Zoom in / out</div>
              <div><kbd>Drag</kbd> Pan view</div>
              <div><kbd>Double-click</kbd> Reset view</div>
            </div>
          }
          placement="right"
          arrow
        >
          <IconButton className="injf-zoom-btn" size="small" disableRipple>
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      {selectedRow && (
        <div className="inj-face-overlay">
          <Tooltip title="Number of oxidizer orifices at the selected drill diameter" placement="right" arrow>
            <span className="inj-fo-key">Ox holes</span>
          </Tooltip>
          <span className="inj-fo-val">
            {selectedRow.oxidizer_hole_count}
            <span className="inj-fo-sub"> @ {dOxMm} mm ⌀</span>
          </span>

          <Tooltip title="Number of fuel orifices at the selected drill diameter" placement="right" arrow>
            <span className="inj-fo-key">Fuel holes</span>
          </Tooltip>
          <span className="inj-fo-val">
            {selectedRow.fuel_hole_count}
            <span className="inj-fo-sub"> @ {dFuelMm} mm ⌀</span>
          </span>

          <Tooltip title="Oxidizer exit velocity through each orifice — v_ox = C_d × √(2·ΔP / ρ_ox)" placement="right" arrow>
            <span className="inj-fo-key">Ox velocity</span>
          </Tooltip>
          <span className="inj-fo-val">{fmt(selectedRow.oxidizer_velocity_ms, 1)} <span className="inj-fo-unit">m/s</span></span>

          <Tooltip title="Fuel exit velocity through each orifice — v_f = C_d × √(2·ΔP / ρ_f)" placement="right" arrow>
            <span className="inj-fo-key">Fuel velocity</span>
          </Tooltip>
          <span className="inj-fo-val">{fmt(selectedRow.fuel_velocity_ms, 1)} <span className="inj-fo-unit">m/s</span></span>

          <Tooltip title="v_f / v_ox — coaxial shear-atomisation driver; target ~10–15 for effective mixing" placement="right" arrow>
            <span className="inj-fo-key">Velocity ratio</span>
          </Tooltip>
          <span className="inj-fo-val">{fmt(selectedRow.v_ratio, 3)}</span>

          <Tooltip title="J = ρ_f·v_f² / ρ_o·v_o² — impinging mixing quality; target ~0.8–1.2 for a balanced spray fan" placement="right" arrow>
            <span className="inj-fo-key">Mom. flux ratio</span>
          </Tooltip>
          <span className="inj-fo-val">{fmt(selectedRow.momentum_flux_ratio, 3)}</span>

          {selectedRow.impingement_point_dist_mm != null && (
            <>
              <Tooltip title="Distance from the injector face to the jet impingement point (impinging types only)" placement="right" arrow>
                <span className="inj-fo-key">Imp. dist</span>
              </Tooltip>
              <span className="inj-fo-val">{fmt(selectedRow.impingement_point_dist_mm, 2)} <span className="inj-fo-unit">mm</span></span>
            </>
          )}

          <Tooltip title="Pressure drop across the injector. Higher ΔP improves combustion stability but increases feed system pressure requirements." placement="right" arrow>
            <span className="inj-fo-key">ΔP</span>
          </Tooltip>
          <span className="inj-fo-val">
            {fmt(selectedRow.delta_P_bar, 2)} <span className="inj-fo-unit">bar</span>
            <span className="inj-fo-sub"> ({fmt(selectedRow.dp_percentage, 1)}%)</span>
          </span>

          {chamberPressureBar != null && (
            <>
              <Tooltip title="Required propellant inlet pressure = Pc + ΔP" placement="right" arrow>
                <span className="inj-fo-key">Inlet P</span>
              </Tooltip>
              <span className="inj-fo-val">
                {fmt(chamberPressureBar + selectedRow.delta_P_bar, 2)} <span className="inj-fo-unit">bar</span>
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
