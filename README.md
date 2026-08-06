# Northstar Ops

A calm operating console for small teams: sign in, track weekly work as workflows, upload PDFs for AI-assisted extraction (title, summary, dates, obligations, risk level), and manage who's on your team.

## Live demo

**[https://uw752r62ktlsxq8p4y72rq97.89.167.4.27.sslip.io](https://uw752r62ktlsxq8p4y72rq97.89.167.4.27.sslip.io)**

Sign up with any email/password to get your own organisation, or ask for demo credentials to sign in directly — those are shared separately (not in this file, since this repo is public).

## Requirements

- Node.js 24
- Docker (for a local Postgres instance)
- An OpenAI API key (only needed for the document-extraction feature — everything else works without one)

## Local setup

```bash
npm ci
cp .env.example .env
```

Fill in `.env`:
- `BETTER_AUTH_SECRET` — generate one with `openssl rand -base64 32`
- `OPENAI_API_KEY` — only required to test document upload/extraction; leave as-is otherwise
- Everything else has a working local default already

Start Postgres, apply migrations, and seed a demo account:

```bash
docker compose up -d
npm run db:deploy
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with:

| | |
|---|---|
| Email | `demo@example.com` |
| Password | `demo-password-123` |

This account only exists on your local database — it's not a real credential for anything live, so it's safe to publish here. `npm run db:seed` is idempotent; re-run it any time.

Background document processing uses Inngest. For local dev, set `INNGEST_DEV=1` (already the `.env.example` default) and run its dev server alongside the app:

```bash
npx inngest-cli@latest dev
```

The Inngest dev UI is at [http://localhost:8288](http://localhost:8288).

## Development commands

```bash
npm run dev        # Start the dev server
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest
npm run build      # Production build
npm run start      # Start the production server after a build

npm run db:migrate # Create + apply a new migration (dev)
npm run db:deploy  # Apply pending migrations (matches what the Docker image runs on boot)
npm run db:seed    # Create/verify the local demo account
```

Before opening a PR, this should all pass:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## Docker

The `Dockerfile` builds a standalone production image and runs `prisma migrate deploy` automatically on container start — no separate migration step needed in production. It expects `DATABASE_URL` (and the other vars in `.env.example`) as environment variables, not baked into the image.

```bash
docker build -t northstar-ops .
docker run --rm -p 3000:3000 --env-file .env northstar-ops
```

`docker-compose.yml` in this repo only runs Postgres, for local development — it's not used for deploying the app itself. In production (Coolify), the app container and a managed Postgres instance are configured separately; see `Deployment-Documentation.md` in the companion `Introduction-project` repo for the actual deployment setup.

## Project structure

- `app/` — routes and UI (App Router). `app/dashboard/` is the authenticated area; `app/(auth)/` is sign-in/up.
- `lib/` — server-side logic: auth, Prisma access, workflow/document/organisation business logic, validation.
- `prisma/` — schema and migrations.
- `scripts/seed-demo.ts` — local-only demo data.

Each major feature has its own write-up in the `Introduction-project` repo (`Authentication-Documentation.md`, `Background-Jobs-Documentation.md`, `Organisations-Documentation.md`, and equivalents for workflows and document extraction) — those cover the *why* behind each feature; this README covers only how to run it.
