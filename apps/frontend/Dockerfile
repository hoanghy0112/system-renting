# ================================
# Stage 1: Dependencies
# ================================
FROM node:20-alpine AS deps
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ================================
# Stage 2: Builder
# ================================
FROM node:20-alpine AS builder
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable pnpm

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules

# Copy source files
COPY . .

# Build shared-types first
RUN pnpm --filter @distributed-compute/shared-types build

# Build frontend
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter frontend build

# ================================
# Stage 3: Production Runner
# ================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

# Start the application
CMD ["node", "apps/frontend/server.js"]
