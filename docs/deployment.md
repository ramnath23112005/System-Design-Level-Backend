# URL Shortener & Analytics Platform — Deployment Guide

---

## 1. Prerequisites

### Software Requirements

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 18.x or later | Runtime |
| npm | 9.x or later | Package manager |
| Docker | 24.x or later | Containerization |
| Docker Compose | 2.x or later | Multi-container orchestration |
| kubectl | Latest stable | Kubernetes CLI |
| AWS CLI | 2.x | AWS resource management |
| Helm | 3.x (optional) | Kubernetes package manager |

### Domain Names

Configure the following DNS records (production):

| Domain | Purpose | Target |
|---|---|---|
| `shorturl.com` | Redirect URLs | Nginx LB / Ingress |
| `www.shorturl.com` | Redirect URLs alias | Nginx LB / Ingress |
| `api.shorturl.com` | API server | Nginx LB / Ingress |
| `app.shorturl.com` | Dashboard UI | Nginx LB / Ingress |
| `cdn.shorturl.com` | QR code images | CloudFront |

### Required Accounts

- Docker Hub account (or AWS ECR, GCR) for image registry
- AWS account (for S3, RDS, ElastiCache, CloudFront, EKS)
- GitHub account (for CI/CD)

---

## 2. Local Development Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/url-shortener.git
cd url-shortener
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your local configuration. Defaults work for local development:

```
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=url_shortener
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
```

### Step 3: Install Dependencies

```bash
npm install
```

This installs all workspace packages (`backend`, `frontend`, `shared`) using npm workspaces.

### Step 4: Build Shared Package

```bash
npm run build:shared
```

The `@urlshortener/shared` package must be built first as both backend and frontend depend on it.

### Step 5: Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- PostgreSQL 16 on port 5432
- Redis 7 on port 6379

### Step 6: Run Database Migrations

```bash
npm run migrate
```

Applies the initial schema (`001_initial.sql`) which creates:
- `users`, `links`, `click_events`, `api_keys`, `analytics_summaries` tables
- Indexes and composite indexes
- `update_updated_at_column()` trigger

### Step 7: Seed Data (Optional)

```bash
npm run seed
```

Populates the database with sample users, links, and click events for development and testing.

### Step 8: Start Development Servers

```bash
npm run dev
```

Starts concurrently:
- Backend (ts-node-dev with hot reload) on port 3000
- Frontend (Vite dev server) on port 5173

### Verification

```bash
curl http://localhost:3000/api/v1/health
# {"success":true,"data":{"status":"healthy","database":"healthy","redis":"healthy"},"message":"System health check completed","error":null,"timestamp":"..."}
```

---

## 3. Docker Deployment

### 3.1 Building Images

**Backend:**

```bash
docker build -t url-shortener/backend:latest -f packages/backend/Dockerfile .
```

The backend Dockerfile:
- Base: `node:18-alpine`
- Builds shared package first
- Installs production dependencies only (`npm ci --production`)
- Runs as `node` user (non-root)
- Exposes port 3000
- CMD: `node dist/server.js`

**Frontend:**

```bash
docker build -t url-shortener/frontend:latest -f packages/frontend/Dockerfile .
```

The frontend Dockerfile:
- Multi-stage: build stage (node:18-alpine) → serve stage (nginx:alpine)
- Builds static assets with Vite
- Copies to Nginx html directory
- Uses custom Nginx config with SPA fallback

**Nginx:**

```bash
docker build -t url-shortener/nginx:latest -f nginx/Dockerfile .
```

### 3.2 Running with Docker Compose (Production)

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Production compose deploys:
- **nginx**: Reverse proxy with SSL termination (ports 80/443)
- **backend**: 3 replicas with health checks, rolling updates
- **frontend**: 2 replicas
- **postgres**: With persistent volume and backup volume
- **redis**: With AOF persistence and password authentication
- **redis-commander** (dev profile only): Redis admin UI on port 8081

