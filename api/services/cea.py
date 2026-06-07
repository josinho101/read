import numpy as np
from rocketcea.cea_obj_w_units import CEA_Obj

from services.propellants_service import get_fuel_name_by_code, get_oxidizer_name_by_code

VACUUM_EPS = 40.0
SEA_LEVEL_PRESSURE_BAR = 1.01325

L_STAR_DEFAULTS: dict[tuple[str, str], tuple[float, float]] = {
    ('LOX',   'LH2'):     (0.50, 0.80),
    ('LOX',   'RP1'):     (0.90, 1.10),
    ('LOX',   'CH4'):     (0.80, 1.10),
    ('LOX',   'Ethanol'): (0.90, 1.10),
    ('N2O',   'Ethanol'): (1.00, 1.30),
    ('N2O',   'RP1'):     (0.90, 1.20),
}
L_STAR_FALLBACK = (0.90, 1.20)

def _extract_station_properties(cea_obj, pc_bar: float, mr: float, eps: float) -> dict:
    """Extract per-station (chamber/throat/exit) thermo & transport properties plus frozen-flow performance."""
    temps = cea_obj.get_Temperatures(Pc=pc_bar, MR=mr, eps=eps)
    densities = cea_obj.get_Densities(Pc=pc_bar, MR=mr, eps=eps)
    cps = cea_obj.get_HeatCapacities(Pc=pc_bar, MR=mr, eps=eps)
    enthalpies = cea_obj.get_Enthalpies(Pc=pc_bar, MR=mr, eps=eps)
    sonic_vels = cea_obj.get_SonicVelocities(Pc=pc_bar, MR=mr, eps=eps)

    chm_cp, chm_visc, chm_cond, chm_pr = cea_obj.get_Chamber_Transport(Pc=pc_bar, MR=mr, eps=eps)
    tht_cp, tht_visc, tht_cond, tht_pr = cea_obj.get_Throat_Transport(Pc=pc_bar, MR=mr, eps=eps)
    ext_cp, ext_visc, ext_cond, ext_pr = cea_obj.get_Exit_Transport(Pc=pc_bar, MR=mr, eps=eps)

    chm_mw, chm_gamma = cea_obj.get_Chamber_MolWt_gamma(Pc=pc_bar, MR=mr, eps=eps)
    tht_mw, tht_gamma = cea_obj.get_Throat_MolWt_gamma(Pc=pc_bar, MR=mr, eps=eps)
    ext_mw, ext_gamma = cea_obj.get_exit_MolWt_gamma(Pc=pc_bar, MR=mr, eps=eps)

    isp_frozen, cstar_frozen, _tc_frozen = cea_obj.getFrozen_IvacCstrTc(Pc=pc_bar, MR=mr, eps=eps)
    isp_equil = cea_obj.get_Isp(Pc=pc_bar, MR=mr, eps=eps)

    mach_exit = cea_obj.get_MachNumber(Pc=pc_bar, MR=mr, eps=eps)
    pc_ov_pe = cea_obj.get_PcOvPe(Pc=pc_bar, MR=mr, eps=eps)
    pc_ov_pt = cea_obj.get_Throat_PcOvPe(Pc=pc_bar, MR=mr)

    VISC_MPOISE_TO_PAS = 1e-4
    COND_W_PER_CMK_TO_W_PER_MK = 100.0

    def _station(idx, mw, gamma, cp, visc, cond, prandtl):
        return {
            "temperature": round(float(temps[idx]), 3),
            "density": round(float(densities[idx]), 4),
            "heatCapacityCp": round(float(cps[idx]), 4),
            "enthalpy": round(float(enthalpies[idx]), 3),
            "sonicVelocity": round(float(sonic_vels[idx]), 3),
            "molecularWeight": round(float(mw), 3),
            "gamma": round(float(gamma), 4),
            "viscosity": round(float(visc) * VISC_MPOISE_TO_PAS, 8),
            "thermalConductivity": round(float(cond) * COND_W_PER_CMK_TO_W_PER_MK, 5),
            "prandtlNumber": round(float(prandtl), 4),
        }

    chamber = _station(0, chm_mw, chm_gamma, chm_cp, chm_visc, chm_cond, chm_pr)

    throat = _station(1, tht_mw, tht_gamma, tht_cp, tht_visc, tht_cond, tht_pr)
    throat["pressureRatioToChPc"] = round(float(pc_ov_pt), 4)

    exit_station = _station(2, ext_mw, ext_gamma, ext_cp, ext_visc, ext_cond, ext_pr)
    exit_station["machNumber"] = round(float(mach_exit), 4)
    exit_station["pressureRatioToChPc"] = round(float(pc_ov_pe), 4)

    return {
        "chamber": chamber,
        "throat": throat,
        "exit": exit_station,
        "frozenPerformance": {
            "ispFrozenVacS": round(float(isp_frozen), 3),
            "cstarFrozenMs": round(float(cstar_frozen), 3),
            "frozenVsEquilIspDeltaPct": round((float(isp_equil) - float(isp_frozen)) / float(isp_equil) * 100.0, 3),
        },
    }


