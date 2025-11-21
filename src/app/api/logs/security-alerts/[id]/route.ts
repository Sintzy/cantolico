import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';

// ================================================
// API PARA ALERTA DE SEGURANÇA INDIVIDUAL - GET/PATCH/DELETE
// ================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ error: 'Este endpoint foi removido. Use a API de logs e filtre por tags=["security"].' }, { status: 410 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ error: 'Este endpoint foi removido. Use a API de logs para gerir alertas.' }, { status: 410 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ error: 'Este endpoint foi removido.' }, { status: 410 });
}