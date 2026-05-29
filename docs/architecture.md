# URL Shortener & Analytics Platform — System Architecture

## 1. System Overview

The URL Shortener & Analytics Platform is a production-grade, horizontally scalable web application that allows users to create shortened URLs, track click analytics in real time, generate QR codes, and manage their links through a rich dashboard. The platform supports authentication via JWT and API keys, rate limiting at multiple layers, and comprehensive caching to achieve sub-millisecond redirects.

### Key Features

- **Short Link Creation** — Generate short URLs with optional custom aliases, expiration, tags, and password protection
- **Click Analytics** — Track every click with geolocation, device/browser/OS fingerprinting, referrer parsing, and timeline aggregation
- **Real-Time Stats** — Live click counts, unique IPs, and top-performing links within the last hour
- **QR Code Generation** — On-demand and asynchronous QR code generation with configurable size, color, format (PNG/SVG), and error correction, stored in S3
- **Dashboard** — Aggregate statistics across all user links with period-based filtering (7d, 30d, etc.)
- **Admin Panel** — System health monitoring, user management, activity logs, and bulk operations
- **Public Redirect API** — 302 redirect with asynchronous click tracking, supporting password-protected links and expired link detection
- **Event-Driven Architecture** — In-process EventEmitter for internal events and Bull queues for background job processing
- **Caching** — Redis-backed multi-layer cache for links, analytics summaries, QR codes, and user sessions
- **Security** — bcrypt (12 rounds) password hashing, JWT with separate access/refresh tokens, API key authentication, rate limiting (express and Nginx), Helmet headers, CORS, input validation via Zod, and SQL injection prevention via parameterized queries

### Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Runtime** | Node.js 18+ (TypeScript) | High I/O throughput, async-first, rich ecosystem |
| **Web Framework** | Express.js 4.x | Mature, minimalist, extensive middleware support |
| **Database** | PostgreSQL 16 (via `pg`) | Reliable, powerful indexing, JSONB for summaries, partitioning-ready |
| **Cache** | Redis 7 (ioredis) | Sub-millisecond reads, atomic operations, pub/sub, TTL-based eviction |
| **Queue** | Bull (backed by Redis) | Persistent job queues, delayed retries, concurrency control, cron scheduling |
| **Frontend** | React + Vite + Tailwind CSS | Fast dev server, efficient builds, utility-first CSS |
| **Proxy / LB** | Nginx | Reverse proxy, SSL termination, rate limiting, static file serving |
| **S3-compatible Storage** | AWS S3 / Local FS | QR code image hosting and CDN distribution |
| **Containerization** | Docker + Docker Compose | Consistent environments, multi-service orchestration |
| **Orchestration** | Kubernetes | Auto-scaling, rolling updates, service discovery |
| **CI/CD** | GitHub Actions | Automated testing, building, and deployment |
| **Monitoring** | Prometheus + Grafana | Metrics collection and visualization |
| **Logging** | Winston (structured JSON) | Level-based logging with transports |
| **Validation** | Zod | Schema validation with TypeScript inference |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DNS (Route53)                                  │
└───────────────┬──────────────────────────────┬──────────────────────────────┘
                │                              │
                ▼                              ▼
        ┌──────────────┐              ┌──────────────┐
        │  shorturl.com│              │api.shorturl. │
        │  (Redirect)  │              │    com       │
        └──────┬───────┘              └──────┬───────┘
               │                             │
               ▼                             ▼
        ┌──────────────────────────────────────────────┐
        │              CloudFront CDN                   │
        │       (static assets, QR code images)         │
        └───────────────────┬──────────────────────────┘
                            │
                            ▼
        ┌──────────────────────────────────────────────┐
        │               Nginx Load Balancer             │
        │    ┌────────────────────────────────────┐     │
        │    │ Rate limiting zones:               │     │
        │    │ api_limit (100r/s)                 │     │
        │    │ redirect_limit (500r/s)            │     │
        │    │ login_limit (10r/m)                │     │
        │    │ conn_limit (10 conn/IP)            │     │
        │    └────────────────────────────────────┘     │
        └──────┬───────────────────────┬───────────────┘
               │                       │
               ▼                       ▼
     ┌───────────────────┐  ┌──────────────────────┐
     │  Express API      │  │   React SPA          │
     │  Servers (×N)     │  │   (Nginx serving     │
     │  Port 3000        │  │    static build)      │
     │  (horizontal      │  │   Port 80             │
     │   scale behind    │  │                        │
     │   Nginx upstream) │  │                        │
     └────────┬──────────┘  └────────────────────────┘
              │
     ┌────────┼────────────────────────────┐
     │        │                            │
     ▼        ▼                            ▼