def _extract_chamber_species(cea_obj, pc_bar: float, mr: float, eps: float) -> list:
    """Extract chamber species mass fractions from CEA, returning sorted list of {species, massFraction}."""
    CHM_IDX = 1  # injface=0, chamber=1, throat=2, exit=3
    try:
        _molwt, mass_frac_d = cea_obj.get_SpeciesMassFractions(Pc=pc_bar, MR=mr, eps=eps, min_fraction=0.0001)
    except Exception:
        return []
    result = []
    for name, frac_list in mass_frac_d.items():
        chm_frac = float(frac_list[CHM_IDX])
        if chm_frac >= 0.0001:
            result.append({"species": name.strip(), "massFraction": round(chm_frac, 6)})
    result.sort(key=lambda x: x["massFraction"], reverse=True)
    return result


def get_station_properties(ox_code: str, fuel_code: str, pc_bar: float, mr: float, performance_mode: str = 'sea_level') -> dict:
    """Compute chamber/throat/exit station properties for a single mixture-ratio point."""
    cea_obj = CEA_Obj(oxName=ox_code, fuelName=fuel_code, pressure_units='bar', isp_units='sec', cstar_units='m/s', temperature_units='K',
                      sonic_velocity_units='m/s', enthalpy_units='kJ/kg', density_units='kg/m^3', specific_heat_units='kJ/kg-K',
                      thermal_cond_units='W/cm-degC')

    if performance_mode == 'vacuum':
        eps = VACUUM_EPS
    else:
        eps = cea_obj.get_eps_at_PcOvPe(PcOvPe=pc_bar / SEA_LEVEL_PRESSURE_BAR, MR=mr)

    return _extract_station_properties(cea_obj, pc_bar, mr, eps)


