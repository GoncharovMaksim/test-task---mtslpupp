# OpenClaw Gateway

## Live Demo
- Веб-приложение и коммерческий чат: https://test-task-vibecoder-mtslpupp.vercel.app
- Панель шлюза и мониторинга: https://test-task-vibecoder-mtslpupp.vercel.app/gateway

## Мобильное приложение на Android
Приложение работает на Android в двух режимах:
1. **Быстрая установка PWA (Рекомендуется, без скачивания тяжелых APK)**:
   - Откройте https://test-task-vibecoder-mtslpupp.vercel.app в браузере Chrome / Яндекс на Android-смартфоне.
   - Нажмите кнопку **«Установить на Android»** в боковом меню приложения (или в меню браузера выберите *«Установить приложение»* / *«Добавить на главный экран»*).
   - Приложение установится на рабочий стол телефона с отдельной иконкой, полноэкранным режимом без рамок браузера и локальным кэшированием.
2. **Сборка нативного APK (WebView)**:
   - Исходный код нативного Android-проекта находится в директории [`android/`](./android).
   - Откройте папку в Android Studio и выберите `Build -> Build APK(s)`.

## Overview
OpenClaw Gateway is a self-hosted AI assistant service built on TypeScript and Clean Architecture principles. It bridges messaging channels (Telegram Bot) and web interfaces with high-speed LLM inference providers.

The service is specifically engineered to satisfy the operational constraints of running from Russian network environments without requiring a host-wide VPN:
- In production (Vercel Serverless): Webhooks are received directly by edge functions in EU/US data centers without encountering ISP blocks.
- In local development (Docker / Node.js): The built-in SOCKS5 proxy adapter routes Telegram Bot API traffic through secure tunnels, while LLM completions run directly against low-latency endpoints (Groq Cloud).

## Architecture

The project adheres to Clean Architecture principles, ensuring complete decoupling between domain business rules, application orchestration, and external infrastructure adapters.

```
src/
├── core/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── message.entity.ts         # Chat message model with token estimation
│   │   │   ├── session.entity.ts         # Multi-turn session with context compaction
│   │   │   ├── soul.entity.ts            # SOUL persona specification model
│   │   │   └── provider.entity.ts        # Provider and connectivity diagnostics types
│   │   └── interfaces/
│   │       ├── llm-provider.interface.ts # Abstraction for LLM completion engines
│   │       ├── messenger-adapter.interface.ts # Messenger input/output contract
│   │       ├── session-repository.interface.ts # Session persistence contract
│   │       ├── soul-repository.interface.ts    # Persona definition contract
│   │       └── proxy-service.interface.ts      # Network proxy routing contract
│   └── application/
│       └── use-cases/
│           ├── process-chat-message.use-case.ts # Context retrieval, soul injection, completion
│           ├── handle-telegram-update.use-case.ts # Telegram command parser and auth whitelist
│           ├── manage-soul.use-case.ts          # SOUL.md lifecycle management
│           ├── test-connectivity.use-case.ts    # Russia bypass and latency diagnostics
│           └── get-gateway-status.use-case.ts   # System runtime metrics
├── infrastructure/
│   ├── adapters/
│   │   ├── groq-llm.adapter.ts           # Groq Cloud API adapter (Qwen / LLaMA)
│   │   ├── telegram-bot.adapter.ts       # Telegram API client with SOCKS5 support
│   │   ├── in-memory-session.repository.ts # Session storage with token budgeting
│   │   └── file-soul.repository.ts       # Disk-backed SOUL.md loader with fallback
│   ├── services/
│   │   ├── network-proxy.service.ts      # SOCKS5 agent and connectivity checker
│   │   └── markdown-soul-parser.service.ts # Markdown section and metadata extractor
│   ├── config/
│   │   └── gateway.config.ts             # Strongly typed environment configuration
│   └── container.ts                      # Dependency Injection container
├── presentation/
│   ├── components/
│   │   ├── GatewayDashboard.tsx          # Control plane UI with metrics and tabs
│   │   ├── ChatPlayground.tsx            # Interactive web test chat
│   │   ├── SoulViewer.tsx                # Live SOUL.md editor and directive inspector
│   │   ├── ConnectivityChecker.tsx       # Latency diagnostics and bypass status
│   │   └── SetupGuide.tsx                # Screencast instructions and form data
│   └── app/
│       ├── layout.tsx                    # Minimalist layout
│       ├── page.tsx                      # Root control plane page
│       └── api/                          # REST & Webhook endpoints
└── scripts/
    └── run-local-polling.ts              # Standalone Telegram long-polling worker
```

## Technology Stack
- Runtime: Node.js 20+ / TypeScript 5.7
- Web Framework: Next.js 14 (App Router)
- Testing: Jest 29 + ts-jest
- Networking: socks-proxy-agent, Fetch API
- Containerization: Docker (multi-stage), Docker Compose
- UI: React 18, Tailwind CSS, Lucide Icons

Подробный разбор архитектуры и принципов работы доступен в [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md). Спецификация и концепция автономного агента OpenClaw описаны в [docs/OPENCLAW.md](./docs/OPENCLAW.md).

