import { constants } from '../constants';
import { BaseApi } from './api/baseApi';
import { type InjectorType } from './injectorSweepService';

export interface StationPropertiesParams {
  ox_code: string;
  fuel_code: string;
  pc_bar: number;
  performance_mode: 'sea_level' | 'vacuum';
  mixture_ratio: number;
}

export interface EngineDesignParams {
  ox_code: string;
  fuel_code: string;
  target_thrust_N: number;
  pc_bar: number;
  performance_mode: 'sea_level' | 'vacuum';
  mr_min: number;
  mr_max: number;
  l_star_m?: number;
  contraction_ratio?: number;
}

export interface SpeciesEntry {
  species: string;
  massFraction: number;
}

interface LStarRange {
  min: number;
  max: number;
  unit: string;
}

interface PropellantInfo {
  name: string;
  code: string;
}

interface ValueUnit {
  value: number;
  unit: string;
}

export interface CeaStationProps {
  temperature: number;          // K
  density: number;              // kg/m³
  heatCapacityCp: number;       // kJ/(kg·K)
  enthalpy: number;             // kJ/kg
  sonicVelocity: number;        // m/s
  molecularWeight: number;      // g/mol
  gamma: number;
  viscosity: number;            // Pa·s
  thermalConductivity: number;  // W/(m·K)
  prandtlNumber: number;
  pressureRatioToChPc?: number; // Pc/P — throat and exit only
  machNumber?: number;          // exit only
}

export interface StationProperties {
  chamber: CeaStationProps;
  throat: CeaStationProps;
  exit: CeaStationProps;
  frozenPerformance: {
    ispFrozenVacS: number;
    cstarFrozenMs: number;
    frozenVsEquilIspDeltaPct: number;
  };
}

export interface MixtureRatioSweepEntry {
  mixtureRatio: number;
  specificImpulse: number;
  chamberTemperature: number;
  characteristicVelocityCstar: number;
  thrustCoefficientCf: number;
  specificHeatRatioGamma: number;
  combustionMolecularWeight: number;
  expansionRatio: number;
  totalMassFlow: number;
  oxidizerMassFlow: number;
  fuelMassFlow: number;
  throatRadius: number;
  exitRadius: number;
  chamberRadius: number;
  contractionRatio: number;
}

export interface EngineDesignResult {
  engineInputs: {
    propellants: {
      oxidizer: PropellantInfo;
      fuel: PropellantInfo;
    };
    targetThrust: ValueUnit;
    chamberPressure: ValueUnit;
    performanceMode: 'sea_level' | 'vacuum';
    contractionRatio: ValueUnit;
    characteristicLength: ValueUnit;
  };
  engineOutputs: {
    mixtureRatio: {
      optimum: {
        mixtureRatio: ValueUnit;
        specificImpulse: ValueUnit;
        characteristicVelocityCstar: ValueUnit;
        thrustCoefficientCf: ValueUnit;
        chamberTemperature: ValueUnit;
        specificHeatRatioGamma: ValueUnit;
        combustionMolecularWeight: ValueUnit;
        totalMassFlow: ValueUnit;
        oxidizerMassFlow: ValueUnit;
        fuelMassFlow: ValueUnit;
        throatRadius: ValueUnit;
        exitRadius: ValueUnit;
        chamberRadius: ValueUnit;
        contractionRatio: ValueUnit;
        expansionRatio: ValueUnit;
        characteristicLength: ValueUnit;
        cylindricalLength: ValueUnit;
        convergentLength: ValueUnit;
        lStarFloorActive: boolean;
        lStarRange: LStarRange;
        speciesComposition: SpeciesEntry[];
      };
      sweep: {
        units: Record<string, string>;
        values: MixtureRatioSweepEntry[];
      };
    };
  };
}

export interface EngineFormInputs {
  engineName: string;
  engineVersion: string;
  fuel: string;
  oxidizer: string;
  minMixtureRatio: string;
  maxMixtureRatio: string;
  targetThrust: string;
  chamberPressure: string;
  performanceMode: 'sea_level' | 'vacuum';
}

export interface EngineImportData {
  version: string;
  inputs: EngineFormInputs;
  nozzleAdjustments: {
    nozzleType: 'bell' | 'conical' | 'rao';
    angleOverrides: {
      convergentHalfDeg?: number;
      divergentRefDeg?: number;
      tNDeg?: number;
      tEDeg?: number;
    };
  };
  chamberDesign?: {
    lStarM?: number;
    contractionRatio: number;
  };
  injectorConfig?: {
    type: InjectorType;
    dOxMm: number;
    dFuelMm: number;
    impingementHalfAngleDeg: number;
  };
  plumbingConfig?: {
    gas: 'N2' | 'He';
    tankShape: 'sphere' | 'cylinder';
    aspectRatio: number;
    oxMaterial: string;
    fuelMaterial: string;
    pressurantMaterial: string;
    injectorDropPct: number;
    lineLossBar: number;
    ullageMarginBar: number;
    pressurantTankBar: number;
    burnTimeSec: number;
  };
}

class EngineDesignService extends BaseApi {
  constructor() {
    super(constants.API_BASE_URL);
  }

  async getEngineDesign(params: EngineDesignParams): Promise<EngineDesignResult> {
    const query = new URLSearchParams({
      ox_code: params.ox_code,
      fuel_code: params.fuel_code,
      target_thrust_N: String(params.target_thrust_N),
      pc_bar: String(params.pc_bar),
      performance_mode: params.performance_mode,
      mr_min: String(params.mr_min),
      mr_max: String(params.mr_max),
    });
    if (params.l_star_m !== undefined) query.set('l_star_m', String(params.l_star_m));
    if (params.contraction_ratio !== undefined) query.set('contraction_ratio', String(params.contraction_ratio));
    return this.get<EngineDesignResult>(`/api/v1/engine/design?${query}`);
  }

  async getStationProperties(params: StationPropertiesParams): Promise<StationProperties> {
    const query = new URLSearchParams({
      ox_code: params.ox_code,
      fuel_code: params.fuel_code,
      pc_bar: String(params.pc_bar),
      performance_mode: params.performance_mode,
      mixture_ratio: String(params.mixture_ratio),
    });
    return this.get<StationProperties>(`/api/v1/engine/station-properties?${query}`);
  }
}

export const engineDesignService = new EngineDesignService();
