# Aogidan backend

Standalone API for the Aogidan law-firm site. Owns the Postgres database,
authentication, file uploads, and all business logic. Deploy this on
Render (or any Node host); the frontend (a separate Next.js app deployed
on Netlify) talks to this over HTTPS.

## Local development

```bash
npm install
cp .env.example .env   # then fill in real values
npm run db:migrate     # applies the existing schema migrations
npm run db:seed        # optional: fictional demo content + admin logins
npm run dev            # http://localhost:4000
```

## Environment variables

See `.env.example`. Two are easy to get wrong:

- **`JWT_SECRET`** must be the *exact same string* on the backend and the
  frontend. This backend signs the login session token; the frontend only
  verifies it. If they don't match, every login will silently fail.
- **`FRONTEND_ORIGIN`** must be your deployed Netlify URL (comma-separate
  if you also want to allow a preview-deploy URL). This backend rejects
  cross-origin requests from anywhere else.

## Deploying to Render

1. Push this folder to its own Git repo (or a subfolder of a monorepo —
   Render lets you set a root directory).
2. In Render: New → Web Service → connect the repo.
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
3. Add the environment variables from `.env.example`. A `render.yaml`
   blueprint is included if you'd rather deploy via `render blueprint`.
4. Once it's live, note the service URL (e.g.
   `https://aogidan-backend.onrender.com`) — the frontend needs it as
   `API_URL`.
5. Run migrations against the production database once
   (`DATABASE_URL=<prod> npm run db:migrate`, from your machine or a
   Render shell).

**Storage note:** Render's free/starter disk is not persistent across
deploys. Set `STORAGE_DRIVER=s3` and point it at Cloudflare R2 (or any
S3-compatible bucket) — the code already supports this, it just needs
credentials. `STORAGE_DRIVER=local` will work but uploaded images will
be lost on the next deploy or restart.

## What changed from the original Next.js app

This is the same business logic (Drizzle schema, validation, auth rules,
rate limiting, email notifications) lifted out of Next.js API routes and
Server Components into a plain Express app:

- `src/db/schema.ts` — unchanged Drizzle schema.
- `src/auth.ts` — replaces NextAuth. Same credentials check (bcrypt +
  rate-limited), but issues a signed JWT instead of a NextAuth session,
  since the frontend and backend are no longer the same app.
- `src/routes/public.ts` — new: read-only endpoints for the marketing
  site, since those pages used to query Postgres directly from Server
  Components. Also owns the contact/consultation form submissions.
- `src/routes/admin-*.ts` — the former `app/api/admin/**/route.ts`
  handlers, translated from Next's `Request`/`Response` to Express
  `req`/`res`. The logic inside each handler is unchanged.
