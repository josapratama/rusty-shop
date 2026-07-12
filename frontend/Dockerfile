# ============================================================
# Online Shop - Frontend Dockerfile (React / Vite + Nginx)
# Multi-stage build: builder → nginx
# ============================================================

# ---- Stage 1: Builder ----
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Cache dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source dan build
COPY . .

# Build argument untuk API URL (bisa di-override saat build)
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN bun run build

# ---- Stage 2: Nginx ----
FROM nginx:1.27-alpine AS runtime

# Copy hasil build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy konfigurasi nginx custom
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
