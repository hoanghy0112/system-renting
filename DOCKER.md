# DistributedCompute - Docker Setup Guide

## Quick Start

### Development Mode

```bash
# 1. Start all services (backend + infrastructure)
docker-compose up -d

# 2. Check service status
docker-compose ps

# 3. View backend logs
docker-compose logs -f backend

# 4. Run database migrations
docker-compose exec backend pnpm db:push
```

**Services Available:**
| Service | URL | Description |
|---------|-----|-------------|
| Backend API | http://localhost:3000/api | NestJS REST API |
| WebSocket | ws://localhost:3000/fleet | Agent Gateway |
| PostgreSQL | localhost:5432 | Database |
| InfluxDB | http://localhost:8086 | Metrics Dashboard |
| Redis | localhost:6379 | Cache |
| FRP Dashboard | http://localhost:7500 | Tunnel Admin (admin:admin) |

---

## Production Deployment

### 1. Prepare Environment

```bash
# Copy production environment template
cp .env.prod.example .env.prod

# Edit with secure values
nano .env.prod
```

### 2. Build and Deploy

```bash
# Build production image
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start in production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d

# Run database migrations
docker-compose exec backend npx prisma migrate deploy
```

### 3. Verify Deployment

```bash
# Check all services are healthy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Check backend health
curl http://localhost:3000/api/marketplace/stats

# View logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
```

---

## Common Commands

### Development

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild backend after code changes
docker-compose up -d --build backend

# View logs
docker-compose logs -f backend

# Access backend shell
docker-compose exec backend sh

# Run Prisma Studio
docker-compose exec backend pnpm db:studio
```

### Database Management

```bash
# Push schema changes (development)
docker-compose exec backend pnpm db:push

# Run migrations (production)
docker-compose exec backend npx prisma migrate deploy

# Create new migration
docker-compose exec backend npx prisma migrate dev --name your_migration_name

# Open Prisma Studio
docker-compose exec backend pnpm db:studio
```

### Production

```bash
# Start production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d

# Scale backend (if needed)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale backend=3

# Rolling restart
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --build backend

# View production logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Backup database
docker-compose exec postgres pg_dump -U dev distributed_compute > backup.sql
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network                            │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │   Backend   │  │   PostgreSQL │  │     InfluxDB       │  │
│  │   :3000     │──│    :5432     │  │      :8086         │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
│         │                                      │             │
│         │         ┌──────────────┐            │             │
│         └─────────│    Redis     │────────────┘             │
│                   │    :6379     │                          │
│                   └──────────────┘                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    FRP Server                        │   │
│  │   Control: :7000  Dashboard: :7500  Tunnels: 10000+  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
        │
        │ Public Access
        ▼
   ┌─────────────┐
   │ Host Agents │  Connect via frpc to :7000
   └─────────────┘
```

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Database not ready - wait for postgres healthcheck
# 2. Missing env vars - check .env file
# 3. Port conflict - check if 3000 is in use
```

### Database connection failed

```bash
# Verify postgres is running
docker-compose ps postgres

# Check postgres logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U dev -d distributed_compute -c "SELECT 1"
```

### Reset everything

```bash
# Stop and remove all containers, volumes
docker-compose down -v

# Rebuild from scratch
docker-compose up -d --build
```

### Hot reload not working

```bash
# Ensure volumes are mounted correctly
docker-compose exec backend ls -la /app/apps/backend/src

# Restart with fresh build
docker-compose up -d --build backend
```
