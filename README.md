# Aisle Frontend

Next.js 16 app for the Aisle platform. Runs on **port 8927** in local dev, **port 3001** in production.

---

## Prerequisites

| Requirement | Check |
|---|---|
| Node.js v18+ | `node --version` |
| Aisle backend running | `curl http://localhost:3002/health` |

---

## Local development — first-time setup

### 1. Create the environment file

```bash
cp .env.local.example .env.local
```

If `.env.local.example` doesn't exist, create `.env.local` manually:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002/api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start

```bash
npm run dev
```

Frontend is ready at **http://localhost:8927**

> The backend must be running first. Start it with `npm run start:dev` inside the `backend/` folder, or run everything together from the repo root with `./start.sh`.

---

## Running the full app

From the **repo root**:

```bash
./start.sh
```

| Service | URL |
|---|---|
| Frontend | http://localhost:8927 |
| Backend API | http://localhost:3002 |

---

## Environment variables

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3002/api` |

---

## Production deployment

The frontend is deployed to EC2 via GitHub Actions (`deploy-frontend.yml` / `deploy-frontend-nv.yml`).

**What the pipeline does:**
1. Runs `npm ci` and `npx next build`
2. Injects `NEXT_PUBLIC_API_URL` from GitHub secrets into `.env.production` at build time
3. Zips `.next/`, `public/`, `package.json` and SCP's to EC2
4. PM2 starts the server on **port 3001** (`npm run start -- -p 3001`)
5. `iptables` redirects port 80 → 3001 so the app is reachable without root

**Required GitHub secrets:**

| Secret | Purpose |
|---|---|
| `FE_EC2_HOST` | EC2 instance IP |
| `FE_EC2_USER` | SSH username |
| `FE_EC2_SSH_KEY` | SSH private key |
| `NEXT_PUBLIC_API_URL` | Production backend API URL |

N. Virginia region uses the same secrets prefixed with `NV_`.

---

## Common commands

```bash
npm run dev      # Start dev server on port 8927 with hot reload
npm run build    # Build for production
npm run start    # Start production server (port passed by PM2 in prod)
npm run lint     # Run ESLint
```

---

## Key pages

| Route | Description |
|---|---|
| `/login` | Authentication |
| `/chat` | Chat with AI assistants |
| `/admin/dashboard` | Admin overview |
| `/admin/playground` | Test and tune assistants (admin only) |
| `/admin/analytics` | Usage analytics |
| `/knowledge` | Knowledge base management |
| `/assistants` | Assistant management |
| `/settings` | User settings |

---

## Troubleshooting

**`EADDRINUSE :::8927`**
Something else is on port 8927. Free it:
```bash
lsof -ti :8927 | xargs kill -9
```

**API calls failing / login not working**
Check the backend is running and `NEXT_PUBLIC_API_URL` in `.env.local` points to it:
```bash
curl http://localhost:3002/health
# should return {"status":"ok"}
```

**Warning: "Next.js inferred your workspace root"**
Harmless — caused by multiple `package-lock.json` files in the monorepo. Ignore it.
