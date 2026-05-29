import math
import numpy as np
from rocketcea.cea_obj import CEA_Obj

# ==============================================================================
# 1. ENGINE DESIGN TARGETS & INPUTS
# ==============================================================================
target_thrust = 500.0  # Newtons (N)
Pc_bar = 20.0          # Chamber pressure in bar
MR = 4.5               # Mass ratio of N2O to Ethanol (O/F)
g0 = 9.80665           # Standard gravity (m/s^2)
Pe_psia = 14.696       # 1 atm sea level pressure in psia

# Unit Conversions
Pc_mpa = Pc_bar / 10.0
Pc_psia = Pc_mpa * 145.037738

# Nozzle Geometry/Chamber Configurations Assumptions
contraction_ratio = 4.0   # Chamber Area / Throat Area (Ac/At)
L_star = 1.2              # Characteristic length (meters) for N2O/Ethanol
convergent_angle = 30.0   # Contraction half-angle (degrees)
alpha_conical = 15.0      # Standard conical exit half-angle (degrees)
theta_i = 30.0            # Bell initial expansion angle (degrees)
theta_e = 15.0            # Bell final exit angle (degrees)

# ==============================================================================
# 2. RUN ROCKETCEA SOLVER
# ==============================================================================
isp_obj = CEA_Obj(oxName="N2O", fuelName="Ethanol")

# Calculate expansion ratio to achieve perfectly expanded exit pressure
PcOvPe = Pc_psia / Pe_psia
eps = isp_obj.get_eps_at_PcOvPe(PcOvPe=PcOvPe, MR=MR)

# Fetch performance metrics from NASA CEA
Ivac_sec, cstar_fps, Tcham_R = isp_obj.get_IvacCstrTc(Pc=Pc_psia, MR=MR, eps=eps)

# Convert imperial outputs to SI Metric
cstar_mps = cstar_fps * 0.3048
T_chamber_kelvin = Tcham_R * 0.555556
Cf = (Ivac_sec * g0) / cstar_mps

# ==============================================================================
# 3. PHYSICAL & GEOMETRIC ENGINE SIZING
# ==============================================================================
Pc_pa = Pc_mpa * 1e6

# Base Throat & Exit Areas/Radii (meters)
At = target_thrust / (Pc_pa * Cf)
Rt = math.sqrt(At / math.pi)
Dt = Rt * 2.0

Ae = At * eps
Re = math.sqrt(Ae / math.pi)
De = Re * 2.0

# Chamber & Convergent Section Sizing (meters)
Rc = Rt * math.sqrt(contraction_ratio)
Dc = Rc * 2.0
L_c = L_star / contraction_ratio
L_conv = (Rc - Rt) / math.tan(math.radians(convergent_angle))

# Mass Flow Allocations
mdot_total = target_thrust / (Ivac_sec * g0)
mdot_ox = mdot_total * (MR / (1.0 + MR))
mdot_fuel = mdot_total / (1.0 + MR)

# ==============================================================================
# 4. PRINT PERFORMANCE & CORE METRICS REPORT
# ==============================================================================
print("================================================================")
print("             500N N2O / ETHANOL LIQUID ENGINE REPORT            ")
print("================================================================")
print(f"Calculated Expansion Ratio (ε) : {eps:.3f}")
print(f"Thrust Coefficient (Cf)        : {Cf:.4f}")
print(f"Characteristic Velocity (C*)   : {cstar_mps:.1f} m/s")
print(f"Estimated Vacuum Isp           : {Ivac_sec:.1f} seconds")
print(f"Adiabatic Flame Temp (T_ch)    : {T_chamber_kelvin:.1f} K\n")

print("--- CORE MASS FLOW REQUIREMENTS ---")
print(f"Total Mass Flow (ṁ_total)      : {mdot_total * 1000.0:.1f} g/s")
print(f"Oxidizer Mass Flow (ṁ_N2O)     : {mdot_ox * 1000.0:.1f} g/s")
print(f"Fuel Mass Flow (ṁ_Ethanol)     : {mdot_fuel * 1000.0:.1f} g/s\n")

print("--- COMMON UPSTREAM CHAMBER DIMENSIONS ---")
print(f"Chamber Diameter (Dc)          : {Dc * 1000.0:.2f} mm")
print(f"Chamber Cylinder Length (Lc)   : {L_c * 1000.0:.2f} mm")
print(f"Convergent Zone Length (Lconv) : {L_conv * 1000.0:.2f} mm")
print(f"Throat Diameter (Dt)           : {Dt * 1000.0:.2f} mm")
print(f"Exit Diameter (De)             : {De * 1000.0:.2f} mm\n")

# ==============================================================================
# 5. GENERATE CONICAL NOZZLE COORDINATES
# ==============================================================================
L_div_cone = (Re - Rt) / math.tan(math.radians(alpha_conical))

print("================================================================")
print("            CONICAL NOZZLE 2D PROFILE COORDINATES               ")
print("================================================================")
print(f"{'Nozzle Profile Station':<26} | {'X (Axial) [mm]':<14} | {'Y (Radius) [mm]':<14}")
print("-" * 62)
conical_stations = [
    ("Injector Face", 0.0, Rc),
    ("Chamber Cylindrical End", L_c, Rc),
    ("Nozzle Throat", L_c + L_conv, Rt),
    ("Conical Nozzle Exit", L_c + L_conv + L_div_cone, Re)
]
for label, x, y in conical_stations:
    print(f"{label:<26} | {x*1000.0:<14.2f} | {y*1000.0:<14.2f}")
print("====================================================\n")

# ==============================================================================
# 6. GENERATE RAO 80% BELL NOZZLE COORDINATES
# ==============================================================================
L_div_bell = 0.80 * L_div_cone  # 80% optimization length constraint
num_bell_steps = 10
bell_x_steps = np.linspace(0, L_div_bell, num_bell_steps)

print("================================================================")
print("             RAO BELL NOZZLE 2D PROFILE COORDINATES             ")
print("================================================================")
print(f"{'Nozzle Profile Station':<26} | {'X (Axial) [mm]':<14} | {'Y (Radius) [mm]':<14}")
print("-" * 62)
# Common chamber upstream layout prints identical to conical
print(f"{'Injector Face':<26} | {0.0:<14.2f} | {Rc*1000.0:<14.2f}")
print(f"{'Chamber Cylindrical End':<26} | {L_c*1000.0:<14.2f} | {Rc*1000.0:<14.2f}")
print(f"{'Nozzle Throat':<26} | {(L_c + L_conv)*1000.0:<14.2f} | {Rt*1000.0:<14.2f}")

# Calculate parabolic curve interpolation steps for the bell section
x_start_bell = L_c + L_conv
for i in range(1, num_bell_steps):
    t = bell_x_steps[i] / L_div_bell
    current_angle = theta_i - t * (theta_i - theta_e)
    
    # Quadratic parabolic blending equation
    y_val = Rt + (Re - Rt) * (math.sin(math.radians(current_angle)) / math.sin(math.radians(theta_i))) * (t**0.7)
    
    abs_x = (x_start_bell + bell_x_steps[i]) * 1000.0
    abs_y = y_val * 1000.0
    pct = (i / (num_bell_steps - 1)) * 100
    print(f"Bell Exit Contour {pct:3.0f}% | {abs_x:<14.2f} | {abs_y:<14.2f}")
print("================================================================")
