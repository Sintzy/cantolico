import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function MusicCardSkeleton() {
  return (
    <Card className="group border border-border bg-card">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Icon/Avatar Skeleton */}
          <div className="flex-shrink-0">
            <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg" />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
              <div className="flex-1 min-w-0">
                {/* Título da música */}
                <Skeleton className="h-5 sm:h-6 w-3/4 mb-2" />
                {/* Instrumento principal */}
                <div className="flex items-center gap-2">
                  <Skeleton className="w-1.5 h-1.5 rounded-full" />
                  <Skeleton className="h-3 sm:h-4 w-24" />
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2 sm:ml-4">
                <Skeleton className="h-7 sm:h-8 w-7 sm:w-8" />
                <Skeleton className="h-7 sm:h-8 w-7 sm:w-8" />
                <Skeleton className="h-7 sm:h-8 w-16 sm:w-20" />
              </div>
            </div>

            {/* Info Section */}
            <div className="space-y-3">
              {/* Momentos */}
              <div className="flex flex-wrap gap-1.5">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-6 w-12" />
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                <Skeleton className="h-6 w-12 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MusicListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <MusicCardSkeleton key={i} />
      ))}
    </div>
  );
}
