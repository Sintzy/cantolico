/**
 * API Route para receber logs de segurança do middleware
 * 
 * Esta route roda em Node.js runtime e pode usar winston-loki.
 * Recebe logs do middleware (Edge Runtime) e os envia para Loki.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { LogCategory } from '@/types/logging';

export const runtime = 'nodejs'; // Importante: Node.js runtime para usar winston-loki

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    const { message, severity, ...logData } = data;
    
    // Determinar o nível de log baseado na severidade
    const logLevel = severity === 'HIGH' ? 'error' : severity === 'MEDIUM' ? 'warn' : 'info';
    
    // Enviar para winston-loki
    logger[logLevel](message, {
      category: LogCategory.SECURITY,
      ...logData,
    });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing security log:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
