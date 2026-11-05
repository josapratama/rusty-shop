# ============================================================
# Rusty Shop - Production Unified Multi-Stage Dockerfile
# Builds Frontend (React + Vite) and Backend (Rust Axum)
# Serves everything through Axum on Port 3000
# ============================================================

# ── Stage 1: Build Frontend (React + Vite) ──────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build Backend (Rust / Axum) ─────────────────────────────────────
FROM rust:1.82-slim-bookworm AS backend-builder
WORKDIR /app

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

COPY backend/Cargo.toml backend/Cargo.lock ./backend/
RUN mkdir -p backend/src && echo "fn main() {}" > backend/src/main.rs
RUN cd backend && cargo build --release || true
RUN rm -rf backend/src backend/target/release/deps/online_shop_backend* backend/target/release/server*

COPY database/migrations ./database/migrations
COPY backend/src ./backend/src
RUN cd backend && cargo build --release

# ── Stage 3: Production Runtime ─────────────────────────────────────────────
FROM debian:bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

COPY --from=backend-builder /app/backend/target/release/server /app/server
COPY --from=frontend-builder /app/frontend/dist /app/dist

RUN mkdir -p /app/uploads

ENV HOST=0.0.0.0
ENV PORT=3000
ENV FRONTEND_DIST=/app/dist
ENV UPLOAD_DIR=/app/uploads

EXPOSE 3000

CMD ["/app/server"]
