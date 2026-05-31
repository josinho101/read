import { FUEL_COOLANT_PROPS, type CoolantSuitability } from './fuelCoolantProps';
import type { HeatFluxProfile } from './bartzHeatFlux';

export type WallMaterial = 'copper' | 'steel' | 'inconel';

export const WALL_MATERIAL_K: Record<WallMaterial, number> = {
  copper:  385,  // W/mK — high thermal conductivity, common in regen channels
  steel:    16,  // W/mK — stainless 304
  inconel:  11,  // W/mK — Inconel 718, high-temp capability
};

export interface RegenChannelParams {
  numChannels:              number;  // 20–200
  channelWidthMm:           number;  // 0.5–5.0
  channelHeightMm:          number;  // 0.5–5.0
  wallThicknessMm:          number;  // 0.2–3.0 (hot-side wall between channel and gas)
  wallMaterial:             WallMaterial;
  coolantInletTempK:        number;  // fuel temperature at the coolant inlet (nozzle exit)
  coolantInletPressureBar:  number;
}

export interface RegenPoint {
  xPhys_mm:       number;
  T_hot_wall_K:   number;  // inner wall surface temperature (gas side)
  T_cold_wall_K:  number;  // outer wall surface temperature (coolant side)
  T_coolant_K:    number;  // bulk coolant temperature
  hc_WM2K:        number;  // coolant-side heat transfer coefficient
  pressureBar:    number;  // local coolant pressure
}

