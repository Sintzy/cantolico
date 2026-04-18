# APIs + UI Redesign (Missas & Playlists) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the sessions API `isCurrent` bug, verify all account/admin/playlist/missas APIs are sound, and redesign all missas and playlists pages to match the site's new stone/rose UI pattern.

**Architecture:** All API fixes are surgical edits to existing route files. All UI redesigns rewrite `page.client.tsx` files in-place, preserving all logic but replacing CSS variables (`text-foreground`, `bg-card`, etc.) with explicit Tailwind classes and replacing `Card`/`CardContent` wrappers with plain divs styled in the site's design system.

**Tech Stack:** Next.js 16 App Router, Clerk, Supabase, Tailwind CSS v4, shadcn/ui, TypeScript

---

## Design System Reference (apply to every UI task)

**Token replacements — global find-and-replace in each file:**

| Old | New |
|-----|-----|
| `text-foreground` | `text-stone-900` |
| `text-muted-foreground` | `text-stone-500` |
| `bg-card` | `bg-white` |
| `bg-background` | `bg-white` |
| `bg-muted` | `bg-stone-100` |
| `border-border` | `border-stone-200` |
| `text-primary` | `text-rose-700` |
| `bg-primary` | `bg-rose-700` |
| `group-hover:text-primary` | `group-hover:text-rose-700` |
| `hsl(var(--primary))` | `#b91c1c` (inline style) or `text-rose-700` class |
| `hsl(var(--primary) / 0.1)` | `rgb(190 18 60 / 0.08)` (inline style) |
| `-mt-16 pt-16` | remove `-mt-16`, keep page header below |

**New page header pattern** (replaces centered hero with `pt-16`):
```tsx
<div className="relative w-full min-h-screen bg-white">
  <div className="border-b border-stone-100 bg-white pt-20 pb-8">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
      <Link href="/..." className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> Back label
      </Link>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-rose-700 text-sm">✝</span>
        <span className="h-px w-6 bg-stone-300" />
        <span className="text-xs font-medium tracking-[0.18em] text-stone-400 uppercase">Section Label</span>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <h1 className="font-display text-4xl sm:text-5xl text-stone-900 leading-tight">
          Page Title
        </h1>
        <div className="flex gap-2 pb-1">
          {/* action buttons: variant="outline" with border-stone-200 text-stone-700 hover:bg-stone-100 */}
          {/* primary CTA: bg-stone-900 hover:bg-rose-700 transition-colors text-white */}
        </div>
      </div>
    </div>
  </div>
  <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
    {/* content */}
  </div>
</div>
```

**New item card pattern** (replaces `<Card className="...border-border bg-card">`):
```tsx
<div className="group rounded-xl border border-stone-200 bg-white hover:shadow-sm transition-all duration-200">
  <div className="p-4 sm:p-5">
    {/* content */}
  </div>
</div>
```

**New sidebar filter panel** (replaces `<Card className="border border-border">`):
```tsx
<div className="rounded-xl border border-stone-200 overflow-hidden">
  <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/50">
    <p className="text-sm font-semibold text-stone-900">Filtros</p>
  </div>
  <div className="px-4 py-4 space-y-4">
    {/* filters */}
  </div>
</div>
```

**Empty state pattern** (replaces `<Card className="text-center ...border-border">`):
```tsx
<div className="text-center py-16 rounded-xl border border-stone-200">
  <IconComponent className="h-10 w-10 mx-auto mb-3 text-stone-200" />
  <p className="text-base font-semibold text-stone-900 mb-1">Title</p>
  <p className="text-sm text-stone-500 max-w-sm mx-auto mb-6">Description</p>
  {/* optional CTA button */}
</div>
```

**Input/Select styling** (consistent with site):
```
className="border-stone-200 bg-white rounded-lg text-stone-900 focus:border-stone-400 placeholder:text-stone-400 h-9"
```

