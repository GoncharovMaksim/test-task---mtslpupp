'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  ChevronDown,
  ArrowUp,
  Sparkles,
  PanelLeft,
  X,
  Check,
  Copy,
  Clock,
  Zap,
  SquarePen
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
    name: 'Qwen 3.8 (27B)',
    shortName: 'Qwen 3.8',
    tagline: 'Быстрая и сбалансированная модель на каждый день',
    badge: 'Рекомендуется',
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 (70B)',
    shortName: 'Llama 3.3',
    tagline: 'Глубокая логика, сложное программирование и анализ',
    badge: 'Pro',
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 (70B)',
    shortName: 'DeepSeek R1',
    tagline: 'Пошаговые рассуждения и точная логика',
    badge: 'Thinking',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 (8B)',
    shortName: 'Llama 3.1',
    tagline: 'Мгновенный отклик и высокая скорость генерации',
    badge: 'Flash',
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B (32k)',
    shortName: 'Mixtral 8x7B',
    tagline: 'Обработка длинных документов и контекст 32k',
    badge: '32k Context',
  },
];

const DEFAULT_MODEL = 'qwen/qwen3.8-27b';
const STORAGE_KEY_CHATS = 'claw_ai_chats_v2';
const STORAGE_KEY_ACTIVE_ID = 'claw_ai_active_chat_id_v2';
const BOT_GREETING = 'Привет! Чем я могу помочь?';

