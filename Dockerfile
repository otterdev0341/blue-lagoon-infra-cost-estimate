# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --prefer-offline

COPY frontend/ ./
# Inject prod API base (same origin — no change needed, /api already relative)
RUN npm run build


# ── Stage 2: Runtime (Bun) ────────────────────────────────────────────────────
FROM oven/bun:1.1-alpine AS runtime

WORKDIR /app

# Install backend deps
COPY backend/package.json ./
RUN bun install --production --frozen-lockfile

# Copy backend source
COPY backend/src ./src

# Copy built frontend into ./public (served as static by Hono)
COPY --from=frontend-builder /app/frontend/dist ./public

# Koyeb / Railway expose PORT env var — default 3001
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health-check so Koyeb knows the service is alive
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["bun", "run", "src/index.ts"]