Health check configuration:
```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/v1/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### 3.3 Environment Variables Management

Create a `.env` file in the project root for production:

```env
NODE_ENV=production
DB_HOST=postgres
DB_PORT=5432
DB_NAME=url_shortener
DB_USER=urlshortener_prod
DB_PASSWORD=<strong-random-password>
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<strong-redis-password>
JWT_SECRET=<random-64-char-string>
JWT_REFRESH_SECRET=<different-random-64-char-string>
AWS_ACCESS_KEY_ID=<iam-access-key>
AWS_SECRET_ACCESS_KEY=<iam-secret-key>
AWS_S3_BUCKET=url-shortener-prod-assets
CORS_ORIGIN=https://app.shorturl.com
REDIRECT_BASE_URL=https://shorturl.com
API_BASE_URL=https://api.shorturl.com/api/v1
```

For production, never commit `.env` to version control. Use Docker secrets or a secrets manager (AWS Secrets Manager, HashiCorp Vault) in production.

---

## 4. Kubernetes Deployment

### 4.1 Prerequisites

- Kubernetes cluster (EKS, GKE, AKS, or self-hosted)
- `kubectl` configured with cluster access
- `cert-manager` installed (for TLS certificates)
- Nginx Ingress Controller installed

### 4.2 Namespace

```bash
kubectl apply -f kubernetes/namespace.yaml
```

Creates the `url-shortener` namespace.

### 4.3 ConfigMap and Secrets

**ConfigMap** (non-sensitive values):

```bash
kubectl apply -f kubernetes/configmap.yaml
```

Contains:
- `NODE_ENV=production`
- `API_PREFIX=/api/v1`
- `DB_HOST=postgres`
- `DB_PORT=5432`
- `DB_NAME=url_shortener`
- `REDIS_HOST=redis`
- `REDIS_PORT=6379`
- `AWS_REGION=us-east-1`
- `AWS_S3_BUCKET=url-shortener-assets`
- `CORS_ORIGIN=https://app.shorturl.com`
- `REDIRECT_BASE_URL=https://shorturl.com`
- `API_BASE_URL=https://api.shorturl.com/api/v1`
- `LOG_LEVEL=info`

**Secrets** (sensitive values):

```bash
# Create from literal values
kubectl create secret generic url-shortener-secrets \
  --namespace url-shortener \
  --from-literal=DB_PASSWORD='<password>' \
  --from-literal=REDIS_PASSWORD='<password>' \
  --from-literal=JWT_SECRET='<secret>' \
  --from-literal=JWT_REFRESH_SECRET='<secret>' \
  --from-literal=AWS_ACCESS_KEY_ID='<key>' \
  --from-literal=AWS_SECRET_ACCESS_KEY='<secret>'

# Or apply from file
kubectl apply -f kubernetes/secret.yaml
```

### 4.4 Deploy PostgreSQL

```bash
kubectl apply -f kubernetes/postgres-pvc.yaml
kubectl apply -f kubernetes/postgres-statefulset.yaml
kubectl apply -f kubernetes/postgres-service.yaml
```

**Storage**: 10GB persistent volume claim for database files.

**StatefulSet** configuration:
- Image: `postgres:16-alpine`
- Resource requests: 500m CPU, 1Gi memory
- Resource limits: 2 CPU, 4Gi memory
- Readiness probe: `pg_isready`
- Environment from ConfigMap + Secrets

**Verification:**

```bash
kubectl get pods -n url-shortener -l app=postgres
# NAME         READY   STATUS    RESTARTS   AGE
# postgres-0   1/1     Running   0          2m
```

### 4.5 Deploy Redis

```bash
kubectl apply -f kubernetes/redis-pvc.yaml
kubectl apply -f kubernetes/redis-deployment.yaml
kubectl apply -f kubernetes/redis-service.yaml
```

**Storage**: 5GB persistent volume for AOF persistence.

**Configuration**:
- Image: `redis:7-alpine`
- Command: `redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}`
- Resource requests: 200m CPU, 512Mi memory
- Resource limits: 1 CPU, 2Gi memory

**Verification:**

```bash
kubectl get pods -n url-shortener -l app=redis
# NAME                     READY   STATUS    RESTARTS   AGE
# redis-5d8f6f9b6f-abc12   1/1     Running   0          2m
```

### 4.6 Deploy Backend

```bash
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
kubectl apply -f kubernetes/hpa.yaml
kubectl apply -f kubernetes/pdb.yaml
```

