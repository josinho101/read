import {
  MU_REF, T_SUTH_REF, C_SUTH,
  THROAT_CURVATURE_FACTOR,
} from './bartzConstants';
import type { FlowProfile, EngineGeometry } from './isentropicFlow';

const R_UNIVERSAL = 8314; // J/(kmol·K)

export interface HeatFluxPoint {
  xLog:     number;  // canvas x — matches FlowPoint.xLog for heatmap alignment
  xPhys_mm: number;  // physical axial distance from chamber entrance (mm)
  heatFlux: number;  // convective heat flux q (W/m²)
  hg:       number;  // heat transfer coefficient h_g (W/m²K)
  T_aw:     number;  // adiabatic wall temperature (K)
  T_gas:    number;  // local static gas temperature (K)
}

export interface HeatFluxProfile {
  points:      HeatFluxPoint[];
  minHeatFlux: number;  // for heatmap colour scale
  maxHeatFlux: number;
  throatXLog:  number;  // canvas x at throat
  throatXPhys: number;  // physical x at throat in mm (chart reference line)
}

// ── Transport property helpers ────────────────────────────────────────────────

function viscosity(T_K: number): number {
  // Sutherland's law — dynamic viscosity of combustion gas mix at temperature T
  return MU_REF * Math.pow(T_K / T_SUTH_REF, 1.5) * (T_SUTH_REF + C_SUTH) / (T_K + C_SUTH);
}

function specificHeat(gamma: number, MW_kgPerKmol: number): number {
  // Ideal-gas constant-pressure specific heat Cp [J/(kg·K)]
  return (gamma * R_UNIVERSAL) / (MW_kgPerKmol * (gamma - 1));
}

function prandtl(gamma: number): number {
  // Eucken approximation for a polyatomic combustion gas mixture
  return (4 * gamma) / (9 * gamma - 5);
}

// ── Main Bartz computation ────────────────────────────────────────────────────

export function computeBartzHeatFlux(
  flowProfile:  FlowProfile,
  geom:         EngineGeometry,
  gamma:        number,
  Pc_Pa:        number,
  Tc_K:         number,
  MW_kgPerKmol: number,
  cstar_ms:     number,
  wallTemp_K:   number,
): HeatFluxProfile {
  const { Rt, xThroat, px } = geom;

  const Rt_m   = Rt * 1e-3;             // throat radius mm → m
  const Dt_m   = 2 * Rt_m;             // throat diameter (m)
  const R_tc   = THROAT_CURVATURE_FACTOR * Rt_m;  // throat curvature radius (m)

  const Cp  = specificHeat(gamma, MW_kgPerKmol);
  const Pr  = prandtl(gamma);

  // Bartz pre-factor: everything that does not vary along the nozzle axis
  // h_g(x) = preFactor × (At/A(x))^0.9 × σ(x)
  const mu_ref_val = viscosity(Tc_K);  // viscosity at chamber stagnation temperature
  const preFactor =
    (0.026 / Math.pow(Dt_m, 0.2)) *
    (Math.pow(mu_ref_val, 0.2) * Cp / Math.pow(Pr, 0.6)) *
    Math.pow(Pc_Pa / cstar_ms, 0.8) *
    Math.pow(Dt_m / R_tc, 0.1);

  // x-scale: maps canvas xLog back to physical mm
  // px(x_mm) = pL + x_mm × sx  →  x_mm = (xLog − px(0)) / sx
  // We derive sx from two known geometry points.
  const xOriginLog  = px(0);
  const xThroatLog  = px(xThroat);
  const sx          = xThroat > 0 ? (xThroatLog - xOriginLog) / xThroat : 1; // px per mm

  const throatXLog  = xThroatLog;
  const throatXPhys = xThroat;  // mm (xThroat is already in mm in geometry)

  const recovery = Math.pow(Pr, 1 / 3);  // turbulent recovery factor

  const points: HeatFluxPoint[] = flowProfile.points.map(fp => {
    const { xLog, mach, temperature: T_gas, areaRatio } = fp;

    // Adiabatic wall temperature (recovery temperature)
    const T_aw = T_gas * (1 + recovery * ((gamma - 1) / 2) * mach * mach);

    // Gas-property correction factor σ (accounts for temperature-dependent property variation)
    const mFactor = 1 + ((gamma - 1) / 2) * mach * mach;
    const sigma   =
      Math.pow(0.5 * (wallTemp_K / T_gas) * mFactor + 0.5, -0.68) *
      Math.pow(mFactor, -0.12);

    // Local area ratio reciprocal: A_throat / A(x) = 1 / areaRatio
    const AreaRatioInv = areaRatio > 0 ? 1 / areaRatio : 1;

    // Convective heat transfer coefficient h_g [W/(m²·K)]
    const hg = preFactor * Math.pow(AreaRatioInv, 0.9) * sigma;

    // Convective heat flux q [W/m²]  — clamp to zero if T_aw < T_wall (can't be negative)
    const heatFlux = Math.max(0, hg * (T_aw - wallTemp_K));

    // Physical axial position (mm from chamber entrance)
    const xPhys_mm = sx > 0 ? (xLog - xOriginLog) / sx : 0;

    return { xLog, xPhys_mm, heatFlux, hg, T_aw, T_gas };
  });

  const fluxValues  = points.map(p => p.heatFlux);
  const minHeatFlux = Math.min(...fluxValues);
  const maxHeatFlux = Math.max(...fluxValues);

  return { points, minHeatFlux, maxHeatFlux, throatXLog, throatXPhys };
}
