# RPA vs. Current App — Feature Gap Analysis (Pressure-Fed Focus)

## Context

The current application is a web-based rocket engine design tool (React + Python/Flask + RocketCEA). This document compares it against **Rocket Propulsion Analysis (RPA)** by RP Software+Engineering UG — a professional desktop tool for liquid-propellant engine design — focusing on features relevant to a **pressure-fed engine system**, ordered by complexity.

---

## What the Current App Already Has (vs. RPA)

| Feature | Current App | RPA |
|---|---|---|
| CEA-based thermochemistry | ✅ (RocketCEA) | ✅ |
| Mixture ratio sweep & optimization | ✅ | ✅ |
| Isp, C*, Cf, Tc, γ outputs | ✅ | ✅ |
| Bell & conical nozzle contours | ✅ | ✅ |
| Isentropic flow profile (Mach, P, T, V) | ✅ | ✅ |
| Interactive canvas nozzle visualization | ✅ (pan/zoom, heatmap) | Limited |
| Exhaust plume + shock diamonds | ✅ | ❌ |
| Flow particle animation | ✅ | ❌ |
| Export/import engine JSON | ✅ | ✅ |
| Multiple propellant combinations | ✅ (15 fuels, 11 oxidizers) | ✅ |
| Rao optimal nozzle contour | ✅ | ✅ |

---

## Missing Features — Ordered by Complexity (Pressure-Fed Relevant)

---

### 1. Full CEA Parameter Output Table
**Complexity**: Low | **Estimate**: 1–2 weeks

**What RPA does**: Outputs ~150 parameters at each nozzle station (chamber, throat, exit) — entropy, enthalpy, density, viscosity, conductivity, Prandtl number, frozen vs. equilibrium Isp, molecular weight, etc.

**Current gap**: RocketCEA already returns most of these; they are not surfaced in the UI.

**Implementation**: Add a detailed results table in the UI (new tab or expandable panel). Backend already has the data — just needs to pass it through.

**No canvas visualization needed** — a tabular view suits this data.

**Value for pressure-fed**: High. Gives designers the full picture for propellant selection and chamber design.

---

### 2. Equations / Derivation Walkthrough Tab
**Complexity**: Low | **Estimate**: 1–2 weeks

**Current gap**: The "CALCULATED STEPS & EQUATIONS" tab exists but is empty.

**Implementation**: Render the derivation chain (CEA outputs → throat area → contour → expansion ratio → Isp) with MathJax LaTeX equations. Values from the current design fill in the variables so equations show actual numbers.

**No canvas visualization needed** — rendered math in the tab.

**Value for pressure-fed**: High (educational, validation).

---

### 3. Bartz Heat Flux Distribution
**Complexity**: Medium | **Estimate**: 2–3 weeks

**What RPA does**: Plots gas-side convective heat flux (W/m²) along the entire nozzle axis — peaks sharply at the throat.

**How it works**: Bartz equation uses local gas properties (already computed in the isentropic flow profile — Mach, T, P, viscosity, Cp, Prandtl number at each station) + nozzle radius at each station (already available).

**Canvas visualization**: The heat flux curve is drawn as a separate **plot panel below or beside the nozzle contour** on the canvas — x-axis is axial position (same scale as nozzle), y-axis is heat flux (W/m²). The nozzle wall itself can be color-coded by heat flux as a secondary heatmap layer (in addition to the existing Mach/P/T/V heatmap options).

**Value for pressure-fed**: Very high — tells you where the chamber wall is hottest and whether it needs cooling.

---

### 4. Film Cooling — Interactive Simulation
**Complexity**: Medium | **Estimate**: 2–4 weeks

**What RPA does**: Estimates the reduction in effective wall heat flux when a fraction of fuel is injected along the wall as a protective film.

**How it works**: Semi-empirical correlation (Mickley-Rosenow or Stechman). Film effectiveness depends on:
- **Film mass fraction** (% of total fuel flow diverted to film — user adjustable input, typically 5–20%)
- Blowing ratio and downstream distance from injection point
- Local gas properties (already available from isentropic flow)

**Interactive simulation**: User drags a slider for film fraction (0–30%) and selects injection location (usually near injector face or throat). The heat flux plot (from Feature 3) **updates in real time**, showing:
- Original heat flux curve (grey reference)
- Reduced heat flux with film (colored overlay)
- Film effectiveness decay along the wall

**Canvas visualization**: The updated heat flux curve overlays on the same plot panel as Feature 3.

**Note on propellant coverage**: Film cooling correlations work with any fuel. The required inputs (gas temperature, density, velocity) are already computed. Fuel-specific physical properties (viscosity, specific heat) are needed for the blowing ratio — these need to be tabulated for each of the 15 supported fuels. Common fuels (RP-1, LH2, CH4, Ethanol) have well-documented properties; more exotic ones (MMH, UDMH) have sparse data and may need conservative estimates.

**Value for pressure-fed**: High — many pressure-fed engines use film cooling as the primary (or only) thermal protection.

---

