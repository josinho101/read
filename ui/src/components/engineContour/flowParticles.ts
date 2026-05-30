import { type FlowProfile, flowColor, interpolateAt } from './isentropicFlow';
import { type PlumeGeometry, type PlumeParams } from './exhaustPlume';

export interface Particle {
  xLog: number;
  yLog: number;
  streamFraction: number;
  side: 1 | -1;   // +1 = top half, -1 = bottom half
  speed: number;
  inPlume: boolean;
  plumeAngle: number;
}

const PARTICLE_COUNT = 256;
const STREAM_COUNT   = 12;
const BASE_SPEED     = 0.4; // logical px per ms at normalized velocity = 1

export function initParticles(profile: FlowProfile): Particle[] {
  const { points } = profile;
  const xMin = points[0].xLog;
  const xMax = points[points.length - 1].xLog;
  const totalLen = xMax - xMin;
  // Combustion chamber + convergent section occupies roughly the first 38% of x-range
  const chamberEnd = xMin + totalLen * 0.38;
  const particles: Particle[] = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const streamIndex    = Math.floor(i / (PARTICLE_COUNT / STREAM_COUNT));
    const streamFraction = (streamIndex + 0.5) / STREAM_COUNT;
    // Alternate top/bottom every pair; bias every other pair to the chamber region
    const side: 1 | -1 = (i % 4 < 2) ? 1 : -1;
    const xLog = (i % 2 === 0)
      ? xMin + Math.random() * (chamberEnd - xMin)
      : xMin + Math.random() * totalLen;
    const wp   = interpolateAt(profile, xLog);
    const midY = (wp.topY + wp.botY) / 2;
    const halfH = midY - wp.topY;
    particles.push({
      xLog,
      yLog: midY - side * streamFraction * halfH * 0.9,
      streamFraction,
      side,
      speed: 0.6 + Math.random() * 0.8,
      inPlume: false,
      plumeAngle: 0,
    });
  }
  return particles;
}

function interpolateBoundaryHalfH(
  boundary: PlumeGeometry['boundary'],
  xLog: number,
  midY: number,
): number {
  if (boundary.length === 0) return 0;
  if (xLog <= boundary[0].x) return midY - boundary[0].yTop;
  if (xLog >= boundary[boundary.length - 1].x) return midY - boundary[boundary.length - 1].yTop;
  for (let i = 1; i < boundary.length; i++) {
    if (boundary[i].x >= xLog) {
      const t = (xLog - boundary[i - 1].x) / (boundary[i].x - boundary[i - 1].x);
      const h0 = midY - boundary[i - 1].yTop;
      const h1 = midY - boundary[i].yTop;
      return h0 + t * (h1 - h0);
    }
  }
  return midY - boundary[boundary.length - 1].yTop;
}

export function advanceParticles(
  particles: Particle[],
  profile: FlowProfile,
  dt: number,
  plumeGeom?: PlumeGeometry,
  plumeParams?: PlumeParams,
): void {
  const { points, minV, maxV } = profile;
  const xMin     = points[0].xLog;
  const xMax     = points[points.length - 1].xLog;
  const totalLen = xMax - xMin;
  const logMax   = Math.log1p(maxV / Math.max(minV, 1e-6));

  const lastPt   = points[points.length - 1];
  const exitV    = lastPt.velocity;
  const exitVNorm = Math.log1p(exitV / Math.max(minV, 1e-6)) / logMax;

  const plumeEnd = plumeParams ? plumeParams.exitX + plumeParams.plumeLength : xMax;

  for (const p of particles) {
    if (p.inPlume && plumeGeom && plumeParams) {
      // Advance in plume region
      p.xLog += exitVNorm * BASE_SPEED * p.speed * dt;
      p.yLog += Math.tan(p.plumeAngle) * exitVNorm * BASE_SPEED * p.speed * dt * Math.sign(midYOf(p, plumeParams.midY));

      const boundaryHalfH = interpolateBoundaryHalfH(plumeGeom.boundary, p.xLog, plumeParams.midY);
      const particleHalfH = Math.abs(p.yLog - plumeParams.midY);

      // Recycle when past plume end or outside boundary
      if (p.xLog > plumeEnd || particleHalfH > boundaryHalfH * 1.1) {
        recycleToNozzle(p, xMin, totalLen, profile);
      }
    } else {
      // Advance inside nozzle
      const wp    = interpolateAt(profile, p.xLog);
      const vNorm = Math.log1p(wp.velocity / Math.max(minV, 1e-6)) / logMax;
      p.xLog += vNorm * BASE_SPEED * p.speed * dt;

      if (p.xLog > xMax) {
        if (plumeGeom && plumeParams) {
          // Transition to plume — keep plumeAngle positive; midYOf sign drives direction for both sides
          p.inPlume = true;
          p.plumeAngle = plumeParams.exitAngleRad * p.streamFraction;

          // Snap y to the correct streamline within exit plane
          const exitWp    = interpolateAt(profile, xMax);
          const exitMidY  = (exitWp.topY + exitWp.botY) / 2;
          const exitHalfH = exitMidY - exitWp.topY;
          p.yLog = exitMidY - p.side * p.streamFraction * exitHalfH * 0.9;
        } else {
          recycleToNozzle(p, xMin, totalLen, profile);
        }
      } else {
        const newWp = interpolateAt(profile, p.xLog);
        const midY  = (newWp.topY + newWp.botY) / 2;
        const halfH = midY - newWp.topY;
        p.yLog = midY - p.side * p.streamFraction * halfH * 0.9;
      }
    }
  }
}

function midYOf(p: Particle, midY: number): number {
  return p.yLog < midY ? -1 : 1;
}

function recycleToNozzle(p: Particle, xMin: number, totalLen: number, profile: FlowProfile): void {
  p.inPlume = false;
  p.plumeAngle = 0;
  p.xLog = xMin + Math.random() * totalLen * 0.1;
  const wp = interpolateAt(profile, p.xLog);
  const midY = (wp.topY + wp.botY) / 2;
  const halfH = midY - wp.topY;
  p.yLog = midY - p.side * p.streamFraction * halfH * 0.9;
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  profile: FlowProfile,
): void {
  ctx.save();

  const lastPt = profile.points[profile.points.length - 1];

  for (const p of particles) {
    let color: string;

    if (p.inPlume) {
      // Bright warm yellow — clearly visible against both dark background and orange plume glow
      color = 'rgba(255,248,160,0.95)';
    } else {
      const wp = interpolateAt(profile, p.xLog);
      color = flowColor(wp.temperature, profile.minT, profile.maxT);
    }

    // White glow halo — makes particles visible against any heatmap background color
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.xLog, p.yLog, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Colored core
    ctx.globalAlpha = 0.90;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.xLog, p.yLog, 2.0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
