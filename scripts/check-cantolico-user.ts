import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCantolicoUser() {
  try {
    console.log('🔍 Verificando utilizador "Cantolico"...');
    
    // Verificar se existe utilizador com ID 0
    const userById = await prisma.user.findUnique({
      where: { id: 0 }
    });
    
    if (userById) {
      console.log('✅ Utilizador ID 0 encontrado:', userById.name, userById.email);
      return userById;
    }
    
    // Verificar se existe utilizador com nome "Cantolico"
    const userByName = await prisma.user.findFirst({
      where: { 
        name: {
          contains: 'Cantolico',
          mode: 'insensitive'
        }
      }
    });
    
    if (userByName) {
      console.log('✅ Utilizador "Cantolico" encontrado:', userByName.id, userByName.name, userByName.email);
      return userByName;
    }
    
    console.log('❌ Utilizador "Cantolico" não encontrado');
    
    // Verificar todos os utilizadores admin
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });
    
    console.log('\n📋 Utilizadores ADMIN disponíveis:');
    adminUsers.forEach(user => {
      console.log(`  • ID ${user.id}: ${user.name} (${user.email})`);
    });
    
    return null;
  } catch (error) {
    console.error('❌ Erro ao verificar utilizador:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

checkCantolicoUser();
