'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  ChevronDown,
  Send,
  Sparkles,
  Smartphone,
  Download,
  Menu,
  X,
  Check,
  Copy,
  Cpu,
  Clock,
  ExternalLink,
  ShieldCheck,
  Zap,
  RotateCcw
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  latencyMs?: number;
  tokensUsed?: number;
  model?: string;
}

interface ChatConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  messages: ChatMessage[];
}

interface ModelOption {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  badge: string;
}

const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B',
    shortName: 'Qwen 3.8',
    tagline: 'Сбалансированная и быстрая модель',
    badge: 'Рекомендуется',
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    shortName: 'Llama 3.3 70B',
    tagline: 'Глубокая логика, код и анализ',
    badge: 'Pro',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    shortName: 'Llama 3.1 8B',
    tagline: 'Максимальная скорость отклика',
    badge: 'Быстрая',
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 70B',
    shortName: 'DeepSeek R1',
    tagline: 'Пошаговые рассуждения и логика',
    badge: 'Reasoning',
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B (32k)',
    shortName: 'Mixtral 8x7B',
    tagline: 'Обработка длинного контекста 32k',
    badge: '32k Context',
  },
];

const DEFAULT_MODEL = 'qwen/qwen3.8-27b';
const STORAGE_KEY_CHATS = 'claw_ai_chats_v2';
const STORAGE_KEY_ACTIVE_ID = 'claw_ai_active_chat_id_v2';

const QUICK_PROMPTS = [
  {
    title: 'Написать коммерческий план',
    desc: 'Структурируй шаги запуска нового IT-продукта',
    prompt: 'Составь структурированный план запуска коммерческого IT-продукта: фазы разработки, риски, метрики успеха и монетизацию.',
  },
  {
    title: 'Анализ архитектуры кода',
    desc: 'Как организовать масштабируемый backend',
    prompt: 'Опиши ключевые принципы чистой архитектуры (Clean Architecture) для микросервисного backend на Node.js / TypeScript.',
  },
  {
    title: 'Оптимизация производительности',
    desc: 'Методы ускорения мобильных приложений',
    prompt: 'Какие главные методы оптимизации скорости работы и кэширования в мобильных WebView и PWA приложениях на Android?',
  },
  {
    title: 'Деловое коммерческое письмо',
    desc: 'Шаблон письма партнерам или клиентам',
    prompt: 'Напиши лаконичное деловое предложение о внедрении ИИ-ассистента для автоматизации поддержки клиентов коммерческой компании.',
  },
];

