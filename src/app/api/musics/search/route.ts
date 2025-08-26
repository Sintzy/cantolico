import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// /api/musics/search?q=...&page=1&limit=20
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;

  // Basic search: title contains query (case-insensitive)
  const where = q
    ? {
        title: {
          contains: q,
          mode: "insensitive" as const,
        },
      }
    : {};

  const [songs, total] = await Promise.all([
    prisma.song.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        createdAt: true,
        // Add more fields as needed for search results
      },
    }),
    prisma.song.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({ songs, totalPages });
}
