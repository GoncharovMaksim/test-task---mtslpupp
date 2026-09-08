import { SocksProxyAgent } from 'socks-proxy-agent';
import { NetworkConnectivityStatus } from '../../core/domain/entities/provider.entity';
import { IProxyService } from '../../core/domain/interfaces/proxy-service.interface';

export class NetworkProxyService implements IProxyService {
  private socksAgent?: SocksProxyAgent;

  constructor(private readonly defaultProxyUrl?: string) {
    if (defaultProxyUrl && defaultProxyUrl.startsWith('socks')) {
      try {
        this.socksAgent = new SocksProxyAgent(defaultProxyUrl);
      } catch {
        // Fallback to undefined if proxy URL is malformed
      }
    }
  }

  public getAgentForUrl(targetUrl: string): any {
    if (this.socksAgent && targetUrl.includes('api.telegram.org')) {
      return this.socksAgent;
    }
    return undefined;
  }

  public async checkTelegramConnectivity(
    proxyUrl?: string,
    customBaseUrl?: string
  ): Promise<NetworkConnectivityStatus> {
    const base = customBaseUrl || 'https://api.telegram.org';
    const activeProxy = proxyUrl || this.defaultProxyUrl;
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const agent =
        activeProxy && activeProxy.startsWith('socks')
          ? new SocksProxyAgent(activeProxy)
          : undefined;

      const fetchOptions: any = {
        signal: controller.signal,
      };

      if (agent) {
        fetchOptions.agent = agent;
      }

      // Query root or non-authenticated endpoint
      const response = await fetch(`${base}`, fetchOptions);
      clearTimeout(timeoutId);

      const latency = Date.now() - start;
      return {
        endpoint: base,
        target: 'telegram',
        status: response.status < 500 ? 'ok' : 'error',
        latencyMs: latency,
        message: `HTTP ${response.status} via ${agent ? 'SOCKS5 Proxy' : 'Direct/Reverse Proxy'}`,
      };
    } catch (err: any) {
      return {
        endpoint: base,
        target: 'telegram',
        status: 'error',
        latencyMs: Date.now() - start,
        message: err.name === 'AbortError' ? 'Timeout (6000ms)' : (err.message || 'Connection failed'),
      };
    }
  }

  public async checkLLMConnectivity(
    providerUrl: string,
    apiKey?: string
  ): Promise<NetworkConnectivityStatus> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(providerUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return {
        endpoint: providerUrl,
        target: 'llm',
        status: response.status < 500 ? 'ok' : 'error',
        latencyMs: Date.now() - start,
        message: `HTTP ${response.status}`,
      };
    } catch (err: any) {
      return {
        endpoint: providerUrl,
        target: 'llm',
        status: 'error',
        latencyMs: Date.now() - start,
        message: err.name === 'AbortError' ? 'Timeout (5000ms)' : (err.message || 'Connection failed'),
      };
    }
  }
}
