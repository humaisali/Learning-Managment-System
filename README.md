# LMS Platform — Early Launch / MVP

A full-stack Learning Management System built with React, Express, PostgreSQL, and Socket.io.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (Vite) + TailwindCSS v4 + Shadcn UI |
| Backend | Node.js + Express.js |
| Database | PostgreSQL 16 + Prisma ORM |
| Real-time | Socket.io |
| Payments | Safepay (JazzCash, EasyPaisa, Card, Bank Transfer) |
| Video (Recorded) | Bunny Stream |
| Video (Live) | Mux Live |
| Notifications | Email (Resend/SES) + SMS |

## Project Structure

```
lms-platform/
├── server/                 # Express API backend
│   ├── src/
│   │   ├── config/         # Environment, DB, Redis config
│   │   ├── middleware/      # Auth, RBAC, validation, error handling
│   │   ├── modules/        # Domain-driven feature modules
│   │   │   ├── auth/       # Registration, login, OTP, password reset
│   │   │   ├── catalog/    # Boards, classes, subjects, topics
│   │   │   ├── enrollment/ # Fee plans, enrollment management
│   │   │   ├── payment/    # Safepay integration, webhooks
│   │   │   └── users/      # User management, suspend/reactivate
│   │   ├── providers/      # External service abstractions
│   │   ├── socket/         # Socket.io server + event handlers
│   │   └── utils/          # Logger, pagination, response helpers
│   └── prisma/
│       ├── schema.prisma   # Database schema (30+ models)
│       └── seed.js         # Development seed data
├── client/                 # React SPA frontend
│   └── src/
│       ├── components/     # UI primitives + layouts
│       ├── features/       # Feature modules (auth, student, parent, teacher, admin)
│       ├── hooks/          # useApi, useSocket
│       ├── lib/            # API client, socket, utils, constants
│       └── stores/         # Zustand state management
└── README.md
```

## Prerequisites

- Node.js 18+
- PostgreSQL 16+
- Redis (optional for development, required for production)

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd lms-platform

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

```bash
cd server
cp .env.example .env
# Edit .env with your database URL and secrets
```

**Minimum required for local development:**
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/lms_platform"
JWT_ACCESS_SECRET=your-secret-at-least-32-characters-long
JWT_REFRESH_SECRET=another-secret-at-least-32-characters
```

### 3. Setup Database

```bash
cd server

# Generate Prisma client
npm run db:generate

# Run migrations (creates all tables)
npm run db:migrate

# Seed with test data
npm run db:seed
```

### 4. Start Development Servers

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health check: http://localhost:5000/api/health

### 5. Test Login Credentials

After seeding, use these accounts:

| Role | Email | Password |
|------|-------|----------|
| System Admin | admin@lms.local | password123 |
| Head Office | headoffice@lms.local | password123 |
| Subject Teacher | teacher.math@lms.local | password123 |
| Student | student@lms.local | password123 |
| Parent | parent@lms.local | password123 |

## API Endpoints

All routes prefixed with `/api/v1`

### Authentication
- `POST /auth/register` — Student self-registration
- `POST /auth/login/email` — Email + password login
- `POST /auth/login/phone` — Phone + OTP login
- `POST /auth/request-otp` — Request SMS OTP
- `POST /auth/forgot-password` — Password reset email
- `POST /auth/reset-password` — Complete reset
- `POST /auth/refresh` — Refresh access token
- `POST /auth/logout` — Revoke tokens
- `GET /auth/me` — Current user profile

### Catalog
- `GET /catalog/boards` — List boards
- `GET /catalog/boards/:id/classes` — Classes under board
- `GET /catalog/classes/:id/subjects` — Subjects under class
- `GET /catalog/subjects/:id/topics` — Topics under subject
- `POST /catalog/boards|classes|subjects|topics` — Create (admin)
- `PUT /catalog/boards|classes|subjects|topics/:id` — Update (admin)

### Enrollment & Payments
- `GET /enrollment/plans` — List fee plans
- `POST /enrollment/create` — Create enrollment
- `POST /payment/initiate` — Start payment
- `POST /payment/webhooks/safepay` — Payment confirmation
- `PUT /payment/verify-bank/:id` — Manual bank verification

### Users (Admin)
- `GET /users` — List/search users
- `GET /users/:id` — User detail
- `PUT /users/:id/suspend` — Suspend account
- `PUT /users/:id/reactivate` — Reactivate account
- `POST /users/staff` — Create staff user

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Foundations | ✅ Complete | Auth, RBAC, catalog, fee plans, schema, scaffolding |
| Phase 2: Learning Core | ✅ Complete | Content upload, video player, MCQs, progress tracking |
| Phase 3: Support Workflows | ✅ Complete | Doubts, teacher queue, live sessions, notifications |
| Phase 4: Visibility | ✅ Complete | Parent dashboard, admin dashboard, complaints, reports |
| Phase 5: Hardening | ✅ Complete | Security, testing, Docker, CI/CD, monitoring, launch checklist |

## Production Deployment

### Docker (recommended)

```bash
# Set environment variables
cp server/.env.production.example server/.env

# Build and start all services
docker-compose up -d

# Run database migrations
docker-compose exec server npx prisma migrate deploy

# Seed initial data
docker-compose exec server node prisma/seed.js
```

### Manual Deployment

```bash
# Server
cd server
npm ci --only=production
npx prisma generate
npx prisma migrate deploy
node src/server.js

# Client
cd client
npm ci
npm run build
# Serve dist/ with Nginx
```

### Health Checks

- `GET /api/health` — Basic alive check
- `GET /api/health/deep` — Database + dependency check
- `GET /api/health/live` — Container liveness probe
- `GET /api/health/ready` — Container readiness probe

### Backup

```bash
# Manual backup
cd server && npm run backup

# Automated (cron — daily at 2 AM)
0 2 * * * /path/to/server/scripts/backup-db.sh >> /var/log/lms-backup.log 2>&1
```

## Security

See `SECURITY_REVIEW.md` for the full OWASP Top 10 review.
See `LAUNCH_CHECKLIST.md` for the complete pre-launch verification list.

## Architecture Decisions

- **Provider abstraction**: Every external service (video, payment, SMS) accessed through an interface. Swap providers without code changes.
- **PostgreSQL over MongoDB**: Enforced referential integrity for relational data (enrollments, payments, content hierarchy).
- **JWT with rotation**: 15-min access tokens, 7-day refresh tokens with rotation on every use.
- **Audit trail**: Immutable logs for all sensitive admin actions.
- **Attention Score**: Weighted composite (watch time 35%, completion 25%, MCQ 20%, doubts 12%, login 8%).
- **Defense in depth**: Security at transport, auth, RBAC, validation, sanitization, and audit layers.
- **Docker-first deployment**: Multi-stage builds, non-root containers, health checks built in.

## License

Proprietary — All rights reserved.