**Badge variants:**
- Default info: `className="bg-stone-100 text-stone-600 font-medium px-2.5 py-0.5 text-xs"`
- Rose accent: `className="bg-rose-50 text-rose-700 border-rose-200 text-xs"`
- BETA: `className="bg-stone-100 text-stone-600 border border-stone-200 text-xs"`

---

## Task 1: Fix sessions API — missing `isCurrent` field

**Files:**
- Modify: `src/app/api/user/sessions/route.ts`

**Problem:** The GET `/api/user/sessions` endpoint doesn't include `isCurrent`. When `AccountPageClient` calls `refreshSessions()` after revoking a session, all sessions lose their "Atual" badge and the current session gets a "Terminar" button.

- [ ] **Step 1: Read the current file**

```bash
# File: src/app/api/user/sessions/route.ts
```

- [ ] **Step 2: Replace the route with the fixed version**

```typescript
// src/app/api/user/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk-auth';
import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/nextjs/server';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user?.clerkUserId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { sessionId: currentSessionId } = await auth();

    const sessionList = await clerk.sessions.getSessionList({
      userId: user.clerkUserId,
      status: 'active',
    });

    return NextResponse.json({
      sessions: sessionList.data.map((s) => ({
        id: s.id,
        status: s.status,
        lastActiveAt: s.lastActiveAt,
        expireAt: s.expireAt,
        clientId: s.clientId,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        isCurrent: s.id === currentSessionId,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar sessões:', error);
    return NextResponse.json({ sessions: [] });
  }
}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd C:\Users\sintz\Desktop\Projetos\Cantolico && pnpm typecheck 2>&1 | grep -i "sessions"
```

Expected: no errors mentioning sessions/route.ts

- [ ] **Step 4: Commit**

```bash
git add src/app/api/user/sessions/route.ts
git commit -m "fix: include isCurrent field in sessions API response"
```

---

## Task 2: Redesign `/missas/page.client.tsx`

**Files:**
- Modify: `src/app/missas/page.client.tsx`

**What to change:**
1. Remove `<main className="min-h-screen bg-white -mt-16">` wrapper — replace with `<div className="relative w-full min-h-screen bg-white">`
2. Replace centered `<section className="border-b border-stone-100 bg-white pt-16">` hero with left-aligned header using the **New page header pattern** above (label: "Organização Litúrgica", title: "As Minhas Missas")
3. Keep action buttons (Explorar + Nova Missa) in the header's right column: Explorar as `variant="outline" className="border-stone-200 text-stone-700 hover:bg-stone-100"`, Nova Missa as `className="bg-stone-900 hover:bg-rose-700 transition-colors text-white"`
4. Move content section: `<div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">` replaces the current `<section className="bg-white min-h-screen"><div className="max-w-7xl...">`
5. Apply all token replacements from Design System Reference
6. `MassCard`: replace `<Card className="...border-border bg-card">` with new item card pattern; replace `text-foreground`/`text-muted-foreground` throughout
7. Sidebar filter `Card` → new sidebar filter panel pattern
8. Empty state `Card` → new empty state pattern
9. Mobile search `Input` placeholder color: add `placeholder:text-stone-400 border-stone-200`
10. `<h2>` section header: `className="text-sm font-semibold text-stone-900 mb-4 flex items-center gap-2"`

- [ ] **Step 1: Read the full current file** (`src/app/missas/page.client.tsx`)

- [ ] **Step 2: Rewrite the file applying all changes** — preserve all handlers (`handleDelete`, `handleDuplicate`, filtering logic, `trackEvent` calls), only change presentation

- [ ] **Step 3: Check no Card/CardContent/text-foreground/text-muted-foreground/bg-card/border-border remain**

```bash
grep -n "text-foreground\|bg-card\|border-border\|text-muted\|-mt-16" src/app/missas/page.client.tsx
```
Expected: no matches

- [ ] **Step 4: Commit**

```bash
git add src/app/missas/page.client.tsx
git commit -m "ui: redesign missas list page to match site design system"
```

