import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { LogCategory } from '@/types/logging';

/**
 * API de teste para verificar envio de logs para Loki
 * Acesse: /api/test-loki-logs
 */
export async function GET(req: NextRequest) {
  console.log('🧪 Testing Loki logging system...');

  try {
    // Teste 1: Log simples
    logger.info('Test log - simple message', {
      category: LogCategory.SYSTEM,
      tags: ['test', 'loki-verification'],
      details: {
        test_number: 1,
        test_type: 'simple_log',
        timestamp: new Date().toISOString(),
      },
    });

    // Teste 2: Log com contexto de usuário
    logger.info('Test log - with user context', {
      category: LogCategory.USER,
      user: {
        user_id: 'test-user-123',
        user_email: 'test@cantolico.pt',
        user_role: 'USER',
      },
      tags: ['test', 'user-context'],
      details: {
        test_number: 2,
        test_type: 'user_context_log',
      },
    });

    // Teste 3: Log de erro
    logger.error('Test log - error simulation', {
      category: LogCategory.SYSTEM,
      error: {
        error_message: 'This is a test error',
        error_code: 'TEST_ERROR',
        error_type: 'TestError',
      },
      tags: ['test', 'error-simulation'],
      details: {
        test_number: 3,
        test_type: 'error_log',
      },
    });

    // Teste 4: Log com HTTP context
    logger.info('Test log - with HTTP context', {
      category: LogCategory.API,
      http: {
        method: 'GET',
        url: req.url,
        path: '/api/test-loki-logs',
        status_code: 200,
      },
      network: {
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      },
      tags: ['test', 'http-context'],
      details: {
        test_number: 4,
        test_type: 'http_context_log',
      },
    });

    // Teste 5: Log com domain context
    logger.info('Test log - with domain context', {
      category: LogCategory.SONG,
      domain: {
        song_id: 999,
        playlist_id: 888,
        submission_id: 777,
      },
      tags: ['test', 'domain-context'],
      details: {
        test_number: 5,
        test_type: 'domain_context_log',
      },
    });

    console.log('✅ All test logs sent successfully');

    return NextResponse.json({
      success: true,
      message: 'Test logs sent to Loki',
      instructions: {
        grafana: 'Check Grafana with query: {app="cantolico"} |= "test"',
        expected_logs: 5,
        loki_url: process.env.LOKI_URL,
        timestamp: new Date().toISOString(),
      },
      tests: [
        { id: 1, type: 'simple_log', tags: ['test', 'loki-verification'] },
        { id: 2, type: 'user_context_log', tags: ['test', 'user-context'] },
        { id: 3, type: 'error_log', tags: ['test', 'error-simulation'] },
        { id: 4, type: 'http_context_log', tags: ['test', 'http-context'] },
        { id: 5, type: 'domain_context_log', tags: ['test', 'domain-context'] },
      ],
    });
  } catch (error) {
    console.error('❌ Error testing Loki logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