### 5. Injector Sizing
**Complexity**: Medium-High | **Estimate**: 4–6 weeks

**What RPA does**: RPA does not include injector design. This would be an advantage over RPA.

**Why it matters for pressure-fed**: Injector pressure drop is a **critical design constraint** in pressure-fed systems — it directly determines tank pressure requirements and thus tank mass. Typical target: injector ΔP = 15–20% of chamber pressure.

**What to implement**:
- **Element type selection**: Impinging doublet/triplet (most common for pressure-fed), coaxial, showerhead
- **Inputs**: injection velocity, orifice diameter, number of elements, propellant density and viscosity
- **Outputs**: pressure drop (ΔP), injection velocity, Cd (discharge coefficient), total orifice area, element count
- **Atomization quality indicator**: Based on injection velocity and element spacing (empirical Rupe correlation for mixing efficiency)

**Canvas visualization**: A schematic injector face diagram (circle with element pattern dots) in a new panel or tab — not on the nozzle canvas.

**Value for pressure-fed**: Very high — injector sizing is one of the first things designed in a pressure-fed system.

---

### 6. Regenerative Cooling Channel Analysis — ✅ IMPLEMENTED
**Complexity**: High | **Estimate**: 6–10 weeks

**What RPA does**: Models coolant channels machined around the nozzle wall; calculates whether the wall survives thermally and what the coolant pressure drop is.

**How it works**: Iterative solver coupling gas-side heat flux (from Feature 3) with coolant-side heat transfer. Inputs:
- Channel geometry: number of channels, width, height, fin thickness, wall thickness
- Coolant = the fuel propellant (set by user's fuel selection)
- Coolant inlet conditions: temperature and pressure (for pressure-fed: tank pressure minus plumbing losses)

**Propellant coverage**: Regen cooling is **only practical for fuels with good heat-absorbing capacity**. Among the 15 supported fuels:
- **Well-suited**: LH2, RP-1, CH4, Ethanol, GH2 — all have documented cooling properties
- **Marginal / limited data**: MMH, UDMH, A50, N2H4 — can cool at low heat loads; property tables exist but are sparse
- **Unsuitable**: AP (solid oxidizer — not applicable), GCH4 at high pressure (limited data)
- The UI should warn when the selected fuel has limited cooling property data

**Canvas visualization**:
- The existing heat flux plot (Feature 3) gains two additional curves: **hot wall temperature** and **cold wall temperature** along the axis
- A color-coded cross-section diagram of a single channel (in a panel or tab) showing wall layers and temperatures
- User changes channel geometry sliders → curves update

**Value for pressure-fed**: High if the engine is high-thrust/high-Pc. For small/low-Pc pressure-fed engines, film cooling (Feature 4) may be sufficient. Implement after heat flux and film cooling are working.

---

### 7. MOC / Rao Optimal Nozzle Contour — ✅ IMPLEMENTED
**Complexity**: Medium | **Estimate**: 3–5 weeks

**What RPA does**: Generates a Rao/Thrust-Optimized Parabolic (TOP) nozzle contour using the Method of Characteristics — the industry-standard bell shape that maximizes thrust for a given nozzle length.

**Current gap**: The app uses a smooth Bézier approximation, which is a good visual representation but is not the geometrically optimal contour.

**How it works**: MOC propagates Mach waves through the nozzle flow field and computes the wall geometry that turns the flow with minimum loss. Open-source Python MOC implementations exist (e.g., `nozzle-moc`).

**Canvas visualization**: The new MOC contour replaces (or can be toggled vs.) the current Bézier bell on the main nozzle canvas. A toggle switch in the controls panel: "Bézier approximation | Rao optimal contour".

**Value for pressure-fed**: Medium — the Bézier bell is a good-enough approximation for most design phases. Useful for accuracy but not blocking.

---

## Priority Summary (Pressure-Fed, Low → High Complexity)

| # | Feature | Complexity | Est. Time | Canvas Visual? | Pressure-Fed Value |
|---|---|---|---|---|---|
| 1 | Full CEA parameter output table | Low | 1–2 wks | No (table) | High |
| 2 | Equations tab (MathJax) | Low | 1–2 wks | No (math render) | High |
| 3 | Bartz heat flux distribution | Medium | 2–3 wks | Yes — plot below nozzle; heatmap on wall | Very High |
| 4 | Film cooling (interactive slider) | Medium | 2–4 wks | Yes — overlay on heat flux plot | High |
| 5 | Injector sizing | Medium-High | 4–6 wks | Yes — injector face schematic | Very High |
| 6 | ✅ Regenerative cooling | High | 6–10 wks | Yes — wall temp curves + channel cross-section | High (high-Pc) |
| 7 | ✅ Rao optimal nozzle contour | Medium | 3–5 wks | Yes — dropdown on main nozzle canvas | Medium |

**Recommended sequencing**: 1 → 2 → 3 → 4 → 5 → 7 → 6
(Heat flux must precede film cooling and regen cooling; injector sizing is independent and high value.)
