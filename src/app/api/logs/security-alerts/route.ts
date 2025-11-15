import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';

// ================================================
// API PARA ALERTAS DE SEGURANÇA - GET
// ================================================

export async function GET() {
  return NextResponse.json({
    error: 'Este endpoint foi removido. Use a API de logs e filtre por tags=["security"] para gerir alertas.'
  }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({
    error: 'Este endpoint foi removido. Para criar alertas de segurança crie um log com level=SECURITY e tags=["security"].'
  }, { status: 410 });
}