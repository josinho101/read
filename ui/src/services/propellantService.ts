import { constants } from '../constants';
import { BaseApi } from './api/baseApi';

export interface Propellant {
  code: string;
  name: string;
}

interface PropellantsResponse {
  propellants: {
    fuels: Propellant[];
    oxidizers: Propellant[];
  };
}

class PropellantService extends BaseApi {
  constructor() {
    super(constants.API_BASE_URL);
  }

  async getPropellants(): Promise<{ fuels: Propellant[]; oxidizers: Propellant[] }> {
    const data = await this.get<PropellantsResponse>('/api/v1/propellants');
    return data.propellants;
  }
}

export const propellantService = new PropellantService();