export const CommercialChatApp: React.FC = () => {
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize chats and responsive sidebar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }

      try {
        const saved = localStorage.getItem(STORAGE_KEY_CHATS);
        const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
        if (saved) {
          const parsed: ChatConversation[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = parsed.map((c) =>
              c.messages && c.messages.length > 0
                ? c
                : {
                    ...c,
                    messages: [
                      {
                        id: `msg_asst_${c.id}`,
                        role: 'assistant' as const,
                        content: BOT_GREETING,
                        timestamp: c.createdAt || Date.now(),
                      },
                    ],
                  }
            );
            setChats(sanitized);
            const initialActive =
              savedActive && sanitized.some((c) => c.id === savedActive)
                ? savedActive
                : sanitized[0].id;
            setActiveChatId(initialActive);
            const active = sanitized.find((c) => c.id === initialActive);
            if (active) setSelectedModel(active.model || DEFAULT_MODEL);
            return;
          }
        }
      } catch {
        // ignore
      }

      const initialChatId = `chat_${Date.now()}`;
      const initialChat: ChatConversation = {
        id: initialChatId,
        title: 'Новый диалог',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: DEFAULT_MODEL,
        messages: [
          {
            id: `msg_asst_${Date.now()}`,
            role: 'assistant',
            content: BOT_GREETING,
            timestamp: Date.now(),
          },
        ],
      };
      setChats([initialChat]);
      setActiveChatId(initialChatId);
    }
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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const currentChat = chats.find((c) => c.id === activeChatId) || chats[0];

  const handleCreateNewChat = () => {
    const newId = `chat_${Date.now()}`;
    const newChat: ChatConversation = {
      id: newId,
      title: 'Новый диалог',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: selectedModel,
      messages: [
        {
          id: `msg_asst_${Date.now()}`,
          role: 'assistant',
          content: BOT_GREETING,
          timestamp: Date.now(),
        },
      ],
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newId);
    setInput('');
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    const target = chats.find((c) => c.id === chatId);
    if (target && target.model) {
      setSelectedModel(target.model);
    }
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

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
        messages: [
          {
            id: `msg_asst_${Date.now()}`,
            role: 'assistant',
            content: BOT_GREETING,
            timestamp: Date.now(),
          },
        ],
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

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    setIsModelDropdownOpen(false);
    if (currentChat) {
      setChats((prev) =>
        prev.map((c) => (c.id === currentChat.id ? { ...c, model: modelId } : c))
      );
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const isFirstUserMessage =
      !currentChat ||
      currentChat.messages.filter((m) => m.role === 'user').length === 0;
    const newTitle = isFirstUserMessage
      ? text.slice(0, 32) + (text.length > 32 ? '...' : '')
      : currentChat?.title || 'Диалог';

    const targetChatId = currentChat?.id || `chat_${Date.now()}`;

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === targetChatId) {
          const baseMessages =
            c.messages.length === 0
              ? [
                  {
                    id: `msg_asst_${c.id}`,
                    role: 'assistant' as const,
                    content: BOT_GREETING,
                    timestamp: c.createdAt,
                  },
                ]
              : c.messages;
          return {
            ...c,
            title: newTitle,
            updatedAt: Date.now(),
            messages: [...baseMessages, userMessage],
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
          userId: 'user',
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
          content: `Ошибка: ${data.error || 'Сервер не вернул ответ. Попробуйте еще раз.'}`,
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyContent = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const currentModelInfo =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <div className="flex h-[100dvh] w-full bg-[#171717] text-zinc-100 overflow-hidden font-sans antialiased">
      {/* Mobile Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Collapsible Left Sidebar (ChatGPT-style) */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 h-full bg-[#171717] md:bg-[#1a1a1a] border-r border-zinc-800/80 flex flex-col transition-all duration-200 ease-in-out ${
          isSidebarOpen
            ? 'w-64 translate-x-0'
            : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3 flex items-center justify-between border-b border-zinc-800/40">
          <button
            onClick={handleCreateNewChat}
            className="flex-1 flex items-center justify-between px-3 py-2 text-sm font-medium text-zinc-200 hover:text-white rounded-lg hover:bg-zinc-800/70 border border-zinc-700/50 transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <Plus className="w-4 h-4 text-zinc-300" />
              <span>Новый чат</span>
            </div>
            <SquarePen className="w-3.5 h-3.5 text-zinc-500" />
          </button>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden ml-2 p-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800"
            aria-label="Закрыть боковую панель"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          <div className="px-2.5 py-1.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Недавние чаты
          </div>

          {chats.map((chat) => {
            const isActive = chat.id === activeChatId;
            return (
              <div
                key={chat.id}
                onClick={() => handleSelectChat(chat.id)}
                className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-zinc-800/90 text-white font-medium'
                    : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                  <MessageSquare
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      isActive ? 'text-zinc-200' : 'text-zinc-500'
                    }`}
                  />
                  <span className="truncate text-xs">{chat.title || 'Новый диалог'}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteChat(chat.id, e)}
                  title="Удалить чат"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-700/60 transition-opacity"
                  aria-label="Удалить"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-400 font-medium">Claw AI</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">{currentModelInfo.shortName}</span>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-[#212121] overflow-hidden min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-12 border-b border-zinc-800/60 px-3 sm:px-4 flex items-center justify-between bg-[#212121]/90 backdrop-blur z-20 flex-shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Sidebar Toggle (Бутерброд выбора чатов) */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
              title={isSidebarOpen ? 'Скрыть панель' : 'Показать историю чатов'}
              aria-label="Меню выбора чатов"
            >
              <PanelLeft className="w-5 h-5" />
            </button>

            {/* Gemini-style Model Selector Dropdown */}
            <div className="relative" ref={modelDropdownRef}>
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 text-zinc-200 transition-colors font-medium text-xs sm:text-sm active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                <span>{currentModelInfo.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {/* Gemini Model Menu Popover */}
              {isModelDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-[#2f2f2f] border border-zinc-700/70 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                    Модель нейросети
                  </div>
                  <div className="space-y-1">
                    {AVAILABLE_MODELS.map((model) => {
                      const isSelected = model.id === selectedModel;
                      return (
                        <button
                          key={model.id}
                          onClick={() => handleSelectModel(model.id)}
                          className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-start justify-between ${
                            isSelected
                              ? 'bg-zinc-700/70 text-white font-medium'
                              : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100'
                          }`}
                        >
                          <div className="space-y-0.5 flex-1 pr-2">
                            <div className="flex items-center space-x-1.5">
                              <span>{model.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-zinc-200" />}
                            </div>
                            <div className="text-[11px] text-zinc-400 leading-tight font-normal">
                              {model.tagline}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e1e1e] text-zinc-400 border border-zinc-700/50 flex-shrink-0">
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

          {/* Quick New Chat Button */}
          <button
            onClick={handleCreateNewChat}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
            title="Новый чат"
            aria-label="Новый чат"
          >
            <SquarePen className="w-5 h-5" />
          </button>
        </header>

        {/* Message Stream Viewport */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6 pt-2 pb-4">
            {(currentChat?.messages && currentChat.messages.length > 0
              ? currentChat.messages
              : [
                  {
                    id: `msg_asst_${currentChat?.id || 'init'}`,
                    role: 'assistant' as const,
                    content: BOT_GREETING,
                    timestamp: currentChat?.createdAt || Date.now(),
                  },
                ]
            ).map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`relative max-w-[90%] sm:max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#2f2f2f] text-white rounded-br-sm'
                        : 'bg-transparent text-zinc-200 pl-0'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans break-words selection:bg-zinc-700">
                      {msg.content}
                    </div>

                    {/* Assistant Info & Copy Button */}
                    {!isUser && (
                      <div className="mt-2 flex items-center space-x-3 text-[11px] text-zinc-500 font-mono">
                        {msg.latencyMs !== undefined && (
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            <span>{msg.latencyMs}ms</span>
                          </span>
                        )}
                        {msg.tokensUsed !== undefined && (
                          <span className="flex items-center space-x-1">
                            <Zap className="w-3 h-3 text-zinc-500" />
                            <span>{msg.tokensUsed} токенов</span>
                          </span>
                        )}

                        <button
                          onClick={() => handleCopyContent(msg.content, msg.id)}
                          className="flex items-center space-x-1 text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded"
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

            {/* Typing / Loading Indicator */}
            {isLoading && (
              <div className="flex items-center space-x-1.5 py-2 pl-1">
                <span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse delay-150" />
                <span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse delay-300" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Bottom Input Area (ChatGPT Style) */}
        <div className="p-3 sm:p-4 bg-[#212121] flex-shrink-0">
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="relative flex items-end bg-[#2f2f2f] rounded-3xl border border-zinc-700/60 focus-within:border-zinc-500 transition-colors px-3 py-2 shadow-md">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Спросите что-нибудь... (Enter для отправки)"
                rows={1}
                disabled={isLoading}
                className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none px-2 py-1 max-h-[180px] leading-relaxed"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className={`p-2 rounded-full transition-all flex-shrink-0 ${
                  input.trim() && !isLoading
                    ? 'bg-white text-zinc-950 hover:bg-zinc-200 active:scale-95'
                    : 'bg-zinc-700/50 text-zinc-500 cursor-not-allowed'
                }`}
                aria-label="Отправить"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="text-center text-[11px] text-zinc-500">
              ИИ может совершать ошибки. Проверяйте важную информацию.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatApp = CommercialChatApp;
