# ShortURL - Enterprise URL Shortener & Analytics Platform

[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue)]()
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed)]()
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-326CE5)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6)]()
[![Node](https://img.shields.io/badge/Node-18-339933)]()

A production-grade URL shortener and analytics platform inspired by Bitly, built with Node.js, TypeScript, Express.js, PostgreSQL, Redis, and React. Features horizontal scalability, real-time analytics, QR code generation, and comprehensive click tracking.

## Features
- ✂️ URL Shortening with custom aliases
- 📊 Real-time Analytics Dashboard
- 🌍 Geo-location & Device Analytics
- 📱 QR Code Generation
- 🔐 User Authentication (JWT + API Keys)
- 🚦 Rate Limiting & Security
- ⏰ Link Expiration & Password Protection
- 👑 Admin Dashboard
- 📈 Interactive Graphs & Charts
- 🚀 Horizontally Scalable Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, TypeScript, Express.js |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Queue | Bull (Redis-backed) |
| Proxy | Nginx |
| Container | Docker, Docker Compose |
| Orchestration | Kubernetes |
| CI/CD | GitHub Actions |
| Charts | Recharts |
| Maps | Leaflet |

## System Architecture

```
                    ┌──────────────┐
                    │   Client     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   Nginx LB   │
                    │  (Reverse    │
                    │   Proxy)     │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼───┐ ┌──────▼──────┐
       │  Frontend   │ │ API  │ │   Redirect   │
       │  (React)    │ │Server│ │   Server     │
       └──────┬──────┘ └──┬───┘ └──────┬──────┘
              │            │            │
              └────────────┼────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼───┐ ┌──────▼──────┐
       │ PostgreSQL  │ │Redis │ │   Bull      │
       │  (Primary)  │ │Cache │ │   Queue     │
       └─────────────┘ └──────┘ └─────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### 1. Clone and Install
```bash
git clone <repo-url>
cd url-shortener
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Build Shared Package
```bash
npm run build:shared
```

### 4. Start Infrastructure
```bash
docker-compose up -d
```

### 5. Run Database Migrations
```bash
npm run migrate
```

### 6. Seed Demo Data (Optional)
```bash
npm run seed
```

### 7. Start Development
```bash
npm run dev
```

Access:
- **Frontend**: http://localhost:3001
- **API**: http://localhost:3000/api/v1
- **Health**: http://localhost:3000/api/v1/health

## Project Structure
```
├── packages/
│   ├── shared/          # Shared types, constants, utilities
│   ├── backend/         # Express API server
│   │   └── src/
│   │       ├── config/         # App configuration
│   │       ├── controllers/    # Route handlers
│   │       ├── database/       # Migrations, seeds
│   │       ├── events/         # Event system
│   │       ├── jobs/           # Bull queue processors
│   │       ├── middleware/     # Auth, validation, caching
│   │       ├── models/         # Database models
│   │       ├── routes/         # Express routes
│   │       ├── services/       # Business logic
│   │       └── utils/          # Helpers, logger, cache
│   └── frontend/        # React dashboard
│       └── src/
│           ├── components/     # UI components
│           ├── hooks/          # React hooks
│           ├── pages/          # Page components
│           ├── services/       # API client
│           └── contexts/       # Auth context
├── kubernetes/          # K8s manifests
├── nginx/               # Nginx config
├── docs/                # Documentation
└── docker-compose.yml   # Dev setup
```

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/links` | Create short link |
| GET | `/api/v1/links` | List user links |
| GET | `/api/v1/analytics/dashboard` | Dashboard stats |
| GET | `/:code` | Redirect to URL |

Full API docs: [docs/api.md](docs/api.md)

## Deployment

### Docker Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes
```bash
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/
```

### AWS EKS
See [docs/deployment.md](docs/deployment.md) for detailed AWS deployment guide.

## Features in Detail

### 🔗 URL Shortening
- Generate short codes (7 char alphanumeric)
- Custom aliases (4-20 chars)
- Password protection
- Link expiration with auto-deactivation
- Bulk creation support

### 📊 Analytics
- Real-time click tracking
- Geo-location mapping
- Device/browser/OS breakdown
- Referrer tracking
- Click timeline charts
- CSV/JSON export
- Periodic auto-generated reports

### 🔐 Security
- JWT access + refresh tokens
- API key authentication
- bcrypt password hashing (12 rounds)
- Rate limiting (per IP, per user, per API key)
- Helmet security headers
- Input validation (Zod schemas)
- SQL injection protection (parameterized queries)
- CORS configuration

### ⚡ Performance
- Redis caching for links and analytics
- Bull queue for async processing
- Database indexing and query optimization
- Connection pooling
- Response compression
- CDN integration for static assets

## Monitoring
- Health check endpoint: `GET /api/v1/health`
- Prometheus metrics
- Winston logging (structured JSON)
- Request ID tracing
- Bull queue monitoring (optional Redis Commander)

## License
MIT
