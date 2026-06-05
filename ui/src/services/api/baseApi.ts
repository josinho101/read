export class BaseApi {
  protected baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async extractError(response: Response): Promise<string> {
    try {
      const body = await response.json() as { error?: string };
      if (body.error) return body.error;
    } catch { /* ignore parse errors */ }
    return `${response.status} ${response.statusText}`;
  }

  protected async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) throw new Error(await this.extractError(response));
    return response.json() as Promise<T>;
  }

  protected async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await this.extractError(response));
    return response.json() as Promise<T>;
  }

  protected async put<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await this.extractError(response));
    return response.json() as Promise<T>;
  }

  protected async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(await this.extractError(response));
    return response.json() as Promise<T>;
  }
}
