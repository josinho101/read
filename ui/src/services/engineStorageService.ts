import { constants } from '../constants';
import { BaseApi } from './api/baseApi';
import { type EngineImportData } from './engineDesignService';

export interface SavedEngineEntry {
  name: string;
  version: string;
  saved_at: string;
}

class EngineStorageService extends BaseApi {
  constructor() {
    super(constants.API_BASE_URL);
  }

  listEngines(): Promise<SavedEngineEntry[]> {
    return this.get<SavedEngineEntry[]>('/api/v1/engines');
  }

  saveEngine(name: string, version: string, data: EngineImportData): Promise<SavedEngineEntry> {
    return this.post<SavedEngineEntry>('/api/v1/engines', { ...data, name, version });
  }

  getEngine(name: string, version: string): Promise<EngineImportData> {
    return this.get<EngineImportData>(`/api/v1/engines/${encodeURIComponent(name)}/${encodeURIComponent(version)}`);
  }

  updateEngine(name: string, version: string, data: EngineImportData): Promise<SavedEngineEntry> {
    return this.put<SavedEngineEntry>(
      `/api/v1/engines/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
      { ...data, name, version },
    );
  }

  deleteEngine(name: string, version: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(
      `/api/v1/engines/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
    );
  }
}

export const engineStorageService = new EngineStorageService();
