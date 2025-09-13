import { Adapter, AdapterAccount, AdapterSession, AdapterUser, VerificationToken } from "next-auth/adapters";
import { supabase } from "@/lib/supabase-client";

export function SupabaseAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      try {
        const { data, error } = await (supabase as any)
          .from('User')
          .insert({
            name: user.name,
            email: user.email,
            image: user.image,
            emailVerified: user.emailVerified?.toISOString() || null,
            role: 'USER'
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating user:', error);
          throw error;
        }
        
        return {
          id: (data as any).id.toString(),
          name: (data as any).name,
          email: (data as any).email,
          image: (data as any).image,
          emailVerified: (data as any).emailVerified ? new Date((data as any).emailVerified) : null,
        } as AdapterUser;
      } catch (error) {
        console.error('Supabase createUser error:', error);
        throw error;
      }
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const { data, error } = await (supabase as any)
        .from('User')
        .select()
        .eq('id', parseInt(id))
        .single();

      if (error || !data) return null;

      return {
        id: (data as any).id.toString(),
        name: (data as any).name,
        email: (data as any).email,
        image: (data as any).image,
        emailVerified: (data as any).emailVerified ? new Date((data as any).emailVerified) : null,
      } as AdapterUser;
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const { data, error } = await (supabase as any)
        .from('User')
        .select()
        .eq('email', email)
        .single();

      if (error || !data) return null;

      return {
        id: (data as any).id.toString(),
        name: (data as any).name,
        email: (data as any).email,
        image: (data as any).image,
        emailVerified: (data as any).emailVerified ? new Date((data as any).emailVerified) : null,
      } as AdapterUser;
    },

    async getUserByAccount({ providerAccountId, provider }: Pick<AdapterAccount, "provider" | "providerAccountId">): Promise<AdapterUser | null> {
      const { data, error } = await (supabase as any)
        .from('Account')
        .select(`
          *,
          User (*)
        `)
        .eq('provider', provider)
        .eq('providerAccountId', providerAccountId)
        .single();

      if (error || !data || !(data as any).User) return null;

      const user = Array.isArray((data as any).User) ? (data as any).User[0] : (data as any).User;
      
      return {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        image: user.image,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
      } as AdapterUser;
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">): Promise<AdapterUser> {
      const { data, error } = await (supabase as any)
        .from('User')
        .update({
          name: user.name,
          email: user.email,
          image: user.image,
          emailVerified: user.emailVerified?.toISOString() || null,
        })
        .eq('id', parseInt(user.id))
        .select()
        .single();

      if (error) throw error;

      return {
        id: (data as any).id.toString(),
        name: (data as any).name,
        email: (data as any).email,
        image: (data as any).image,
        emailVerified: (data as any).emailVerified ? new Date((data as any).emailVerified) : null,
      } as AdapterUser;
    },

    async deleteUser(userId: string): Promise<void> {
      await (supabase as any).from('User').delete().eq('id', parseInt(userId));
    },

    async linkAccount(account: AdapterAccount): Promise<AdapterAccount> {
      // Criar objeto sem o campo id para deixar o Supabase gerar automaticamente
      const accountData = {
        userId: parseInt(account.userId),
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state,
      };

      console.log('🔗 [ADAPTER] Linking account:', { provider: account.provider, userId: account.userId });

      const { data, error } = await (supabase as any)
        .from('Account')
        .insert(accountData)
        .select()
        .single();

      if (error) {
        console.error('❌ [ADAPTER] Error linking account:', error);
        throw error;
      }

      console.log('✅ [ADAPTER] Account linked successfully');
      
      return {
        ...(data as any),
        userId: (data as any).userId.toString(),
      } as AdapterAccount;
    },

    async unlinkAccount({ providerAccountId, provider }: Pick<AdapterAccount, "provider" | "providerAccountId">): Promise<void> {
      await (supabase as any)
        .from('Account')
        .delete()
        .eq('provider', provider)
        .eq('providerAccountId', providerAccountId);
    },

    async createSession({ sessionToken, userId, expires }: { sessionToken: string; userId: string; expires: Date }): Promise<AdapterSession> {
      const { data, error } = await (supabase as any)
        .from('Session')
        .insert({
          sessionToken,
          userId: parseInt(userId),
          expires: expires.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return {
        sessionToken: (data as any).sessionToken,
        userId: (data as any).userId.toString(),
        expires: new Date((data as any).expires),
      };
    },

    async getSessionAndUser(sessionToken: string): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      const { data, error } = await (supabase as any)
        .from('Session')
        .select(`
          *,
          User (*)
        `)
        .eq('sessionToken', sessionToken)
        .single();

      if (error || !data || !(data as any).User) return null;

      const user = Array.isArray((data as any).User) ? (data as any).User[0] : (data as any).User;

      return {
        session: {
          sessionToken: (data as any).sessionToken,
          userId: (data as any).userId.toString(),
          expires: new Date((data as any).expires),
        },
        user: {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
        } as AdapterUser,
      };
    },

    async updateSession({ sessionToken, expires, userId }: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">): Promise<AdapterSession | null | undefined> {
      const { data, error } = await (supabase as any)
        .from('Session')
        .update({
          expires: expires?.toISOString(),
          userId: userId ? parseInt(userId) : undefined,
        })
        .eq('sessionToken', sessionToken)
        .select()
        .single();

      if (error) throw error;

      return {
        sessionToken: (data as any).sessionToken,
        userId: (data as any).userId.toString(),
        expires: new Date((data as any).expires),
      };
    },

    async deleteSession(sessionToken: string): Promise<void> {
      await (supabase as any).from('Session').delete().eq('sessionToken', sessionToken);
    },

    async createVerificationToken({ identifier, expires, token }: VerificationToken): Promise<VerificationToken> {
      const { data, error } = await (supabase as any)
        .from('VerificationToken')
        .insert({
          identifier,
          token,
          expires: expires.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return {
        identifier: (data as any).identifier,
        token: (data as any).token,
        expires: new Date((data as any).expires),
      };
    },

    async useVerificationToken({ identifier, token }: { identifier: string; token: string }): Promise<VerificationToken | null> {
      const { data, error } = await (supabase as any)
        .from('VerificationToken')
        .delete()
        .eq('identifier', identifier)
        .eq('token', token)
        .select()
        .single();

      if (error || !data) return null;

      return {
        identifier: (data as any).identifier,
        token: (data as any).token,
        expires: new Date((data as any).expires),
      };
    },
  };
}