def generate_rocket_engine_params(
    ox_code='N2O', fuel_code='Ethanol',
    thrust_N=500.0, pc_bar=20.0,
    mr_min=3.0, mr_max=6.5,
    l_star_m: float | None = None,
    contraction_ratio: float = 8.0,
    performance_mode='sea_level',
):
    """Main execution wrapper to compute core engine characteristics and drive sub-modules."""
    g0 = 9.80665
    cea_obj = CEA_Obj(oxName=ox_code, fuelName=fuel_code, pressure_units='bar', isp_units='sec', cstar_units='m/s', temperature_units='K',
                      sonic_velocity_units='m/s', enthalpy_units='kJ/kg', density_units='kg/m^3', specific_heat_units='kJ/kg-K',
                      thermal_cond_units='W/cm-degC')
    mr_range = np.linspace(mr_min, mr_max, 25)
    isp_list, tc_list, records = [], [], []
    json_sweep_array = []

    for mr in mr_range:
        cstar_step = cea_obj.get_Cstar(Pc=pc_bar, MR=mr)
        tc_step = cea_obj.get_Tcomb(Pc=pc_bar, MR=mr)

        if performance_mode == 'vacuum':
            eps_step = VACUUM_EPS
        else:
            eps_step = cea_obj.get_eps_at_PcOvPe(PcOvPe=pc_bar / SEA_LEVEL_PRESSURE_BAR, MR=mr)

        # Get vacuum Isp at this eps, back-calculate vacuum Cf, then apply ambient correction
        isp_vac_step = cea_obj.get_Isp(Pc=pc_bar, MR=mr, eps=eps_step)
        cf_vac_step = (isp_vac_step * g0) / cstar_step

        if performance_mode == 'vacuum':
            cf_step = cf_vac_step
            isp_step = isp_vac_step
        else:
            cf_step = cf_vac_step - eps_step * (SEA_LEVEL_PRESSURE_BAR / pc_bar)
            isp_step = (cf_step * cstar_step) / g0

        ch_mw_step, gamma_step = cea_obj.get_Chamber_MolWt_gamma(Pc=pc_bar, MR=mr, eps=eps_step)

        isp_list.append(isp_step)
        tc_list.append(tc_step)

        mdot_total_step = thrust_N / (isp_step * g0)
        mdot_fuel_step = mdot_total_step / (1.0 + mr)
        mdot_ox_step = mdot_total_step - mdot_fuel_step

        A_throat_step = (mdot_total_step * cstar_step) / (pc_bar * 1e5)
        throat_radius_mm_step = np.sqrt(A_throat_step / np.pi) * 1000
        exit_radius_mm_step = np.sqrt((A_throat_step * eps_step) / np.pi) * 1000
        chamber_radius_mm_step = np.sqrt((A_throat_step * contraction_ratio) / np.pi) * 1000

        records.append((mr, isp_step, cstar_step, tc_step, mdot_total_step, mdot_ox_step, mdot_fuel_step, eps_step))
        json_sweep_array.append({
            "mixtureRatio": round(float(mr), 3),
            "specificImpulse": round(float(isp_step), 3),
            "chamberTemperature": round(float(tc_step), 3),
            "characteristicVelocityCstar": round(float(cstar_step), 3),
            "thrustCoefficientCf": round(float(cf_step), 3),
            "specificHeatRatioGamma": round(float(gamma_step), 4),
            "combustionMolecularWeight": round(float(ch_mw_step), 3),
            "expansionRatio": round(float(eps_step), 3),
            "totalMassFlow": round(float(mdot_total_step * 1000.0), 3),
            "oxidizerMassFlow": round(float(mdot_ox_step * 1000.0), 3),
            "fuelMassFlow": round(float(mdot_fuel_step * 1000.0), 3),
            "throatRadius": round(float(throat_radius_mm_step), 3),
            "exitRadius": round(float(exit_radius_mm_step), 3),
            "chamberRadius": round(float(chamber_radius_mm_step), 3),
            "contractionRatio": round(float(contraction_ratio), 3),
        })

    opt_idx = np.argmax(np.array(isp_list))
    opt_mr, peak_isp, cstar, t_comb, mdot_total, mdot_ox, mdot_fuel, opt_eps = records[opt_idx]
    ch_mw, gamma_throat = cea_obj.get_Chamber_MolWt_gamma(Pc=pc_bar, MR=opt_mr, eps=opt_eps)

    isp_vac_opt = cea_obj.get_Isp(Pc=pc_bar, MR=opt_mr, eps=opt_eps)
    cf_vac_opt = (isp_vac_opt * g0) / cstar
    if performance_mode == 'vacuum':
        cf = cf_vac_opt
    else:
        cf = cf_vac_opt - opt_eps * (SEA_LEVEL_PRESSURE_BAR / pc_bar)

    A_throat = (mdot_total * cstar) / (pc_bar * 1e5)
    A_exit = A_throat * opt_eps
    A_chamber = A_throat * contraction_ratio
    throat_radius_mm = np.sqrt(A_throat / np.pi) * 1000
    exit_radius_mm = np.sqrt(A_exit / np.pi) * 1000
    chamber_radius_mm = np.sqrt(A_chamber / np.pi) * 1000

    # L* resolution and chamber geometry derivation
    l_star_range = L_STAR_DEFAULTS.get((ox_code, fuel_code), L_STAR_FALLBACK)
    if l_star_m is None:
        l_star_m = (l_star_range[0] + l_star_range[1]) / 2.0

    CONV_HALF_DEG = 30.0
    Rc_m = chamber_radius_mm / 1000.0
    Rt_m = throat_radius_mm / 1000.0
    Lconv_m = (Rc_m - Rt_m) / np.tan(np.radians(CONV_HALF_DEG))
    V_conv = (np.pi / 3.0) * Lconv_m * (Rc_m**2 + Rt_m**2 + Rc_m * Rt_m)
    V_cyl = max(l_star_m * A_throat - V_conv, 0.0)
    floor_length_m = 1.5 * 2.0 * Rt_m
    computed_length_m = V_cyl / (np.pi * Rc_m**2)
    l_star_floor_active = bool(computed_length_m < floor_length_m)
    Lc_cyl_m = max(computed_length_m, floor_length_m)

    species_composition = _extract_chamber_species(cea_obj, pc_bar, opt_mr, opt_eps)

    output_data = {
        "engineInputs": {
            "propellants": {
                "oxidizer": {"name": get_oxidizer_name_by_code(ox_code), "code": ox_code},
                "fuel": {"name": get_fuel_name_by_code(fuel_code), "code": fuel_code}
            },
            "targetThrust": {"value": thrust_N, "unit": "N"},
            "chamberPressure": {"value": pc_bar, "unit": "bar"},
            "performanceMode": performance_mode,
            "contractionRatio": {"value": contraction_ratio, "unit": "dimensionless"},
            "characteristicLength": {"value": round(float(l_star_m), 4), "unit": "m"}
        },
        "engineOutputs": {
            "mixtureRatio": {
                "optimum": {
                    "mixtureRatio": {"value": round(float(opt_mr), 3), "unit": "O/F mass ratio"},
                    "specificImpulse": {"value": round(float(peak_isp), 3), "unit": "s"},
                    "characteristicVelocityCstar": {"value": round(float(cstar), 3), "unit": "m/s"},
                    "thrustCoefficientCf": {"value": round(float(cf), 3), "unit": "dimensionless"},
                    "chamberTemperature": {"value": round(float(t_comb), 3), "unit": "K"},
                    "specificHeatRatioGamma": {"value": round(float(gamma_throat), 3), "unit": "dimensionless"},
                    "combustionMolecularWeight": {"value": round(float(ch_mw), 3), "unit": "g/mol"},
                    "totalMassFlow": {"value": round(float(mdot_total * 1000.0), 3), "unit": "g/s"},
                    "oxidizerMassFlow": {"value": round(float(mdot_ox * 1000.0), 3), "unit": "g/s"},
                    "fuelMassFlow": {"value": round(float(mdot_fuel * 1000.0), 3), "unit": "g/s"},
                    "throatRadius": {"value": round(float(throat_radius_mm), 3), "unit": "mm"},
                    "exitRadius": {"value": round(float(exit_radius_mm), 3), "unit": "mm"},
                    "chamberRadius": {"value": round(float(chamber_radius_mm), 3), "unit": "mm"},
                    "contractionRatio": {"value": contraction_ratio, "unit": "dimensionless"},
                    "expansionRatio": {"value": round(float(opt_eps), 3), "unit": "dimensionless"},
                    "characteristicLength": {"value": round(float(l_star_m), 4), "unit": "m"},
                    "cylindricalLength": {"value": round(float(Lc_cyl_m * 1000), 3), "unit": "mm"},
                    "convergentLength": {"value": round(float(Lconv_m * 1000), 3), "unit": "mm"},
                    "lStarFloorActive": l_star_floor_active,
                    "lStarRange": {"min": l_star_range[0], "max": l_star_range[1], "unit": "m"},
                    "speciesComposition": species_composition
                },
                "sweep": {
                    "units": {
                        "mixtureRatio": "O/F mass ratio",
                        "specificImpulse": "s",
                        "chamberTemperature": "K",
                        "characteristicVelocityCstar": "m/s",
                        "thrustCoefficientCf": "dimensionless",
                        "specificHeatRatioGamma": "dimensionless",
                        "combustionMolecularWeight": "g/mol",
                        "expansionRatio": "dimensionless",
                        "totalMassFlow": "g/s",
                        "oxidizerMassFlow": "g/s",
                        "fuelMassFlow": "g/s",
                        "throatRadius": "mm",
                        "exitRadius": "mm",
                        "chamberRadius": "mm",
                        "contractionRatio": "dimensionless"
                    },
                    "values": json_sweep_array
                }
            }
        }
    }

    return output_data
