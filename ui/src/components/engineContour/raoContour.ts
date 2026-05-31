// ── Rao Optimal Nozzle — angle lookup & interpolation ────────────────────────
// Reference: G. V. R. Rao, "Exhaust Nozzle Contour for Optimum Thrust,"
// Jet Propulsion, 1958. Table values from Sutton & Biblarz, Table 3-4.

export const RAO_LN_DEFAULT = 0.8;
export const RAO_LN_MIN     = 0.6;
export const RAO_LN_MAX     = 1.0;
export const RAO_LN_STEP    = 0.01;

// tN / tE at Ln/Lref = 0.80 for each expansion ratio
const RAO_TABLE = [
  { eps:  5, tN: 28, tE: 14 },
  { eps: 10, tN: 32, tE: 12 },
  { eps: 15, tN: 34, tE: 11 },
  { eps: 20, tN: 35, tE: 10 },
  { eps: 25, tN: 36, tE:  9 },
  { eps: 50, tN: 38, tE:  8 },
] as const;

const TN_MIN = 22, TN_MAX = 45;
const TE_MIN =  5, TE_MAX = 22;

// Longer nozzle (lnFrac > 0.8) → gentler θN and θE. Slopes per unit fraction.
const LN_SLOPE_TN = 15;
const LN_SLOPE_TE =  8;

export function interpolateRaoAngles(
  eps: number,
  lnFrac: number,
): { tN: number; tE: number } {
  const e = Math.max(RAO_TABLE[0].eps, Math.min(RAO_TABLE[RAO_TABLE.length - 1].eps, eps));
  const f = Math.max(RAO_LN_MIN, Math.min(RAO_LN_MAX, lnFrac));

  let tN_ref = RAO_TABLE[RAO_TABLE.length - 1].tN;
  let tE_ref = RAO_TABLE[RAO_TABLE.length - 1].tE;

  for (let i = 0; i < RAO_TABLE.length - 1; i++) {
    if (e <= RAO_TABLE[i + 1].eps) {
      const t = (e - RAO_TABLE[i].eps) / (RAO_TABLE[i + 1].eps - RAO_TABLE[i].eps);
      tN_ref = RAO_TABLE[i].tN + t * (RAO_TABLE[i + 1].tN - RAO_TABLE[i].tN);
      tE_ref = RAO_TABLE[i].tE + t * (RAO_TABLE[i + 1].tE - RAO_TABLE[i].tE);
      break;
    }
  }

  const delta = f - RAO_LN_DEFAULT;
  return {
    tN: Math.max(TN_MIN, Math.min(TN_MAX, tN_ref - delta * LN_SLOPE_TN)),
    tE: Math.max(TE_MIN, Math.min(TE_MAX, tE_ref + delta * LN_SLOPE_TE)),
  };
}