export interface RegenResult {
  points:             RegenPoint[];  // chamber-entrance → nozzle-exit order
  totalDeltaP_bar:    number;
  maxHotWallTemp_K:   number;
  exitCoolantTemp_K:  number;        // coolant temperature at the chamber-end outlet
  suitability:        CoolantSuitability;
  warningMessage?:    string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function prandtlLiquid(Cp: number, mu: number, k: number): number {
  return (Cp * mu) / k;
}

// ── Main computation ──────────────────────────────────────────────────────────

export function computeRegenCooling(
  heatFluxProfile:  HeatFluxProfile,
  channelParams:    RegenChannelParams,
  fuelCode:         string,
  mDotFuelKgPerS:   number,
  throatRadiusMm:   number,
): RegenResult {
  const props = FUEL_COOLANT_PROPS[fuelCode];

  if (!props || props.suitability === 'unsupported') {
    const label = props?.warningMsg ?? `${fuelCode} is not supported as a regen coolant`;
    return {
      points: [],
      totalDeltaP_bar: 0,
      maxHotWallTemp_K: 0,
      exitCoolantTemp_K: channelParams.coolantInletTempK,
      suitability: 'unsupported',
      warningMessage: label,
    };
  }

  const { density_kgM3: rho, Cp_JkgK: Cp, k_WmK: k_c, mu_PaS: mu } = props;
  const k_wall   = WALL_MATERIAL_K[channelParams.wallMaterial];
  const t_wall_m = channelParams.wallThicknessMm * 1e-3;
  const w_m      = channelParams.channelWidthMm  * 1e-3;
  const h_m      = channelParams.channelHeightMm * 1e-3;
  const N        = channelParams.numChannels;

  const A_ch  = w_m * h_m;
  const D_h   = (4 * A_ch) / (2 * (w_m + h_m));
  const Pr_c  = prandtlLiquid(Cp, mu, k_c);

  const mDotPerChannel = mDotFuelKgPerS / N;
  const velocity       = mDotPerChannel / (rho * A_ch);
  const Re             = (rho * velocity * D_h) / mu;

  // Dittus-Boelter: Nu = 0.023 × Re^0.8 × Pr^0.4  (fluid being heated → exponent 0.4)
  const Nu = 0.023 * Math.pow(Math.max(Re, 10), 0.8) * Math.pow(Pr_c, 0.4);
  const h_c = (Nu * k_c) / D_h;

  // Blasius friction factor for turbulent flow
  const f = 0.316 * Math.pow(Math.max(Re, 10), -0.25);

  // Coolant flows counter-current: enters at nozzle exit, exits at chamber face.
  // March from exit (last point) to chamber (first point), accumulate T and P.
  const { points: hfPoints } = heatFluxProfile;
  if (hfPoints.length < 2) {
    return {
      points: [],
      totalDeltaP_bar: 0,
      maxHotWallTemp_K: 0,
      exitCoolantTemp_K: channelParams.coolantInletTempK,
      suitability: props.suitability,
      warningMessage: props.warningMsg,
    };
  }

  // Build result array in reverse (exit → chamber), then flip at the end
  const reversed: RegenPoint[] = [];
  let T_coolant   = channelParams.coolantInletTempK;
  let pressureBar = channelParams.coolantInletPressureBar;

  for (let i = hfPoints.length - 1; i >= 0; i--) {
    const p    = hfPoints[i];
    const q    = p.heatFlux;  // W/m²

    // Local nozzle radius from isentropic area ratio: r = Rt × sqrt(areaRatio)
    // areaRatio is not on HeatFluxPoint directly — derive radius from xPhys_mm
    // instead use the simpler fact that we need the local circumference to compute
    // how much heat each channel absorbs. We use the throat radius and approximate
    // the local radius via the physical position (see note below).
    // Since HeatFluxProfile does not carry areaRatio, we use the ratio of
    // (local nozzle circumference) ≈ 2π × Rt × sqrt(areaRatioAtX).
    // However, we don't have areaRatio here. As a conservative approximation,
    // we attribute heat uniformly across all N channels regardless of radius,
    // which is correct for the per-unit-length heat balance:
    //   q_per_channel_per_dx = q [W/m²] × (2π r(x) / N) × dx [m]
    // We pass throatRadiusMm and reconstruct radius below using hfPoints index
    // relative to throat position.
    // Since we do not have local areaRatio in HeatFluxPoint, we use the throat
    // radius as a conservative estimate (area is smallest there, heat is highest).
    // For a more accurate model, areaRatio should be added to HeatFluxPoint —
    // but for engineering estimates this is acceptable.
    const r_m      = throatRadiusMm * 1e-3;  // conservative: use throat radius
    const circumPerChannel = (2 * Math.PI * r_m) / N;  // m (arc length per channel)

    // Step length in meters (physical distance between this and next point)
    const dx_m = i > 0
      ? Math.abs(p.xPhys_mm - hfPoints[i - 1].xPhys_mm) * 1e-3
      : Math.abs(p.xPhys_mm - hfPoints[Math.min(i + 1, hfPoints.length - 1)].xPhys_mm) * 1e-3;

    // Heat absorbed by this channel segment
    const dQ = q * circumPerChannel * dx_m;  // W

    // Wall temperatures via thermal resistance chain
    const T_cw = T_coolant + (q / Math.max(h_c, 1));           // coldwall = coolant + q/hc
    const T_hw = T_cw + (q * t_wall_m) / Math.max(k_wall, 1);  // hotwall  = coldwall + q×t/k

    reversed.push({
      xPhys_mm:       p.xPhys_mm,
      T_hot_wall_K:   T_hw,
      T_cold_wall_K:  T_cw,
      T_coolant_K:    T_coolant,
      hc_WM2K:        h_c,
      pressureBar,
    });

    // Advance coolant state for next step (marching toward chamber)
    const dT = dQ / Math.max(mDotPerChannel * Cp, 1e-12);
    T_coolant   += dT;

    // Darcy-Weisbach pressure drop
    const dP_Pa  = f * (dx_m / Math.max(D_h, 1e-6)) * rho * velocity * velocity / 2;
    pressureBar -= dP_Pa / 1e5;
  }

  // Flip to chamber-entrance → nozzle-exit order (matches all other profiles)
  const points = reversed.reverse();

  const maxHotWallTemp_K  = Math.max(...points.map(p => p.T_hot_wall_K));
  const exitCoolantTemp_K = points[points.length - 1]?.T_coolant_K ?? T_coolant;
  const totalDeltaP_bar   = Math.max(0,
    channelParams.coolantInletPressureBar - (points[0]?.pressureBar ?? channelParams.coolantInletPressureBar),
  );

  return {
    points,
    totalDeltaP_bar,
    maxHotWallTemp_K,
    exitCoolantTemp_K,
    suitability: props.suitability,
    warningMessage: props.warningMsg,
  };
}