export const CommercialChatApp: React.FC = () => {
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Android PWA install prompt state
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize PWA and local storage
  useEffect(() => {
    // Check if running in standalone mode (installed PWA or native WebView)
    if (
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true)
    ) {
      setIsStandalone(true);
    }

    // Capture Android PWA install event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Register Service Worker for Android offline & fast launch
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Load saved chats from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHATS);
      const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
      if (saved) {
        const parsed: ChatConversation[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChats(parsed);
          const initialActive = savedActive && parsed.some((c) => c.id === savedActive)
            ? savedActive
            : parsed[0].id;
          setActiveChatId(initialActive);
          const active = parsed.find((c) => c.id === initialActive);
          if (active) setSelectedModel(active.model || DEFAULT_MODEL);
          return;
        }
      }
    } catch {
      // ignore
    }

    // If no chats yet, create an initial default chat
    const initialChatId = `chat_${Date.now()}`;
    const initialChat: ChatConversation = {
      id: initialChatId,
      title: 'Новый диалог',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: DEFAULT_MODEL,
      messages: [],
    };
    setChats([initialChat]);
    setActiveChatId(initialChatId);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Sync chats to localStorage
  useEffect(() => {
    if (chats.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(chats));
      } catch {}
    }
  }, [chats]);

  // Sync activeChatId to localStorage
  useEffect(() => {
    if (activeChatId) {
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeChatId);
      } catch {}
      const active = chats.find((c) => c.id === activeChatId);
      if (active && active.model) {
        setSelectedModel(active.model);
      }
    }
  }, [activeChatId, chats]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeChatId, isLoading]);

  // Close model dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // Active chat reference
  const currentChat = chats.find((c) => c.id === activeChatId) || chats[0];

  // Handle Android PWA Install trigger
  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallSuccess(true);
        setInstallPrompt(null);
      }
    } else {
      // Fallback instruction for Android Chrome
      alert('Для установки на Android:\n1. Нажмите на значок меню браузера (три точки вверху справа).\n2. Выберите «Установить приложение» или «Добавить на главный экран».');
    }
  };

  // Create a new chat
  const handleCreateNewChat = () => {
    const newId = `chat_${Date.now()}`;
    const newChat: ChatConversation = {
      id: newId,
      title: 'Новый диалог',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: selectedModel,
      messages: [],
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newId);
    setInput('');
    setIsSidebarOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // Switch active chat
  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    const target = chats.find((c) => c.id === chatId);
    if (target && target.model) {
      setSelectedModel(target.model);
    }
    setIsSidebarOpen(false);
  };

  // Delete a chat
  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = chats.filter((c) => c.id !== chatId);
    if (remaining.length === 0) {
      const fallbackId = `chat_${Date.now()}`;
      const fallbackChat: ChatConversation = {
        id: fallbackId,
        title: 'Новый диалог',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: selectedModel,
        messages: [],
      };
      setChats([fallbackChat]);
      setActiveChatId(fallbackId);
    } else {
      setChats(remaining);
      if (activeChatId === chatId) {
        setActiveChatId(remaining[0].id);
        setSelectedModel(remaining[0].model || DEFAULT_MODEL);
      }
    }
  };

  // Select model
  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    setIsModelDropdownOpen(false);
    if (currentChat) {
      setChats((prev) =>
        prev.map((c) => (c.id === currentChat.id ? { ...c, model: modelId } : c))
      );
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    // Update active chat title if first message
    const isFirstMessage = !currentChat || currentChat.messages.length === 0;
    const newTitle = isFirstMessage
      ? text.slice(0, 36) + (text.length > 36 ? '...' : '')
      : currentChat?.title || 'Диалог';

    const targetChatId = currentChat?.id || `chat_${Date.now()}`;

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === targetChatId) {
          return {
            ...c,
            title: newTitle,
            updatedAt: Date.now(),
            messages: [...c.messages, userMessage],
          };
        }
        return c;
      })
    );

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          sessionId: `chat_${targetChatId}`,
          userId: 'commercial_client',
          model: selectedModel,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        const assistantMessage: ChatMessage = {
          id: data.message.id || `msg_asst_${Date.now()}`,
          role: 'assistant',
          content: data.message.content,
          timestamp: data.message.timestamp || Date.now(),
          latencyMs: data.latencyMs,
          tokensUsed: data.tokensUsed?.totalTokens,
          model: data.model || selectedModel,
        };

        setChats((prev) =>
          prev.map((c) => {
            if (c.id === targetChatId) {
              return {
                ...c,
                updatedAt: Date.now(),
                messages: [...c.messages, assistantMessage],
              };
            }
            return c;
          })
        );
      } else {
        const errMsg: ChatMessage = {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          content: `Ошибка обработки запроса: ${data.error || 'Сервер не вернул ответ. Попробуйте еще раз.'}`,
          timestamp: Date.now(),
        };
        setChats((prev) =>
          prev.map((c) =>
            c.id === targetChatId ? { ...c, messages: [...c.messages, errMsg] } : c
          )
        );
      }
    } catch (err: any) {
      const networkErrMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `Сетевая ошибка: ${err.message || 'Не удалось связаться с сервером.'}`,
        timestamp: Date.now(),
      };
      setChats((prev) =>
        prev.map((c) =>
          c.id === targetChatId ? { ...c, messages: [...c.messages, networkErrMsg] } : c
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcut: Enter to submit, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Copy assistant response
  const handleCopyContent = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const currentModelInfo =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <div className="flex h-[100dvh] w-full bg-[#09090b] text-zinc-100 overflow-hidden select-text antialiased">
      {/* Mobile Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sidebar (Chats Management) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-zinc-950 border-r border-zinc-800/80 flex flex-col transform transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm tracking-tight text-zinc-100">Claw AI</div>
              <div className="text-[11px] text-zinc-500 font-mono">Commercial Assistant</div>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800/50"
            aria-label="Закрыть меню"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleCreateNewChat}
            className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-medium rounded-lg text-sm shadow-sm transition-colors active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>Новый чат</span>
          </button>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          <div className="px-2 py-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Ваши диалоги ({chats.length})
          </div>

          {chats.map((chat) => {
            const isActive = chat.id === activeChatId;
            return (
              <div
                key={chat.id}
                onClick={() => handleSelectChat(chat.id)}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                  <MessageSquare
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-400'
                    }`}
                  />
                  <span className="truncate text-xs leading-normal">{chat.title || 'Новый диалог'}</span>
                </div>

                {/* Delete Chat Button */}
                <button
                  onClick={(e) => handleDeleteChat(chat.id, e)}
                  title="Удалить чат"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 transition-opacity"
                  aria-label="Удалить чат"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer: Android App & Status */}
        <div className="p-3 border-t border-zinc-800/80 space-y-2 bg-zinc-950/60">
          {/* Android PWA Install Button */}
          {!isStandalone && (
            <button
              onClick={handleInstallApp}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-850 text-xs text-zinc-300 hover:text-zinc-100 transition-colors group"
            >
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span className="font-medium">
                  {installSuccess ? 'Приложение установлено' : 'Установить на Android'}
                </span>
              </div>
              <Download className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
            </button>
          )}

          {isStandalone && (
            <div className="flex items-center space-x-2 px-3 py-1.5 text-xs text-emerald-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Android App Active</span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1 pt-1 font-mono">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Онлайн</span>
            </span>
            <span>{currentModelInfo.shortName}</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Viewport */}
      <div className="flex-1 flex flex-col h-full bg-[#09090b] overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-zinc-800/80 px-4 flex items-center justify-between bg-zinc-950/70 backdrop-blur z-20 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800"
              aria-label="Открыть меню"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Model Selector Dropdown */}
            <div className="relative" ref={modelDropdownRef}>
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-200 transition-colors font-medium active:scale-[0.98]"
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentModelInfo.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 hidden sm:inline">
                  {currentModelInfo.badge}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {/* Model Dropdown Menu */}
              {isModelDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-2.5 py-1.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                    Выберите языковую модель
                  </div>
                  <div className="space-y-1">
                    {AVAILABLE_MODELS.map((model) => {
                      const isSelected = model.id === selectedModel;
                      return (
                        <button
                          key={model.id}
                          onClick={() => handleSelectModel(model.id)}
                          className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-start justify-between ${
                            isSelected
                              ? 'bg-zinc-800 text-zinc-100'
                              : 'text-zinc-300 hover:bg-zinc-850 hover:text-zinc-100'
                          }`}
                        >
                          <div className="space-y-0.5 flex-1 pr-2">
                            <div className="font-semibold flex items-center space-x-1.5">
                              <span>{model.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                            <div className="text-[11px] text-zinc-400 leading-tight">
                              {model.tagline}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800 flex-shrink-0">
                            {model.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCreateNewChat}
              className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-zinc-100 px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors"
              title="Новый диалог"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Новый чат</span>
            </button>
          </div>
        </header>

        {/* Message Stream Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
          {(!currentChat || currentChat.messages.length === 0) ? (
            /* Empty Chat State / Hero */
            <div className="max-w-2xl mx-auto h-full flex flex-col items-center justify-center text-center py-10 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">
                  Чем я могу помочь?
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
                  Коммерческий ИИ-ассистент с мгновенным откликом, поддержкой кода, аналитики и выбором передовых моделей.
                </p>
              </div>

              {/* Quick Starter Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl text-left pt-2">
                {QUICK_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="p-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 text-left transition-all active:scale-[0.98] group"
                  >
                    <div className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <div className="max-w-3xl mx-auto space-y-5">
              {currentChat.messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-[11px] font-mono text-zinc-500 mb-1 px-1 flex items-center space-x-2">
                      <span>{isUser ? 'Вы' : 'Claw AI'}</span>
                      {msg.model && !isUser && (
                        <span className="text-[10px] px-1 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {msg.model.split('/').pop()}
                        </span>
                      )}
                    </div>

                    <div
                      className={`relative group max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-zinc-800 text-zinc-100 rounded-br-sm'
                          : 'bg-zinc-900/90 text-zinc-200 border border-zinc-800/90 rounded-bl-sm shadow-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans break-words selection:bg-emerald-500/20">
                        {msg.content}
                      </div>

                      {/* Assistant Message Details & Copy */}
                      {!isUser && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                          <div className="flex items-center space-x-3">
                            {msg.latencyMs !== undefined && (
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-zinc-400" />
                                <span>{msg.latencyMs}ms</span>
                              </span>
                            )}
                            {msg.tokensUsed !== undefined && (
                              <span className="flex items-center space-x-1">
                                <Zap className="w-3 h-3 text-zinc-400" />
                                <span>{msg.tokensUsed} токенов</span>
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleCopyContent(msg.content, msg.id)}
                            className="flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded"
                            title="Скопировать ответ"
                          >
                            {copiedMessageId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Скопировано</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Копировать</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex flex-col items-start max-w-3xl">
                  <div className="text-[11px] font-mono text-zinc-500 mb-1 px-1">
                    Claw AI печатает...
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse delay-150" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse delay-300" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-zinc-950/90 border-t border-zinc-800/80 flex-shrink-0">
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="relative flex items-end bg-zinc-900 rounded-xl border border-zinc-800 focus-within:border-zinc-700 shadow-lg transition-colors p-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Задайте вопрос или напишите задачу... (Enter для отправки)"
                rows={1}
                disabled={isLoading}
                className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none px-2 py-1 max-h-[160px] leading-relaxed"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                  input.trim() && !isLoading
                    ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:scale-95'
                    : 'bg-zinc-800/60 text-zinc-500 cursor-not-allowed'
                }`}
                aria-label="Отправить сообщение"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between px-1 text-[11px] text-zinc-500">
              <span>Shift + Enter для новой строки</span>
              <span className="truncate max-w-[200px] sm:max-w-none">
                Модель: {currentModelInfo.name}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