**Deployment** configuration:
- Replicas: 3
- Image: `url-shortener/backend:latest` (tagged with git SHA in CI/CD)
- Resource requests: 250m CPU, 512Mi memory
- Resource limits: 1 CPU, 1Gi memory
- Liveness probe: HTTP GET `/api/v1/health` (port 3000), initial delay 30s
- Readiness probe: HTTP GET `/api/v1/health` (port 3000), initial delay 15s
- Environment from ConfigMap + Secrets

**Horizontal Pod Autoscaler**:
```yaml
minReplicas: 3
maxReplicas: 10
targetCPUUtilizationPercentage: 70
```

**PodDisruptionBudget**: Minimum 2 replicas available during voluntary disruptions.

**Verification:**

```bash
kubectl get pods -n url-shortener -l app=backend
# NAME                       READY   STATUS    RESTARTS   AGE
# backend-7d9f8c6b8f-ab12    1/1     Running   0          3m
# backend-7d9f8c6b8f-cd34    1/1     Running   0          3m
# backend-7d9f8c6b8f-ef56    1/1     Running   0          3m
```

### 4.7 Deploy Frontend

```bash
kubectl apply -f kubernetes/frontend-deployment.yaml
kubectl apply -f kubernetes/frontend-service.yaml
```

**Deployment** configuration:
- Replicas: 2
- Image: `url-shortener/frontend:latest`
- Resource requests: 100m CPU, 256Mi memory
- Resource limits: 500m CPU, 512Mi memory
- Liveness probe: HTTP GET `/health` (port 80), initial delay 15s

### 4.8 Set Up Ingress

```bash
kubectl apply -f kubernetes/ingress.yaml
```

**Ingress** configuration:
- Host-based routing:
  - `api.shorturl.com` → backend service (port 3000)
  - `app.shorturl.com` → frontend service (port 80)
  - `shorturl.com`, `www.shorturl.com` → backend service (port 3000)
- TLS configured with cert-manager ClusterIssuer
- Annotations for Nginx Ingress controller

### 4.9 TLS with cert-manager

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@shorturl.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

The Ingress resource includes the `cert-manager.io/cluster-issuer` annotation that automatically provisions certificates.

### 4.10 Full Verification

```bash
# Check all pods
kubectl get pods -n url-shortener

# Check services
kubectl get svc -n url-shortener

# Check ingress
kubectl get ingress -n url-shortener

# Check certificates
kubectl get certificates -n url-shortener

# Test API health
kubectl run -it --rm test-pod --image=curlimages/curl --restart=Never -- \
  curl -s https://api.shorturl.com/api/v1/health

# Test redirect
kubectl run -it --rm test-pod --image=curlimages/curl --restart=Never -- \
  curl -s -o /dev/null -w "%{http_code}" https://shorturl.com/test123
```

---

## 5. AWS Deployment Steps

### 5.1 Setting up EKS Cluster

```bash
# Create EKS cluster
eksctl create cluster \
  --name url-shortener-prod \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --managed

# Update kubeconfig
aws eks update-kubeconfig --name url-shortener-prod --region us-east-1

# Verify
kubectl get nodes
```

### 5.2 Configuring ECR for Images

```bash
# Create repositories
aws ecr create-repository --repository-name url-shortener/backend
aws ecr create-repository --repository-name url-shortener/frontend

# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push images
docker tag url-shortener/backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/url-shortener/backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/url-shortener/backend:latest
```

Update `deployment.yaml` and `frontend-deployment.yaml` with the ECR image URL.

### 5.3 Setting up RDS PostgreSQL

```bash
# Create subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name url-shortener-db-subnet \
  --subnet-ids subnet-abc123 subnet-def456 \
  --db-subnet-group-description "URL Shortener DB Subnet Group"

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier url-shortener-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 16.1 \
  --master-username urlshortener_admin \
  --master-user-password <strong-password> \
  --allocated-storage 100 \
  --storage-type gp3 \
  --multi-az \
  --db-subnet-group-name url-shortener-db-subnet \
  --db-name url_shortener \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --enable-performance-insights \
  --deletion-protection
```

Update the `DB_HOST` ConfigMap value to the RDS endpoint.

### 5.4 Setting up ElastiCache Redis

