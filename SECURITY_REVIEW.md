# LMS Platform — OWASP Top 10 Security Review

How the LMS platform addresses each OWASP Top 10 (2021) vulnerability category.

---

## A01:2021 — Broken Access Control

**Status: MITIGATED**

- Server-side RBAC enforced on every protected endpoint (`middleware/rbac.js`)
- JWT authentication checked before any role check (`middleware/auth.js`)
- Frontend route guards are convenience only — never trusted as security boundary
- Students cannot access teacher/admin endpoints (returns 403)
- Parents can only view their linked child's data (parent-child link verified)
- Suspended users blocked from all protected resources
- API returns 401 for missing tokens, 403 for insufficient permissions
- Direct object reference: enrollment/content access checks against student's plan

## A02:2021 — Cryptographic Failures

**Status: MITIGATED**

- All traffic over HTTPS/TLS 1.2+ (HSTS header enforced)
- Passwords stored as bcrypt hashes with cost factor 12 (never plaintext, never reversible)
- JWT tokens signed with HS256 using 256-bit secrets
- Payment card data never stored — Safepay hosted checkout handles PCI scope
- Database connection uses SSL in production (`?sslmode=require`)
- OTP codes expire after 5 minutes and are single-use
- Password reset tokens are SHA-256 hashed before storage

## A03:2021 — Injection

**Status: MITIGATED**

- SQL injection prevented: Prisma ORM uses parameterized queries exclusively
- No raw SQL in application code
- All user inputs validated with Zod schemas before reaching business logic
- XSS prevented: React escapes output by default + `sanitizeBody` middleware strips script tags
- Request body sanitization removes `<script>`, `<iframe>`, `javascript:` patterns
- CSP headers via Helmet restrict inline script execution in production

## A04:2021 — Insecure Design

**Status: MITIGATED**

- Defense-in-depth: multiple security layers (transport, auth, RBAC, validation, audit)
- Provider abstraction: external services accessed through interfaces, not direct calls
- Payment idempotency: duplicate webhooks cannot create duplicate activations
- Enrollment access: content locked until payment confirmed server-side (not client-side)
- Attention score: verified watch time only — tab-hidden pauses tracking (anti-gaming)
- Doubt minimum length prevents spam submissions
- Rate limiting on all endpoints, strict limits on auth endpoints

## A05:2021 — Security Misconfiguration

**Status: MITIGATED**

- Helmet middleware enables secure defaults (X-Content-Type-Options, X-Frame-Options, etc.)
- `X-Powered-By` header removed
- Stack traces hidden in production error responses
- Default credentials: seed accounts use documented passwords — must be changed for production
- CORS restricted to configured client URL only
- Rate limiting prevents brute force
- Suspicious request detector blocks path traversal, SQL injection patterns, and common probes
- Docker images run as non-root users

## A06:2021 — Vulnerable and Outdated Components

**Status: MONITORING REQUIRED**

- `npm audit` integrated into CI/CD pipeline (runs on every push)
- GitHub Dependabot can be enabled for automated dependency updates
- Production images built from specific Node.js LTS versions
- Alpine-based Docker images minimize attack surface
- **Action item**: Enable automated security alerts in GitHub repository settings

## A07:2021 — Identification and Authentication Failures

**Status: MITIGATED**

- Progressive lockout: 5 failed logins → 15-minute cooldown (via rate limiter)
- OTP limited to 3 attempts per 5-minute window
- JWT access tokens expire in 15 minutes (short-lived)
- Refresh token rotation: old tokens invalidated on every refresh
- Logout revokes all refresh tokens for the user
- Suspended accounts: all active tokens revoked immediately
- Password minimum 8 characters enforced by Zod schema
- Password reset tokens single-use and time-limited (1 hour)

## A08:2021 — Software and Data Integrity Failures

**Status: MITIGATED**

- Webhook signatures verified for Safepay payment callbacks
- CI/CD pipeline validates code before deployment
- Docker images built in CI with checksums
- Prisma migrations tracked in version control
- Audit logs are append-only — no update/delete through any interface
- Payment records are immutable after confirmation

## A09:2021 — Security Logging and Monitoring Failures

**Status: MITIGATED**

- Winston structured logging with JSON output in production
- Audit trail for all sensitive admin actions (suspend, fee change, refund, etc.)
- Login success/failure logging with IP addresses
- Suspicious request detection with logging
- Health check endpoints for uptime monitoring
- **Recommended**: Ship logs to centralized service (Datadog, CloudWatch, ELK)
- **Recommended**: Configure Sentry for real-time error tracking

## A10:2021 — Server-Side Request Forgery (SSRF)

**Status: LOW RISK**

- Application does not accept user-supplied URLs for server-side fetching
- Video upload uses pre-signed URLs — browser uploads directly to Bunny (no proxy)
- External API calls are made only to pre-configured provider endpoints
- No URL preview/unfurling features that could be exploited
- Webhook endpoints validate signatures before processing

---

*Review Date: March 2026 | Reviewer: Architecture Team*
