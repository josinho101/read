import math

# Propellant liquid densities at typical storage conditions (kg/m^3).
# Key is (ox_code, fuel_code) matching the CEA propellant codes used in the engine design service.
# Values are representative cryogenic/storable densities — not temperature-corrected.
PROPELLANT_DENSITIES: dict[tuple[str, str], tuple[float, float]] = {
    ('LOX',  'RP1'):     (1141.0,  810.0),   # Liquid oxygen / kerosene
    ('LOX',  'LH2'):     (1141.0,   71.0),   # Liquid oxygen / liquid hydrogen
    ('LOX',  'ETHANOL'): (1141.0,  789.0),   # Liquid oxygen / ethanol (anhydrous)
    ('LOX',  'CH4'):     (1141.0,  423.0),   # Liquid oxygen / liquid methane
    ('N2O',  'ETHANOL'): ( 785.0,  789.0),   # Nitrous oxide (liquid) / ethanol
    ('N2O',  'RP1'):     ( 785.0,  810.0),   # Nitrous oxide (liquid) / kerosene
}


def get_injector_constants(injector_type: str) -> dict:
    """
    Returns architecture-specific hydraulic design constants:
      Cd_o  — discharge coefficient for oxidizer orifices (dimensionless, ~0.55–0.85)
      Cd_f  — discharge coefficient for fuel orifices (dimensionless, ~0.55–0.85)
      dp_ratio_min / dp_ratio_max — allowable range of injector ΔP as a fraction of Pc
    Discharge coefficients reflect typical machined orifice quality for each type.
    """
    configs = {
        'impinging': {
            'Cd_o': 0.75,           # well-rounded drilled orifices, moderate Cd
            'Cd_f': 0.75,
            'dp_ratio_min': 0.15,   # 15% Pc — minimum for stability
            'dp_ratio_max': 0.25,   # 25% Pc — typical upper bound before excessive losses
        },
        'impinging_fof': {          # Fuel-Oxidizer-Fuel triplet: 1 central ox + 2 flanking fuel per element
            'Cd_o': 0.75,
            'Cd_f': 0.75,
            'dp_ratio_min': 0.15,
            'dp_ratio_max': 0.25,
        },
        'impinging_ofo': {          # Oxidizer-Fuel-Oxidizer triplet: 1 central fuel + 2 flanking ox per element
            'Cd_o': 0.75,
            'Cd_f': 0.75,
            'dp_ratio_min': 0.15,
            'dp_ratio_max': 0.25,
        },
        'pintle': {
            'Cd_o': 0.85,           # pintle annular gap has high Cd (smooth flow path)
            'Cd_f': 0.65,           # drilled radial holes have lower Cd
            'dp_ratio_min': 0.10,   # 10% Pc — pintles tolerate lower dP
            'dp_ratio_max': 0.15,   # 15% Pc
        },
        'coaxial': {
            'Cd_o': 0.75,           # central post orifice
            'Cd_f': 0.55,           # annular fuel gap tends to have lower Cd
            'dp_ratio_min': 0.15,   # 15% Pc
            'dp_ratio_max': 0.30,   # 30% Pc — coaxials can tolerate higher dP for shear
        },
        'showerhead': {
            'Cd_o': 0.80,           # uniform drilled pattern, good Cd
            'Cd_f': 0.80,
            'dp_ratio_min': 0.25,   # 25% Pc — showerheads need high dP for distribution uniformity
            'dp_ratio_max': 0.35,   # 35% Pc
        },
    }

    key = injector_type.lower()
    if key not in configs:
        raise ValueError(f"Unknown injector type. Choose from: {list(configs.keys())}")

    return configs[key]


