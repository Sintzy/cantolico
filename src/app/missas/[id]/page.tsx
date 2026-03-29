// @ts-nocheck
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseUserId } from '@/lib/clerk-auth';
import MassPageClient from './page.client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  const { data: mass } = await supabase
    .from('Mass')
    .select('name, description, celebration')
    .eq('id', id)
    .single();

  if (!mass) {
    return {
      title: 'Missa não encontrada | Cantólico',
    };
  }

  return {
    title: `${mass.name} | Cantólico`,
    description: mass.description || mass.celebration || 'Organização de cânticos para missa',
  };
}

async function getMass(id: string, userId?: number) {
  const { data: mass, error } = await supabase
    .from('Mass')
    .select(`
      id,
      name,
      description,
      date,
      parish,
      celebrant,
      celebration,
      liturgicalColor,
      visibility,
      userId,
      createdAt,
      updatedAt,
      User!Mass_userId_fkey (
        id,
        name,
        email,
        image
      ),
      MassItem (
        id,
        songId,
        moment,
        order,
        note,
        transpose,
        addedById,
        createdAt,
        Song!MassItem_songId_fkey (
          id,
          title,
          slug,
          tags,
          author,
          capo
        )
      ),
      MassMember (
        id,
        userEmail,
        role,
        status,
        invitedBy,
        invitedAt,
        acceptedAt
      )
    `)
    .eq('id', id)
    .single();

  if (error || !mass) {
    return null;
  }

  // Check access
  const isOwner = userId === mass.userId;

  if (mass.visibility === 'PRIVATE' && !isOwner) {
    // Check if user is a member
    const isMember = mass.MassMember?.some(
      (m: any) => m.status === 'ACCEPTED'
    );
    if (!isMember) {
      return null;
    }
  }

  // Sort items by moment order and item order
  const momentOrder: Record<string, number> = {
    ENTRADA: 1, ATO_PENITENCIAL: 2, GLORIA: 3, SALMO_RESPONSORIAL: 4,
    ACLAMACAO_EVANGELHO: 5, OFERENDAS: 6, SANTO: 7, PAI_NOSSO: 8,
    SAUDACAO_PAZ: 9, CORDEIRO_DEUS: 10, COMUNHAO: 11, ACAO_GRACAS: 12,
    FINAL: 13, OUTRO: 99
  };

  const sortedItems = (mass.MassItem || [])
    .sort((a: any, b: any) => {
      const orderA = momentOrder[a.moment] || 99;
      const orderB = momentOrder[b.moment] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.order - b.order;
    })
    .map((item: any) => ({
      ...item,
      song: item.Song || null
    }));

  return {
    ...mass,
    user: mass.User || null,
    items: sortedItems,
    members: mass.MassMember || [],
    _count: {
      items: sortedItems.length,
      members: (mass.MassMember || []).length
    },
    isOwner
  };
}

export default async function MassPage({ params }: PageProps) {
  const { id } = await params;
  const { userId: clerkUserId } = await auth();

  let supabaseUserId: number | undefined;
  if (clerkUserId) {
    supabaseUserId = (await getSupabaseUserId(clerkUserId)) ?? undefined;
  }

  const mass = await getMass(id, supabaseUserId);

  if (!mass) {
    notFound();
  }

  return <MassPageClient initialMass={mass} />;
}
