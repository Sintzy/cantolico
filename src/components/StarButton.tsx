"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StarButtonProps {
  songId: string;
  className?: string;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function StarButton({ 
  songId, 
  className, 
  showCount = true,
  size = 'md'
}: StarButtonProps) {
  const { data: session } = useSession();
  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Tamanhos do ícone baseado no prop size
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  // Carregar status inicial
  useEffect(() => {
    const fetchStarStatus = async () => {
      try {
        const response = await fetch(`/api/songs/${songId}/star`);
        if (response.ok) {
          const data = await response.json();
          setIsStarred(data.isStarred);
          setStarCount(data.starCount);
        }
      } catch (error) {
        console.error('Error fetching star status:', error);
      }
    };

    fetchStarStatus();
  }, [songId]);

  const handleStar = async () => {
    if (!session) {
      toast.error('Precisa fazer login para dar star às músicas');
      return;
    }

    setIsLoading(true);
    setIsAnimating(true);

    try {
      const method = isStarred ? 'DELETE' : 'POST';
      const response = await fetch(`/api/songs/${songId}/star`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsStarred(data.starred);
        setStarCount(data.starCount);
        
        // Toast de sucesso com animação
        if (data.starred) {
          toast.success('⭐ Música adicionada aos favoritos!');
        } else {
          toast.success('Música removida dos favoritos');
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao dar star na música');
      }
    } catch (error) {
      console.error('Error toggling star:', error);
      toast.error('Erro ao dar star na música');
    } finally {
      setIsLoading(false);
      // Remover animação após um tempo
      setTimeout(() => setIsAnimating(false), 600);
    }
  };

  return (
    <Button
      variant={isStarred ? "default" : "outline"}
      size={size === 'md' ? 'default' : size}
      onClick={handleStar}
      disabled={isLoading}
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        isStarred && "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="relative">
          <Star
            className={cn(
              iconSizes[size],
              "transition-all duration-300",
              isStarred ? "fill-current" : "fill-none",
              isAnimating && "animate-pulse scale-110"
            )}
          />
          
          {/* Animação de particles quando dá star */}
          {isAnimating && isStarred && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-1 h-1 bg-yellow-300 rounded-full animate-ping"
                  style={{
                    animationDelay: `${i * 100}ms`,
                    transform: `translate(-50%, -50%) translate(${(i - 1) * 8}px, ${Math.sin(i) * 8}px)`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
        
        {showCount && (
          <span className={cn(
            "font-medium transition-all duration-200",
            isAnimating && "scale-110"
          )}>
            {starCount}
          </span>
        )}
      </div>

      {/* Efeito de ondas ao clicar */}
      {isAnimating && (
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-yellow-200 rounded-md animate-ping opacity-25" />
          <div className="absolute inset-0 bg-yellow-100 rounded-md animate-ping opacity-20" style={{ animationDelay: '150ms' }} />
        </div>
      )}
    </Button>
  );
}
