# Product Content Studio

Next.js app that starts an Orchestra pipeline to draft ecommerce product
descriptions. Copy or download the result, generate another version, or reopen
recent runs from History.

**Live demo:** [ai-product-content-studio-henna.vercel.app](https://ai-product-content-studio-henna.vercel.app/)

## Flow

```mermaid
flowchart LR
    A[Product form] --> B[POST /generate]
    B --> C[Orchestra webhook]
    C --> D[Generate]
    D --> E[Review]
    E --> F[Notify callback]
    F --> G[UI draft + History]
```

1. The form posts product name, category, features, and tone.
2. The server starts the Orchestra pipeline and returns a `runId`.
3. The browser waits on `/api/orchestra/runs/{runId}/wait`.
4. Orchestra runs **Generate → Review → Notify Product Content Studio**.
5. Notify `POST`s the draft to `/api/orchestra/callback` (shared secret).
6. The UI shows the description. History keeps recent `runId`s in an HttpOnly
   cookie and hydrates each run from Orchestra.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui
- React Hook Form + Zod
- Vitest
- Orchestra (start webhook, HTTP callback, per-run Metadata API)

No database and no login.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ORCHESTRA_WEBHOOK_URL` | yes | Pipeline start URL from Orchestra |
| `ORCHESTRA_API_TOKEN` | yes | Bearer token for run status / history |
| `ORCHESTRA_CALLBACK_SECRET` | yes | Shared secret for the Notify HTTP header |
| `ORCHESTRA_REQUEST_TIMEOUT_MS` | no | Outbound timeout (default `15000`) |
| `ORCHESTRA_API_BASE_URL` | no | Default: `https://app.getorchestra.io/api/engine/public` |

## Orchestra Notify task

Pipeline shape for this app: `Generate → Review → Notify Product Content Studio`.

| Field | Value |
|-------|--------|
| Connection Base URL | Your public app URL (e.g. Vercel) |
| Path | `/api/orchestra/callback` |
| Method | `POST` |
| Auth | None (secret is in the header below) |

**Custom headers**

```json
{
  "X-Orchestra-Callback-Secret": "<same value as ORCHESTRA_CALLBACK_SECRET>"
}
```

**JSON body**

```json
{
  "runId": "${{ ORCHESTRA.PIPELINE_RUN_ID }}",
  "description": "${{ ORCHESTRA.PIPELINE_RUN_TASKS['<generate-task-id>'].OUTPUTS['results']['description'] }}",
  "review": {
    "status": "${{ ORCHESTRA.PIPELINE_RUN_TASKS['<review-task-id>'].OUTPUTS['results']['status'] }}",
    "reason": "${{ ORCHESTRA.PIPELINE_RUN_TASKS['<review-task-id>'].OUTPUTS['results']['reason'] }}"
  }
}
```

`npm run dev` is not public — deploy (or use a tunnel) so Notify can reach the callback.

## Deploy on Vercel

```bash
npx vercel login
npx vercel --prod
```

Add the env vars for **Production** and **Preview**, then redeploy. Point the
Orchestra HTTP connection Base URL at your deployment, for example:

`https://ai-product-content-studio-henna.vercel.app`

### Limits

- `/wait` uses `maxDuration = 120`. On Hobby the cap may be lower (~60s). If the
  UI stays on “Generating”, use **Check status**.
- In-memory run cache is per serverless instance — prefer one production URL for demos.
- Workspace-wide `list_pipeline_runs` is not required (it may be disabled).

## API routes

| Method | Path | Role |
|--------|------|------|
| `POST` | `/api/orchestra/generate` | Start pipeline, set history cookie |
| `POST` | `/api/orchestra/callback` | Receive draft + review from Notify |
| `GET` | `/api/orchestra/runs/[runId]/wait` | Wait until draft is ready |
| `GET` | `/api/orchestra/runs/[runId]` | Current run view |
| `GET` | `/api/orchestra/history` | Recent runs hydrated from Orchestra |

Secrets stay on the server. The browser only calls these routes.

## Commands

```bash
npm run dev
npm test
npm run lint
npm run build
npm start
```
