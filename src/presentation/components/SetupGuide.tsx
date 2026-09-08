'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink, HelpCircle } from 'lucide-react';

interface SetupGuideProps {
  botUsername?: string;
}

export const SetupGuide: React.FC<SetupGuideProps> = ({ botUsername }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const resolvedBotUsername =
    botUsername ||
    process.env.NEXT_PUBLIC_BOT_USERNAME ||
    '@dp_openclawmtslpu_wltsg_bot';

  const formAnswers = {
    botUsername: resolvedBotUsername,
    solutionDescription:
      'Для обеспечения работы из РФ без системного VPN реализованы два взаимодополняющих механизма: 1) В продакшене шлюз развернут на Vercel Edge/Serverless, куда Telegram доставляет вебхуки напрямую без блокировок РКН; 2) Для локального запуска реализован TelegramBotAdapter с поддержкой SOCKS5-агента и альтернативных реверс-прокси (Cloudflare Workers), а в качестве LLM-провайдера задействован Groq API (Qwen 3.8 / LLaMA 3.3), который работает нативно с субсекундной задержкой. Дополнительно написан кастомный SOUL.md и настроен Docker Compose.',
    timeSpent: '3.5 часа',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <HelpCircle className="w-4 h-4 text-zinc-400" />
        <h3 className="text-sm font-semibold text-zinc-200">Test Task Submission Guide & Walkthrough</h3>
      </div>

      {/* Stage Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
          <div className="text-xs font-mono uppercase text-zinc-400">Stage 1: OpenClaw Core</div>
          <div className="text-sm font-medium text-zinc-200">Gateway Deployment</div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            TypeScript Clean Architecture: Domain, Application, and Infrastructure layers. Multi-channel adapter with session memory and sliding window compaction.
          </p>
        </div>

        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
          <div className="text-xs font-mono uppercase text-zinc-400">Stage 2: No-VPN Operation</div>
          <div className="text-sm font-medium text-zinc-200">Bypass Architecture</div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Eliminates system-wide VPN requirements via dual-path routing: SOCKS5 tunnel for polling mode, and edge serverless webhook for production.
          </p>
        </div>

        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
          <div className="text-xs font-mono uppercase text-zinc-400">Stage 3: Screencast & Form</div>
          <div className="text-sm font-medium text-zinc-200">Verification & Video</div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            2-5 minute demonstration showing terminal execution, live Telegram bot chat from PC and phone without VPN, and web dashboard metrics.
          </p>
        </div>
      </div>

      {/* Form Submission Ready Data */}
      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-4">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
          Form Submission Pre-filled Answers (Google Form)
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Username Telegram-бота:</span>
              <button
                onClick={() => copyToClipboard(formAnswers.botUsername, 'bot')}
                className="flex items-center space-x-1 text-zinc-500 hover:text-zinc-300"
              >
                {copiedKey === 'bot' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span className="text-[11px] font-mono">{copiedKey === 'bot' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs text-zinc-200 flex items-center justify-between">
              <span>{formAnswers.botUsername}</span>
              <a
                href={`https://t.me/${formAnswers.botUsername.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-sans text-xs"
              >
                <span>Открыть в Telegram</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Краткое описание решения (3–5 предложений):</span>
              <button
                onClick={() => copyToClipboard(formAnswers.solutionDescription, 'desc')}
                className="flex items-center space-x-1 text-zinc-500 hover:text-zinc-300"
              >
                {copiedKey === 'desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span className="text-[11px] font-mono">{copiedKey === 'desc' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-300 leading-relaxed">
              {formAnswers.solutionDescription}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Время выполнения:</span>
              <button
                onClick={() => copyToClipboard(formAnswers.timeSpent, 'time')}
                className="flex items-center space-x-1 text-zinc-500 hover:text-zinc-300"
              >
                {copiedKey === 'time' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span className="text-[11px] font-mono">{copiedKey === 'time' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs text-zinc-200">
              {formAnswers.timeSpent}
            </div>
          </div>
        </div>
      </div>

      {/* Screencast Checklist */}
      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
          Screencast Video Recording Script (2-5 min)
        </div>
        <ol className="list-decimal list-inside space-y-2 text-xs text-zinc-300 leading-relaxed font-sans">
          <li>
            <strong className="text-zinc-100">0:00 - 0:45:</strong> Show terminal running OpenClaw Gateway or Docker Compose, displaying proxy adapter initialization and bot authorization.
          </li>
          <li>
            <strong className="text-zinc-100">0:45 - 1:45:</strong> Open Telegram client on desktop, send <code className="bg-zinc-900 px-1 py-0.5 rounded text-zinc-200">/start</code> and a sample question. Show immediate assistant answer with persona adherence.
          </li>
          <li>
            <strong className="text-zinc-100">1:45 - 2:45:</strong> Demonstrate response from a mobile phone in Telegram without VPN enabled.
          </li>
          <li>
            <strong className="text-zinc-100">2:45 - 3:30:</strong> Explain the No-VPN architecture: SOCKS5 tunnel, Groq direct routing, and Vercel edge webhook.
          </li>
        </ol>
      </div>
    </div>
  );
};