```bash
# Create Redis subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name url-shortener-redis-subnet \
  --subnet-ids subnet-abc123 subnet-def456

# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id url-shortener-redis \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.t3.medium \
  --num-cache-nodes 1 \
  --auth-token <strong-redis-password> \
  --cache-subnet-group-name url-shortener-redis-subnet \
  --snapshot-retention-limit 7 \
  --snapshot-window "04:00-05:00"
```

For production with high availability, use a Redis replication group with multiple nodes:

```bash
aws elasticache create-replication-group \
  --replication-group-id url-shortener-redis-ha \
  --replication-group-description "URL Shortener Redis HA" \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.t3.medium \
  --num-cache-clusters 2 \
  --multi-az-enabled \
  --automatic-failover-enabled \
  --auth-token <strong-redis-password>
```

### 5.5 Setting up S3 for QR Codes

```bash
# Create S3 bucket
aws s3 mb s3://url-shortener-prod-assets --region us-east-1

# Block public access (access via CloudFront only)
aws s3api put-public-access-block \
  --bucket url-shortener-prod-assets \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket url-shortener-prod-assets \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket url-shortener-prod-assets \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

### 5.6 Configuring CloudFront CDN

Create a CloudFront distribution with:
- Origin: S3 bucket (url-shortener-prod-assets)
- OAC (Origin Access Control) for secure S3 access
- Path pattern: `/qr-codes/*`
- Cache policy: CachingOptimized (30-day TTL)
- Viewer protocol policy: Redirect HTTP to HTTPS
- Alternate domain name: `cdn.shorturl.com`
- SSL certificate: ACM (us-east-1)

```bash
# Create CloudFront OAC
aws cloudfront create-origin-access-control \
  --origin-access-control-config Name=url-shortener-oac,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3

# Create distribution (simplified)
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

### 5.7 Setting up Route53 DNS

```bash
# Create hosted zone (if not exists)
aws route53 create-hosted-zone --name shorturl.com --caller-reference 2024-01-01-1

# Create A records (alias to CloudFront / Load Balancer)
aws route53 change-resource-record-sets \
  --hosted-zone-id ZONE_ID \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.shorturl.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z2FDTNDATAQYW2",
            "DNSName": "<load-balancer-dns>",
            "EvaluateTargetHealth": true
          }
        }
      },
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "cdn.shorturl.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z2FDTNDATAQYW2",
            "DNSName": "<cloudfront-domain>",
            "EvaluateTargetHealth": false
          }
        }
      }
    ]
  }'
```

### 5.8 Deploying Using CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) automates deployment:

1. **On push to main**: Tests → Build → Docker image push → K8s rollout
2. **On PR to main**: Tests only (no deploy)

Required GitHub Secrets:

| Secret | Description |
|---|---|
| `DOCKER_USERNAME` | Docker Hub or ECR username |
| `DOCKER_PASSWORD` | Docker Hub or ECR password |
| `KUBE_CONFIG` | Base64-encoded kubeconfig for EKS cluster |

---

## 6. CI/CD Pipeline

### 6.1 GitHub Actions Workflow

The pipeline is defined in `.github/workflows/ci-cd.yml` and consists of four jobs:

#### Test Job
- Triggered on push to `main`/`develop` and PRs to `main`
- Spins up PostgreSQL and Redis service containers
- Installs dependencies via `npm ci`
- Runs linter (`npm run lint`)
- Runs test suite (`npm run test`)
- Timeout: 15 minutes

#### Build Job
- Runs after Test succeeds
- Builds all packages (`npm run build`)
- Verifies build artifacts exist
- Uploads build artifacts for subsequent jobs
- Timeout: 15 minutes

#### Docker Job
- Runs after Build succeeds (push events only)
- Sets up Docker Buildx for multi-platform builds
- Logs into Docker registry (Docker Hub or ECR)
- Extracts metadata for semantic versioning, branch name, and commit SHA
- Builds and pushes backend and frontend images with Docker layer caching
- Timeout: 20 minutes

Tagging strategy:
```yaml
tags:
  - type=semver,pattern={{version}}
  - type=sha,prefix={{branch}}-,format=short
  - type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}
  - type=ref,event=branch
```

#### Deploy Job
- Runs after Docker succeeds (main branch push only)
- Configures kubectl with KubeConfig secret
- Performs rolling update via `kubectl set image`
- Waits for rollout status (120s timeout)
- Runs post-deployment health verification
- Posts commit status notification

### 6.2 Manual Deployment Commands

```bash
# Rollback to previous version
kubectl rollout undo deployment/url-shortener-backend -n url-shortener
kubectl rollout status deployment/url-shortener-backend -n url-shortener

# Check rollout history
kubectl rollout history deployment/url-shortener-backend -n url-shortener

# Scale manually
kubectl scale deployment/url-shortener-backend -n url-shortener --replicas=5
```

---

## 7. Production Considerations

### 7.1 Database Backup Strategy

**PostgreSQL backups combine pg_dump and WAL archiving:**

#### Automated Daily Dumps

```bash
# Run daily at 2 AM via cron or Kubernetes CronJob
pg_dump \
  --host=postgres \
  --port=5432 \
  --username=urlshortener_admin \
  --dbname=url_shortener \
  --format=custom \
  --file=/backups/url_shortener_$(date +%Y%m%d_%H%M%S).dump \
  --verbose \
  --no-owner \
  --compress=9
```

#### WAL Archiving (Continuous Archiving)

Enable in `postgresql.conf`:

```ini
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://url-shortener-backups/wal/%f'
archive_timeout = 60
```

#### Restoration

```bash
# Restore full backup
pg_restore \
  --host=new-host \
  --port=5432 \
  --username=urlshortener_admin \
  --dbname=url_shortener \
  --clean \
  --if-exists \
  --verbose \
  /backups/url_shortener_20240101.dump

# Point-in-time recovery
# 1. Restore base backup
# 2. Create recovery.conf with restore_command to fetch WAL from S3
# 3. Set recovery_target_time to desired timestamp
```

**Retention**: Daily backups retained for 30 days, weekly for 3 months, monthly for 1 year. WAL files retained for 7 days.

### 7.2 Monitoring and Alerting Setup

#### Prometheus Configuration

The `monitoring/prometheus.yml` file defines scrape targets:

```yaml
scrape_configs:
  - job_name: 'url-shortener-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

#### Prometheus Metrics Exposed

The backend exposes the following metrics:

| Metric | Type | Labels | Description |
|---|---|---|---|
| `http_requests_total` | Counter | `method`, `path`, `status` | Total HTTP requests |
| `http_request_duration_ms` | Histogram | `method`, `path` | Request latency buckets |
| `active_connections` | Gauge | — | Current active connections |
| `queue_jobs_{queue}_waiting` | Gauge | — | Bull queue depth |
| `queue_jobs_{queue}_active` | Gauge | — | Jobs currently processing |
| `queue_jobs_{queue}_failed` | Gauge | — | Failed job count |
| `cache_hits_total` | Counter | — | Redis cache hits |
| `cache_misses_total` | Counter | — | Redis cache misses |
| `db_query_duration_ms` | Histogram | `query` | Database query latency |

#### Grafana Dashboards

Create dashboards for:

1. **API Performance**: Request rate, latency (p50/p95/p99), error rate by endpoint
2. **System Health**: CPU, memory, disk I/O per pod, DB connections, Redis memory
3. **Queue Monitoring**: Queue depth, processing rate, failure rate, age of oldest pending job
4. **Business Metrics**: Links created per hour, clicks per minute, active users
5. **Cache Analytics**: Hit ratio, memory usage, eviction rate

#### Alerting Rules

```yaml
groups:
  - name: url-shortener-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels: { severity: critical }
        annotations:
          summary: "Error rate above 5% for 5 minutes"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) > 1000
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "p95 latency above 1s"

      - alert: QueueBacklog
        expr: queue_jobs_click_tracking_waiting > 10000
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "Click tracking queue backlog > 10,000"

      - alert: PodRestarting
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 5m
        labels: { severity: critical }
        annotations:
          summary: "Pod is restarting frequently"
```

### 7.3 Log Aggregation

**Winston logging** produces structured JSON logs:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "message": "Redirect processed",
  "service": "url-shortener",
  "shortCode": "abc1234",
  "ipAddress": "203.0.113.42",
  "durationMs": 12,
  "environment": "production"
}
```

**Shipping to ELK stack**:

```yaml
# Filebeat configuration
filebeat.inputs:
  - type: container
    paths:
      - /var/lib/docker/containers/*/*.log
    json.keys_under_root: true
    json.add_error_key: true

