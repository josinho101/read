import { type EngineGeometry, type NozzleType } from '../components/engineContour/isentropicFlow';

const DEG = Math.PI / 180;

function cubicBez(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

export function sampleContourMM(
  geom: EngineGeometry,
  nozzleType: NozzleType,
  nPts = 200,
): { x: number; r: number }[] {
  const { Rc, Rt, Re, xConvStart, xThroat, xExit, convergentHalfDeg, bp1x, bp1r, bp2x, bp2r } = geom;

  const pts: { x: number; r: number }[] = [];
  const nCyl  = Math.round(nPts * 0.15);
  const nConv = Math.round(nPts * 0.30);
  const nDiv  = nPts - nCyl - nConv;

  // Cylindrical chamber
  for (let i = 0; i <= nCyl; i++) {
    pts.push({ x: (i / nCyl) * xConvStart, r: Rc });
  }

  // Convergent Bézier — re-derive mm control points using same formula as computeGeometry
  const cDx  = xThroat - xConvStart;
  const cDy  = Rc - Rt;
  const cLen = Math.sqrt(cDx * cDx + cDy * cDy);
  const cp1x = xConvStart + Math.cos(convergentHalfDeg * DEG) * cLen * 0.38;
  const cp1r = Rc         - Math.sin(convergentHalfDeg * DEG) * cLen * 0.38;
  const cp2x = xThroat    - Math.cos(convergentHalfDeg * DEG) * cLen * 0.38;
  const cp2r = Rt         + Math.sin(convergentHalfDeg * DEG) * cLen * 0.38;

  for (let i = 1; i <= nConv; i++) {
    const t = i / nConv;
    pts.push({
      x: cubicBez(t, xConvStart, cp1x, cp2x, xThroat),
      r: cubicBez(t, Rc, cp1r, cp2r, Rt),
    });
  }

  // Divergent section
  for (let i = 1; i <= nDiv; i++) {
    const t = i / nDiv;
    if (nozzleType === 'bell' || nozzleType === 'rao') {
      pts.push({
        x: cubicBez(t, xThroat, bp1x, bp2x, xExit),
        r: cubicBez(t, Rt, bp1r, bp2r, Re),
      });
    } else {
      pts.push({
        x: xThroat + t * (xExit - xThroat),
        r: Rt      + t * (Re   - Rt),
      });
    }
  }

  return pts;
}

// DXF R12 (AC1009) — no subclass markers, no entity handles needed
function dxfLine(layer: string, x1: number, y1: number, x2: number, y2: number): string {
  return [
    '0', 'LINE',
    '8', layer,
    '10', x1.toFixed(6), '20', y1.toFixed(6), '30', '0.0',
    '11', x2.toFixed(6), '21', y2.toFixed(6), '31', '0.0',
  ].join('\n');
}

// DXF R12 POLYLINE/VERTEX/SEQEND — universally supported, unlike LWPOLYLINE
function dxfPolyline(layer: string, points: { x: number; r: number }[]): string {
  const header = [
    '0', 'POLYLINE',
    '8', layer,
    '66', '1',   // vertices-follow flag
    '70', '0',   // open 2-D polyline
    '10', '0.0', '20', '0.0', '30', '0.0',
  ].join('\n');

  const vertices = points.map(p => [
    '0', 'VERTEX',
    '8', layer,
    '10', p.x.toFixed(6), '20', p.r.toFixed(6), '30', '0.0',
  ].join('\n')).join('\n');

  const seqend = ['0', 'SEQEND', '8', layer].join('\n');

  return [header, vertices, seqend].join('\n');
}

function buildHeader(minX: number, maxX: number, minY: number, maxY: number): string {
  return [
    '0', 'SECTION',
    '2', 'HEADER',
    '9', '$ACADVER',
    '1', 'AC1009',          // DXF R12 — universally supported baseline
    '9', '$INSUNITS',
    '70', '4',              // 4 = millimetres
    '9', '$EXTMIN',
    '10', minX.toFixed(6), '20', minY.toFixed(6),
    '9', '$EXTMAX',
    '10', maxX.toFixed(6), '20', maxY.toFixed(6),
    '0', 'ENDSEC',
  ].join('\n');
}

// R12 TABLES — no entity handles (5), no subclass markers (100 AcDbXxx),
// no BLOCK_RECORD or DIMSTYLE (R2000-only tables).
function buildTables(cx: number, cy: number, viewH: number): string {
  const rows: string[] = [];
  const p = (...args: string[]) => rows.push(...args);

  p('0', 'SECTION', '2', 'TABLES');

  // ── LTYPE ──────────────────────────────────────────────────────────────────
  p('0', 'TABLE', '2', 'LTYPE', '70', '1');
  p('0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0');
  p('0', 'ENDTAB');

  // ── LAYER ──────────────────────────────────────────────────────────────────
  const layerDefs = [
    { name: '0',          color: '7' },   // white/black
    { name: 'CONTOUR',    color: '1' },   // red
    { name: 'CENTERLINE', color: '5' },   // blue
    { name: 'BOUNDARY',   color: '3' },   // green
  ];
  p('0', 'TABLE', '2', 'LAYER', '70', String(layerDefs.length));
  for (const { name, color } of layerDefs) {
    p('0', 'LAYER', '2', name, '70', '0', '62', color, '6', 'CONTINUOUS');
  }
  p('0', 'ENDTAB');

  // ── STYLE ──────────────────────────────────────────────────────────────────
  p('0', 'TABLE', '2', 'STYLE', '70', '1');
  p('0', 'STYLE', '2', 'STANDARD', '70', '0', '40', '0.0', '41', '1.0', '50', '0.0', '71', '0', '42', '0.2', '3', 'txt', '4', '');
  p('0', 'ENDTAB');

  // ── VIEW (empty) ───────────────────────────────────────────────────────────
  p('0', 'TABLE', '2', 'VIEW', '70', '0');
  p('0', 'ENDTAB');

  // ── UCS (empty) ────────────────────────────────────────────────────────────
  p('0', 'TABLE', '2', 'UCS', '70', '0');
  p('0', 'ENDTAB');

  // ── VPORT ──────────────────────────────────────────────────────────────────
  p('0', 'TABLE', '2', 'VPORT', '70', '1');
  p('0', 'VPORT', '2', '*ACTIVE', '70', '0');
  p('10', '0.0', '20', '0.0');                              // lower-left corner
  p('11', '1.0', '21', '1.0');                              // upper-right corner
  p('12', cx.toFixed(6), '22', cy.toFixed(6));              // view centre
  p('13', '0.0', '23', '0.0');                              // snap base
  p('14', '0.5', '24', '0.5');                              // snap spacing
  p('15', '0.5', '25', '0.5');                              // grid spacing
  p('16', '0.0', '26', '0.0', '36', '1.0');                 // view direction (top)
  p('17', '0.0', '27', '0.0', '37', '0.0');                 // view target
  p('40', viewH.toFixed(6));                                // view height
  p('41', '1.5');                                           // aspect ratio
  p('42', '50.0');                                          // lens length
  p('43', '0.0', '44', '0.0');                              // front/back clip
  p('50', '0.0', '51', '0.0');
  p('71', '0', '72', '100', '73', '1', '74', '3');
  p('75', '0', '76', '0', '77', '0', '78', '0');
  p('0', 'ENDTAB');

  // ── APPID ──────────────────────────────────────────────────────────────────
  p('0', 'TABLE', '2', 'APPID', '70', '1');
  p('0', 'APPID', '2', 'ACAD', '70', '0');
  p('0', 'ENDTAB');

  p('0', 'ENDSEC');
  return rows.join('\n');
}

// R12 BLOCKS section — must be present but can be empty
function buildBlocks(): string {
  return ['0', 'SECTION', '2', 'BLOCKS', '0', 'ENDSEC'].join('\n');
}

export function generateEngineDXF(geom: EngineGeometry, nozzleType: NozzleType): string {
  const { Rc, Re, xExit } = geom;
  const contourPts = sampleContourMM(geom, nozzleType);

  // Compute drawing extents from actual geometry
  const minX = contourPts.reduce((m, p) => Math.min(m, p.x), 0);
  const maxX = contourPts.reduce((m, p) => Math.max(m, p.x), xExit);
  const maxY = contourPts.reduce((m, p) => Math.max(m, p.r), Math.max(Rc, Re));
  const minY = 0.0;
  const cx = (minX + maxX) / 2;
  const cy = maxY / 2;
  const viewH = maxY * 1.2;

  const entities = [
    dxfPolyline('CONTOUR',    contourPts),
    dxfLine('CENTERLINE', 0,     0,  xExit, 0),
    dxfLine('BOUNDARY',   0,     0,  0,     Rc),
    dxfLine('BOUNDARY',   xExit, 0,  xExit, Re),
  ].join('\n');

  return [
    buildHeader(minX, maxX, minY, maxY),
    buildTables(cx, cy, viewH),
    buildBlocks(),
    ['0', 'SECTION', '2', 'ENTITIES', entities, '0', 'ENDSEC'].join('\n'),
    '0',
    'EOF',
    '',   // trailing newline required by some parsers
  ].join('\n');
}

export function downloadDXF(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/dxf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
