import json
import numpy as np
import matplotlib.pyplot as plt
from rocketcea.cea_obj_w_units import CEA_Obj

from services.propellants_service import get_fuel_name_by_code, get_oxidizer_name_by_code

def plot_propulsion_tradeoffs(mr_list, isp_list, tc_list, opt_mr):
    """
    Dedicated function to plot the trade-off curves for Specific Impulse
    and Combustion Chamber Temperature across the swept O/F range.
    """
    fig, ax1 = plt.subplots(figsize=(10, 6))

    # Plot Specific Impulse on the left axis
    color = 'tab:blue'
    ax1.set_xlabel('Mixture Ratio (O/F)', fontweight='bold')
    ax1.set_ylabel('Ideal Sea Level Isp (s)', color=color, fontweight='bold')
    ax1.plot(mr_list, isp_list, color=color, linewidth=2.5, label='Specific Impulse')
    ax1.tick_params(axis='y', labelcolor=color)
    ax1.grid(True, linestyle=':', alpha=0.6)

    # Instantiate a second axis that shares the same x-axis for temperature
    ax2 = ax1.twinx()
    color = 'tab:red'
    ax2.set_ylabel('Chamber Flame Temp Tc (K)', color=color, fontweight='bold')
    ax2.plot(mr_list, tc_list, color=color, linewidth=2, linestyle='--', label='Chamber Temp (Tc)')
    ax2.tick_params(axis='y', labelcolor=color)

    # Highlight the optimal performance operating point
    ax1.axvline(opt_mr, color='green', linestyle=':', linewidth=2, label=f'Optimal O/F ({opt_mr:.2f})')
    
    plt.title('Rocket Propellant Performance Trade-offs', fontsize=14, fontweight='bold')
    fig.tight_layout()
    
    # Combine labels from both axes for a clean unified legend box
    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc='lower center')
    
    print("Displaying Mixture Ratio trade-off chart window")
    plt.show()

def print_output_data(output_data):
    engine_inputs = output_data.get('engineInputs', {})
    engine_outputs = output_data.get('engineOutputs', {})
    oxidizer_name = engine_inputs["propellents"]["oxidizer"]["name"]
    fuel_name = engine_inputs["propellents"]["fuel"]["name"]
    oxidizer_code = engine_inputs["propellents"]["oxidizer"]["code"]
    fuel_code = engine_inputs["propellents"]["fuel"]["code"]

    print(f"========================================================================================================")
    print(f"                               RUNNING PROPULSION SWEEP ACROSS O/F RANGE                               ")
    print(f"========================================================================================================")
    print(f"{'MR (O/F)':<10} | {'Isp (s)':<8} | {'Tc (K)':<8} | {'C* (m/s)':<10} | {'Total Flow (g/s)':<18} | {'Ox Flow (g/s)':<15} | {'Fuel Flow (g/s)':<15}")
    print(f"-------------------------------------------------------------------------------------------------------")
    
    sweep_data = engine_outputs.get('mixtureRatioSweep', {})
    sweep_values = sweep_data.get('values', [])
    for item in sweep_values:
        mr = item['mixtureRatio']
        isp = item['specificImpulse']
        tc = item['chamberTemperature']
        cstar = item['characteristicVelocityCstar']
        mdot_total = item['totalMassFlow']
        mdot_ox = item['oxidizerMassFlow']
        mdot_fuel = item['fuelMassFlow']
        print(f"{mr:<10.2f} | {isp:<8.2f} | {tc:<8.1f} | {cstar:<10.2f} | {mdot_total:<18.2f} | {mdot_ox:<15.2f} | {mdot_fuel:<15.2f}")
    
    print(f"========================================================================================================")

    print(f"==================================================")
    print(f"           ROCKET ENGINE DESIGN SUMMARY           ")
    print(f"==================================================")
    print(f"Target Thrust:       {engine_inputs['targetThrust']['value']:.1f} N")
    print(f"Propellants:         {oxidizer_name} ({oxidizer_code}) / {fuel_name} ({fuel_code})")
    print(f"Chamber Pressure:    {engine_inputs['chamberPressure']['value']:.1f} bar")
    print(f"Exit Pressure:       {engine_inputs['exitPressure']['value']:.3f} bar")
    print(f"Optimum O/F Ratio:   {engine_outputs['optimumMixtureRatio']['value']:.2f}")
    print(f"Nozzle Area Ratio:   {engine_outputs['nozzleExpansionRatio']['value']:.3f}")
    print(f"--------------------------------------------------")
    print(f"THERMOCHEMICAL PERFORMANCE AT OPTIMUM MR:")
    print(f"Chamber Temp (Tc):   {engine_outputs['chamberTemperature']['value']:.1f} K")
    print(f"Peak Isp Found:      {engine_outputs['peakSpecificImpulse']['value']:.2f} s")
    print(f"C* (Characteristic): {engine_outputs['characteristicVelocityCstar']['value']:.2f} m/s")
    print(f"Thrust Coeff (Cf):   {engine_outputs['thrustCoefficientCf']['value']:.3f}")
    print(f"Gamma (Chamber):     {engine_outputs['specificHeatRatioGamma']['value']:.4f}")
    print(f"Molecular Wt (Chm):  {engine_outputs['combustionMolecularWeight']['value']:.2f} g/mol")
    print(f"--------------------------------------------------")
    print(f"MASS FLOW RATE AT OPTIMUM MR:")
    print(f"Total Mass Flow:     {engine_outputs['massFlowRates']['total']['value']:.2f} g/s")
    print(f"Oxidizer Flow rate:  {engine_outputs['massFlowRates']['oxidizer']['value']:.2f} g/s")
    print(f"Fuel Flow rate:      {engine_outputs['massFlowRates']['fuel']['value']:.2f} g/s")
    print(f"==================================================")