output.elasticsearch:
  hosts: ["https://elasticsearch:9200"]
  index: "url-shortener-%{+yyyy.MM.dd}"
  ssl.verification_mode: none
```

**Shipping to Loki**:

```yaml
# Promtail configuration
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: message
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        target_label: app
```

### 7.4 Disaster Recovery Plan

| Scenario | Recovery Strategy | RTO | RPO |
|---|---|---|---|
| Pod failure | Kubernetes auto-restart (liveness probe) | < 1 min | 0 |
| Node failure | Pods rescheduled on healthy nodes | < 5 min | 0 |
| AZ outage | Multi-AZ RDS, Multi-AZ K8s node groups | < 15 min | < 1 min |
| Database corruption | Point-in-time recovery from WAL archive | < 1 hour | < 1 min |
| Full region outage | Cross-region backup + secondary deployment | < 4 hours | < 15 min |
| Accidental data deletion | Restore from daily backup | < 2 hours | < 24 hours |

**DR Runbook:**

1. **Database recovery**: Spin up new RDS instance from latest snapshot + apply WAL to desired point
2. **Application recovery**: Update ConfigMap `DB_HOST` to restored database endpoint
3. **Verify**: Run health check, verify redirect flow, check analytics accumulation
4. **DNS cutover**: Update Route53 to point to DR environment if primary region is down

### 7.5 SSL/TLS Certificate Management

- **Certificates**: Provisioned automatically via cert-manager + Let's Encrypt
- **Renewal**: Automatic 30 days before expiry
- **Monitoring**: Grafana alert if certificate expiry < 14 days
- **Manual override**: For enterprise customers, bring your own certificate via Kubernetes TLS secrets

### 7.6 Auto-Scaling Policies

| Resource | Metric | Min | Max | Target |
|---|---|---|---|---|
| Backend pods | CPU utilization | 3 | 10 | 70% |
| Frontend pods | CPU utilization | 2 | 5 | 60% |
| RDS storage | Free storage space | 100 GB | 500 GB | Auto-increase when < 10% free |
| Redis memory | Memory usage | — | — | Scale up node type when < 75% free |

### 7.7 Cost Optimization Tips

- **Reserved Instances**: Purchase 1-year or 3-year reserved RDS instances for predictable workloads
- **Spot instances**: Use spot instances for non-critical worker pods (analytics processing, queue workers)
- **S3 lifecycle**: Transition QR codes older than 90 days to S3 Standard-IA, delete after 365 days
- **RDS storage scaling**: Use `gp3` storage with auto-scaling instead of over-provisioning
- **EKS savings**: Use EKS managed node groups with spot instances for the node pool
- **CloudFront**: Use price class "100" (US and Europe only) if global reach isn't required
- **Right-sizing**: Monitor pod resource utilization via Kubernetes Metrics Server and adjust requests/limits

### 7.8 Performance Tuning

#### Database Connection Pooling

- Backend connection pool size: `min: 5, max: 20` per instance
- With 3 backend replicas and 3 read replicas: 60 write connections + 60 read connections total
- RDS `max_connections` = `LEAST({DBInstanceClassMemory/9531392}, 5000)` with connection pooler (PgBouncer) for very high concurrency

#### Redis Memory Management

- `maxmemory` policy: `allkeys-lru` — evicts least recently used keys when memory is full
- `maxmemory` setting: 75% of instance memory (leave headroom for Bull queue operations)
- Monitor eviction rate; if > 100/s, increase memory or reduce TTLs
- Use Redis `--save` for persistence (snapshot every 5 minutes if 100+ writes)

#### Application Layer

- Nginx `keepalive 32` — persistent upstream connections reduce TCP handshake overhead
- Nginx gzip compression for JSON API responses
- Express `compression` middleware for response compression
- Database query optimization: All analytics queries use composite indexes; avoid sequential scans
- Batch click event inserts (batch size 50, flush interval 5 seconds)

### 7.9 Security Best Practices

- **Secrets rotation**: JWT secrets rotated every 90 days; AWS credentials rotated every 90 days via IAM
- **Database encryption**: RDS encrypted at rest (AES-256); TLS 1.2+ for connections
- **Network security**: All services on private subnets (no public IPs); security groups allow only necessary ports
- **Pod security**: Run containers as non-root user; read-only root filesystem; no privilege escalation
- **Regular updates**: Automated dependency scanning via Dependabot; weekly security patch window
- **Audit logging**: All admin actions logged; 1-year retention for audit logs

---

## 8. Monitoring Setup

### 8.1 Prometheus Metrics Endpoint

The backend exposes metrics at `/metrics` (configured via Express):

| Endpoint | Type | Description |
|---|---|---|
| `/metrics` | GET | Prometheus-formatted metrics text |

Accessible internally for Prometheus scraping; not exposed publicly (Nginx blocks external access).

### 8.2 Grafana Dashboard Setup

```bash
# Deploy Grafana via Helm
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm install grafana grafana/grafana \
  --namespace monitoring \
  --create-namespace \
  --set persistence.enabled=true \
  --set persistence.size=10Gi \
  --set adminPassword=<grafana-admin-password> \
  --set datasources."datasources\.yaml".apiVersion=1 \
  --set datasources."datasources\.yaml".datasources[0].name=Prometheus \
  --set datasources."datasources\.yaml".datasources[0].type=prometheus \
  --set datasources."datasources\.yaml".datasources[0].url=http://prometheus-server.monitoring.svc.cluster.local \
  --set datasources."datasources\.yaml".datasources[0].access=proxy \
  --set datasources."datasources\.yaml".datasources[0].isDefault=true
