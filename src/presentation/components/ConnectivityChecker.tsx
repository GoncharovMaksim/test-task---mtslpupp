'use client';

import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, AlertTriangle, RefreshCw, Radio, Check } from 'lucide-react';

interface DiagnosticsData {
  timestamp: string;
  telegramStatus: {
    endpoint: string;
    target: string;
    status: 'ok' | 'error' | 'bypassed';
    latencyMs: number;
    message?: string;
  };
  llmStatus: {
    endpoint: string;
    target: string;
    status: 'ok' | 'error' | 'bypassed';
    latencyMs: number;
    message?: string;
  };
  overallHealthy: boolean;
  recommendation: string;
}

export const ConnectivityChecker: React.FC = () => {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const runDiagnostics = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/gateway/connectivity');
      const json = await res.json();
      setData(json);
    } catch {
      // Ignore network errors in checker
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Network & Russia Bypass Diagnostics</h3>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={isChecking}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? 'Testing Routes...' : 'Run Diagnostics'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Telegram API Route */}
        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-mono uppercase text-zinc-300">Telegram Bot Channel</span>
            </div>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                data?.telegramStatus?.status === 'ok'
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                  : 'bg-red-950/60 text-red-400 border border-red-800/60'
              }`}
            >
              {data?.telegramStatus?.status === 'ok' ? 'CONNECTED' : 'DEGRADED'}
            </span>
          </div>
          <div className="text-xs font-mono text-zinc-400 break-all">
            Target: {data?.telegramStatus?.endpoint || 'https://api.telegram.org'}
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-zinc-500 pt-2 border-t border-zinc-900">
            <span>Latency: {data?.telegramStatus?.latencyMs ?? '-'} ms</span>
            <span>{data?.telegramStatus?.message || 'Awaiting ping...'}</span>
          </div>
        </div>

        {/* LLM Provider Route */}
        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-mono uppercase text-zinc-300">LLM Inference Route</span>
            </div>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                data?.llmStatus?.status === 'ok'
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                  : 'bg-red-950/60 text-red-400 border border-red-800/60'
              }`}
            >
              {data?.llmStatus?.status === 'ok' ? 'OPERATIONAL' : 'DEGRADED'}
            </span>
          </div>
          <div className="text-xs font-mono text-zinc-400 break-all">
            Provider: Groq Cloud API (Direct HTTPS)
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-zinc-500 pt-2 border-t border-zinc-900">
            <span>Latency: {data?.llmStatus?.latencyMs ?? '-'} ms</span>
            <span>{data?.llmStatus?.message || 'Awaiting ping...'}</span>
          </div>
        </div>
      </div>

      {/* Bypass Architecture Breakdown */}
      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
          Implemented No-VPN Architectural Strategies (Stage 2)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-300">
          <div className="p-3 bg-zinc-900/50 border border-zinc-800/60 rounded">
            <div className="font-semibold text-zinc-200 mb-1 flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Strategy 1: Serverless Edge Webhook</span>
            </div>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Vercel edge functions execute in international regions (Frankfurt/Washington). Telegram servers deliver incoming updates directly to the webhook endpoint without encountering Russian ISP DPI blocking.
            </p>
          </div>

          <div className="p-3 bg-zinc-900/50 border border-zinc-800/60 rounded">
            <div className="font-semibold text-zinc-200 mb-1 flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Strategy 2: SOCKS5 Polling Adapter</span>
            </div>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              For local desktop execution, OpenClaw connects via socks5-proxy-agent to proxy tunnels (or custom Cloudflare Worker reverse proxies), eliminating the need for full system-wide VPN.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
