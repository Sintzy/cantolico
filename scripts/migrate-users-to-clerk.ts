/**
 * Script de Migração de Utilizadores para Clerk
 *
 * Este script migra todos os utilizadores existentes do Supabase para o Clerk,
 * mantendo os IDs, roles e passwords (bcrypt) intactos.
 *
 * Uso: npx tsx scripts/migrate-users-to-clerk.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Tipos
interface SupabaseUser {
  id: number;
  name: string | null;
  email: string;
  passwordHash: string | null;
  image: string | null;
  role: 'USER' | 'TRUSTED' | 'REVIEWER' | 'ADMIN';
  bio: string | null;
  emailVerified: string | null;
  createdAt: string;
}

interface ClerkCreateUserParams {
  email_address: string[];
  first_name?: string;
  last_name?: string;
  password_hasher?: string;
  password_digest?: string;
  public_metadata?: {
    role: string;
    supabaseUserId: number;
  };
  private_metadata?: {
    migratedAt: string;
    originalCreatedAt: string;
  };
  skip_password_checks?: boolean;
  skip_password_requirement?: boolean;
}

interface MigrationResult {
  success: boolean;
  userId: number;
  email: string;
  clerkUserId?: string;
  error?: string;
}

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

// Função para criar utilizador no Clerk via API
async function createClerkUser(user: SupabaseUser): Promise<{ clerkUserId: string } | { error: string }> {
  const nameParts = (user.name || '').split(' ');
  const firstName = nameParts[0] || undefined;
  const lastName = nameParts.slice(1).join(' ') || undefined;

  const params: ClerkCreateUserParams = {
    email_address: [user.email],
    first_name: firstName,
    last_name: lastName,
    public_metadata: {
      role: user.role,
      supabaseUserId: user.id,
    },
    private_metadata: {
      migratedAt: new Date().toISOString(),
      originalCreatedAt: user.createdAt,
    },
  };

  // Se tem password hash (bcrypt), incluir na migração
  if (user.passwordHash) {
    params.password_digest = user.passwordHash;
    params.password_hasher = 'bcrypt';
    params.skip_password_checks = true;
  } else {
    // Utilizador OAuth - não precisa de password
    params.skip_password_requirement = true;
  }

  try {
    const response = await fetch('https://api.clerk.com/v1/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      // Se o email já existe no Clerk, tentar buscar o utilizador
      if (data.errors?.[0]?.code === 'form_identifier_exists') {
        console.log(`  ⚠️  Email já existe no Clerk, a buscar utilizador existente...`);
        return await findClerkUserByEmail(user.email);
      }
      return { error: JSON.stringify(data.errors || data) };
    }

    return { clerkUserId: data.id };
  } catch (error) {
    return { error: String(error) };
  }
}

// Função para buscar utilizador existente no Clerk por email
async function findClerkUserByEmail(email: string): Promise<{ clerkUserId: string } | { error: string }> {
  try {
    const response = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
      {
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.length) {
      return { error: 'Utilizador não encontrado no Clerk' };
    }

    return { clerkUserId: data[0].id };
  } catch (error) {
    return { error: String(error) };
  }
}

// Função para atualizar metadata de utilizador existente no Clerk
async function updateClerkUserMetadata(
  clerkUserId: string,
  user: SupabaseUser
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/metadata`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_metadata: {
          role: user.role,
          supabaseUserId: user.id,
        },
        private_metadata: {
          migratedAt: new Date().toISOString(),
          originalCreatedAt: user.createdAt,
        },
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

// Função principal de migração
async function migrateUsers(): Promise<void> {
  console.log('🚀 Iniciando migração de utilizadores para Clerk...\n');

  // 1. Buscar todos os utilizadores do Supabase
  const { data: users, error } = await supabase
    .from('User')
    .select('id, name, email, passwordHash, image, role, bio, emailVerified, createdAt')
    .order('id', { ascending: true });

  if (error || !users) {
    console.error('❌ Erro ao buscar utilizadores:', error);
    process.exit(1);
  }

  console.log(`📊 Encontrados ${users.length} utilizadores para migrar\n`);

  // Estatísticas
  const results: MigrationResult[] = [];
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  // 2. Verificar se a coluna clerkUserId já existe
  const { data: testUser } = await supabase
    .from('User')
    .select('id, clerkUserId')
    .limit(1)
    .single();

  const hasClerkUserIdColumn = testUser && 'clerkUserId' in testUser;

  if (!hasClerkUserIdColumn) {
    console.log('⚠️  A coluna clerkUserId não existe na tabela User.');
    console.log('   Por favor, executa o seguinte SQL no Supabase:\n');
    console.log('   ALTER TABLE "User" ADD COLUMN "clerkUserId" TEXT UNIQUE;');
    console.log('   CREATE INDEX idx_user_clerk_id ON "User"("clerkUserId");\n');
    console.log('   Depois volta a executar este script.\n');
    process.exit(1);
  }

  // 3. Migrar cada utilizador
  for (const user of users) {
    console.log(`👤 [${user.id}] ${user.email} (${user.role})`);

    // Verificar se já foi migrado
    const { data: existingUser } = await supabase
      .from('User')
      .select('clerkUserId')
      .eq('id', user.id)
      .single();

    if (existingUser?.clerkUserId) {
      console.log(`  ⏭️  Já migrado: ${existingUser.clerkUserId}\n`);
      skippedCount++;
      results.push({
        success: true,
        userId: user.id,
        email: user.email,
        clerkUserId: existingUser.clerkUserId,
      });
      continue;
    }

    // Criar no Clerk
    const clerkResult = await createClerkUser(user);

    if ('error' in clerkResult) {
      console.log(`  ❌ Erro: ${clerkResult.error}\n`);
      errorCount++;
      results.push({
        success: false,
        userId: user.id,
        email: user.email,
        error: clerkResult.error,
      });
      continue;
    }

    // Se encontrámos um utilizador existente, atualizar a metadata
    if (clerkResult.clerkUserId) {
      await updateClerkUserMetadata(clerkResult.clerkUserId, user);
    }

    // Atualizar o Supabase com o clerkUserId
    const { error: updateError } = await supabase
      .from('User')
      .update({ clerkUserId: clerkResult.clerkUserId })
      .eq('id', user.id);

    if (updateError) {
      console.log(`  ⚠️  Erro ao atualizar Supabase: ${updateError.message}\n`);
      errorCount++;
      results.push({
        success: false,
        userId: user.id,
        email: user.email,
        clerkUserId: clerkResult.clerkUserId,
        error: `Supabase update failed: ${updateError.message}`,
      });
      continue;
    }

    console.log(`  ✅ Migrado: ${clerkResult.clerkUserId}\n`);
    successCount++;
    results.push({
      success: true,
      userId: user.id,
      email: user.email,
      clerkUserId: clerkResult.clerkUserId,
    });

    // Pequena pausa para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 4. Resumo final
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO DA MIGRAÇÃO');
  console.log('='.repeat(50));
  console.log(`✅ Sucesso: ${successCount}`);
  console.log(`⏭️  Já migrados: ${skippedCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`📝 Total: ${users.length}`);

  if (errorCount > 0) {
    console.log('\n❌ Utilizadores com erros:');
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`   - [${r.userId}] ${r.email}: ${r.error}`));
  }

  console.log('\n✨ Migração concluída!');
}

// Executar
migrateUsers().catch(console.error);
