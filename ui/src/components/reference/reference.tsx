import { useState } from 'react';
import type { ReactNode } from 'react';
import { type EngineDesignResult } from '../../services/engineDesignService';
import './reference.css';

interface ReferenceProps {
    engineDesignResult: EngineDesignResult | null;
}

// ─── Terminology types ────────────────────────────────────────────────────────

interface Param {
    symbol: ReactNode;
    name: string;
    unit: string;
    unitNone?: boolean;
    desc: string;
}

interface Section {
    heading: string;
    params: Param[];
}

const sections: Section[] = [
    {
        heading: 'Engine Inputs',
        params: [
            {
                symbol: <><i>F</i></>,
                name: 'Thrust',
                unit: 'N',
                desc: 'The target force the engine must produce. It is the primary sizing input — a larger thrust requirement directly scales up the throat area and all mass flow rates proportionally.',
            },
            {
                symbol: <><i>P</i><sub>c</sub></>,
                name: 'Chamber Pressure',
                unit: 'bar',
                desc: 'The operating pressure inside the combustion chamber. Higher Pc raises Isp and shrinks engine dimensions, but increases structural mass and turbopump requirements. Typical values range from 20 bar (pressure-fed) to over 200 bar (pump-fed).',
            },
            {
                symbol: <>O/F</>,
                name: 'Mixture Ratio',
                unit: '—',
                unitNone: true,
                desc: 'The ratio of oxidizer mass flow to fuel mass flow set by the user as a sweep range. The tool scans 25 points across this range and identifies the O/F that maximises Isp.',
            },
            {
                symbol: <><i>P</i><sub>a</sub></>,
                name: 'Ambient Pressure',
                unit: 'bar',
                desc: 'Atmospheric pressure at the intended operating altitude. At sea level Pa = 1.01325 bar; in vacuum Pa ≈ 0. In sea-level mode it drives the nozzle expansion ratio so the exit pressure matches ambient conditions.',
            },
        ],
    },
    {
        heading: 'Performance & Efficiency',
        params: [
            {
                symbol: <><i>I</i><sub>sp</sub></>,
                name: 'Specific Impulse',
                unit: 's',
                desc: 'Measures fuel efficiency. It is the thrust generated per unit of propellant consumed per second. Higher values mean better efficiency.',
            },
            {
                symbol: <><i>C</i>*</>,
                name: 'Characteristic Velocity',
                unit: 'm/s',
                desc: 'Measures combustion efficiency. It represents the energy available from the burning propellants in the combustion chamber. It depends only on the propellants and chamber design, not the nozzle.',
            },
            {
                symbol: <><i>C</i><sub>f</sub></>,
                name: 'Thrust Coefficient',
                unit: '—',
                unitNone: true,
                desc: 'Measures nozzle efficiency. It quantifies how well the nozzle accelerates the exhaust gas to multiply the thrust. Higher expansion ratios increase this value.',
            },
        ],
    },
    {
        heading: 'Propellant Dynamics',
        params: [
            {
                symbol: <><i>ṁ</i></>,
                name: 'Total Mass Flow',
                unit: 'kg/s',
                desc: 'The total weight of propellant burned per second. It is the sum of oxidizer and fuel mass flows.',
            },
            {
                symbol: <><i>ṁ</i><sub>o</sub></>,
                name: 'Oxidizer Mass Flow',
                unit: 'kg/s',
                desc: 'The mass of the oxidizer entering the injector per second.',
            },
            {
                symbol: <><i>ṁ</i><sub>f</sub></>,
                name: 'Fuel Mass Flow',
                unit: 'kg/s',
                desc: 'The mass of the fuel entering the injector per second.',
            },
            {
                symbol: <>MR</>,
                name: 'Optimum Mixture Ratio',
                unit: '—',
                unitNone: true,
                desc: 'The O/F ratio that produces the highest Isp for the given propellant pair and chamber pressure. Rocket engines typically run slightly fuel-rich to reduce combustion temperature and molecular weight.',
            },
        ],
    },
    {
        heading: 'Gas Chemistry',
        params: [
            {
                symbol: <><i>T</i><sub>c</sub></>,
                name: 'Chamber Temperature',
                unit: 'K',
                desc: 'The adiabatic flame temperature inside the combustion chamber. Higher temperatures increase performance but stress the engine materials.',
            },
            {
                symbol: <>γ</>,
                name: 'Specific Heat Ratio',
                unit: '—',
                unitNone: true,
                desc: 'The ratio Cp/Cv for the exhaust gas mixture. It governs how strongly pressure drops as gas expands through the nozzle — a lower γ produces more expansion work for the same pressure ratio.',
            },
            {
                symbol: <><i>M</i></>,
                name: 'Combustion Molecular Weight',
                unit: 'g/mol',
                desc: 'The average molecular weight of the exhaust gas products. Lighter molecules move faster and exit at higher velocity, directly increasing Isp. LOX/LH2 engines benefit from the very low molecular weight of water and unburned hydrogen.',
            },
            {
                symbol: <>g<sub>0</sub></>,
                name: 'Standard Gravity',
                unit: 'm/s²',
                desc: 'The standard gravitational acceleration constant, 9.80665 m/s². Used as a unit-conversion factor in the definition of Isp so that the same numerical value is obtained regardless of the unit system used for thrust and mass flow.',
            },
        ],
    },
    {
        heading: 'Engine Geometry',
        params: [
            {
                symbol: <><i>R</i><sub>c</sub></>,
                name: 'Chamber Radius',
                unit: 'mm',
                desc: 'The internal radius of the cylindrical combustion chamber. Derived from the throat radius and the contraction ratio: Rc = Rt × √CR.',
            },
            {
                symbol: <><i>R</i><sub>t</sub></>,
                name: 'Throat Radius',
                unit: 'mm',
                desc: 'The radius at the narrowest point of the nozzle. The flow reaches Mach 1 here. It is the primary geometric output, derived directly from the throat area.',
            },
            {
                symbol: <><i>R</i><sub>e</sub></>,
                name: 'Exit Radius',
                unit: 'mm',
                desc: 'The radius at the nozzle exit plane. Determines the final exhaust area. Derived from the throat radius and the expansion ratio: Re = Rt × √ε.',
            },
            {
                symbol: <>ε</>,
                name: 'Expansion Ratio',
                unit: '—',
                unitNone: true,
                desc: 'The ratio of the nozzle exit area to the throat area (Ae/At). For sea-level designs it is chosen so that exit pressure equals ambient pressure. Vacuum engines use very high expansion ratios (40+) to extract maximum thrust.',
            },
        ],
    },
    {
        heading: 'Engine Areas',
        params: [
            {
                symbol: <><i>A</i><sub>t</sub></>,
                name: 'Throat Area',
                unit: 'm²',
                desc: 'The cross-sectional area at the nozzle throat. It is the fundamental sizing output, determined by At = (ṁ × C*) / Pc. All geometry dimensions are derived from it.',
            },
            {
                symbol: <><i>A</i><sub>c</sub></>,
                name: 'Chamber Area',
                unit: 'm²',
                desc: 'The cross-sectional area of the cylindrical combustion chamber. Equals At × CR. Must be large enough to give the propellants adequate residence time to fully combust.',
            },
            {
                symbol: <><i>A</i><sub>e</sub></>,
                name: 'Exit Area',
                unit: 'm²',
                desc: 'The cross-sectional area at the nozzle exit plane. Equals At × ε. Larger exit areas extract more thrust from the expanding exhaust gas but increase engine weight and diameter.',
            },
            {
                symbol: <>CR</>,
                name: 'Contraction Ratio',
                unit: '—',
                unitNone: true,
                desc: 'The ratio of chamber area to throat area (Ac/At). Set to 8.0 in this tool. Controls how much the flow decelerates from the chamber into the throat convergent section.',
            },
        ],
    },
    {
        heading: 'Nozzle Types',
        params: [
            {
                symbol: <>Conical</>,
                name: 'Conical Nozzle',
                unit: '—',
                unitNone: true,
                desc: 'The simplest divergent nozzle: a straight-walled cone at a fixed half-angle θdiv (typically 12–18°). Easy to manufacture. Produces slight radial exhaust velocity components that reduce thrust efficiency by a factor of ½(1 + cos θdiv) — roughly 1.7% loss at 15°.',
            },
            {
                symbol: <>Bell</>,
                name: 'Bell Nozzle (Bézier)',
                unit: '—',
                unitNone: true,
                desc: 'A parabolic bell shape approximated by a cubic Bézier curve. The wall starts at a steep initial angle θn near the throat to rapidly turn the flow axially, then curves to a shallow exit angle θe nearly parallel to the axis. Achieves the same efficiency as a full conical nozzle at ~75–85% of the length. Angles are user-adjustable.',
            },
            {
                symbol: <>Rao</>,
                name: 'Rao Optimal Nozzle',
                unit: '—',
                unitNone: true,
                desc: 'A thrust-optimized contour from Rao\'s 1958 variational analysis. Wall angles θn and θe are derived from Rao\'s look-up tables (Sutton & Biblarz) based on the expansion ratio ε and nozzle length fraction Ln/Lref, maximising the thrust coefficient Cf. Unlike the Bell approximation, these angles are computed automatically and are not user-adjustable.',
            },
        ],
    },
    {
        heading: 'Nozzle Angles',
        params: [
            {
                symbol: <>θ<sub>conv</sub></>,
                name: 'Convergent Half-Angle',
                unit: '°',
                desc: 'The wall angle of the convergent section tapering from the chamber to the throat. Typically 20–45°. Shallower angles produce a smoother flow deceleration and lower boundary-layer losses, but lengthen the engine.',
            },
            {
                symbol: <>θ<sub>div</sub></>,
                name: 'Divergent Half-Angle',
                unit: '°',
                desc: 'The wall half-angle of a conical divergent section. Typically 12–18°. The baseline reference for comparing bell and Rao contour lengths. Smaller angles improve thrust efficiency but increase nozzle length and mass.',
            },
            {
                symbol: <>θ<sub>n</sub></>,
                name: 'Initial Divergent Angle',
                unit: '°',
                desc: 'The steep wall angle just downstream of the throat in Bell and Rao nozzles. It rapidly turns the flow axially to prevent oblique shocks from forming near the throat region. Typically 20–35°.',
            },
            {
                symbol: <>θ<sub>e</sub></>,
                name: 'Exit Wall Angle',
                unit: '°',
                desc: 'The gentle wall angle at the nozzle exit plane. Near-zero values keep exhaust flow nearly axial for maximum thrust. Typical values are 4–14°; Rao nozzles compute this automatically from ε and Ln/Lref.',
            },
            {
                symbol: <>L<sub>n</sub>/L<sub>ref</sub></>,
                name: 'Rao Length Fraction',
                unit: '—',
                unitNone: true,
                desc: 'The ratio of the designed bell/Rao nozzle length to the reference 15° conical nozzle length. A value of 0.8 means the nozzle is 80% as long as the equivalent conical nozzle, trading a small thrust penalty for reduced weight and length.',
            },
        ],
    },
    {
        heading: 'Heat Transfer',
        params: [
            {
                symbol: <><i>q</i></>,
                name: 'Heat Flux',
                unit: 'MW/m²',
                desc: 'The rate of heat transferred from the hot combustion gas to the nozzle wall per unit area. It peaks sharply at the throat where gas velocity and density are highest. Used to size cooling jackets and select wall materials.',
            },
            {
                symbol: <><i>h</i><sub>g</sub></>,
                name: 'Heat Transfer Coefficient',
                unit: 'W/m²K',
                desc: 'The gas-side thermal conductance computed from the Bartz correlation. It quantifies how strongly the boundary layer couples the hot gas to the wall. Higher values mean the wall heats up faster for the same temperature difference.',
            },
            {
                symbol: <><i>T</i><sub>aw</sub></>,
                name: 'Adiabatic Wall Temperature',
                unit: 'K',
                desc: 'The temperature the wall surface would reach if no heat were conducted away — the upper limit for wall heating. It is higher than the local static gas temperature because the boundary layer decelerates and partially recovers kinetic energy as heat.',
            },
            {
                symbol: <><i>T</i><sub>wall</sub></>,
                name: 'Wall Temperature',
                unit: 'K',
                desc: 'The assumed inner-wall surface temperature. Lower values represent an actively cooled wall (regenerative or film cooling), giving a larger ΔT and a higher heat load. Higher values represent an uncooled or ablatively cooled wall. Heat flux is q = hg × (Taw − Twall).',
            },
            {
                symbol: <>σ</>,
                name: 'Bartz Correction Factor',
                unit: '—',
                unitNone: true,
                desc: 'A dimensionless correction in the Bartz correlation that accounts for the variation of gas viscosity and thermal conductivity across the hot boundary layer. Values less than 1 reduce the uncorrected heat transfer coefficient; it varies along the nozzle with local Mach number and wall-to-gas temperature ratio.',
            },
        ],
    },
];

