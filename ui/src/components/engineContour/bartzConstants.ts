// ── Sutherland viscosity reference (combustion product gas mix) ───────────────
// Reference dynamic viscosity at T_SUTH_REF for a typical H2O/CO2/CO combustion
// gas mixture. Used in Sutherland's law: μ(T) = MU_REF × (T/T_SUTH_REF)^1.5
// × (T_SUTH_REF + C_SUTH) / (T + C_SUTH)
export const MU_REF     = 3.5e-5;  // Pa·s  — reference dynamic viscosity
export const T_SUTH_REF = 3000;    // K     — reference temperature
export const C_SUTH     = 200;     // K     — Sutherland constant for combustion gas

// ── Throat curvature radius (JANNAF standard) ─────────────────────────────────
// The Bartz equation requires the radius of curvature at the nozzle throat (R_tc).
// JANNAF recommends R_tc = 0.382 × R_throat as the default when no detailed contour
// data is available. This gives a conservative (slightly elevated) heat flux estimate.
export const THROAT_CURVATURE_FACTOR = 0.382;

// ── Wall temperature slider ───────────────────────────────────────────────────
// T_wall is the assumed temperature of the inner nozzle wall surface — the thermal
// boundary condition for convective heat flux: q = h_g × (T_aw − T_wall).
// Lower T_wall → larger ΔT → higher heat flux (worst-case / cooled-wall scenario).
// Higher T_wall → flux decreases toward zero as T_wall → T_aw (uncooled/hot wall).
// Physically achievable range:
//   300 K  — cryogenically or actively liquid-cooled wall (e.g. LH2 regen cooling)
//   600 K  — representative cooled-wall condition (regen / film cooling, default)
//  1200 K  — thin-wall ablative or uncooled chamber at moderate Pc
//  1500 K  — near Inconel 718 continuous-use limit (very high risk, no cooling)
export const WALL_TEMP_DEFAULT_K = 600;   // K
export const WALL_TEMP_MIN_K     = 300;   // K
export const WALL_TEMP_MAX_K     = 1500;  // K
export const WALL_TEMP_STEP_K    = 50;    // K — slider granularity

// ── Heat flux display unit ────────────────────────────────────────────────────
// Raw Bartz outputs are in W/m². Dividing by this factor converts to MW/m², keeping
// chart y-axis numbers in the human-readable 0–20 range rather than 0–20_000_000.
export const HEAT_FLUX_DISPLAY_DIVISOR = 1e6;  // W/m² → MW/m²

// ── Regenerative cooling channel defaults ────────────────────────────────────
export const REGEN_NUM_CHANNELS_DEFAULT              = 60;
export const REGEN_CHANNEL_WIDTH_MM_DEFAULT          = 1.5;
export const REGEN_CHANNEL_HEIGHT_MM_DEFAULT         = 2.0;
export const REGEN_WALL_THICKNESS_MM_DEFAULT         = 0.8;
export const REGEN_COOLANT_INLET_TEMP_K_DEFAULT      = 270;   // ~room-temp RP-1 / storable propellant
export const REGEN_COOLANT_INLET_PRESSURE_BAR_DEFAULT = 30;

// Hot-wall temperature limits by material (continuous-use softening point)
export const REGEN_WALL_TEMP_LIMIT_K: Record<string, number> = {
  copper:  600,   // K — annealing / softening onset
  steel:   900,   // K — stainless 304 sustained-use limit
  inconel: 1200,  // K — Inconel 718 continuous-use limit
};