┌──────────┐ ┌──────────┐  ┌──────────────────────────┐
│PostgreSQL│ │  Redis   │  │   Bull Queues             │
│Primary   │ │  Cache   │  │                           │
│          │ │          │  │  ┌────────────────────┐   │
│ Read     │ │  TTL:    │  │  │ click_tracking     │   │
│ Replicas │ │  links=1h│  │  │ analytics_process  │   │
│ (×N)     │ │  analytics│  │  │ qr_generation      │   │
│          │ │  =30m    │  │  │ email_notification  │   │
│          │ │  qr=24h  │  │  │ cache_invalidation  │   │
│          │ │  sessions│  │  └────────────────────┘   │
│          │ │  =1h     │  │                           │
└──────────┘ └──────────┘  └──────────────────────────┘
                             │
                             ▼
                     ┌──────────────┐
                     │  AWS S3      │
                     │ QR Codes     │
                     │ (thumbnails) │
                     └──────────────┘
```

---

## 3. Component Architecture

### 3.1 API Gateway / Load Balancer — Nginx

- **Role**: Reverse proxy, SSL termination, rate limiting, request buffering, static file serving
- **Upstreams**: `backend` (least_conn) with keepalive 32; `frontend` with keepalive 16
- **Three virtual servers**:
  - `api.shorturl.com` — proxies `/api/v1/*` to backend, CORS headers, rate limited at 100r/s
  - `app.shorturl.com` — serves React SPA with asset caching (1 year for fingerprinted assets)
  - `shorturl.com` — proxies redirect short codes to backend, rate limited at 500r/s
- **Security**: HSTS (2 years), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy
- **SSL**: TLSv1.2/TLSv1.3, secure ciphers, OCSP stapling, auto-redirect HTTP→HTTPS

### 3.2 Application Layer — Express.js

The backend is organized as a layered monolith with clear separation of concerns:

- **Routes** — Define HTTP methods, middleware chains, and validation schemas. Six route modules: `auth`, `links`, `analytics`, `admin`, `user`, `redirect`, `qr`
- **Controllers** — Handle request/response lifecycle, call services, emit consistent JSON responses with the `IApiResponse<T>` shape
- **Services** — Business logic: link creation/validation, analytics aggregation, token generation, QR code generation, email composition
- **Models** — Data access layer using parameterized SQL queries against PostgreSQL. Each model maps snake_case DB rows to camelCase domain objects
- **Middleware** — Authentication (JWT verify), optional auth, API key auth, role-based authorization, rate limiting (global, auth, shortener), request validation (Zod), request logging, cache, error handling

### 3.3 Cache Layer — Redis

Redis serves as both a cache and a backing store for Bull queues.

- **Cache client** — ioredis singleton with retry strategy, connection lifecycle logging, and a rich API: `get`, `set`, `del`, `exists`, `keys`, `mget`, `cacheWrap`, `delPattern`, `increment`, `ping`, `flushAll`
- **Cache prefixes** defined in `CACHE_PREFIXES`: `links`, `users`, `analytics`, `qr_codes`, `rate_limit`
- **Key-level TTLs**: links (1 hour), analytics (5–30 minutes depending on aggregation level), QR codes (24 hours), sessions (1 hour)

### 3.4 Database Layer — PostgreSQL

- **Primary tables**: `users`, `links`, `click_events`, `api_keys`, `analytics_summaries`
- **Indexed columns**: `short_code`, `user_id`, `link_id`, `created_at`, `email`, `expires_at`
- **Composite indexes**: `(link_id, created_at)` for timeline queries, `(link_id, country)` for geographic, `(link_id, browser)` for browser breakdown, `(link_id, device_type)` for device analytics, `(link_id, referer)` for referrer analytics
- **Trigger**: `update_updated_at_column()` auto-updates `updated_at` on `users` and `links`
- **Analytics summaries table** stores pre-aggregated hourly/daily rollups with JSONB columns for top browsers, countries, and devices

### 3.5 Queue System — Bull + Redis

Five Bull queues process background work asynchronously:

| Queue | Purpose | Concurrency | Retries | Backoff |
|---|---|---|---|---|
| `click_tracking` | Batch-process click events (batch size 50, flush interval 5s) | 10 processors | 3 | Exponential, 2s |
| `analytics_processing` | Hourly/daily aggregation, data cleanup (weekly cron) | 5 processors | 2 | Exponential, 2s |
| `qr_generation` | Generate QR codes and upload to S3 | 5 processors | 2 | Exponential, 2s |
| `email_notifications` | Send transactional emails (welcome, link expired, password reset, weekly digest, milestone) | 5 processors (per type) | 5 | Exponential, 5s |
| `cache_invalidation` | Invalidate cache entries on data changes | 1 processor | 1 | N/A |

### 3.6 Frontend — React + Vite

- Single-page application built with React 18, TypeScript, and Vite
- Tailwind CSS for utility-first responsive styling
- Built as static files served by Nginx with SPA fallback routing
- Fingerprinted assets in `/assets/` with 1-year cache headers

### 3.7 Storage — AWS S3

- QR code images stored at `s3://<bucket>/qr-codes/{userId}/{linkId}-{timestamp}.{png|svg}`
- Thumbnail variants stored alongside for previews
- CloudFront CDN configured for global edge delivery of QR code images

### 3.8 Monitoring — Prometheus

- Metrics endpoint exposed by the Express server (response times, request counts, error rates, queue depths)
- Prometheus scrapes metrics at configurable intervals
- Grafana dashboards for system health, API performance, queue status, and analytics throughput

---

## 4. Data Flow

### 4.1 URL Shortening Flow

```
Client                    Nginx                 Express API                PostgreSQL              Redis
  │                         │                       │                        │                      │
  │  POST /api/v1/links     │                       │                        │                      │
  │  Authorization: Bearer  │                       │                        │                      │
  ├────────────────────────▶│   Reverse proxy       │                        │                      │
  │                         ├──────────────────────▶│                        │                      │
  │                         │                       │  Validate input (Zod)  │                      │
  │                         │                       │  Authenticate (JWT)    │                      │
  │                         │                       │  Rate limit check      │                      │
  │                         │                       │                        │                      │
  │                         │                       │  Generate short code   │                      │
  │                         │                       │  (nanoid, 7 chars)     │                      │
  │                         │                       │  Hash password (bcrypt)│                      │
  │                         │                       │                        │                      │
  │                         │                       │  INSERT INTO links     │                      │
  │                         │                       ├───────────────────────▶│                      │
  │                         │                       │  RETURNING *           │                      │
  │                         │                       │◀───────────────────────┤                      │
  │                         │                       │                        │                      │
  │                         │                       │  SET links:{shortCode} │                      │
  │                         │                       ├──────────────────────────────────────────────▶│
  │                         │                       │                        │                      │
  │  HTTP 201 Created       │                       │                        │                      │
  │◀────────────────────────├───────────────────────┤                        │                      │
```

### 4.2 Redirect Flow

```
Browser                   Nginx                 Express API               Redis                PostgreSQL
  │                         │                       │                       │                     │
  │  GET /abc1234           │                       │                       │                     │
  ├────────────────────────▶│  Rate limit check     │                       │                     │
  │                         │  (500r/s zone)        │                       │                     │
  │                         ├──────────────────────▶│                       │                     │
  │                         │                       │  GET links:abc1234    │                     │
  │                         │                       ├──────────────────────▶│                     │
  │                         │                       │◀──── Cached link ─────┤                     │
  │                         │                       │     (or miss)         │                     │
  │                         │                       │                       │                     │
  │                         │                       │  (If cache miss)      │                     │
  │                         │                       │  SELECT * FROM links  │                     │
  │                         │                       │  WHERE short_code=$1  ├────────────────────▶│
  │                         │                       │◀──────────────────────┤                     │
  │                         │                       │                       │                     │
  │                         │                       │  Check expiry/active  │                     │
  │                         │                       │  Hash password (if    │                     │
  │                         │                       │    protected)         │                     │
  │                         │                       │                       │                     │
  │                         │                       │  Asynchronously:      │                     │
  │                         │                       │  INSERT click_event   │                     │
  │                         │                       │  UPDATE click_count   ├────────────────────▶│
  │                         │                       │  Emit LINK_CLICKED    │                     │
  │                         │                       │  Invalidate cache     │                     │
  │                         │                       │                       │                     │
  │  302 → https://target   │                       │                       │                     │
  │◀────────────────────────├───────────────────────┤                       │                     │
```

### 4.3 Analytics Tracking Flow

```
Client Click               Express API              Bull Queue               Click Event           Analytics
  (Redirect)               (Immediate)              (Background)             Batch Insert          Aggregation
     │                         │                        │                        │                     │
     │  Click recorded         │                        │                        │                     │
     │  (via process.nextTick) │                        │                        │                     │
     │                         │  Add job to            │                        │                     │
     │                         │  click_tracking queue  │                        │                     │
     │                         ├───────────────────────▶│                        │                     │
     │                         │                        │                        │                     │
     │                         │                        │  Wait for batch timer  │                     │
     │                         │                        │  (5s) or batch size    │                     │
     │                         │                        │  (50)                  │                     │
     │                         │                        │                        │                     │
     │                         │                        │  Parse user-agent      │                     │
     │                         │                        │  (ua-parser-js)        │                     │
     │                         │                        │  Geo lookup (geoip)    │                     │
     │                         │                        │                        │                     │
     │                         │                        │  INSERT click_events   │                     │
     │                         │                        ├───────────────────────▶│                     │
     │                         │                        │                        │                     │
     │                         │                        │  UPDATE click_count    │                     │
     │                         │                        ├───────────────────────▶│                     │
     │                         │                        │                        │                     │
     │                         │                        │  Emit LINK_CLICKED     │                     │
     │                         │                        │  Invalidate cache      │                     │
     │                         │                        │                        │                     │
     │                         │                        │  (Scheduled via cron)  │                     │
     │                         │                        │  hourly_aggregation    ├────────────────────▶│
     │                         │                        │  daily_aggregation     │                     │
     │                         │                        │  materialize           │                     │
     │                         │                        │                        │                     │
```

### 4.4 Real-Time Analytics Flow

```
Dashboard Client           Express API               Redis                     PostgreSQL
     │                         │                        │                         │
     │  GET /analytics/        │                        │                         │
     │  realtime               │                        │                         │
     ├────────────────────────▶│                        │                         │
     │                         │  Authenticate + Authz  │                         │
     │                         │                        │                         │
     │                         │  GET links for user    │                         │
     │                         ├────────────────────────────────────────────────▶│
     │                         │◀────────────────────────────────────────────────┤
     │                         │                        │                         │
     │                         │  COUNT clicks in       │                         │
     │                         │  last hour             │                         │
     │                         ├────────────────────────────────────────────────▶│
     │                         │  COUNT distinct IPs    │                         │
     │                         ├────────────────────────────────────────────────▶│
     │                         │  SELECT recent 50      │                         │
     │                         ├────────────────────────────────────────────────▶│
     │                         │                                                │
     │  Real-time stats        │                        │                         │
     │◀────────────────────────┤                        │                         │
```

---

## 5. Database Design

### 5.1 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
│    users     │       │    links     │       │   click_events   │
├──────────────┤       ├──────────────┤       ├──────────────────┤
│ id (PK, UUID)│◀──────│ user_id (FK) │◀──────│ link_id (FK)     │
│ email (UQ)   │ 1:N   │ id (PK,UUID) │ 1:N   │ id (PK, UUID)    │
│ password_hash│       │ original_url │       │ ip_address       │
│ name         │       │ short_code   │       │ user_agent       │
│ role         │       │ custom_alias │       │ referer          │
│ api_key (UQ) │       │ title        │       │ country          │
│ is_active    │       │ tags (text[])│       │ city             │
│ created_at   │       │ is_active    │       │ lat/lng          │
│ updated_at   │       │ expires_at   │       │ browser          │
└──────────────┘       │ password     │       │ browser_version  │
                       │ click_count  │       │ os / os_version  │
                       │ created_at   │       │ device_type      │
                       │ updated_at   │       │ device_model     │
                       └──────────────┘       │ is_mobile        │
                                              │ is_tablet        │
                                              │ is_desktop       │
                                              │ created_at       │
                                              └──────────────────┘

┌──────────────┐       ┌──────────────────────┐
│  api_keys    │       │ analytics_summaries   │
├──────────────┤       ├──────────────────────┤
│ id (PK,UUID) │       │ id (PK, SERIAL)      │
│ user_id (FK) │       │ link_id (FK)         │
│ key (UQ)     │       │ period (hourly/daily) │
│ name         │       │ period_start (TS)    │
│ last_used_at │       │ total_clicks         │
│ expires_at   │       │ unique_visitors      │
│ is_active    │       │ top_browsers (JSONB) │
│ created_at   │       │ top_countries (JSONB)│
└──────────────┘       │ top_devices (JSONB)  │
                       │ created_at           │
                       │ updated_at           │
                       │ UNIQUE: (link_id,    │
                       │  period, period_start)│
                       └──────────────────────┘
```

### 5.2 Table Descriptions

**`users`** — Stores registered user accounts. Passwords hashed with bcrypt (12 rounds). Each user gets an auto-generated API key prefixed with `uk_` on registration. Roles are `user` or `admin`.

**`links`** — Stores shortened URL entries. Short codes are 7-character alphanumeric strings generated via `nanoid`. Custom aliases are user-provided 4–20 character strings validated against `/^[a-zA-Z0-9_-]{4,20}$/`. Optional password protection uses bcrypt (10 rounds). Soft deletion sets `is_active = false`.

**`click_events`** — The high-volume event store. Every redirect creates one row with full request metadata: IP address, user agent, referrer, geographic data (country, city, lat/lng from geoip-lite), parsed browser/OS/device info (from ua-parser-js). This table is designed for partitioning by month.

**`api_keys`** — Supports programmatic access. API keys are 64-character hex strings scoped to a user. Tracked with `last_used_at` and optional `expires_at`.

**`analytics_summaries`** — Materialized pre-aggregations for fast dashboard queries. Stores hourly and daily rollups with total clicks and unique visitors. JSONB columns store breakdowns by browser, country, and device type. Updated via Bull queue jobs.

### 5.3 Indexing Strategy

| Index | Columns | Type | Purpose |
|---|---|---|---|
| `idx_links_short_code` | `short_code` | B-tree | Fast redirect lookup (also matches `custom_alias` via OR query) |
| `idx_links_user_id` | `user_id` | B-tree | List user's links |
| `idx_click_events_link_id` | `link_id` | B-tree | Filter clicks by link |
| `idx_click_events_created_at` | `created_at` | B-tree | Time-range queries, cleanup |
| `idx_api_keys_key` | `key` | B-tree | API key authentication |
| `idx_links_expires_at` | `expires_at` | B-tree | Expired link scanning |
| `idx_users_email` | `email` | B-tree | Login lookup |
| `idx_click_events_link_created` | `link_id, created_at` | Composite B-tree | Timeline queries |
| `idx_click_events_country` | `link_id, country` | Composite B-tree | Geographic breakdown |
| `idx_click_events_browser` | `link_id, browser` | Composite B-tree | Browser breakdown |
| `idx_click_events_device` | `link_id, device_type` | Composite B-tree | Device breakdown |
| `idx_click_events_referer` | `link_id, referer` | Composite B-tree | Referrer breakdown |
| `analytics_summaries_unique` | `link_id, period, period_start` | Unique | Upsert target |

### 5.4 Partitioning Strategy — `click_events`

To handle the high write volume of click events, the table is designed for **monthly range partitioning** (not yet applied in v1 migration):

```sql
CREATE TABLE click_events (...)
PARTITION BY RANGE (created_at);

CREATE TABLE click_events_2024_01
  PARTITION OF click_events
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE click_events_2024_02
  PARTITION OF click_events
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

This provides:
- **Faster data pruning** — drop old partitions instead of DELETE
- **Improved query performance** — partition pruning on `created_at` filters
- **Easier archival** — detach partitions to cold storage

### 5.5 Read Replicas Strategy

- Primary writer handles all INSERT/UPDATE/DELETE operations
- Read replicas (2–3) serve analytics queries, dashboard aggregation queries, and admin list endpoints
- Application-layer read/write splitting via connection pool configuration:
  - Primary pool: `INSERT`, `UPDATE`, `DELETE`
  - Replica pool(s): `SELECT`
- Replication lag is tolerated for analytics (eventual consistency is acceptable)
- Critical reads (redirect, auth) always go to primary to avoid stale data

---

## 6. Caching Strategy

### 6.1 Cache Contents and TTLs

| Cache Key Pattern | Content | TTL | Invalidation Trigger |
|---|---|---|---|
| `links:{shortCode}` | Full link object (ILink) | 3600s (1h) | Link update, delete, click event (increment count) |
| `links:{id}` | Full link object by ID | 3600s (1h) | Link update or delete |
| `analytics:{linkId}` | Analytics summary | 300s (5m) | Hourly/daily aggregation job |
| `analytics:{linkId}:{period}` | Period-filtered analytics | 300s (5m) | Aggregation job |
| `analytics:dashboard:{userId}:{period}` | Dashboard stats | 300s (5m) | Aggregation job |
| `analytics:geo:{linkId}` | Geographic breakdown | 600s (10m) | Aggregation job |
| `analytics:device:{linkId}` | Device breakdown | 600s (10m) | Aggregation job |
| `analytics:clicksOverTime:{linkId}:{interval}` | Timeline data | 600s (10m) | New click events |
| `analytics:referrer:{linkId}` | Referrer breakdown | 600s (10m) | Aggregation job |
| `qr_codes:{linkId}` | QR code URL and S3 key | 86400s (24h) | QR regeneration or link deletion |

### 6.2 Cache Invalidation Strategy

- **Write-through (for links)**: After creating or updating a link, the cache is immediately populated or invalidated
- **Write-invalidate (for analytics)**: After aggregation jobs, the affected analytics cache keys are deleted via `del` or `delPattern` (e.g., `delPattern("analytics:{linkId}:*")`)
- **Event-driven**: The `LINK_CLICKED` event triggers cache invalidation for the link's short code (to update `click_count`)
- **Lazy expiration**: All cache entries have a TTL; stale data is automatically evicted even if not explicitly invalidated

### 6.3 Cache Warming Strategies

- **On first access**: The `cacheWrap` utility checks cache first; on miss, it fetches from DB and populates cache (lazy population)
- **Startup warm**: On application startup, frequently accessed links can be pre-warmed by iterating over the most-clicked links and caching them
- **QR codes**: Generated and cached at creation time by the Bull processor, so they are warm when first requested

---

## 7. Queue Architecture

### 7.1 Queue Definitions and Purposes

| Queue | Job Types | Description |
|---|---|---|
| `click_tracking` | `click`, `click_immediate` | Batch-processing of click events with geolocation and user-agent parsing. Batching reduces DB write pressure. Immediate variant processes synchronously for QA/testing |
| `analytics_processing` | `hourly_aggregation`, `daily_aggregation`, `cleanup`, `materialize` | Aggregates raw click data into summaries at hourly and daily granularity. Cleanup job runs weekly (Sunday 3 AM) to purge data older than 90 days. Materialize ensures a summary row exists for daily rollups |
| `qr_generation` | `generate`, `regenerate` | Generates QR code images (PNG/SVG) using `qrcode` library, uploads to S3, caches the URL in Redis. Regeneration deletes the old S3 object first |
| `email_notifications` | `welcome_email`, `link_expired`, `password_reset`, `weekly_digest`, `threshold_reached`, `batch` | Sends transactional emails via SMTP with pooled connections (max 5). Uses templated HTML and plain-text versions. Batch variant for bulk sends |
| `cache_invalidation` | `invalidate` | Clears cache entries after data mutations |

### 7.2 Job Processing Flow

1. **Job creation**: Controllers/services add a job to the relevant queue via `queue.add('jobType', data, options)`
2. **Queue persistence**: Bull persists the job to Redis as a sorted set and list
3. **Processor execution**: Registered processors pull jobs from the queue with configurable concurrency (e.g., 10 for click tracking)
4. **Error handling**: Failed jobs are retried with exponential backoff; after max retries they go to the `failed` set
5. **Completion**: Successful jobs are moved to `completed` set and removed after TTL (3600s default)

### 7.3 Error Handling and Retries

```typescript
const defaultJobOptions = {
  attempts: 3,                    // Max retry attempts
  backoff: {
    type: 'exponential',          // Exponential backoff
    delay: 2000,                  // Initial delay
  },
  removeOnComplete: { age: 3600, count: 100 },
  removeOnFail: { age: 86400, count: 50 },
};
```

- **Click tracking**: 3 retries, 2s exponential backoff. Batch flush retries on `Promise.allSettled` — individual failures are logged but don't block the batch
- **Email**: 5 retries, 5s exponential backoff (highest retry count — network issues are transient)
- **Cache invalidation**: 1 attempt only (idempotent, safe to miss)
- **Queue-level error handlers** log errors, stalled jobs, and completions via Bull event listeners

### 7.4 Dead Letter Queues

Bull does not have a native DLQ concept, but failed jobs can be monitored:

- Jobs that exhaust retries remain in the `failed` set with the error reason
- A scheduled job monitors the failed set and sends alerts (via email or Slack webhook) when failures exceed a threshold
- Failed jobs can be manually re-queued via Bull Board UI or programmatically via `queue.retryJob()`

---

## 8. Scalability Strategy

### 8.1 Horizontal Scaling — API Servers

- **Nginx upstream** uses `least_conn` load balancing across multiple backend containers
- **Stateless design**: No server-side session state; all state in Redis or PostgreSQL
- **Health checks**: `/api/v1/health` endpoint — Nginx marks unhealthy instances as down after 3 failures within 30s
- **Docker Compose production**: 3 backend replicas (configurable), rolling updates with `start-first` order
- **Kubernetes HPA**: Horizontal Pod Autoscaler based on CPU/memory utilization

### 8.2 Database Read Replicas

- Primary `max_connections` 200; replicas 100 each
- Connection pooling via `pg` native pool (default 10–20 connections per instance)
- Read replicas absorb analytics/reporting queries while the primary handles redirect writes
- Application-level read/write splitting in service layer

### 8.3 Redis Cluster

- For production with high throughput, Redis Sentinel or Redis Cluster provides high availability
- Cache keys are evenly distributed across cluster nodes
- Bull queues benefit from Redis persistence (AOF with append-only fsync)
- Redis memory managed with `maxmemory-policy allkeys-lru`

### 8.4 CDN for Static Assets and Redirects

- **CloudFront** serves:
  - Fingerprinted frontend assets at `app.shorturl.com/assets/*` (1-year cache)
  - QR code images at `cdn.shorturl.com/qr-codes/*` (30-day cache)
- **Edge caching** for static content reduces load on origin servers
- **SSL termination** at edge for reduced backend TLS overhead

### 8.5 Sharding Strategy — Click Events

For extremely high volume (>100M clicks/month), `click_events` can be sharded by `link_id` hash:

```
shard_key = HASH(link_id) % NUM_SHARDS
```

- Consistent hashing across PostgreSQL shards or Citus distributed tables
- Analytics queries operate on specific `link_id` and are thus limited to one shard
- Dashboard queries across all user links require scatter-gather across shards

### 8.6 Rate Limiting at Multiple Levels

| Layer | Limit | Scope |
|---|---|---|
| Nginx (global) | 100 r/s | All API requests |
| Nginx (redirect) | 500 r/s | Short code redirects |
| Nginx (login) | 10 r/m | Login endpoint |
| Nginx (conn) | 10 conn/IP | Concurrent connections |
| Express (global) | 100 req/15m | All authenticated API calls |
| Express (auth) | 20 req/15m | Auth endpoints (login, register) |
| Express (shortener) | 10 req/1m | Link creation |

---

## 9. Security Architecture

### 9.1 JWT Authentication Flow

```
1. User registers or logs in
2. AuthService generates:
   - Access token (15m expiry, signed with JWT_SECRET)
   - Refresh token (7d expiry, signed with JWT_REFRESH_SECRET)
3. Tokens returned in response body + Set-Cookie (httpOnly, secure, sameSite=strict)
4. Client sends Bearer token in Authorization header
5. authenticate middleware verifies:
   - Token signature
   - Token expiry (TokenExpiredError → 401)
   - Token type (must be 'access')
   - Issuer claim
6. Refresh: POST /auth/refresh-token with refresh token → new access token
7. Change password: Requires old password verification
8. Logout: Clears httpOnly refresh token cookie
```

### 9.2 API Key Authentication

- Auto-generated on user registration: `uk_${randomBytes(24).toString('hex')}`
- Stored hashed in `api_keys` table with `last_used_at` tracking
- Sent via `X-API-Key` header
- Validated by `api-key.middleware.ts` against the `api_keys` table
- Can be regenerated by the user (old key immediately revoked)

### 9.3 Additional Security Measures

| Measure | Implementation |
|---|---|
| **Password hashing** | bcrypt, 12 rounds |
| **SQL injection** | Parameterized queries only (`$1`, `$2`, etc.); no string interpolation in SQL |
| **XSS prevention** | Helmet middleware; sanitizeHtml utility in shared package |
| **Input validation** | Zod schemas at every route; URL validation via `new URL()` |
| **CORS** | Configurable origin via `CORS_ORIGIN` env var; credentials allowed |
| **HTTPS enforcement** | Nginx HTTP→301→HTTPS redirect; HSTS header (2 years, preload) |
| **Security headers** | X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy |
| **Request size limits** | Nginx `client_max_body_size 5m`; Express body parser limits |
| **Rate limiting** | Layer 7 (Nginx) + Layer 7 (Express) |

---

## 10. Deployment Architecture

### 10.1 Docker Containerization

Multi-stage Docker builds for both backend and frontend:

- **Backend Dockerfile**: Alpine-based, installs production dependencies only, runs as `node` user
- **Frontend Dockerfile**: Alpine-based Nginx serving built static files
- **docker-compose.yml**: Development setup with volume mounts for hot reload
- **docker-compose.prod.yml**: Production setup with nginx reverse proxy, multiple replicas, health checks, logging drivers

### 10.2 Kubernetes Orchestration

Kubernetes manifests in `/kubernetes/`:

| Resource | Description |
|---|---|
| `namespace.yaml` | `url-shortener` namespace |
| `configmap.yaml` | Non-sensitive environment variables |
| `secret.yaml` | Sensitive values (DB passwords, JWT secrets, AWS keys) |
| `deployment.yaml` | Backend deployment with 3 replicas, resource limits, health probes |
| `service.yaml` | ClusterIP service for backend |
| `frontend-deployment.yaml` | Frontend deployment with 2 replicas |
| `frontend-service.yaml` | ClusterIP service for frontend |
| `postgres-statefulset.yaml` | StatefulSet with persistent volume claim |
| `postgres-service.yaml` | Headless service for stable DNS |
| `redis-deployment.yaml` | Single-instance Redis (production uses Sentinel/Cluster) |
| `redis-service.yaml` | ClusterIP service for Redis |
| `redis-pvc.yaml` | Persistent volume claim for Redis AOF persistence |
| `hpa.yaml` | HPA targeting 70% CPU utilization |
| `pdb.yaml` | PodDisruptionBudget (min 2 available) |
| `ingress.yaml` | Nginx Ingress with TLS, path-based routing |
| `secret.yaml` | TLS certificate secrets |

### 10.3 CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci-cd.yml`):

1. **Test** (on push/PR to main/develop):
   - Spin up Postgres + Redis service containers
   - Run linter (`npm run lint`)
   - Run tests (`npm run test`)
2. **Build** (on push):
   - Build shared package, backend, frontend
   - Upload build artifacts
3. **Docker** (on push):
   - Build and push backend + frontend images to Docker Hub
   - Tag with semantic version, branch name, short SHA
   - Cache layers via GitHub Actions cache
4. **Deploy** (on merge to main):
   - Configure kubectl with Kubeconfig secret
   - `kubectl set image` for backend and frontend deployments
   - Wait for rollout status (120s timeout)
   - Post-deployment health check
   - Notify commit status

### 10.4 Blue-Green Deployment Strategy

- Kubernetes rolling update with `start-first` order and `maxSurge=1`, `maxUnavailable=0`
- New pods are fully started and healthy before old ones are terminated
- Health check endpoint verifies:
  - Database connectivity (PostgreSQL ping)
  - Cache connectivity (Redis PING)
  - Queue system accessibility
- Failed health checks prevent the rollout

### 10.5 Monitoring and Alerting

- **Prometheus** scrapes metrics from the backend's /metrics endpoint
- **Grafana** dashboards for:
  - Request rate, latency (p50/p95/p99), error rate
  - Queue depth and job processing rate
  - Cache hit/miss ratio
  - Database connection pool usage
  - CPU/memory per pod
- **Alerting rules**: High error rate, elevated latency, queue backlog growth, pod restarts
- **Log aggregation**: JSON-structured logs via Winston, shipped to ELK stack or Loki
