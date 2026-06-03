import { Tooltip } from '@mui/material';
import { type EngineDesignResult, type SpeciesEntry } from '../../services/engineDesignService';
import './CombustionAnalysis.css';

// ── Species knowledge base ───────────────────────────────────────────────────

type SpeciesCategory = 'complete' | 'incomplete' | 'radical';

interface SpeciesHint {
  category: SpeciesCategory;
  label: string;
  hint: string;
}

const SPECIES_HINTS: Record<string, SpeciesHint> = {
  'H2O':  { category: 'complete',   label: 'H₂O',  hint: 'Complete oxidation of hydrogen — ideal product, releases maximum energy' },
  'CO2':  { category: 'complete',   label: 'CO₂',  hint: 'Complete oxidation of carbon — desired for carbon-based fuels' },
  'N2':   { category: 'complete',   label: 'N₂',   hint: 'Inert diluent — passes through unchanged, contributes only thermal mass' },
  'HCl':  { category: 'complete',   label: 'HCl',       hint: 'Complete chlorine product — expected with ammonium perchlorate (AP) propellants' },
  'HF':   { category: 'complete',   label: 'HF',        hint: 'Complete fluorine product — expected with fluorine-based oxidizers' },
  'CO':   { category: 'incomplete', label: 'CO',        hint: 'Incomplete combustion — carbon not fully oxidized, energy stranded in exhaust' },
  'H2':   { category: 'incomplete', label: 'H₂',   hint: 'Excess/unburned hydrogen — fuel-rich signature, some chemical energy unreleased' },
  'O2':   { category: 'incomplete', label: 'O₂',   hint: 'Excess unreacted oxidizer — oxidizer-rich mixture, slightly lowers Isp' },
  'C':    { category: 'incomplete', label: 'C',         hint: 'Free carbon (soot) — severe incomplete combustion or extreme fuel-richness' },
  'OH':   { category: 'radical',    label: 'OH',        hint: 'Hydroxyl radical — high-temp dissociation; recombines in nozzle, partially recovers Isp' },
  'O':    { category: 'radical',    label: 'O',         hint: 'Atomic oxygen — very high Tc (>3000 K) dissociation indicator' },
  'H':    { category: 'radical',    label: 'H',         hint: 'Atomic hydrogen — H₂ dissociation at high Tc; recombination recovers some Isp' },
  'NO':   { category: 'radical',    label: 'NO',        hint: 'Nitric oxide — N₂ dissociation at high Tc; small Isp penalty' },
  'NO2':  { category: 'radical',    label: 'NO₂',  hint: 'Nitrogen dioxide radical — secondary nitrogen oxidation at very high temperatures' },
  'N':    { category: 'radical',    label: 'N',         hint: 'Atomic nitrogen — extreme-temperature dissociation, rare below 4000 K' },
};

const CATEGORY_COLORS: Record<SpeciesCategory, string> = {
  complete:   '#4fc3f7',
  incomplete: '#ffb300',
  radical:    '#ef5350',
};

const COMPLETE_SPECIES   = new Set(['H2O', 'CO2', 'N2', 'HCl', 'HF']);
const INCOMPLETE_SPECIES = new Set(['CO', 'H2', 'C', 'O2']);

