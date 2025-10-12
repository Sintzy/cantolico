"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Clock, 
  Check, 
  X, 
  MoreVertical,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PlaylistMember {
  id: string;
  userEmail: string;
  role: 'EDITOR' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  invitedAt: string;
  acceptedAt?: string;
  User: {
    id: string;
    name: string;
    email: string;
  };
}

interface PlaylistMembersProps {
  playlistId: string;
  members: PlaylistMember[];
  isOwner: boolean;
  onMembersUpdate: () => void;
}

export default function PlaylistMembers({ 
  playlistId, 
  members, 
  isOwner, 
  onMembersUpdate 
}: PlaylistMembersProps) {
  const { data: session } = useSession();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [isLoading, setIsLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  if (!isOwner) {
    return null; // Only show to playlist owner
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/playlists/${playlistId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: inviteEmail.trim(),
          role: inviteRole
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      toast.success('Invitation sent successfully');
      setInviteEmail('');
      setInviteRole('EDITOR');
      setIsInviteDialogOpen(false);
      onMembersUpdate();

    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }

    setIsRemoving(memberId);

    try {
      const response = await fetch(`/api/playlists/${playlistId}/members?memberId=${memberId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member');
      }

      toast.success('Member removed successfully');
      onMembersUpdate();

    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error(error.message || 'Failed to remove member');
    } finally {
      setIsRemoving(null);
    }
  };

  const getStatusBadge = (status: string, acceptedAt?: string) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
            <Check className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case 'DECLINED':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">
            <X className="h-3 w-3 mr-1" />
            Declined
          </Badge>
        );
      case 'PENDING':
      default:
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getRoleBadge = (role: string) => {
    return (
      <Badge variant="outline" className="text-xs">
        {role === 'EDITOR' ? (
          <>
            <Edit className="h-3 w-3 mr-1" />
            Editor
          </>
        ) : (
          <>
            <Eye className="h-3 w-3 mr-1" />
            Viewer
          </>
        )}
      </Badge>
    );
  };

  const pendingMembers = members.filter(m => m.status === 'PENDING');
  const activeMembers = members.filter(m => m.status === 'ACCEPTED');
  const declinedMembers = members.filter(m => m.status === 'DECLINED');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members ({activeMembers.length})
            {pendingMembers.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingMembers.length} pending
              </Badge>
            )}
          </CardTitle>
          
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Member to Playlist</DialogTitle>
                <DialogDescription>
                  Send an invitation to collaborate on this playlist.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleInviteUser} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={(value: 'EDITOR' | 'VIEWER') => setInviteRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EDITOR">
                        <div className="flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Editor</div>
                            <div className="text-sm text-muted-foreground">Can add and remove songs</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="VIEWER">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Viewer</div>
                            <div className="text-sm text-muted-foreground">Can only view the playlist</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsInviteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No members yet</p>
            <p className="text-sm">Invite collaborators to help manage this playlist</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Members */}
            {activeMembers.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Active Members</h4>
                <div className="space-y-3">
                  {activeMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                          {member.userEmail.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{member.userEmail}</div>
                          <div className="text-sm text-muted-foreground">
                            Joined {formatDistanceToNow(new Date(member.acceptedAt!), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getRoleBadge(member.role)}
                        {getStatusBadge(member.status, member.acceptedAt)}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={isRemoving === member.id}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Pending Invitations */}
            {pendingMembers.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Pending Invitations</h4>
                <div className="space-y-3">
                  {pendingMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-yellow-600" />
                        <div>
                          <div className="font-medium">{member.userEmail}</div>
                          <div className="text-sm text-muted-foreground">
                            Invited {formatDistanceToNow(new Date(member.invitedAt), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getRoleBadge(member.role)}
                        {getStatusBadge(member.status)}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={isRemoving === member.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Declined Invitations */}
            {declinedMembers.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Declined Invitations</h4>
                <div className="space-y-3">
                  {declinedMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                      <div className="flex items-center gap-3">
                        <X className="h-5 w-5 text-red-600" />
                        <div>
                          <div className="font-medium">{member.userEmail}</div>
                          <div className="text-sm text-muted-foreground">
                            Declined invitation
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getRoleBadge(member.role)}
                        {getStatusBadge(member.status)}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={isRemoving === member.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}