def sweep_injector_designs(
    m_dot_total,                      # total propellant mass flow rate (kg/s)
    OF_ratio,                         # oxidizer-to-fuel mass ratio (dimensionless)
    P_c,                              # chamber pressure (Pa)
    injector_type,                    # injector architecture string: see get_injector_constants()
    ox_code='LOX',                    # oxidizer propellant code — must match PROPELLANT_DENSITIES key
    fuel_code='RP1',                  # fuel propellant code — must match PROPELLANT_DENSITIES key
    d_o_m=0.0015,                     # oxidizer orifice drill diameter (m), default 1.5 mm
    d_f_m=0.0012,                     # fuel orifice drill diameter (m), default 1.2 mm
    impingement_half_angle_deg=45.0,  # convergence half-angle for impinging type (degrees)
                                      #   typical range 30°–60°; ignored for other types
) -> list[dict]:
    """
    Sweeps through injector pressure drops from dp_min to dp_max in 0.5% steps.
    Returns a list of design-point dicts, one per pressure-drop step.

    Each dict contains hydraulic sizing results (hole counts, areas, velocities)
    plus mixing quality metrics (velocity ratio, momentum flux ratio).

    The midpoint row of the sweep is flagged as 'recommended' — a balanced starting
    point between stability margin (low dP) and orifice count (high dP).
    """
    # --- 1. Architecture constants ---
    constants = get_injector_constants(injector_type)
    Cd_o = constants['Cd_o']          # oxidizer orifice discharge coefficient (dimensionless)
    Cd_f = constants['Cd_f']          # fuel orifice discharge coefficient (dimensionless)
    dp_min = constants['dp_ratio_min']  # minimum allowable ΔP/Pc (fraction)
    dp_max = constants['dp_ratio_max']  # maximum allowable ΔP/Pc (fraction)

    # --- 2. Propellant densities ---
    pair_key = (ox_code.upper(), fuel_code.upper())
    if pair_key not in PROPELLANT_DENSITIES:
        supported = list(PROPELLANT_DENSITIES.keys())
        raise ValueError(f"Unsupported propellant pair {pair_key}. Supported: {supported}")

    rho_o, rho_f = PROPELLANT_DENSITIES[pair_key]  # liquid densities (kg/m^3)

    # --- 3. Mass flow split ---
    # From the definition of O/F ratio: OF = m_dot_o / m_dot_f
    # => m_dot_f = m_dot_total / (1 + OF),  m_dot_o = m_dot_total - m_dot_f
    m_dot_f = m_dot_total / (1.0 + OF_ratio)   # fuel mass flow rate (kg/s)
    m_dot_o = m_dot_total - m_dot_f             # oxidizer mass flow rate (kg/s)

    # --- 4. Single-orifice areas at the target drill diameters ---
    # These are fixed by the chosen drill bit size; N_holes adjusts to meet flow area.
    area_single_o = (math.pi / 4.0) * (d_o_m ** 2)   # area of one oxidizer orifice (m^2)
    area_single_f = (math.pi / 4.0) * (d_f_m ** 2)   # area of one fuel orifice (m^2)

    # --- 5. Impingement geometry (only meaningful for impinging types) ---
    # The half-angle determines how far downstream the jets meet.
    # L = d_orifice / (2 * tan(theta)) — axial distance from face to convergence point.
    is_impinging = injector_type.lower() in ('impinging', 'impinging_fof', 'impinging_ofo')
    is_triplet_fof = injector_type.lower() == 'impinging_fof'
    is_triplet_ofo = injector_type.lower() == 'impinging_ofo'
    if is_impinging:
        theta_rad = math.radians(impingement_half_angle_deg)   # half-angle in radians
        imp_dist_m = d_o_m / (2.0 * math.tan(theta_rad))      # impingement point distance (m)
        imp_dist_mm = round(imp_dist_m * 1000.0, 3)           # convert to mm for output
    else:
        imp_dist_mm = None  # not applicable for non-impinging types

    # --- 6. Sweep loop — 0.5% ΔP/Pc steps ---
    results_sweep = []

    # Use a while loop to avoid floating-point truncation errors from range()
    current_dp_ratio = dp_min     # current pressure drop ratio (ΔP / Pc), dimensionless
    step = 0.005                  # step size = 0.5% of Pc

    while current_dp_ratio <= (dp_max + 1e-9):   # small epsilon avoids cutting the last step
        delta_P = current_dp_ratio * P_c          # absolute pressure drop across orifices (Pa)

        # --- Hydraulic orifice equation: A = m_dot / (Cd * sqrt(2 * rho * dP)) ---
        # Derived from Bernoulli: v = Cd * sqrt(2*dP/rho), then A = m_dot / (rho * v)
        A_total_o = m_dot_o / (Cd_o * math.sqrt(2.0 * rho_o * delta_P))  # required ox area (m^2)
        A_total_f = m_dot_f / (Cd_f * math.sqrt(2.0 * rho_f * delta_P))  # required fuel area (m^2)

        # --- Integer hole counts: ceil to ensure we meet (not under-deliver) the required area ---
        N_o = math.ceil(A_total_o / area_single_o)   # number of oxidizer orifices
        N_f = math.ceil(A_total_f / area_single_f)   # number of fuel orifices

        # --- Triplet pairing: enforce 2:1 element constraint before sizing ---
        # FOF (Fuel-Oxidizer-Fuel): 1 ox + 2 fuel per element → N_f = 2 × N_elements
        # OFO (Oxidizer-Fuel-Oxidizer): 2 ox + 1 fuel per element → N_o = 2 × N_elements
        if is_triplet_fof:
            N_elements = max(N_o, math.ceil(N_f / 2))
            N_o = N_elements
            N_f = 2 * N_elements
        elif is_triplet_ofo:
            N_elements = max(N_f, math.ceil(N_o / 2))
            N_f = N_elements
            N_o = 2 * N_elements

        # --- Actual flow areas after rounding up to whole holes ---
        actual_area_o = N_o * area_single_o   # true oxidizer total orifice area (m^2)
        actual_area_f = N_f * area_single_f   # true fuel total orifice area (m^2)

        # --- Exit velocities through actual (discrete) orifice area ---
        # v = m_dot / (rho * A) — continuity equation applied at the orifice exit plane
        v_o = m_dot_o / (rho_o * actual_area_o)   # oxidizer exit velocity (m/s)
        v_f = m_dot_f / (rho_f * actual_area_f)   # fuel exit velocity (m/s)

        # --- Mixing quality metrics ---
        # Velocity ratio: important for coaxial injectors; target ~10–15 for shear atomisation
        v_ratio = round(v_f / v_o, 4) if v_o > 0 else None

        # Momentum flux ratio (MFR): important for impinging injectors; target ~0.8–1.2 for balance
        # MFR = (rho_f * v_f^2) / (rho_o * v_o^2)
        momentum_flux_ratio = round(
            (rho_f * v_f ** 2) / (rho_o * v_o ** 2), 4
        ) if v_o > 0 else None

        data_point = {
            "dp_percentage":            round(current_dp_ratio * 100, 1),   # pressure drop as % of Pc
            "delta_P_bar":              round(delta_P / 1e5, 2),            # absolute ΔP (bar)
            "oxidizer_total_area_mm2":  round(A_total_o * 1e6, 2),         # required ox area (mm^2)
            "fuel_total_area_mm2":      round(A_total_f * 1e6, 2),         # required fuel area (mm^2)
            "oxidizer_hole_count":      N_o,                                # drilled ox orifices
            "fuel_hole_count":          N_f,                                # drilled fuel orifices
            "oxidizer_velocity_ms":     round(v_o, 2),                     # ox exit velocity (m/s)
            "fuel_velocity_ms":         round(v_f, 2),                     # fuel exit velocity (m/s)
            "v_ratio":                  v_ratio,                            # v_fuel / v_ox
            "momentum_flux_ratio":      momentum_flux_ratio,                # (rho_f*vf^2)/(rho_o*vo^2)
            "impingement_point_dist_mm": imp_dist_mm,                      # convergence point dist (mm); null if not impinging
            "recommended":              False,                              # flagged after loop completes
        }

        results_sweep.append(data_point)
        current_dp_ratio += step

    # --- 7. Flag the midpoint row as the recommended design point ---
    # The midpoint balances stability margin (needs high dP) vs. hole count (needs low dP).
    if results_sweep:
        mid_idx = len(results_sweep) // 2
        results_sweep[mid_idx]["recommended"] = True

    return results_sweep


