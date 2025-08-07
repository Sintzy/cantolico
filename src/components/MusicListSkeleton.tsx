import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function MusicCardSkeleton() {
  return (
    <Card className="border border-gray-200">
      <CardContent className="p-4 space-y-3">
        {/* Título da música */}
        <Skeleton className="h-6 w-3/4" />
        
        {/* Instrumento principal */}
        <Skeleton className="h-4 w-1/2" />
        
        {/* Momentos litúrgicos */}
        <div className="flex flex-wrap gap-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-14" />
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-18" />
        </div>
        
        {/* Botões de ação */}
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export function MusicListSkeleton() {
  return (
    <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <MusicCardSkeleton key={i} />
      ))}
    </div>
  );
}