```

Import pre-built dashboards:
1. **Node Exporter Full**: ID `1860` — K8s node metrics
2. **Prometheus 2.0 Overview**: ID `3662` — Prometheus performance
3. Create custom dashboard for URL Shortener specific metrics

### 8.3 Alerting Rules

Configure alerts in Prometheus (`prometheus.yml`):

```yaml
rule_files:
  - /etc/prometheus/alerts.yml
```

Alert channels (configured via Alertmanager):

| Channel | Event | Severity |
|---|---|---|
| Email (ops@shorturl.com) | Error rate > 5%, pod restarting, queue build-up | Critical |
| Slack (#ops-alerts) | High latency, certificate expiry < 14 days, node down | Warning |
| PagerDuty | Full region outage, database inaccessible | Critical |

### 8.4 Log Aggregation with Loki/ELK

**Loki Stack (Recommended for K8s):**

```bash
# Install Loki
helm repo add grafana https://grafana.github.io/helm-charts
helm upgrade --install loki grafana/loki-stack \
  --namespace monitoring \
  --set promtail.enabled=true \
  --set loki.persistence.enabled=true \
  --set loki.persistence.size=50Gi
```

**ELK Stack (Alternative for VM deployment):**

```bash
# Run ELK via Docker Compose
docker-compose -f docker-compose.monitoring.yml up -d
```

Services:
- **Elasticsearch**: Port 9200 — log storage and indexing
- **Logstash**: Port 5000 — log ingestion pipeline
- **Kibana**: Port 5601 — log visualization and exploration

### 8.5 Uptime Monitoring

**External monitoring** (via Pingdom, UptimeRobot, or Checkly):

| Endpoint | Method | Expected Status | Frequency |
|---|---|---|---|
| `https://shorturl.com/health` | GET | 200 | 1 minute |
| `https://api.shorturl.com/api/v1/health` | GET | 200 | 1 minute |
| `https://app.shorturl.com` | GET | 200 | 5 minutes |
| `https://shorturl.com/testhealth` | GET | 404 (valid not found) | 5 minutes |

**Synthetic transaction monitoring:**
1. Register user → Verify 201
2. Login → Verify 200 + access token
3. Create link → Verify 201 + shortCode
4. Follow redirect → Verify 302
5. Get analytics → Verify 200 + click count = 1

**Incident response**: On-call rotation via PagerDuty; severity levels:
- **P0 (Critical)**: Full outage → immediate response
- **P1 (High)**: Degraded performance → response within 15 minutes
- **P2 (Medium)**: Non-critical feature down → response within 1 hour
- **P3 (Low)**: Cosmetic issue → next business day
