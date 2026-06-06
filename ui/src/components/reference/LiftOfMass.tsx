import { useState, useMemo } from 'react';
import { type EngineDesignResult } from '../../services/engineDesignService';

interface LiftOfMassProps {
    engineDesignResult: EngineDesignResult | null;
}

interface TwrRow {
    goal: string;
    twr: number;
    behavior: string;
    recommended: boolean;
    threshold: boolean;
}

const TWR_ROWS: TwrRow[] = [
    { goal: 'Absolute Max (Theoretical)', twr: 1.00, behavior: 'Hovers in place; cannot climb.', recommended: false, threshold: false },
    { goal: 'Minimum Safe Launch',        twr: 1.20, behavior: 'Slow, sluggish liftoff; highly vulnerable to wind.', recommended: false, threshold: true },
    { goal: 'Standard Rocket Ideal',      twr: 1.50, behavior: 'Fast, efficient liftoff; minimizes gravity losses.', recommended: true, threshold: false },
    { goal: 'High Performance',           twr: 2.00, behavior: 'Rapid acceleration; ideal for small model rockets.', recommended: false, threshold: false },
];

const G = 9.81;
const STEPS = 11;
const CENTER = 5;
const DEFAULT_BURN = 10;
const BURN_MIN = 5;
const BURN_MAX = 100;
const BURN_STEP = 5;

function computeStep(thrustN: number): number {
    return Math.max(10, Math.round((thrustN * 0.1) / 10) * 10);
}

function formatThrust(n: number): string {
    if (n >= 1000) return `${(n / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} kN`;
    return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} N`;
}

function formatMass(kg: number): string {
    return `${kg.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
}

