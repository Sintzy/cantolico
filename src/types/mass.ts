// Mass types and interfaces

export const LITURGICAL_MOMENTS = [
  'ENTRADA',
  'ATO_PENITENCIAL',
  'GLORIA',
  'SALMO_RESPONSORIAL',
  'ACLAMACAO_EVANGELHO',
  'OFERENDAS',
  'SANTO',
  'PAI_NOSSO',
  'SAUDACAO_PAZ',
  'CORDEIRO_DEUS',
  'COMUNHAO',
  'ACAO_GRACAS',
  'FINAL',
  'OUTRO'
] as const;

export type LiturgicalMoment = typeof LITURGICAL_MOMENTS[number];

export const LITURGICAL_MOMENT_LABELS: Record<LiturgicalMoment, string> = {
  ENTRADA: 'Entrada',
  ATO_PENITENCIAL: 'Ato Penitencial',
  GLORIA: 'Glória',
  SALMO_RESPONSORIAL: 'Salmo Responsorial',
  ACLAMACAO_EVANGELHO: 'Aclamação ao Evangelho',
  OFERENDAS: 'Oferendas',
  SANTO: 'Santo',
  PAI_NOSSO: 'Pai Nosso',
  SAUDACAO_PAZ: 'Saudação da Paz',
  CORDEIRO_DEUS: 'Cordeiro de Deus',
  COMUNHAO: 'Comunhão',
  ACAO_GRACAS: 'Ação de Graças',
  FINAL: 'Final',
  OUTRO: 'Outro'
};

export const LITURGICAL_MOMENT_ORDER: Record<LiturgicalMoment, number> = {
  ENTRADA: 1,
  ATO_PENITENCIAL: 2,
  GLORIA: 3,
  SALMO_RESPONSORIAL: 4,
  ACLAMACAO_EVANGELHO: 5,
  OFERENDAS: 6,
  SANTO: 7,
  PAI_NOSSO: 8,
  SAUDACAO_PAZ: 9,
  CORDEIRO_DEUS: 10,
  COMUNHAO: 11,
  ACAO_GRACAS: 12,
  FINAL: 13,
  OUTRO: 14
};

export const LITURGICAL_COLORS = [
  'VERDE',
  'ROXO',
  'BRANCO',
  'VERMELHO',
  'ROSA'
] as const;

export type LiturgicalColor = typeof LITURGICAL_COLORS[number];

export const LITURGICAL_COLOR_LABELS: Record<LiturgicalColor, string> = {
  VERDE: 'Verde (Tempo Comum)',
  ROXO: 'Roxo (Advento/Quaresma)',
  BRANCO: 'Branco (Natal/Páscoa/Festas)',
  VERMELHO: 'Vermelho (Pentecostes/Mártires)',
  ROSA: 'Rosa (Gaudete/Laetare)'
};

export const LITURGICAL_COLOR_HEX: Record<LiturgicalColor, string> = {
  VERDE: '#22c55e',
  ROXO: '#7c3aed',
  BRANCO: '#f5f5f5',
  VERMELHO: '#ef4444',
  ROSA: '#ec4899'
};

export type MassVisibility = 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED';

export interface MassItem {
  id: string;
  massId: string;
  songId: string;
  moment: LiturgicalMoment;
  order: number;
  note: string | null;
  transpose: number;
  addedById: number;
  createdAt: string;
  song?: {
    id: string;
    title: string;
    slug: string;
    tags?: string[];
    author?: string | null;
    capo?: number | null;
  } | null;
}

export interface MassMember {
  id: string;
  massId: string;
  userEmail: string;
  role: 'EDITOR' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  invitedBy: number;
  invitedAt: string;
  acceptedAt: string | null;
  user?: {
    id: number;
    name: string | null;
    email: string;
    image?: string | null;
  };
}

export interface Mass {
  id: string;
  name: string;
  description: string | null;
  date: string | null;
  parish: string | null;
  celebrant: string | null;
  celebration: string | null;
  liturgicalColor: LiturgicalColor | null;
  visibility: MassVisibility;
  userId: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    name: string | null;
    email: string;
    image?: string | null;
  } | null;
  items?: MassItem[];
  members?: MassMember[];
  _count?: {
    items: number;
    members: number;
  };
}

export interface MassForm {
  name: string;
  description: string;
  date: string;
  parish: string;
  celebrant: string;
  celebration: string;
  liturgicalColor: LiturgicalColor | '';
  visibility: MassVisibility;
}

export interface MassTemplate {
  id: string;
  name: string;
  description: string | null;
  celebration: string | null;
  isPublic: boolean;
  userId: number;
  createdAt: string;
  updatedAt: string;
  items?: MassTemplateItem[];
}

export interface MassTemplateItem {
  id: string;
  templateId: string;
  songId: string;
  moment: LiturgicalMoment;
  order: number;
  note: string | null;
  song?: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

// Helper functions
export const getMassVisibilityLabel = (visibility: MassVisibility): string => {
  switch (visibility) {
    case 'PUBLIC':
      return 'Pública';
    case 'PRIVATE':
      return 'Privada';
    case 'NOT_LISTED':
      return 'Não Listada';
    default:
      return 'Privada';
  }
};

export const getMomentLabel = (moment: LiturgicalMoment): string => {
  return LITURGICAL_MOMENT_LABELS[moment] || moment;
};

export const getColorLabel = (color: LiturgicalColor | null): string => {
  if (!color) return '';
  return LITURGICAL_COLOR_LABELS[color] || color;
};

export const getColorHex = (color: LiturgicalColor | null): string => {
  if (!color) return '#6b7280';
  return LITURGICAL_COLOR_HEX[color] || '#6b7280';
};

export const sortMoments = (items: MassItem[]): MassItem[] => {
  return [...items].sort((a, b) => {
    const orderA = LITURGICAL_MOMENT_ORDER[a.moment] || 99;
    const orderB = LITURGICAL_MOMENT_ORDER[b.moment] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.order - b.order;
  });
};

export const groupItemsByMoment = (items: MassItem[]): Record<LiturgicalMoment, MassItem[]> => {
  const sorted = sortMoments(items);
  const grouped: Partial<Record<LiturgicalMoment, MassItem[]>> = {};
  
  for (const item of sorted) {
    if (!grouped[item.moment]) {
      grouped[item.moment] = [];
    }
    grouped[item.moment]!.push(item);
  }
  
  return grouped as Record<LiturgicalMoment, MassItem[]>;
};

export const formatMassDate = (dateString: string | null): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return '';
  }
};

export const formatMassTime = (dateString: string | null): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};
