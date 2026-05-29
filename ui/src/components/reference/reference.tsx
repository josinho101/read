import type { ReactNode } from 'react';
import './reference.css';

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
                symbol: <>MR</>,
                name: 'Mixture Ratio',
                unit: '—',
                unitNone: true,
                desc: 'The ratio of oxidizer mass flow rate to fuel mass flow rate. Rocket engines usually run fuel-rich to lower temperatures and molecular weight.',
            },
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
        ],
    },
    {
        heading: 'Gas Chemistry',
        params: [
            {
                symbol: <><i>T</i><sub>c</sub></>,
                name: 'Chamber Temperature',
                unit: 'K',
                desc: 'The intense heat generated inside the combustion chamber. Higher temperatures increase performance but stress the engine materials.',
            },
            {
                symbol: <>γ</>,
                name: 'Specific Heat Ratio',
                unit: '—',
                unitNone: true,
                desc: 'A thermodynamic property of the exhaust gas. It affects how much pressure drops as gas expands through the nozzle.',
            },
            {
                symbol: <><i>M</i></>,
                name: 'Combustion Molecular Weight',
                unit: 'g/mol',
                desc: 'The average weight of the exhaust molecules. Lighter molecules (like water vapor or hydrogen) move faster, which increases engine efficiency.',
            },
        ],
    },
    {
        heading: 'Engine Geometry',
        params: [
            {
                symbol: <><i>R</i><sub>c</sub></>,
                name: 'Chamber Radius',
                unit: 'm',
                desc: 'The internal radius of the combustion chamber. It must be large enough to give the liquid propellants time to mix and burn completely.',
            },
            {
                symbol: <><i>R</i><sub>t</sub></>,
                name: 'Throat Radius',
                unit: 'm',
                desc: 'The narrowest point of the nozzle. It chokes the flow to speed up the gas to Mach 1 and dictates the engine\'s internal pressure.',
            },
            {
                symbol: <><i>R</i><sub>e</sub></>,
                name: 'Exit Radius',
                unit: 'm',
                desc: 'The radius at the very end of the nozzle bell. It dictates how far the exhaust gas expands before leaving the engine.',
            },
            {
                symbol: <>ε</>,
                name: 'Expansion Ratio',
                unit: '—',
                unitNone: true,
                desc: 'The ratio of the nozzle exit area to the throat area. Vacuum engines use massive expansion ratios to extract every bit of thrust from the exhaust gas.',
            },
        ],
    },
];

export default function Reference() {
    return (
        <div className="reference-page">
            <div className="reference-header">
                <p className="reference-title">Parameter Reference</p>
                <p className="reference-subtitle">Symbols, units, and definitions for all engine design outputs</p>
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