---

## Task 3: Redesign `/missas/[id]/page.client.tsx`

**Files:**
- Modify: `src/app/missas/[id]/page.client.tsx`

**What to change:**
1. The detail page has an existing page header — replace any `pt-16`/`-mt-16` with `pt-20`
2. Apply all token replacements: `text-foreground` → `text-stone-900`, `text-muted-foreground` → `text-stone-500`, `bg-card` → `bg-white`, `bg-muted` → `bg-stone-100`, `border-border` → `border-stone-200`, `text-primary` → `text-rose-700`
3. Any `Card` component used for sections → replace with `<div className="rounded-xl border border-stone-200 bg-white overflow-hidden">`
4. Any `CardHeader` → `<div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50">`
5. Any `CardTitle` → `<p className="text-sm font-semibold text-stone-900">`
6. Any `CardContent` → `<div className="px-5 py-4">`
7. Liturgical color accent bars: keep inline `style={{ backgroundColor: getColorHex(...) }}` — these are correct
8. The `✝` decoration in header: verify it uses `text-rose-700`
9. Buttons: secondary actions use `border-stone-200 text-stone-700 hover:bg-stone-100`; primary CTA `bg-stone-900 hover:bg-rose-700 transition-colors`

- [ ] **Step 1: Read the full current file** (`src/app/missas/[id]/page.client.tsx`)

- [ ] **Step 2: Rewrite applying all changes** — preserve all mass editing logic, drag-and-drop reordering, song management, export functionality

- [ ] **Step 3: Verify no CSS variables remain**

```bash
grep -n "text-foreground\|bg-card\|border-border\|text-muted\|bg-background" src/app/missas/[id]/page.client.tsx
```
Expected: no matches

- [ ] **Step 4: Commit**

```bash
git add "src/app/missas/[id]/page.client.tsx"
git commit -m "ui: redesign missas detail page to match site design system"
```

---

## Task 4: Redesign `/missas/explore/page.client.tsx`

**Files:**
- Modify: `src/app/missas/explore/page.client.tsx`

**What to change:**
1. Replace page wrapper with `<div className="relative w-full min-h-screen bg-white">`
2. Add left-aligned header using **New page header pattern**: back link to `/missas`, label "Organização Litúrgica", title "Missas Públicas"
3. Apply all token replacements
4. `Card` items → new item card pattern
5. Search input → `border-stone-200 bg-white rounded-lg placeholder:text-stone-400`
6. Empty state → new empty state pattern with `Church` icon
7. Action button (Duplicar): `variant="outline" size="sm" className="border-stone-200 text-stone-700 hover:bg-stone-100 text-xs"`

- [ ] **Step 1: Read the full current file** (`src/app/missas/explore/page.client.tsx`)

- [ ] **Step 2: Rewrite applying all changes** — preserve duplicate handler and filtering logic

- [ ] **Step 3: Verify**

```bash
grep -n "text-foreground\|bg-card\|border-border\|text-muted" src/app/missas/explore/page.client.tsx
```
Expected: no matches

- [ ] **Step 4: Commit**

```bash
git add src/app/missas/explore/page.client.tsx
git commit -m "ui: redesign missas explore page to match site design system"
```

---

## Task 5: Redesign `/missas/create/page.tsx`

**Files:**
- Modify: `src/app/missas/create/page.tsx`

**What to change:**
1. Replace `<Card>` wrapper with `<div className="rounded-xl border border-stone-200 bg-white overflow-hidden">`
2. `<CardHeader>` → `<div className="px-6 py-5 border-b border-stone-100 bg-stone-50/50">`
3. `<CardTitle>` → `<h2 className="text-base font-semibold text-stone-900">`
4. `<CardDescription>` → `<p className="text-sm text-stone-500 mt-0.5">`
5. `<CardContent>` → `<div className="px-6 py-6">`
6. Page header: add the **New page header pattern** with back link to `/missas`, label "Nova Missa", title "Criar Missa"
7. All inputs: add `border-stone-200 bg-white rounded-lg text-stone-900 focus:border-stone-400 placeholder:text-stone-400`
8. Labels: `text-stone-700 text-sm font-medium`
9. Submit button: `bg-stone-900 hover:bg-rose-700 transition-colors text-white`
10. Cancel/back link: `text-stone-500 hover:text-stone-900`
11. Apply token replacements throughout

