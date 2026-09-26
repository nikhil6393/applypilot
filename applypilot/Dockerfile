# ── Stage 1: Build & Bundle ──────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install native compilation dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy root dependency definitions
COPY package.json package-lock.json ./

# Copy internal workspace packages package.json definitions
COPY packages/domain/package.json ./packages/domain/
COPY packages/config/package.json ./packages/config/
COPY packages/scraping/package.json ./packages/scraping/
COPY packages/db/package.json ./packages/db/
COPY packages/scoring/package.json ./packages/scoring/
COPY packages/ai-local/package.json ./packages/ai-local/
COPY packages/parsing/package.json ./packages/parsing/
COPY packages/security/package.json ./packages/security/

# Clean install all dependencies (including devDependencies for compilation)
RUN npm ci

# Copy entire source tree
COPY . .

# Compile TypeScript and bundle frontend and backend
RUN npm run build

# ── Stage 2: Production Runtime ─────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/applypilot.db
ENV LOG_FORMAT=json

# Install minimal runtime dependencies
RUN apk add --no-cache wget python3 make g++

# Copy root dependency manifests
COPY package.json package-lock.json ./
COPY packages/domain/package.json ./packages/domain/
COPY packages/config/package.json ./packages/config/
COPY packages/scraping/package.json ./packages/scraping/
COPY packages/db/package.json ./packages/db/
COPY packages/scoring/package.json ./packages/scoring/
COPY packages/ai-local/package.json ./packages/ai-local/
COPY packages/parsing/package.json ./packages/parsing/
COPY packages/security/package.json ./packages/security/

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built bundles and public assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/packages ./packages
COPY public ./public

# Setup persistent data directory
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3000

# Container liveness probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health/live || exit 1

CMD ["node", "dist/server.cjs"]
