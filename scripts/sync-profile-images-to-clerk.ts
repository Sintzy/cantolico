/**
 * Script para sincronizar fotos de perfil do Supabase para o Clerk
 *
 * Este script atualiza as fotos de perfil no Clerk com as imagens
 * que os utilizadores já têm no Supabase (Google OAuth).
 *
 * Uso: npx tsx scripts/sync-profile-images-to-clerk.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Configuração
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !CLERK_SECRET_KEY) {
  console.error('❌ Variáveis de ambiente em falta!');
  console.error('Necessário: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLERK_SECRET_KEY');
  process.exit(1);
}

// Inicializar Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface UserWithImage {
  id: number;
  email: string;
  name: string | null;
  image: string | null;
  clerkUserId: string | null;
}

// Função para atualizar imagem no Clerk
async function updateClerkProfileImage(
  clerkUserId: string,
  imageUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // O Clerk não permite definir image_url diretamente via API
    // Mas podemos usar o profile_image_url através da API de update
    // Na verdade, a imagem do OAuth é gerida pelo Clerk automaticamente
    // O que podemos fazer é atualizar os external accounts ou usar a API de imagem

    // Vamos tentar atualizar via PATCH user
    const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Não há campo direto para image_url no PATCH
        // Mas podemos forçar a sincronização do OAuth
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: JSON.stringify(data) };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Função para definir imagem de perfil via upload
async function setClerkProfileImageFromUrl(
  clerkUserId: string,
  imageUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Primeiro, fazer download da imagem
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!imageResponse.ok) {
      return { success: false, error: `Não foi possível descarregar imagem: ${imageResponse.status}` };
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    // Determinar o tipo de imagem
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.includes('png') ? 'png' : 'jpg';

    // Criar FormData para upload usando o formato que o Clerk espera
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: contentType });
    formData.append('file', blob, `profile.${extension}`);

    // Upload para o Clerk
    const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/profile_image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: JSON.stringify(data.errors || data) };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Função principal
async function syncProfileImages(): Promise<void> {
  console.log('🖼️  Sincronizando fotos de perfil para o Clerk...\n');

  // Buscar utilizadores com imagem e clerkUserId
  const { data: users, error } = await supabase
    .from('User')
    .select('id, email, name, image, clerkUserId')
    .not('image', 'is', null)
    .not('clerkUserId', 'is', null)
    .order('id', { ascending: true });

  if (error || !users) {
    console.error('❌ Erro ao buscar utilizadores:', error);
    process.exit(1);
  }

  const usersWithImages = users.filter(u => u.image && u.clerkUserId) as UserWithImage[];
  console.log(`📊 Encontrados ${usersWithImages.length} utilizadores com imagem para sincronizar\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const user of usersWithImages) {
    console.log(`👤 [${user.id}] ${user.email}`);
    console.log(`   📷 ${user.image?.substring(0, 60)}...`);

    if (!user.clerkUserId) {
      console.log(`   ⏭️  Sem clerkUserId, a saltar\n`);
      skippedCount++;
      continue;
    }

    // Verificar se o Clerk tem imagem real (não default com iniciais)
    const checkResponse = await fetch(`https://api.clerk.com/v1/users/${user.clerkUserId}`, {
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      },
    });

    if (checkResponse.ok) {
      const clerkUser = await checkResponse.json();
      const clerkImageUrl = clerkUser.image_url || clerkUser.profile_image_url || '';

      // Se a imagem do Clerk é "default" (contém iniciais), precisamos fazer upload
      const isDefaultImage = clerkImageUrl.includes('"type":"default"') ||
                            clerkImageUrl.includes('initials') ||
                            clerkImageUrl.includes('%22type%22:%22default%22');

      if (clerkImageUrl && !isDefaultImage && clerkUser.has_image) {
        console.log(`   ✅ Clerk já tem imagem real\n`);
        successCount++;
        continue;
      } else {
        console.log(`   ⚠️  Clerk tem imagem default, a fazer upload...`);
      }
    }

    // Tentar fazer upload da imagem para o Clerk
    const result = await setClerkProfileImageFromUrl(user.clerkUserId, user.image!);

    if (result.success) {
      console.log(`   ✅ Imagem sincronizada!\n`);
      successCount++;
    } else {
      console.log(`   ❌ Erro: ${result.error}\n`);
      errorCount++;
    }

    // Pequena pausa para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Resumo
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO DA SINCRONIZAÇÃO');
  console.log('='.repeat(50));
  console.log(`✅ Sucesso: ${successCount}`);
  console.log(`⏭️  Saltados: ${skippedCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`📝 Total: ${usersWithImages.length}`);
  console.log('\n✨ Sincronização concluída!');
}

// Executar
syncProfileImages().catch(console.error);
