import { useEffect, useMemo } from 'react';
import { Tooltip } from '@mui/material';
import { type EngineDesignResult } from '../../services/engineDesignService';
import { type InjectorSweepRow } from '../../services/injectorSweepService';
import {
  MATERIALS,
  PRESSURANT_GASES,
  getPropellantDensity,
  barToPsi,
  sphereTankSizing,
  cylinderTankSizing,
  pressurantMassG,
  pressurantVolumeM3,
  type TankSizing,
} from './materials';
import PlumbingRightPanel, { type PressurantGasKey, type TankShape } from './PlumbingRightPanel';
import './plumbing.css';

interface PressureFedProps {
  engineDesignResult: EngineDesignResult | null;
  injectorSelectedRow: InjectorSweepRow | null;
  rightCollapsed: boolean;
  onRightToggle: () => void;

  gas: PressurantGasKey;
  onGasChange: (g: PressurantGasKey) => void;
  tankShape: TankShape;
  onTankShapeChange: (s: TankShape) => void;
  aspectRatio: number;
  onAspectRatioChange: (v: number) => void;
  oxMaterial: string;
  onOxMaterialChange: (m: string) => void;
  fuelMaterial: string;
  onFuelMaterialChange: (m: string) => void;
  pressurantMaterial: string;
  onPressurantMaterialChange: (m: string) => void;
  injectorDropPct: number;
  onInjectorDropPctChange: (v: number) => void;
  lineLossBar: number;
  onLineLossBarChange: (v: number) => void;
  ullageMarginBar: number;
  onUllageMarginBarChange: (v: number) => void;
  pressurantTankBar: number;
  onPressurantTankBarChange: (v: number) => void;
  burnTimeSec: number;
  onBurnTimeSecChange: (v: number) => void;
}

const FEASIBILITY_PC_LIMIT_BAR = 35;
const ULLAGE_FRACTION = 0.1;

// ── Valve symbol (bowtie) ──────────────────────────────────────────────────────
function ValveSymbol({ x, y, size = 14 }: { x: number; y: number; size?: number }) {
  const h = size;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <path className="plumb-valve" d={`M ${-h} ${-h} L ${h} ${h} L ${h} ${-h} L ${-h} ${h} Z`} />
    </g>
  );
}

// ── Info badge (small "i" circle with tooltip) ──────────────────────────────────
function InfoBadge({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <Tooltip title={text} placement="top" arrow>
      <g className="plumb-info-badge" transform={`translate(${x}, ${y})`}>
        <circle r="7" />
        <text textAnchor="middle" dominantBaseline="central">i</text>
      </g>
    </Tooltip>
  );
}

