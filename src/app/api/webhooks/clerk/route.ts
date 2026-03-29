import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { sendWelcomeEmail } from '@/lib/email';

// Função auxiliar para atualizar metadata no Clerk
async function updateClerkPublicMetadata(
  clerkUserId: string,
  metadata: { role: string; supabaseUserId: number }
): Promise<void> {
  try {
    const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/metadata`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_metadata: metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ [CLERK WEBHOOK] Erro ao atualizar metadata:', error);
    }
  } catch (error) {
    console.error('❌ [CLERK WEBHOOK] Erro ao atualizar metadata:', error);
  }
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('❌ [CLERK WEBHOOK] CLERK_WEBHOOK_SECRET não configurado');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('❌ [CLERK WEBHOOK] Verificação falhou:', err);
    return new Response('Webhook verification failed', { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  // Handle events
  switch (evt.type) {
    case 'user.created': {
      const { id, email_addresses, first_name, last_name, image_url, public_metadata } = evt.data;
      const email = email_addresses[0]?.email_address;
      const name = [first_name, last_name].filter(Boolean).join(' ') || null;

      console.log(`✅ [CLERK WEBHOOK] Novo utilizador: ${email}`);

      // Verificar se utilizador já existe (migração ou registo anterior)
      const { data: existingUser } = await supabase
        .from('User')
        .select('id, role, clerkUserId')
        .eq('email', email)
        .single();

      if (existingUser) {
        // Utilizador já existe - associar clerkUserId se ainda não tiver
        if (!existingUser.clerkUserId) {
          const { error: updateError } = await supabase
            .from('User')
            .update({
              clerkUserId: id,
              image: image_url || undefined,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', existingUser.id);

          if (updateError) {
            console.error('❌ [CLERK WEBHOOK] Erro ao associar clerkUserId:', updateError);
            // Não retornar 500 - o user já existe, só não conseguimos associar
            // Isso será tratado no middleware quando o user fizer login
          } else {
            // Atualizar metadata no Clerk com o role existente
            await updateClerkPublicMetadata(id, {
              role: existingUser.role,
              supabaseUserId: existingUser.id,
            });

            console.log(`🔗 [CLERK WEBHOOK] Utilizador existente associado: ${existingUser.id} → ${id}`);
          }
        } else {
          console.log(`⏭️ [CLERK WEBHOOK] Utilizador já associado: ${existingUser.id}`);
        }
        // Sempre retornar sucesso para users existentes
        return new Response('OK', { status: 200 });
      }

      // Novo utilizador - criar no Supabase
      // Usar role da metadata se existir (migração), senão USER
      const role = (public_metadata?.role as string) || 'USER';

      const { data: newUser, error } = await supabase
        .from('User')
        .insert({
          clerkUserId: id,
          email,
          name,
          image: image_url,
          role: role as 'USER' | 'TRUSTED' | 'REVIEWER' | 'ADMIN',
          emailVerified: new Date().toISOString(), // Clerk já verifica
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [CLERK WEBHOOK] Erro ao criar utilizador:', error);
        return new Response('Error creating user', { status: 500 });
      }

      // Atualizar metadata no Clerk
      await updateClerkPublicMetadata(id, {
        role: newUser.role,
        supabaseUserId: newUser.id,
      });

      // Enviar email de boas-vindas
      if (email && name) {
        try {
          await sendWelcomeEmail(name, email);
        } catch (emailError) {
          console.error('❌ [CLERK WEBHOOK] Erro ao enviar email:', emailError);
        }
      }

      console.log(`✅ [CLERK WEBHOOK] Utilizador criado: ${newUser.id}`);
      break;
    }

    case 'user.updated': {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const email = email_addresses[0]?.email_address;
      const name = [first_name, last_name].filter(Boolean).join(' ') || null;

      console.log(`🔄 [CLERK WEBHOOK] Atualizar utilizador: ${email}`);

      const { error } = await supabase
        .from('User')
        .update({
          email,
          name,
          image: image_url,
          updatedAt: new Date().toISOString(),
        })
        .eq('clerkUserId', id);

      if (error) {
        console.error('❌ [CLERK WEBHOOK] Erro ao atualizar utilizador:', error);
        return new Response('Error updating user', { status: 500 });
      }

      console.log(`✅ [CLERK WEBHOOK] Utilizador atualizado`);
      break;
    }

    case 'user.deleted': {
      const { id } = evt.data;

      console.log(`🗑️ [CLERK WEBHOOK] Eliminar utilizador: ${id}`);

      // Buscar utilizador pelo clerkUserId
      const { data: user } = await supabase
        .from('User')
        .select('id, email')
        .eq('clerkUserId', id)
        .single();

      if (user) {
        // Anonimizar dados em vez de eliminar (para manter integridade das músicas)
        const { error } = await supabase
          .from('User')
          .update({
            email: `deleted_${user.id}@deleted.local`,
            name: 'Utilizador Eliminado',
            image: null,
            clerkUserId: null,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) {
          console.error('❌ [CLERK WEBHOOK] Erro ao anonimizar utilizador:', error);
        }

        // Eliminar playlists, favoritos, etc.
        await supabase.from('Playlist').delete().eq('userId', user.id);
        await supabase.from('StarredSong').delete().eq('userId', user.id);

        console.log(`✅ [CLERK WEBHOOK] Utilizador anonimizado: ${user.id}`);
      }
      break;
    }

    case 'session.created': {
      const { user_id } = evt.data;

      console.log(`🔐 [CLERK WEBHOOK] Nova sessão: ${user_id}`);

      // Registar login (opcional - para estatísticas)
      // Pode ser expandido para enviar alertas de login como antes
      break;
    }

    default:
      console.log(`ℹ️ [CLERK WEBHOOK] Evento não tratado: ${evt.type}`);
  }

  return new Response('OK', { status: 200 });
}
