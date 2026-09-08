import { NetworkProxyService } from '../../../src/infrastructure/services/network-proxy.service';

describe('NetworkProxyService', () => {
  it('should initialize with default proxy and provide agent url', () => {
    const service = new NetworkProxyService('http://vXjZsn:rCbek7@45.152.201.50:8000');
    expect(service.getAgentForUrl('https://api.telegram.org')).toBe('http://vXjZsn:rCbek7@45.152.201.50:8000');
  });

  it('should report timeout or error gracefully when connection fails', async () => {
    const service = new NetworkProxyService('http://127.0.0.1:9999');
    const result = await service.checkTelegramConnectivity('http://127.0.0.1:9999', 'http://127.0.0.1:9998');
    expect(result.target).toBe('telegram');
    expect(result.status).toBe('error');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
