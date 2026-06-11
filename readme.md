# Workflow Execution Engine

A lightweight workflow execution microservice designed to power an n8n-style automation platform.

This service focuses on executing workflows, not building them.

## What It Does

- Executes DAG-based workflows with PostgreSQL persistence
- Exposes a REST API for workflow CRUD and execution
- Runs tasks when dependencies are satisfied (parallel where possible)
- Propagates workflow input and upstream task outputs into downstream tasks
- Handles retries with delay and blocks downstream tasks on terminal failure
- Tracks per-task execution state

## Core Concepts

- **Workflow**: A Directed Acyclic Graph (DAG) stored in PostgreSQL
- **Task**: A node with a registered `type` (e.g. `IO_ECHO`, `SEND_EMAIL`)
- **Dependencies**: Directed edges between tasks
- **Execution**: A single run of a workflow with optional input payload

## Task States

### Non-terminal

- `PENDING`
- `RUNNING`
- `RETRYING`

### Terminal

- `COMPLETED`
- `FAILED` (after retries exhausted)
- `BLOCKED` (dependency terminally failed)

`BLOCKED` is terminal — downstream tasks are marked unreachable once an upstream task permanently fails.

## Registered Task Types

| Type | Description |
|------|-------------|
| `IO_ECHO` | Debug task; echoes resolved input and optional `config.emit` output |
| `SEND_EMAIL` | Sends email via Gmail/nodemailer (`EMAIL_USER`, `EMAIL_PASS`) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/workflows` | Create workflow |
| `GET` | `/api/workflows` | List workflows |
| `GET` | `/api/workflows/:id` | Get workflow with tasks and dependencies |
| `POST` | `/api/workflows/:id/run` | Trigger execution (body = workflow input) |
| `GET` | `/api/workflows/:id/executions` | List executions for a workflow |
| `GET` | `/api/workflows/executions/:executionId` | Get execution details |

## Getting Started

```bash
cp .env.example .env
# Edit DATABASE_URL, then:
npm install
npm run db:migrate
npm run db:seed   # optional demo workflow
npm start
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Start HTTP server |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed demo IO_ECHO pipeline |
| `npm run test:io` | Manual IO propagation checks (requires DB) |

## Work in Progress

- Additional node types (HTTP, delay, condition)
- Formal test suite (Jest/Vitest)
- Integration with a visual workflow editor
- Dedicated worker process (executor currently runs in-process on trigger)

## Inspiration

- n8n
- Workflow automation engines
- DAG-based schedulers
