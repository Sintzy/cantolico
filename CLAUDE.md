# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server with Turbopack (also runs git-info script)
pnpm build        # Production build
pnpm lint         # ESLint via Next.js
pnpm typecheck    # TypeScript check without emit
```

The `dev` script runs `node scripts/git-info.js` first to inject git metadata as env vars (`NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`, etc.).

## Architecture

**Cantólico** is a Portuguese Catholic music library — a song/chord/sheet-music catalog with playlists, community submissions, and an admin panel.

### Tech Stack

- **Next.js 16** — App Router, Server Components first, Turbopack in dev
- **Tailwind CSS v4** — imported via `@import "tailwindcss"` in `globals.css` (not the v3 config file approach)
- **shadcn/ui** — component library built on Radix UI primitives, components in `src/components/ui/`
- **Supabase** — PostgreSQL database; types in `src/types/supabase.ts`
- **Clerk** — primary authentication provider (migrated from NextAuth)
- **Vercel** — hosting with Analytics

### Authentication Flow

Authentication uses **Clerk** as the primary provider. `src/lib/clerk-auth.ts` exports:
- `getAuthenticatedUser()` — fetches Clerk session + looks up the corresponding `User` row in Supabase by `clerkUserId`. Returns `AuthenticatedUser | null`.
- `requireRole(...roles)`, `requireAdmin()`, `requireAdminOrReviewer()` — server-side guards that throw on failure.

`src/lib/auth.ts` is a legacy NextAuth compatibility shim used for backward compatibility — prefer `getAuthenticatedUser()` / `getClerkCompatibleSession()` in new code.

Roles: `USER` → `TRUSTED` → `REVIEWER` → `ADMIN`.

### Database Access

- `src/lib/supabase.ts` — public anon client (uses `NEXT_PUBLIC_*` keys), for client-side reads
- `src/lib/supabase-admin.ts` — service-role client, used in server-side API routes
- `src/lib/supabase-client.ts` — additional client utilities

In API routes, always use the admin client for mutations; never expose the service key to the browser.

### API Routes

All API routes live under `src/app/api/`. The important wrappers in `src/lib/api-route-wrapper.ts`:
- `withLogging(handler, options)` — wraps any route handler with structured logging, request timing, and slow-request alerts
- Convenience wrappers: `withSongLogging`, `withPlaylistLogging`, `withSubmissionLogging`, `withAdminLogging`

### Page Structure

- `src/app/(authprofile)/` — auth/profile group (login, register, profile, public user pages)
- `src/app/admin/` — admin dashboard (requires ADMIN or REVIEWER role)
- `src/app/musics/` — song browsing (`/musics/[id]`) and creation (`/musics/create`)
- `src/app/missas/` — Mass planning pages
- `src/app/playlists/` — playlist management and exploration
- `src/app/starred-songs/` — user favorites

Pages that need client interactivity follow the `.page.client.tsx` / `page.tsx` split pattern (server page imports a `page.client.tsx` component).

### Theming

CSS custom properties defined in `src/app/globals.css`. Primary color is crimson/rose (`--primary: 350 84% 53%`). Supports dark mode via `next-themes`. The body background uses radial gradient decorations.

### Music Content

Chord notation uses `markdown-it` + `markdown-it-chords`. The chord processing pipeline lives in `src/lib/chord-processor.ts` and `src/lib/chords/`. Song files (PDF, audio) are stored in Supabase Storage and managed via `src/lib/storage-utils.ts`.

Export features (PDF, PPTX) use `pdf-lib`/`pdfmake` and `pptxgenjs`, surfaced through `src/components/ExportMassModal.tsx` and `src/components/ExportOptionsModal.tsx`.
