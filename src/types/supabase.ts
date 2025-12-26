export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      User: {
        Row: {
          id: number
          name: string | null
          email: string
          passwordHash: string | null
          image: string | null
          role: 'USER' | 'TRUSTED' | 'REVIEWER' | 'ADMIN'
          bio: string | null
          profileImage: string | null
          emailVerified: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: number
          name?: string | null
          email: string
          passwordHash?: string | null
          image?: string | null
          role?: 'USER' | 'TRUSTED' | 'REVIEWER' | 'ADMIN'
          bio?: string | null
          profileImage?: string | null
          emailVerified?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: number
          name?: string | null
          email?: string
          passwordHash?: string | null
          image?: string | null
          role?: 'USER' | 'TRUSTED' | 'REVIEWER' | 'ADMIN'
          bio?: string | null
          profileImage?: string | null
          emailVerified?: string | null
          createdAt?: string
          updatedAt?: string
        }
      }
      Account: {
        Row: {
          id: string
          userId: number
          type: string
          provider: string
          providerAccountId: string
          refresh_token: string | null
          access_token: string | null
          expires_at: number | null
          token_type: string | null
          scope: string | null
          id_token: string | null
          session_state: string | null
        }
        Insert: {
          id?: string
          userId: number
          type: string
          provider: string
          providerAccountId: string
          refresh_token?: string | null
          access_token?: string | null
          expires_at?: number | null
          token_type?: string | null
          scope?: string | null
          id_token?: string | null
          session_state?: string | null
        }
        Update: {
          id?: string
          userId?: number
          type?: string
          provider?: string
          providerAccountId?: string
          refresh_token?: string | null
          access_token?: string | null
          expires_at?: number | null
          token_type?: string | null
          scope?: string | null
          id_token?: string | null
          session_state?: string | null
        }
      }
      Session: {
        Row: {
          id: string
          sessionToken: string
          userId: number
          expires: string
        }
        Insert: {
          id?: string
          sessionToken: string
          userId: number
          expires: string
        }
        Update: {
          id?: string
          sessionToken?: string
          userId?: number
          expires?: string
        }
      }
      VerificationToken: {
        Row: {
          identifier: string
          token: string
          expires: string
        }
        Insert: {
          identifier: string
          token: string
          expires: string
        }
        Update: {
          identifier?: string
          token?: string
          expires?: string
        }
      }
      UserModeration: {
        Row: {
          id: number
          userId: number
          status: 'ACTIVE' | 'WARNING' | 'SUSPENDED' | 'BANNED'
          type: 'WARNING' | 'SUSPENSION' | 'BAN' | null
          reason: string | null
          moderatorNote: string | null
          ipAddress: string | null
          moderatedById: number | null
          moderatedAt: string | null
          expiresAt: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: number
          userId: number
          status?: 'ACTIVE' | 'WARNING' | 'SUSPENDED' | 'BANNED'
          type?: 'WARNING' | 'SUSPENSION' | 'BAN' | null
          reason?: string | null
          moderatorNote?: string | null
          ipAddress?: string | null
          moderatedById?: number | null
          moderatedAt?: string | null
          expiresAt?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: number
          userId?: number
          status?: 'ACTIVE' | 'WARNING' | 'SUSPENDED' | 'BANNED'
          type?: 'WARNING' | 'SUSPENSION' | 'BAN' | null
          reason?: string | null
          moderatorNote?: string | null
          ipAddress?: string | null
          moderatedById?: number | null
          moderatedAt?: string | null
          expiresAt?: string | null
          createdAt?: string
          updatedAt?: string
        }
      }
      ModerationHistory: {
        Row: {
          id: number
          userId: number
          status: 'ACTIVE' | 'WARNING' | 'SUSPENDED' | 'BANNED'
          type: 'WARNING' | 'SUSPENSION' | 'BAN' | null
          reason: string | null
          moderatorNote: string | null
          ipAddress: string | null
          moderatedById: number | null
          moderatedAt: string
          expiresAt: string | null
          createdAt: string
        }
        Insert: {
          id?: number
          userId: number
          status: 'ACTIVE' | 'WARNING' | 'SUSPENDED' | 'BANNED'
          type?: 'WARNING' | 'SUSPENSION' | 'BAN' | null
          reason?: string | null
          moderatorNote?: string | null
          ipAddress?: string | null
          moderatedById?: number | null
          moderatedAt?: string
          expiresAt?: string | null
          createdAt?: string
        }
        Update: {
          id?: number
          userId?: number
          status?: 'ACTIVE' | 'WARNING' | 'SUSPENDED' | 'BANNED'
          type?: 'WARNING' | 'SUSPENSION' | 'BAN' | null
          reason?: string | null
          moderatorNote?: string | null
          ipAddress?: string | null
          moderatedById?: number | null
          moderatedAt?: string
          expiresAt?: string | null
          createdAt?: string
        }
      }
      Song: {
        Row: {
          id: string
          title: string
          moments: string[]
          type: 'ACORDES' | 'PARTITURA'
          mainInstrument: 'ORGAO' | 'GUITARRA' | 'PIANO' | 'CORO' | 'OUTRO'
          tags: string[]
          currentVersionId: string | null
          createdAt: string
          updatedAt: string
          slug: string
          author: string | null
        }
        Insert: {
          id?: string
          title: string
          moments: string[]
          type: 'ACORDES' | 'PARTITURA'
          mainInstrument: 'ORGAO' | 'GUITARRA' | 'PIANO' | 'CORO' | 'OUTRO'
          tags: string[]
          currentVersionId?: string | null
          createdAt?: string
          updatedAt?: string
          slug: string
          author?: string | null
        }
        Update: {
          id?: string
          title?: string
          moments?: string[]
          type?: 'ACORDES' | 'PARTITURA'
          mainInstrument?: 'ORGAO' | 'GUITARRA' | 'PIANO' | 'CORO' | 'OUTRO'
          tags?: string[]
          currentVersionId?: string | null
          createdAt?: string
          updatedAt?: string
          slug?: string
          author?: string | null
        }
      }
      SongVersion: {
        Row: {
          id: string
          songId: string
          versionNumber: number
          sourceType: 'PDF' | 'MARKDOWN'
          sourcePdfKey: string | null
          sourceText: string | null
          renderedHtml: string | null
          keyOriginal: string | null
          lyricsPlain: string
          chordsJson: Json | null
          abcBlocks: Json | null
          mediaUrl: string | null
          spotifyLink: string | null
          youtubeLink: string | null
          approvedAt: string | null
          createdAt: string
          createdById: number
        }
        Insert: {
          id?: string
          songId: string
          versionNumber: number
          sourceType: 'PDF' | 'MARKDOWN'
          sourcePdfKey?: string | null
          sourceText?: string | null
          renderedHtml?: string | null
          keyOriginal?: string | null
          lyricsPlain: string
          chordsJson?: Json | null
          abcBlocks?: Json | null
          mediaUrl?: string | null
          spotifyLink?: string | null
          youtubeLink?: string | null
          approvedAt?: string | null
          createdAt?: string
          createdById: number
        }
        Update: {
          id?: string
          songId?: string
          versionNumber?: number
          sourceType?: 'PDF' | 'MARKDOWN'
          sourcePdfKey?: string | null
          sourceText?: string | null
          renderedHtml?: string | null
          keyOriginal?: string | null
          lyricsPlain?: string
          chordsJson?: Json | null
          abcBlocks?: Json | null
          mediaUrl?: string | null
          spotifyLink?: string | null
          youtubeLink?: string | null
          approvedAt?: string | null
          createdAt?: string
          createdById?: number
        }
      }
      SongSubmission: {
        Row: {
          id: string
          title: string
          moment: string[]
          type: 'ACORDES' | 'PARTITURA'
          mainInstrument: 'ORGAO' | 'GUITARRA' | 'PIANO' | 'CORO' | 'OUTRO'
          tags: string[]
          submitterId: number
          status: 'PENDING' | 'APPROVED' | 'REJECTED'
          rejectionReason: string | null
          tempSourceType: 'PDF' | 'MARKDOWN'
          tempPdfKey: string | null
          tempText: string | null
          parsedPreview: Json | null
          mediaUrl: string | null
          spotifyLink: string | null
          youtubeLink: string | null
          createdAt: string
          reviewedAt: string | null
          reviewerId: number | null
          author: string | null
        }
        Insert: {
          id?: string
          title: string
          moment: string[]
          type: 'ACORDES' | 'PARTITURA'
          mainInstrument: 'ORGAO' | 'GUITARRA' | 'PIANO' | 'CORO' | 'OUTRO'
          tags: string[]
          submitterId: number
          status?: 'PENDING' | 'APPROVED' | 'REJECTED'
          rejectionReason?: string | null
          tempSourceType: 'PDF' | 'MARKDOWN'
          tempPdfKey?: string | null
          tempText?: string | null
          parsedPreview?: Json | null
          mediaUrl?: string | null
          spotifyLink?: string | null
          youtubeLink?: string | null
          createdAt?: string
          reviewedAt?: string | null
          reviewerId?: number | null
          author?: string | null
        }
        Update: {
          id?: string
          title?: string
          moment?: string[]
          type?: 'ACORDES' | 'PARTITURA'
          mainInstrument?: 'ORGAO' | 'GUITARRA' | 'PIANO' | 'CORO' | 'OUTRO'
          tags?: string[]
          submitterId?: number
          status?: 'PENDING' | 'APPROVED' | 'REJECTED'
          rejectionReason?: string | null
          tempSourceType?: 'PDF' | 'MARKDOWN'
          tempPdfKey?: string | null
          tempText?: string | null
          parsedPreview?: Json | null
          mediaUrl?: string | null
          spotifyLink?: string | null
          youtubeLink?: string | null
          createdAt?: string
          reviewedAt?: string | null
          reviewerId?: number | null
          author?: string | null
        }
      }
      Favorite: {
        Row: {
          userId: number
          songId: string
          createdAt: string
        }
        Insert: {
          userId: number
          songId: string
          createdAt?: string
        }
        Update: {
          userId?: number
          songId?: string
          createdAt?: string
        }
      }
      Star: {
        Row: {
          userId: number
          songId: string
          createdAt: string
        }
        Insert: {
          userId: number
          songId: string
          createdAt?: string
        }
        Update: {
          userId?: number
          songId?: string
          createdAt?: string
        }
      }
      Playlist: {
        Row: {
          id: string
          name: string
          description: string | null
          isPublic: boolean | null
          visibility: 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED'
          userId: number
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          isPublic?: boolean | null
          visibility?: 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED'
          userId: number
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          isPublic?: boolean | null
          visibility?: 'PUBLIC' | 'PRIVATE' | 'NOT_LISTED'
          userId?: number
          createdAt?: string
          updatedAt?: string
        }
      }
      PlaylistItem: {
        Row: {
          id: string
          playlistId: string
          songId: string
          order: number
          addedById: number
          note: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          playlistId: string
          songId: string
          order: number
          addedById: number
          note?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          playlistId?: string
          songId?: string
          order?: number
          addedById?: number
          note?: string | null
          createdAt?: string
        }
      }
      PlaylistMember: {
        Row: {
          id: string
          playlistId: string
          userEmail: string
          role: 'EDITOR' | 'VIEWER'
          status: 'PENDING' | 'ACCEPTED' | 'DECLINED'
          invitedBy: number
          invitedAt: string
          acceptedAt: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          playlistId: string
          userEmail: string
          role?: 'EDITOR' | 'VIEWER'
          status?: 'PENDING' | 'ACCEPTED' | 'DECLINED'
          invitedBy: number
          invitedAt?: string
          acceptedAt?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          playlistId?: string
          userEmail?: string
          role?: 'EDITOR' | 'VIEWER'
          status?: 'PENDING' | 'ACCEPTED' | 'DECLINED'
          invitedBy?: number
          invitedAt?: string
          acceptedAt?: string | null
          createdAt?: string
          updatedAt?: string
        }
      }
      AuditLog: {
        Row: {
          id: number
          userId: number | null
          action: string
          entity: string | null
          entityId: string | null
          metadata: Json | null
          createdAt: string
        }
        Insert: {
          id?: number
          userId?: number | null
          action: string
          entity?: string | null
          entityId?: string | null
          metadata?: Json | null
          createdAt?: string
        }
        Update: {
          id?: number
          userId?: number | null
          action?: string
          entity?: string | null
          entityId?: string | null
          metadata?: Json | null
          createdAt?: string
        }
      }
      Banner: {
        Row: {
          id: string
          title: string
          message: string
          type: 'ANNOUNCEMENT' | 'ALERT' | 'CHANGELOG' | 'WARNING' | 'REQUEST' | 'INFO' | 'SUCCESS' | 'ERROR'
          position: 'TOP' | 'BOTTOM'
          pages: string[]
          isActive: boolean
          priority: number
          startDate: string | null
          endDate: string | null
          createdById: number
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          type: 'ANNOUNCEMENT' | 'ALERT' | 'CHANGELOG' | 'WARNING' | 'REQUEST' | 'INFO' | 'SUCCESS' | 'ERROR'
          position?: 'TOP' | 'BOTTOM'
          pages: string[]
          isActive?: boolean
          priority?: number
          startDate?: string | null
          endDate?: string | null
          createdById: number
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          type?: 'ANNOUNCEMENT' | 'ALERT' | 'CHANGELOG' | 'WARNING' | 'REQUEST' | 'INFO' | 'SUCCESS' | 'ERROR'
          position?: 'TOP' | 'BOTTOM'
          pages?: string[]
          isActive?: boolean
          priority?: number
          startDate?: string | null
          endDate?: string | null
          createdById?: number
          createdAt?: string
          updatedAt?: string
        }
      }
      logs: {
        Row: {
          id: string
          level: string
          category: string
          message: string
          details: Json | null
          user_id: number | null
          user_email: string | null
          user_role: string | null
          ip_address: string | null
          user_agent: string | null
          url: string | null
          method: string | null
          correlation_id: string | null
          request_id: string | null
          parent_log_id: string | null
          server_instance: string | null
          environment: string | null
          tags: string[] | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          level: string
          category: string
          message: string
          details?: Json | null
          user_id?: number | null
          user_email?: string | null
          user_role?: string | null
          ip_address?: string | null
          user_agent?: string | null
          url?: string | null
          method?: string | null
          correlation_id?: string | null
          request_id?: string | null
          parent_log_id?: string | null
          server_instance?: string | null
          environment?: string | null
          tags?: string[] | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          level?: string
          category?: string
          message?: string
          details?: Json | null
          user_id?: number | null
          user_email?: string | null
          user_role?: string | null
          ip_address?: string | null
          user_agent?: string | null
          url?: string | null
          method?: string | null
          correlation_id?: string | null
          request_id?: string | null
          parent_log_id?: string | null
          server_instance?: string | null
          environment?: string | null
          tags?: string[] | null
          expires_at?: string | null
          created_at?: string
        }
      }
      SongFile: {
        Row: {
          id: string
          songVersionId: string
          fileType: 'PDF' | 'AUDIO'
          fileName: string
          fileKey: string
          fileSize: number
          mimeType: string
          description: string
          isPrincipal: boolean
          uploadedById: number
          uploadedAt: string
          deletedAt: string | null
          deletionReason: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          songVersionId: string
          fileType: 'PDF' | 'AUDIO'
          fileName: string
          fileKey: string
          fileSize: number
          mimeType: string
          description: string
          isPrincipal?: boolean
          uploadedById: number
          uploadedAt?: string
          deletedAt?: string | null
          deletionReason?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          songVersionId?: string
          fileType?: 'PDF' | 'AUDIO'
          fileName?: string
          fileKey?: string
          fileSize?: number
          mimeType?: string
          description?: string
          isPrincipal?: boolean
          uploadedById?: number
          uploadedAt?: string
          deletedAt?: string | null
          deletionReason?: string | null
          createdAt?: string
          updatedAt?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}