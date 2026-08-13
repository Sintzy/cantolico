import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumUserMarkProps {
  name: string;
  isPremium?: boolean;
  className?: string;
}

export function PremiumUserMark({ name, isPremium, className }: PremiumUserMarkProps) {
  if (!isPremium) {
    return <span className={className}>{name}</span>;
  }

  return (
    <span
      title="Utilizador Premium"
      className={cn('inline-flex items-center gap-1 align-baseline', className)}
    >
      <span>{name}</span>
      <Crown className="h-3 w-3 text-amber-500" aria-label="Utilizador Premium" />
    </span>
  );
}
