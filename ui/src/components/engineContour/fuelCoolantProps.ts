export type CoolantSuitability = 'good' | 'marginal' | 'unsupported';

export interface FuelCoolantProps {
  density_kgM3: number;
  Cp_JkgK: number;
  k_WmK: number;
  mu_PaS: number;
  suitability: CoolantSuitability;
  warningMsg?: string;
}

export const FUEL_COOLANT_PROPS: Record<string, FuelCoolantProps> = {
  RP1:     { density_kgM3: 820,  Cp_JkgK: 2010,  k_WmK: 0.14,  mu_PaS: 8.0e-4, suitability: 'good' },
  LH2:     { density_kgM3: 71,   Cp_JkgK: 14300, k_WmK: 0.18,  mu_PaS: 1.2e-5, suitability: 'good' },
  CH4:     { density_kgM3: 424,  Cp_JkgK: 3480,  k_WmK: 0.17,  mu_PaS: 1.2e-4, suitability: 'good' },
  GCH4:    { density_kgM3: 30,   Cp_JkgK: 2230,  k_WmK: 0.034, mu_PaS: 1.1e-5, suitability: 'marginal', warningMsg: 'Gas-phase CH4: low density limits cooling capacity' },
  Ethanol: { density_kgM3: 789,  Cp_JkgK: 2440,  k_WmK: 0.17,  mu_PaS: 1.1e-3, suitability: 'good' },
  GH2:     { density_kgM3: 5,    Cp_JkgK: 14300, k_WmK: 0.17,  mu_PaS: 9.0e-6, suitability: 'good' },
  MMH:     { density_kgM3: 866,  Cp_JkgK: 2940,  k_WmK: 0.15,  mu_PaS: 8.7e-4, suitability: 'marginal', warningMsg: 'MMH: limited thermal property data, use with caution' },
  UDMH:    { density_kgM3: 791,  Cp_JkgK: 2950,  k_WmK: 0.15,  mu_PaS: 6.0e-4, suitability: 'marginal', warningMsg: 'UDMH: sparse property data available' },
  A50:     { density_kgM3: 900,  Cp_JkgK: 3000,  k_WmK: 0.14,  mu_PaS: 9.0e-4, suitability: 'marginal', warningMsg: 'A50: limited data, estimated values' },
  N2H4:    { density_kgM3: 1004, Cp_JkgK: 3000,  k_WmK: 0.58,  mu_PaS: 9.0e-4, suitability: 'marginal', warningMsg: 'Hydrazine: usable at low heat loads, decomposition risk' },
  C3H8:    { density_kgM3: 493,  Cp_JkgK: 2000,  k_WmK: 0.10,  mu_PaS: 1.0e-4, suitability: 'good' },
  C2H6:    { density_kgM3: 546,  Cp_JkgK: 2000,  k_WmK: 0.19,  mu_PaS: 1.5e-4, suitability: 'good' },
  CH3OH:   { density_kgM3: 791,  Cp_JkgK: 2530,  k_WmK: 0.20,  mu_PaS: 5.5e-4, suitability: 'good' },
  NH3:     { density_kgM3: 682,  Cp_JkgK: 4700,  k_WmK: 0.50,  mu_PaS: 1.5e-4, suitability: 'marginal', warningMsg: 'Ammonia: good Cp but limited regen-cooling heritage' },
  AP:      { density_kgM3: 1950, Cp_JkgK: 1300,  k_WmK: 0.50,  mu_PaS: 1e-3,   suitability: 'unsupported', warningMsg: 'AP is a solid oxidizer — not applicable as a liquid coolant' },
};
