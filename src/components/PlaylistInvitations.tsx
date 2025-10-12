"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Check, 
  X, 
  ListMusic, 
  User, 
  Clock,
  Globe,
  Lock,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PlaylistInvitation {
  id: string;
  role: 'EDITOR' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  invitedAt: string;
  Playlist: {
    id: string;
    name: string;
    description?: string;
    visibility: 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED';
    User: {
      id: string;
      name: string;
      email: string;
    };
  };
  User: {
    id: string;
    name: string;
    email: string;
  };
}

export default function PlaylistInvitations() {
  const { data: session } = useSession();
  const [invitations, setInvitations] = useState<PlaylistInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchInvitations();
    }
  }, [session]);

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/playlists/invitations');
      const data = await response.json();

      if (response.ok) {
        setInvitations(data.invitations || []);
      } else {
        console.error('Error fetching invitations:', data.error);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvitationResponse = async (invitationId: string, action: 'accept' | 'decline') => {
    setProcessingInvite(invitationId);

    try {
      const response = await fetch('/api/playlists/invitations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId,
          action
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to respond to invitation');
      }

      toast.success(data.message);
      
      // Remove the processed invitation from the list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));

    } catch (error: any) {
      console.error('Error responding to invitation:', error);
      toast.error(error.message || 'Failed to respond to invitation');
    } finally {
      setProcessingInvite(null);
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'PUBLIC':
        return <Globe className="h-3 w-3 text-green-600" />;
      case 'NOT_LISTED':
        return <Eye className="h-3 w-3 text-blue-600" />;
      case 'PRIVATE':
      default:
        return <Lock className="h-3 w-3 text-gray-600" />;
    }
  };

  const getVisibilityText = (visibility: string) => {
    switch (visibility) {
      case 'PUBLIC':
        return 'Pública';
      case 'NOT_LISTED':
        return 'Não listada';
      case 'PRIVATE':
      default:
        return 'Privada';
    }
  };

  const getRoleBadge = (role: string) => {
    return (
      <Badge variant="outline" className="text-xs">
        {role === 'EDITOR' ? 'Editor' : 'Viewer'}
      </Badge>
    );
  };

  if (!session?.user) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Playlist Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading invitations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Playlist Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pending invitations</p>
            <p className="text-sm">You'll see playlist collaboration invites here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Playlist Invitations
          <Badge variant="secondary" className="ml-2">
            {invitations.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="border rounded-lg p-4 bg-blue-50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-2 text-white">
                    <ListMusic className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">{invitation.Playlist.name}</h3>
                    {invitation.Playlist.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {invitation.Playlist.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>By {invitation.Playlist.User.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {getVisibilityIcon(invitation.Playlist.visibility)}
                        <span>{getVisibilityText(invitation.Playlist.visibility)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(invitation.invitedAt), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {getRoleBadge(invitation.role)}
              </div>
              
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    <strong>{invitation.User.name}</strong> invited you to collaborate as a{' '}
                    <strong>{invitation.role.toLowerCase()}</strong>
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInvitationResponse(invitation.id, 'decline')}
                      disabled={processingInvite === invitation.id}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => handleInvitationResponse(invitation.id, 'accept')}
                      disabled={processingInvite === invitation.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {processingInvite === invitation.id ? 'Processing...' : 'Accept'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}