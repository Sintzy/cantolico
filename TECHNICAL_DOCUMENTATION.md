# 📖 Cantólico - Documentação Técnica Completa

> **Plataforma digital colaborativa para organização e partilha de cânticos católicos em língua portuguesa**
>
> **Versão:** 2.0 | **Última Atualização:** Outubro 2025

## 📋 Índice

1. [Tech Stack](#-tech-stack)
2. [Arquitetura do Sistema](#-arquitetura-do-sistema)
3. [Base de Dados](#-base-de-dados)
4. [Páginas da Aplicação](#-páginas-da-aplicação)
5. [API Endpoints](#-api-endpoints)
6. [Autenticação e Autorização](#-autenticação-e-autorização)
7. [Middleware](#-middleware)
8. [Componentes Principais](#-componentes-principais)
9. [Serviços e Bibliotecas](#-serviços-e-bibliotecas)
10. [Configurações](#-configurações)
11. [Deploy e Ambiente](#-deploy-e-ambiente)
12. [Funcionalidades Avançadas](#-funcionalidades-avançadas)

---

## 🛠 Tech Stack

### **Frontend**
- **Next.js 15.4.2** - Framework React com App Router e Turbopack para desenvolvimento
- **React 19.1.0** - Biblioteca de interface com hooks e server components
- **TypeScript 5.0+** - Tipagem estática para maior segurança
- **Tailwind CSS 4.0** - Framework CSS utilitário com design system
- **Radix UI** - Componentes primitivos acessíveis (WAI-ARIA)
- **Shadcn/UI** - Sistema de componentes moderno baseado em Radix
- **Lucide React** - Biblioteca de ícones SVG consistente
- **Framer Motion** - Sistema de animações declarativo

### **Backend & Database**
- **Next.js API Routes** - Endpoints REST serverless com Edge Runtime
- **NextAuth.js 4.24.11** - Sistema de autenticação completo
- **Supabase.js 2.56.1** - Client PostgreSQL com real-time features
- **PostgreSQL 15+** - Base de dados relacional via Supabase
- **Row Level Security (RLS)** - Segurança a nível de linha

### **Serviços Externos & Integrações**
- **Supabase** - BaaS (Backend as a Service) com Storage e Auth
- **Google OAuth 2.0** - Autenticação social integrada
- **Cloudflare Turnstile** - Sistema de captcha avançado
- **Resend** - Plataforma de envio de emails transacionais
- **Vercel** - Platform de deploy com Edge Network
- **GitHub** - Controlo de versão e CI/CD

### **Processamento de Conteúdo**
- **Markdown-it 14.0** - Parser de Markdown extensível
- **markdown-it-chords** - Plugin para acordes musicais
- **PDF-lib** - Manipulação e geração de PDFs
- **React SimpleMDE** - Editor Markdown com preview
- **Browser Image Compression** - Optimização de imagens client-side
- **Remove Accents** - Normalização de texto para slugs

---

## 🏗 Arquitetura do Sistema

### **Estrutura de Diretórios (App Router)**

```
src/
├── app/                          # Next.js 15 App Router
│   ├── (authprofile)/           # Grupo de rotas autenticadas
│   │   ├── login/               # Página de login
│   │   ├── register/            # Página de registo
│   │   ├── profile/             # Perfil do utilizador
│   │   └── users/[id]/          # Perfis públicos
│   ├── (docs)/                  # Documentação e páginas legais
│   │   ├── terms/               # Termos de serviço
│   │   └── privacy-policy/      # Política de privacidade
│   ├── admin/                   # Painel administrativo
│   │   ├── dashboard/           # Dashboard principal
│   │   │   ├── users/           # Gestão de utilizadores
│   │   │   ├── musics/          # Gestão de músicas
│   │   │   │   └── [id]/edit/   # Edição avançada de músicas
│   │   │   ├── playlists/       # Gestão de playlists
│   │   │   └── banners/         # Gestão de banners
│   │   └── review/              # Sistema de revisão
│   │       └── [id]/            # Revisão individual
│   ├── api/                     # API Routes
│   │   ├── admin/               # Endpoints administrativos
│   │   ├── auth/                # NextAuth endpoints
│   │   ├── musics/              # Gestão de músicas
│   │   ├── playlists/           # Gestão de playlists
│   │   ├── user/                # Dados do utilizador
│   │   └── logs/                # Sistema de logging
│   ├── musics/                  # Sistema de músicas
│   │   ├── create/              # Criação de novas músicas
│   │   └── [id]/                # Visualização individual
│   ├── playlists/               # Sistema de playlists
│   │   ├── create/              # Criação de playlists
│   │   ├── explore/             # Exploração pública
│   │   ├── invite/              # Sistema de convites
│   │   └── [id]/                # Visualização e edição
│   ├── logs/                    # Sistema de logs
│   │   ├── security-alerts/     # Alertas de segurança
│   │   └── [id]/                # Visualização de logs
│   ├── starred-songs/           # Músicas favoritas
│   ├── banned/                  # Página para utilizadores banidos
│   ├── page.tsx                 # Homepage
│   ├── layout.tsx               # Layout principal
│   ├── globals.css              # Estilos globais
│   ├── not-found.tsx            # Página 404
│   ├── middleware.ts            # Middleware de rota
│   ├── manifest.ts              # PWA manifest
│   ├── robots.ts                # SEO robots.txt
│   └── sitemap.ts               # SEO sitemap
├── components/                   # Componentes React
│   ├── ui/                      # Componentes base Shadcn/UI
│   ├── forms/                   # Componentes de formulários
│   ├── providers/               # Context providers
│   └── *.tsx                    # Componentes específicos
├── hooks/                       # Custom React hooks
│   ├── useInfiniteScroll.ts     # Scroll infinito
│   ├── useLogger.ts             # Sistema de logging
│   └── useOptimization.ts       # Optimizações de performance
├── lib/                         # Bibliotecas e utilitários
│   ├── auth.ts                  # Configuração NextAuth
│   ├── supabase-*.ts            # Configurações Supabase
│   ├── chord-processor.ts       # Processamento de acordes
│   ├── enhanced-*.ts            # Sistemas avançados
│   └── *.ts                     # Outros utilitários
├── types/                       # Definições TypeScript
│   ├── supabase.ts              # Tipos da base de dados
│   ├── next-auth.d.ts           # Extensões NextAuth
│   └── declarations.d.ts        # Declarações globais
├── public/                      # Assets estáticos
│   ├── badges/                  # Badges de utilizador
│   └── styles/                  # CSS específico
└── migrations/                  # Migrações da base de dados
    └── *.sql                    # Scripts SQL
```

### **Padrões Arquiteturais**
- **Server Components First** - Renderização no servidor por defeito
- **Progressive Enhancement** - Funcionalidade básica sem JavaScript
- **API-First Design** - Endpoints bem definidos e documentados
- **Type-Safe Development** - TypeScript em toda a stack
- **Modular Architecture** - Separação clara de responsabilidades
- **Real-time Features** - Subscriptions Supabase para dados live

---

## 🗄 Base de Dados

### **Schema Supabase (PostgreSQL 15+)**

#### **Utilizadores e Autenticação**
```sql
-- Enum para roles de utilizador
CREATE TYPE "Role" AS ENUM ('USER', 'TRUSTED', 'REVIEWER', 'ADMIN');

-- Enum para status de moderação
CREATE TYPE "ModerationStatus" AS ENUM ('ACTIVE', 'WARNING', 'SUSPENDED', 'BANNED');

-- Tabela principal de utilizadores
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT,
    "image" TEXT,
    "role" "Role" DEFAULT 'USER' NOT NULL,
    "bio" TEXT,
    "profileImage" TEXT,
    "emailVerified" TIMESTAMPTZ,
    "moderationStatus" "ModerationStatus" DEFAULT 'ACTIVE' NOT NULL,
    "moderationReason" TEXT,
    "moderationExpiresAt" TIMESTAMPTZ,
    "lastLoginAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela de contas OAuth
CREATE TABLE "Account" (
    "id" TEXT PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
```

#### **Sistema de Músicas**
```sql
-- Enums para momentos litúrgicos
CREATE TYPE "LiturgicalMoment" AS ENUM (
  'ENTRADA', 'ATO_PENITENCIAL', 'GLORIA', 'SALMO',
  'ACLAMACAO', 'OFERTORIO', 'SANTO', 'COMUNHAO', 
  'ACAO_DE_GRACAS', 'FINAL', 'ADORACAO', 'ASPERSAO',
  'BAPTISMO', 'BENCAO_DAS_ALIANCAS', 'CORDEIRO_DE_DEUS',
  'CRISMA', 'INTRODUCAO_DA_PALAVRA', 'LOUVOR',
  'PAI_NOSSO', 'REFLEXAO', 'TERCO_MISTERIO', 'OUTROS'
);

-- Enums para tipos de música
CREATE TYPE "SongType" AS ENUM ('ACORDES', 'PARTITURA', 'INSTRUMENTAL', 'ACAPELLA');

-- Enums para instrumentos
CREATE TYPE "Instrument" AS ENUM (
  'GUITARRA', 'PIANO', 'ORGAO', 'VIOLINO', 'FLAUTA',
  'SAXOFONE', 'BATERIA', 'BAIXO', 'CAVAQUINHO', 'ACORDEAO'
);

-- Enums para tipos de fonte
CREATE TYPE "SourceType" AS ENUM ('PDF', 'MARKDOWN', 'PLAINTEXT');

-- Enums para status de submissão
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Tabela principal de músicas
CREATE TABLE "Song" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "author" TEXT,                      -- 🆕 Campo autor opcional
    "moments" "LiturgicalMoment"[] NOT NULL,
    "type" "SongType" NOT NULL,
    "mainInstrument" "Instrument" NOT NULL,
    "tags" TEXT[] NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "currentVersionId" TEXT,
    "viewCount" INTEGER DEFAULT 0 NOT NULL,
    "downloadCount" INTEGER DEFAULT 0 NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela de versões de músicas
CREATE TABLE "SongVersion" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "songId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourcePdfKey" TEXT,
    "sourceText" TEXT,
    "renderedHtml" TEXT,
    "keyOriginal" TEXT,
    "lyricsPlain" TEXT NOT NULL,
    "chordsJson" JSONB,
    "abcBlocks" JSONB,
    "mediaUrl" TEXT,
    "spotifyLink" TEXT,
    "youtubeLink" TEXT,
    "approvedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdById" INTEGER NOT NULL,
    CONSTRAINT "SongVersion_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE,
    CONSTRAINT "SongVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id")
);

-- Tabela de submissões
CREATE TABLE "SongSubmission" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "author" TEXT,                      -- 🆕 Campo autor opcional
    "moments" "LiturgicalMoment"[] NOT NULL,
    "type" "SongType" NOT NULL,
    "mainInstrument" "Instrument" NOT NULL,
    "tags" TEXT[] NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourcePdfKey" TEXT,
    "sourceText" TEXT,
    "keyOriginal" TEXT,
    "lyricsPlain" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "spotifyLink" TEXT,
    "youtubeLink" TEXT,
    "status" "SubmissionStatus" DEFAULT 'PENDING' NOT NULL,
    "rejectionReason" TEXT,
    "submittedById" INTEGER NOT NULL,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "SongSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id"),
    CONSTRAINT "SongSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
);
```

#### **Sistema de Playlists**
```sql
-- Tabela de playlists
CREATE TABLE "Playlist" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN DEFAULT false NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "Playlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Tabela de itens de playlist
CREATE TABLE "PlaylistItem" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "playlistId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "addedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "addedById" INTEGER NOT NULL,
    CONSTRAINT "PlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE,
    CONSTRAINT "PlaylistItem_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE,
    CONSTRAINT "PlaylistItem_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id")
);

-- Tabela de membros de playlist
CREATE TABLE "PlaylistMember" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "playlistId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT DEFAULT 'MEMBER' NOT NULL,
    "joinedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "PlaylistMember_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE,
    CONSTRAINT "PlaylistMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Tabela de convites para playlists
CREATE TABLE "PlaylistInvite" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "playlistId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT UNIQUE NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "acceptedAt" TIMESTAMPTZ,
    "acceptedById" INTEGER,
    "invitedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "PlaylistInvite_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE,
    CONSTRAINT "PlaylistInvite_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id"),
    CONSTRAINT "PlaylistInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id")
);
```

#### **Sistema de Favoritos e Avaliações**
```sql
-- Tabela de músicas favoritas
CREATE TABLE "Star" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" INTEGER NOT NULL,
    "songId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "Star_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "Star_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE,
    UNIQUE("userId", "songId")
);
```

#### **Sistema de Logs e Auditoria**
```sql
-- Enum para tipos de log
CREATE TYPE "LogType" AS ENUM ('INFO', 'WARN', 'ERROR', 'SUCCESS', 'SECURITY');

-- Tabela de logs do sistema
CREATE TABLE "Log" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "type" "LogType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "userId" INTEGER,
    "userEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acknowledged" BOOLEAN DEFAULT false NOT NULL,
    "acknowledgedAt" TIMESTAMPTZ,
    "acknowledgedBy" INTEGER,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "Log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id"),
    CONSTRAINT "Log_acknowledgedBy_fkey" FOREIGN KEY ("acknowledgedBy") REFERENCES "User"("id")
);

-- Tabela de alertas de segurança
CREATE TABLE "SecurityAlert" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "resolved" BOOLEAN DEFAULT false NOT NULL,
    "resolvedAt" TIMESTAMPTZ,
    "resolvedBy" INTEGER,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "SecurityAlert_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id")
);
```

#### **Sistema de Banners**
```sql
-- Enum para tipos de banner
CREATE TYPE "BannerType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR');

-- Tabela de banners informativos
CREATE TABLE "Banner" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "BannerType" DEFAULT 'INFO' NOT NULL,
    "isActive" BOOLEAN DEFAULT true NOT NULL,
    "showOnPages" TEXT[],
    "startDate" TIMESTAMPTZ,
    "endDate" TIMESTAMPTZ,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "Banner_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id")
);
```

#### **Índices e Optimizações**
```sql
-- Índices para performance
CREATE INDEX "Song_slug_idx" ON "Song"("slug");
CREATE INDEX "Song_moments_idx" ON "Song" USING GIN("moments");
CREATE INDEX "Song_tags_idx" ON "Song" USING GIN("tags");
CREATE INDEX "Song_type_idx" ON "Song"("type");
CREATE INDEX "Song_mainInstrument_idx" ON "Song"("mainInstrument");
CREATE INDEX "Song_createdAt_idx" ON "Song"("createdAt" DESC);
CREATE INDEX "SongSubmission_status_idx" ON "SongSubmission"("status");
CREATE INDEX "Playlist_userId_idx" ON "Playlist"("userId");
CREATE INDEX "Playlist_isPublic_idx" ON "Playlist"("isPublic");
CREATE INDEX "Star_userId_idx" ON "Star"("userId");
CREATE INDEX "Star_songId_idx" ON "Star"("songId");
CREATE INDEX "Log_type_idx" ON "Log"("type");
CREATE INDEX "Log_createdAt_idx" ON "Log"("createdAt" DESC);

-- Full-text search
CREATE INDEX "Song_search_idx" ON "Song" USING GIN(
    to_tsvector('portuguese', COALESCE("title", '') || ' ' || COALESCE("author", '') || ' ' || array_to_string("tags", ' '))
);
```

### **Row Level Security (RLS)**
```sql
-- Ativar RLS em todas as tabelas
ALTER TABLE "Song" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SongVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SongSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Playlist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlaylistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Star" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Log" ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para leitura
CREATE POLICY "Songs are publicly readable" ON "Song" FOR SELECT USING (true);

-- Políticas de submissões (utilizadores só veem as suas próprias)
CREATE POLICY "Users can view own submissions" ON "SongSubmission" 
    FOR SELECT USING (auth.uid()::integer = "submittedById");

-- Políticas de playlists (públicas ou próprias)
CREATE POLICY "Playlists readable by owner or if public" ON "Playlist"
    FOR SELECT USING ("isPublic" = true OR auth.uid()::integer = "userId");

-- Políticas de favoritos (só próprios)
CREATE POLICY "Users can manage own stars" ON "Star"
    FOR ALL USING (auth.uid()::integer = "userId");
```
    "image" TEXT,
    "role" "Role" DEFAULT 'USER' NOT NULL,
    "bio" TEXT,
    "profileImage" TEXT,
    "emailVerified" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enum para roles
CREATE TYPE "Role" AS ENUM ('USER', 'TRUSTED', 'REVIEWER', 'ADMIN');
```

#### **Sistema de Músicas**
```sql
model Song {
  id               String             @id @default(cuid())
  title            String
  moments          LiturgicalMoment[] // Array de momentos litúrgicos
  type             SongType
  mainInstrument   Instrument
  tags             String[]           // Array de tags
  slug             String             @unique
  currentVersionId String?            @unique
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  
  // Relações
  currentVersion   SongVersion?
  versions         SongVersion[]
  favorites        Favorite[]
  stars            Star[]
  playlistItems    PlaylistItem[]
}

model SongVersion {
  id            String     @id @default(cuid())
  songId        String
  versionNumber Int
-- Tabela Song
CREATE TABLE "Song" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "moments" "LiturgicalMoment"[] NOT NULL,
    "type" "SongType" NOT NULL,
    "mainInstrument" "Instrument" NOT NULL,
    "tags" TEXT[] NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela SongVersion
CREATE TABLE "SongVersion" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "songId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourcePdfKey" TEXT,
    "sourceText" TEXT,
    "renderedHtml" TEXT,
    "keyOriginal" TEXT,
    "lyricsPlain" TEXT NOT NULL,
    "chordsJson" JSON,
    "abcBlocks" JSON,
    "mediaUrl" TEXT,
    "spotifyLink" TEXT,
    "youtubeLink" TEXT,
    "approvedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdById" INTEGER NOT NULL,
    CONSTRAINT "SongVersion_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE,
    CONSTRAINT "SongVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id")
);

-- Enums relacionados
CREATE TYPE "LiturgicalMoment" AS ENUM (
  'ENTRADA', 'ATO_PENITENCIAL', 'GLORIA', 'SALMO',
  'ACLAMACAO', 'OFERTORIO', 'SANTO', 'COMUNHAO', 
  'ACAO_DE_GRACAS', 'FINAL', 'ADORACAO', 'ASPERSAO',
  'BAPTISMO', 'BENCAO_DAS_ALIANCAS', 'CORDEIRO_DE_DEUS',
  'CRISMA', 'INTRODUCAO_DA_PALAVRA', 'LOUVOR',
  'PAI_NOSSO', 'REFLEXAO', 'TERCO_MISTERIO', 'OUTROS'
);
```

#### **Sistema de Playlists**
```sql
-- Tabela Playlist
CREATE TABLE "Playlist" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN DEFAULT false NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "Playlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Tabela PlaylistItem
CREATE TABLE "PlaylistItem" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "playlistId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "addedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "PlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE,
    CONSTRAINT "PlaylistItem_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE,
    CONSTRAINT "PlaylistItem_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id")
);
```

#### **Sistema de Moderação**
```sql
-- Tabela UserModeration
CREATE TABLE "UserModeration" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER UNIQUE NOT NULL,
    "status" "ModerationStatus" DEFAULT 'ACTIVE' NOT NULL,
    "type" "ModerationType",
    "reason" TEXT,
    "moderatorNote" TEXT,
    "ipAddress" TEXT,
    "moderatedById" INTEGER,
    "moderatedAt" TIMESTAMPTZ,
    "expiresAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "UserModeration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "UserModeration_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id")
);

-- Enums de moderação
CREATE TYPE "ModerationStatus" AS ENUM ('ACTIVE', 'WARNING', 'SUSPENDED', 'BANNED');
CREATE TYPE "ModerationType" AS ENUM ('WARNING', 'SUSPENSION', 'BAN');
```

#### **Sistema de Submissões**
```sql
-- Tabela SongSubmission
CREATE TABLE "SongSubmission" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "moment" "LiturgicalMoment"[] NOT NULL,
    "type" "SongType" NOT NULL,
    "mainInstrument" "Instrument" NOT NULL,
    "tags" TEXT[] NOT NULL,
    "submitterId" INTEGER NOT NULL,
    "status" "SubmissionStatus" DEFAULT 'PENDING' NOT NULL,
    "rejectionReason" TEXT,
    "tempSourceType" "SourceType" NOT NULL,
    "tempPdfKey" TEXT,
    "tempText" TEXT,
    "parsedPreview" JSON,
    "mediaUrl" TEXT,
    "spotifyLink" TEXT,
    "youtubeLink" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewedAt" TIMESTAMPTZ,
    "reviewerId" INTEGER,
    CONSTRAINT "SongSubmission_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "SongSubmission_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id")
);

-- Enum para status de submissão
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
```

---

## 📄 Páginas da Aplicação

### **Públicas (Sem Autenticação)**

#### 🏠 **Landing Page** (`/`)
- **Componente:** `src/app/page.tsx`
- **Funcionalidade:** Página inicial com apresentação do projeto
- **Características:**
  - Hero section com gradientes
  - Secção de funcionalidades
  - Secção "O que é o Cantólico?"
  - Call-to-action para registo
  - Tratamento por "tu" (português PT)

#### 🎵 **Biblioteca de Músicas** (`/musics`)
- **Componente:** `src/app/musics/page.tsx`
- **Funcionalidade:** Listagem e pesquisa de cânticos
- **Características:**
  - Filtros por momento litúrgico, tags, instrumento
  - Pesquisa por título
  - Vista em grelha e lista
  - Paginação
  - Botões de favoritar e adicionar a playlists (autenticados)

#### 🎼 **Detalhes da Música** (`/musics/[id]`)
- **Componente:** `src/app/musics/[id]/page.tsx`
---

## 📄 Páginas da Aplicação

### **Públicas (Sem Autenticação)**

#### 🏠 **Homepage** (`/`)
- **Componente:** `src/app/page.tsx`
- **Funcionalidade:** Landing page principal
- **Características:**
  - Apresentação do projeto e missão
  - Últimas músicas adicionadas
  - Banners informativos dinâmicos
  - Estatísticas da comunidade
  - Call-to-action para registo
  - Navegação para exploração de conteúdo

#### 🎵 **Explorar Músicas** (`/musics`)
- **Componente:** `src/app/musics/page.tsx`
- **Funcionalidade:** Biblioteca principal de cânticos
- **Características:**
  - 🔍 **Pesquisa avançada** com filtros múltiplos
  - 🏷️ **Filtros por:** momento litúrgico, instrumento, tipo, tags
  - ♾️ **Scroll infinito** para navegação contínua
  - ⭐ **Sistema de favoritos** (se autenticado)
  - 📱 **Design responsivo** para todos os dispositivos
  - 🎯 **Resultados otimizados** com skeleton loading

#### 🎶 **Visualizar Música** (`/musics/[id]`)
- **Componente:** `src/app/musics/[id]/page.tsx`
- **Funcionalidade:** Página individual de cântico
- **Características:**
  - 🎼 **Renderização de acordes** com markdown-it-chords
  - 🔄 **Transposição de acordes** interativa
  - 📱 **Links multimédia** (Spotify, YouTube, áudio direto)
  - 📄 **Download de PDF** (se disponível)
  - ⭐ **Botão de favorito** (se autenticado)
  - ➕ **Adicionar a playlist** (se autenticado)
  - 📊 **Informações detalhadas:** autor, instrumento, momentos litúrgicos
  - 🏷️ **Tags organizacionais**
  - 👁️ **Contador de visualizações**

#### 📋 **Explorar Playlists** (`/playlists/explore`)
- **Componente:** `src/app/playlists/explore/page.tsx`
- **Funcionalidade:** Descoberta de playlists públicas
- **Características:**
  - 🌐 **Playlists públicas** da comunidade
  - 🔍 **Pesquisa por nome** e descrição
  - 👤 **Informações do criador**
  - 🎵 **Preview de conteúdo**
  - 📊 **Métricas de popularidade**

#### 📋 **Visualizar Playlist** (`/playlists/[id]`)
- **Componente:** `src/app/playlists/[id]/page.tsx`
- **Funcionalidade:** Visualização de playlist específica
- **Características:**
  - 🎵 **Lista completa de músicas**
  - ▶️ **Reprodução sequencial** com links
  - 📊 **Informações da playlist**
  - 👤 **Dados do criador**
  - 🔗 **Partilha social**

### **Autenticadas (Requer Login)**

#### 🔐 **Login** (`/login`)
- **Componente:** `src/app/(authprofile)/login/page.tsx`
- **Funcionalidade:** Autenticação de utilizadores
- **Características:**
  - 📧 **Login com email/password** 
  - 🔗 **Login social com Google OAuth**
  - 🛡️ **Validação de formulário** client-side
  - 🔄 **Redirecionamento** para página solicitada
  - 🎨 **Design moderno** com feedback visual

#### 📝 **Registo** (`/register`)
- **Componente:** `src/app/(authprofile)/register/page.tsx`
- **Funcionalidade:** Criação de nova conta
- **Características:**
  - 📋 **Formulário completo** de registo
  - ✅ **Validação em tempo real**
  - 🔐 **Hash seguro** de passwords
  - 🤖 **Captcha Turnstile** para segurança
  - 📧 **Verificação de email** opcional

#### 👤 **Perfil Pessoal** (`/profile`)
- **Componente:** `src/app/(authprofile)/profile/page.tsx`
- **Funcionalidade:** Gestão do perfil pessoal
- **Características:**
  - 🖼️ **Upload de imagem** de perfil
  - ✏️ **Edição de dados** pessoais
  - 📊 **Estatísticas de contribuição**
  - 🎵 **Músicas submetidas**
  - 📋 **Playlists criadas**
  - ⭐ **Músicas favoritas**

#### 👤 **Perfil Público** (`/users/[id]`)
- **Componente:** `src/app/(authprofile)/users/[id]/page.tsx`
- **Funcionalidade:** Visualização de perfil público
- **Características:**
  - 🌐 **Informações públicas** do utilizador
  - 📋 **Playlists públicas**
  - 🎵 **Contribuições aprovadas**
  - 🏆 **Badges de reconhecimento**

#### 🎵 **Criar Música** (`/musics/create`)
- **Componente:** `src/app/musics/create/page.tsx`
- **Funcionalidade:** Submissão de novos cânticos
- **Características:**
  - 📝 **Formulário multi-step** (4 etapas)
  - 📄 **Upload de PDF** ou edição Markdown
  - 👁️ **Preview em tempo real** com acordes
  - 🎵 **Upload de áudio** opcional
  - 🔗 **Links Spotify/YouTube**
  - 🏷️ **Sistema de tags** e categorização
  - 🤖 **Captcha de segurança**
  - ✅ **Validação completa** antes de submissão

#### 📋 **Minhas Playlists** (`/playlists`)
- **Componente:** `src/app/playlists/page.tsx`
- **Funcionalidade:** Gestão de playlists pessoais
- **Características:**
  - 📋 **Lista de playlists próprias**
  - ➕ **Criação rápida** de nova playlist
  - ✏️ **Edição inline** de nome e descrição
  - 🌐 **Toggle público/privado**
  - 🗑️ **Eliminação** com confirmação
  - 🔍 **Pesquisa e filtros**

#### ➕ **Criar Playlist** (`/playlists/create`)
- **Componente:** `src/app/playlists/create/page.tsx`
- **Funcionalidade:** Criação de nova playlist
- **Características:**
  - 📝 **Formulário de criação**
  - 🌐 **Configuração de visibilidade**
  - 🎵 **Adição inicial** de músicas
  - 👥 **Sistema de convites** (futuro)

#### ✏️ **Editar Playlist** (`/playlists/[id]/edit`)
- **Componente:** `src/app/playlists/[id]/edit/page.tsx`
- **Funcionalidade:** Edição de playlist existente
- **Características:**
  - ✏️ **Edição de metadados**
  - 🎵 **Gestão de músicas** (adicionar/remover)
  - 🔄 **Reordenação** drag-and-drop
  - 👥 **Gestão de membros**
  - 📤 **Sistema de convites**

#### 🌟 **Músicas Favoritas** (`/starred-songs`)
- **Componente:** `src/app/starred-songs/page.tsx`
- **Funcionalidade:** Biblioteca pessoal de favoritos
- **Características:**
  - ⭐ **Lista de músicas favoritas**
  - 🔍 **Pesquisa nos favoritos**
  - 📋 **Adicionar a playlists**
  - 🗑️ **Remover favoritos**

### **Administração (ADMIN + REVIEWER)**

#### 📊 **Dashboard Administrativo** (`/admin/dashboard`)
- **Componente:** `src/app/admin/dashboard/page.tsx`
- **Funcionalidade:** Painel de controlo central
- **Características:**
  - 📈 **Estatísticas em tempo real**
  - 🎵 **Métricas de músicas** (total, pendentes, aprovadas)
  - 👥 **Métricas de utilizadores** (ativos, moderados, banidos)
  - 📋 **Métricas de playlists**
  - 🚨 **Alertas de segurança** prioritários
  - 📊 **Gráficos de crescimento**
  - 🔗 **Navegação rápida** para gestão

#### 👥 **Gestão de Utilizadores** (`/admin/dashboard/users`)
- **Componente:** `src/app/admin/dashboard/users/page.tsx`
- **Funcionalidade:** Administração completa de utilizadores
- **Características:**
  - 📋 **Lista paginada** de utilizadores
  - 🔍 **Pesquisa e filtros** avançados
  - 👑 **Gestão de roles** (USER, TRUSTED, REVIEWER, ADMIN)
  - ⚠️ **Sistema de moderação** (aviso, suspensão, banimento)
  - 📊 **Histórico de ações** de moderação
  - 📧 **Comunicação** via email
  - 🛡️ **Logs de segurança**

#### 🎵 **Gestão de Músicas** (`/admin/dashboard/musics`)
- **Componente:** `src/app/admin/dashboard/musics/page.tsx`
- **Funcionalidade:** Administração do catálogo musical
- **Características:**
  - 📋 **Lista completa** de músicas
  - 🔍 **Pesquisa avançada** com filtros
  - ✏️ **Edição direta** de metadados
  - 👁️ **Preview** de conteúdo
  - 🗑️ **Eliminação** com confirmação
  - 📊 **Estatísticas** de utilização
  - 👤 **Informações do criador**

#### ✏️ **Edição Avançada de Música** (`/admin/dashboard/musics/[id]/edit`)
- **Componente:** `src/app/admin/dashboard/musics/[id]/edit/page.tsx`
- **Funcionalidade:** Edição completa de cânticos
- **Características:**
  - 📝 **Editor completo** de metadados
  - 🎼 **Editor de conteúdo** com preview
  - 👤 **Campo autor** editável
  - 🎵 **Gestão de multimédia**
  - 🏷️ **Sistema de tags** avançado
  - 💾 **Versionamento** automático
  - 🔄 **Histórico de alterações**

#### 📋 **Gestão de Playlists** (`/admin/dashboard/playlists`)
- **Componente:** `src/app/admin/dashboard/playlists/page.tsx`
- **Funcionalidade:** Supervisão de playlists da comunidade
- **Características:**
  - 📋 **Lista completa** de playlists
  - 🔍 **Filtros** por visibilidade e criador
  - 👁️ **Visualização** de conteúdo
  - ✏️ **Edição** de metadados
  - 🌐 **Toggle público/privado**
  - 🗑️ **Eliminação** com salvaguardas
  - 📊 **Estatísticas** de utilização

#### 🔍 **Sistema de Revisão** (`/admin/review`)
- **Componente:** `src/app/admin/review/page.tsx`
- **Funcionalidade:** Dashboard de submissões pendentes
- **Características:**
  - 📋 **Fila de revisão** organizada
  - ⏰ **Ordenação** por data de submissão
  - 👤 **Informações** do submissor
  - 🏷️ **Filtros** por tipo e status
  - 📊 **Métricas** de produtividade

#### ✅ **Revisão Individual** (`/admin/review/[id]`)
- **Componente:** `src/app/admin/review/[id]/page.tsx`
- **Funcionalidade:** Revisão detalhada de submissão
- **Características:**
  - 👁️ **Preview completo** da submissão
  - ✏️ **Edição** antes da aprovação
  - 👤 **Campo autor** editável
  - 📝 **Formulário de feedback**
  - ✅ **Aprovação** com criação automática
  - ❌ **Rejeição** com motivo detalhado
  - 📧 **Notificação automática** ao submissor

#### 📢 **Gestão de Banners** (`/admin/dashboard/banners`)
- **Componente:** `src/app/admin/dashboard/banners/page.tsx`
- **Funcionalidade:** Sistema de comunicação com utilizadores
- **Características:**
  - 📢 **Criação** de banners informativos
  - 🎨 **Diferentes tipos** (info, aviso, sucesso, erro)
  - 📅 **Agendamento** de exibição
  - 📱 **Segmentação** por página
  - 👁️ **Preview** em tempo real
  - 📊 **Métricas** de visualização

### **Logs e Segurança (ADMIN)**

#### 📋 **Logs do Sistema** (`/logs`)
- **Componente:** `src/app/logs/page.tsx`
- **Funcionalidade:** Auditoria e monitorização
- **Características:**
  - 📜 **Histórico completo** de ações
  - 🔍 **Filtros avançados** por tipo e utilizador
  - 🚨 **Alertas** por severidade
  - 📊 **Análise** de padrões
  - 📧 **Notificações** automáticas

#### 🔒 **Alertas de Segurança** (`/logs/security-alerts`)
- **Componente:** `src/app/logs/security-alerts/page.tsx`
- **Funcionalidade:** Monitorização de segurança
- **Características:**
  - 🚨 **Alertas** críticos de segurança
  - 🔍 **Análise** de tentativas de ataque
  - 📊 **Dashboard** de ameaças
  - ✅ **Resolução** de incidentes

#### 📊 **Análise de Segurança** (`/logs/security-analysis`)
- **Componente:** `src/app/logs/security-analysis/page.tsx`
- **Funcionalidade:** Análise comportamental avançada
- **Características:**
  - 🤖 **Detecção automática** de padrões suspeitos
  - 📈 **Gráficos** de atividade
  - 🎯 **Identificação** de anomalias
  - 📋 **Relatórios** de segurança

### **Páginas de Sistema**

#### 🚫 **Utilizador Banido** (`/banned`)
- **Componente:** `src/app/banned/page.tsx`
- **Funcionalidade:** Informação para utilizadores moderados
- **Características:**
  - ℹ️ **Motivo** da moderação
  - ⏰ **Duração** da sanção
  - 📧 **Contacto** para recurso

#### 📄 **Página 404** (`/not-found`)
- **Componente:** `src/app/not-found.tsx`
- **Funcionalidade:** Tratamento de URLs inválidos
- **Características:**
  - 🎨 **Design** amigável
  - 🔗 **Navegação** para homepage
  - 🔍 **Sugestões** de conteúdo

### **Documentação e Legal**

#### 📜 **Termos de Serviço** (`/terms`)
- **Componente:** `src/app/(docs)/terms/page.tsx`
- **Funcionalidade:** Termos legais da plataforma

#### 🔒 **Política de Privacidade** (`/privacy-policy`)
- **Componente:** `src/app/(docs)/privacy-policy/page.tsx`
- **Funcionalidade:** Políticas de proteção de dados

---

## 🚀 API Endpoints

### **Músicas (Públicas)**

#### `GET /api/musics`
- **Funcionalidade:** Listagem paginada de músicas
- **Parâmetros de query:**
  - `page` (number) - Página atual (padrão: 1)
  - `limit` (number) - Itens por página (padrão: 20, máx: 100)
  - `search` (string) - Pesquisa em título, autor e tags
  - `moments` (string[]) - Filtro por momentos litúrgicos
  - `instruments` (string[]) - Filtro por instrumentos
  - `types` (string[]) - Filtro por tipos de música
  - `tags` (string[]) - Filtro por tags específicas
- **Resposta:**
```json
{
  "songs": [
    {
      "id": "string",
      "title": "string",
      "author": "string | null",
      "slug": "string",
      "moments": ["LiturgicalMoment"],
      "type": "SongType",
      "mainInstrument": "Instrument",
      "tags": ["string"],
      "viewCount": "number",
      "createdAt": "string",
      "isStarred": "boolean"
    }
  ],
  "pagination": {
    "currentPage": "number",
    "totalPages": "number",
    "totalCount": "number",
    "hasNext": "boolean",
    "hasPrev": "boolean"
  }
}
```

#### `GET /api/musics/[id]`
- **Funcionalidade:** Detalhes completos de uma música
- **Parâmetros:** `id` - UUID ou slug da música
- **Resposta:**
```json
{
  "id": "string",
  "title": "string",
  "author": "string | null",
  "slug": "string",
  "moments": ["LiturgicalMoment"],
  "type": "SongType",
  "mainInstrument": "Instrument",
  "tags": ["string"],
  "viewCount": "number",
  "downloadCount": "number",
  "currentVersion": {
    "id": "string",
    "sourceText": "string",
    "renderedHtml": "string",
    "keyOriginal": "string",
    "lyricsPlain": "string",
    "mediaUrl": "string",
    "spotifyLink": "string",
    "youtubeLink": "string"
  },
  "isStarred": "boolean",
  "createdAt": "string"
}
```

#### `POST /api/musics/create`
- **Funcionalidade:** Submissão de nova música
- **Autenticação:** Obrigatória
- **Corpo da requisição:**
```json
{
  "title": "string",
  "author": "string | null",
  "moments": ["LiturgicalMoment"],
  "type": "SongType",
  "mainInstrument": "Instrument",
  "tags": ["string"],
  "sourceType": "SourceType",
  "sourceText": "string",
  "lyricsPlain": "string",
  "keyOriginal": "string",
  "mediaUrl": "string",
  "spotifyLink": "string",
  "youtubeLink": "string"
}
```

#### `GET /api/musics/search`
- **Funcionalidade:** Pesquisa full-text em músicas
- **Parâmetros de query:**
  - `q` (string) - Termo de pesquisa
  - `page` (number) - Página
  - `limit` (number) - Limite de resultados
- **Resposta:** Formato similar ao `GET /api/musics`

### **Sistema de Favoritos**

#### `POST /api/songs/[id]/star`
- **Funcionalidade:** Adicionar/remover música dos favoritos
- **Autenticação:** Obrigatória
- **Resposta:**
```json
{
  "isStarred": "boolean",
  "message": "string"
}
```

#### `GET /api/user/starred-songs`
- **Funcionalidade:** Lista de músicas favoritas do utilizador
- **Autenticação:** Obrigatória
- **Parâmetros de query:**
  - `page` (number) - Página
  - `limit` (number) - Limite

### **Playlists**

#### `GET /api/playlists`
- **Funcionalidade:** Listagem de playlists do utilizador
- **Autenticação:** Obrigatória
- **Resposta:**
```json
{
  "playlists": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "isPublic": "boolean",
      "songCount": "number",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

#### `POST /api/playlists`
- **Funcionalidade:** Criação de nova playlist
- **Autenticação:** Obrigatória
- **Corpo da requisição:**
```json
{
  "name": "string",
  "description": "string",
  "isPublic": "boolean"
}
```

#### `GET /api/playlists/[id]`
- **Funcionalidade:** Detalhes de playlist específica
- **Autenticação:** Condicional (pública ou própria)
- **Resposta:**
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "isPublic": "boolean",
  "user": {
    "id": "number",
    "name": "string",
    "image": "string"
  },
  "songs": [
    {
      "id": "string",
      "title": "string",
      "author": "string | null",
      "order": "number",
      "addedAt": "string"
    }
  ],
  "createdAt": "string"
}
```

#### `PUT /api/playlists/[id]`
- **Funcionalidade:** Atualização de playlist
- **Autenticação:** Obrigatória (apenas proprietário)
- **Corpo da requisição:**
```json
{
  "name": "string",
  "description": "string",
  "isPublic": "boolean"
}
```

#### `DELETE /api/playlists/[id]`
- **Funcionalidade:** Eliminação de playlist
- **Autenticação:** Obrigatória (apenas proprietário)

#### `GET /api/playlists/public`
- **Funcionalidade:** Listagem de playlists públicas
- **Parâmetros de query:**
  - `page` (number) - Página
  - `limit` (number) - Limite
  - `search` (string) - Pesquisa

#### `GET /api/playlists/explore`
- **Funcionalidade:** Exploração de playlists populares
- **Parâmetros de query:**
  - `sort` (string) - Ordenação (recent, popular, songs)

### **Gestão de Itens de Playlist**

#### `POST /api/playlists/[id]/songs`
- **Funcionalidade:** Adicionar música à playlist
- **Autenticação:** Obrigatória
- **Corpo da requisição:**
```json
{
  "songId": "string",
  "order": "number"
}
```

#### `DELETE /api/playlists/[id]/songs/[songId]`
- **Funcionalidade:** Remover música da playlist
- **Autenticação:** Obrigatória

#### `PUT /api/playlists/[id]/songs/reorder`
- **Funcionalidade:** Reordenar músicas na playlist
- **Autenticação:** Obrigatória
- **Corpo da requisição:**
```json
{
  "songs": [
    {
      "songId": "string",
      "order": "number"
    }
  ]
}
```

### **Sistema de Convites**

#### `POST /api/playlists/[id]/invite`
- **Funcionalidade:** Convidar utilizador para playlist
- **Autenticação:** Obrigatória
- **Corpo da requisição:**
```json
{
  "email": "string",
  "message": "string"
}
```

#### `GET /api/playlists/invitations`
- **Funcionalidade:** Convites pendentes do utilizador
- **Autenticação:** Obrigatória

#### `POST /api/playlists/invite/accept`
- **Funcionalidade:** Aceitar convite de playlist
- **Autenticação:** Obrigatória
- **Corpo da requisição:**
```json
{
  "token": "string"
}
```

### **Utilizador**

#### `GET /api/user/profile`
- **Funcionalidade:** Dados do perfil do utilizador autenticado
- **Autenticação:** Obrigatória

#### `PUT /api/user/profile/update`
- **Funcionalidade:** Atualização do perfil
- **Autenticação:** Obrigatória
- **Corpo da requisição:**
```json
{
  "name": "string",
  "bio": "string",
  "profileImage": "string"
}
```

#### `DELETE /api/user/delete-account`
- **Funcionalidade:** Eliminação da conta
- **Autenticação:** Obrigatória

#### `GET /api/user/playlists`
- **Funcionalidade:** Playlists do utilizador
- **Autenticação:** Obrigatória

#### `GET /api/user/moderation-status`
- **Funcionalidade:** Estado de moderação do utilizador
- **Autenticação:** Obrigatória

### **Administração (ADMIN + REVIEWER)**

#### `GET /api/admin/dashboard/stats`
- **Funcionalidade:** Estatísticas do dashboard administrativo
- **Autenticação:** ADMIN
- **Resposta:**
```json
{
  "users": {
    "total": "number",
    "active": "number",
    "moderated": "number",
    "banned": "number"
  },
  "songs": {
    "total": "number",
    "approved": "number",
    "pending": "number"
  },
  "playlists": {
    "total": "number",
    "public": "number",
    "private": "number"
  },
  "submissions": {
    "pending": "number",
    "thisWeek": "number"
  }
}
```

#### `GET /api/admin/users`
- **Funcionalidade:** Gestão de utilizadores
- **Autenticação:** ADMIN
- **Parâmetros de query:**
  - `page` (number) - Página
  - `limit` (number) - Limite
  - `search` (string) - Pesquisa
  - `role` (string) - Filtro por role
  - `status` (string) - Filtro por status de moderação

#### `PUT /api/admin/users/[id]/moderate`
- **Funcionalidade:** Moderar utilizador
- **Autenticação:** ADMIN
- **Corpo da requisição:**
```json
{
  "status": "ModerationStatus",
  "reason": "string",
  "expiresAt": "string",
  "notifyUser": "boolean"
}
```

#### `GET /api/admin/users/[id]/moderation-history`
- **Funcionalidade:** Histórico de moderação do utilizador
- **Autenticação:** ADMIN

#### `GET /api/admin/submissions`
- **Funcionalidade:** Lista de submissões pendentes
- **Autenticação:** REVIEWER ou ADMIN
- **Parâmetros de query:**
  - `status` (string) - Filtro por status
  - `type` (string) - Filtro por tipo
  - `page` (number) - Página

#### `GET /api/admin/submission/[id]`
- **Funcionalidade:** Detalhes de submissão específica
- **Autenticação:** REVIEWER ou ADMIN

#### `PUT /api/admin/submission/[id]`
- **Funcionalidade:** Atualizar submissão durante revisão
- **Autenticação:** REVIEWER ou ADMIN
- **Corpo da requisição:**
```json
{
  "title": "string",
  "author": "string | null",
  "moments": ["LiturgicalMoment"],
  "type": "SongType",
  "mainInstrument": "Instrument",
  "tags": ["string"],
  "sourceText": "string",
  "lyricsPlain": "string",
  "keyOriginal": "string",
  "mediaUrl": "string",
  "spotifyLink": "string",
  "youtubeLink": "string"
}
```

#### `POST /api/admin/submission/[id]/approve`
- **Funcionalidade:** Aprovar submissão
- **Autenticação:** REVIEWER ou ADMIN
- **Características:**
  - ✅ Cria automaticamente `Song` e `SongVersion`
  - 📧 Notifica o submissor por email
  - 📝 Regista ação nos logs

#### `POST /api/admin/submission/[id]/instant-approve`
- **Funcionalidade:** Aprovação instantânea sem edição
- **Autenticação:** ADMIN
- **Características:**
  - ⚡ Aprovação rápida para administradores
  - 📧 Notificação automática

#### `POST /api/admin/submission/[id]/reject`
- **Funcionalidade:** Rejeitar submissão
- **Autenticação:** REVIEWER ou ADMIN
- **Corpo da requisição:**
```json
{
  "reason": "string",
  "feedback": "string"
}
```

#### `GET /api/admin/music`
- **Funcionalidade:** Lista de músicas para administração
- **Autenticação:** ADMIN
- **Parâmetros de query:**
  - `page` (number) - Página
  - `search` (string) - Pesquisa
  - `type` (string) - Filtro por tipo

#### `PUT /api/admin/music/[id]`
- **Funcionalidade:** Edição administrativa de música
- **Autenticação:** ADMIN ou REVIEWER
- **Corpo da requisição:**
```json
{
  "title": "string",
  "author": "string | null",
  "moments": ["LiturgicalMoment"],
  "type": "SongType",
  "mainInstrument": "Instrument",
  "tags": ["string"],
  "lyricsPlain": "string",
  "sourceText": "string",
  "keyOriginal": "string",
  "mediaUrl": "string",
  "spotifyLink": "string",
  "youtubeLink": "string"
}
```

#### `DELETE /api/admin/music`
- **Funcionalidade:** Eliminação de música
- **Autenticação:** ADMIN
- **Corpo da requisição:**
```json
{
  "songId": "string",
  "reason": "string"
}
```

### **Gestão de Playlists (ADMIN)**

#### `GET /api/admin/playlists`
- **Funcionalidade:** Lista administrativa de playlists
- **Autenticação:** ADMIN
- **Parâmetros de query:**
  - `page` (number) - Página
  - `search` (string) - Pesquisa
  - `visibility` (string) - Filtro por visibilidade

#### `PUT /api/admin/playlists/[id]`
- **Funcionalidade:** Edição administrativa de playlist
- **Autenticação:** ADMIN

#### `DELETE /api/admin/playlists/[id]`
- **Funcionalidade:** Eliminação administrativa de playlist
- **Autenticação:** ADMIN

#### `POST /api/admin/playlists/[id]/songs`
- **Funcionalidade:** Adicionar música à playlist (admin)
- **Autenticação:** ADMIN

#### `DELETE /api/admin/playlists/[id]/songs`
- **Funcionalidade:** Remover música da playlist (admin)
- **Autenticação:** ADMIN

### **Sistema de Banners**

#### `GET /api/banners/active`
- **Funcionalidade:** Banners ativos para exibição
- **Parâmetros de query:**
  - `page` (string) - Página específica

#### `GET /api/admin/banners`
- **Funcionalidade:** Gestão de banners
- **Autenticação:** ADMIN

#### `POST /api/admin/banners`
- **Funcionalidade:** Criação de banner
- **Autenticação:** ADMIN
- **Corpo da requisição:**
```json
{
  "title": "string",
  "content": "string",
  "type": "BannerType",
  "showOnPages": ["string"],
  "startDate": "string",
  "endDate": "string"
}
```

#### `PUT /api/admin/banners/[id]`
- **Funcionalidade:** Atualização de banner
- **Autenticação:** ADMIN

#### `DELETE /api/admin/banners/[id]`
- **Funcionalidade:** Eliminação de banner
- **Autenticação:** ADMIN

### **Sistema de Logs**

#### `GET /api/logs`
- **Funcionalidade:** Lista de logs do sistema
- **Autenticação:** ADMIN
- **Parâmetros de query:**
  - `type` (string) - Filtro por tipo
  - `userId` (number) - Filtro por utilizador
  - `page` (number) - Página
  - `limit` (number) - Limite

#### `GET /api/logs/[id]`
- **Funcionalidade:** Detalhes de log específico
- **Autenticação:** ADMIN

#### `POST /api/logs/analytics`
- **Funcionalidade:** Registro de eventos de analytics
- **Corpo da requisição:**
```json
{
  "action": "string",
  "resource": "string",
  "metadata": "object"
}
```

#### `GET /api/logs/security-alerts`
- **Funcionalidade:** Alertas de segurança
- **Autenticação:** ADMIN

#### `PUT /api/logs/security-alerts/[id]/acknowledge`
- **Funcionalidade:** Reconhecer alerta de segurança
- **Autenticação:** ADMIN

#### `GET /api/logs/security-analysis`
- **Funcionalidade:** Análise comportamental de segurança
- **Autenticação:** ADMIN

### **Autenticação**

#### `POST /api/auth/register`
- **Funcionalidade:** Registo de novo utilizador
- **Corpo da requisição:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "turnstileToken": "string"
}
```

#### `POST /api/auth/resend-verification`
- **Funcionalidade:** Reenvio de email de verificação
- **Autenticação:** Obrigatória

#### `GET /api/auth/confirm-email`
- **Funcionalidade:** Confirmação de email via token
- **Parâmetros de query:**
  - `token` (string) - Token de verificação

### **Utilitários**

#### `POST /api/revalidate`
- **Funcionalidade:** Revalidação de cache ISR
- **Autenticação:** ADMIN
- **Corpo da requisição:**
```json
{
  "paths": ["string"]
}
```

#### `GET /api/logs/client-info`
- **Funcionalidade:** Informações do cliente para debugging
- **Resposta:**
```json
{
  "userAgent": "string",
  "ip": "string",
  "headers": "object"
}
```
  - Histórico de moderação

#### 🎵 **Gestão de Músicas** (`/admin/dashboard/musics`)
- **Componente:** `src/app/admin/dashboard/musics/page.tsx`
- **Funcionalidade:** Administração de músicas

#### 📋 **Gestão de Playlists** (`/admin/dashboard/playlists`)
- **Componente:** `src/app/admin/dashboard/playlists/page.tsx`
- **Funcionalidade:** Administração de playlists

#### 📢 **Gestão de Banners** (`/admin/dashboard/banners`)
- **Componente:** `src/app/admin/dashboard/banners/page.tsx`
- **Funcionalidade:** Gestão de banners informativos

### **Revisão de Conteúdo (REVIEWER)**

#### 🔍 **Lista de Submissões** (`/admin/review`)
- **Componente:** `src/app/admin/review/page.tsx`
- **Funcionalidade:** Listagem de submissões pendentes

#### ✅ **Revisar Submissão** (`/admin/review/[id]`)
- **Componente:** `src/app/admin/review/[id]/page.tsx`
- **Funcionalidade:** Revisão detalhada de submissão
- **Características:**
  - Preview do conteúdo
  - Aprovação ou rejeição
  - Comentários de revisão
  - Edição antes da aprovação

---

## 🚀 API Endpoints

### **Autenticação**

#### `POST /api/register`
- **Funcionalidade:** Criação de nova conta
- **Corpo da requisição:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "captchaToken": "string"
}
```
- **Resposta:** `201 Created` ou `400 Bad Request`

#### `POST /api/auth/[...nextauth]`
- **Funcionalidade:** NextAuth.js endpoints
- **Métodos:** Gerido automaticamente pelo NextAuth
- **Providers:** Credentials, Google OAuth

#### `PUT /api/profile/update`
- **Funcionalidade:** Actualização de perfil
- **Autenticação:** Obrigatória
- **Corpo da requisição:**
```json
{
  "name": "string",
  "bio": "string",
  "profileImage": "File"
}
```

### **Músicas**

#### `GET /api/musics/getmusics`
- **Funcionalidade:** Listagem de todas as músicas
- **Autenticação:** Não obrigatória
- **Resposta:** Array de músicas com versões

#### `GET /api/musics/[id]`
- **Funcionalidade:** Detalhes de uma música específica
- **Parâmetros:** `id` (string) - ID da música
- **Resposta:** Objecto música completo

#### `POST /api/musics/create`
- **Funcionalidade:** Submissão de nova música
- **Autenticação:** Obrigatória
- **Tipo:** `multipart/form-data`
- **Campos:**
```json
{
  "title": "string",
  "type": "ACORDES | PARTITURA",
  "instrument": "ORGAO | GUITARRA | PIANO | CORO | OUTRO",
  "moments": "string[]",
  "tags": "string",
  "markdown": "string",
  "pdf": "File",
  "audio": "File",
  "youtubeLink": "string",
  "spotifyLink": "string",
  "captchaToken": "string"
}
```

### **Favoritos e Estrelas**

#### `POST /api/songs/[id]/star`
- **Funcionalidade:** Adicionar/remover estrela
- **Autenticação:** Obrigatória
- **Resposta:** Estado actual da estrela

### **Playlists**

#### `GET /api/playlists`
- **Funcionalidade:** Listagem de playlists
- **Parâmetros de query:**
  - `userId` (optional) - ID do utilizador
  - `includePublic` (boolean) - Incluir playlists públicas
- **Resposta:** Array de playlists

#### `POST /api/playlists`
- **Funcionalidade:** Criação de playlist
- **Autenticação:** Obrigatória
- **Corpo da requisição:**
```json
{
  "name": "string",
  "description": "string",
  "isPublic": "boolean"
}
```

#### `GET /api/playlists/[id]`
- **Funcionalidade:** Detalhes de playlist específica
- **Autenticação:** Condicional (pública ou própria)

#### `PUT /api/playlists/[id]`
- **Funcionalidade:** Actualização de playlist
- **Autenticação:** Obrigatória (apenas proprietário)

#### `DELETE /api/playlists/[id]`
- **Funcionalidade:** Eliminação de playlist
- **Autenticação:** Obrigatória (apenas proprietário)

#### `GET /api/playlists/public`
- **Funcionalidade:** Listagem de playlists públicas
- **Autenticação:** Não obrigatória

#### `GET /api/user/playlists`
- **Funcionalidade:** Playlists do utilizador autenticado
- **Autenticação:** Obrigatória

### **Gestão de Itens de Playlist**

#### `POST /api/playlists/[id]/songs`
- **Funcionalidade:** Adicionar música à playlist
- **Autenticação:** Obrigatória
- **Corpo da requisição:**
```json
{
  "songId": "string"
}
```

#### `DELETE /api/playlists/[id]/songs/[songId]`
- **Funcionalidade:** Remover música da playlist
- **Autenticação:** Obrigatória

### **Administração (ADMIN apenas)**

#### `GET /api/admin/users`
- **Funcionalidade:** Gestão de utilizadores
- **Autenticação:** ADMIN

#### `PUT /api/admin/users/[id]/moderate`
- **Funcionalidade:** Moderar utilizador
- **Corpo da requisição:**
```json
{
  "status": "ACTIVE | WARNING | SUSPENDED | BANNED",
  "reason": "string",
  "expiresAt": "Date"
}
```

---

## 🔐 Autenticação e Autorização

### **NextAuth.js Configuration**
- **Provider:** `src/lib/auth.ts`
- **Estratégias:**
  - 📧 **Credentials** - Email/password com bcrypt
  - 🔗 **Google OAuth 2.0** - Integração social
- **Session:** JWT com dados de utilizador
- **Callbacks:** Injeção de role e moderação

### **Middleware de Proteção**
- **Arquivo:** `src/middleware.ts`
- **Funcionalidades:**
  - 🛡️ **Proteção de rotas** administrativas
  - ⚠️ **Verificação de moderação** 
  - 🔄 **Redirecionamento** para login
  - 📱 **Handling** de utilizadores banidos

### **Sistema de Roles**
```typescript
enum Role {
  USER = 'USER',           // Utilizador básico
  TRUSTED = 'TRUSTED',     // Utilizador confiável
  REVIEWER = 'REVIEWER',   // Revisor de conteúdo
  ADMIN = 'ADMIN'         // Administrador completo
}
```

### **Níveis de Acesso**
- **USER:** Criar submissões, gerir playlists, favoritar
- **TRUSTED:** Submissões com prioridade (futuro)
- **REVIEWER:** Aprovar/rejeitar submissões, editar durante revisão
- **ADMIN:** Acesso completo, gestão de utilizadores, configurações

### **Sistema de Moderação**
```typescript
enum ModerationStatus {
  ACTIVE = 'ACTIVE',         // Conta ativa
  WARNING = 'WARNING',       // Aviso emitido
  SUSPENDED = 'SUSPENDED',   // Suspensão temporária
  BANNED = 'BANNED'         // Banimento permanente
}
```

---

## ⚙️ Middleware

### **Middleware Principal** (`src/middleware.ts`)
```typescript
export async function middleware(request: NextRequest) {
  // 1. Verificar autenticação para rotas protegidas
  // 2. Validar role para rotas administrativas
  // 3. Verificar status de moderação
  // 4. Redirecionar utilizadores banidos
  // 5. Logging de acesso a rotas sensíveis
}
```

### **Rotas Protegidas**
- `/admin/*` - Apenas ADMIN e REVIEWER
- `/profile` - Utilizadores autenticados
- `/playlists/create` - Utilizadores ativos
- `/musics/create` - Utilizadores não banidos

### **Middleware de API**
- **Arquivo:** `src/lib/api-middleware.ts`
- **Funcionalidades:**
  - 🔒 **Verificação de sessão**
  - 🛡️ **Validação de roles**
  - 📝 **Logging de ações**
  - ⚡ **Rate limiting** (via Vercel)

---

## 🧩 Componentes Principais

### **Componentes de Interface (UI)**

#### **Componentes Base Shadcn/UI**
- **Button** - Botões com variantes
- **Input** - Campos de entrada
- **Select** - Dropdowns e seletores
- **Card** - Containers de conteúdo
- **Dialog** - Modais e popups
- **Tabs** - Navegação por abas
- **Badge** - Etiquetas e status
- **Skeleton** - Loading states
- **Spinner** - Indicadores de carregamento

### **Componentes Específicos da Aplicação**

#### **StarButton** (`src/components/StarButton.tsx`)
- **Funcionalidade:** Favoritar/desfavoritar músicas
- **Características:**
  - ⭐ **Estado persistente** na base de dados
  - 🔄 **Sincronização** em tempo real
  - 🎨 **Animações** de feedback
  - 🔒 **Proteção** para utilizadores não autenticados

#### **AddToPlaylistButton** (`src/components/AddToPlaylistButton.tsx`)
- **Funcionalidade:** Adicionar música a playlists
- **Características:**
  - 📋 **Modal** com lista de playlists
  - ➕ **Criação rápida** de nova playlist
  - ✅ **Feedback visual** de sucesso
  - 🔍 **Pesquisa** em playlists extensas

#### **ChordTransposer** (`src/components/ChordTransposer.tsx`)
- **Funcionalidade:** Transposição de acordes musicais
- **Características:**
  - 🎼 **Interface intuitiva** com botões +/-
  - 🔄 **Transposição** em tempo real
  - 💾 **Preservação** de formatação
  - 🎯 **Suporte** para diferentes notações

#### **ChordDisplay** (`src/components/ChordDisplay.tsx`)
- **Funcionalidade:** Renderização de acordes musicais
- **Características:**
  - 🎵 **Parser** markdown-it-chords
  - 🎨 **Styling** responsivo
  - 📱 **Otimização** para mobile
  - 🎼 **Suporte** para cifras complexas

#### **BannerDisplay** (`src/components/BannerDisplay.tsx`)
- **Funcionalidade:** Sistema de banners informativos
- **Características:**
  - 📢 **Exibição condicional** por página
  - 🎨 **Diferentes tipos** (info, warning, success, error)
  - ⏰ **Agendamento** temporal
  - ❌ **Dismissible** pelo utilizador

#### **MusicListSkeleton** (`src/components/MusicListSkeleton.tsx`)
- **Funcionalidade:** Loading states para listas de músicas
- **Características:**
  - 💀 **Skeleton loading** realista
  - 📱 **Design responsivo**
  - ⚡ **Melhoria de UX** durante carregamento

#### **UserHoverCard** (`src/components/UserHoverCard.tsx`)
- **Funcionalidade:** Preview de informações de utilizador
- **Características:**
  - 🖱️ **Ativação on hover**
  - 👤 **Informações resumidas**
  - 🏆 **Badges** de reconhecimento
  - 📊 **Estatísticas** de contribuição

#### **PlaylistInvitations** (`src/components/PlaylistInvitations.tsx`)
- **Funcionalidade:** Gestão de convites para playlists
- **Características:**
  - 📧 **Convites por email**
  - ⏰ **Gestão de expiração**
  - ✅ **Aceitação/rejeição**
  - 📋 **Lista de pendentes**

#### **ProfileImageUploader** (`src/components/ProfileImageUploader.tsx`)
- **Funcionalidade:** Upload de imagem de perfil
- **Características:**
  - 📷 **Upload drag-and-drop**
  - 🖼️ **Preview** em tempo real
  - 📐 **Redimensionamento** automático
  - 🗜️ **Compressão** inteligente

#### **TurnstileCaptcha** (`src/components/TurnstileCaptcha.tsx`)
- **Funcionalidade:** Integração Cloudflare Turnstile
- **Características:**
  - 🤖 **Verificação** anti-bot
  - 🎨 **Tema** customizável
  - ⚡ **Carregamento** assíncrono
  - 🔒 **Validação** server-side

#### **EmailVerificationBanner** (`src/components/EmailVerificationBanner.tsx`)
- **Funcionalidade:** Aviso de verificação de email
- **Características:**
  - ✉️ **Status** de verificação
  - 🔄 **Reenvio** de email
  - ❌ **Dismissible** temporário
  - 📧 **Integração** com sistema de emails

### **Componentes de Formulários**

#### **LoginForm** (`src/components/forms/LoginForm.tsx`)
- **Características:**
  - 📧 **Validação** client-side
  - 🔒 **Integração** NextAuth
  - 🎨 **Feedback** visual de erros
  - 🔄 **Estados** de carregamento

#### **RegisterForm** (`src/components/forms/RegisterForm.tsx`)
- **Características:**
  - ✅ **Validação** em tempo real
  - 🔐 **Força** de password
  - 🤖 **Captcha** integrado
  - 📧 **Verificação** de email único

### **Providers**

#### **SessionProvider** (`src/components/providers/SessionProvider.tsx`)
- **Funcionalidade:** Contexto de sessão NextAuth

#### **Providers** (`src/components/providers/Providers.tsx`)
- **Funcionalidade:** Agregador de providers
- **Inclui:**
  - NextAuth SessionProvider
  - Toast notifications
  - Theme provider (futuro)

### **Hooks Personalizados**

#### **useInfiniteScroll** (`src/hooks/useInfiniteScroll.ts`)
- **Funcionalidade:** Scroll infinito para listas
- **Características:**
  - 📜 **Carregamento** progressivo
  - 🔄 **Gestão** de estados
  - ⚡ **Optimização** de performance
  - 🎯 **Intersection Observer**

#### **useLogger** (`src/hooks/useLogger.ts`)
- **Funcionalidade:** Sistema de logging client-side
- **Características:**
  - 📝 **Logging** estruturado
  - 🎯 **Contexto** automático
  - 📊 **Analytics** integrados
  - 🔄 **Batch** de envios

#### **useOptimization** (`src/hooks/useOptimization.ts`)
- **Funcionalidade:** Otimizações de performance
- **Características:**
  - 🚀 **Debouncing** de pesquisas
  - 💾 **Caching** inteligente
  - 🎯 **Stable data** patterns
  - 🪟 **Window focus** detection

---

## 📚 Serviços e Bibliotecas

### **Processamento de Acordes**
- **Biblioteca:** `src/lib/chord-processor.ts`
- **Funcionalidades:**
  - 🎼 **Parser** de acordes inline e separados
  - 🔄 **Transposição** automática por semitons
  - 🎨 **Formatação HTML** responsiva
  - 📚 **Suporte** para múltiplas notações
  - 🎯 **Detecção** de formato automática

### **Sistema de Logs Avançado**
- **Biblioteca:** `src/lib/enhanced-logging.ts`
- **Tipos:** INFO, WARN, ERROR, SUCCESS, SECURITY
- **Características:**
  - 📝 **Persistência** na base de dados
  - 🔍 **Contexto** automático (IP, User-Agent)
  - 📊 **Metadata** estruturada
  - 🚨 **Alertas** em tempo real
  - 📧 **Notificações** críticas

### **Geração de Slugs**
- **Biblioteca:** `src/lib/slugs.ts`
- **Funcionalidades:**
  - 🌐 **URLs amigáveis** SEO-optimized
  - 🔤 **Remoção** de acentos e caracteres especiais
  - 🎯 **Garantia** de unicidade automática
  - 🔄 **Collision handling** inteligente

### **Sistema de Email**
- **Provider:** Resend
- **Biblioteca:** `src/lib/email.ts`
- **Templates:**
  - ✉️ **Verificação** de email
  - 📧 **Notificações** de aprovação/rejeição
  - ⚠️ **Alertas** de moderação
  - 🔒 **Alertas** de segurança
- **Características:**
  - 🎨 **HTML responsivo**
  - 📱 **Mobile-friendly**
  - 🎯 **Personalizados** por tipo

### **Storage de Ficheiros**
- **Provider:** Supabase Storage
- **Organização:**
  - `pdfs/` - Partituras em PDF
  - `images/` - Imagens de perfil e banners
  - `audio/` - Ficheiros de áudio
- **Características:**
  - 🔒 **Políticas RLS** de segurança
  - 🌐 **CDN** global automático
  - 📐 **Transformação** de imagens
  - 🗜️ **Compressão** automática

### **Structured Data & SEO**
- **Biblioteca:** `src/lib/structured-data.ts`
- **Formatos:** JSON-LD para Google
- **Tipos:**
  - 🌐 **Website** - Informações da plataforma
  - 🏢 **Organization** - Dados da entidade
  - 🎵 **MusicComposition** - Metadados de músicas
- **Benefícios:**
  - 🔍 **Rich snippets** no Google
  - 📊 **Knowledge Graph** integration
  - 🎯 **SEO** melhorado

### **Sistema de Segurança**
- **Biblioteca:** `src/lib/security-analysis-engine.ts`
- **Funcionalidades:**
  - 🤖 **Detecção** de padrões suspeitos
  - 🚨 **Alertas** automáticos
  - 📊 **Análise comportamental**
  - 🛡️ **Rate limiting** inteligente
  - 🎯 **Anomaly detection**

### **Monitorização em Tempo Real**
- **Biblioteca:** `src/lib/realtime-alerts.ts`
- **Características:**
  - ⚡ **Alertas** instantâneos
  - 📧 **Notificações** por email
  - 🔔 **Dashboard** de alertas
  - 🎯 **Filtering** por severidade

---

## ⚙️ Configurações

### **Next.js Configuration** (`next.config.ts`)
```typescript
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'truenas-scale.fold-pence.ts.net' },
      { hostname: '*.googleusercontent.com' },
      { hostname: '*.supabase.co' }
    ]
  },
  env: {
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs']
  }
};
```

### **TypeScript Configuration** (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### **Tailwind CSS** (`tailwind.config.ts`)
- **Framework:** Tailwind CSS 4.0
- **Plugins:** 
  - @tailwindcss/postcss
  - Custom animations
- **Tema personalizado:**
  - Cores da marca
  - Espaçamentos específicos
  - Componentes customizados

### **Supabase Configuration**
- **Client:** `src/lib/supabase-client.ts` - Cliente público
- **Admin:** `src/lib/supabase-admin.ts` - Cliente administrativo
- **Adapter:** `src/lib/supabase-adapter.ts` - NextAuth integration

### **Variáveis de Ambiente**
```env
# Base de dados
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Autenticação
NEXTAUTH_SECRET="random-secret-key"
NEXTAUTH_URL="https://cantolico.vercel.app"

# OAuth Providers
GOOGLE_CLIENT_ID="123456789-xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"

# Segurança
TURNSTILE_SECRET_KEY="0x4AAA..."
NEXT_PUBLIC_TURNSTILE_SITE_KEY="0x4BBB..."

# Email
RESEND_API_KEY="re_xxxxx"

# Analytics (opcional)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID="xxxxx"
```

---

## 🚀 Deploy e Ambiente

### **Plataforma de Deploy**
- **Vercel** - Platform principal
- **Domain:** cantolico.vercel.app
- **Branches:**
  - `main` - Produção
  - `dev` - Desenvolvimento
  - `staging` - Testes (futuro)

### **Configurações de Build**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "nodeVersion": "18.x"
}
```

### **Variáveis de Ambiente de Produção**
- **Supabase:** Instância de produção
- **Resend:** Domínio verificado
- **Turnstile:** Keys de produção
- **OAuth:** Callbacks configurados

### **Base de Dados**
- **Provider:** Supabase PostgreSQL 15+
- **Tier:** Pro (para produção)
- **Backup:** Automático diário
- **Replicação:** Multi-região
- **Escalabilidade:** Automática

### **Storage & CDN**
- **Supabase Storage** - Ficheiros estáticos
- **Vercel Edge Network** - Distribuição global
- **Cache:** 
  - Static assets: 1 ano
  - API responses: 1 hora
  - ISR pages: 24 horas

### **Monitorização**
- **Vercel Analytics** - Performance web
- **Supabase Dashboard** - Base de dados
- **Sistema de logs** interno
- **Alertas** por email automáticos

### **Performance Optimizations**
- **SSG/SSR/ISR** - Renderização otimizada
- **Image optimization** - Next.js Image
- **Code splitting** - Automático
- **Bundle analysis** - Via Vercel
- **Lazy loading** - Componentes e rotas

### **Segurança de Produção**
- **HTTPS** obrigatório (Vercel)
- **HSTS** headers configurados
- **CSP** headers básicos
- **Rate limiting** via Vercel
- **Input validation** em todos os endpoints
- **SQL injection** protection via RLS
- **XSS protection** via sanitização

---

## 🚀 Funcionalidades Avançadas

### **Campo Autor (Nova Funcionalidade)**
- **Implementação:** Outubro 2025
- **Localização:** Opcional em todas as músicas
- **Características:**
  - 📝 **Campo opcional** em criação/edição
  - 👁️ **Exibição condicional** nas informações
  - ✏️ **Editável** por reviewers e admins
  - 🔍 **Searchável** no sistema de pesquisa
  - 📊 **Incluído** em exports e APIs

### **Sistema de Busca Avançada**
- **Full-text search** PostgreSQL
- **Filtros múltiplos** simultâneos
- **Pesquisa semântica** (futuro)
- **Autocomplete** inteligente
- **Histórico** de pesquisas

### **Analytics e Métricas**
- **Visualizações** de músicas
- **Downloads** de PDFs
- **Utilização** de playlists
- **Crescimento** da comunidade
- **Engagement** por conteúdo

### **Sistema de Notificações**
- **Email** para eventos importantes
- **In-app** para ações rápidas (futuro)
- **Push notifications** via PWA (futuro)
- **Digest** semanal para admins

### **Progressive Web App (PWA)**
- **Manifest** configurado
- **Service Worker** básico
- **Offline** capabilities (futuro)
- **Install prompt** (futuro)

### **Integrações Futuras**
- **Spotify API** - Sync de playlists
- **YouTube API** - Embed de vídeos
- **PDF generation** - Songbooks automáticos
- **QR codes** - Partilha rápida
- **Print optimization** - Partituras

---

## 📊 Estatísticas do Projeto

### **Métricas de Código**
- **Linhas de Código:** ~25,000+
- **Componentes React:** 75+
- **API Endpoints:** 40+
- **Páginas:** 30+
- **Tabelas na BD:** 20+
- **Dependências:** 60+

### **Estrutura de Ficheiros**
- **TypeScript:** 95% do código
- **Componentes:** 100% funcionais
- **Hooks:** 15+ personalizados
- **Testes:** Em desenvolvimento
- **Documentação:** Completa

### **Performance Targets**
- **First Contentful Paint:** < 1.5s
- **Largest Contentful Paint:** < 2.5s
- **Time to Interactive:** < 3s
- **Cumulative Layout Shift:** < 0.1
- **Core Web Vitals:** 95%+ aprovação

---

## 🔄 Fluxos Principais

### **Fluxo de Submissão de Música**
1. 👤 **Utilizador** acede a `/musics/create`
2. 📝 **Preenche** formulário multi-step com campo autor opcional
3. 📤 **Upload** de ficheiros para Supabase Storage
4. ✅ **Validação** client e server-side
5. 💾 **Submissão** criada com status PENDING
6. 📧 **Notificação** automática para reviewers
7. 👨‍⚖️ **Revisor** analisa em `/admin/review/[id]`
8. ✏️ **Edição** de campos incluindo autor
9. ✅ **Aprovação** cria Song e SongVersion
10. 📧 **Notificação** de aprovação ao submissor
11. 🌐 **Música** fica disponível publicamente

### **Fluxo de Moderação de Utilizador**
1. 👨‍💼 **Admin** acede a `/admin/dashboard/users`
2. 🔍 **Identifica** utilizador problemático
3. 📋 **Seleciona** tipo de moderação
4. ⏰ **Define** duração (se aplicável)
5. 📝 **Adiciona** motivo detalhado
6. 💾 **Sistema** aplica restrições via middleware
7. 📧 **Notificação** automática ao utilizador
8. 🚫 **Redirecionamento** para `/banned` se necessário
9. 📊 **Registo** em logs de auditoria

### **Fluxo de Autenticação**
1. 👤 **Utilizador** acede a `/login`
2. 🔐 **Escolhe** método (email/password ou Google)
3. ✅ **NextAuth** processa autenticação
4. 🛡️ **Middleware** verifica moderação
5. 🎫 **Sessão JWT** criada com role
6. 🔄 **Redirecionamento** para página solicitada
7. 📊 **Log** de acesso registado

### **Fluxo de Criação de Playlist**
1. 👤 **Utilizador** acede a `/playlists/create`
2. 📝 **Preenche** nome e descrição
3. 🌐 **Define** visibilidade (pública/privada)
4. 💾 **Playlist** criada na base de dados
5. 🔄 **Redirecionamento** para `/playlists/[id]`
6. 🎵 **Adição** de músicas via modal
7. 📤 **Convites** para colaboradores (futuro)

### **Fluxo de Pesquisa**
1. 👤 **Utilizador** digita termo em `/musics`
2. 🔍 **Debounce** de 300ms para otimização
3. 📡 **API call** para `/api/musics/search`
4. 🗄️ **Full-text search** na base de dados
5. 📊 **Aplicação** de filtros ativos
6. 📜 **Scroll infinito** carrega mais resultados
7. ⭐ **Estado** de favoritos sincronizado

---

## 🔮 Roadmap Futuro

### **Q1 2026**
- 🎵 **Sistema de versioning** completo para músicas
- 📱 **Progressive Web App** com offline support
- 🔍 **Pesquisa semântica** com AI
- 👥 **Colaboração** em tempo real em playlists

### **Q2 2026**
- 🎼 **Editor WYSIWYG** para partituras
- 🎵 **Integração Spotify** completa
- 📊 **Dashboard analytics** avançado
- 🔔 **Sistema de notificações** push

### **Q3 2026**
- 🤖 **Recomendações** baseadas em AI
- 📱 **App móvel** nativo
- 🌍 **Internacionalização** (EN, ES, FR)
- 🎯 **Gamification** com badges

### **Q4 2026**
- 🎪 **Eventos** e concertos integrados
- 💰 **Sistema de doações** para artistas
- 📚 **Songbooks** automáticos
- 🎼 **Transcrição** áudio para cifra

---

*Documentação atualizada em **Outubro 2025** para o Cantólico v2.0*
*Maintido por: **Equipa de Desenvolvimento Cantólico***

---

**🎵 Construído com ❤️ para a comunidade católica lusófona 🙏**

#### `GET /api/banners/active`
- **Funcionalidade:** Banners activos para uma página
- **Parâmetros de query:**
  - `page` - Página específica ou "ALL"

### **Utilitários**

#### `POST /api/revalidate`
- **Funcionalidade:** Revalidação de cache Next.js
- **Autenticação:** ADMIN

---

## 🔐 Autenticação e Autorização

### **Sistema de Autenticação**
- **NextAuth.js** com múltiplos providers
- **JWT tokens** para sessões
- **Supabase** para persistência de dados

### **Providers Configurados**
1. **Credentials Provider**
   - Email + password
   - Hash bcrypt
   - Validação de moderação
2. **Google OAuth**
   - Login social
   - Criação automática de conta
   - Verificação de email automática

### **Hierarquia de Roles**
```typescript
enum Role {
  USER      // Utilizador normal
  TRUSTED   // Utilizador confiável - submissões fast-track
  REVIEWER  // Revisor - pode aprovar/rejeitar submissões
  ADMIN     // Administrador - acesso total
}
```

### **Sistema de Moderação**
```typescript
enum ModerationStatus {
  ACTIVE    // Conta activa
  WARNING   // Aviso - sem restrições
  SUSPENDED // Suspensão temporária
  BANNED    // Banimento permanente
}
```

### **Controlo de Acesso**
- **Middleware** verifica autenticação e roles
- **Verificação de moderação** em tempo real
- **Redirecionamentos automáticos** para utilizadores não autorizados

---

## 🛡 Middleware

### **Funcionalidades do Middleware**
1. **Verificação de Autenticação**
   - Valida tokens JWT
   - Redireciona utilizadores não autenticados

2. **Controlo de Moderação**
   - Verifica status de banimento/suspensão
   - Redireciona utilizadores moderados
   - Reactivação automática de suspensões expiradas

3. **Autorização por Role**
   - Rotas de ADMIN protegidas
   - Rotas de REVIEWER protegidas
   - Separação clara de permissões

### **Rotas Protegidas**
```typescript
const config = {
  matcher: [
    "/musics/create",           // USER+
    "/admin/dashboard/:path*",  // ADMIN apenas
    "/admin/review/:path*",     // REVIEWER+ 
    "/playlists/:path*",        // USER+
    "/users/:path*",            // USER+
    "/profile/:path*",          // USER+
  ],
};
```

---

## 🧩 Componentes Principais

### **UI Components (Shadcn/UI)**
- **Button** - Botões com variantes
- **Card** - Cartões de conteúdo
- **Input** - Campos de entrada
- **Select** - Selects customizados
- **Badge** - Etiquetas
- **Dialog** - Modais
- **Dropdown Menu** - Menus contextuais
- **Tabs** - Navegação por abas

### **Componentes Específicos**

#### **StarButton** (`src/components/StarButton.tsx`)
- Botão para favoritar músicas
- Estado persistente na base de dados
- Animações de feedback

#### **AddToPlaylistButton** (`src/components/AddToPlaylistButton.tsx`)
- Adicionar música a playlists
- Modal com lista de playlists
- Criação rápida de playlist

#### **ChordTransposer** (`src/components/ChordTransposer.tsx`)
- Transposição de acordes musicais
- Interface intuitiva
- Preservação de formatação

#### **BannerDisplay** (`src/components/BannerDisplay.tsx`)
- Sistema de banners informativos
- Filtragem por página
- Diferentes tipos de alerta

#### **MusicListSkeleton** (`src/components/MusicListSkeleton.tsx`)
- Loading states para listas
- Melhora UX durante carregamento

#### **UserHoverCard** (`src/components/UserHoverCard.tsx`)
- Cartão de informações de utilizador
- Aparece on hover
- Informações resumidas

### **Formulários**

#### **LoginForm** (`src/components/forms/LoginForm.tsx`)
- Formulário de login
- Validação client-side
- Integração NextAuth

#### **RegisterForm** (`src/components/forms/RegisterForm.tsx`)
- Formulário de registo
- Validação de email
- Captcha integrado

---

## 📚 Serviços e Bibliotecas

### **Processamento de Acordes**
- **Biblioteca:** `src/lib/chord-processor.ts`
- **Funcionalidades:**
  - Parser de acordes inline e em linhas separadas
  - Transposição automática
  - Formatação HTML
  - Suporte para diferentes notações

### **Gestão de Logs**
- **Biblioteca:** `src/lib/logs.ts`
- **Tipos:** INFO, WARN, ERROR, SUCCESS
- **Persistência:** Base de dados Supabase
- **Contexto:** Metadados estruturados

### **Geração de Slugs**
- **Biblioteca:** `src/lib/slugs.ts`
- **Funcionalidades:**
  - URLs amigáveis
  - Remoção de acentos
  - Garantia de unicidade

### **Email Service**
- **Provider:** Resend
- **Templates:** HTML responsivos
- **Tipos:** Verificação, notificações, moderação

### **Storage de Ficheiros**
- **Provider:** Supabase Storage
- **Tipos:** PDFs, imagens, áudio
- **Organização:** Buckets por tipo
- **Segurança:** Políticas RLS

### **Structured Data**
- **Biblioteca:** `src/lib/structured-data.ts`
- **Formatos:** JSON-LD
- **Tipos:** Website, Organization, MusicComposition
- **SEO:** Optimização para motores de busca

---

## ⚙️ Configurações

### **Next.js Config** (`next.config.ts`)
```typescript
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'truenas-scale.fold-pence.ts.net' },
      { hostname: '*.googleusercontent.com' }
    ]
  },
  env: {
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  }
};
```

### **Tailwind CSS** (`tailwind.config.ts`)
- **Framework:** Tailwind CSS 4
- **Plugins:** @tailwindcss/postcss
- **Customização:** Cores e espaçamentos personalizados

### **TypeScript** (`tsconfig.json`)
- **Target:** ES2022
- **Module:** ESNext
- **Strict mode:** Activado
- **Path mapping:** Aliases para imports

### **Supabase** (`src/lib/supabase-client.ts`)
- **Provider:** PostgreSQL
- **Client:** Supabase.js
- **Real-time:** Subscriptions automáticas

### **Variáveis de Ambiente**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# NextAuth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://cantolico.vercel.app"

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Supabase
SUPABASE_URL="..."
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Turnstile (Cloudflare)
TURNSTILE_SECRET_KEY="..."
NEXT_PUBLIC_TURNSTILE_SITE_KEY="..."

# Resend
RESEND_API_KEY="..."
```

---

## 🚀 Deploy e Ambiente

### **Plataforma de Deploy**
- **Vercel** - Hosting principal
- **Domain:** cantolico.vercel.app
- **Branch:** `main` para produção, `dev` para desenvolvimento

### **Base de Dados**
- **Provider:** Supabase PostgreSQL
- **Backup:** Automático diário
- **Escalabilidade:** Gerida pelo provider

### **Storage**
- **Supabase Storage** para ficheiros
- **CDN:** Distribuição global automática
- **Organização:**
  - `pdfs/` - Partituras em PDF
  - `images/` - Imagens de perfil
  - `audio/` - Ficheiros de áudio

### **Monitorização**
- **Vercel Analytics** - Métricas de performance
- **Logs estruturados** - Auditoria de acções
- **Error tracking** - Logs de erros na base de dados

### **Performance**
- **SSG/SSR** - Renderização optimizada
- **Image optimization** - Next.js Image
- **Code splitting** - Automático do Next.js
- **Caching** - CDN e revalidation

### **Segurança**
- **HTTPS** obrigatório
- **Captcha** em formulários sensíveis
- **Rate limiting** implícito do Vercel
- **Input validation** em todos os endpoints
- **SQL injection protection** via Supabase RLS
- **XSS protection** via sanitização

---

## 📊 Estatísticas do Projeto

- **Linhas de Código:** ~15,000+
- **Componentes React:** 50+
- **API Endpoints:** 25+
- **Páginas:** 20+
- **Tabelas na BD:** 15+
- **Dependências:** 40+

---

## 🔄 Fluxos Principais

### **Fluxo de Submissão de Música**
1. Utilizador acede a `/musics/create`
2. Preenche formulário multi-step
3. Upload de ficheiros para Supabase
4. Submissão criada com status PENDING
5. Revisor analisa em `/admin/review`
6. Aprovação cria Song e SongVersion
7. Música fica disponível publicamente

### **Fluxo de Moderação**
1. Admin acede a `/admin/dashboard/users`
2. Selecciona utilizador para moderar
3. Define tipo e duração da moderação
4. Sistema aplica restrições via middleware
5. Utilizador é redirecionado se tentar aceder

### **Fluxo de Autenticação**
1. Utilizador acede a `/login`
2. Escolhe método (email/password ou Google)
3. NextAuth processa autenticação
4. Middleware verifica moderação
5. Sessão JWT criada
6. Redirecionamento para página solicitada

---

*Documentação gerada em Dezembro 2024 para o projecto Cantólico v1.0*
