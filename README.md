# e-commerce-store

MERN starter project with a Vite React client, Express/Mongoose server, and local MongoDB via Docker.

## Prerequisites

- Node.js 22+
- npm 10+
- Docker Desktop

## Setup

```bash
npm install
npm --prefix client install
npm --prefix server install
docker compose up -d
```

## Run

```bash
npm run dev
```

Client runs on `http://localhost:5173` and server on `http://localhost:5050`.
MongoDB runs on host port `27018` (container `27017`).

## Health Check

```bash
curl http://localhost:5050/health
```

## Lint

```bash
npm run lint
```
