import { NetworkConnectivityStatus } from '../../core/domain/entities/provider.entity';
import { IProxyService } from '../../core/domain/interfaces/proxy-service.interface';
import { proxyFetch } from './proxy-http-client';

export class NetworkProxyService implements IProxyService {
  constructor(private readonly defaultProxyUrl?: string) {}

  public getAgentForUrl(_targetUrl: string): any {
    return this.defaultProxyUrl;
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

      const response = await proxyFetch(`${base}`, {
        method: 'GET',
        signal: controller.signal,
        proxyUrl: activeProxy,
      });
      clearTimeout(timeoutId);

      const latency = Date.now() - start;
      const proxyType = activeProxy
        ? activeProxy.startsWith('socks')
          ? 'SOCKS5 Proxy'
          : 'HTTP/HTTPS Proxy'
        : 'Direct/Reverse Proxy';

      return {
        endpoint: base,
        target: 'telegram',
        status: response.status < 500 ? 'ok' : 'error',
        latencyMs: latency,
        message: `HTTP ${response.status} via ${proxyType}`,
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
    apiKey?: string,
    proxyUrl?: string
  ): Promise<NetworkConnectivityStatus> {
    const activeProxy = proxyUrl || this.defaultProxyUrl;
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await proxyFetch(providerUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
        proxyUrl: activeProxy,
      });
      clearTimeout(timeoutId);

      const proxyType = activeProxy
        ? activeProxy.startsWith('socks')
          ? 'SOCKS5 Proxy'
          : 'HTTP/HTTPS Proxy'
        : 'Direct Connection';

      return {
        endpoint: providerUrl,
        target: 'llm',
        status: response.status < 500 ? 'ok' : 'error',
        latencyMs: Date.now() - start,
        message: `HTTP ${response.status} via ${proxyType}`,
      };
    } catch (err: any) {
      return {
        endpoint: providerUrl,
        target: 'llm',
        status: 'error',
        latencyMs: Date.now() - start,
        message: err.name === 'AbortError' ? 'Timeout (6000ms)' : (err.message || 'Connection failed'),
      };
    }
  }
}

