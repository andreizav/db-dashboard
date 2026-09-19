# DB Dashboard — Enterprise Database & Infrastructure Management Suite

[![Next.js](https://img.shields.io/badge/Next.js-15.0.0-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_Search-DC2626?style=for-the-badge&logo=qdrant&logoColor=white)](https://qdrant.tech/)
[![OrbStack](https://img.shields.io/badge/OrbStack-Dev_Infra-000000?style=for-the-badge&logo=docker&logoColor=white)](https://orbstack.dev/)

Современная, быстрая и безопасная панель управления базами данных и сервисами локальной инфраструктуры разработчика (**PostgreSQL** с расширением `pgvector`, **Redis**, **Qdrant Vector Search**), а также автоматический сканер проектов рабочего окружения. Построена на стеке **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS** и **SWR**.

---

## 📑 Содержание

- [Ключевые возможности](#-ключевые-возможности)
- [Технологический стек](#-технологический-стек)
- [Архитектурная диаграмма системы (Mermaid)](#-архитектурная-диаграмма-системы-mermaid)
- [Быстрый старт и установка](#-быстрый-старт-и-установка)
- [Доступные команды (Scripts)](#-доступные-команды-scripts)
- [Структура проекта и архитектура компонентов](#-структура-проекта-и-архитектура-компонентов)
- [Спецификация API Endpoints](#-спецификация-api-endpoints)
- [Система безопасности и защита от потери данных](#-система-безопасности-и-защита-от-потери-данных)
- [Дерево файлов проекта](#-дерево-файлов-проекта)
- [Лицензия](#-лицензия)

---

## 🚀 Ключевые возможности

- 🔍 **Автоматическое обнаружение проектов и баз данных (Project Scanner)**:
  - Рекурсивный сканер каталогов (`/Development/projects`, `/Development/playground`).
  - Парсинг файлов конфигураций: `.env`, `.env.*`, `database.py`, `models.py`, `settings.py`, `schema.prisma`, `docker-compose.yml` и конфигураций ORM (Drizzle, Knex).
  - Определение используемых сервисов: PostgreSQL, Redis, Qdrant, Prisma, FastAPI, Next.js.
- 🐘 **Комплексный менеджер PostgreSQL**:
  - Мониторинг всех обнаруженных баз данных, их размеров, количества таблиц и расширений (включая `pgvector`).
  - Группированный просмотр таблиц с переключением между всеми базами (`all`) или конкретной базой данных.
  - Полнофункциональный просмотрщик данных таблиц (**Table Data Inspector**) с постраничной навигацией (пагинацией).
  - Полноценный **CRUD**:
    - Добавление новых строк (`Insert Record`).
    - Редактирование существующих строк (`Update Row`) с автоматическим определением первичного ключа (`PK`).
    - Удаление строк (`Delete Row`).
    - Очистка таблиц (`TRUNCATE TABLE ... CASCADE`).
    - Удаление таблиц (`DROP TABLE ... CASCADE`).
    - Удаление пользовательских баз данных (`DROP DATABASE`).
  - Экспорт данных таблицы в форматы **CSV**, **JSON** и **SQL (INSERT-скрипты)**.
- ⚡ **Мониторинг Redis**:
  - Статус подключения и задержка (latency ping).
  - Количество активных подключений, потребляемая память (`used_memory_human`), время работы (uptime), общее количество ключей по всем `db*`.
- 🎯 **Управление Qdrant Vector Search**:
  - Проверка доступности векторной базы и времени отклика.
  - Список коллекций, подсчет векторов (`points_count`), размерность векторов (`vectorSize`) и метрика расстояния (`Cosine`, `Dot`, `Euclid`).
- 🛡 **Безопасность и подтверждение деструктивных действий**:
  - Защита системных баз (`postgres`, `template0`, `template1`) от случайного удаления.
  - Двухфакторное модальное подтверждение с вводом точного имени удаляемого ресурса для деструктивных операций.
  - Валидация SQL-идентификаторов (защита от SQL Injection) и параметризованные запросы через `pg.Pool`.

---

## 🛠 Технологический стек

| Категория | Библиотека / Инструмент | Версия | Назначение |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router, Turbopack) | `^15.0.0` | Серверный рендеринг, API-роуты, сборка |
| **Frontend Core** | React / React DOM | `^18.2.0` | Компонентный интерфейс |
| **Language** | TypeScript | `^5.5.2` | Строгая типизация данных и схем |
| **Styling** | Tailwind CSS / PostCSS / Autoprefixer | `^3.4.1` | Utility-first стилизация, Glassmorphism, Dark Mode |
| **State & Cache** | SWR | `^2.2.5` | Реактивная синхронизация и кэширование запросов |
| **Icons** | Lucide React | `^0.363.0` | Векторная библиотека системных иконок |
| **PostgreSQL** | `pg` (node-postgres) | `^8.12.0` | Клиент пула подключений к PostgreSQL |
| **Redis** | `ioredis` | `^5.4.1` | Высокопроизводительный асинхронный клиент Redis |
| **Vector DB** | `@qdrant/js-client-rest` | `^1.8.0` | Официальный REST-клиент для Qdrant |
| **Environment** | OrbStack (macOS) | Native | Локальная инфраструктура контейнеров и сервисов |

---

## 🗺 Архитектурная диаграмма системы (Mermaid)

```mermaid
graph TD
    Client[Browser Client: Next.js UI] -->|HTTP / SWR| API[Next.js API Routes /api/*]

    subgraph PresentationLayer["Presentation Layer (src/components)"]
        Header[Header.tsx]
        Overview[StatusCard.tsx & Overview Page]
        Postgres[PostgresView.tsx]
        TableModal[TableDataModal.tsx]
        RowModal[RowEditModal.tsx]
        ConfirmModal[ConfirmationModal.tsx]
        Redis[RedisView.tsx]
        Qdrant[QdrantView.tsx]
        Projects[ProjectsView.tsx]
    end

    subgraph ServiceLayer["Service & Discovery Layer (src/lib)"]
        Scanner[project-scanner.ts]
        PgLib[postgres.ts - Dynamic Pool Manager]
        RedisLib[redis.ts - IORedis Client]
        QdrantLib[qdrant.ts - REST Client]
    end

    subgraph InfrastructureLayer["Local Infrastructure (OrbStack)"]
        PG[(PostgreSQL :5432)]
        RD[(Redis :6379)]
        QD[(Qdrant :6333)]
        FS[(Local File System: Projects & Configs)]
    end

    API --> Scanner
    API --> PgLib
    API --> RedisLib
    API --> QdrantLib

    Scanner -->|Read & Parse Configs| FS
    PgLib -->|Parameterized SQL| PG
    RedisLib -->|PING / INFO| RD
    QdrantLib -->|REST Collections API| QD
```

---

## ⚡ Быстрый старт и установка

### 1. Требования к окружению
Убедитесь, что на вашей машине развернуты и запущены локальные сервисы разработки (по умолчанию через **OrbStack**):
- **PostgreSQL** (с `pgvector`): `localhost:5432`, пользователь `postgres`, пароль `postgrespassword`
- **Redis**: `localhost:6379`
- **Qdrant**: `http://localhost:6333`
- **Node.js**: `>= 20.x`
- **Пакетный менеджер**: `pnpm`

### 2. Клонирование и установка зависимостей
```bash
git clone https://github.com/andreizav/db-dashboard.git
cd db-dashboard
pnpm install
```

### 3. Настройка переменных окружения
Скопируйте файл с примером настроек:
```bash
cp .env.example .env.local
```

Параметры по умолчанию в `.env.local`:
```env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/postgres"
REDIS_URL="redis://localhost:6379"
QDRANT_URL="http://localhost:6333"
PROJECTS_DIR="/Users/andrey/Development/projects,/Users/andrey/Development/playground"
```

### 4. Запуск сервера разработки
```bash
pnpm run dev
```
После запуска откройте в браузере: **[http://localhost:3001](http://localhost:3001)**

---

## 📜 Доступные команды (Scripts)

| Команда | Описание |
| :--- | :--- |
| `pnpm run dev` | Запуск сервера разработки с поддержкой Turbopack на порту `3001` |
| `pnpm run build` | Оптимизированная сборка проекта для production |
| `pnpm run start` | Запуск собранного production-сервера |
| `pnpm run lint` | Запуск линтера ESLint для проверки качества кода |

---

## 🏛 Структура проекта и архитектура компонентов

```
db-dashboard/
├── .env.example                  # Шаблон локальных переменных окружения
├── .gitignore                    # Игнорируемые файлы и артефакты сборки
├── package.json                  # Манифест зависимостей и скриптов
├── tsconfig.json                 # Конфигурация компилятора TypeScript
├── tailwind.config.ts            # Конфигурация Tailwind CSS
├── next.config.ts                # Конфигурация Next.js
├── src/
│   ├── app/                      # Next.js App Router (страницы и API)
│   │   ├── layout.tsx            # Корневой макет с Header и фоном
│   │   ├── page.tsx              # Главный экран (Overview)
│   │   ├── postgres/page.tsx     # Страница управления PostgreSQL
│   │   ├── redis/page.tsx        # Страница аналитики Redis
│   │   ├── qdrant/page.tsx       # Страница коллекций Qdrant
│   │   ├── projects/page.tsx     # Экран обнаруженных проектов
│   │   └── api/                  # Серверные эндпоинты
│   │       ├── status/route.ts   # Комплексный статус здоровья сервисов
│   │       ├── postgres/         # API для PostgreSQL
│   │       │   ├── route.ts      # Список баз, таблиц и расширений
│   │       │   ├── data/route.ts # CRUD операции со строками таблиц
│   │       │   └── database/route.ts # Управление базами (Drop DB)
│   │       ├── redis/route.ts    # Метрики Redis
│   │       ├── qdrant/route.ts   # Инспекция коллекций Qdrant
│   │       └── projects/route.ts # Результаты работы сканера проектов
│   ├── components/               # UI-компоненты
│   │   ├── Header.tsx            # Навигационная шапка с индикацией страниц
│   │   ├── StatusCard.tsx        # Карточки статуса сервисов на главной
│   │   ├── PostgresView.tsx      # Основной интерфейс PostgreSQL
│   │   ├── TableDataModal.tsx    # Модальное окно просмотра/экспорта данных таблицы
│   │   ├── RowEditModal.tsx      # Модальное окно создания/редактирования строк
│   │   ├── ConfirmationModal.tsx # Окно подтверждения деструктивных действий
│   │   ├── RedisView.tsx         # Дашборд параметров Redis
│   │   ├── QdrantView.tsx        # Просмотрщик коллекций Qdrant
│   │   └── ProjectsView.tsx      # Список проектов с бейджами сервисов
│   ├── lib/                      # Бизнес-логика и клиенты БД
│   │   ├── postgres.ts           # Менеджер пулов соединений и SQL-запросы
│   │   ├── redis.ts              # Клиент IORedis и парсер INFO
│   │   ├── qdrant.ts             # REST-клиент Qdrant
│   │   └── project-scanner.ts    # Сканер конфигураций проектов
│   └── styles/
│       └── globals.css           # Базовые стили и Glassmorphism utility
```

---

## 📡 Спецификация API Endpoints

### 1. Системный статус
- `GET /api/status`: Возвращает статус доступности, время отклика (latency) и количество ресурсов по каждому сервису (PostgreSQL, Redis, Qdrant).

### 2. PostgreSQL
- `GET /api/postgres?db={dbName}`: Возвращает список баз данных, таблицы выбранной базы (или всех при `db=all`), список расширений и флаг наличия `pgvector`.
- `DELETE /api/postgres?database={db}&schema={schema}&table={table}`: Удаляет таблицу (`DROP TABLE ... CASCADE`).
- `POST /api/postgres?action=truncate`: Очищает таблицу (`TRUNCATE TABLE ... CASCADE`).
- `DELETE /api/postgres/database?name={dbName}`: Завершает активные сессии к базе и удаляет её (`DROP DATABASE`).
- `GET /api/postgres/data?db={db}&schema={schema}&table={table}&limit={n}&offset={m}`: Возвращает метаданные колонок, первичный ключ и пагинированные строки.
- `POST /api/postgres/data`: Добавляет новую запись в указанную таблицу.
- `PUT /api/postgres/data`: Обновляет поля строки по первичному ключу.
- `DELETE /api/postgres/data`: Удаляет строку по первичному ключу.

### 3. Redis & Qdrant
- `GET /api/redis`: Возвращает распарсенные метрики Redis (память, аптайм, клиенты, ключи).
- `GET /api/qdrant`: Возвращает список коллекций, количество векторов, размерность и функции расстояния.

### 4. Сканер проектов
- `GET /api/projects`: Запускает фоновое сканирование настроенных директорий и возвращает структуру найденных проектов с привязкой к базам данных и портам.

---

## 🛡 Система безопасности и защита от потери данных

1. **Защита от случайного удаления**:
   - Любое удаление таблицы или базы данных сопровождается открытием окна `ConfirmationModal`.
   - Для подтверждения удаления базы данных требуется ввести её точное имя.
   - Системные базы `postgres`, `template0` и `template1` аппаратно защищены на уровне бэкенда — попытка их удаления вернет HTTP 400.
2. **Защита от SQL-инъекций**:
   - Все имена схем, таблиц и колонок проходят строгую валидацию через регулярное выражение `^[a-zA-Z0-9_]+$`.
   - Значения фильтров, условий и обновляемых полей передаются исключительно через параметризованные запросы `$1, $2, ...` драйвера `pg`.
3. **Изоляция пулов подключений**:
   - Пул `pg.Pool` для каждой отдельной базы данных создается с ограничением `max: 5` и автоматически закрывается при удалении базы или простое.

---

## 📂 Дерево файлов проекта

```
.
├── .env.example
├── .gitignore
├── AI_INSTRUCTIONS.md
├── LTEMPLATE_REFERENCE.md
├── README.md
├── next-env.d.ts
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── src
    ├── app
    │   ├── api
    │   │   ├── postgres
    │   │   │   ├── data
    │   │   │   │   └── route.ts
    │   │   │   ├── database
    │   │   │   │   └── route.ts
    │   │   │   └── route.ts
    │   │   ├── projects
    │   │   │   └── route.ts
    │   │   ├── qdrant
    │   │   │   └── route.ts
    │   │   ├── redis
    │   │   │   └── route.ts
    │   │   └── status
    │   │       └── route.ts
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── postgres
    │   │   └── page.tsx
    │   ├── projects
    │   │   └── page.tsx
    │   ├── qdrant
    │   │   └── page.tsx
    │   └── redis
    │       └── page.tsx
    ├── components
    │   ├── ConfirmationModal.tsx
    │   ├── Header.tsx
    │   ├── PostgresView.tsx
    │   ├── ProjectsView.tsx
    │   ├── QdrantView.tsx
    │   ├── RedisView.tsx
    │   ├── RowEditModal.tsx
    │   ├── StatusCard.tsx
    │   └── TableDataModal.tsx
    ├── lib
    │   ├── postgres.ts
    │   ├── project-scanner.ts
    │   ├── qdrant.ts
    │   └── redis.ts
    └── styles
        └── globals.css
```

---

## 📄 Лицензия

MIT License © 2026 Andrey Zavoznenko
