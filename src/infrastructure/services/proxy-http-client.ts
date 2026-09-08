import http from 'http';
import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

export interface ProxyFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  proxyUrl?: string;
  timeoutMs?: number;
}

export interface ProxyFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  json<T = any>(): Promise<T>;
  text(): Promise<string>;
}

// Cache agents by proxyUrl to maximize socket reuse
const agentCache = new Map<string, http.Agent | https.Agent>();

function getAgentForProxy(proxyUrl: string): http.Agent | https.Agent {
  let agent = agentCache.get(proxyUrl);
  if (!agent) {
    if (proxyUrl.startsWith('socks')) {
      agent = new SocksProxyAgent(proxyUrl);
    } else {
      agent = new HttpsProxyAgent(proxyUrl);
    }
    agentCache.set(proxyUrl, agent);
  }
  return agent;
}

/**
 * Universal HTTP/HTTPS client routing through SOCKS5 or HTTP CONNECT proxies.
 * Built on node:https and node:http with HttpsProxyAgent and SocksProxyAgent for maximum compatibility.
 */
export async function proxyFetch(
  url: string,
  options: ProxyFetchOptions = {}
): Promise<ProxyFetchResponse> {
  const { proxyUrl, method = 'GET', headers = {}, body, signal, timeoutMs } = options;

  const isProxyConfigured =
    Boolean(proxyUrl) &&
    !['direct', 'none', 'off', '0', ''].includes((proxyUrl || '').trim().toLowerCase());

  return new Promise<ProxyFetchResponse>((resolve, reject) => {
    let timer: NodeJS.Timeout | undefined;
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    let agent: http.Agent | https.Agent | undefined;
    if (isProxyConfigured) {
      agent = getAgentForProxy((proxyUrl || '').trim());
    }

    const req = client.request(
      parsedUrl,
      {
        method,
        headers,
        agent,
      },
      (res) => {
        if (timer) clearTimeout(timer);
        const chunks: Buffer[] = [];

        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          const rawData = Buffer.concat(chunks).toString('utf-8');
          const statusCode = res.statusCode || 200;
          const normalizedHeaders: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            if (v !== undefined) {
              normalizedHeaders[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
            }
          }

          resolve({
            ok: statusCode >= 200 && statusCode < 300,
            status: statusCode,
            statusText: res.statusMessage || '',
            headers: normalizedHeaders,
            json: async <T = any>(): Promise<T> => {
              try {
                return JSON.parse(rawData);
              } catch {
                return {} as T;
              }
            },
            text: async (): Promise<string> => rawData,
          });
        });
      }
    );

    const onAbort = () => {
      req.destroy(new Error('Request aborted'));
    };

    if (signal) {
      if (signal.aborted) {
        req.destroy(new Error('Request already aborted'));
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    if (timeoutMs) {
      timer = setTimeout(() => {
        req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }

    req.on('error', (err) => {
      if (timer) clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
      reject(err);
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}
