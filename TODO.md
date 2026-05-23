# Cold Craft Debug/Deploy Fix TODO

## Step 1 — Identify root cause (already done)
- Read `app/page.tsx`, `app/api/generate/route.ts`, `app/api/ats/route.ts`, `app/lib/gemini.ts`.
- Observed server-side throws when missing API key: `Missing Gemini API key...`.

## Step 2 — Fix generate/ats API routes to never 500 on missing API key
- Update `app/api/generate/route.ts` and `app/api/ats/route.ts` to catch missing key errors and return a clear JSON error + 503.

## Step 3 — Fix client to surface API errors instead of blank screen
- Update `app/page.tsx` `handleGenerate()` to check `res.ok` and read error payloads.

## Step 4 — Add client-side error boundary for safety (optional)
- Prevent unhandled errors from causing Next.js “This page couldn’t load”.

## Step 5 — Deployment verification
- In Vercel dashboard: add env vars `GEMINI_API_KEY` (or `OPENAI_API_KEY` if used as fallback).
- Redeploy and confirm `/api/generate` and `/api/ats` respond with 200.

