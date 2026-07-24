# LMS Platform — Production Launch Checklist

## Pre-Launch Verification

Complete every item before going live. Each section has a sign-off box.

---

### 1. Infrastructure Setup

- [ ] **Domain registered** and DNS configured (A record pointing to server IP)
- [ ] **SSL certificate** provisioned (Let's Encrypt or Cloudflare — HTTPS mandatory)
- [ ] **Cloud VPS provisioned** with minimum specs: 2 vCPU, 4GB RAM, 80GB SSD
- [ ] **Managed PostgreSQL** instance created with automated daily backups enabled
- [ ] **Redis instance** provisioned (managed or self-hosted)
- [ ] **CDN configured** for static frontend assets (Cloudflare recommended)
- [ ] **Firewall rules** configured:
  - Port 80/443 open (HTTP/HTTPS)
  - Port 22 restricted to admin IPs only
  - Database port (5432) NOT exposed publicly
  - Redis port (6379) NOT exposed publicly

### 2. Environment Configuration

- [ ] `.env.production` created from `.env.production.example` with ALL real values
- [ ] `JWT_ACCESS_SECRET` generated: `openssl rand -hex 32`
- [ ] `JWT_REFRESH_SECRET` generated: `openssl rand -hex 32` (different from access)
- [ ] `DATABASE_URL` points to production database with `?sslmode=require`
- [ ] `REDIS_URL` points to production Redis
- [ ] `CLIENT_URL` set to production domain (https://yourdomain.com)
- [ ] `NODE_ENV` set to `production`
- [ ] Secrets are NOT committed to version control (verified in .gitignore)

### 3. External Service Credentials

- [ ] **Safepay** production API key and webhook secret configured
- [ ] **Safepay webhook URL** registered: `https://yourdomain.com/api/v1/payment/webhooks/safepay`
- [ ] **Bunny Stream** API key and library ID configured
- [ ] **Bunny CDN hostname** set correctly
- [ ] **Mux** production token ID and secret configured
- [ ] **Resend** (or SES) API key configured, sender domain verified
- [ ] **SMS provider** API key configured (Twilio or local)
- [ ] All sandbox/test flags set to `false`

### 4. Database Readiness

- [ ] `npx prisma migrate deploy` run against production database
- [ ] `npx prisma db seed` run with real initial data:
  - System Admin account created
  - Head Office account(s) created
  - Boards (Federal, Punjab, Cambridge) created
  - Classes created under each board
  - Subjects created under each class
  - Topics created under each subject
  - Fee plans created and activated
- [ ] Seed credentials stored securely and shared with operations team
- [ ] Database connection pooling configured (Prisma default: 10 connections)
- [ ] Database backup schedule verified (automated daily, 7-day retention)
- [ ] Point-in-time recovery tested

### 5. Security Verification

- [ ] **HTTPS enforced** — all HTTP redirects to HTTPS
- [ ] **HSTS header** present with min 1-year max-age
- [ ] **CORS** restricted to production domain only (no wildcards)
- [ ] **Helmet** enabled with Content-Security-Policy
- [ ] **Rate limiting** active on all API endpoints (100/15min general, 10/15min auth)
- [ ] **JWT tokens** using RS256 or HS256 with strong secrets (min 32 chars)
- [ ] **Passwords** hashed with bcrypt cost factor 12
- [ ] **Payment card data** never touches our server (Safepay hosted checkout)
- [ ] **SQL injection** prevented (Prisma parameterized queries, no raw SQL)
- [ ] **XSS prevention** — React escaping + sanitizeBody middleware + CSP headers
- [ ] **RBAC** enforced server-side on every protected endpoint
- [ ] **Webhook signatures** verified for Safepay callbacks
- [ ] **Suspicious request detector** enabled and logging
- [ ] `X-Powered-By` header removed
- [ ] No sensitive data in error responses (production error handler strips details)
- [ ] Audit logging active for all admin actions
- [ ] npm audit shows no critical/high vulnerabilities

### 6. Functional Testing

- [ ] **Registration flow**: Student registers with email → receives confirmation
- [ ] **Registration flow**: Student registers with phone → receives OTP → verifies
- [ ] **Login**: Email + password login works
- [ ] **Login**: Phone + OTP login works
- [ ] **Password reset**: Forgot password → email → reset → new login
- [ ] **Enrollment**: Student selects plan → payment initiated → Safepay checkout
- [ ] **Payment (Card)**: Card payment → webhook → enrollment activated → content unlocked
- [ ] **Payment (JazzCash)**: JazzCash flow → webhook → activation
- [ ] **Payment (EasyPaisa)**: EasyPaisa flow → webhook → activation
- [ ] **Payment (Bank Transfer)**: Transfer → admin verifies → activation
- [ ] **Payment retry**: Failed payment → retry screen → no partial access
- [ ] **Content upload**: Central teacher uploads video → draft → publish → student sees it
- [ ] **Video playback**: Student watches video → heartbeats recorded → progress updates
- [ ] **Key points**: Teacher uploads → published → student reads
- [ ] **MCQ**: Teacher creates set → student attempts → instant scoring → result review
- [ ] **Doubt submission**: Student submits (min 20 chars) → teacher notified in real-time
- [ ] **Doubt response**: Teacher responds → student notified (Socket + email)
- [ ] **Live session**: Teacher creates → goes live → student watches + chats → ends → recording saved
- [ ] **Parent dashboard**: Attention score displays with correct breakdown
- [ ] **Parent messaging**: Parent messages teacher → teacher sees and replies
- [ ] **Admin dashboard**: Metrics load with real data
- [ ] **Admin: Enrollments**: Search, filter, pagination work
- [ ] **Admin: Payments**: Bank transfer verification works
- [ ] **Admin: Users**: Suspend → tokens revoked → user blocked. Reactivate → access restored
- [ ] **Admin: Complaints**: Create → status lifecycle → resolution → close
- [ ] **Admin: Fee plans**: Create → edit → deactivate works
- [ ] **Admin: Reports**: CSV exports download correctly
- [ ] **Notifications**: Bell icon shows unread count, dropdown lists notifications, mark-as-read works
- [ ] **Role isolation**: Students cannot access teacher/admin routes (403)
- [ ] **Suspended users**: Blocked from all protected resources

### 7. Performance Baseline

- [ ] Dashboard pages load within 3 seconds on broadband
- [ ] Payment confirmation reflects within 60 seconds of webhook
- [ ] Engagement data refreshes within 60 seconds
- [ ] Doubt queue refreshes within 15 seconds of new doubt
- [ ] Video playback starts within 5 seconds
- [ ] API response times under 500ms for standard queries

### 8. Monitoring & Alerting

- [ ] **Application logs** shipping to centralized logging (CloudWatch, Datadog, or similar)
- [ ] **Error tracking** configured (Sentry recommended)
- [ ] **Uptime monitoring** configured for:
  - `GET /api/health` — basic alive check
  - `GET /api/health/deep` — database connectivity check
  - `GET /api/health/ready` — readiness probe
- [ ] **Alert thresholds** set:
  - Server down → immediate alert
  - Error rate > 5% → alert within 5 minutes
  - Response time p95 > 3s → alert within 10 minutes
  - Database connection failures → immediate alert
  - Disk usage > 80% → warning
- [ ] **Dashboard** configured showing: request rate, error rate, response times, active users

### 9. Backup & Recovery

- [ ] Database backup script tested: `npm run backup`
- [ ] Backup files verified — can be restored to a fresh database
- [ ] Recovery drill completed — restored from backup within RTO target (4 hours)
- [ ] Backup cron job scheduled (daily at 2 AM)
- [ ] Backup retention policy: 7 days minimum
- [ ] Application Docker images tagged and stored in container registry
- [ ] Rollback procedure documented — revert to previous image tag

### 10. Launch Day Procedures

- [ ] Deploy Docker containers to production server
- [ ] Run `npx prisma migrate deploy` on production
- [ ] Verify `/api/health/deep` returns healthy
- [ ] Verify frontend loads correctly at production domain
- [ ] Test one complete enrollment flow end-to-end with real payment
- [ ] Verify parent account activation triggers correctly
- [ ] Verify email notifications arrive
- [ ] Verify SMS notifications arrive (OTP, payment confirmation)
- [ ] Monitor error logs for first 2 hours post-launch
- [ ] Keep rollback image ready for first 48 hours

### 11. Post-Launch (First Week)

- [ ] Monitor daily active users and error rates
- [ ] Review audit logs for unexpected admin actions
- [ ] Check payment reconciliation — Safepay dashboard matches internal ledger
- [ ] Review aged doubts — none older than 24 hours without response
- [ ] Verify backup execution — confirm daily backup files exist
- [ ] Collect teacher feedback on content upload workflow
- [ ] Collect parent feedback on dashboard clarity
- [ ] Document any issues found and prioritize fixes

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical Lead | | | |
| QA Lead | | | |
| Operations Manager | | | |
| Product Owner | | | |

---

*Document Version: 1.0 | Created: March 2026 | Classification: Internal*
