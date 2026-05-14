import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('cantolico', '1.0.0');

const httpRequestsTotal = meter.createCounter('http_requests_total', {
  description: 'Total HTTP requests processed',
});

const httpRequestDurationMs = meter.createHistogram('http_request_duration_ms', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
});

const httpErrorsTotal = meter.createCounter('http_errors_total', {
  description: 'Total HTTP error responses (4xx + 5xx)',
});

export function recordRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number
): void {
  const attrs = { method, path, status_code: String(statusCode) };
  httpRequestsTotal.add(1, attrs);
  httpRequestDurationMs.record(durationMs, attrs);
  if (statusCode >= 400) {
    httpErrorsTotal.add(1, {
      ...attrs,
      error_class: statusCode >= 500 ? '5xx' : '4xx',
    });
  }
}
