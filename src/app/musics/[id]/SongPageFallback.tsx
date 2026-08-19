"use client";

import { ArrowLeft, Download, FileText, Guitar, Music, Plus, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type SongFallbackData = {
  title: string;
  type?: string | null;
  moments?: string[] | null;
};

function ActionSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex h-9 items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 text-sm font-medium text-stone-300">
      {children}
      <Skeleton className="h-3 w-10 bg-stone-100" />
    </div>
  );
}

function SidebarCardSkeleton({
  titleWidth = 'w-24',
  children,
}: {
  titleWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <Skeleton className={`h-3 ${titleWidth} bg-stone-200`} />
      <div className="mt-4">{children}</div>
    </div>
  );
}

function InfoRowsSkeleton() {
  return (
    <div className="space-y-3">
      {[FileText, Music, Guitar].map((Icon, index) => (
        <div key={index} className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-stone-200" />
          <Skeleton className="h-4 w-40 bg-stone-100" />
        </div>
      ))}
    </div>
  );
}

function TagsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      <Skeleton className="h-6 w-16 rounded-md bg-stone-100" />
      <Skeleton className="h-6 w-24 rounded-md bg-stone-100" />
      <Skeleton className="h-6 w-14 rounded-md bg-stone-100" />
    </div>
  );
}

function LyricsSkeleton() {
  const rows = [
    'w-3/5',
    'w-11/12',
    'w-4/5',
    'w-2/3',
    'w-10/12',
    'w-3/4',
    'w-1/2',
    'w-11/12',
    'w-4/5',
    'w-7/12',
    'w-10/12',
    'w-2/3',
  ];

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 md:p-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-16 bg-stone-300" />
          <Skeleton className="h-0.5 w-14 bg-rose-700/50" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-md bg-stone-100" />
          <Skeleton className="h-6 w-24 rounded-md bg-stone-100" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {[0, 1].map((column) => (
          <div key={column} className="space-y-3">
            {rows.slice(column * 6, column * 6 + 6).map((width, index) => (
              <Skeleton key={`${column}-${index}`} className={`h-4 ${width} bg-stone-100`} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function ChordSidebarSkeleton() {
  return (
    <>
      <SidebarCardSkeleton titleWidth="w-24">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-md bg-stone-100" />
            <Skeleton className="h-6 flex-1 bg-stone-100" />
            <Skeleton className="h-9 w-9 rounded-md bg-stone-100" />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2">
            <Skeleton className="h-3 w-9 bg-stone-200" />
            <Skeleton className="h-4 w-10 bg-stone-200" />
          </div>
          <Skeleton className="h-10 w-full rounded-md bg-stone-100" />
          <Skeleton className="h-10 w-full rounded-md bg-stone-100" />
        </div>
      </SidebarCardSkeleton>

      <SidebarCardSkeleton titleWidth="w-20">
        <InfoRowsSkeleton />
      </SidebarCardSkeleton>

      <SidebarCardSkeleton titleWidth="w-10">
        <TagsSkeleton />
      </SidebarCardSkeleton>

      <SidebarCardSkeleton titleWidth="w-16">
        <Skeleton className="h-10 w-full rounded-md bg-stone-100" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-lg bg-stone-100" />
          ))}
        </div>
      </SidebarCardSkeleton>
    </>
  );
}

function SheetSkeleton() {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-32 bg-stone-200" />
        <Skeleton className="h-9 w-28 rounded-md bg-stone-100" />
      </div>
      <Skeleton className="h-[420px] min-h-[400px] w-full rounded-lg bg-stone-100 md:h-[620px]" />
    </section>
  );
}

export default function SongPageFallback({ song }: { song: SongFallbackData }) {
  const isSheet = song.type === 'PARTITURA';
  const momentsCount = Array.isArray(song.moments) ? Math.min(song.moments.length, 3) : 2;

  return (
    <div className="relative min-h-screen w-full bg-white text-stone-900">
      <div className="border-b border-stone-100 bg-white pt-20 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-stone-400">
              <ArrowLeft className="h-3.5 w-3.5" />
              <Skeleton className="h-4 w-16 bg-stone-100" />
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <Skeleton className="h-9 w-9 rounded-md bg-stone-100" />
              <Skeleton className="h-9 w-9 rounded-md bg-stone-100" />
              {!isSheet ? (
                <ActionSkeleton>
                  <FileText className="h-3.5 w-3.5" />
                </ActionSkeleton>
              ) : null}
              <ActionSkeleton>
                <Download className="h-3.5 w-3.5" />
              </ActionSkeleton>
            </div>
          </div>

          <div className="mb-3 flex items-center gap-3">
            <span className="text-sm text-rose-700">✝</span>
            <span className="h-px w-6 bg-stone-300" />
            <Skeleton className="h-3 w-16 bg-stone-100" />
          </div>

          <h1 className="mb-4 font-display text-3xl leading-tight text-stone-900 sm:text-4xl md:text-5xl">
            {song.title}
          </h1>

          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: Math.max(momentsCount, 1) }).map((_, index) => (
              <Skeleton key={index} className="h-6 w-24 rounded-md bg-stone-100" />
            ))}
          </div>
        </div>
      </div>

      <div className="fixed right-0 bottom-0 left-0 z-30 border-t border-stone-200 bg-white/95 px-2 py-2 shadow-lg backdrop-blur-md sm:hidden">
        <div className="flex items-center justify-around">
          {[Star, Plus, FileText, Download].map((Icon, index) => (
            <div key={index} className="flex h-11 w-11 items-center justify-center rounded-md text-stone-200">
              <Icon className="h-5 w-5" />
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-6 pb-20 sm:px-4 sm:py-8 sm:pb-8 md:gap-10 md:px-8 md:py-14">
        {!isSheet ? (
          <>
            <div className="space-y-6 lg:hidden">
              <ChordSidebarSkeleton />
            </div>

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
              <aside className="hidden shrink-0 space-y-5 lg:sticky lg:top-24 lg:flex lg:w-80 lg:flex-col lg:self-start">
                <ChordSidebarSkeleton />
              </aside>

              <main className="min-w-0 flex-1 space-y-10">
                <LyricsSkeleton />
                <section className="rounded-2xl border border-stone-200 bg-white p-6 md:p-10">
                  <Skeleton className="mb-6 h-5 w-20 bg-stone-300" />
                  <Skeleton className="mx-auto aspect-video w-full max-w-2xl rounded-lg bg-stone-100" />
                </section>
              </main>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            <aside className="hidden shrink-0 space-y-5 lg:block lg:w-72 xl:w-80">
              <SidebarCardSkeleton titleWidth="w-20">
                <InfoRowsSkeleton />
              </SidebarCardSkeleton>
              <SidebarCardSkeleton titleWidth="w-10">
                <TagsSkeleton />
              </SidebarCardSkeleton>
            </aside>

            <main className="min-w-0 flex-1">
              <SheetSkeleton />
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
