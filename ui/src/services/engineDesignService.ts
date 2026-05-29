import { constants } from '../constants';
import { BaseApi } from './api/baseApi';

export interface EngineDesignParams {
  ox_code: string;
  fuel_code: string;
  target_thrust_N: number;
  pc_bar: number;
  pe_bar: number;
  mr_min: number;
  mr_max: number;
}

interface PropellantInfo {
  name: string;
  code: string;
}

interface ValueUnit {
  value: number;
  unit: string;
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
    propellents: {
      oxidizer: PropellantInfo;
      fuel: PropellantInfo;
    };
    targetThrust: ValueUnit;
    chamberPressure: ValueUnit;
    exitPressure: ValueUnit;
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
      };
      sweep: {
        units: Record<string, string>;
        values: MixtureRatioSweepEntry[];
      };
    };
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
      pe_bar: String(params.pe_bar),
      mr_min: String(params.mr_min),
      mr_max: String(params.mr_max),
    });
    return this.get<EngineDesignResult>(`/api/v1/engine/design?${query}`);
  }
}

export const engineDesignService = new EngineDesignService();
