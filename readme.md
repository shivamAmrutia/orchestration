# ⚙️ Workflow Execution Engine

A lightweight workflow execution microservice designed to power an n8n-style automation platform.

This service focuses purely on executing workflows, not building them.

## 🚀 What It Does

- Executes DAG-based workflows
- Runs tasks only when dependencies are satisfied
- Handles retries with delay
- Propagates terminal failures
- Tracks per-task execution state

Think of it as the engine behind a visual automation tool.

## 🧠 Core Concepts

- **Workflow**: A Directed Acyclic Graph (DAG)
- **Task**: A node in the workflow
- **Dependencies**: Edges between tasks
- **Retries**: Scheduled re-executions on failure

## 🔄 Task States

### Non-terminal

- `PENDING`
- `RUNNING`
- `RETRYING`

### Terminal

- `COMPLETED`
- `FAILED` (after retries exhausted)
- `BLOCKED` (dependency terminally failed)

`BLOCKED` is terminal by design — downstream tasks are unreachable once a dependency has permanently failed.

## 🧩 Execution Semantics

- Tasks run only when all dependencies are completed
- Retries are delayed and bounded
- A terminal failure blocks downstream tasks
- Workflow completes when all tasks reach terminal states

## 🏗️ Intended Use

This project is designed to act as:

- a microservice
- the execution layer for a visual workflow builder
- a backend component for an n8n-like automation platform

UI, workflow design, and compilation are intentionally out of scope.

## ✨ Inspiration

- n8n
- Workflow automation engines
- DAG-based schedulers

## 📈 Work in Progress

- Persistent execution storage
- REST API
- Parallel task execution
- Node types (HTTP, delay, condition)
- Integration with a visual workflow editor
