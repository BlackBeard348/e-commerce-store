# e-commerce-store

MERN MVP for an e-commerce app using a Vite React SPA, Express API, and MongoDB.

## Prerequisites

- Node.js 22+
- npm 10+
- Docker Desktop

## Setup

```bash
npm install
npm --prefix client install
npm --prefix server install
```

## Environment

Server env template: `server/.env.example`

```bash
cp server/.env.example server/.env
```

## Docker Compose (web + api + mongodb)

```bash
docker compose up --build
```

- Web: `http://localhost:5173`
- API: `http://localhost:5050`
- MongoDB: `localhost:27018`

## Seed deterministic catalog (~1,000 products)

```bash
npm run seed
```

## Run locally without Docker

```bash
docker compose up -d mongo
npm run seed
npm run dev
```

## Current API endpoints

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/password/forgot`
- `POST /api/auth/password/reset`
- `GET /api/auth/me`

### Products

- `GET /api/products`
- `GET /api/products/categories`
- `GET /api/products/:id`

### Cart

- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:productId`
- `DELETE /api/cart/items/:productId`

### Checkout and webhooks

- `POST /api/checkout` (requires auth + `Idempotency-Key`)
- `POST /api/webhooks/payment`

### Orders

- `GET /api/orders`
- `GET /api/orders/:id`

## Quality checks

```bash
npm run lint
npm run build
```

## Progress tracking

Requirement-by-requirement status is tracked in `IMPLEMENTATION_CHECKLIST.md`.
