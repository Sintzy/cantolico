# Media Component Design

**Date:** 2026-04-18  
**Status:** Approved

## Overview

Replace three overlapping multimedia components (`FileViewer`, `FileManager`, `SubmissionFileViewer`) with a unified set of focused components under `src/components/media/`. The new system has shared primitives and three context-specific top-level components.

## File Structure

```
src/components/media/
  primitives/
    AudioPlayer.tsx
    PdfPreview.tsx
    FileCard.tsx
  MediaViewer.tsx
  MediaUploader.tsx
  MediaManager.tsx
  index.ts
```

## Primitives

### `AudioPlayer`
- Props: `url: string`, `label: string`, `onDownload?: () => void`
- Native `<audio>` element with play/pause, seek bar, mute, and optional download button
- Single instance plays at a time (managed by parent via `currentAudio` state if needed)

### `PdfPreview`
- Props: `url: string`, `label: string`, `onDownload?: () => void`
- Collapsible iframe (closed by default, opens on "Ver partitura" click)
- "Abrir em nova tab" button (`target="_blank"`)
- Download button

### `FileCard`
- Props: `file: { id, fileName, fileType, fileSize?, description? }`, `actions?: ReactNode`, `children?: ReactNode`
- Layout: icon (red for PDF, blue for audio), file name, size, then `actions` slot and `children` slot
- Design: stone-200 border, white background, rose-700 accent

## Top-Level Components

### `MediaViewer` — `/musics/[id]`
- **Props:** `files: SongFile[]` (already have signed URLs, passed from server component)
- No fetch — receives data from parent
- Groups files into PDFs and audios sections
- PDFs: `FileCard` wrapping `PdfPreview` (collapsible iframe + open in new tab + download)
- Audios: `FileCard` wrapping `AudioPlayer`
- Design: transparent background, site style (stone/rose)
- Replaces: `FileViewer`

### `MediaUploader` — `/musics/create`
- **Props:** `onChange: (files: FileUploadData[]) => void`, `onlyPdf?: boolean`
- No API calls — all files held in memory until form submit
- Drag-and-drop + file picker button, separated by type
- Each pending file: name, size, required description field, remove button
- Validation: PDF max 20 MB, audio max 50 MB
- Maintains `onlyPdf` prop for sheet music submissions
- Replaces: `FileManager`

### `MediaManager` — `/admin/review/[id]`
- **Props:** `submissionId: string`, `onDescriptionChange?: (storageFileName, description, originalFileName) => void`
- Fetches from `/api/admin/submission/:id/files` on mount
- Lists PDFs and audios with editable name and description fields
- Single "Guardar alterações" button at the bottom — sends PATCH for all changed files in one request
- "Adicionar ficheiros" button — POST multipart to `/api/admin/submission/:id/files`
- Per-file remove button with confirmation dialog
- "Tornar principal" button on PDFs
- `onDescriptionChange` callback maintained for compatibility with existing approve flow
- Replaces: `SubmissionFileViewer`

## Migration

| Old component | New component | Used in |
|---|---|---|
| `FileViewer` | `MediaViewer` | `src/app/musics/[id]/page.tsx` |
| `FileManager` | `MediaUploader` | `src/app/musics/create/page.tsx` |
| `SubmissionFileViewer` | `MediaManager` | `src/app/admin/review/[id]/page.tsx` |

Old files are deleted after migration. `index.ts` re-exports all three for clean imports.

## Design Tokens

- Background: transparent (inherits page)
- Borders: `stone-200`
- PDF accent: `red-600` / `red-50`
- Audio accent: `blue-600` / `blue-50`
- Primary action: `rose-700` (site primary)
- Text: `stone-900` / `stone-600`

## Error Handling

- Fetch errors in `MediaManager`: toast + retry button
- Upload validation errors: shown inline below the file row
- Save/delete errors: toast with error message
- Empty state: friendly message per section (no PDFs, no audios)