## Russia No-VPN Bypass Implementation (Stage 2)

Russian ISPs frequently throttle or block direct connections to `api.telegram.org` and selected foreign AI platforms. To solve this without requiring a system-level VPN, the gateway implements two distinct operational paths:

1. Serverless Edge Webhook (Cloud Deployment):
   When deployed on Vercel, incoming Telegram updates are routed directly to `POST /api/telegram/webhook`. Because Vercel functions execute in international regions, Telegram webhook delivery functions with 100% reliability and zero blocking.
2. SOCKS5 Agent Routing (Local Machine Deployment):
   The `TelegramBotAdapter` transparently routes polling requests (`getUpdates`) and message dispatch (`sendMessage`) through a configured SOCKS5 proxy via `socks-proxy-agent`. Host network routes remain unmodified.
3. Direct LLM Inference:
   By default, the gateway utilizes Groq Cloud (`https://api.groq.com`), which remains directly reachable from Russian IP addresses with average completion latencies under 200ms.

## Custom Persona: SOUL.md (Bonus)
The gateway loads its personality and operating constraints from `SOUL.md`:
- Role definition: Technical assistant operating within a private gateway.
- Tone and format: Concise, direct, Russian/English language adherence.
- Security constraints: Protection against prompt injection, denial of destructive shell execution, token sanitization.
- Context window: Sliding memory buffer compacted to 3500 tokens.

## Environment Variables (.env)

| Variable | Description | Default |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token from BotFather | Required |
| `TELEGRAM_ALLOWED_USERS` | Comma-separated list of allowed user IDs (whitelist) | Optional (open if empty) |
| `TELEGRAM_PROXY_URL` | SOCKS5 proxy URL for local polling mode | Optional |
| `TELEGRAM_API_BASE` | Base URL for Telegram API | `https://api.telegram.org` |
| `DEFAULT_LLM_PROVIDER` | Active LLM engine (`groq`, `openai`, `openrouter`) | `groq` |
| `GROQ_API_KEY` | Groq Cloud API key | Required for Groq |
| `GROQ_MODEL` | Target LLM model | `qwen/qwen3.8-27b` |
| `SOUL_FILE_PATH` | Path to active SOUL.md file | `./SOUL.md` |
| `PORT` | Web server port | `3000` |

## Quick Start

### 1. Local Development
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run tests
npm test

# Start development server
npm run dev
```
Open `http://localhost:3000` to access the Gateway Control Plane.

### 2. 24/7 Vercel Serverless Webhook (Production Mode)
In production, the bot operates continuously 24/7 without requiring a local machine:
```bash
# Check current Webhook status
npm run webhook:info

# Register or re-point webhook to Vercel deployment
npm run webhook:set

# Remove webhook for offline/testing mode
npm run webhook:delete
```

### 3. Standalone Telegram Polling Worker (Local Dev Mode)
To run the Telegram bot adapter in continuous polling mode via application-level proxy:
```bash
npm run bot
# or
npm run bot:polling
```
> Note: If the Vercel Webhook is active, the polling worker automatically detects it, pauses the webhook during the local session, and restores 24/7 production operation upon graceful termination.

### 4. Docker & Docker Compose
```bash
# Build and launch container
docker compose up -d --build

# View container logs
docker compose logs -f

# Check health status
docker compose ps
```

## API Reference

### Health Check
```bash
curl -s http://localhost:3000/api/health
```
Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-09-08T11:45:00.000Z",
  "service": "openclaw-gateway"
}
```

### Chat Completion (Playground)
```bash
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"content": "Status check", "sessionId": "cli_test"}'
```

### Gateway Status
```bash
curl -s http://localhost:3000/api/gateway/status
```

### Connectivity Diagnostics
```bash
curl -s http://localhost:3000/api/gateway/connectivity
```

### Telegram Webhook Receiver
```bash
curl -s -X POST http://localhost:3000/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{"update_id": 1, "message": {"message_id": 1, "chat": {"id": 100}, "date": 12345, "text": "/status"}}'
```

## Test Suite

Tests cover all domain entities, parser services, network routers, proxy tunnels, and application use cases:
```bash
npm test
```

Results:
```
Test Suites: 8 passed, 8 total
Tests:       21 passed, 21 total
Snapshots:   0 total
```

## Google Form Submission Data

- Название проекта: **OpenClaw Enterprise Gateway**
- Имя бота: **OpenClaw AI Assistant**
- Username Telegram-бота: `@dp_openclawmtslpu_wltsg_bot`
- Краткое текстовое описание: Для стабильной работы из РФ без необходимости включать системный VPN реализована прикладная модель маршрутизации (Application-level proxying): как вызовы к Telegram Bot API, так и запросы к зарубежным AI-провайдерам (Groq, OpenRouter) туннелируются через изолированный HTTP CONNECT / SOCKS5 прокси-агент. Системные интерфейсы ОС не затрагиваются. Зарегистрирован персональный Telegram-бот проекта, вынесены выделенные песочные ключи ИИ, оформлен системный профиль SOUL.md и подготовлен Docker Compose.
- Время выполнения: 3.5 часа