function formatPropMass(kg: number): string {
    if (kg >= 1000) return `${(kg / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t`;
    return `${kg.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
}

export default function LiftOfMass({ engineDesignResult }: LiftOfMassProps) {
    const [sliderIndex, setSliderIndex] = useState(CENTER);
    const [burnTimeSec, setBurnTimeSec] = useState(DEFAULT_BURN);

    const baseThrustN = engineDesignResult?.engineInputs.targetThrust.value ?? null;

    const thrustValues = useMemo<number[] | null>(() => {
        if (baseThrustN === null) return null;
        const step = computeStep(baseThrustN);
        return Array.from({ length: STEPS }, (_, i) => baseThrustN + (i - CENTER) * step);
    }, [baseThrustN]);

    const selectedThrust = thrustValues ? thrustValues[sliderIndex] : null;

    if (!engineDesignResult || baseThrustN === null || !thrustValues || selectedThrust === null) {
        return (
            <div className="reference-page lom-root">
                <div className="eq-placeholder">
                    <p className="eq-placeholder-label">No Engine Designed</p>
                    <p className="eq-placeholder-hint">
                        Design your engine on the left panel first. Once you have a target thrust,
                        this tab will show how much total rocket mass your engine can lift.
                    </p>
                </div>
            </div>
        );
    }

    const minThrust = thrustValues[0];
    const maxThrust = thrustValues[STEPS - 1];

    // Mass flows (g/s → kg/s), scaled proportionally to selected thrust
    const opt = engineDesignResult.engineOutputs.mixtureRatio.optimum;
    const thrustRatio = selectedThrust / baseThrustN;
    const mDotOx    = (opt.oxidizerMassFlow.value / 1000) * thrustRatio;
    const mDotFuel  = (opt.fuelMassFlow.value    / 1000) * thrustRatio;
    const mDotTotal = (opt.totalMassFlow.value   / 1000) * thrustRatio;

    const mOxKg        = mDotOx    * burnTimeSec;
    const mFuelKg      = mDotFuel  * burnTimeSec;
    const mTotalPropKg = mDotTotal * burnTimeSec;

    return (
        <div className="reference-page lom-root">

            {/* Intro */}
            <div className="lom-intro">
                <p>
                    In aerospace engineering, rockets require a Thrust-to-Weight Ratio (TWR) between{' '}
                    <span className="lom-highlight">1.2</span> and <span className="lom-highlight">1.5</span> to
                    safely clear the launch tower and combat air resistance. The table below breaks down how much
                    total mass your engine can push under different performance goals.
                </p>
            </div>

            {/* Sliders — side by side */}
            <div className="lom-sliders-row">

                {/* Thrust slider */}
                <div className="lom-slider-section">
                    <div className="lom-slider-header">
                        <span className="lom-slider-label">Engine Thrust</span>
                        <button
                            className="lom-reset-btn"
                            onClick={() => setSliderIndex(CENTER)}
                            title="Reset to designed thrust"
                        >
                            &#8635; Reset
                        </button>
                    </div>

                    <div className="lom-slider-track-wrap">
                        <span className="lom-range-label lom-range-min">{formatThrust(minThrust)}</span>
                        <input
                            className="lom-slider"
                            type="range"
                            min={0}
                            max={STEPS - 1}
                            step={1}
                            value={sliderIndex}
                            onChange={e => setSliderIndex(Number(e.target.value))}
                        />
                        <span className="lom-range-label lom-range-max">{formatThrust(maxThrust)}</span>
                    </div>

                    <div className="lom-slider-current">
                        <span className="lom-current-value">{formatThrust(selectedThrust)}</span>
                        {sliderIndex !== CENTER && (
                            <span className="lom-current-delta">
                                {selectedThrust > baseThrustN ? '+' : ''}
                                {formatThrust(selectedThrust - baseThrustN)} from design
                            </span>
                        )}
                        {sliderIndex === CENTER && (
                            <span className="lom-current-delta lom-current-delta--base">designed thrust</span>
                        )}
                    </div>
                </div>

                {/* Burn time slider */}
                <div className="lom-slider-section">
                    <div className="lom-slider-header">
                        <span className="lom-slider-label">Burn Time</span>
                        <button
                            className="lom-reset-btn"
                            onClick={() => setBurnTimeSec(DEFAULT_BURN)}
                            title="Reset to default burn time"
                        >
                            &#8635; Reset
                        </button>
                    </div>

                    <div className="lom-slider-track-wrap">
                        <span className="lom-range-label lom-range-min">{BURN_MIN} s</span>
                        <input
                            className="lom-slider"
                            type="range"
                            min={BURN_MIN}
                            max={BURN_MAX}
                            step={BURN_STEP}
                            value={burnTimeSec}
                            onChange={e => setBurnTimeSec(Number(e.target.value))}
                        />
                        <span className="lom-range-label lom-range-max">{BURN_MAX} s</span>
                    </div>

                    <div className="lom-slider-current">
                        <span className="lom-current-value">{burnTimeSec} s</span>
                        {burnTimeSec !== DEFAULT_BURN && (
                            <span className="lom-current-delta">
                                {burnTimeSec > DEFAULT_BURN ? '+' : ''}{burnTimeSec - DEFAULT_BURN} s from default
                            </span>
                        )}
                        {burnTimeSec === DEFAULT_BURN && (
                            <span className="lom-current-delta lom-current-delta--base">default burn</span>
                        )}
                    </div>
                </div>

            </div>

            {/* TWR Table — desktop */}
            <div className="lom-table-wrap">
                <table className="lom-table">
                    <thead>
                        <tr>
                            <th>Performance Goal</th>
                            <th className="lom-col-center">Target TWR</th>
                            <th className="lom-col-center">Maximum Total Mass</th>
                            <th className="lom-col-center">Oxidizer ({burnTimeSec}s)</th>
                            <th className="lom-col-center">Fuel ({burnTimeSec}s)</th>
                            <th className="lom-col-center">Prop. of Mass</th>
                            <th>Flight Behavior</th>
                        </tr>
                    </thead>
                    <tbody>
                        {TWR_ROWS.map(row => {
                            const mass = selectedThrust / (row.twr * G);
                            const propFraction = (mTotalPropKg / mass) * 100;
                            return (
                                <tr
                                    key={row.twr}
                                    className={
                                        row.recommended
                                            ? 'lom-tr--recommended'
                                            : row.threshold
                                            ? 'lom-tr--threshold'
                                            : ''
                                    }
                                >
                                    <td className="lom-td-goal">
                                        {row.goal}
                                        {row.recommended && <span className="lom-badge-rec">IDEAL</span>}
                                    </td>
                                    <td className="lom-col-center lom-td-twr">{row.twr.toFixed(2)}</td>
                                    <td className="lom-col-center lom-td-mass">{formatMass(mass)}</td>
                                    <td className="lom-col-center lom-td-prop">{formatPropMass(mOxKg)}</td>
                                    <td className="lom-col-center lom-td-prop">{formatPropMass(mFuelKg)}</td>
                                    <td className="lom-col-center lom-td-prop-pct">{propFraction.toFixed(1)}%</td>
                                    <td className="lom-td-behavior">{row.behavior}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* TWR Cards — mobile */}
            <div className="lom-cards">
                {TWR_ROWS.map(row => {
                    const mass = selectedThrust / (row.twr * G);
                    const propFraction = (mTotalPropKg / mass) * 100;
                    return (
                        <div
                            key={row.twr}
                            className={`lom-card ${row.recommended ? 'lom-card--recommended' : ''} ${row.threshold ? 'lom-card--threshold' : ''}`}
                        >
                            <div className="lom-card-top">
                                <span className="lom-card-goal">{row.goal}</span>
                                {row.recommended && <span className="lom-badge-rec">IDEAL</span>}
                            </div>
                            <div className="lom-card-stats">
                                <div className="lom-card-stat">
                                    <span className="lom-card-stat-label">TWR</span>
                                    <span className="lom-card-stat-val">{row.twr.toFixed(2)}</span>
                                </div>
                                <div className="lom-card-stat">
                                    <span className="lom-card-stat-label">Max Mass</span>
                                    <span className="lom-card-stat-val lom-card-stat-val--mass">{formatMass(mass)}</span>
                                </div>
                                <div className="lom-card-stat">
                                    <span className="lom-card-stat-label">Oxidizer</span>
                                    <span className="lom-card-stat-val">{formatPropMass(mOxKg)}</span>
                                </div>
                                <div className="lom-card-stat">
                                    <span className="lom-card-stat-label">Fuel</span>
                                    <span className="lom-card-stat-val">{formatPropMass(mFuelKg)}</span>
                                </div>
                                <div className="lom-card-stat">
                                    <span className="lom-card-stat-label">Prop. %</span>
                                    <span className="lom-card-stat-val">{propFraction.toFixed(1)}%</span>
                                </div>
                            </div>
                            <p className="lom-card-behavior">{row.behavior}</p>
                        </div>
                    );
                })}
            </div>

            <p className="lom-footnote">
                * Assumes vertical launch at sea level. Mass&nbsp;=&nbsp;Thrust&nbsp;÷&nbsp;(TWR&nbsp;×&nbsp;{G}&nbsp;m/s²).
                Propellant masses scale with thrust adjustment. Prop.&nbsp;of&nbsp;Mass&nbsp;=&nbsp;propellant&nbsp;needed&nbsp;÷&nbsp;maximum&nbsp;total&nbsp;mass.
            </p>
        </div>
    );
}
