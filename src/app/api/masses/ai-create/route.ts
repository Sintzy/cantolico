import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { adminSupabase as supabase } from "@/lib/supabase-admin";
import { withUserProtection } from "@/lib/enhanced-api-protection";
import { createChatCompletion, extractJsonObject, AIClientError } from "@/lib/ai/client";
import { canCreateMass, getUserPremiumState, premiumRequiredResponse } from "@/lib/premium";
import { LITURGICAL_MOMENTS } from "@/types/mass";
import type { LiturgicalMoment, LiturgicalColor, MassVisibility } from "@/types/mass";

const AI_MASS_FEATURE = "mass_create";
const FREE_WINDOW_DAYS = 7;
const PREMIUM_WINDOW_DAYS = 1;

const requestSchema = z.object({
  prompt: z.string().trim().min(8).max(600),
  date: z.string().trim().optional().nullable(),
  time: z.string().trim().optional().nullable(),
  parish: z.string().trim().max(120).optional().nullable(),
  celebrant: z.string().trim().max(120).optional().nullable(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "NOT_LISTED"]).default("PRIVATE"),
});

const aiSelectionSchema = z.object({
  moment: z.enum(LITURGICAL_MOMENTS),
  songId: z.string().trim().min(8).max(80),
  note: z.string().trim().max(180).optional().nullable(),
});

const aiResponseSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  celebration: z.string().trim().max(120).optional().nullable(),
  liturgicalColor: z.enum(["VERDE", "ROXO", "BRANCO", "VERMELHO", "ROSA"]).optional().nullable(),
  selections: z.array(aiSelectionSchema).min(3).max(9),
});

type CandidateSong = {
  id: string;
  title: string;
  slug: string;
  author: string | null;
  moments: string[];
  tags: string[];
  mainInstrument: string;
  type: string;
};

function getWindowStart(isPremium: boolean) {
  const days = isPremium ? PREMIUM_WINDOW_DAYS : FREE_WINDOW_DAYS;
  const start = new Date();
  start.setDate(start.getDate() - days);
  return start.toISOString();
}

function getQuotaLabel(isPremium: boolean) {
  return isPremium ? "1 missa com IA por dia" : "1 missa com IA por semana";
}

async function getAIQuota(userId: number) {
  const premiumState = await getUserPremiumState(userId);
  const isPremium = premiumState.isPremium;
  const limit = 1;
  const windowDays = isPremium ? PREMIUM_WINDOW_DAYS : FREE_WINDOW_DAYS;
  const since = getWindowStart(isPremium);

  const { count, error } = await supabase
    .from("AiUsage")
    .select("id", { count: "exact", head: true })
    .eq("userId", userId)
    .eq("feature", AI_MASS_FEATURE)
    .gte("createdAt", since);

  if (error) {
    console.error("[AI MASS] Failed to read usage quota:", error);
    throw new Error("Não foi possível verificar a quota de IA.");
  }

  return {
    isPremium,
    limit,
    used: count || 0,
    remaining: Math.max(0, limit - (count || 0)),
    windowDays,
    since,
    label: getQuotaLabel(isPremium),
  };
}

function formatCandidate(song: CandidateSong) {
  const meta = [
    song.author ? `autor: ${song.author}` : null,
    song.mainInstrument ? `instrumento: ${song.mainInstrument}` : null,
    song.type ? `tipo: ${song.type}` : null,
    song.moments?.length ? `momentos: ${song.moments.join(", ")}` : null,
    song.tags?.length ? `tags: ${song.tags.slice(0, 8).join(", ")}` : null,
  ].filter(Boolean);

  return `- ${song.id} | ${song.title}${meta.length ? ` (${meta.join("; ")})` : ""}`;
}

async function getCandidateSongs() {
  const { data, error } = await supabase
    .from("Song")
    .select("id, title, slug, author, moments, tags, mainInstrument, type")
    .not("currentVersionId", "is", null)
    .order("createdAt", { ascending: false })
    .limit(120);

  if (error) {
    console.error("[AI MASS] Failed to fetch candidate songs:", error);
    throw new Error("Não foi possível carregar cânticos para a IA.");
  }

  return (data || []) as CandidateSong[];
}

function buildPrompt(userPrompt: string, songs: CandidateSong[]) {
  return [
    {
      role: "system" as const,
      content:
        "És um assistente pastoral para preparar repertórios de missa católica em português. " +
        "Só podes escolher cânticos da lista fornecida e tens de devolver apenas JSON válido, sem Markdown.",
    },
    {
      role: "user" as const,
      content: `Pedido da pessoa: "${userPrompt}"

Momentos válidos:
${LITURGICAL_MOMENTS.join(", ")}

Cânticos disponíveis:
${songs.map(formatCandidate).join("\n")}

Cria uma missa/repertório coerente com 5 a 7 cânticos, respeitando a lista de IDs.
Escolhe cânticos adequados ao pedido. Se o pedido for vago, assume uma missa simples de comunidade.
Usa notas curtas só quando ajudam o músico.

Formato obrigatório:
{
  "name": "nome curto da missa",
  "description": "descrição curta do critério usado",
  "celebration": "celebração ou contexto, se inferível",
  "liturgicalColor": "VERDE|ROXO|BRANCO|VERMELHO|ROSA|null",
  "selections": [
    { "moment": "ENTRADA", "songId": "id da lista", "note": "opcional" }
  ]
}`,
    },
  ];
}

