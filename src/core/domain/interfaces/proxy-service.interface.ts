import { NetworkConnectivityStatus } from '../entities/provider.entity';

export interface IProxyService {
  checkTelegramConnectivity(proxyUrl?: string, customBaseUrl?: string): Promise<NetworkConnectivityStatus>;
  checkLLMConnectivity(providerUrl: string, apiKey?: string): Promise<NetworkConnectivityStatus>;
  getAgentForUrl(targetUrl: string): any;
}
