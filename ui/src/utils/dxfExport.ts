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

function dxfLine(layer: string, x1: number, y1: number, x2: number, y2: number): string {
  return [
    '0', 'LINE',
    '8', layer,
    '10', x1.toFixed(6),
    '20', y1.toFixed(6),
    '11', x2.toFixed(6),
    '21', y2.toFixed(6),
  ].join('\n');
}

function dxfLwPolyline(layer: string, points: { x: number; r: number }[]): string {
  const header = [
    '0', 'LWPOLYLINE',
    '8', layer,
    '100', 'AcDbEntity',
    '100', 'AcDbPolyline',
    '90', String(points.length),
    '70', '0',
  ].join('\n');
  const coords = points.map(p => `10\n${p.x.toFixed(6)}\n20\n${p.r.toFixed(6)}`).join('\n');
  return header + '\n' + coords;
}

export function generateEngineDXF(geom: EngineGeometry, nozzleType: NozzleType): string {
  const { Rc, Re, xExit } = geom;
  const contourPts = sampleContourMM(geom, nozzleType);

  const entities = [
    dxfLwPolyline('CONTOUR', contourPts),
    dxfLine('CENTERLINE', 0, 0, xExit, 0),
    dxfLine('BOUNDARY', 0, 0, 0, Rc),
    dxfLine('BOUNDARY', xExit, 0, xExit, Re),
  ].join('\n');

  return [
    '0', 'SECTION',
    '2', 'HEADER',
    '9', '$ACADVER',
    '1', 'AC1015',
    '9', '$INSUNITS',
    '70', '4',        // 4 = millimetres
    '0', 'ENDSEC',
    '0', 'SECTION',
    '2', 'ENTITIES',
    entities,
    '0', 'ENDSEC',
    '0', 'EOF',
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