- [ ] **Step 1: Read the full current file** (`src/app/missas/create/page.tsx`)

- [ ] **Step 2: Rewrite applying all changes** — preserve form state, validation, submit handler calling `/api/masses`

- [ ] **Step 3: Verify**

```bash
grep -n "text-foreground\|bg-card\|border-border\|text-muted" src/app/missas/create/page.tsx
```
Expected: no matches

- [ ] **Step 4: Commit**

```bash
git add src/app/missas/create/page.tsx
git commit -m "ui: redesign missas create page to match site design system"
```

---

## Task 6: Redesign `/playlists/page.client.tsx`

**Files:**
- Modify: `src/app/playlists/page.client.tsx`

**What to change:**
1. Remove `<main className="min-h-screen bg-white -mt-16">` wrapper → `<div className="relative w-full min-h-screen bg-white">`
2. Replace centered hero `<section className="border-b border-stone-100 bg-white pt-16">` with left-aligned header (**New page header pattern**): label "Coleções de Cânticos", title "As Minhas Playlists"
3. Keep action buttons (Explorar + Nova Playlist) right-aligned in header
4. Content wrapper: `<div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">`
5. Apply all token replacements
6. `PlaylistCard`: replace `<Card className="...border-border bg-card">` → new item card pattern; replace `text-foreground`/`text-muted-foreground` throughout
7. Section headers (`h2` for owned/member/admin playlists): `className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2"`
8. Sidebar filter `Card` → new sidebar filter panel
9. Empty state `Card` → new empty state pattern with `ListMusic` icon
10. Unauthenticated fallback: replace `text-gray-900`/`text-gray-600` with `text-stone-900`/`text-stone-500`

- [ ] **Step 1: Read the full current file** (`src/app/playlists/page.client.tsx`)

- [ ] **Step 2: Rewrite applying all changes** — preserve invite URL handling, edit modal logic, filter/sort logic, `trackEvent` calls

- [ ] **Step 3: Verify**

```bash
grep -n "text-foreground\|bg-card\|border-border\|text-muted\|text-gray\|-mt-16" src/app/playlists/page.client.tsx
```
Expected: no matches

- [ ] **Step 4: Commit**

```bash
git add src/app/playlists/page.client.tsx
git commit -m "ui: redesign playlists list page to match site design system"
```

---

## Task 7: Redesign `/playlists/[id]/page.client.tsx`

**Files:**
- Modify: `src/app/playlists/[id]/page.client.tsx`

**What to change:**
1. Apply all token replacements
2. Any `Card` section wrappers → `<div className="rounded-xl border border-stone-200 bg-white overflow-hidden">`
3. Existing header/back button: ensure uses `text-stone-500 hover:text-stone-900` and ArrowLeft icon
4. Buttons: secondary `border-stone-200 text-stone-700 hover:bg-stone-100`, destructive `text-red-600 hover:bg-red-50 border-red-200`
5. Song list items: `border-b border-stone-100 last:border-0 py-3 px-4`
6. Empty playlist state: new empty state pattern with `ListMusic` icon
7. Add to playlist button/CTA: `bg-stone-900 hover:bg-rose-700 transition-colors text-white`
8. Badges: `bg-stone-100 text-stone-600` for info; `bg-rose-50 text-rose-700` for owner

- [ ] **Step 1: Read the full current file** (`src/app/playlists/[id]/page.client.tsx`)

- [ ] **Step 2: Rewrite applying all changes** — preserve PlaylistEditItems, PlaylistEditModal, delete handler, share/visibility logic

