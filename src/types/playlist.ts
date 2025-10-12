// Playlist types and interfaces
export interface PlaylistVisibility {
  type: 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED';
  isPublic: boolean;
  isPrivate: boolean;
  isNotListed: boolean;
}

export interface PlaylistMember {
  id: string;
  playlistId: string;
  userId?: number;
  email?: string;
  role: 'EDITOR' | 'VIEWER';
  status: 'INVITED' | 'ACCEPTED';
  invitedById: number;
  invitedAt: string;
  acceptedAt?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    image?: string;
  };
}

export interface ExtendedPlaylist {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    image?: string;
  };
  _count: {
    items: number;
  };
  members?: PlaylistMember[];
  canEdit?: boolean;
  canView?: boolean;
}

export interface PlaylistForm {
  name: string;
  description: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED';
}

export const getVisibilityFromPlaylist = (playlist: { isPublic: boolean | null }): 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED' => {
  if (playlist.isPublic === true) return 'PUBLIC';
  if (playlist.isPublic === null) return 'NOT_LISTED';
  return 'PRIVATE';
};

export const getVisibilityFlags = (visibility: 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED') => {
  return {
    isPublic: visibility === 'PUBLIC' ? true : false
  };
};

export function getVisibilityIcon(visibility: PlaylistVisibility | 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED') {
  const visibilityType = typeof visibility === 'string' ? visibility : visibility.type;
  
  switch (visibilityType) {
    case 'PUBLIC':
      return 'Globe';
    case 'PRIVATE':
      return 'Lock';
    case 'NOT_LISTED':
      return 'EyeOff';
    default:
      return 'Globe';
  }
}

export function getVisibilityLabel(visibility: PlaylistVisibility | 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED'): string {
  const visibilityType = typeof visibility === 'string' ? visibility : visibility.type;
  
  switch (visibilityType) {
    case 'PUBLIC':
      return 'Pública';
    case 'PRIVATE':
      return 'Privada';
    case 'NOT_LISTED':
      return 'Não Listada';
    default:
      return 'Pública';
  }
}