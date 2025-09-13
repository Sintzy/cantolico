# 📖 Cantólico - Documentação Técnica Completa

> **Plataforma digital para organização e partilha de cânticos católicos em língua portuguesa**

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

---

## 🛠 Tech Stack

### **Frontend**
- **Next.js 15.4.2** - Framework React com App Router e Turbopack
- **React 19.1.0** - Biblioteca de interface
- **TypeScript 5** - Tipagem estática
- **Tailwind CSS 4** - Framework CSS utilitário
- **Radix UI** - Componentes primitivos acessíveis
- **Shadcn/UI** - Sistema de componentes baseado em Radix
- **Lucide React** - Ícones SVG
- **Framer Motion** - Animações

### **Backend**
- **Next.js API Routes** - Endpoints REST serverless
- **NextAuth.js 4.24.11** - Autenticação
- **Supabase.js 2.39.0** - Client de base de dados PostgreSQL
- **PostgreSQL** - Base de dados relacional (via Supabase)

### **Serviços Externos**
- **Supabase** - Storage de ficheiros (PDFs, imagens, áudio)
- **Google OAuth** - Autenticação social
- **Turnstile (Cloudflare)** - Captcha
- **Resend** - Envio de emails
- **Vercel** - Deploy e hosting

### **Processamento de Conteúdo**
- **Markdown-it** - Parser de Markdown
- **markdown-it-chords** - Plugin para acordes musicais
- **PDF-lib** - Manipulação de PDFs
- **React SimpleMDE** - Editor Markdown
- **Remove Accents** - Normalização de texto

---

## 🏗 Arquitetura do Sistema

### **Estrutura de Diretórios**

```
src/
├── app/                          # App Router (Next.js 13+)
│   ├── (api)/api/               # API Routes
│   ├── (authprofile)/           # Rotas autenticadas
│   ├── (docs)/                  # Documentação
│   ├── admin/                   # Painel administrativo
│   ├── musics/                  # Gestão de músicas
│   ├── playlists/               # Gestão de playlists
│   ├── page.tsx                 # Landing page
│   ├── layout.tsx               # Layout principal
│   ├── globals.css              # Estilos globais
│   └── middleware.ts            # Middleware de autenticação
├── components/                   # Componentes React
│   ├── ui/                      # Componentes Shadcn/UI
│   └── *.tsx                    # Componentes específicos
├── lib/                         # Bibliotecas e utilitários
├── types/                       # Definições TypeScript
└── supabase/                    # Configuração Supabase
```

### **Padrão de Arquitetura**
- **Monolito modular** com separação clara de responsabilidades
- **API-first** com endpoints REST bem definidos
- **Server-side rendering** com componentes do servidor
- **Client-side interactivity** com componentes do cliente
- **Type safety** em toda a aplicação

---

## 🗄 Base de Dados

### **Schema Supabase**

#### **Utilizadores e Autenticação**
```sql
-- Tabela User
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
  'PAI_NOSSO', 'REFLEXAO', 'TERCO_MISTERIO'
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
- **Funcionalidade:** Visualização completa de um cântico
- **Características:**
  - Renderização de acordes e letras
  - Transposição de acordes
  - Links para Spotify/YouTube
  - Download de PDF
  - Informações sobre submissão

#### 👤 **Perfil Público** (`/users/[id]`)
- **Componente:** `src/app/(authprofile)/users/[id]/page.tsx`
- **Funcionalidade:** Perfil público de utilizador
- **Características:**
  - Informações do utilizador
  - Playlists públicas
  - Músicas submetidas (se aprovadas)

### **Documentação**

#### 📚 **Guia de Utilização** (`/guide`)
- **Componente:** `src/app/(docs)/guide/page.tsx`
- **Funcionalidade:** Manual de utilização da plataforma

#### 📜 **Termos de Serviço** (`/terms`)
- **Componente:** `src/app/(docs)/terms/page.tsx`

#### 🔒 **Política de Privacidade** (`/privacy-policy`)
- **Componente:** `src/app/(docs)/privacy-policy/page.tsx`

### **Autenticação**

#### 🔐 **Login** (`/login`)
- **Componente:** `src/app/(authprofile)/login/page.tsx`
- **Funcionalidade:** Autenticação de utilizadores
- **Características:**
  - Login com email/password
  - Login com Google OAuth
  - Formulário com validação
  - Redirecionamento após login

#### 📝 **Registo** (`/register`)
- **Componente:** `src/app/(authprofile)/register/page.tsx`
- **Funcionalidade:** Criação de conta
- **Características:**
  - Formulário de registo
  - Validação de email
  - Hash de passwords
  - Captcha Turnstile

#### 👤 **Perfil** (`/profile`)
- **Componente:** `src/app/(authprofile)/profile/page.tsx`
- **Funcionalidade:** Gestão do perfil pessoal

### **Playlists (Autenticadas)**

#### 📋 **Minhas Playlists** (`/playlists`)
- **Componente:** `src/app/playlists/page.tsx`
- **Funcionalidade:** Gestão de playlists pessoais
- **Características:**
  - Criação de playlists
  - Listagem de playlists próprias
  - Edição e eliminação
  - Partilha pública/privada

#### ➕ **Criar Playlist** (`/playlists/create`)
- **Componente:** `src/app/playlists/create/page.tsx`
- **Funcionalidade:** Criação de nova playlist

#### 📋 **Ver Playlist** (`/playlists/[id]`)
- **Componente:** `src/app/playlists/[id]/page.tsx`
- **Funcionalidade:** Visualização de playlist específica

#### 🌐 **Explorar Playlists** (`/playlists/explore`)
- **Componente:** `src/app/playlists/explore/page.tsx`
- **Funcionalidade:** Descoberta de playlists públicas

### **Submissão de Conteúdo**

#### 🎵 **Submeter Música** (`/musics/create`)
- **Componente:** `src/app/musics/create/page.tsx`
- **Funcionalidade:** Submissão de novos cânticos
- **Características:**
  - Formulário multi-step (4 passos)
  - Upload de PDF ou edição Markdown
  - Preview em tempo real
  - Captcha de segurança
  - Upload de ficheiros de áudio

### **Administração (ADMIN)**

#### 📊 **Dashboard** (`/admin/dashboard`)
- **Componente:** `src/app/admin/dashboard/page.tsx`
- **Funcionalidade:** Painel de controlo administrativo
- **Características:**
  - Estatísticas do sistema
  - Gestão de utilizadores
  - Gestão de conteúdo
  - Logs de sistema

#### 👥 **Gestão de Utilizadores** (`/admin/dashboard/users`)
- **Componente:** `src/app/admin/dashboard/users/page.tsx`
- **Funcionalidade:** Administração de utilizadores
- **Características:**
  - Listagem de utilizadores
  - Moderação (avisos, suspensões, banimentos)
  - Alteração de roles
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

#### `GET /api/admin/submissions`
- **Funcionalidade:** Listagem de submissões
- **Autenticação:** REVIEWER ou ADMIN

#### `PUT /api/admin/submission/[id]`
- **Funcionalidade:** Revisar submissão
- **Corpo da requisição:**
```json
{
  "status": "APPROVED | REJECTED",
  "rejectionReason": "string"
}
```

#### `GET /api/admin/playlists`
- **Funcionalidade:** Gestão de playlists (admin)

#### `POST /api/admin/music`
- **Funcionalidade:** Criar música directamente (bypass submissão)

### **Banners**

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
