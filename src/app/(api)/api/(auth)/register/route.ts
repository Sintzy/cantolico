import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email já usado" }, { status: 400 });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  });

  return NextResponse.json({ success: true, userId: user.id });
}
