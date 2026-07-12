#!/usr/bin/env bash
# ============================================================
# rusty-shop — One command to start everything
# Usage: ./start.sh [--build] [--down] [--logs]
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_banner() {
  echo -e "${CYAN}"
  echo "  ██████  ██    ██ ███████ ████████ ██    ██     ███████ ██   ██  ██████  ██████  "
  echo "  ██   ██ ██    ██ ██         ██     ██  ██      ██      ██   ██ ██    ██ ██   ██ "
  echo "  ██████  ██    ██ ███████    ██      ████       ███████ ███████ ██    ██ ██████  "
  echo "  ██   ██ ██    ██      ██    ██       ██             ██ ██   ██ ██    ██ ██      "
  echo "  ██   ██  ██████  ███████    ██       ██        ███████ ██   ██  ██████  ██      "
  echo -e "${NC}"
}

setup_env() {
  if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo -e "${YELLOW}⚙  .env not found — copying from .env.example${NC}"
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    echo -e "${GREEN}✓  .env created. Edit it if needed, then re-run this script.${NC}"
  fi
}

case "${1}" in
  --down)
    echo -e "${YELLOW}Stopping all containers...${NC}"
    docker compose -f "$PROJECT_DIR/docker-compose.yml" down
    echo -e "${GREEN}✓  All containers stopped.${NC}"
    exit 0
    ;;
  --logs)
    docker compose -f "$PROJECT_DIR/docker-compose.yml" logs -f
    exit 0
    ;;
  --build)
    BUILD_FLAG="--build"
    ;;
  *)
    BUILD_FLAG=""
    ;;
esac

print_banner
setup_env

echo -e "${CYAN}Starting rusty-shop...${NC}"
docker compose -f "$PROJECT_DIR/docker-compose.yml" up -d $BUILD_FLAG

echo ""
echo -e "${GREEN}✓  All services are up!${NC}"
echo ""
echo -e "  🌐 Frontend  → ${CYAN}http://localhost${NC}"
echo -e "  🔌 Backend   → ${CYAN}http://localhost:8080/api/v1${NC}"
echo -e "  🗄  Database  → ${CYAN}localhost:5432${NC}"
echo ""
echo -e "  Logs  : ${YELLOW}./start.sh --logs${NC}"
echo -e "  Stop  : ${YELLOW}./start.sh --down${NC}"
echo -e "  Rebuild: ${YELLOW}./start.sh --build${NC}"
echo ""