function buildDateTime(date?: string | null, time?: string | null) {
  if (!date) return null;
  return time ? `${date}T${time}:00` : `${date}T10:00:00`;
}

function normalizeSelections(parsedSelections: z.infer<typeof aiSelectionSchema>[], candidates: CandidateSong[]) {
  const candidateIds = new Set(candidates.map(song => song.id));
  const usedMomentSongPairs = new Set<string>();
  const orderByMoment = new Map<LiturgicalMoment, number>();

  return parsedSelections
    .filter(selection => candidateIds.has(selection.songId))
    .filter(selection => {
      const key = `${selection.moment}:${selection.songId}`;
      if (usedMomentSongPairs.has(key)) return false;
      usedMomentSongPairs.add(key);
      return true;
    })
    .map(selection => {
      const currentOrder = orderByMoment.get(selection.moment) || 0;
      orderByMoment.set(selection.moment, currentOrder + 1);

      return {
        ...selection,
        id: randomUUID(),
        order: currentOrder,
      };
    });
}

export const GET = withUserProtection<any>(async (_request: NextRequest, session: any) => {
  try {
    const quota = await getAIQuota(session.user.id);
    return NextResponse.json({ quota });
  } catch (error) {
    console.error("[AI MASS] Failed to get quota:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao verificar quota de IA" },
      { status: 500 }
    );
  }
});

export const POST = withUserProtection<any>(async (request: NextRequest, session: any) => {
  try {
    const body = requestSchema.parse(await request.json());

    const createGate = await canCreateMass(session.user.id);
    if (!createGate.allowed) {
      return premiumRequiredResponse(
        "unlimited_masses",
        `O plano gratuito permite criar até ${createGate.limit} missas/repertórios.`
      );
    }

    const quota = await getAIQuota(session.user.id);
    if (quota.remaining <= 0) {
      return NextResponse.json(
        {
          error: `Já usaste a tua quota de IA (${quota.label}).`,
          code: "AI_QUOTA_EXCEEDED",
          quota,
        },
        { status: 429 }
      );
    }

    const candidates = await getCandidateSongs();
    if (candidates.length < 3) {
      return NextResponse.json(
        { error: "Ainda não há cânticos suficientes para criar uma missa com IA." },
        { status: 400 }
      );
    }

    const completion = await createChatCompletion(buildPrompt(body.prompt, candidates));
    const parsed = aiResponseSchema.parse(extractJsonObject(completion));
    const selections = normalizeSelections(parsed.selections, candidates);

    if (selections.length < 3) {
      return NextResponse.json(
        { error: "A IA não encontrou cânticos suficientes na biblioteca para esse pedido." },
        { status: 422 }
      );
    }

    const massId = randomUUID();
    const { data: mass, error: massError } = await supabase
      .from("Mass")
      .insert({
        id: massId,
        name: parsed.name,
        description: parsed.description || `Criada com IA a partir do pedido: ${body.prompt}`,
        date: buildDateTime(body.date, body.time),
        parish: body.parish || null,
        celebrant: body.celebrant || null,
        celebration: parsed.celebration || null,
        liturgicalColor: (parsed.liturgicalColor || null) as LiturgicalColor | null,
        visibility: body.visibility as MassVisibility,
        userId: session.user.id,
      })
      .select("id, name")
      .single();

    if (massError || !mass) {
      console.error("[AI MASS] Failed to create mass:", massError);
      return NextResponse.json({ error: "Erro ao criar missa com IA" }, { status: 500 });
    }

    const { error: itemsError } = await supabase.from("MassItem").insert(
      selections.map(selection => ({
        id: selection.id,
        massId,
        songId: selection.songId,
        moment: selection.moment,
        order: selection.order,
        note: selection.note || null,
        transpose: 0,
        addedById: session.user.id,
      }))
    );

    if (itemsError) {
      console.error("[AI MASS] Failed to create mass items:", itemsError);
      await supabase.from("MassItem").delete().eq("massId", massId);
      await supabase.from("Mass").delete().eq("id", massId);
      return NextResponse.json({ error: "Erro ao adicionar cânticos à missa criada com IA" }, { status: 500 });
    }

    const { error: usageError } = await supabase.from("AiUsage").insert({
      id: randomUUID(),
      userId: session.user.id,
      feature: AI_MASS_FEATURE,
      massId,
      prompt: body.prompt,
      createdAt: new Date().toISOString(),
    });

    if (usageError) {
      console.error("[AI MASS] Failed to log usage:", usageError);
    }

    return NextResponse.json({
      success: true,
      massId,
      itemCount: selections.length,
      quota: {
        ...quota,
        used: quota.used + 1,
        remaining: Math.max(0, quota.remaining - 1),
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Pedido inválido", details: error.flatten() }, { status: 400 });
    }

    if (error instanceof AIClientError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    console.error("[AI MASS] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno ao criar missa com IA" }, { status: 500 });
  }
});
