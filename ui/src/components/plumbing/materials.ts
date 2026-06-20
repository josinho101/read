// ── Tank wall materials ──────────────────────────────────────────────────────

export interface TankMaterial {
  name: string;
  yieldStrengthMPa: number;
  densityKgM3: number;
}

export const MATERIALS: Record<string, TankMaterial> = {
  al6061:  { name: 'Aluminum 6061-T6',        yieldStrengthMPa: 276, densityKgM3: 2700 },
  ss304:   { name: 'Stainless Steel 304',     yieldStrengthMPa: 215, densityKgM3: 8000 },
  ti6al4v: { name: 'Titanium Ti-6Al-4V',      yieldStrengthMPa: 880, densityKgM3: 4430 },
  cfrp:    { name: 'Carbon Fiber Composite',  yieldStrengthMPa: 600, densityKgM3: 1600 },
};

export const SAFETY_FACTOR = 1.5;

// ── Propellant densities (kg/m^3, liquid at storage conditions) ────────────────

export const PROPELLANT_DENSITIES: Record<string, number> = {
  LH2: 71,
  RP1: 810,
  CH4: 423,
  C3H8: 494,
  C2H6: 546,
  Ethanol: 789,
  CH3OH: 792,
  NH3: 682,
  AP: 1950,
  LOX: 1141,
  N2O: 1220,
  N2O_nbp: 1220,
  '90_H2O2': 1390,
  F2: 1505,
  H2O: 1000,
};

const PROPELLANT_DENSITY_FALLBACK = 1000;

export function getPropellantDensity(code: string): number {
  return PROPELLANT_DENSITIES[code] ?? PROPELLANT_DENSITY_FALLBACK;
}

// ── Unit conversion ──────────────────────────────────────────────────────────

export const BAR_TO_PSI = 14.5038;

export function barToPsi(bar: number): number {
  return bar * BAR_TO_PSI;
}

// ── Tank wall thickness / mass ───────────────────────────────────────────────

export interface TankSizing {
  /** Characteristic radius (sphere) or diameter/2 (cylinder), in meters */
  radiusM: number;
  /** Wall thickness in meters (governing/cylindrical wall for cylinder shape) */
  thicknessM: number;
  /** Total tank mass in kg */
  massKg: number;
}

/**
 * Spherical tank: thin-wall hoop stress t = (P*r) / (2*sigma_allow)
 * mass = surface area * thickness * material density
 */
export function sphereTankSizing(volumeM3: number, designPressureBar: number, material: TankMaterial): TankSizing {
  const r = Math.cbrt((3 * volumeM3) / (4 * Math.PI));
  const sigmaAllowPa = (material.yieldStrengthMPa * 1e6) / SAFETY_FACTOR;
  const designPressurePa = designPressureBar * 1e5;
  const thickness = (designPressurePa * r) / (2 * sigmaAllowPa);
  const surfaceArea = 4 * Math.PI * r * r;
  const mass = surfaceArea * thickness * material.densityKgM3;
  return { radiusM: r, thicknessM: thickness, massKg: mass };
}

/**
 * Cylindrical tank with hemispherical caps, aspect ratio = L_cyl / D.
 * Cylindrical wall (hoop, governs): t_cyl = (P*D/2) / sigma_allow
 * Cap wall (sphere-like):           t_cap = (P*D/2) / (2*sigma_allow)
 */
export function cylinderTankSizing(volumeM3: number, designPressureBar: number, material: TankMaterial, aspectRatio: number): TankSizing {
  // V = pi*(D/2)^2 * L_cyl + (4/3)*pi*(D/2)^3, with L_cyl = aspectRatio * D
  // => V = (pi*D^3/4)*aspectRatio + (pi*D^3/6) = pi*D^3*(aspectRatio/4 + 1/6)
  const D = Math.cbrt(volumeM3 / (Math.PI * (aspectRatio / 4 + 1 / 6)));
  const r = D / 2;
  const lCyl = aspectRatio * D;

  const sigmaAllowPa = (material.yieldStrengthMPa * 1e6) / SAFETY_FACTOR;
  const designPressurePa = designPressureBar * 1e5;

  const tCyl = (designPressurePa * r) / sigmaAllowPa;
  const tCap = (designPressurePa * r) / (2 * sigmaAllowPa);

  const aCyl = 2 * Math.PI * r * lCyl;
  const aCaps = 4 * Math.PI * r * r; // two hemispherical caps = one full sphere surface

  const mass = material.densityKgM3 * (aCyl * tCyl + aCaps * tCap);
  return { radiusM: r, thicknessM: tCyl, massKg: mass };
}

// ── Pressurant gas ───────────────────────────────────────────────────────────

export interface PressurantGas {
  name: string;
  molarMassGMol: number;
}

export const PRESSURANT_GASES: Record<'N2' | 'He', PressurantGas> = {
  N2: { name: 'Nitrogen (N2)', molarMassGMol: 28.01 },
  He: { name: 'Helium (He)', molarMassGMol: 4.003 },
};

export const GAS_CONSTANT = 8.314; // J/(mol*K)
export const AMBIENT_TEMP_K = 293;

/** Mass of gas (grams) to fill volumeM3 at pressureBar and AMBIENT_TEMP_K */
export function pressurantMassG(volumeM3: number, pressureBar: number, gas: PressurantGas): number {
  const pressurePa = pressureBar * 1e5;
  const moles = (pressurePa * volumeM3) / (GAS_CONSTANT * AMBIENT_TEMP_K);
  return moles * gas.molarMassGMol;
}

/** Volume (m^3) of gas at pressureBar and AMBIENT_TEMP_K for a given mass (grams) */
export function pressurantVolumeM3(massG: number, pressureBar: number, gas: PressurantGas): number {
  const moles = massG / gas.molarMassGMol;
  const pressurePa = pressureBar * 1e5;
  return (moles * GAS_CONSTANT * AMBIENT_TEMP_K) / pressurePa;
}
