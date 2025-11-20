import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { logPerformanceMetric, logSlowRequest } from '@/lib/logging-helpers';
import { LogCategory } from '@/types/logging';

export async function GET(req: NextRequest) {
  // Log INFO
  logger.info('Test INFO log', {
    category: LogCategory.SYSTEM,
    tags: ['test', 'info'],
    details: { test: 'info' },
  });

  // Log WARN
  logger.warn('Test WARN log', {
    category: LogCategory.SYSTEM,
    tags: ['test', 'warn'],
    details: { test: 'warn' },
  });

  // Log ERROR
  logger.error('Test ERROR log', {
    category: LogCategory.SYSTEM,
    tags: ['test', 'error'],
    error: { error_message: 'Erro de teste', stack_trace: 'stack...' },
    details: { test: 'error' },
  });

  // Log PERFORMANCE normal
  logPerformanceMetric({
    endpoint: '/api/test-log',
    method: 'GET',
    response_time_ms: 120,
    user: { user_id: 'test-user' },
    tags: ['test', 'performance'],
    details: { test: 'performance-normal' },
  });

  // Log PERFORMANCE lenta
  logSlowRequest({
    endpoint: '/api/test-log',
    method: 'GET',
    response_time_ms: 1200,
    user: { user_id: 'test-user' },
    tags: ['test', 'performance', 'slow'],
    details: { test: 'performance-slow' },
  });

  return NextResponse.json({ ok: true, message: 'Logs enviados para Loki!' });
}
