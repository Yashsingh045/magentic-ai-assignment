# AI Customer Support SaaS

A **multi-tenant AI customer support platform**. A business registers, uploads its
knowledge base (PDF / DOCX / TXT / Markdown), configures an AI chatbot, and embeds
a chat widget on its website. The AI answers customer questions via **RAG** over
that business's own documents, auto-creates support tickets when it can't resolve a
query, and escalates urgent issues to humans. Admins get dashboards, conversation
history, ticket management, and analytics.

Every business (an **Organization**) is fully isolated — its own documents, bot,
conversations, tickets, and analytics. No cross-tenant access, ever.

---

## Architecture

Separately deployed **backend** and **frontend** that share one database. The
frontend talks to the backend over HTTPS REST; the embeddable widget calls the
backend's public chat endpoint directly using the org's public API key.

```mermaid
flowchart LR
  subgraph Browser
    Admin["Admin Portal<br/>(authenticated)"]
    Widget["Chat Widget<br/>(widget.js → iframe)"]
  end

  subgraph Vercel["Frontend · Vercel"]
    Next["Next.js 14<br/>App Router + Tailwind"]
  end

  subgraph Render["Backend · Render"]
    API["Express 5 REST API<br/>Prisma · JWT · Zod · RBAC"]
  end

  DB[("Neon Postgres<br/>+ pgvector")]
  OpenAI["OpenAI API<br/>embeddings · chat"]

  Admin -->|loads UI| Next
  Widget -->|served by| Next
  Next -->|"HTTPS REST + JWT (Bearer)"| API
  Widget -->|"POST /chat + x-api-key"| API
  API -->|Prisma ORM| DB
  API -->|"text-embedding-3-small<br/>gpt-4o-mini"| OpenAI
```

**Multi-tenancy:** every tenant-owned row carries an `organizationId`. Auth
middleware derives the org from the signed JWT (admin) or the `publicApiKey`
(widget), and every query is scoped to it.

**RAG flow (`POST /chat`):** embed the query → pgvector top-K similarity search
over the org's chunks → build a BotConfig-driven prompt grounded in the retrieved
context → stream the OpenAI reply → persist messages → run the escalation check →
return rich content + suggested questions.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| **Backend** | Express 5 · TypeScript · Prisma ORM · PostgreSQL + pgvector · JWT (access + refresh) · bcrypt · RBAC (ADMIN / AGENT) · Zod · helmet · CORS · express-rate-limit · multer |
| **Frontend** | Next.js 14 (App Router) · TypeScript · Tailwind CSS · axios (auth interceptors) · React Context (auth state) · react-markdown |
| **AI** | OpenAI — `text-embedding-3-small` (embeddings), `gpt-4o-mini` (chat) |
| **Vector store** | pgvector (HNSW index, cosine) in the same Postgres database |
| **Database** | Neon (Postgres + pgvector) |
| **Hosting** | Backend → Render · Frontend → Vercel |

---

## Monorepo layout

```
repo-root/
├── backend/              # Express 5 + TypeScript REST API
│   ├── prisma/
│   │   ├── schema.prisma  # data model (Organization, User, Document, …)
│   │   ├── migrations/    # incl. pgvector extension + HNSW index
│   │   └── seed.ts        # demo data (one-command)
│   └── src/
│       ├── config/        # env (Zod-validated), db
│       ├── lib/           # prisma, openai, pgvector helpers
│       ├── middleware/    # auth, rbac, tenant, validate, error, rateLimit, upload
│       ├── schemas/       # Zod request schemas
│       ├── services/      # auth, chat (RAG), indexing, embedding, escalation, …
│       ├── controllers/   # thin HTTP handlers
│       ├── routes/        # /api feature routers
│       ├── types/         # shared types (chat rich content, express augmentation)
│       ├── app.ts         # middleware pipeline
│       └── server.ts      # bootstrap + graceful shutdown
├── frontend/             # Next.js 14 admin portal + chat widget
│   ├── public/widget.js   # embeddable loader script
│   └── src/
│       ├── app/
│       │   ├── (auth)/        # /login, /register, /forgot-password, /reset-password
│       │   ├── (protected)/   # /dashboard, /knowledge-base, /ai-config,
│       │   │                  #   /conversations, /tickets, /escalations, /analytics
│       │   └── widget/        # standalone embeddable widget page
│       ├── components/    # UI kit, sidebar/topbar, widget, tickets, config
│       └── lib/           # api client, auth context, types, formatters
├── CLAUDE.md             # working notes / architecture reference
└── README.md
```

Each app has its own `package.json` and `node_modules` and deploys
independently — the root is intentionally **not** an npm workspace.

---

## Local setup

