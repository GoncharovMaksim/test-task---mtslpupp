'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw, Terminal, Cpu } from 'lucide-react';

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  latencyMs?: number;
  tokensUsed?: number;
}

export const ChatPlayground: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'init',
      role: 'assistant',
      content: 'OpenClaw Gateway active. You can send test queries directly to verify persona instructions and response latency.',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `web_${Math.random().toString(36).slice(2, 8)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessageItem = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          sessionId,
          userId: 'web_tester',
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        const assistantMsg: ChatMessageItem = {
          id: data.message.id,
          role: 'assistant',
          content: data.message.content,
          timestamp: data.message.timestamp,
          latencyMs: data.latencyMs,
          tokensUsed: data.tokensUsed?.totalTokens,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: 'assistant',
            content: `Gateway error: ${data.error || 'Request processing failed'}`,
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `Network error: ${err.message}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `init_${Date.now()}`,
        role: 'assistant',
        content: 'Conversation history reset. Ready for new context.',
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[650px] bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/60 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-300">Gateway Playground</span>
          <span className="text-xs font-mono text-zinc-500">[{sessionId}]</span>
        </div>
        <button
          onClick={handleClearHistory}
          disabled={isLoading}
          className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1 rounded bg-zinc-800/40 hover:bg-zinc-800"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Context</span>
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="text-[11px] font-mono text-zinc-500 mb-1 px-1">
              {msg.role === 'user' ? 'User' : 'Assistant (SOUL)'}
            </div>
            <div
              className={`max-w-[85%] rounded-md px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'bg-zinc-900 text-zinc-200 border border-zinc-800'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
              {msg.latencyMs !== undefined && (
                <div className="mt-2 pt-1.5 border-t border-zinc-800/80 flex items-center space-x-3 text-[10px] font-mono text-zinc-500">
                  <span className="flex items-center space-x-1">
                    <Cpu className="w-3 h-3" />
                    <span>{msg.latencyMs}ms</span>
                  </span>
                  {msg.tokensUsed !== undefined && (
                    <span>{msg.tokensUsed} tokens</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center space-x-2 text-xs font-mono text-zinc-500 p-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
            <span>Processing completion through Gateway...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-3 bg-zinc-900/40 border-t border-zinc-800 flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Send test message to Gateway assistant..."
          disabled={isLoading}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center space-x-1.5"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
