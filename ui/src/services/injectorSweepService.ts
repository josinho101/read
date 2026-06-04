import { constants } from '../constants';
import { BaseApi } from './api/baseApi';

export type InjectorType = 'impinging' | 'pintle' | 'coaxial' | 'showerhead';

export interface InjectorSweepParams {
  /** Total propellant mass flow in kg/s — from optimum.totalMassFlow.value / 1000 (CEA returns g/s) */
  m_dot_total_kgs: number;
  /** Oxidizer-to-fuel mass ratio — from optimum.mixtureRatio.value */
  of_ratio: number;
  /** Chamber pressure in bar — from engineInputs.chamberPressure.value */
  pc_bar: number;
  /** Injector architecture */
  injector_type: InjectorType;
  /** Oxidizer propellant code, e.g. 'LOX', 'N2O' */
  ox_code: string;
  /** Fuel propellant code, e.g. 'RP1', 'Ethanol' */
  fuel_code: string;
  /** Oxidizer orifice drill diameter (mm), default 1.5 */
  d_o_mm?: number;
  /** Fuel orifice drill diameter (mm), default 1.2 */
  d_f_mm?: number;
  /** Convergence half-angle for impinging type (degrees), default 45 */
  impingement_half_angle_deg?: number;
}

/** One design point from the pressure-drop sweep */
export interface InjectorSweepRow {
  /** Pressure drop as a percentage of chamber pressure (%) */
  dp_percentage: number;
  /** Absolute pressure drop across the orifices (bar) */
  delta_P_bar: number;
  /** Total required oxidizer orifice area (mm²) — continuous value before rounding */
  oxidizer_total_area_mm2: number;
  /** Total required fuel orifice area (mm²) — continuous value before rounding */
  fuel_total_area_mm2: number;
  /** Number of oxidizer holes to drill (integer, rounded up) */
  oxidizer_hole_count: number;
  /** Number of fuel holes to drill (integer, rounded up) */
  fuel_hole_count: number;
  /** Oxidizer exit velocity through actual drilled area (m/s) */
  oxidizer_velocity_ms: number;
  /** Fuel exit velocity through actual drilled area (m/s) */
  fuel_velocity_ms: number;
  /** Velocity ratio v_fuel / v_ox — target ~10–15 for coaxial shear atomisation */
  v_ratio: number | null;
  /** Momentum flux ratio (ρ_f·v_f²) / (ρ_o·v_o²) — target ~0.8–1.2 for impinging balance */
  momentum_flux_ratio: number | null;
  /** Axial distance from injector face to jet convergence point (mm) — impinging only */
  impingement_point_dist_mm: number | null;
  /** True on the midpoint row — recommended balanced design point */
  recommended: boolean;
}

/** Full response from GET /api/v1/injector/sweep */
export interface InjectorSweepResult {
  injector_type: InjectorType;
  propellant_pair: { oxidizer: string; fuel: string };
  orifice_diameters_mm: { oxidizer: number; fuel: number };
  /** Echoed impingement half-angle (degrees) — null for non-impinging types */
  impingement_half_angle_deg: number | null;
  sweep: InjectorSweepRow[];
}

class InjectorSweepService extends BaseApi {
  constructor() {
    super(constants.API_BASE_URL);
  }

  async getSweep(params: InjectorSweepParams): Promise<InjectorSweepResult> {
    const query = new URLSearchParams({
      m_dot_total_kgs:  String(params.m_dot_total_kgs),
      of_ratio:         String(params.of_ratio),
      pc_bar:           String(params.pc_bar),
      injector_type:    params.injector_type,
      ox_code:          params.ox_code,
      fuel_code:        params.fuel_code,
    });
    if (params.d_o_mm !== undefined) query.set('d_o_mm', String(params.d_o_mm));
    if (params.d_f_mm !== undefined) query.set('d_f_mm', String(params.d_f_mm));
    if (params.impingement_half_angle_deg !== undefined)
      query.set('impingement_half_angle_deg', String(params.impingement_half_angle_deg));

    return this.get<InjectorSweepResult>(`/api/v1/injector/sweep?${query}`);
  }
}

export const injectorSweepService = new InjectorSweepService();
