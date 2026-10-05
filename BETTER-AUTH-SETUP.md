# Better Auth setup for Adoveautoimage / Particle Studio

This project now includes email/password authentication backed by MongoDB.

## 1. Install packages

Use Node.js 20 or newer. From the project root, run:

```bash
npm install
npm install better-auth @better-auth/mongo-adapter mongodb
```

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

- `BETTER_AUTH_SECRET`: a unique random secret (at least 32 characters). Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- `BETTER_AUTH_URL`: `http://localhost:3000` locally; set to `https://adoveautoimage.vercel.app` in Vercel Production.
- `NEXT_PUBLIC_BETTER_AUTH_URL`: same origin as `BETTER_AUTH_URL`.
- `MONGODB_URI`: your MongoDB Atlas connection string.
- `MONGODB_DB`: database name (defaults to `adoveautoimage`).

Never commit `.env.local` or share your database credentials. Make sure `.env.local` is ignored by Git.

## 3. Run locally

```bash
npm run dev
```

Open `/sign-up` to create an account, `/sign-in` to log in, and `/studio` to use the generator. The Studio page checks the session on the server and redirects unauthenticated visitors to the sign-in page.

## 4. Deploy to Vercel

Add all environment variables in Vercel → Project → Settings → Environment Variables, for Production (and Preview if needed), then redeploy. Set the URLs to your deployed origin, not localhost. Add any custom domain to the `trustedOrigins` list in `lib/auth.js`.

## Included routes

- `/sign-up` — create an account
- `/sign-in` — sign in
- `/api/auth/[...all]` — Better Auth handler
- `/studio` — protected generator

Email verification and password-reset email delivery are not configured in this starter. Add a mail provider before enabling those flows.


## 5. Admin dashboard and design limit

1. Set `ADMIN_EMAIL` in `.env.local` to the exact email address you will use to sign in. Set the same variable in Vercel Production environment variables.
2. Create your account with that email, then find your account document in MongoDB Atlas → Database → Browse Collections → `user`. Copy its Better Auth user ID (`id` field, or the ID corresponding to your account) into `ADMIN_USER_ID`. Configure both environment variables locally and in Vercel, then redeploy.
3. Admin access requires BOTH the exact email and user ID. This prevents another person from claiming your unverified email address to get admin access. Only that account can access `/admin`; other users are redirected to `/studio`.
4. Admin accounts have unlimited design generations. Every other signed-in user can generate up to 5 designs total per account (not per day). Changing design controls, regenerating, and each image in a batch ZIP consume one quota unit. Batch ZIP stops when the limit is reached.
5. Open `/admin` to see registered users, today's design usage, and tracked totals. Usage tracking starts when this feature is deployed.
6. Redeploy after changing environment variables. Never expose `ADMIN_EMAIL` as a `NEXT_PUBLIC_` variable.

Quota is checked by a server API and stored in MongoDB `design_usage`. It limits normal app generation actions; it is not a DRM system and cannot prevent a technically savvy user from modifying client-side JavaScript or using the underlying drawing logic outside the deployed app.

## Framework versions

This project specifies Next.js 16.3.8 and React/React DOM 19.3.0. Use Node.js 20.9.0 or newer. Run `npm install` to resolve dependencies, then `npm run build` to check the project before deployment.


## Admin dashboard access

Set `ADMIN_EMAIL` to the exact email address of the account you use to sign in. The `/admin` page and `/api/admin/usage` endpoint verify the authenticated session email against this server-only environment variable. Do not put your MongoDB username or password in `ADMIN_USER_ID`; this project does not require `ADMIN_USER_ID` for admin access. After changing Vercel environment variables, redeploy the project.