# --- Standalone test run ---
if __name__ == "__main__":
    mass_flow = 5.0       # total propellant mass flow rate (kg/s)
    of = 2.5              # oxidizer-to-fuel mass ratio
    chamber_p = 5.0e6     # chamber pressure (Pa) — 50 bar
    style = 'impinging'   # injector architecture

    print(f"Sweeping parameter profiles for '{style}' injector  |  LOX / RP1  |  {mass_flow} kg/s  |  {chamber_p/1e5:.0f} bar Pc")
    sweep_results = sweep_injector_designs(
        mass_flow, of, chamber_p, style,
        ox_code='LOX', fuel_code='RP1',
    )

    header = f"{'DP %':<8} | {'dP (bar)':<10} | {'Ox Holes':<10} | {'Fuel Holes':<10} | {'Ox Vel (m/s)':<14} | {'Fuel Vel (m/s)':<15} | {'v_ratio':<9} | {'MFR':<8} | {'Rec?'}"
    print("-" * len(header))
    print(header)
    print("-" * len(header))

    for row in sweep_results:
        rec = "REC" if row['recommended'] else ""
        print(
            f"{row['dp_percentage']:<8}% | "
            f"{row['delta_P_bar']:<10} | "
            f"{row['oxidizer_hole_count']:<10} | "
            f"{row['fuel_hole_count']:<10} | "
            f"{row['oxidizer_velocity_ms']:<14} | "
            f"{row['fuel_velocity_ms']:<15} | "
            f"{str(row['v_ratio']):<9} | "
            f"{str(row['momentum_flux_ratio']):<8} | "
            f"{rec}"
        )
