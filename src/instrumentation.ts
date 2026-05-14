import { registerOTel } from '@vercel/otel';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const otlpHeadersRaw = process.env.OTEL_EXPORTER_OTLP_HEADERS;

  if (!otlpEndpoint) {
    console.warn('[OTEL] OTEL_EXPORTER_OTLP_ENDPOINT not set — traces/metrics disabled');
    return;
  }

  const otlpHeaders: Record<string, string> = {};
  if (otlpHeadersRaw) {
    for (const entry of otlpHeadersRaw.split(',')) {
      const eqIdx = entry.indexOf('=');
      if (eqIdx > 0) {
        otlpHeaders[entry.slice(0, eqIdx).trim()] = entry.slice(eqIdx + 1).trim();
      }
    }
  }

  registerOTel({
    serviceName: process.env.OTEL_SERVICE_NAME || 'cantolico',
    traceExporter: new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
      headers: otlpHeaders,
    }),
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: `${otlpEndpoint}/v1/metrics`,
          headers: otlpHeaders,
        }),
        exportIntervalMillis: 30000,
      }),
    ],
  });
}
