# Automation Playground

Template-driven UI for the [Workflow Execution Engine](../readme.md).

Pick a portfolio template, configure inputs, queue a run, and watch the live task timeline poll execution status from the engine API.

## Setup

```bash
cp .env.example .env
npm install
```

Ensure the engine API and worker are running from the repo root:

```bash
npm start
npm run worker
```

## Development

```bash
npm run dev
```

Open http://localhost:5173

Vite proxies `/api` to `http://localhost:3000` during development.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_ENGINE_URL` | `""` (use proxy) | Engine base URL for production builds |
| `VITE_API_KEY` | — | Sent as `X-API-Key` when engine `API_KEY` is set |
