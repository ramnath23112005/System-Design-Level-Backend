#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  URL Shortener - Setup Script${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

check_prerequisite() {
  local cmd=$1
  local name=$2
  local min_version=$3

  if command -v "$cmd" &> /dev/null; then
    local version
    version=$($cmd --version 2>&1 | head -n1 || true)
    log_ok "$name: $version"
  else
    log_error "$name is not installed. Please install $name >= $min_version"
    return 1
  fi
}

log_info "Checking prerequisites..."
check_prerequisite "node" "Node.js" "18.0.0" || FAILED=true
check_prerequisite "npm" "npm" "9.0.0" || FAILED=true
check_prerequisite "docker" "Docker" "24.0.0" || FAILED=true
check_prerequisite "docker-compose" "Docker Compose" "2.20.0" || FAILED=true

if command -v "kubectl" &> /dev/null; then
  log_ok "kubectl: $(kubectl version --client --short 2>&1 | head -n1)"
else
  log_warn "kubectl is not installed (optional for local dev)"
fi

if [ "${FAILED:-false}" = true ]; then
  log_error "Please install missing prerequisites and try again."
  exit 1
fi

echo ""

log_info "Installing project dependencies..."
npm ci
log_ok "Dependencies installed"

echo ""

log_info "Setting up environment configuration..."
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    log_ok "Created .env from .env.example"
    log_warn "Please review .env and update secrets before production use"
  else
    log_error ".env.example not found"
    exit 1
  fi
else
  log_ok ".env file already exists"
fi

echo ""

log_info "Building shared package..."
npm run build:shared
log_ok "Shared package built"

echo ""

log_info "Building backend package..."
npm run build:backend
log_ok "Backend built"

echo ""

log_info "Running database migrations..."
npm run migrate 2>/dev/null && log_ok "Migrations completed" || log_warn "Migrations skipped (database may not be running)"
npm run seed 2>/dev/null && log_ok "Demo data seeded" || log_warn "Seeding skipped (database may not be running)"

echo ""

log_info "Starting development environment..."
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  Backend API:     ${CYAN}http://localhost:3000${NC}"
echo -e "  API Health:      ${CYAN}http://localhost:3000/api/v1/health${NC}"
echo -e "  Frontend:        ${CYAN}http://localhost:3001${NC}"
echo -e "  PostgreSQL:      ${CYAN}localhost:5432${NC}"
echo -e "  Redis:           ${CYAN}localhost:6379${NC}"
echo ""
echo -e "  Run ${YELLOW}docker-compose up -d${NC} to start all services"
echo -e "  Run ${YELLOW}npm run dev${NC} to start in development mode"
echo ""

log_info "Starting development services with Docker..."
docker-compose up -d 2>/dev/null || {
  log_warn "Docker Compose failed to start. Check Docker is running."
  log_info "You can start services manually with: npm run dev"
}

echo ""
log_info "Done!"