function getHint(key: string): SpeciesHint {
  return SPECIES_HINTS[key] ?? { category: 'radical', label: key, hint: 'Minor combustion species — present at trace levels' };
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SpeciesRow({ entry, maxFraction }: { entry: SpeciesEntry; maxFraction: number }) {
  const hint = getHint(entry.species);
  const color = CATEGORY_COLORS[hint.category];
  const barPct = maxFraction > 0 ? (entry.massFraction / maxFraction) * 100 : 0;
  const pct = (entry.massFraction * 100).toFixed(1);

  return (
    <div className="ca-species-row">
      <div className="ca-species-header">
        <Tooltip title={hint.hint} placement="right" arrow>
          <span className="ca-species-name" style={{ color }}>{hint.label}</span>
        </Tooltip>
        <div className="ca-bar-wrap">
          <div
            className="ca-bar-fill"
            style={{ width: `${barPct}%`, backgroundColor: color }}
          />
        </div>
        <span className="ca-species-pct">{pct}%</span>
      </div>
    </div>
  );
}

function CombustionQualityPanel({ species }: { species: SpeciesEntry[] }) {
  let complete = 0, incomplete = 0;
  for (const s of species) {
    if (COMPLETE_SPECIES.has(s.species))        complete   += s.massFraction;
    else if (INCOMPLETE_SPECIES.has(s.species)) incomplete += s.massFraction;
  }
  const radical = Math.max(0, 1 - complete - incomplete);

  const fmtPct = (v: number) => (v * 100).toFixed(1) + '%';

  return (
    <div className="ca-quality">
      <div className="ca-quality-bar">
        <div className="ca-quality-seg ca-quality-seg--complete"  style={{ width: `${complete * 100}%` }} />
        <div className="ca-quality-seg ca-quality-seg--incomplete" style={{ width: `${incomplete * 100}%` }} />
        <div className="ca-quality-seg ca-quality-seg--radical"   style={{ width: `${radical * 100}%` }} />
      </div>
      <div className="ca-quality-legend">
        <span className="ca-ql-item ca-ql-item--complete">
          <span className="ca-ql-dot" style={{ background: CATEGORY_COLORS.complete }} />
          Complete {fmtPct(complete)}
        </span>
        <span className="ca-ql-item ca-ql-item--incomplete">
          <span className="ca-ql-dot" style={{ background: CATEGORY_COLORS.incomplete }} />
          Incomplete {fmtPct(incomplete)}
        </span>
        <span className="ca-ql-item ca-ql-item--radical">
          <span className="ca-ql-dot" style={{ background: CATEGORY_COLORS.radical }} />
          Radicals {fmtPct(radical)}
        </span>
      </div>
      <p className="ca-quality-note">
        Higher complete fraction = more energy released from combustion. Dissociation radicals
        partially recover energy as they recombine in the nozzle — their Isp impact is smaller
        than their mass fraction suggests. Incomplete combustion (CO, H₂) represents real energy loss.
      </p>
    </div>
  );
}

function ChamberGeometryPanel({ opt }: { opt: EngineDesignResult['engineOutputs']['mixtureRatio']['optimum'] }) {
  const lStar  = opt.characteristicLength.value;
  const range  = opt.lStarRange;
  const lCyl   = opt.cylindricalLength.value;
  const cr     = opt.contractionRatio.value;
  const inRange = lStar >= range.min && lStar <= range.max;

  return (
    <div className="ca-geom">
      <div className="ca-geom-row">
        <span className="ca-geom-label">L* (Characteristic Length)</span>
        <span className="ca-geom-value">{lStar.toFixed(3)} m</span>
        <span className={`ca-geom-badge ${inRange ? 'ca-geom-badge--ok' : 'ca-geom-badge--warn'}`}>
          {inRange ? 'In range' : 'Out of range'}
        </span>
      </div>
      <div className="ca-geom-subtext">
        Recommended for this propellant pair: {range.min} – {range.max} m
      </div>
      <div className="ca-geom-row" style={{ marginTop: 10 }}>
        <span className="ca-geom-label">Contraction Ratio (CR)</span>
        <span className="ca-geom-value">{cr.toFixed(2)}</span>
      </div>
      <div className="ca-geom-row" style={{ marginTop: 4 }}>
        <span className="ca-geom-label">Cylindrical Chamber Length</span>
        <span className="ca-geom-value">{lCyl.toFixed(1)} mm</span>
      </div>
      <p className="ca-geom-explainer">
        L* determines gas residence time in the chamber. CR sets chamber diameter relative to the
        throat. Together they determine cylindrical chamber length — a shorter Lc_cyl means more
        volume is in the convergent cone.
      </p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  engineDesignResult: EngineDesignResult | null;
}

export default function CombustionAnalysis({ engineDesignResult }: Props) {
  if (!engineDesignResult) {
    return (
      <div className="ca-root ca-root--empty">
        <span className="ca-empty-text">Run a design to see combustion analysis.</span>
      </div>
    );
  }

  const inputs  = engineDesignResult.engineInputs;
  const opt     = engineDesignResult.engineOutputs.mixtureRatio.optimum;
  const species = opt.speciesComposition ?? [];
  const maxFraction = species.length > 0 ? Math.max(...species.map(s => s.massFraction)) : 1;

  const oxName   = inputs.propellants.oxidizer.name;
  const fuelName = inputs.propellants.fuel.name;

  return (
    <div className="ca-root">
      {/* Header */}
      <div className="ca-header">
        <div className="ca-header-propellants">
          <span className="ca-ox-name">{oxName}</span>
          <span className="ca-slash"> / </span>
          <span className="ca-fuel-name">{fuelName}</span>
        </div>
        <div className="ca-header-meta">
          <span>O/F = {opt.mixtureRatio.value.toFixed(3)}</span>
          <span className="ca-sep">|</span>
          <span>Tc = {opt.chamberTemperature.value.toFixed(0)} K</span>
          <span className="ca-sep">|</span>
          <span>Pc = {inputs.chamberPressure.value.toFixed(1)} bar</span>
        </div>
      </div>

      {/* Body */}
      <div className="ca-body">
        {/* Left — species chart */}
        <div className="ca-section ca-section--species">
          <div className="ca-section-title">COMBUSTION PRODUCTS</div>
          <div className="ca-legend">
            <span className="ca-legend-item"><span className="ca-legend-dot" style={{ background: CATEGORY_COLORS.complete }} /> Complete Products</span>
            <span className="ca-legend-item"><span className="ca-legend-dot" style={{ background: CATEGORY_COLORS.incomplete }} /> Incomplete Combustion</span>
            <span className="ca-legend-item"><span className="ca-legend-dot" style={{ background: CATEGORY_COLORS.radical }} /> Dissociation Radicals</span>
          </div>
          {species.length === 0 ? (
            <div className="ca-no-species">No species data returned by CEA for this propellant pair.</div>
          ) : (
            <div className="ca-species-list">
              {species.map(entry => (
                <SpeciesRow key={entry.species} entry={entry} maxFraction={maxFraction} />
              ))}
            </div>
          )}
        </div>

        {/* Right — quality + geometry */}
        <div className="ca-section ca-section--quality">
          <div className="ca-section-title">COMBUSTION QUALITY</div>
          <CombustionQualityPanel species={species} />

          <div className="ca-section-title" style={{ marginTop: 20 }}>CHAMBER GEOMETRY</div>
          <ChamberGeometryPanel opt={opt} />
        </div>
      </div>
    </div>
  );
}