export default function PressureFed({
  engineDesignResult, injectorSelectedRow, rightCollapsed, onRightToggle,
  gas, onGasChange, tankShape, onTankShapeChange, aspectRatio, onAspectRatioChange,
  oxMaterial, onOxMaterialChange, fuelMaterial, onFuelMaterialChange, pressurantMaterial, onPressurantMaterialChange,
  injectorDropPct, onInjectorDropPctChange, lineLossBar, onLineLossBarChange,
  ullageMarginBar, onUllageMarginBarChange, pressurantTankBar, onPressurantTankBarChange,
  burnTimeSec, onBurnTimeSecChange,
}: PressureFedProps) {
  const injectorDropFromDesign = injectorSelectedRow != null;

  // Re-sync injector ΔP% from the selected injector design whenever it changes
  useEffect(() => {
    if (injectorSelectedRow) {
      onInjectorDropPctChange(injectorSelectedRow.dp_percentage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injectorSelectedRow]);

  const Pc = engineDesignResult?.engineInputs.chamberPressure.value ?? 0;

  const calc = useMemo(() => {
    if (!engineDesignResult) return null;

    const optimum = engineDesignResult.engineOutputs.mixtureRatio.optimum;
    const oxCode = engineDesignResult.engineInputs.propellants.oxidizer.code;
    const fuelCode = engineDesignResult.engineInputs.propellants.fuel.code;

    const deltaPInj = Pc * (injectorDropPct / 100);
    const tankPressureBar = Pc + deltaPInj + lineLossBar;
    const regulatorSetpointBar = tankPressureBar + ullageMarginBar;
    const pressurantValid = pressurantTankBar > regulatorSetpointBar;

    // Propellant masses consumed over the burn (kg)
    const mDotOxKgs = optimum.oxidizerMassFlow.value / 1000;
    const mDotFuelKgs = optimum.fuelMassFlow.value / 1000;
    const mOxKg = mDotOxKgs * burnTimeSec;
    const mFuelKg = mDotFuelKgs * burnTimeSec;

    // Propellant volumes -> tank internal volume (with 10% ullage headroom)
    const rhoOx = getPropellantDensity(oxCode);
    const rhoFuel = getPropellantDensity(fuelCode);
    const vOxLiquidM3 = mOxKg / rhoOx;
    const vFuelLiquidM3 = mFuelKg / rhoFuel;
    const vOxTankM3 = vOxLiquidM3 * (1 + ULLAGE_FRACTION);
    const vFuelTankM3 = vFuelLiquidM3 * (1 + ULLAGE_FRACTION);

    // Pressurant gas mass needed to fill ullage volumes at regulated tank pressure
    const vUllageM3 = vOxLiquidM3 * ULLAGE_FRACTION + vFuelLiquidM3 * ULLAGE_FRACTION;
    const gasInfo = PRESSURANT_GASES[gas];
    const pressurantGasMassG = pressurantMassG(vUllageM3, tankPressureBar, gasInfo);

    // Pressurant tank volume sized to hold that gas mass at its storage pressure
    const vPressurantTankM3 = pressurantVolumeM3(pressurantGasMassG, pressurantTankBar, gasInfo);

    const sizeTank = (volumeM3: number, pressureBar: number, materialKey: string): TankSizing => {
      const material = MATERIALS[materialKey];
      return tankShape === 'sphere'
        ? sphereTankSizing(volumeM3, pressureBar, material)
        : cylinderTankSizing(volumeM3, pressureBar, material, aspectRatio);
    };

    const ox = { ...sizeTank(vOxTankM3, tankPressureBar, oxMaterial), pressureBar: tankPressureBar };
    const fuel = { ...sizeTank(vFuelTankM3, tankPressureBar, fuelMaterial), pressureBar: tankPressureBar };
    const pressurant = { ...sizeTank(vPressurantTankM3, pressurantTankBar, pressurantMaterial), pressureBar: pressurantTankBar };

    return {
      deltaPInj,
      tankPressureBar,
      regulatorSetpointBar,
      pressurantValid,
      ox,
      fuel,
      pressurant,
      pressurantGasMassG,
    };
  }, [
    engineDesignResult, Pc, injectorDropPct, lineLossBar, ullageMarginBar, pressurantTankBar,
    burnTimeSec, gas, tankShape, aspectRatio, oxMaterial, fuelMaterial, pressurantMaterial,
  ]);

  if (!engineDesignResult || !calc) {
    return (
      <div className="plumb-page">
        <div className="plumb-eq-placeholder">
          <p className="plumb-eq-placeholder-label">No Engine Designed</p>
          <p className="plumb-eq-placeholder-hint">
            Design your engine on the left panel first. Once a chamber pressure is known,
            this tab will show the pressure-fed feed system schematic with required
            operating pressures and tank sizing for each component.
          </p>
        </div>
      </div>
    );
  }

  const showFeasibilityWarning = Pc > FEASIBILITY_PC_LIMIT_BAR;

  const legendItems: [string, number][] = [
    ['Pc (Chamber)', Pc],
    ['Tank Pressure', calc.tankPressureBar],
    ['Regulator Setpoint', calc.regulatorSetpointBar],
    ['Pressurant Tank', pressurantTankBar],
  ];

  // ── Tank shape helpers ──────────────────────────────────────────────────────
  // Each tank is defined by its center (cx, cy) and a nominal size (w < h, portrait).
  // Cylinder mode renders a vertical capsule (two domed end-caps of radius w/2,
  // straight sides in between); sphere mode renders a circle whose radius is half
  // the larger of w/h, so it still reaches the same connection points around its
  // perimeter. edge()/edgeX() return the outline coordinate at a given position so
  // pipes/valves always meet the tank shape.
  const renderTank = (cx: number, cy: number, w: number, h: number) => {
    if (tankShape === 'sphere') {
      const r = Math.max(w, h) / 2;
      return <circle className="plumb-tank" cx={cx} cy={cy} r={r} />;
    }
    const r = w / 2;
    const top = cy - h / 2 + r;
    const bottom = cy + h / 2 - r;
    return (
      <path
        className="plumb-tank"
        d={`M ${cx - r} ${top}
            A ${r} ${r} 0 0 1 ${cx + r} ${top}
            L ${cx + r} ${bottom}
            A ${r} ${r} 0 0 1 ${cx - r} ${bottom}
            Z`}
      />
    );
  };

  const tankEdgeY = (cx: number, cy: number, w: number, h: number, atX: number, side: 'top' | 'bottom') => {
    if (tankShape === 'sphere') {
      const r = Math.max(w, h) / 2;
      const dx = Math.max(-r, Math.min(r, atX - cx));
      const dy = Math.sqrt(Math.max(0, r * r - dx * dx));
      return side === 'top' ? cy - dy : cy + dy;
    }
    // Capsule: straight sides with domed (semicircular) caps of radius w/2
    const capR = w / 2;
    const straightTop = cy - h / 2 + capR;
    const straightBottom = cy + h / 2 - capR;
    const dx = Math.max(-capR, Math.min(capR, atX - cx));
    const domeReach = Math.sqrt(Math.max(0, capR * capR - dx * dx));
    return side === 'top' ? straightTop - domeReach : straightBottom + domeReach;
  };

  // edgeX: the x-coordinate of the tank's outline at a given y and horizontal side
  const tankEdgeX = (cx: number, cy: number, w: number, h: number, atY: number, side: 'left' | 'right') => {
    if (tankShape === 'sphere') {
      const r = Math.max(w, h) / 2;
      const dy = Math.max(-r, Math.min(r, atY - cy));
      const dx = Math.sqrt(Math.max(0, r * r - dy * dy));
      return side === 'left' ? cx - dx : cx + dx;
    }
    // Capsule: within the straight-side band the edge is a flat vertical line at cx ± w/2;
    // beyond the band (inside a domed cap) the edge curves inward toward the cap center.
    const capR = w / 2;
    const straightTop = cy - h / 2 + capR;
    const straightBottom = cy + h / 2 - capR;
    let domeCenterY: number | null = null;
    if (atY < straightTop) domeCenterY = straightTop;
    else if (atY > straightBottom) domeCenterY = straightBottom;
    if (domeCenterY === null) {
      return side === 'left' ? cx - capR : cx + capR;
    }
    const dy = Math.max(-capR, Math.min(capR, atY - domeCenterY));
    const dx = Math.sqrt(Math.max(0, capR * capR - dy * dy));
    return side === 'left' ? cx - dx : cx + dx;
  };

  // ── Tank centers / nominal sizes (portrait: h > w) ──────────────────────────
  const pressurantTankDef = { cx: 500, cy: 85, w: 90, h: 120 };
  const oxTankDef = { cx: 230, cy: 400, w: 120, h: 200 };
  const fuelTankDef = { cx: 770, cy: 400, w: 120, h: 200 };

  // ── Connection points (computed so pipes/valves always meet the tank outline) ──
  const pressurantBottomY = tankEdgeY(pressurantTankDef.cx, pressurantTankDef.cy, pressurantTankDef.w, pressurantTankDef.h, 500, 'bottom');
  const pressurantBadgeX = tankEdgeX(pressurantTankDef.cx, pressurantTankDef.cy, pressurantTankDef.w, pressurantTankDef.h, pressurantTankDef.cy - 30, 'right');
  const pressurantBadgeY = tankEdgeY(pressurantTankDef.cx, pressurantTankDef.cy, pressurantTankDef.w, pressurantTankDef.h, pressurantBadgeX, 'top');

  const oxTopY = tankEdgeY(oxTankDef.cx, oxTankDef.cy, oxTankDef.w, oxTankDef.h, 230, 'top');
  const oxBottomDrainX = oxTankDef.cx - 40;
  const oxBottomDrainY = tankEdgeY(oxTankDef.cx, oxTankDef.cy, oxTankDef.w, oxTankDef.h, oxBottomDrainX, 'bottom');
  const oxBottomValveX = oxTankDef.cx + 30;
  const oxBottomValveY = tankEdgeY(oxTankDef.cx, oxTankDef.cy, oxTankDef.w, oxTankDef.h, oxBottomValveX, 'bottom');
  const oxRightY = oxTankDef.cy - 30;
  const oxRightX = tankEdgeX(oxTankDef.cx, oxTankDef.cy, oxTankDef.w, oxTankDef.h, oxRightY, 'right');
  const oxVentX = tankEdgeX(oxTankDef.cx, oxTankDef.cy, oxTankDef.w, oxTankDef.h, oxTankDef.cy - 70, 'left');
  const oxVentTopY = tankEdgeY(oxTankDef.cx, oxTankDef.cy, oxTankDef.w, oxTankDef.h, oxVentX, 'top');
  const oxBadgeX = tankEdgeX(oxTankDef.cx, oxTankDef.cy, oxTankDef.w, oxTankDef.h, oxTankDef.cy - 85, 'right');
  const oxBadgeY = tankEdgeY(oxTankDef.cx, oxTankDef.cy, oxTankDef.w, oxTankDef.h, oxBadgeX, 'top');

  const fuelTopY = tankEdgeY(fuelTankDef.cx, fuelTankDef.cy, fuelTankDef.w, fuelTankDef.h, 770, 'top');
  const fuelBottomDrainX = fuelTankDef.cx + 40;
  const fuelBottomDrainY = tankEdgeY(fuelTankDef.cx, fuelTankDef.cy, fuelTankDef.w, fuelTankDef.h, fuelBottomDrainX, 'bottom');
  const fuelBottomValveX = fuelTankDef.cx - 30;
  const fuelBottomValveY = tankEdgeY(fuelTankDef.cx, fuelTankDef.cy, fuelTankDef.w, fuelTankDef.h, fuelBottomValveX, 'bottom');
  const fuelLeftY = fuelTankDef.cy - 30;
  const fuelLeftX = tankEdgeX(fuelTankDef.cx, fuelTankDef.cy, fuelTankDef.w, fuelTankDef.h, fuelLeftY, 'left');
  const fuelVentX = tankEdgeX(fuelTankDef.cx, fuelTankDef.cy, fuelTankDef.w, fuelTankDef.h, fuelTankDef.cy - 70, 'right');
  const fuelVentTopY = tankEdgeY(fuelTankDef.cx, fuelTankDef.cy, fuelTankDef.w, fuelTankDef.h, fuelVentX, 'top');
  const fuelBadgeX = tankEdgeX(fuelTankDef.cx, fuelTankDef.cy, fuelTankDef.w, fuelTankDef.h, fuelTankDef.cy - 85, 'left');
  const fuelBadgeY = tankEdgeY(fuelTankDef.cx, fuelTankDef.cy, fuelTankDef.w, fuelTankDef.h, fuelBadgeX, 'top');

  return (
    <div className="plumb-tab-layout">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {showFeasibilityWarning && (
          <div className="plumb-feasibility-warning">
            Chamber pressure ({Pc.toFixed(1)} bar) is high for a pressure-fed system — required tank pressure
            and wall mass may be impractical relative to thrust. Pump-fed systems are typical above ~30-40 bar.
          </div>
        )}

        <div className="plumb-diagram">
          <svg className="plumb-svg" viewBox="0 -15 1000 700" preserveAspectRatio="xMidYMid meet">
            {/* ── Pressurant tank ── */}
            {renderTank(pressurantTankDef.cx, pressurantTankDef.cy, pressurantTankDef.w, pressurantTankDef.h)}
            <text className="plumb-component-label" x="500" y="80">PRESSURANT</text>
            <text className="plumb-component-label" x="500" y="95">TANK</text>
            <text className="plumb-component-sublabel" x="500" y="105" textAnchor="middle">{PRESSURANT_GASES[gas].name}</text>
            <text className="plumb-pressure-label" x="570" y="85">{pressurantTankBar.toFixed(1)} bar</text>
            <InfoBadge x={pressurantBadgeX} y={pressurantBadgeY} text="Pressurant Tank: Stores inert gas (N2/He) at high pressure to pressurize propellant tanks." />

            {/* Pressurant -> Regulator */}
            <path className="plumb-pipe" d={`M 500 ${pressurantBottomY} L 500 155`} />

            {/* ── Regulator ── */}
            <path className="plumb-component" d="M 500 155 L 535 185 L 500 215 L 465 185 Z" />
            <text className="plumb-component-label" x="500" y="190">REG</text>
            <text className="plumb-pressure-label" x="555" y="189">{calc.regulatorSetpointBar.toFixed(1)} bar</text>
            <InfoBadge x={450} y={185} text="Regulator: Reduces pressurant tank pressure down to the propellant tank operating pressure." />

            {/* Regulator -> split */}
            <path className="plumb-pipe" d="M 500 215 L 500 240" />
            <path className="plumb-pipe" d="M 230 240 L 770 240" />
            <path className="plumb-pipe" d="M 230 240 L 230 265" />
            <path className="plumb-pipe" d="M 770 240 L 770 265" />

            {/* ── Check valves (ox / fuel branches) ── */}
            <ValveSymbol x={230} y={280} />
            <text className="plumb-component-sublabel" x="170" y="284">CHECK VALVE</text>
            <InfoBadge x={252} y={290} text="Check Valve: Allows gas flow in one direction only — prevents propellant vapor from migrating back into the pressurant system." />
            <ValveSymbol x={770} y={280} />
            <text className="plumb-component-sublabel" x="830" y="284">CHECK VALVE</text>
            <InfoBadge x={792} y={290} text="Check Valve: Allows gas flow in one direction only — prevents propellant vapor from migrating back into the pressurant system." />

            <path className="plumb-pipe" d={`M 230 294 L 230 ${oxTopY}`} />
            <path className="plumb-pipe" d={`M 770 294 L 770 ${fuelTopY}`} />

            {/* ── Oxidizer tank ── */}
            {renderTank(oxTankDef.cx, oxTankDef.cy, oxTankDef.w, oxTankDef.h)}
            <text className="plumb-component-label" x="230" y="392">OXIDIZER</text>
            <text className="plumb-component-label" x="230" y="406">TANK</text>
            <text className="plumb-component-sublabel" x="230" y="424">{engineDesignResult.engineInputs.propellants.oxidizer.code}</text>
            <text className="plumb-pressure-label" x="230" y="442" textAnchor="middle">{calc.tankPressureBar.toFixed(1)} bar</text>
            <InfoBadge x={oxBadgeX} y={oxBadgeY} text="Oxidizer Tank: Stores propellant at the pressure needed to feed the injector against chamber pressure." />

            {/* ── Fuel tank ── */}
            {renderTank(fuelTankDef.cx, fuelTankDef.cy, fuelTankDef.w, fuelTankDef.h)}
            <text className="plumb-component-label" x="770" y="392">FUEL</text>
            <text className="plumb-component-label" x="770" y="406">TANK</text>
            <text className="plumb-component-sublabel" x="770" y="424">{engineDesignResult.engineInputs.propellants.fuel.code}</text>
            <text className="plumb-pressure-label" x="770" y="442" textAnchor="middle">{calc.tankPressureBar.toFixed(1)} bar</text>
            <InfoBadge x={fuelBadgeX} y={fuelBadgeY} text="Fuel Tank: Stores propellant at the pressure needed to feed the injector against chamber pressure." />

            {/* Vent valves on top of tanks */}
            <path className="plumb-pipe" d={`M ${oxVentX} ${oxVentTopY} L 110 ${oxVentTopY}`} />
            <ValveSymbol x={110} y={oxVentTopY} size={10} />
            <text className="plumb-component-sublabel" x="110" y={oxVentTopY - 17}>VENT</text>
            <InfoBadge x={128} y={oxVentTopY - 4} text="Vent Valve: Releases gas to relieve excess tank pressure during ground operations or venting sequences." />
            <path className="plumb-pipe" d={`M ${fuelVentX} ${fuelVentTopY} L 890 ${fuelVentTopY}`} />
            <ValveSymbol x={890} y={fuelVentTopY} size={10} />
            <text className="plumb-component-sublabel" x="890" y={fuelVentTopY - 17}>VENT</text>
            <InfoBadge x={872} y={fuelVentTopY - 4} text="Vent Valve: Releases gas to relieve excess tank pressure during ground operations or venting sequences." />

            {/* Fill/drain valves below tanks */}
            <path className="plumb-pipe" d={`M ${oxBottomDrainX} ${oxBottomDrainY} L ${oxBottomDrainX} 540`} />
            <ValveSymbol x={oxBottomDrainX} y={555} size={10} />
            <text className="plumb-component-sublabel" x={oxBottomDrainX} y="575">FILL/DRAIN</text>
            <InfoBadge x={oxBottomDrainX - 20} y={555} text="Fill/Drain Valve: Used to load propellant before flight and drain it if needed." />

            <path className="plumb-pipe" d={`M ${fuelBottomDrainX} ${fuelBottomDrainY} L ${fuelBottomDrainX} 540`} />
            <ValveSymbol x={fuelBottomDrainX} y={555} size={10} />
            <text className="plumb-component-sublabel" x={fuelBottomDrainX} y="575">FILL/DRAIN</text>
            <InfoBadge x={fuelBottomDrainX + 20} y={555} text="Fill/Drain Valve: Used to load propellant before flight and drain it if needed." />

            {/* Relief valves beside tanks */}
            <path className="plumb-pipe" d={`M ${oxRightX} ${oxRightY} L 345 ${oxRightY}`} />
            <ValveSymbol x={345} y={oxRightY} size={10} />
            <text className="plumb-component-sublabel" x="345" y={oxRightY - 15}>RELIEF</text>
            <InfoBadge x={345 + 20} y={oxRightY + 14} text="Relief Valve: Opens automatically if tank pressure exceeds a safe limit, protecting against over-pressurization." />

            <path className="plumb-pipe" d={`M ${fuelLeftX} ${fuelLeftY} L 655 ${fuelLeftY}`} />
            <ValveSymbol x={655} y={fuelLeftY} size={10} />
            <text className="plumb-component-sublabel" x="655" y={fuelLeftY - 15}>RELIEF</text>
            <InfoBadge x={655 - 20} y={fuelLeftY + 14} text="Relief Valve: Opens automatically if tank pressure exceeds a safe limit, protecting against over-pressurization." />

            {/* Tanks -> main valves */}
            <path className="plumb-pipe" d={`M ${oxBottomValveX} ${oxBottomValveY} L ${oxBottomValveX} 545`} />
            <path className="plumb-pipe" d={`M ${fuelBottomValveX} ${fuelBottomValveY} L ${fuelBottomValveX} 545`} />
            <ValveSymbol x={oxBottomValveX} y={560} />
            <text className="plumb-component-sublabel" x={oxBottomValveX} y="590">MAIN VALVE</text>
            <InfoBadge x={oxBottomValveX + 22} y={560} text="Main Valve: Controls propellant flow from the tank to the engine — opens at engine start." />
            <ValveSymbol x={fuelBottomValveX} y={560} />
            <text className="plumb-component-sublabel" x={fuelBottomValveX} y="590">MAIN VALVE</text>
            <InfoBadge x={fuelBottomValveX - 22} y={560} text="Main Valve: Controls propellant flow from the tank to the engine — opens at engine start." />

            {/* Main valves -> injector/chamber */}
            <path className="plumb-pipe" d={`M ${oxBottomValveX} 574 L ${oxBottomValveX} 600`} />
            <path className="plumb-pipe" d={`M ${fuelBottomValveX} 574 L ${fuelBottomValveX} 600`} />
            <path className="plumb-pipe" d={`M ${oxBottomValveX} 600 L ${fuelBottomValveX} 600`} />
            <path className="plumb-pipe" d="M 500 600 L 500 608" />

            {/* ── Injector / Chamber + nozzle silhouette ── */}
            {/* Downward profile: chamber (top, wide) -> converging section -> throat -> diverging nozzle (bottom) */}
            <path
              className="plumb-component"
              d="M 455 608
                 L 455 630
                 L 488 648
                 L 466 668
                 L 534 668
                 L 512 648
                 L 545 630
                 L 545 608
                 Z"
            />
            <text className="plumb-component-label" x="500" y="598">Engine</text>
            <text className="plumb-pressure-label" x="558" y="660">{Pc.toFixed(1)} bar</text>
          </svg>

          <div className="plumb-legend">
            {legendItems.map(([label, bar]) => (
              <div className="plumb-legend-row" key={label}>
                <span className="plumb-legend-label">{label}:</span>
                <span className="plumb-legend-value">{bar.toFixed(1)} bar</span>
                <span className="plumb-legend-psi">({barToPsi(bar).toFixed(1)} psi)</span>
              </div>
            ))}
          </div>

          <div className="plumb-results-panel">
            <div className="plumb-result-group">
              <div className="plumb-result-group-title">Oxidizer Tank</div>
              <div className="plumb-result-row"><span>Pressure</span><span>{calc.ox.pressureBar.toFixed(1)} bar</span></div>
              <div className="plumb-result-row"><span>Wall Thickness</span><span>{(calc.ox.thicknessM * 1000).toFixed(2)} mm</span></div>
              <div className="plumb-result-row"><span>Mass</span><span>{calc.ox.massKg.toFixed(2)} kg</span></div>
            </div>

            <div className="plumb-result-group">
              <div className="plumb-result-group-title">Fuel Tank</div>
              <div className="plumb-result-row"><span>Pressure</span><span>{calc.fuel.pressureBar.toFixed(1)} bar</span></div>
              <div className="plumb-result-row"><span>Wall Thickness</span><span>{(calc.fuel.thicknessM * 1000).toFixed(2)} mm</span></div>
              <div className="plumb-result-row"><span>Mass</span><span>{calc.fuel.massKg.toFixed(2)} kg</span></div>
            </div>

            <div className="plumb-result-group">
              <div className="plumb-result-group-title">Pressurant Tank</div>
              <div className="plumb-result-row"><span>Pressure</span><span>{calc.pressurant.pressureBar.toFixed(1)} bar</span></div>
              <div className="plumb-result-row"><span>Wall Thickness</span><span>{(calc.pressurant.thicknessM * 1000).toFixed(2)} mm</span></div>
              <div className="plumb-result-row"><span>Mass</span><span>{calc.pressurant.massKg.toFixed(2)} kg</span></div>
              <div className="plumb-result-row"><span>Gas Mass</span><span>{calc.pressurantGasMassG.toFixed(1)} g</span></div>
            </div>
          </div>
        </div>
      </div>

      <PlumbingRightPanel
        collapsed={rightCollapsed}
        onToggle={onRightToggle}
        gas={gas}
        onGasChange={onGasChange}
        tankShape={tankShape}
        onTankShapeChange={onTankShapeChange}
        aspectRatio={aspectRatio}
        onAspectRatioChange={onAspectRatioChange}
        oxMaterial={oxMaterial}
        onOxMaterialChange={onOxMaterialChange}
        fuelMaterial={fuelMaterial}
        onFuelMaterialChange={onFuelMaterialChange}
        pressurantMaterial={pressurantMaterial}
        onPressurantMaterialChange={onPressurantMaterialChange}
        injectorDropPct={injectorDropPct}
        onInjectorDropPctChange={onInjectorDropPctChange}
        injectorDropFromDesign={injectorDropFromDesign}
        lineLossBar={lineLossBar}
        onLineLossBarChange={onLineLossBarChange}
        ullageMarginBar={ullageMarginBar}
        onUllageMarginBarChange={onUllageMarginBarChange}
        pressurantTankBar={pressurantTankBar}
        onPressurantTankBarChange={onPressurantTankBarChange}
        burnTimeSec={burnTimeSec}
        onBurnTimeSecChange={onBurnTimeSecChange}
        results={calc}
      />
    </div>
  );
}
