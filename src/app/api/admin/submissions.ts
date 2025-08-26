import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// /api/admin/submissions?page=1&limit=20&q=&status=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;
  const status = searchParams.get("status") || undefined;

  // Filtro de busca
  const where: any = {
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { submitter: { name: { contains: q, mode: "insensitive" as const } } },
        { submitter: { email: { contains: q, mode: "insensitive" as const } } },
      ],
    }),
    ...(status && status !== "all" && { status }),
  };

  const [rawSubmissions, total] = await Promise.all([
    prisma.songSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            image: true,
            bio: true,
            moderationHistory: {
              orderBy: { moderatedAt: "desc" },
              take: 5,
              select: {
                id: true,
                status: true,
                type: true,
                reason: true,
                moderatorNote: true,
                moderatedAt: true,
                expiresAt: true,
                moderatedBy: { select: { name: true } },
              },
            },
            moderation: {
              select: {
                id: true,
                status: true,
                type: true,
                reason: true,
                moderatorNote: true,
                moderatedAt: true,
                expiresAt: true,
                moderatedBy: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.songSubmission.count({ where }),
  ]);

  // Garante que moderationHistory e moderation (currentModeration) nunca sejam undefined
  const submissions = rawSubmissions.map((s) => ({
    ...s,
    submitter: {
      ...s.submitter,
      moderationHistory: s.submitter.moderationHistory ?? [],
      currentModeration: s.submitter.moderation ?? null,
    },
  }));

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({ submissions, totalPages });
}