- [ ] **Step 3: Verify**

```bash
grep -n "text-foreground\|bg-card\|border-border\|text-muted" "src/app/playlists/[id]/page.client.tsx"
```
Expected: no matches

- [ ] **Step 4: Commit**

```bash
git add "src/app/playlists/[id]/page.client.tsx"
git commit -m "ui: redesign playlists detail page to match site design system"
```

---

## Task 8: Redesign `/playlists/explore/page.client.tsx`

**Files:**
- Modify: `src/app/playlists/explore/page.client.tsx`

**What to change:**
1. Replace page wrapper with `<div className="relative w-full min-h-screen bg-white">`
2. Add left-aligned header (**New page header pattern**): back link to `/playlists`, label "Coleções de Cânticos", title "Playlists Públicas"
3. Apply all token replacements
4. `Card` items → new item card pattern
5. Pagination buttons: `border-stone-200 text-stone-700 hover:bg-stone-50 disabled:text-stone-300`
6. Search/sort controls: `border-stone-200 bg-white rounded-lg`
7. Empty state → new empty state pattern with `Globe` icon

- [ ] **Step 1: Read the full current file** (`src/app/playlists/explore/page.client.tsx`)

- [ ] **Step 2: Rewrite applying all changes** — preserve search/sort/pagination logic

- [ ] **Step 3: Verify**

```bash
grep -n "text-foreground\|bg-card\|border-border\|text-muted" src/app/playlists/explore/page.client.tsx
```
Expected: no matches

- [ ] **Step 4: Commit**

```bash
git add src/app/playlists/explore/page.client.tsx
git commit -m "ui: redesign playlists explore page to match site design system"
```

---

## Task 9: Redesign `/playlists/create/page.tsx`

**Files:**
- Modify: `src/app/playlists/create/page.tsx`

**What to change (same as Task 5 for missas/create):**
1. Page header with **New page header pattern**: back link to `/playlists`, label "Nova Playlist", title "Criar Playlist"
2. Form `Card` → `<div className="rounded-xl border border-stone-200 bg-white overflow-hidden">`
3. `CardHeader` → `<div className="px-6 py-5 border-b border-stone-100 bg-stone-50/50">`
4. `CardTitle`/`CardDescription` → appropriate stone- styled elements
5. `CardContent` → `<div className="px-6 py-6">`
6. Inputs/Textarea: `border-stone-200 bg-white rounded-lg text-stone-900 focus:border-stone-400`
7. Labels: `text-stone-700 text-sm font-medium`
8. Submit: `bg-stone-900 hover:bg-rose-700 transition-colors text-white`
9. Token replacements throughout

- [ ] **Step 1: Read the full current file** (`src/app/playlists/create/page.tsx`)

- [ ] **Step 2: Rewrite applying all changes** — preserve form state, validation, submit handler, member invitation fields if present

- [ ] **Step 3: Verify**

```bash
grep -n "text-foreground\|bg-card\|border-border\|text-muted" src/app/playlists/create/page.tsx
```
Expected: no matches

- [ ] **Step 4: Commit**

```bash
git add src/app/playlists/create/page.tsx
git commit -m "ui: redesign playlists create page to match site design system"
```

---

## Completion Checklist

- [ ] Task 1: Sessions API isCurrent fix committed
- [ ] Task 2: Missas list page redesigned
- [ ] Task 3: Missas detail page redesigned
- [ ] Task 4: Missas explore page redesigned
- [ ] Task 5: Missas create page redesigned
- [ ] Task 6: Playlists list page redesigned
- [ ] Task 7: Playlists detail page redesigned
- [ ] Task 8: Playlists explore page redesigned
- [ ] Task 9: Playlists create page redesigned
- [ ] Global: `pnpm typecheck` passes with no new errors
- [ ] Global: `pnpm build` succeeds (or `pnpm lint` at minimum)
