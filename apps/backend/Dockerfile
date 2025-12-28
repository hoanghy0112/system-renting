# ================================
# Stage 1: Dependencies
# ================================
FROM node:20-alpine AS deps

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ================================
# Stage 2: Builder
# ================================
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules

# Copy source code
COPY . .

# Build shared-types first
RUN pnpm --filter @distributed-compute/shared-types build

# Generate Prisma client
RUN pnpm --filter backend db:generate

# Build backend
RUN pnpm --filter backend build

# ================================
# Stage 3: Production Runner
# ================================
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built assets
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared-types/dist ./node_modules/@distributed-compute/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json ./node_modules/@distributed-compute/shared-types/

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/marketplace/stats || exit 1

CMD ["node", "dist/main.js"]