**Prerequisites:** Node.js 20+ and a Postgres database with the `pgvector`
extension available (a free [Neon](https://neon.tech) project works out of the box).

### 1. Backend (`backend/`)

```bash
cd backend
npm install

cp .env.example .env          # then fill in the values (see below)

npm run prisma:generate       # generate the Prisma client
npm run prisma:deploy         # apply migrations (creates tables + pgvector + HNSW index)
npm run seed                  # optional: load demo data (see "Demo data")

npm run dev                   # → http://localhost:4000  (health: /api/health)
```

> Migrations run over `DIRECT_URL` (the **non-pooled** Neon endpoint). If it's left
> as the placeholder you'll get `P1001 … host:5432`.

### 2. Frontend (`frontend/`)

```bash
cd frontend
npm install

cp .env.example .env.local    # set NEXT_PUBLIC_API_URL=http://localhost:4000

npm run dev                   # → http://localhost:3000
```

Open <http://localhost:3000>, register an organization (or use the demo login
below), and you're in.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | **Pooled** Neon connection string (PgBouncer) used at runtime. |
| `DIRECT_URL` | ✅ | **Direct (non-pooled)** connection string — used by Prisma Migrate for DDL. Same endpoint without `-pooler` and without the `pgbouncer` param. |
| `JWT_SECRET` | ✅ | Secret for signing **access** tokens (≥ 16 chars). |
| `JWT_REFRESH_SECRET` | ✅ | Secret for signing **refresh** tokens (≥ 16 chars, different from above). |
| `OPENAI_API_KEY` | ✅ | OpenAI API key (embeddings + chat). |
| `FRONTEND_URL` | ✅ | Admin portal origin, used for the CORS allow-list (e.g. `http://localhost:3000`). |
| `PORT` | — | API port (default `4000`). |

```dotenv
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require"
JWT_SECRET="replace-with-a-long-random-string"
JWT_REFRESH_SECRET="replace-with-a-different-long-random-string"
OPENAI_API_KEY="sk-..."
FRONTEND_URL="http://localhost:3000"
PORT=4000
```

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | ✅ | Base URL of the backend API, **no trailing slash** (the client appends `/api`). Inlined into the browser bundle at build time, so it must be set before `next build`. |

```dotenv
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

---

## Demo data

`npm run seed` (in `backend/`) loads a ready-to-explore tenant. It's idempotent —
re-running replaces the prior demo org.

| | |
| --- | --- |
| **Admin login** | `admin@demo.com` / `demopassword` |
| **Widget key** | `pk_demo_acme_123` |
| **Widget demo** | `http://localhost:3000/widget?key=pk_demo_acme_123` |

It creates an organization with a 4-document knowledge base (orders, pricing,
refund policy, support), a customized bot, and sample conversations, tickets, and
escalations so every admin page has data.

> Embeddings require OpenAI. If the key is missing or out of quota, the seed falls
> back to deterministic local vectors so it still completes (semantic search needs
> a working key).

---

## REST API (prefix `/api`)

| Group | Endpoints |
| --- | --- |
| **Auth** (public) | `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/forgot-password` · `POST /auth/reset-password` · `GET /auth/me` |
| **Dashboard** | `GET /dashboard/stats` |
| **Knowledge base** | `POST /documents` · `GET /documents` · `DELETE /documents/:id` · `POST /documents/reindex` |
| **Bot config** | `GET /config` · `PUT /config` |
| **Chat** (public widget) | `POST /chat` · `GET /chat/config` — authed by `publicApiKey` (`x-api-key`), rate-limited |
| **Conversations** | `GET /conversations` (search + pagination) · `GET /conversations/:id` |
| **Tickets** | `GET /tickets` · `POST /tickets` · `PATCH /tickets/:id` |
| **Escalations** | `GET /escalations` (grouped by priority) |
| **Analytics** | `GET /analytics` |

All routes except `/auth/*` and the public `/chat` endpoints require a JWT and are
org-scoped.

---

## Embeddable widget

Add the chat widget to any website with a single script tag:

```html
<script
  src="https://<your-frontend-domain>/widget.js"
  data-org-key="YOUR_PUBLIC_API_KEY">
</script>
```

The loader injects an isolated iframe (`/widget?embed=1&key=...`) in the bottom-right
corner. The `publicApiKey` is safe to expose publicly — it only allows chatting with
that org's bot and is rate-limited.

---

## Deployment

- **Backend → Render:** build `npm install && npm run build`, start `npm start`.
  Set all backend env vars; run `npm run prisma:deploy` as a release/build step.
- **Frontend → Vercel:** root directory `frontend/`. Set `NEXT_PUBLIC_API_URL` to
  the deployed backend URL (build-time). After the backend is up, set the backend's
  `FRONTEND_URL` to the Vercel domain for CORS.
- **Database:** a single Neon Postgres project (with `pgvector`) shared by both.
