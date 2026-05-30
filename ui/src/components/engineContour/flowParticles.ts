import { type FlowProfile, flowColor, interpolateAt } from './isentropicFlow';

export interface Particle {
  xLog: number;
  yLog: number;
  streamFraction: number;
  speed: number;
}

const PARTICLE_COUNT = 64;
const STREAM_COUNT   = 8;
const BASE_SPEED     = 0.4; // logical px per ms at normalized velocity = 1

export function initParticles(profile: FlowProfile): Particle[] {
  const { points } = profile;
  const xMin = points[0].xLog;
  const xMax = points[points.length - 1].xLog;
  const particles: Particle[] = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const streamIndex   = Math.floor(i / (PARTICLE_COUNT / STREAM_COUNT));
    const streamFraction = (streamIndex + 0.5) / STREAM_COUNT;
    const xLog = xMin + Math.random() * (xMax - xMin);
    const wp   = interpolateAt(profile, xLog);
    const midY = (wp.topY + wp.botY) / 2;
    const halfH = midY - wp.topY;
    particles.push({
      xLog,
      yLog: midY - streamFraction * halfH * 0.9,
      streamFraction,
      speed: 0.6 + Math.random() * 0.8,
    });
  }
  return particles;
}

export function advanceParticles(
  particles: Particle[],
  profile: FlowProfile,
  dt: number,
): void {
  const { points, minV, maxV } = profile;
  const xMin     = points[0].xLog;
  const xMax     = points[points.length - 1].xLog;
  const totalLen = xMax - xMin;
  const logMax   = Math.log1p(maxV / Math.max(minV, 1e-6));

  for (const p of particles) {
    const wp    = interpolateAt(profile, p.xLog);
    const vNorm = Math.log1p(wp.velocity / Math.max(minV, 1e-6)) / logMax;
    p.xLog += vNorm * BASE_SPEED * p.speed * dt;

    if (p.xLog > xMax) {
      p.xLog = xMin + Math.random() * totalLen * 0.1;
    }

    const newWp = interpolateAt(profile, p.xLog);
    const midY  = (newWp.topY + newWp.botY) / 2;
    const halfH = midY - newWp.topY;
    p.yLog = midY - p.streamFraction * halfH * 0.9;
  }
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  profile: FlowProfile,
): void {
  ctx.save();
  ctx.globalAlpha = 0.82;

  for (const p of particles) {
    const wp    = interpolateAt(profile, p.xLog);
    const color = flowColor(wp.temperature, profile.minT, profile.maxT);
    const midY  = (wp.topY + wp.botY) / 2;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.xLog, p.yLog, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.xLog, 2 * midY - p.yLog, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