def generate_rocket_engine_params(ox_code='N2O', fuel_code='Ethanol', thrust_N=500.0, pc_bar=20.0, pe_bar=1.013, mr_min=3.0, mr_max=6.5, console_output=False):
    """Main execution wrapper to compute core engine characteristics and drive sub-modules."""
    g0 = 9.80665  
    cea_obj = CEA_Obj(oxName=ox_code, fuelName=fuel_code, pressure_units='bar', isp_units='sec', cstar_units='m/s', temperature_units='K')
    pc_ov_pe = pc_bar / pe_bar
    
    # Evaluate performance parameters iteratively across the specified O/F sweep boundaries
    mr_range = np.linspace(mr_min, mr_max, 25)
    isp_list, tc_list, records = [], [], []      
    json_sweep_array = []

    for mr in mr_range:
        eps_step = cea_obj.get_eps_at_PcOvPe(PcOvPe=pc_ov_pe, MR=mr)
        isp_step = cea_obj.get_Isp(Pc=pc_bar, MR=mr, eps=eps_step)
        cstar_step = cea_obj.get_Cstar(Pc=pc_bar, MR=mr)
        tc_step = cea_obj.get_Tcomb(Pc=pc_bar, MR=mr)
        
        isp_list.append(isp_step)
        tc_list.append(tc_step)
        
        mdot_total_step = thrust_N / (isp_step * g0)
        mdot_fuel_step = mdot_total_step / (1.0 + mr)
        mdot_ox_step = mdot_total_step - mdot_fuel_step
        
        records.append((mr, isp_step, cstar_step, tc_step, mdot_total_step, mdot_ox_step, mdot_fuel_step, eps_step))
        json_sweep_array.append({
            "mixtureRatio": round(float(mr), 3),
            "specificImpulse": round(float(isp_step), 3),
            "chamberTemperature": round(float(tc_step), 3),
            "characteristicVelocityCstar": round(float(cstar_step), 3),
            "totalMassFlow": round(float(mdot_total_step * 1000.0), 3),
            "oxidizerMassFlow": round(float(mdot_ox_step * 1000.0), 3),
            "fuelMassFlow": round(float(mdot_fuel_step * 1000.0), 3)
        })
        
    # Isolate optimum indexing entries matching peak specific impulse conditions
    opt_idx = np.argmax(np.array(isp_list))
    opt_mr, peak_isp, cstar, t_comb, mdot_total, mdot_ox, mdot_fuel, opt_eps = records[opt_idx]
    ch_mw, gamma_throat = cea_obj.get_Chamber_MolWt_gamma(Pc=pc_bar, MR=opt_mr, eps=opt_eps)
    
    # Geometric sizing calculations
    cf = (peak_isp * g0) / cstar
    
    output_data = {
        "engineInputs": {
            "propellents": {
                "oxidizer": {"name": get_oxidizer_name_by_code(ox_code), "code": ox_code},
                "fuel": {"name": get_fuel_name_by_code(fuel_code), "code": fuel_code}
            },
            "targetThrust": {"value": thrust_N, "unit": "N"},
            "chamberPressure": {"value": pc_bar, "unit": "bar"},
            "exitPressure": {"value": pe_bar, "unit": "bar"}
        },
        "engineOutputs": {
            "optimumMixtureRatio": {"value": round(float(opt_mr), 3), "unit": "O/F mass ratio"},
            "peakSpecificImpulse": {"value": round(float(peak_isp), 3), "unit": "s"},
            "characteristicVelocityCstar": {"value": round(float(cstar), 3), "unit": "m/s"},
            "thrustCoefficientCf": {"value": round(float(cf), 3), "unit": "dimensionless"},
            "chamberTemperature": {"value": round(float(t_comb), 3), "unit": "K"},
            "specificHeatRatioGamma": {"value": round(float(gamma_throat), 3), "unit": "dimensionless"},
            "combustionMolecularWeight": {"value": round(float(ch_mw), 3), "unit": "g/mol"},
            "nozzleExpansionRatio": {"value": round(float(opt_eps), 3), "unit": "dimensionless"},
            "mixtureRatioSweep": {
                "units": {
                    "mixtureRatio": "O/F mass ratio",
                    "specificImpulse": "s",
                    "chamberTemperature": "K",
                    "characteristicVelocityCstar": "m/s",
                    "totalMassFlow": "g/s",
                    "oxidizerMassFlow": "g/s",
                    "fuelMassFlow": "g/s"
                },
                "values": json_sweep_array
            },
            "massFlowRates": {
                "total": {"value": round(float(mdot_total * 1000.0), 3), "unit": "g/s"},
                "oxidizer": {"value": round(float(mdot_ox * 1000.0), 3), "unit": "g/s"},
                "fuel": {"value": round(float(mdot_fuel * 1000.0), 3), "unit": "g/s"}
            }
        }
    }

    if console_output:
        print_output_data(output_data)
        plot_propulsion_tradeoffs(mr_range, isp_list, tc_list, opt_mr)
    else:
        return output_data

if __name__ == "__main__":
    result = generate_rocket_engine_params(
        ox_code='N2O', 
        fuelName='Ethanol',
        thrust_N=500.0, 
        pc_bar=10.0, 
        pe_bar=1.013, 
        mr_min=3.5, 
        mr_max=5.5, 
        console_output=True
    )
    print(json.dumps(result))