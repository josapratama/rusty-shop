# ============================================================
# Online Shop - Backend Dockerfile (Rust / Axum)
# Multi-stage build: builder → runtime
# ============================================================

# ---- Stage 1: Builder ----
FROM rust:1.88-slim-bookworm AS builder

WORKDIR /app

# Install system dependencies untuk SQLx (OpenSSL, pkg-config)
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Cache dependencies terlebih dahulu (layer caching)
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Copy source code dan build ulang
COPY src ./src
RUN touch src/main.rs && cargo build --release

# ---- Stage 2: Runtime ----
FROM debian:bookworm-slim AS runtime

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary dari builder
COPY --from=builder /app/target/release/server ./server

# Non-root user untuk keamanan
RUN useradd -r -s /bin/false appuser
USER appuser

EXPOSE 8080

CMD ["./server"]