// ─── Steps & Equations ────────────────────────────────────────────────────────

interface EquationLine {
    formula: string;
    vars: { sym: string; val: string; unit: string }[];
    result: string;
}

interface Step {
    num: number;
    title: string;
    desc: string;
    equations: EquationLine[];
}

const G0 = 9.80665;
const PA_SL = 1.01325;

function buildSteps(r: EngineDesignResult): Step[] {
    const inp = r.engineInputs;
    const opt = r.engineOutputs.mixtureRatio.optimum;
    const isVac = inp.performanceMode === 'vacuum';

    const F_N = inp.targetThrust.value;
    const Pc = inp.chamberPressure.value;
    const MR = opt.mixtureRatio.value;
    const Tc = opt.chamberTemperature.value;
    const cstar = opt.characteristicVelocityCstar.value;
    const cf = opt.thrustCoefficientCf.value;
    const isp = opt.specificImpulse.value;
    const gamma = opt.specificHeatRatioGamma.value;
    const mw = opt.combustionMolecularWeight.value;
    const eps = opt.expansionRatio.value;
    const mdot_gs = opt.totalMassFlow.value;        // g/s
    const mdot_ox_gs = opt.oxidizerMassFlow.value;
    const mdot_fuel_gs = opt.fuelMassFlow.value;
    const mdot = mdot_gs / 1000;                    // kg/s
    const mdot_ox = mdot_ox_gs / 1000;
    const mdot_fuel = mdot_fuel_gs / 1000;
    const Rt_mm = opt.throatRadius.value;
    const Rc_mm = opt.chamberRadius.value;
    const Re_mm = opt.exitRadius.value;
    const CR = opt.contractionRatio.value;

    const At_m2 = Math.PI * (Rt_mm / 1000) ** 2;
    const Ac_m2 = Math.PI * (Rc_mm / 1000) ** 2;
    const Ae_m2 = Math.PI * (Re_mm / 1000) ** 2;

    const cf_vac = (isp * G0) / cstar;
    const isp_vac = isVac ? isp : (cf_vac * cstar) / G0;

    const fmt = (v: number, d: number) => v.toFixed(d);

    return [
        {
            num: 1,
            title: 'CEA Thermochemistry',
            desc: 'NASA CEA solves the equilibrium combustion equations for the selected propellant pair at the given chamber pressure and O/F ratio. The output values — C*, Tc, γ, and molecular weight — are fundamental inputs to every downstream calculation.',
            equations: [
                {
                    formula: 'C*, Tc, γ, M  ←  CEA(propellants, Pc, O/F)',
                    vars: [
                        { sym: 'Propellants', val: `${inp.propellants.oxidizer.name} / ${inp.propellants.fuel.name}`, unit: '' },
                        { sym: 'Pc', val: fmt(Pc, 1), unit: 'bar' },
                        { sym: 'O/F', val: fmt(MR, 3), unit: '(optimum)' },
                    ],
                    result: `C* = ${fmt(cstar, 1)} m/s    Tc = ${fmt(Tc, 0)} K    γ = ${fmt(gamma, 4)}    M = ${fmt(mw, 2)} g/mol`,
                },
            ],
        },
        {
            num: 2,
            title: 'Expansion Ratio',
            desc: isVac
                ? 'In vacuum mode the expansion ratio is fixed at 40 — a common upper-stage value that extracts nearly all available exhaust energy.'
                : 'In sea-level mode the expansion ratio is found from the isentropic area-Mach relation such that the nozzle exit pressure equals ambient pressure at sea level (1.01325 bar).',
            equations: [
                isVac
                    ? {
                        formula: 'ε = 40.0  (fixed, vacuum mode)',
                        vars: [],
                        result: `ε = ${fmt(eps, 3)}`,
                    }
                    : {
                        formula: 'ε  from  isentropic(Pc / Pa)',
                        vars: [
                            { sym: 'Pc', val: fmt(Pc, 1), unit: 'bar' },
                            { sym: 'Pa', val: fmt(PA_SL, 5), unit: 'bar (sea level)' },
                            { sym: 'Pc/Pa', val: fmt(Pc / PA_SL, 3), unit: '' },
                        ],
                        result: `ε = ${fmt(eps, 3)}`,
                    },
            ],
        },
        {
            num: 3,
            title: 'Vacuum Thrust Coefficient',
            desc: 'The vacuum thrust coefficient Cf_vac is derived from the vacuum Isp and C*. It represents the ideal nozzle performance — what Cf would be if there were no ambient back-pressure opposing the expanding exhaust.',
            equations: [
                {
                    formula: 'Cf_vac = (Isp_vac × g₀) / C*',
                    vars: [
                        { sym: 'Isp_vac', val: fmt(isp_vac, 2), unit: 's' },
                        { sym: 'g₀', val: fmt(G0, 5), unit: 'm/s²' },
                        { sym: 'C*', val: fmt(cstar, 1), unit: 'm/s' },
                    ],
                    result: `Cf_vac = (${fmt(isp_vac, 2)} × ${fmt(G0, 5)}) / ${fmt(cstar, 1)} = ${fmt(cf_vac, 4)}`,
                },
            ],
        },
        ...(isVac ? [] : [{
            num: 4,
            title: 'Sea-Level Thrust Coefficient',
            desc: 'At sea level the ambient back-pressure pushes back against the nozzle exit, reducing effective thrust. This penalty term ε × (Pa/Pc) is subtracted from the vacuum Cf to get the actual sea-level Cf.',
            equations: [
                {
                    formula: 'Cf = Cf_vac − ε × (Pa / Pc)',
                    vars: [
                        { sym: 'Cf_vac', val: fmt(cf_vac, 4), unit: '' },
                        { sym: 'ε', val: fmt(eps, 3), unit: '' },
                        { sym: 'Pa', val: fmt(PA_SL, 5), unit: 'bar' },
                        { sym: 'Pc', val: fmt(Pc, 1), unit: 'bar' },
                        { sym: 'ε × (Pa/Pc)', val: fmt(eps * (PA_SL / Pc), 4), unit: '(penalty)' },
                    ],
                    result: `Cf = ${fmt(cf_vac, 4)} − ${fmt(eps * (PA_SL / Pc), 4)} = ${fmt(cf, 4)}`,
                },
            ],
        }]),
        {
            num: isVac ? 4 : 5,
            title: 'Specific Impulse',
            desc: isVac
                ? 'In vacuum mode Isp equals the CEA vacuum Isp directly — no ambient correction is needed.'
                : 'Isp is recovered from the sea-level Cf and C* using the fundamental relation Isp = (Cf × C*) / g₀.',
            equations: [
                isVac
                    ? {
                        formula: 'Isp = Isp_vac',
                        vars: [{ sym: 'Isp_vac', val: fmt(isp_vac, 2), unit: 's' }],
                        result: `Isp = ${fmt(isp, 2)} s`,
                    }
                    : {
                        formula: 'Isp = (Cf × C*) / g₀',
                        vars: [
                            { sym: 'Cf', val: fmt(cf, 4), unit: '' },
                            { sym: 'C*', val: fmt(cstar, 1), unit: 'm/s' },
                            { sym: 'g₀', val: fmt(G0, 5), unit: 'm/s²' },
                        ],
                        result: `Isp = (${fmt(cf, 4)} × ${fmt(cstar, 1)}) / ${fmt(G0, 5)} = ${fmt(isp, 2)} s`,
                    },
            ],
        },
        {
            num: isVac ? 5 : 6,
            title: 'Total Mass Flow Rate',
            desc: 'The total propellant mass consumed per second required to produce the target thrust at the computed Isp.',
            equations: [
                {
                    formula: 'ṁ = F / (Isp × g₀)',
                    vars: [
                        { sym: 'F', val: fmt(F_N, 1), unit: 'N' },
                        { sym: 'Isp', val: fmt(isp, 2), unit: 's' },
                        { sym: 'g₀', val: fmt(G0, 5), unit: 'm/s²' },
                    ],
                    result: `ṁ = ${fmt(F_N, 1)} / (${fmt(isp, 2)} × ${fmt(G0, 5)}) = ${fmt(mdot, 4)} kg/s`,
                },
            ],
        },
        {
            num: isVac ? 6 : 7,
            title: 'Propellant Flow Decomposition',
            desc: 'The total mass flow is split into oxidizer and fuel flows using the optimum O/F ratio.',
            equations: [
                {
                    formula: 'ṁ_fuel = ṁ / (1 + O/F)',
                    vars: [
                        { sym: 'ṁ', val: fmt(mdot, 4), unit: 'kg/s' },
                        { sym: 'O/F', val: fmt(MR, 3), unit: '' },
                        { sym: '1 + O/F', val: fmt(1 + MR, 3), unit: '' },
                    ],
                    result: `ṁ_fuel = ${fmt(mdot, 4)} / ${fmt(1 + MR, 3)} = ${fmt(mdot_fuel, 4)} kg/s`,
                },
                {
                    formula: 'ṁ_ox = ṁ − ṁ_fuel',
                    vars: [
                        { sym: 'ṁ', val: fmt(mdot, 4), unit: 'kg/s' },
                        { sym: 'ṁ_fuel', val: fmt(mdot_fuel, 4), unit: 'kg/s' },
                    ],
                    result: `ṁ_ox = ${fmt(mdot, 4)} − ${fmt(mdot_fuel, 4)} = ${fmt(mdot_ox, 4)} kg/s`,
                },
            ],
        },
        {
            num: isVac ? 7 : 8,
            title: 'Throat Area',
            desc: 'The throat area is the fundamental sizing result. It links the thermochemical performance (C*) with the required mass flow and chamber pressure.',
            equations: [
                {
                    formula: 'At = (ṁ × C*) / (Pc × 10⁵)',
                    vars: [
                        { sym: 'ṁ', val: fmt(mdot, 5), unit: 'kg/s' },
                        { sym: 'C*', val: fmt(cstar, 1), unit: 'm/s' },
                        { sym: 'Pc', val: fmt(Pc, 1), unit: 'bar' },
                        { sym: 'Pc × 10⁵', val: fmt(Pc * 1e5, 0), unit: 'Pa' },
                    ],
                    result: `At = (${fmt(mdot, 5)} × ${fmt(cstar, 1)}) / ${fmt(Pc * 1e5, 0)} = ${fmt(At_m2 * 1e6, 3)} mm²  (${fmt(At_m2, 6)} m²)`,
                },
            ],
        },
        {
            num: isVac ? 8 : 9,
            title: 'Engine Radii',
            desc: 'All three characteristic radii are derived from the throat area and the area ratios. The throat radius is the geometric root; chamber and exit radii follow from the contraction and expansion ratios.',
            equations: [
                {
                    formula: 'Rt = √(At / π)',
                    vars: [
                        { sym: 'At', val: fmt(At_m2, 6), unit: 'm²' },
                    ],
                    result: `Rt = √(${fmt(At_m2, 6)} / π) = ${fmt(Rt_mm, 3)} mm`,
                },
                {
                    formula: 'Rc = Rt × √(CR)',
                    vars: [
                        { sym: 'Rt', val: fmt(Rt_mm, 3), unit: 'mm' },
                        { sym: 'CR', val: fmt(CR, 1), unit: '(fixed)' },
                        { sym: '√CR', val: fmt(Math.sqrt(CR), 4), unit: '' },
                    ],
                    result: `Rc = ${fmt(Rt_mm, 3)} × ${fmt(Math.sqrt(CR), 4)} = ${fmt(Rc_mm, 3)} mm`,
                },
                {
                    formula: 'Re = Rt × √(ε)',
                    vars: [
                        { sym: 'Rt', val: fmt(Rt_mm, 3), unit: 'mm' },
                        { sym: 'ε', val: fmt(eps, 3), unit: '' },
                        { sym: '√ε', val: fmt(Math.sqrt(eps), 4), unit: '' },
                    ],
                    result: `Re = ${fmt(Rt_mm, 3)} × ${fmt(Math.sqrt(eps), 4)} = ${fmt(Re_mm, 3)} mm`,
                },
            ],
        },
    ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Terminologies() {
    return (
        <div className="reference-page">
            <div className="reference-header">
                <p className="reference-title">Parameter Reference</p>
                <p className="reference-subtitle">Symbols, units, and definitions for all engine design parameters</p>
            </div>

            {sections.map((section) => (
                <div className="reference-section" key={section.heading}>
                    <h2 className="reference-section-heading">{section.heading}</h2>
                    <div className="reference-grid">
                        {section.params.map((p) => (
                            <div className="ref-card" key={p.name}>
                                <div className="ref-card-symbol">{p.symbol}</div>
                                <div className="ref-card-body">
                                    <div className="ref-card-name-row">
                                        <span className="ref-card-name">{p.name}</span>
                                        <span className={`ref-card-unit${p.unitNone ? ' ref-card-unit--none' : ''}`}>
                                            {p.unit}
                                        </span>
                                    </div>
                                    <p className="ref-card-desc">{p.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function StepsAndEquations({ engineDesignResult }: { engineDesignResult: EngineDesignResult | null }) {
    if (!engineDesignResult) {
        return (
            <div className="eq-placeholder">
                <div className="eq-placeholder-label">Run engine design to populate equations</div>
                <div className="eq-placeholder-hint">Fill in the left panel and wait for results — each calculation step will appear here with your values substituted in.</div>
            </div>
        );
    }

    const steps = buildSteps(engineDesignResult);
    const isVac = engineDesignResult.engineInputs.performanceMode === 'vacuum';

    return (
        <div className="reference-page">
            <div className="reference-header">
                <p className="reference-title">Steps &amp; Equations</p>
                <p className="reference-subtitle">
                    Calculation chain from inputs to outputs — {isVac ? 'vacuum' : 'sea-level'} mode &nbsp;|&nbsp;
                    O/F = {engineDesignResult.engineOutputs.mixtureRatio.optimum.mixtureRatio.value.toFixed(3)} (optimum)
                </p>
            </div>

            {steps.map((step) => (
                <div className="eq-step-card" key={step.num}>
                    <div className="eq-step-header">
                        <span className="eq-step-num">STEP {step.num}</span>
                        <span className="eq-step-title">{step.title}</span>
                    </div>
                    <p className="eq-step-desc">{step.desc}</p>

                    {step.equations.map((eq, i) => (
                        <div className="eq-block" key={i}>
                            <div className="eq-formula">{eq.formula}</div>
                            {eq.vars.length > 0 && (
                                <div className="eq-vars">
                                    {eq.vars.map((v) => (
                                        <div className="eq-var-row" key={v.sym}>
                                            <span className="eq-var-sym">{v.sym}</span>
                                            <span className="eq-var-eq">=</span>
                                            <span className="eq-var-val">{v.val}</span>
                                            {v.unit && <span className="eq-var-unit">{v.unit}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="eq-result">{eq.result}</div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function Reference({ engineDesignResult }: ReferenceProps) {
    const [subTab, setSubTab] = useState<'TERMINOLOGIES' | 'STEPS & EQUATIONS'>('STEPS & EQUATIONS');

    return (
        <div className="reference-root">
            <div className="ref-subtabs">
                {(['STEPS & EQUATIONS', 'TERMINOLOGIES'] as const).map((t) => (
                    <button
                        key={t}
                        className={`ref-subtab ${subTab === t ? 'ref-subtab--active' : ''}`}
                        onClick={() => setSubTab(t)}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <div className="ref-subtab-content">
                {subTab === 'TERMINOLOGIES' && <Terminologies />}
                {subTab === 'STEPS & EQUATIONS' && <StepsAndEquations engineDesignResult={engineDesignResult} />}
            </div>
        </div>
    );
}
